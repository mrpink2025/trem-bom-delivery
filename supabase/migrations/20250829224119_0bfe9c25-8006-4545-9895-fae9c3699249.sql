-- Fix the seller_id issue by making it nullable temporarily and adding a default trigger
-- This allows orders to be created without immediately requiring a chat thread with seller_id

-- First, make seller_id nullable in chat_threads to allow orders to be created
ALTER TABLE public.chat_threads ALTER COLUMN seller_id DROP NOT NULL;

-- Add a comment to explain this change
COMMENT ON COLUMN public.chat_threads.seller_id IS 'Restaurant owner/seller ID - can be null initially and populated when needed';