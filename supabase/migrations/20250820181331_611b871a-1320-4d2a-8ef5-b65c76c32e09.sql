-- Add stripe_session_id to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Add index for stripe session lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON public.orders(stripe_session_id);

-- Update order statuses to include payment states
COMMENT ON COLUMN public.orders.status IS 'Order status: pending_payment, confirmed, preparing, ready, out_for_delivery, delivered, cancelled';

-- Create notifications table for real-time updates
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

-- Enable realtime for orders and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;

-- Set replica identity for realtime
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_tracking REPLICA IDENTITY FULL;