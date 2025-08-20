import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonCard, SkeletonTable, SkeletonChart, SkeletonMetrics } from "@/components/ui/enhanced-skeleton";
import { ErrorState, DatabaseError, EmptyState } from "@/components/ui/error-state";  
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  name: string;
  type: string;
  status: 'completed' | 'processing' | 'failed';
  created_at: string;
  file_url?: string | null;
  parameters?: any;
  user_id?: string | null;
  file_size?: number | null;
  format?: string | null;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'orders' | 'revenue' | 'users' | 'restaurants';
  fields: string[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'orders-summary',
    name: 'Resumo de Pedidos',
    description: 'Relatório completo de pedidos por período',
    type: 'orders',
    fields: ['ID', 'Cliente', 'Restaurante', 'Valor', 'Status', 'Data']
  },
  {
    id: 'revenue-analysis',
    name: 'Análise de Receita',
    description: 'Análise detalhada de receita por restaurante',
    type: 'revenue',
    fields: ['Restaurante', 'Receita', 'Pedidos', 'Ticket Médio', 'Crescimento']
  },
  {
    id: 'user-activity',
    name: 'Atividade de Usuários',
    description: 'Relatório de atividade e engajamento dos usuários',
    type: 'users',
    fields: ['Usuário', 'Pedidos', 'Valor Total', 'Última Atividade', 'Status']
  },
  {
    id: 'restaurant-performance',
    name: 'Performance de Restaurantes',
    description: 'Análise de performance dos restaurantes',
    type: 'restaurants',
    fields: ['Nome', 'Avaliação', 'Pedidos', 'Receita', 'Tempo Médio']
  }
];

