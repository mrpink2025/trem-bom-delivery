-- Create message status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create message type enum (if not exists)
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create delivery status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('created', 'accepted', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create chat threads table (one per order)
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  seller_id UUID NOT NULL,
  courier_id UUID,
  customer_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  location_data JSONB, -- {lat, lng, address}
  metadata JSONB, -- additional data like reply_to, mentions, etc
  status message_status NOT NULL DEFAULT 'sent',
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update existing delivery_tracking table with new columns
ALTER TABLE public.delivery_tracking 
ADD COLUMN IF NOT EXISTS status delivery_status DEFAULT 'in_transit',
ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
ADD COLUMN IF NOT EXISTS distance_to_destination NUMERIC;

-- Create user presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message reports table for moderation
CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view threads they participate in" ON public.chat_threads;
DROP POLICY IF EXISTS "System can create chat threads" ON public.chat_threads;
DROP POLICY IF EXISTS "Participants can update threads" ON public.chat_threads;

-- RLS Policies for chat_threads
CREATE POLICY "Users can view threads they participate in" 
ON public.chat_threads FOR SELECT 
USING (
  auth.uid() = seller_id OR 
  auth.uid() = courier_id OR 
  auth.uid() = customer_id OR
  get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "System can create chat threads" 
ON public.chat_threads FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Participants can update threads" 
ON public.chat_threads FOR UPDATE 
USING (
  auth.uid() = seller_id OR 
  auth.uid() = courier_id OR 
  auth.uid() = customer_id
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their threads" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_threads ct 
    WHERE ct.id = messages.thread_id 
    AND (ct.seller_id = auth.uid() OR ct.courier_id = auth.uid() OR ct.customer_id = auth.uid())
  ) OR get_current_user_role() = 'admin'::user_role
);

CREATE POLICY "Users can send messages to their threads" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_threads ct 
    WHERE ct.id = messages.thread_id 
    AND (ct.seller_id = auth.uid() OR ct.courier_id = auth.uid() OR ct.customer_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- RLS Policies for user_presence
CREATE POLICY "Users can manage their own presence" 
ON public.user_presence FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view presence in their threads" 
ON public.user_presence FOR SELECT 
USING (
  thread_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.chat_threads ct 
    WHERE ct.id = user_presence.thread_id 
    AND (ct.seller_id = auth.uid() OR ct.courier_id = auth.uid() OR ct.customer_id = auth.uid())
  )
);

-- RLS Policies for message_reports
CREATE POLICY "Users can create reports" 
ON public.message_reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" 
ON public.message_reports FOR SELECT 
USING (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admins can update reports" 
ON public.message_reports FOR UPDATE 
USING (get_current_user_role() = 'admin'::user_role);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_chat_threads_order_id ON public.chat_threads(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_thread_id ON public.user_presence(thread_id);

-- Triggers for updated_at on new tables
DO $$ BEGIN
  CREATE TRIGGER update_chat_threads_updated_at
    BEFORE UPDATE ON public.chat_threads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON public.user_presence
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable realtime for chat tables
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

-- Function to create chat thread for new order
CREATE OR REPLACE FUNCTION public.create_chat_thread_for_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_threads (order_id, seller_id, courier_id, customer_id)
  SELECT 
    NEW.id,
    r.owner_id,
    NEW.courier_id,
    NEW.user_id
  FROM public.restaurants r
  WHERE r.id = NEW.restaurant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER create_chat_thread_on_order_insert
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.create_chat_thread_for_order();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Function to calculate ETA based on distance
CREATE OR REPLACE FUNCTION public.calculate_eta(distance_km NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  -- Simple ETA calculation: assume 25 km/h average speed in city + 5 min buffer
  RETURN CEIL(distance_km / 25.0 * 60) + 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;