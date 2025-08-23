import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, MapPin, Clock, FileText, AlertTriangle, Eye, CheckCircle, XCircle, Ban, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Utility function to format address JSON
const formatAddress = (addressJson: any): string => {
  if (!addressJson) return 'N/A'
  
  try {
    const addr = typeof addressJson === 'string' ? JSON.parse(addressJson) : addressJson
    const parts = [
      addr.street,
      addr.number,
      addr.neighborhood,
      addr.city,
      addr.state,
      addr.cep
    ].filter(Boolean)
    
    return parts.join(', ') || 'Endereço incompleto'
  } catch (e) {
    return 'Endereço inválido'
  }
}

interface PendingItem {
  id: string
  kind: 'merchant' | 'courier'
  // Merchant fields
  legal_name?: string
  trade_name?: string
  cnpj?: string
  store_units_count?: number
  // Courier fields
  full_name?: string
  cpf?: string
  plate?: string
  vehicle_brand?: string
  vehicle_model?: string
  cnh_valid_until?: string
  crlv_valid_until?: string
  cnh_expiring_soon?: boolean
  crlv_expiring_soon?: boolean
  cnh_expired?: boolean
  crlv_expired?: boolean
  // Common fields
  phone: string
  email?: string
  address_json: any
  status: string
  submitted_at: string
  rejection_reason?: string
  documents: any[]
  missing_documents: string[]
  completion_percentage: number
  days_waiting: number
  document_urls: Record<string, string>
}

interface BulkAction {
  action: 'APPROVE' | 'REJECT' | 'SUSPEND'
  reason?: string
}

