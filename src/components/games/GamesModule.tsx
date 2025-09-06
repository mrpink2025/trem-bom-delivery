import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trophy, Coins, Users, Play, Crown, Zap, Target, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GameWallet } from './GameWallet';
import { GameLobby } from './GameLobby';
import { TicTacToeGame } from './TicTacToeGame';
import { GameRanking } from './GameRanking';
import { GameHistory } from './GameHistory';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';

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

const gameInfo = {
  TRUCO: {
    name: 'Truco',
    icon: <Crown className="w-6 h-6" />,
    description: 'Jogo de cartas tradicional brasileiro',
    minPlayers: 2,
    maxPlayers: 4,
    color: 'from-orange-500 to-red-600'
  },
  SINUCA: {
    name: 'Sinuca',
    icon: <Target className="w-6 h-6" />,
    description: 'Bilhar com física realística',
    minPlayers: 2,
    maxPlayers: 2,
    color: 'from-green-500 to-emerald-600'
  },
  DAMAS: {
    name: 'Damas',
    icon: <Zap className="w-6 h-6" />,
    description: 'Estratégia e táticas no tabuleiro',
    minPlayers: 2,
    maxPlayers: 2,
    color: 'from-purple-500 to-violet-600'
  },
  VELHA: {
    name: 'Jogo da Velha',
    icon: <Gamepad2 className="w-6 h-6" />,
    description: 'Clássico jogo de estratégia rápida',
    minPlayers: 2,
    maxPlayers: 2,
    color: 'from-blue-500 to-cyan-600'
  }
};

const buyInOptions = [1, 2, 5, 10, 20, 50];

export const GamesModule: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('lobby');
  const [walletBalance, setWalletBalance] = useState(0);
  const [availableMatches, setAvailableMatches] = useState<GameMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState<GameMatch | null>(null);
  const [quickMatchDialog, setQuickMatchDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<keyof typeof gameInfo>('VELHA');
  const [selectedMode, setSelectedMode] = useState<'RANKED' | 'CASUAL'>('CASUAL');
  const [selectedBuyIn, setSelectedBuyIn] = useState(2);
  const [loading, setLoading] = useState(false);

  const { socket, isConnected, joinMatch, sendGameAction, gameState } = useGameWebSocket();

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
              gameInfo={gameInfo}
            />
          </TabsContent>

          <TabsContent value="game">
            {currentMatch && currentMatch.game === 'VELHA' && (
              <TicTacToeGame 
                match={currentMatch}
                gameState={gameState}
                onAction={sendGameAction}
                isConnected={isConnected}
              />
            )}
            {currentMatch && currentMatch.game !== 'VELHA' && (
              <Card className="p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">
                  {gameInfo[currentMatch.game].name}
                </h3>
                <p className="text-muted-foreground">
                  Este jogo ainda não foi implementado. Em breve!
                </p>
              </Card>
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
    </div>
  );
};