import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, CreditCard, History, Plus, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GameWalletProps {
  balance: number;
  onBalanceUpdate: () => void;
}

interface Transaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reason: string;
  description: string | null;
  created_at: string;
}

const conversionRates = [
  { fiat: 10, credits: 10, bonus: 0 },
  { fiat: 25, credits: 25, bonus: 2 },
  { fiat: 50, credits: 50, bonus: 5 },
  { fiat: 100, credits: 100, bonus: 15 },
];

export const GameWallet: React.FC<GameWalletProps> = ({ balance, onBalanceUpdate }) => {
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [addCreditsDialog, setAddCreditsDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(0);

  // Carregar histórico de transações
  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
    }
  };

  // Adicionar créditos (simulação de compra)
  const handleAddCredits = async () => {
    const pack = conversionRates[selectedPackage];
    const totalCredits = pack.credits + pack.bonus;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'add_credits',
          amount: totalCredits,
          reason: 'PURCHASE',
          description: `Compra de R$ ${pack.fiat} - ${pack.credits} créditos + ${pack.bonus} bônus`
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Créditos Adicionados!",
        description: `${totalCredits} créditos foram adicionados à sua conta`,
      });

      setAddCreditsDialog(false);
      onBalanceUpdate();
      loadTransactions();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao adicionar créditos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTransactionIcon = (type: string, reason: string) => {
    if (type === 'CREDIT') {
      return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    } else {
      return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      'PURCHASE': 'Compra',
      'BUY_IN': 'Entrada em jogo',
      'PRIZE': 'Prêmio',
      'RAKE': 'Taxa da casa',
      'REFUND': 'Reembolso',
      'ADMIN_ADJUST': 'Ajuste administrativo'
    };
    return labels[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Card de saldo */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-full">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Carteira de Créditos</h2>
              <p className="text-muted-foreground">
                Gerencie seus créditos para jogos
              </p>
            </div>
          </div>

          <Dialog open={addCreditsDialog} onOpenChange={setAddCreditsDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Créditos
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Saldo Atual</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {balance.toFixed(2)}
            </p>
            <p className="text-sm text-green-600/80">créditos disponíveis</p>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-3 mb-2">
              <History className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Transações</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {transactions.length}
            </p>
            <p className="text-sm text-blue-600/80">total de movimentações</p>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 p-6 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-600">Taxa</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              1:1
            </p>
            <p className="text-sm text-purple-600/80">R$ por crédito</p>
          </div>
        </div>
      </Card>

      {/* Histórico de transações */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Histórico de Transações</h3>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type, transaction.reason)}
                  <div>
                    <p className="font-medium">
                      {getReasonLabel(transaction.reason)}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'CREDIT' ? '+' : '-'}
                    {transaction.amount.toFixed(2)}
                  </p>
                  <Badge variant={transaction.type === 'CREDIT' ? 'default' : 'secondary'} className="text-xs">
                    {transaction.type === 'CREDIT' ? 'Entrada' : 'Saída'}
                  </Badge>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          )}
        </div>
      </Card>

      {/* Dialog para adicionar créditos */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Créditos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Escolha um pacote de créditos para adicionar à sua carteira:
          </p>

          <div className="grid grid-cols-2 gap-4">
            {conversionRates.map((pack, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    selectedPackage === index 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPackage(index)}
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      R$ {pack.fiat}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm">
                        {pack.credits} créditos
                      </p>
                      {pack.bonus > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          + {pack.bonus} bônus
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-lg font-bold text-green-600">
                        = {pack.credits + pack.bonus} créditos
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Como funciona?
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Créditos são usados para apostas em jogos</li>
              <li>• Não há saque, apenas consumo no app</li>
              <li>• Prêmios voltam como créditos ou cupons</li>
              <li>• Taxa de conversão: R$ 1 = 1 crédito</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setAddCreditsDialog(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddCredits}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Processando..." : `Comprar por R$ ${conversionRates[selectedPackage].fiat}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </div>
  );
};