export function PendingApplications() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'all' | 'merchant' | 'courier'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null)
  const [bulkActionDialog, setBulkActionDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<BulkAction>({ action: 'APPROVE' })
  const [actionLoading, setActionLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  
  const { toast } = useToast()

  const fetchPendingItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-pending')

      if (error) throw error

      setPendingItems(data.data || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching pending items:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar pendências',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingItems()
  }, [selectedTab, searchQuery, cityFilter, stateFilter, page])

  const handleApprove = async (item: PendingItem, notes?: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase.functions.invoke('admin-approve', {
        body: {
          kind: item.kind,
          id: item.id,
          notes
        }
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `${item.kind === 'merchant' ? 'Loja' : 'Motoboy'} aprovado com sucesso`
      })

      fetchPendingItems()
      setSelectedItem(null)
    } catch (error) {
      console.error('Error approving:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar solicitação',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (item: PendingItem, reason: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase.functions.invoke('admin-reject', {
        body: {
          kind: item.kind,
          id: item.id,
          reason
        }
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `${item.kind === 'merchant' ? 'Loja' : 'Motoboy'} rejeitado`
      })

      fetchPendingItems()
      setSelectedItem(null)
    } catch (error) {
      console.error('Error rejecting:', error)
      toast({
        title: 'Erro', 
        description: 'Erro ao rejeitar solicitação',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async (item: PendingItem, reason: string) => {
    setActionLoading(true)
    try {
      const { error } = await supabase.functions.invoke('admin-suspend', {
        body: {
          kind: item.kind,
          id: item.id,
          reason
        }
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `${item.kind === 'merchant' ? 'Loja' : 'Motoboy'} suspenso`
      })

      fetchPendingItems()
      setSelectedItem(null)
    } catch (error) {
      console.error('Error suspending:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao suspender',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos um item',
        variant: 'destructive'
      })
      return
    }

    setActionLoading(true)
    try {
      const promises = selectedItems.map(id => {
        const item = pendingItems.find(p => p.id === id)
        if (!item) return Promise.resolve()

        switch (bulkAction.action) {
          case 'APPROVE':
            return supabase.functions.invoke('admin-approve', {
              body: { kind: item.kind, id: item.id, notes: bulkAction.reason }
            })
          case 'REJECT':
            return supabase.functions.invoke('admin-reject', {
              body: { kind: item.kind, id: item.id, reason: bulkAction.reason || 'Rejeição em massa' }
            })
          case 'SUSPEND':
            return supabase.functions.invoke('admin-suspend', {
              body: { kind: item.kind, id: item.id, reason: bulkAction.reason || 'Suspensão em massa' }
            })
          default:
            return Promise.resolve()
        }
      })

      await Promise.all(promises)

      toast({
        title: 'Sucesso',
        description: `${selectedItems.length} itens processados em massa`
      })

      setSelectedItems([])
      setBulkActionDialog(false)
      fetchPendingItems()
    } catch (error) {
      console.error('Error in bulk action:', error)
      toast({
        title: 'Erro',
        description: 'Erro na ação em massa',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (item: PendingItem) => {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'
    let color = 'bg-yellow-500'
    
    if (item.completion_percentage === 100) {
      variant = 'default'
      color = 'bg-green-500'
    } else if (item.completion_percentage < 50) {
      variant = 'destructive'
      color = 'bg-red-500'
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant={variant}>
          {item.completion_percentage}% completo
        </Badge>
        {item.kind === 'courier' && (item.cnh_expired || item.crlv_expired) && (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Documento vencido
          </Badge>
        )}
        {item.kind === 'courier' && (item.cnh_expiring_soon || item.crlv_expiring_soon) && (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Vence em breve
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pendências de Aprovação</h1>
        <p className="text-muted-foreground">
          Gerencie solicitações de lojistas e motoboys aguardando aprovação
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por nome, CNPJ/CPF, placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                <SelectItem value="Goiânia">Goiânia</SelectItem>
                <SelectItem value="Aparecida de Goiânia">Aparecida de Goiânia</SelectItem>
                <SelectItem value="Anápolis">Anápolis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="DF">DF</SelectItem>
                <SelectItem value="MT">MT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Lojistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pendingItems.filter(item => item.kind === 'merchant').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Motoboys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pendingItems.filter(item => item.kind === 'courier').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedItems.length} itens selecionados</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>
                  Desmarcar todos
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    setBulkAction({ action: 'APPROVE' })
                    setBulkActionDialog(true)
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Aprovar Selecionados
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    setBulkAction({ action: 'REJECT' })
                    setBulkActionDialog(true)
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Rejeitar Selecionados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="merchant">Lojistas</TabsTrigger>
          <TabsTrigger value="courier">Motoboys</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Lista de pendências */}
              <div className="space-y-4">
                {pendingItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, item.id])
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id))
                            }
                          }}
                        />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          {/* Tipo e Nome */}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={item.kind === 'merchant' ? 'default' : 'secondary'}>
                                {item.kind === 'merchant' ? 'Loja' : 'Motoboy'}
                              </Badge>
                            </div>
                            <div className="font-semibold mt-1">
                              {item.kind === 'merchant' ? item.trade_name : item.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.kind === 'merchant' ? item.cnpj : `CPF: ${item.cpf}`}
                            </div>
                          </div>

                          {/* Localização */}
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              <span>{item.address_json?.city || 'N/A'}/{item.address_json?.state || 'N/A'}</span>
                            </div>
                            {item.kind === 'merchant' && (
                              <div className="text-xs text-muted-foreground">
                                {item.store_units_count} unidades
                              </div>
                            )}
                            {item.kind === 'courier' && (
                              <div className="text-xs text-muted-foreground">
                                {item.plate} - {item.vehicle_brand} {item.vehicle_model}
                              </div>
                            )}
                          </div>

                          {/* Status dos documentos */}
                          <div>
                            {getStatusBadge(item)}
                            {item.missing_documents.length > 0 && (
                              <div className="text-xs text-red-600 mt-1">
                                Faltam: {item.missing_documents.join(', ')}
                              </div>
                            )}
                          </div>

                          {/* Tempo esperando */}
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3" />
                              <span>{item.days_waiting} dias</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.submitted_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex gap-2 justify-end">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Detalhes
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="w-[600px] sm:w-[700px]">
                                {selectedItem && (
                                  <ApplicationDetails 
                                    item={selectedItem}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onSuspend={handleSuspend}
                                    loading={actionLoading}
                                  />
                                )}
                              </SheetContent>
                            </Sheet>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {pagination.totalPages} ({pagination.totalCount} itens)
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <Button 
                      variant="outline"
                      disabled={!pagination.hasNext}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction.action === 'APPROVE' ? 'Aprovar' : 
               bulkAction.action === 'REJECT' ? 'Rejeitar' : 'Suspender'} em Massa
            </DialogTitle>
            <DialogDescription>
              Você está prestes a {bulkAction.action.toLowerCase()} {selectedItems.length} itens selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder={
                bulkAction.action === 'APPROVE' ? 'Notas da aprovação (opcional)' :
                bulkAction.action === 'REJECT' ? 'Motivo da rejeição (obrigatório)' :
                'Motivo da suspensão (obrigatório)'
              }
              value={bulkAction.reason || ''}
              onChange={(e) => setBulkAction({ ...bulkAction, reason: e.target.value })}
              required={bulkAction.action !== 'APPROVE'}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkAction}
              disabled={actionLoading || (bulkAction.action !== 'APPROVE' && !bulkAction.reason?.trim())}
              className={
                bulkAction.action === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Component para mostrar detalhes da aplicação
interface ApplicationDetailsProps {
  item: PendingItem
  onApprove: (item: PendingItem, notes?: string) => void
  onReject: (item: PendingItem, reason: string) => void
  onSuspend: (item: PendingItem, reason: string) => void
  loading: boolean
}

function ApplicationDetails({ item, onApprove, onReject, onSuspend, loading }: ApplicationDetailsProps) {
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const handleAction = () => {
    if (actionType === 'approve') {
      onApprove(item, notes.trim() || undefined)
    } else if (actionType === 'reject' && reason.trim()) {
      onReject(item, reason.trim())
    } else if (actionType === 'suspend' && reason.trim()) {
      onSuspend(item, reason.trim())
    }
    
    // Reset form
    setActionType(null)
    setReason('')
    setNotes('')
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {item.kind === 'merchant' ? 'Loja' : 'Motoboy'}: {' '}
          {item.kind === 'merchant' ? item.trade_name : item.full_name}
        </SheetTitle>
        <SheetDescription>
          Aguardando aprovação há {item.days_waiting} dias • {item.completion_percentage}% completo
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 py-4">
        {/* Dados básicos */}
        <div>
          <h3 className="font-medium mb-3">Informações Básicas</h3>
          <div className="space-y-2 text-sm">
            {item.kind === 'merchant' ? (
              <>
                <div><span className="font-medium">Razão Social:</span> {item.legal_name}</div>
                <div><span className="font-medium">Nome Fantasia:</span> {item.trade_name}</div>
                <div><span className="font-medium">CNPJ:</span> {item.cnpj}</div>
                <div><span className="font-medium">Unidades:</span> {item.store_units_count}</div>
              </>
            ) : (
              <>
                <div><span className="font-medium">Nome:</span> {item.full_name}</div>
                <div><span className="font-medium">CPF:</span> {item.cpf}</div>
                <div><span className="font-medium">Placa:</span> {item.plate}</div>
                <div><span className="font-medium">Veículo:</span> {item.vehicle_brand} {item.vehicle_model}</div>
                {item.cnh_valid_until && (
                  <div className={`${item.cnh_expired ? 'text-red-600' : item.cnh_expiring_soon ? 'text-yellow-600' : ''}`}>
                    <span className="font-medium">CNH válida até:</span> {new Date(item.cnh_valid_until).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {item.crlv_valid_until && (
                  <div className={`${item.crlv_expired ? 'text-red-600' : item.crlv_expiring_soon ? 'text-yellow-600' : ''}`}>
                    <span className="font-medium">CRLV válido até:</span> {new Date(item.crlv_valid_until).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </>
            )}
            <div><span className="font-medium">Telefone:</span> {item.phone}</div>
            {item.email && <div><span className="font-medium">Email:</span> {item.email}</div>}
            <div><span className="font-medium">Endereço:</span> {formatAddress(item.address_json)}</div>
          </div>
        </div>

        {/* Documentos */}
        <div>
          <h3 className="font-medium mb-3">Documentos</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(item.document_urls).map(([type, url]) => (
              <Button 
                key={type}
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="h-auto py-2"
              >
                <FileText className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <div className="text-xs">{type.replace('_', ' ')}</div>
                  <div className="text-xs text-muted-foreground">Preview</div>
                </div>
              </Button>
            ))}
          </div>
          
          {item.missing_documents.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-800">Documentos Faltantes:</div>
              <div className="text-sm text-red-600">
                {item.missing_documents.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Rejeição anterior */}
        {item.rejection_reason && (
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-sm font-medium text-yellow-800">Motivo da última rejeição:</div>
            <div className="text-sm text-yellow-700">{item.rejection_reason}</div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4 border-t pt-4">
          {!actionType ? (
            <div className="flex gap-2">
              <Button 
                onClick={() => setActionType('approve')}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setActionType('reject')}
                disabled={loading}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
              <Button 
                variant="outline"
                onClick={() => setActionType('suspend')}
                disabled={loading}
              >
                <Ban className="w-4 h-4 mr-1" />
                Suspender
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {actionType === 'approve' ? (
                <div>
                  <label className="text-sm font-medium">Notas da aprovação (opcional)</label>
                  <Textarea
                    placeholder="Observações sobre a aprovação..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">
                    Motivo da {actionType === 'reject' ? 'rejeição' : 'suspensão'} *
                  </label>
                  <Textarea
                    placeholder={`Digite o motivo da ${actionType === 'reject' ? 'rejeição' : 'suspensão'}...`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleAction}
                  disabled={loading || (actionType !== 'approve' && !reason.trim())}
                  className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {loading ? 'Processando...' : 'Confirmar'}
                </Button>
                <Button variant="outline" onClick={() => setActionType(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}