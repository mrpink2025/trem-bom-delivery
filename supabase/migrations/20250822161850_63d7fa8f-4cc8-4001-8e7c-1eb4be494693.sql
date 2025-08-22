-- First, drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Sellers can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Sellers can update their draft/rejected stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can view store members" ON public.store_members;

-- Create simpler, non-recursive policies for stores table
CREATE POLICY "Users can view their own stores"
  ON public.stores
  FOR SELECT 
  USING (created_by = auth.uid());

CREATE POLICY "Users can update their own draft/rejected stores"
  ON public.stores
  FOR UPDATE 
  USING (created_by = auth.uid() AND status = ANY(ARRAY['DRAFT'::store_status, 'REJECTED'::store_status]));

-- Create simpler policies for store_members table  
CREATE POLICY "Users can view store members for their own stores"
  ON public.store_members
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.stores s 
    WHERE s.id = store_members.store_id 
    AND s.created_by = auth.uid()
  ));

-- Keep other essential policies as they are
-- Admin policies and approved stores visibility remain unchanged