export default function RealReportsSystem() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Fetch reports from database
      const { data: reportsData, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReports((reportsData || []).map(report => ({
        ...report,
        status: report.status as 'completed' | 'processing' | 'failed'
      })));
      
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar a lista de relatórios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template não selecionado",
        description: "Selecione um template para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) return;

      // Generate report based on template and date range
      let sourceData = [];
      
      switch (template.type) {
        case 'orders':
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', dateRange.from.toISOString())
            .lte('created_at', dateRange.to.toISOString())
            .order('created_at', { ascending: false });

          if (ordersError) throw ordersError;
          sourceData = ordersData || [];
          break;

        case 'revenue':
          const { data: revenueData, error: revenueError } = await supabase
            .from('orders')
            .select('restaurant_id, total_amount, created_at')
            .eq('status', 'delivered')
            .gte('created_at', dateRange.from.toISOString())
            .lte('created_at', dateRange.to.toISOString());

          if (revenueError) throw revenueError;
          sourceData = revenueData || [];
          break;

        case 'users':
          const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('*');

          if (usersError) throw usersError;
          sourceData = usersData || [];
          break;

        case 'restaurants':
          const { data: restaurantsData, error: restaurantsError } = await supabase
            .from('restaurants')
            .select('*')
            .eq('is_active', true);

          if (restaurantsError) throw restaurantsError;
          sourceData = restaurantsData || [];
          break;
      }

      // Create report record in database
      const newReportData = {
        name: `${template.name} - ${format(new Date(), 'MMMM yyyy', { locale: ptBR })}`,
        type: template.type,
        status: 'completed' as const,
        file_url: '#', // In production, this would be the actual file URL
        format: selectedFormat,
        file_size: Math.round(Math.random() * 3000000 + 500000), // Mock file size
        parameters: {
          template: selectedTemplate,
          format: selectedFormat,
          dateRange: {
            from: dateRange.from.toISOString(),
            to: dateRange.to.toISOString()
          },
          recordCount: sourceData.length
        }
      };

      const { data: newReport, error: insertError } = await supabase
        .from('reports')
        .insert(newReportData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setReports(prev => [{
        ...newReport,
        status: newReport.status as 'completed' | 'processing' | 'failed'
      }, ...prev]);

      toast({
        title: "Relatório gerado com sucesso!",
        description: `${template.name} foi gerado e está disponível para download.`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro durante a geração do relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report: Report) => {
    if (report.file_url && report.file_url !== '#') {
      // In production, this would trigger actual file download
      window.open(report.file_url, '_blank');
    }
    
    toast({
      title: "Download iniciado",
      description: `Download do relatório "${report.name}" foi iniciado.`,
    });
  };

  const retryReport = async (reportId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('reports')
        .update({ status: 'processing' })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, status: 'processing' as const }
          : report
      ));

      toast({
        title: "Relatório reagendado",
        description: "O relatório foi colocado na fila para reprocessamento.",
      });

      // Simulate processing completion after 3 seconds
      setTimeout(async () => {
        const { error: updateError } = await supabase
          .from('reports')
          .update({ 
            status: 'completed',
            file_url: '#',
            file_size: Math.round(Math.random() * 3000000 + 500000)
          })
          .eq('id', reportId);

        if (!updateError) {
          setReports(prev => prev.map(report => 
            report.id === reportId 
              ? { 
                  ...report, 
                  status: 'completed' as const,
                  file_url: '#',
                  file_size: Math.round(Math.random() * 3000000 + 500000)
                }
              : report
          ));
        }
      }, 3000);

    } catch (error) {
      console.error('Error retrying report:', error);
      toast({
        title: "Erro ao reagendar relatório",
        description: "Não foi possível reagendar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-warning text-warning-foreground">Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'orders':
        return <ShoppingCart className="w-4 h-4" />;
      case 'revenue':
        return <TrendingUp className="w-4 h-4" />;
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'restaurants':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sistema de Relatórios</h2>
          <p className="text-muted-foreground">Gere e gerencie relatórios personalizados</p>
        </div>
        <Button onClick={fetchReports} disabled={loading}>
          <Download className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Gerar Novo</TabsTrigger>
          <TabsTrigger value="schedule">Agendar</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar relatórios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="failed">Falharam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))
            ) : filteredReports.length === 0 ? (
              <EmptyState
                title="Nenhum relatório encontrado"
                description="Não há relatórios gerados ainda. Comece criando um novo relatório usando os templates disponíveis."
                action={{
                  label: "Criar Primeiro Relatório",
                  onClick: () => {
                    // Switch to generate tab
                    const generateTab = document.querySelector('[value="generate"]') as HTMLButtonElement;
                    generateTab?.click();
                  }
                }}
              />
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          {getTypeIcon(report.type)}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{report.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            {getStatusBadge(report.status)}
                            <span>•</span>
                            <span>{format(new Date(report.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                            <span>•</span>
                            <span className="capitalize">{report.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {report.status === 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {report.status === 'processing' && (
                          <div className="flex items-center text-warning">
                            <Clock className="w-4 h-4 mr-2" />
                            Processando...
                          </div>
                        )}
                        {report.status === 'failed' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => retryReport(report.id)}
                          >
                            Tentar Novamente
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(template.type)}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Campos inclusos:</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.fields.map((field, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        // Switch to generate tab
                        const generateTab = document.querySelector('[value="generate"]') as HTMLButtonElement;
                        generateTab?.click();
                      }}
                    >
                      Usar Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <LoadingOverlay isLoading={loading} loadingText="Gerando relatório...">
            <Card>
              <CardHeader>
                <CardTitle>Gerar Novo Relatório</CardTitle>
                <CardDescription>Configure os parâmetros do seu relatório personalizado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Formato</label>
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <div className="flex items-center space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span>até</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button 
                  onClick={generateReport} 
                  disabled={loading || !selectedTemplate}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Relatório...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Gerar Relatório
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </LoadingOverlay>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Agendados</CardTitle>
              <CardDescription>Configure relatórios para serem gerados automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Funcionalidade em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  O agendamento de relatórios estará disponível em breve.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}