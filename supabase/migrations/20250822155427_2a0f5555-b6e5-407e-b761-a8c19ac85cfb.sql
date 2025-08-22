-- Create enums for store system
CREATE TYPE store_status AS ENUM ('DRAFT','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED');
CREATE TYPE store_member_role AS ENUM ('OWNER','MANAGER','STAFF');
CREATE TYPE store_doc_type AS ENUM ('CNPJ','IE','CONTRATO_SOCIAL','LOGO','ALVARA','ENDERECO_COMPROV','FOTO_FACHADA');

-- Main stores table
CREATE TABLE public.stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status store_status NOT NULL DEFAULT 'DRAFT',
    name text NOT NULL,
    slug text UNIQUE,
    cnpj text NOT NULL UNIQUE,
    ie text NULL,
    phone text,
    email text,
    description text,
    category text,
    logo_url text NULL,
    banner_url text NULL,
    address jsonb,
    latitude double precision,
    longitude double precision,
    location geography(Point,4326),
    min_order numeric(10,2) DEFAULT 0.00,
    prep_time_minutes int DEFAULT 20,
    is_open boolean DEFAULT false,
    opening_hours jsonb,
    delivery_radius_km int DEFAULT 5,
    pricing_settings jsonb,
    rejection_reason text,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Store members (who can manage the store)
CREATE TABLE public.store_members (
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role store_member_role NOT NULL,
    PRIMARY KEY (store_id, user_id)
);

-- Store documents
CREATE TABLE public.store_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    type store_doc_type NOT NULL,
    file_url text NOT NULL,
    mime text NOT NULL,
    size_bytes int NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    notes text NULL,
    uploaded_at timestamptz DEFAULT now(),
    UNIQUE(store_id, type)
);

-- Store review log for admin actions
CREATE TABLE public.store_reviews_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    from_status store_status,
    to_status store_status,
    actor uuid REFERENCES auth.users(id),
    reason text,
    created_at timestamptz DEFAULT now()
);

-- Optional delivery areas for advanced polygon zones
CREATE TABLE public.delivery_areas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name text,
    area geography(Polygon,4326),
    fee_extra numeric(10,2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_store_docs_store_type ON store_documents(store_id, type);
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_cnpj ON stores(cnpj);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stores_updated_at();

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_store_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.store_reviews_log (store_id, from_status, to_status, reason)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.rejection_reason);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status change logging
CREATE TRIGGER trigger_store_status_change
    AFTER UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.log_store_status_change();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_store_slug(store_name text)
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Function to automatically set slug
CREATE OR REPLACE FUNCTION public.set_store_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := public.generate_store_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic slug generation
CREATE TRIGGER trigger_set_store_slug
    BEFORE INSERT OR UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.set_store_slug();

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;