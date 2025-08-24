-- Row Level Security Policies for deliverytrembao.com.br
-- This file contains all RLS policies to secure the data

-- Helper functions for role checking
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = required_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_admin_role(required_role admin_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND role = required_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (get_current_user_role() = 'admin');

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

-- Restaurants policies
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Restaurant owners can manage their restaurants" ON public.restaurants
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
  FOR ALL USING (get_current_user_role() = 'admin');

-- Menu items policies
CREATE POLICY "Anyone can view available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Restaurant owners can manage their menu items" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE id = menu_items.restaurant_id AND owner_id = auth.uid()
    )
  );

-- Cart items policies
CREATE POLICY "Users can view their own cart items" ON public.cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart items" ON public.cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Restaurant owners can view orders for their restaurants" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE id = orders.restaurant_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can update orders for their restaurants" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE id = orders.restaurant_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Couriers can view assigned orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_assignments 
      WHERE order_id = orders.id AND courier_id = auth.uid()
    )
  );

CREATE POLICY "System can manage orders" ON public.orders
  FOR ALL USING (true);

-- Order items policies
CREATE POLICY "Users can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = order_items.order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_items.order_id AND r.owner_id = auth.uid()
    )
  );

-- Couriers policies
CREATE POLICY "Couriers can view their own profile" ON public.couriers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Couriers can insert their own profile" ON public.couriers
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Couriers can update when DRAFT or REJECTED" ON public.couriers
  FOR UPDATE USING (
    auth.uid() = id AND status IN ('DRAFT', 'REJECTED')
  );

CREATE POLICY "Admins can view all couriers" ON public.couriers
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all couriers" ON public.couriers
  FOR UPDATE USING (get_current_user_role() = 'admin');

-- Courier documents policies
CREATE POLICY "Couriers can view their documents" ON public.courier_documents
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can insert documents when DRAFT or REJECTED" ON public.courier_documents
  FOR INSERT WITH CHECK (
    auth.uid() = courier_id AND 
    EXISTS (
      SELECT 1 FROM public.couriers 
      WHERE id = courier_documents.courier_id 
      AND status IN ('DRAFT', 'REJECTED')
    )
  );

CREATE POLICY "Couriers can delete documents when DRAFT or REJECTED" ON public.courier_documents
  FOR DELETE USING (
    auth.uid() = courier_id AND 
    EXISTS (
      SELECT 1 FROM public.couriers 
      WHERE id = courier_documents.courier_id 
      AND status IN ('DRAFT', 'REJECTED')
    )
  );

CREATE POLICY "Admins can manage all courier documents" ON public.courier_documents
  FOR ALL USING (get_current_user_role() = 'admin');

-- Courier presence policies
CREATE POLICY "Couriers can manage their presence" ON public.courier_presence
  FOR ALL USING (auth.uid() = courier_id);

CREATE POLICY "Restaurants can view courier presence for dispatch" ON public.courier_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all courier presence" ON public.courier_presence
  FOR SELECT USING (get_current_user_role() = 'admin');

-- Courier locations policies
CREATE POLICY "Couriers can insert their own locations" ON public.courier_locations
  FOR INSERT WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Order participants can view courier locations" ON public.courier_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_assignments oa
      JOIN public.orders o ON o.id = oa.order_id
      WHERE oa.courier_id = courier_locations.courier_id
      AND (
        o.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.restaurants r 
          WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "System can manage courier locations" ON public.courier_locations
  FOR ALL USING (true);

-- Courier active orders policies
CREATE POLICY "Couriers can view their active orders" ON public.courier_active_orders
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "System can manage courier active orders" ON public.courier_active_orders
  FOR ALL USING (true);

-- Courier earnings policies
CREATE POLICY "Couriers can view their earnings" ON public.courier_earnings
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "System can manage earnings" ON public.courier_earnings
  FOR ALL USING (true);

-- Dispatch offers policies
CREATE POLICY "Couriers can view their offers" ON public.dispatch_offers
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "Couriers can respond to their offers" ON public.dispatch_offers
  FOR UPDATE USING (auth.uid() = courier_id);

CREATE POLICY "System can manage dispatch offers" ON public.dispatch_offers
  FOR ALL USING (true);

-- Delivery tracking policies
CREATE POLICY "Couriers can insert their own tracking" ON public.delivery_tracking
  FOR INSERT WITH CHECK (auth.uid() = courier_id);

CREATE POLICY "Couriers can view their own tracking" ON public.delivery_tracking
  FOR SELECT USING (auth.uid() = courier_id);

CREATE POLICY "Users can view tracking for their orders" ON public.delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = delivery_tracking.order_id AND user_id = auth.uid()
    )
  );

-- Kitchen tickets policies
CREATE POLICY "Restaurant staff can manage kitchen tickets" ON public.kitchen_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants 
      WHERE id = kitchen_tickets.restaurant_id AND owner_id = auth.uid()
    )
  );

-- Chat rooms policies
CREATE POLICY "Participants can view their rooms" ON public.chat_rooms
  FOR SELECT USING (
    auth.uid() IN (
      SELECT (jsonb_array_elements_text(participants))::uuid
    )
  );

CREATE POLICY "System can manage chat rooms" ON public.chat_rooms
  FOR ALL USING (true);

-- Chat messages policies
CREATE POLICY "Room participants can view messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id
      AND auth.uid() IN (
        SELECT (jsonb_array_elements_text(cr.participants))::uuid
      )
    )
  );

CREATE POLICY "Room participants can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id
      AND auth.uid() IN (
        SELECT (jsonb_array_elements_text(cr.participants))::uuid
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Reviews policies
CREATE POLICY "Users can view reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert reviews for their orders" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE id = reviews.order_id AND user_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin users can view audit logs" ON public.admin_actions_log
  FOR SELECT USING (has_admin_role('AUDITOR'));

CREATE POLICY "System can insert audit logs" ON public.admin_actions_log
  FOR INSERT WITH CHECK (true);

-- Superadmins policies
CREATE POLICY "Superadmins can manage all admin users" ON public.admin_users
  FOR ALL USING (has_admin_role('SUPERADMIN'));

CREATE POLICY "Admins can view non-superadmin users" ON public.admin_users
  FOR SELECT USING (
    has_admin_role('ADMIN') AND role != 'SUPERADMIN'
  );

-- Blocked IPs policies
CREATE POLICY "Only admins can manage blocked IPs" ON public.blocked_ips
  FOR ALL USING (get_current_user_role() = 'admin');