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

  const poolWS = usePoolWebSocket()

  // Auto-navigation for LIVE games
  useEffect(() => {
    if (!currentMatchId) return;

    console.log('[GamesModule] 🔍 Navigation check:', {
      currentView,
      matchStatus: poolWS.matchData?.status,
      hasStarted: poolWS.hasStarted,
      connected: poolWS.isConnected,
      currentMatchId
    })
    
    // Navigate to game if match is LIVE or started
    if (poolWS.matchData?.status === 'LIVE' && !poolWS.hasStarted) {
      console.log('[GamesModule] 🚨 Game is LIVE but hasStarted=false, forcing start')
      toast({
        title: 'Jogo iniciado',
        description: `Mesa de sinuca carregada para ${poolWS.matchData?.status}`,
      })
      console.log(`[GamesModule] 🎯 Match status: ${poolWS.matchData?.status}, hasStarted: ${poolWS.hasStarted}`);
    }

    // Navigate to game view if match has started
    if (poolWS.hasStarted && currentView !== 'pool-game') {
      console.log('[GamesModule] 🚀 IMMEDIATE NAVIGATION to pool-game - match has started!')
      setCurrentView('pool-game')
      return;
    }

    // CRITICAL FALLBACK: Aggressive database check with shorter timeout
    const fallbackTimer = setTimeout(async () => {
      if (currentView !== 'pool-game' && currentMatchId && !poolWS.hasStarted) {
        console.log('[GamesModule] ⚠️ AGGRESSIVE FALLBACK: Checking match status after 3 seconds...');
        
        try {
          const { data: matchData, error } = await supabase
            .from('pool_matches')
            .select('*')
            .eq('id', currentMatchId)
            .single();

          console.log('[GamesModule] 🔍 FALLBACK: DB match status:', {
            status: matchData?.status,
            hasGameState: !!(matchData as any)?.game_state
          });

          if (matchData && matchData.status === 'LIVE') {
            console.log('[GamesModule] 🔄 DEFINITIVE FALLBACK: Match is LIVE - FORCING navigation NOW!');
            
            setCurrentView('pool-game');
            toast({
              title: "Jogo iniciado!",
              description: "Entrando na partida...",
            });
          }
        } catch (error) {
          console.error('[GamesModule] ❌ Fallback check failed:', error);
        }
      }
    }, 3000); // Reduced to 3 seconds for faster response

    return () => clearTimeout(fallbackTimer);
  }, [poolWS.matchData?.status, poolWS.hasStarted, poolWS.isConnected, currentView, currentMatchId, toast]);

  // Auto-return to lobby when game finishes
  useEffect(() => {
    if (poolWS.matchData?.status === 'FINISHED' || poolWS.matchData?.status === 'CANCELLED') {
      console.log('[GamesModule] 🏁 Game ended, redirecting to lobby')
      handleBackToLobby()
    }
  }, [poolWS.matchData?.status]);

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
  const handleJoinPoolMatch = async (matchId: string) => {
    console.log('[GamesModule] 🎯 STARTING handleJoinPoolMatch with matchId:', matchId)
    setCurrentMatchId(matchId)
    setLoading(true)
    
    // Navigate to pool-game view immediately to show waiting state
    setCurrentView('pool-game')
    
    try {
      console.log('[GamesModule] 📞 Calling poolWS.connectToMatch...')
      // Connect to WebSocket first
      await poolWS.connectToMatch(matchId)
      console.log('[GamesModule] ✅ poolWS.connectToMatch completed for:', matchId)
      
      // Show connecting state temporarily
      toast({
        title: "Conectado!",
        description: "Aguardando outros jogadores..."
      })
      
      console.log('[GamesModule] 🎮 WebSocket connected, waiting for game state updates...')
      
    } catch (error) {
      console.error('[GamesModule] ❌ Error connecting to match:', error)
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao jogo. Tente novamente.",
        variant: "destructive"
      })
      handleBackToLobby()
    } finally {
      setLoading(false)
    }
  }

  // Handle back to lobby
  const handleBackToLobby = () => {
    console.log('[GamesModule] Returning to lobby')
    setCurrentMatchId(null)
    setCurrentView('pool-lobby')
    setLoading(false)
    poolWS.disconnect()
  }

  // Handle canceling match
  const handleCancelMatch = async () => {
    if (!currentMatchId || !poolWS.matchData) return;
    
    try {
      const { error } = await supabase.functions.invoke('pool-match-cancel', {
        body: { matchId: currentMatchId }
      });
      
      if (error) throw error;
      
      toast({
        title: "Partida cancelada",
        description: "Você foi redirecionado ao lobby."
      });
      
      handleBackToLobby();
    } catch (error) {
      console.error('Error canceling match:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a partida.",
        variant: "destructive"
      });
    }
  };

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
        {/* Pool Game Section - WebSocket driven navigation */}
        {currentView === 'pool-game' && currentMatchId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Partida em Andamento</h2>
              <div className="flex items-center gap-2">
                {/* Connection Status */}
                {poolWS.isConnected ? (
                  <Badge variant="outline" className="text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                    Desconectado
                  </Badge>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleBackToLobby}
                >
                  Voltar ao Lobby
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Conectando à partida...</p>
                </div>
              </div>
            ) : poolWS.hasStarted && poolWS.gameState ? (
              <PoolGame 
                key={poolWS.renderKey}
                gameState={{
                  ...poolWS.gameState,
                  gamePhase: poolWS.gameState.phase || 'BREAK',
                  status: (poolWS.matchData?.status === 'COUNTDOWN' ? 'LOBBY' : poolWS.matchData?.status) || 'LOBBY',
                  players: poolWS.gameState.players.map(p => ({
                    userId: p.user_id,
                    seat: p.seat,
                    connected: p.connected,
                    mmr: p.mmr,
                    group: p.group
                  }))
                }}
                isMyTurn={poolWS.gameState?.turnUserId === user?.id}
                playerId={user?.id || ''}
                onShoot={poolWS.shoot}
                onPlaceCueBall={poolWS.placeCueBall}
                onSendMessage={poolWS.sendMessage}
                messages={poolWS.messages.map(m => ({ userId: m.sender, message: m.message, timestamp: m.timestamp.getTime() }))}
              />
            ) : poolWS.matchData?.status === 'LOBBY' ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Aguardando jogadores</h3>
                  <p className="text-muted-foreground mb-4">
                    {poolWS.gameState?.players?.length || 0}/2 jogadores conectados
                  </p>
                  
                  <div className="space-y-2">
                    {poolWS.gameState?.players?.map((player: any) => (
                      <div key={player.user_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span>{player.user_id === user?.id ? 'Você' : 'Jogador'}</span>
                        <div className="flex items-center gap-2">
                          {player.connected && <Badge variant="outline">Conectado</Badge>}
                          {player.ready === true && <Badge>Pronto</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 space-x-2">
                    {(() => {
                      const currentPlayer = poolWS.gameState?.players?.find((p: any) => p.user_id === user?.id);
                      const isReady = currentPlayer?.ready === true;
                      return (
                        <Button 
                          onClick={() => poolWS.setReady()}
                          disabled={isReady || !poolWS.isConnected}
                        >
                          {isReady ? 'Pronto!' : poolWS.isConnected ? 'Estou Pronto' : 'Conectando...'}
                        </Button>
                      );
                    })()}
                    
                    {poolWS.matchData?.creator_user_id === user?.id && (
                      <Button variant="outline" onClick={handleCancelMatch}>
                        Cancelar Partida
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : poolWS.matchData?.status === 'COUNTDOWN' ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Iniciando partida...</h3>
                  <div className="animate-pulse w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Preparando mesa de sinuca...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Carregando jogo...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Standard Tab System for non-pool sections */
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
        )}
      </div>
    </div>
  );
};

export default GamesModule;