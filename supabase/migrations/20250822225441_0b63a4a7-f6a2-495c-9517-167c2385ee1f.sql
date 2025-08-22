-- =======================
-- ENUMS E TIPOS
-- =======================

-- Criar enums se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_status') THEN
        CREATE TYPE merchant_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_doc_type') THEN
        CREATE TYPE merchant_doc_type AS ENUM ('CNPJ', 'CONTRATO_SOCIAL', 'ALVARA', 'VISA_SANITARIA', 'ENDERECO', 'LOGO', 'BANNER');
    END IF;
END $$;

-- =======================
-- TABELA MERCHANTS
-- =======================

-- Criar tabela merchants se não existir
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status merchant_status NOT NULL DEFAULT 'DRAFT',
    legal_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    responsible_name TEXT NOT NULL,
    responsible_cpf TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address_json JSONB NOT NULL,
    logo_url TEXT,
    banner_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar colunas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'status') THEN
        ALTER TABLE public.merchants ADD COLUMN status merchant_status NOT NULL DEFAULT 'DRAFT';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'legal_name') THEN
        ALTER TABLE public.merchants ADD COLUMN legal_name TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'trade_name') THEN
        ALTER TABLE public.merchants ADD COLUMN trade_name TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'cnpj') THEN
        ALTER TABLE public.merchants ADD COLUMN cnpj TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'responsible_name') THEN
        ALTER TABLE public.merchants ADD COLUMN responsible_name TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'responsible_cpf') THEN
        ALTER TABLE public.merchants ADD COLUMN responsible_cpf TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'address_json') THEN
        ALTER TABLE public.merchants ADD COLUMN address_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'submitted_at') THEN
        ALTER TABLE public.merchants ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'approved_at') THEN
        ALTER TABLE public.merchants ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'merchants' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.merchants ADD COLUMN rejection_reason TEXT;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Tabela será criada pelo CREATE TABLE IF NOT EXISTS acima
        NULL;
END $$;

-- =======================
-- TABELA MERCHANT_DOCUMENTS
-- =======================

CREATE TABLE IF NOT EXISTS public.merchant_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    type merchant_doc_type NOT NULL,
    file_url TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(merchant_id, type)
);

-- =======================
-- ATUALIZAR STORE_UNITS
-- =======================

-- Adicionar colunas em store_units se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'merchant_id') THEN
        ALTER TABLE public.store_units ADD COLUMN merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'city') THEN
        ALTER TABLE public.store_units ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'state') THEN
        ALTER TABLE public.store_units ADD COLUMN state TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'neighborhood') THEN
        ALTER TABLE public.store_units ADD COLUMN neighborhood TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'cep') THEN
        ALTER TABLE public.store_units ADD COLUMN cep TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'location') THEN
        ALTER TABLE public.store_units ADD COLUMN location GEOGRAPHY(Point, 4326);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'avg_prep_minutes') THEN
        ALTER TABLE public.store_units ADD COLUMN avg_prep_minutes INTEGER DEFAULT 30;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_units' AND column_name = 'score') THEN
        ALTER TABLE public.store_units ADD COLUMN score NUMERIC(3,2) DEFAULT 0.0;
    END IF;
EXCEPTION
    WHEN others THEN
        -- Se store_units não existir, criar estrutura básica
        CREATE TABLE IF NOT EXISTS public.store_units (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            city TEXT,
            state TEXT,
            neighborhood TEXT,
            cep TEXT,
            latitude NUMERIC,
            longitude NUMERIC,
            location GEOGRAPHY(Point, 4326),
            is_open BOOLEAN NOT NULL DEFAULT false,
            avg_prep_minutes INTEGER DEFAULT 30,
            score NUMERIC(3,2) DEFAULT 0.0,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
END $$;

-- =======================
-- ATUALIZAR COURIERS
-- =======================

-- Garantir que couriers tenha as colunas necessárias
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'cnh_valid_until') THEN
        ALTER TABLE public.couriers ADD COLUMN cnh_valid_until DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'crlv_valid_until') THEN
        ALTER TABLE public.couriers ADD COLUMN crlv_valid_until DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'submitted_at') THEN
        ALTER TABLE public.couriers ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'approved_at') THEN
        ALTER TABLE public.couriers ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'couriers' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.couriers ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- =======================
