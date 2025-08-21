import { useState } from 'react'
import { Plus, Edit2, Trash2, Target, Tag, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { MarkupRule, useDeleteMarkupRule } from '@/hooks/useDynamicPricing'
import { MarkupRuleForm } from './MarkupRuleForm'
import { useQueryClient } from '@tanstack/react-query'

interface MarkupRulesPanelProps {
  restaurantId: string
  rules: MarkupRule[]
  isLoading: boolean
}

export function MarkupRulesPanel({ restaurantId, rules, isLoading }: MarkupRulesPanelProps) {
  const [editingRule, setEditingRule] = useState<MarkupRule | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const deleteRule = useDeleteMarkupRule()

  const handleEdit = (rule: MarkupRule) => {
    setEditingRule(rule)
    setIsFormOpen(true)
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteRule.mutateAsync(ruleId)
      toast({
        title: 'Regra removida',
        description: 'A regra foi desativada com sucesso.'
      })
      queryClient.invalidateQueries({ queryKey: ['markup-rules', restaurantId] })
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a regra. Tente novamente.',
        variant: 'destructive'
      })
    }
  }

  const handleFormClose = () => {
    setEditingRule(null)
    setIsFormOpen(false)
  }

  const getRuleIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'PRODUCT': return <Target className="h-4 w-4" />
      case 'CATEGORY': return <Tag className="h-4 w-4" />
      case 'STORE': return <Store className="h-4 w-4" />
      default: return <Store className="h-4 w-4" />
    }
  }

  const getRuleLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'PRODUCT': return 'Produto'
      case 'CATEGORY': return 'Categoria' 
      case 'STORE': return 'Loja Geral'
      default: return 'Desconhecido'
    }
  }

  const formatMargin = (marginType: string, marginValue: number) => {
    return marginType === 'PERCENT' ? `${marginValue}%` : `R$ ${marginValue.toFixed(2)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Regras Ativas</h3>
          <p className="text-sm text-muted-foreground">
            {rules.length} regra{rules.length !== 1 ? 's' : ''} configurada{rules.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingRule(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regra' : 'Nova Regra de Markup'}
              </DialogTitle>
              <DialogDescription>
                Configure uma regra específica por produto, categoria ou geral da loja
              </DialogDescription>
            </DialogHeader>
            <MarkupRuleForm
              restaurantId={restaurantId}
              rule={editingRule}
              onSuccess={handleFormClose}
              onCancel={handleFormClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma regra configurada
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie regras de markup para começar a aplicar margens nos seus produtos
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira regra
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRuleIcon(rule.rule_type)}
                      <span className="font-medium">{getRuleLabel(rule.rule_type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">#{rule.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      {formatMargin(rule.margin_type, rule.margin_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                      {rule.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rule.id && handleDelete(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}