import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Target, Gamepad2, Coins, TrendingUp } from 'lucide-react'
import PoolGame from './PoolGame'
import PoolLobby from './PoolLobby'
import { usePoolWebSocket } from '@/hooks/usePoolWebSocket'
import { GameWallet } from './GameWallet'
import { GameHistory } from './GameHistory'
import { GameRanking } from './GameRanking'

const GamesModule: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [currentView, setCurrentView] = useState<'pool-lobby' | 'pool-game' | 'wallet' | 'history' | 'ranking'>('pool-lobby')
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null)
  const [userCredits, setUserCredits] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Pool WebSocket connection
  const poolWS = usePoolWebSocket()

  // Carregar saldo da carteira
  const loadWalletBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: { operation: 'get_balance' }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setUserCredits(data.availableBalance || 0);
    } catch (error: any) {
      console.error('Error loading wallet:', error);
    }
  };

  // Handle joining a pool match
  const handleJoinPoolMatch = (matchId: string) => {
    setCurrentMatchId(matchId)
    setCurrentView('pool-game')
  }

  // Handle back to lobby
  const handleBackToLobby = () => {
    setCurrentMatchId(null)
    setCurrentView('pool-lobby')
    poolWS.disconnect()
  }

  useEffect(() => {
    if (user) {
      loadWalletBalance();
    }
  }, [user]);

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
                  {userCredits.toFixed(0)} créditos
                </span>
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
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="pool-lobby">Lobby</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="wallet">Carteira</TabsTrigger>
          </TabsList>

          <TabsContent value="pool-lobby">
            <PoolLobby 
              onJoinMatch={handleJoinPoolMatch}
              userCredits={userCredits}
            />
          </TabsContent>

          <TabsContent value="pool-game">
            {currentMatchId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Partida em Andamento</h2>
                  <Button 
                    variant="outline" 
                    onClick={handleBackToLobby}
                  >
                    Voltar ao Lobby
                  </Button>
                </div>
                
                <PoolGame 
                  gameState={poolWS.gameState}
                  isMyTurn={poolWS.gameState?.turnUserId === user?.id}
                  playerId={user?.id || ''}
                  onShoot={poolWS.shoot}
                  onPlaceCueBall={poolWS.placeCueBall}
                  onSendMessage={poolWS.sendMessage}
                  messages={poolWS.messages || []}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking">
            <GameRanking />
          </TabsContent>

          <TabsContent value="history">
            <GameHistory />
          </TabsContent>

          <TabsContent value="wallet">
            <GameWallet 
              balance={userCredits} 
              onBalanceUpdate={loadWalletBalance}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GamesModule;