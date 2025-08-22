-- Create RLS policies for stores table
CREATE POLICY "Admin can view all stores" ON public.stores
    FOR SELECT USING (has_role('admin'::user_role));

CREATE POLICY "Sellers can view their stores" ON public.stores  
    FOR SELECT USING (
        has_role('seller'::user_role) AND 
        EXISTS (SELECT 1 FROM store_members sm WHERE sm.store_id = stores.id AND sm.user_id = auth.uid())
    );

CREATE POLICY "Approved stores are publicly visible" ON public.stores
    FOR SELECT USING (status = 'APPROVED');

CREATE POLICY "Authenticated users can create stores" ON public.stores
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Sellers can update their draft/rejected stores" ON public.stores
    FOR UPDATE USING (
        has_role('seller'::user_role) AND 
        status IN ('DRAFT', 'REJECTED') AND
        EXISTS (SELECT 1 FROM store_members sm WHERE sm.store_id = stores.id AND sm.user_id = auth.uid())
    );

CREATE POLICY "Admin can update any store" ON public.stores
    FOR UPDATE USING (has_role('admin'::user_role));

-- RLS policies for store_members
CREATE POLICY "Admin can view all store members" ON public.store_members
    FOR SELECT USING (has_role('admin'::user_role));

CREATE POLICY "Users can view their own memberships" ON public.store_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Store owners can view store members" ON public.store_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_members sm 
            WHERE sm.store_id = store_members.store_id 
            AND sm.user_id = auth.uid() 
            AND sm.role = 'OWNER'
        )
    );

CREATE POLICY "System can manage store members" ON public.store_members
    FOR ALL USING (true);

-- RLS policies for store_documents
CREATE POLICY "Admin can view all store documents" ON public.store_documents
    FOR SELECT USING (has_role('admin'::user_role));

CREATE POLICY "Store members can view their store documents" ON public.store_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_members sm 
            WHERE sm.store_id = store_documents.store_id 
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "Store members can insert documents for draft/rejected stores" ON public.store_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM store_members sm
            JOIN stores s ON s.id = sm.store_id
            WHERE sm.store_id = store_documents.store_id 
            AND sm.user_id = auth.uid()
            AND s.status IN ('DRAFT', 'REJECTED')
        )
    );

CREATE POLICY "Admin can manage all store documents" ON public.store_documents
    FOR ALL USING (has_role('admin'::user_role));

-- RLS policies for store_reviews_log  
CREATE POLICY "Admin can view all store reviews" ON public.store_reviews_log
    FOR SELECT USING (has_role('admin'::user_role));

CREATE POLICY "Store members can view their store reviews" ON public.store_reviews_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_members sm 
            WHERE sm.store_id = store_reviews_log.store_id 
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert store reviews" ON public.store_reviews_log
    FOR INSERT WITH CHECK (true);

-- RLS policies for delivery_areas
CREATE POLICY "Admin can manage all delivery areas" ON public.delivery_areas
    FOR ALL USING (has_role('admin'::user_role));

CREATE POLICY "Store members can manage their delivery areas" ON public.delivery_areas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM store_members sm 
            WHERE sm.store_id = delivery_areas.store_id 
            AND sm.user_id = auth.uid()
        )
    );

-- Fix function security by adding SECURITY DEFINER and SET search_path
CREATE OR REPLACE FUNCTION public.update_stores_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_store_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.store_reviews_log (store_id, from_status, to_status, reason)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.rejection_reason);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name text)
RETURNS text 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter int := 0;
BEGIN
    -- Normalize the name to create a slug
    base_slug := lower(regexp_replace(trim(store_name), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    
    final_slug := base_slug;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM stores WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_store_slug()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.generate_store_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$;