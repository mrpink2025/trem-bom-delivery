import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Trophy, TrendingDown, Users, Calendar, Coins, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface MatchHistory {
  id: string;
  game: string;
  mode: string;
  buy_in: number;
  status: string;
  created_at: string;
  finished_at: string;
  winner_user_ids: string[];
  prize_pool: number;
  match_players: Array<{
    user_id: string;
    seat_number: number;
    score: number;
  }>;
}

const gameInfo = {
  TRUCO: { name: 'Truco', color: 'from-orange-500 to-red-600' },
  SINUCA: { name: 'Sinuca', color: 'from-green-500 to-emerald-600' },
  DAMAS: { name: 'Damas', color: 'from-purple-500 to-violet-600' },
  VELHA: { name: 'Jogo da Velha', color: 'from-blue-500 to-cyan-600' }
};

export const GameHistory: React.FC = () => {
  const { user } = useAuth();
  
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all'); // all, won, lost, draw
  const [stats, setStats] = useState({
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    totalEarnings: 0,
    totalSpent: 0
  });

  // Carregar histórico de partidas
  const loadMatchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_matches')
        .select(`
          *,
          match_players (
            user_id,
            seat_number,
            score
          )
        `)
        .eq('match_players.user_id', user.id)
        .in('status', ['FINISHED', 'CANCELLED'])
        .order('finished_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const userMatches = (data || []).filter(match => 
        match.match_players.some(p => p.user_id === user.id)
      );

      setMatches(userMatches);

      // Calcular estatísticas
      let totalWins = 0;
      let totalLosses = 0;
      let totalEarnings = 0;
      let totalSpent = 0;

      userMatches.forEach(match => {
        totalSpent += match.buy_in;
        
        if (match.winner_user_ids?.includes(user.id)) {
          totalWins++;
          // Calcular ganhos (prize pool dividido pelos vencedores)
          if (match.prize_pool && match.winner_user_ids.length > 0) {
            totalEarnings += match.prize_pool / match.winner_user_ids.length;
          }
        } else if (match.status === 'FINISHED') {
          totalLosses++;
        }
      });

      setStats({
        totalMatches: userMatches.length,
        totalWins,
        totalLosses,
        totalEarnings,
        totalSpent
      });

    } catch (error: any) {
      console.error('Error loading match history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatchHistory();
  }, [user]);

  // Filtrar partidas
  const filteredMatches = matches.filter(match => {
    if (filterGame !== 'all' && match.game !== filterGame) return false;
    
    if (filterResult !== 'all') {
      const isWinner = match.winner_user_ids?.includes(user?.id || '');
      const isDraw = match.winner_user_ids?.length > 1 && isWinner;
      
      if (filterResult === 'won' && !isWinner) return false;
      if (filterResult === 'lost' && (isWinner || match.status === 'CANCELLED')) return false;
      if (filterResult === 'draw' && !isDraw) return false;
    }
    
    return true;
  });

  const getMatchResult = (match: MatchHistory) => {
    if (match.status === 'CANCELLED') {
      return { text: 'Cancelada', color: 'text-muted-foreground', variant: 'outline' as const };
    }
    
    const isWinner = match.winner_user_ids?.includes(user?.id || '');
    const isDraw = match.winner_user_ids?.length > 1 && isWinner;
    
    if (isDraw) {
      return { text: 'Empate', color: 'text-yellow-600', variant: 'secondary' as const };
    } else if (isWinner) {
      return { text: 'Vitória', color: 'text-green-600', variant: 'default' as const };
    } else {
      return { text: 'Derrota', color: 'text-red-600', variant: 'destructive' as const };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEarningsFromMatch = (match: MatchHistory) => {
    if (match.status === 'CANCELLED') return match.buy_in; // Reembolso
    
    const isWinner = match.winner_user_ids?.includes(user?.id || '');
    if (!isWinner) return -match.buy_in;
    
    if (match.prize_pool && match.winner_user_ids.length > 0) {
      return (match.prize_pool / match.winner_user_ids.length) - match.buy_in;
    }
    
    return 0;
  };

  const winRate = stats.totalMatches > 0 ? ((stats.totalWins / stats.totalMatches) * 100).toFixed(1) : '0.0';
  const netEarnings = stats.totalEarnings - stats.totalSpent;

  return (
    <div className="space-y-6">
      {/* Estatísticas gerais */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-full">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Histórico de Partidas</h2>
            <p className="text-sm text-muted-foreground">
              Suas estatísticas e histórico de jogos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600">{stats.totalMatches}</p>
            <p className="text-sm text-muted-foreground">Partidas</p>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.totalWins}</p>
            <p className="text-sm text-muted-foreground">Vitórias</p>
          </div>

          <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold text-red-600">{stats.totalLosses}</p>
            <p className="text-sm text-muted-foreground">Derrotas</p>
          </div>

          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">{winRate}%</p>
            <p className="text-sm text-muted-foreground">Taxa de Vitórias</p>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <Coins className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className={`text-2xl font-bold ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netEarnings >= 0 ? '+' : ''}{netEarnings.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Saldo Líquido</p>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtros:</span>
          </div>

          <Select value={filterGame} onValueChange={setFilterGame}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os jogos</SelectItem>
              {Object.entries(gameInfo).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  {info.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterResult} onValueChange={setFilterResult}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="won">Vitórias</SelectItem>
              <SelectItem value="lost">Derrotas</SelectItem>
              <SelectItem value="draw">Empates</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={loadMatchHistory} size="sm">
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Lista de partidas */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredMatches.length > 0 ? (
          filteredMatches.map((match, index) => {
            const result = getMatchResult(match);
            const earnings = getEarningsFromMatch(match);
            const game = gameInfo[match.game as keyof typeof gameInfo];

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full bg-gradient-to-r ${game.color}`}>
                        <div className="w-6 h-6 text-white flex items-center justify-center font-bold text-xs">
                          {match.game.charAt(0)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{game.name}</h4>
                          <Badge variant={result.variant}>
                            {result.text}
                          </Badge>
                          <Badge variant="outline">
                            {match.mode === 'RANKED' ? 'Ranqueado' : 'Casual'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>#{match.id.slice(-8)}</span>
                          <span>{formatDate(match.finished_at || match.created_at)}</span>
                          <span>{match.match_players.length} jogadores</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{match.buy_in} créditos</span>
                      </div>
                      
                      <div className={`text-sm font-medium ${
                        earnings > 0 ? 'text-green-600' : earnings < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {earnings > 0 ? '+' : ''}{earnings.toFixed(2)} créditos
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card className="p-12 text-center">
            <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma partida encontrada</h3>
            <p className="text-muted-foreground">
              {matches.length === 0 
                ? 'Você ainda não jogou nenhuma partida'
                : 'Nenhuma partida corresponde aos filtros aplicados'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};