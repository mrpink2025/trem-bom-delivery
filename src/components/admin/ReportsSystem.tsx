import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Download, 
  FileText, 
  BarChart3, 
  PieChart, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  Mail,
  Share2,
  Settings
} from "lucide-react";

const mockReports = [
  {
    id: "REP-001",
    name: "Relatório Financeiro Mensal",
    type: "financial",
    description: "Análise completa de receitas, despesas e lucro mensal",
    status: "completed",
    lastGenerated: "2024-01-15",
    schedule: "monthly",
    format: "PDF",
    size: "2.4 MB"
  },
  {
    id: "REP-002",
    name: "Performance de Restaurantes",
    type: "performance", 
    description: "Ranking e métricas de todos os restaurantes parceiros",
    status: "processing",
    lastGenerated: "2024-01-14",
    schedule: "weekly",
    format: "Excel",
    size: "1.8 MB"
  },
  {
    id: "REP-003", 
    name: "Análise de Entregadores",
    type: "couriers",
    description: "Relatório de performance e produtividade dos entregadores",
    status: "completed",
    lastGenerated: "2024-01-13",
    schedule: "weekly", 
    format: "PDF",
    size: "987 KB"
  },
  {
    id: "REP-004",
    name: "Relatório de Satisfação",
    type: "customer",
    description: "Pesquisa de satisfação e feedback dos clientes",
    status: "failed",
    lastGenerated: "2024-01-12", 
    schedule: "monthly",
    format: "Excel",
    size: "-"
  }
];

const reportTemplates = [
  {
    id: "template-1",
    name: "Relatório Financeiro",
    description: "Receitas, despesas e análise de lucro",
    category: "financial",
    fields: ["receita", "despesas", "lucro", "ticket_medio", "pedidos"]
  },
  {
    id: "template-2", 
    name: "Performance de Restaurantes",
    description: "Métricas de performance dos parceiros",
    category: "performance",
    fields: ["pedidos", "receita", "avaliacao", "tempo_entrega", "taxa_cancelamento"]
  },
  {
    id: "template-3",
    name: "Análise de Entregadores", 
    description: "Produtividade e performance dos entregadores",
    category: "couriers",
    fields: ["entregas", "tempo_medio", "avaliacao", "regiao", "veiculo"]
  },
  {
    id: "template-4",
    name: "Relatório de Clientes",
    description: "Análise comportamental e satisfação",
    category: "customer", 
    fields: ["novos_usuarios", "retencao", "satisfacao", "valor_vida", "segmentacao"]
  }
];

export default function ReportsSystem() {
  const [selectedReport, setSelectedReport] = useState("");
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [reportFormat, setReportFormat] = useState("pdf");
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-warning text-warning-foreground">Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'scheduled':
        return <Badge className="bg-sky text-sky-foreground">Agendado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <BarChart3 className="w-4 h-4" />;
      case 'performance':
        return <PieChart className="w-4 h-4" />;
      case 'couriers':
        return <FileText className="w-4 h-4" />;
      case 'customer':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReports = mockReports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sistema de Relatórios</h2>
          <p className="text-muted-foreground">Geração e gerenciamento de relatórios personalizados</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generate">Gerar Novo</TabsTrigger>
          <TabsTrigger value="schedule">Agendamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar relatórios..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="couriers">Entregadores</SelectItem>
                <SelectItem value="customer">Clientes</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Reports List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-card transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(report.type)}
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Última geração:</span>
                      <span>{format(new Date(report.lastGenerated), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frequência:</span>
                      <span className="capitalize">{report.schedule}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Formato:</span>
                      <Badge variant="outline">{report.format}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tamanho:</span>
                      <span>{report.size}</span>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-card transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(template.category)}
                    <CardTitle>{template.name}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Campos incluídos:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.fields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full">
                      Usar Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerar Novo Relatório</CardTitle>
              <p className="text-muted-foreground">Configure os parâmetros para gerar um relatório personalizado</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportType">Tipo de Relatório</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financeiro</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="couriers">Entregadores</SelectItem>
                      <SelectItem value="customer">Clientes</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Formato</Label>
                  <Select value={reportFormat} onValueChange={setReportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filters">Filtros Adicionais</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Restaurante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="dona-maria">Dona Maria</SelectItem>
                      <SelectItem value="tempero-goiano">Tempero Goiano</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="centro">Centro</SelectItem>
                      <SelectItem value="savassi">Savassi</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="delivered">Entregues</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Relatório
                </Button>
                <Button variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  Agendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Agendados</CardTitle>
              <p className="text-muted-foreground">Configure a geração automática de relatórios</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReports.filter(r => r.schedule !== 'manual').map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(report.type)}
                      <div>
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Próxima geração em 3 dias • {report.schedule}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{report.format}</Badge>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                      <Button variant="outline" size="sm">
                        Pausar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}