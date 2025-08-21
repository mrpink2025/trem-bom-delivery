import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Database, Filter, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: string;
  old_values: any;
  new_values: any;
  user_id: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    table_name: '',
    operation: '',
    user_id: '',
    search: ''
  });
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // First check if user has admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Check user role from profiles table directly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || profileData?.role !== 'admin') {
        throw new Error("Acesso negado. Esta funcionalidade requer permissões de administrador.");
      }

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filter.table_name) {
        query = query.eq('table_name', filter.table_name);
      }
      if (filter.operation) {
        query = query.eq('operation', filter.operation);
      }
      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Audit logs query error:', error);
        throw new Error("Erro ao carregar logs de auditoria: " + error.message);
      }
      
      setLogs((data || []) as AuditLog[]);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar logs",
        description: error.message
      });
      setLogs([]); // Clear logs on error
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_old_audit_logs');
      if (error) {
        // Check if it's a permission error
        if (error.message.includes('permission denied') || 
            error.message.includes('row-level security') || 
            error.message.includes('insufficient privilege')) {
          throw new Error("Acesso negado. Esta operação requer permissões de administrador.");
        }
        throw error;
      }
      
      toast({
        title: "Limpeza concluída",
        description: "Logs antigos foram removidos com sucesso"
      });
      fetchAuditLogs();
    } catch (error: any) {
      console.error('Error cleaning up logs:', error);
      toast({
        variant: "destructive",
        title: "Erro na limpeza",
        description: error.message
      });
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filter]);

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-500';
      case 'UPDATE':
        return 'bg-blue-500';
      case 'DELETE':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'restaurants':
        return '🏪';
      case 'menu_items':
        return '🍽️';
      case 'orders':
        return '📦';
      case 'profiles':
        return '👤';
      default:
        return '📋';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h2>
          <p className="text-muted-foreground">
            Monitore todas as alterações no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAuditLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={cleanupOldLogs} variant="outline" size="sm">
            <Database className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            />
            <Select value={filter.table_name} onValueChange={(value) => setFilter(prev => ({ ...prev, table_name: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="restaurants">Restaurantes</SelectItem>
                <SelectItem value="menu_items">Itens do Menu</SelectItem>
                <SelectItem value="orders">Pedidos</SelectItem>
                <SelectItem value="profiles">Perfis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.operation} onValueChange={(value) => setFilter(prev => ({ ...prev, operation: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="INSERT">Inserção</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="ID do Usuário"
              value={filter.user_id}
              onChange={(e) => setFilter(prev => ({ ...prev, user_id: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas {logs.length} atividades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum log encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTableIcon(log.table_name)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={getOperationColor(log.operation)}>
                              {log.operation}
                            </Badge>
                            <span className="font-medium">{log.table_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Registro: {log.record_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                        </div>
                        {log.user_id && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {log.user_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(log.old_values || log.new_values) && (
                      <>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {log.old_values && (
                            <div>
                              <p className="font-medium text-red-600 mb-1">Valores Anteriores:</p>
                              <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <p className="font-medium text-green-600 mb-1">Novos Valores:</p>
                              <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;