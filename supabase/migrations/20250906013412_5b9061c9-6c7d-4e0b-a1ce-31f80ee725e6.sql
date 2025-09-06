-- Enable RLS on PostGIS system table and create appropriate policy
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Allow read access to spatial reference data for all users
CREATE POLICY "Allow read access to spatial reference data" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (true);