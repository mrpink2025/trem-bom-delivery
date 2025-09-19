import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Target, Gamepad2, Coins, TrendingUp } from 'lucide-react'
import PoolMatchManager from './PoolMatchManager'
import { GameWallet } from './GameWallet'
import { GameHistory } from './GameHistory'
import { GameRanking } from './GameRanking'
import SinucaTremBao from '../SinucaTremBao'

const GamesModule: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [currentView, setCurrentView] = useState<'pool-lobby' | 'wallet' | 'history' | 'ranking' | 'play-game'>('pool-lobby')
  const [userCredits, setUserCredits] = useState<number>(0)

  const loadWalletBalance = async () => {
    try {
      console.log('[GamesModule] 💰 Loading wallet balance...');
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: { operation: 'get_balance' }
      });

      console.log('[GamesModule] 💰 Wallet response:', { data, error });

      if (error) {
        console.error('[GamesModule] ❌ Wallet error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('[GamesModule] ❌ Wallet data error:', data.error);
        throw new Error(data.error);
      }

      const balance = data?.availableBalance || data?.balance || 0;
      console.log('[GamesModule] ✅ Wallet balance loaded:', balance);
      setUserCredits(balance);
    } catch (error: any) {
      console.error('[GamesModule] ❌ Error loading wallet:', error);
      
      // Try direct database query as fallback
      try {
        console.log('[GamesModule] 🔄 Trying direct database query as fallback...');
        const { data: rewards, error: dbError } = await supabase
          .from('customer_rewards')
          .select('current_points')
          .eq('user_id', user?.id)
          .single();
          
        if (!dbError && rewards) {
          console.log('[GamesModule] ✅ Fallback balance loaded:', rewards.current_points);
          setUserCredits(rewards.current_points);
        }
      } catch (fallbackError) {
        console.error('[GamesModule] ❌ Fallback also failed:', fallbackError);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadWalletBalance();
      // Reload balance every 30 seconds to keep it fresh
      const balanceInterval = setInterval(loadWalletBalance, 30000);
      return () => clearInterval(balanceInterval);
    }
  }, [user]);

  // Reload balance when returning to lobby
  useEffect(() => {
    if (currentView === 'pool-lobby' && user) {
      loadWalletBalance();
    }
  }, [currentView, user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Faça login para jogar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Você precisa estar logado para acessar os jogos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      {/* Header com saldo */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-full">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sinuca 8-Ball</h1>
                <p className="text-sm text-muted-foreground">
                  Jogue sinuca profissional e ganhe créditos
                </p>
              </div>
            </div>
            
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">
                    {userCredits.toLocaleString()} créditos
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadWalletBalance}
                    className="h-6 w-6 p-0 ml-2"
                  >
                    🔄
                  </Button>
                </div>
                
                <Badge variant="outline" className="px-3 py-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Beta
                </Badge>
              </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pool-lobby" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Lobby
            </TabsTrigger>
            <TabsTrigger value="play-game" className="flex items-center gap-2">
              🎱
              Jogar
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Carteira
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pool-lobby" className="space-y-6">
            <PoolMatchManager userCredits={userCredits} />
          </TabsContent>

          <TabsContent value="play-game" className="space-y-6">
            <SinucaTremBao 
              config={{
                logoUrl: '/assets/brand/trembao-logo-sinuca.png',
                logoScale: 0.6,
                logoOpacity: 0.3,
                logoRotation: 0
              }}
              onGameEvent={(eventType, payload) => {
                console.log('🎱 Game Event:', eventType, payload);
                // Aqui pode implementar lógica de pontuação/créditos
                if (eventType === 'ballPocketed') {
                  // Atualizar créditos baseado no resultado
                }
              }}
            />
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <GameWallet 
              balance={userCredits} 
              onBalanceUpdate={loadWalletBalance}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <GameHistory />
          </TabsContent>

          <TabsContent value="ranking" className="space-y-6">
            <GameRanking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default GamesModule