-- LOGS DE REVISÃO
-- =======================

CREATE TABLE IF NOT EXISTS public.merchant_reviews_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    from_status merchant_status,
    to_status merchant_status NOT NULL,
    actor UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courier_reviews_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
    from_status courier_status,
    to_status courier_status NOT NULL,
    actor UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =======================
-- ÍNDICES
-- =======================

CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_owner ON public.merchants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_cnpj ON public.merchants(cnpj);

CREATE INDEX IF NOT EXISTS idx_merchant_documents_merchant_type ON public.merchant_documents(merchant_id, type);

CREATE INDEX IF NOT EXISTS idx_couriers_status ON public.couriers(status);

CREATE INDEX IF NOT EXISTS idx_courier_documents_courier_type ON public.courier_documents(courier_id, type);

CREATE INDEX IF NOT EXISTS idx_store_units_location ON public.store_units USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_store_units_merchant ON public.store_units(merchant_id);

-- =======================
-- RLS POLICIES - MERCHANTS
-- =======================

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Criar políticas para merchants
DROP POLICY IF EXISTS "Owners can manage their merchants in DRAFT/REJECTED" ON public.merchants;
CREATE POLICY "Owners can manage their merchants in DRAFT/REJECTED" ON public.merchants
    FOR ALL USING (
        auth.uid() = owner_user_id AND status IN ('DRAFT', 'REJECTED')
    );

DROP POLICY IF EXISTS "Owners can view their merchants" ON public.merchants;
CREATE POLICY "Owners can view their merchants" ON public.merchants
    FOR SELECT USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Admins can manage all merchants" ON public.merchants;
CREATE POLICY "Admins can manage all merchants" ON public.merchants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =======================
-- RLS POLICIES - MERCHANT_DOCUMENTS
-- =======================

ALTER TABLE public.merchant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage docs in DRAFT/REJECTED" ON public.merchant_documents;
CREATE POLICY "Owners can manage docs in DRAFT/REJECTED" ON public.merchant_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM merchants m 
            WHERE m.id = merchant_id 
            AND m.owner_user_id = auth.uid() 
            AND m.status IN ('DRAFT', 'REJECTED')
        )
    );

DROP POLICY IF EXISTS "Owners can view their docs" ON public.merchant_documents;
CREATE POLICY "Owners can view their docs" ON public.merchant_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM merchants m 
            WHERE m.id = merchant_id AND m.owner_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all merchant docs" ON public.merchant_documents;
CREATE POLICY "Admins can manage all merchant docs" ON public.merchant_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =======================
-- RLS POLICIES - STORE_UNITS
-- =======================

ALTER TABLE public.store_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant owners can manage their units" ON public.store_units;
CREATE POLICY "Merchant owners can manage their units" ON public.store_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM merchants m 
            WHERE m.id = merchant_id AND m.owner_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all store units" ON public.store_units;
CREATE POLICY "Admins can manage all store units" ON public.store_units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Clientes podem ver unidades de merchants aprovados
DROP POLICY IF EXISTS "Public can view approved store units" ON public.store_units;
CREATE POLICY "Public can view approved store units" ON public.store_units
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM merchants m 
            WHERE m.id = merchant_id AND m.status = 'APPROVED'
        )
    );

-- =======================
-- RLS POLICIES - REVIEW LOGS
-- =======================

ALTER TABLE public.merchant_reviews_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_reviews_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all merchant review logs" ON public.merchant_reviews_log;
CREATE POLICY "Admins can view all merchant review logs" ON public.merchant_reviews_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "System can insert merchant review logs" ON public.merchant_reviews_log;
CREATE POLICY "System can insert merchant review logs" ON public.merchant_reviews_log
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all courier review logs" ON public.courier_reviews_log;
CREATE POLICY "Admins can view all courier review logs" ON public.courier_reviews_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "System can insert courier review logs" ON public.courier_reviews_log;
CREATE POLICY "System can insert courier review logs" ON public.courier_reviews_log
    FOR INSERT WITH CHECK (true);