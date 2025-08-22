-- Add missing order status values to existing enum (must be in separate transaction)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'courier_assigned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'en_route_to_store';  
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'arrived_at_destination';