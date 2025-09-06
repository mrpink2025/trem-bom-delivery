import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import { TicTacToeGame } from './TicTacToeGame'
import { TrucoGame } from './TrucoGame'
import { DamasGame } from './DamasGame'
import { SinucaGame } from './SinucaGame'
import PoolGame from './PoolGame'
import PoolLobby from './PoolLobby'
import { GameLobby } from './GameLobby'
import { GameWallet } from './GameWallet'
import { GameHistory } from './GameHistory'
import { GameRanking } from './GameRanking'
import { useGameWebSocket } from '@/hooks/useGameWebSocket'
import { usePoolWebSocket } from '@/hooks/usePoolWebSocket'

interface GameMatch {
  id: string;
  game: 'TRUCO' | 'SINUCA' | 'DAMAS' | 'VELHA';
  mode: 'RANKED' | 'CASUAL';
  buy_in: number;
  max_players: number;
  current_players: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  created_at: string;
  match_players: any[];
}

const GamesModule: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [currentView, setCurrentView] = useState<'lobby' | 'wallet' | 'history' | 'ranking' | 'game' | 'pool-lobby' | 'pool-game'>('lobby')
  const [currentGame, setCurrentGame] = useState<'VELHA' | 'TRUCO' | 'DAMAS' | 'SINUCA' | 'POOL' | null>(null)
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null)
  const [userCredits, setUserCredits] = useState<number>(0)
  const [isQuickMatchOpen, setIsQuickMatchOpen] = useState(false)
  const [selectedQuickGame, setSelectedQuickGame] = useState<'VELHA' | 'TRUCO' | 'DAMAS' | 'SINUCA' | 'POOL'>('VELHA')
  const [selectedMode, setSelectedMode] = useState<'CASUAL' | 'RANKED'>('CASUAL')
  const [selectedBuyIn, setSelectedBuyIn] = useState<number>(10)

  // WebSocket connections
  const {
    ws,
    connected,
    gameState,
    turnInfo,
    messages,
    connectToMatch,
    joinMatch,
    leaveMatch,
    sendGameAction,
    sendChatMessage,
    setReady
  } = useGameWebSocket()

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

      setWalletBalance(data.availableBalance || 0);
    } catch (error: any) {
      console.error('Error loading wallet:', error);
    }
  };

  // Carregar partidas disponíveis
  const loadAvailableMatches = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('game-matching', {
        body: {
          action: 'get_matches',
          status: 'LOBBY'
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAvailableMatches(data.matches || []);
    } catch (error: any) {
      console.error('Error loading matches:', error);
    }
  };

  // Quick Match
  const handleQuickMatch = async () => {
    if (!user) return;

    if (walletBalance < selectedBuyIn) {
      toast({
        title: "Saldo Insuficiente",
        description: "Você precisa de mais créditos para jogar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('game-matching', {
        body: {
          action: 'quick_match',
          game: selectedGame,
          mode: selectedMode,
          buyIn: selectedBuyIn
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Conectar ao WebSocket da partida
      await joinMatch(data.matchId, user.id);
      
      setCurrentMatch(data.match || { id: data.matchId });
      setQuickMatchDialog(false);
      setActiveTab('game');
      
      toast({
        title: data.joined ? "Partida Encontrada!" : "Partida Criada!",
        description: data.joined ? "Você entrou em uma partida existente" : "Aguardando outros jogadores...",
      });

      // Recarregar dados
      loadWalletBalance();
      loadAvailableMatches();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao encontrar/criar partida",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar Nova Partida (apenas criar, não buscar)
  const handleCreateMatch = async () => {
    if (!user) return;

    if (walletBalance < selectedBuyIn) {
      toast({
        title: "Saldo Insuficiente",
        description: "Você precisa de mais créditos para jogar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('game-matching', {
        body: {
          action: 'create_match',
          game: selectedGame,
          mode: selectedMode,
          buyIn: selectedBuyIn
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Conectar ao WebSocket da partida
      await joinMatch(data.match.id, user.id);
      
      setCurrentMatch(data.match);
      setCreateMatchDialog(false);
      setActiveTab('game');
      
      toast({
        title: "Partida Criada!",
        description: "Aguardando outros jogadores se juntarem...",
      });

      // Recarregar dados
      loadWalletBalance();
      loadAvailableMatches();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar partida",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Entrar em partida específica
  const handleJoinMatch = async (match: GameMatch) => {
    if (!user) return;

    if (walletBalance < match.buy_in) {
      toast({
        title: "Saldo Insuficiente",
        description: "Você precisa de mais créditos para jogar",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('game-matching', {
        body: {
          action: 'join_match',
          matchId: match.id
        }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Conectar ao WebSocket da partida
      await joinMatch(match.id, user.id);
      
      setCurrentMatch(match);
      setActiveTab('game');
      
      toast({
        title: "Entrada Confirmada!",
        description: `Você entrou na partida de ${gameInfo[match.game].name}`,
      });

      // Recarregar dados
      loadWalletBalance();
      loadAvailableMatches();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao entrar na partida",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWalletBalance();
      loadAvailableMatches();
    }
  }, [user]);

  // Recarregar dados a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'lobby') {
        loadAvailableMatches();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Faça login para jogar</h2>
          <p className="text-muted-foreground">
            Você precisa estar logado para acessar os jogos
          </p>
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
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Jogos com Créditos</h1>
                <p className="text-sm text-muted-foreground">
                  Desafie outros jogadores e ganhe créditos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">
                  {walletBalance.toFixed(2)} créditos
                </span>
              </div>
              
              <Button 
                onClick={() => setQuickMatchDialog(true)}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                disabled={loading}
              >
                <Play className="w-4 h-4 mr-2" />
                Quick Match
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="lobby">Lobby</TabsTrigger>
            <TabsTrigger value="game" disabled={!currentMatch}>Partida</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="wallet">Carteira</TabsTrigger>
          </TabsList>

          <TabsContent value="lobby">
            <GameLobby 
              availableMatches={availableMatches}
              onJoinMatch={handleJoinMatch}
              onRefresh={loadAvailableMatches}
              onCreateMatch={() => setCreateMatchDialog(true)}
              gameInfo={gameInfo}
            />
          </TabsContent>

          <TabsContent value="game">
            {currentMatch && (
              <>
                {currentMatch.game === 'VELHA' && (
                  <TicTacToeGame 
                    match={currentMatch}
                    gameState={gameState}
                    onAction={sendGameAction}
                    isConnected={isConnected}
                  />
                )}
                {currentMatch.game === 'TRUCO' && (
                  <Card className="p-8 text-center">
                    <h3 className="text-xl font-semibold mb-4">Truco</h3>
                    <p className="text-muted-foreground mb-4">
                      Implementação em desenvolvimento. Use o Jogo da Velha por enquanto!
                    </p>
                    <Button onClick={() => setActiveTab('lobby')}>
                      Voltar ao Lobby
                    </Button>
                  </Card>
                )}
                {currentMatch.game === 'SINUCA' && (
                  <Card className="p-8 text-center">
                    <h3 className="text-xl font-semibold mb-4">Sinuca</h3>
                    <p className="text-muted-foreground mb-4">
                      Implementação em desenvolvimento. Use o Jogo da Velha por enquanto!
                    </p>
                    <Button onClick={() => setActiveTab('lobby')}>
                      Voltar ao Lobby
                    </Button>
                  </Card>
                )}
                {currentMatch.game === 'DAMAS' && (
                  <Card className="p-8 text-center">
                    <h3 className="text-xl font-semibold mb-4">Damas</h3>
                    <p className="text-muted-foreground mb-4">
                      Implementação em desenvolvimento. Use o Jogo da Velha por enquanto!
                    </p>
                    <Button onClick={() => setActiveTab('lobby')}>
                      Voltar ao Lobby
                    </Button>
                  </Card>
                )}
              </>
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
              balance={walletBalance} 
              onBalanceUpdate={loadWalletBalance}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Match Dialog */}
      <Dialog open={quickMatchDialog} onOpenChange={setQuickMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Match</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Seleção de jogo */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Escolha o jogo:</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(gameInfo).map(([key, info]) => (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`p-4 cursor-pointer transition-all border-2 ${
                        selectedGame === key 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedGame(key as keyof typeof gameInfo)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-gradient-to-r ${info.color}`}>
                          {info.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{info.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {info.minPlayers}-{info.maxPlayers} jogadores
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Modo de jogo */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Modo:</label>
              <Select value={selectedMode} onValueChange={(value: 'RANKED' | 'CASUAL') => setSelectedMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASUAL">
                    Casual - Jogue por diversão
                  </SelectItem>
                  <SelectItem value="RANKED">
                    Ranqueado - Conte para o ranking
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buy-in */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Aposta (créditos):
              </label>
              <Select 
                value={selectedBuyIn.toString()} 
                onValueChange={(value) => setSelectedBuyIn(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buyInOptions.map(amount => (
                    <SelectItem key={amount} value={amount.toString()}>
                      {amount} créditos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Saldo disponível */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Seu saldo:</span>
                <span className="font-medium">{walletBalance.toFixed(2)} créditos</span>
              </div>
              {walletBalance < selectedBuyIn && (
                <p className="text-destructive text-xs mt-1">
                  Saldo insuficiente para esta aposta
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setQuickMatchDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleQuickMatch}
                disabled={loading || walletBalance < selectedBuyIn}
                className="flex-1"
              >
                {loading ? "Procurando..." : "Encontrar Partida"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Match Dialog */}
      <Dialog open={createMatchDialog} onOpenChange={setCreateMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Partida</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Seleção de jogo */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Escolha o jogo:</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(gameInfo).map(([key, info]) => (
                  <Card 
                    key={key} 
                    className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
                      selectedGame === key 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedGame(key as keyof typeof gameInfo)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-gradient-to-r ${info.color}`}>
                        {info.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{info.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {info.minPlayers}-{info.maxPlayers} jogadores
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Modo de jogo */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Modo:</label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`p-3 cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedMode === 'CASUAL' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMode('CASUAL')}
                >
                  <div className="text-center">
                    <h4 className="font-medium text-sm">Casual</h4>
                    <p className="text-xs text-muted-foreground">Diversão sem pressão</p>
                  </div>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedMode === 'RANKED' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMode('RANKED')}
                >
                  <div className="text-center">
                    <h4 className="font-medium text-sm">Ranqueado</h4>
                    <p className="text-xs text-muted-foreground">Competitivo</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Valor da aposta */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Aposta (créditos):</label>
              <div className="grid grid-cols-3 gap-2">
                {buyInOptions.map((amount) => (
                  <Card 
                    key={amount}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md border-2 text-center ${
                      selectedBuyIn === amount 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedBuyIn(amount)}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium">{amount}</span>
                    </div>
                  </Card>
                ))}
              </div>
              {walletBalance < selectedBuyIn && (
                <p className="text-sm text-destructive text-center">
                  Saldo insuficiente para esta aposta
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setCreateMatchDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateMatch}
                disabled={loading || walletBalance < selectedBuyIn}
                className="flex-1"
              >
                {loading ? "Criando..." : "Criar Partida"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};