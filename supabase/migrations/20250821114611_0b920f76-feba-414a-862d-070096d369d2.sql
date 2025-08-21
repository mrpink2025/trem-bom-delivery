-- Add missing admin policies for restaurant management
CREATE POLICY "Admins can manage all restaurants"
ON public.restaurants
FOR ALL
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');