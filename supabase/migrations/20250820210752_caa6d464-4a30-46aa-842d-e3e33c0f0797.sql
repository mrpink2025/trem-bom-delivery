-- Create reports table for storing report metadata
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('orders', 'revenue', 'users', 'restaurants')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_url TEXT,
  parameters JSONB,
  user_id UUID REFERENCES profiles(user_id),
  file_size BIGINT,
  format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv'))
);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports access
CREATE POLICY "Admins can view all reports" 
ON public.reports 
FOR SELECT 
USING (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admins can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admins can update reports" 
ON public.reports 
FOR UPDATE 
USING (get_current_user_role() = 'admin'::user_role);

CREATE POLICY "Admins can delete reports" 
ON public.reports 
FOR DELETE 
USING (get_current_user_role() = 'admin'::user_role);

-- Insert some sample reports
INSERT INTO public.reports (name, type, status, file_url, parameters, file_size, format) VALUES
('Relatório de Pedidos - Janeiro 2024', 'orders', 'completed', '#', '{"dateRange": {"from": "2024-01-01", "to": "2024-01-31"}}', 2400000, 'pdf'),
('Análise de Receita - Dezembro 2023', 'revenue', 'completed', '#', '{"dateRange": {"from": "2023-12-01", "to": "2023-12-31"}}', 1800000, 'excel'),
('Performance Restaurantes - Novembro 2023', 'restaurants', 'processing', null, '{"dateRange": {"from": "2023-11-01", "to": "2023-11-30"}}', null, 'pdf');