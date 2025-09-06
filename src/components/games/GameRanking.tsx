import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Crown, Medal, TrendingUp, Target, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface PlayerRanking {
  user_id: string;
  game: string;
  mode: string;
  elo_rating: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_streak: number;
  best_win_streak: number;
  profiles?: {
    full_name: string;
  };
}

const gameInfo = {
  TRUCO: { name: 'Truco', color: 'from-orange-500 to-red-600' },
  SINUCA: { name: 'Sinuca', color: 'from-green-500 to-emerald-600' },
  DAMAS: { name: 'Damas', color: 'from-purple-500 to-violet-600' },
  VELHA: { name: 'Jogo da Velha', color: 'from-blue-500 to-cyan-600' }
};

export const GameRanking: React.FC = () => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<keyof typeof gameInfo>('VELHA');
  const [selectedMode, setSelectedMode] = useState<'RANKED' | 'CASUAL'>('RANKED');

  // Carregar rankings
  const loadRankings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('player_rankings')
        .select(`
          *,
          profiles!player_rankings_user_id_fkey (
            full_name
          )
        `)
        .eq('game', selectedGame)
        .eq('mode', selectedMode)
        .gte('matches_played', 1) // Só jogadores com pelo menos 1 partida
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRankings(data || []);
    } catch (error: any) {
      console.error('Error loading rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [selectedGame, selectedMode]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBadgeColor = (position: number) => {
    if (position <= 3) return 'default';
    if (position <= 10) return 'secondary';
    return 'outline';
  };

  const getEloTier = (elo: number) => {
    if (elo >= 2000) return { name: 'Mestre', color: 'text-purple-600' };
    if (elo >= 1700) return { name: 'Diamante', color: 'text-blue-600' };
    if (elo >= 1400) return { name: 'Ouro', color: 'text-yellow-600' };
    if (elo >= 1100) return { name: 'Prata', color: 'text-gray-600' };
    return { name: 'Bronze', color: 'text-amber-700' };
  };

  const calculateWinRate = (won: number, total: number) => {
    return total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="space-y-6">
      {/* Seletor de jogo e modo */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-full">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Rankings</h2>
              <p className="text-sm text-muted-foreground">
                Melhores jogadores por categoria
              </p>
            </div>
          </div>
        </div>

        <Tabs value={`${selectedGame}-${selectedMode}`} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            {Object.entries(gameInfo).map(([game, info]) => (
              <React.Fragment key={game}>
                <TabsTrigger
                  value={`${game}-RANKED`}
                  onClick={() => {
                    setSelectedGame(game as keyof typeof gameInfo);
                    setSelectedMode('RANKED');
                  }}
                  className="text-xs"
                >
                  {info.name} Ranked
                </TabsTrigger>
                <TabsTrigger
                  value={`${game}-CASUAL`}
                  onClick={() => {
                    setSelectedGame(game as keyof typeof gameInfo);
                    setSelectedMode('CASUAL');
                  }}
                  className="text-xs"
                >
                  {info.name} Casual
                </TabsTrigger>
              </React.Fragment>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {/* Pódio dos top 3 */}
      {rankings.length >= 3 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6 text-center">🏆 Pódio</h3>
          <div className="flex justify-center items-end gap-8 mb-6">
            {/* 2º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="bg-gradient-to-t from-gray-300 to-gray-400 h-20 w-24 rounded-t-lg flex items-end justify-center pb-2">
                <span className="text-white font-bold text-lg">2º</span>
              </div>
              <div className="p-4 bg-muted/50 rounded-b-lg">
                <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-sm">
                  {rankings[1]?.profiles?.full_name || 'Anônimo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rankings[1]?.elo_rating} ELO
                </p>
              </div>
            </motion.div>

            {/* 1º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="bg-gradient-to-t from-yellow-400 to-yellow-500 h-28 w-24 rounded-t-lg flex items-end justify-center pb-2">
                <span className="text-white font-bold text-xl">1º</span>
              </div>
              <div className="p-4 bg-muted/50 rounded-b-lg">
                <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-bold">
                  {rankings[0]?.profiles?.full_name || 'Anônimo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rankings[0]?.elo_rating} ELO
                </p>
              </div>
            </motion.div>

            {/* 3º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="bg-gradient-to-t from-amber-500 to-amber-600 h-16 w-24 rounded-t-lg flex items-end justify-center pb-2">
                <span className="text-white font-bold">3º</span>
              </div>
              <div className="p-4 bg-muted/50 rounded-b-lg">
                <Medal className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="font-medium text-sm">
                  {rankings[2]?.profiles?.full_name || 'Anônimo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rankings[2]?.elo_rating} ELO
                </p>
              </div>
            </motion.div>
          </div>
        </Card>
      )}

      {/* Lista completa do ranking */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Ranking Completo - {gameInfo[selectedGame].name} ({selectedMode === 'RANKED' ? 'Ranqueado' : 'Casual'})
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : rankings.length > 0 ? (
          <div className="space-y-3">
            {rankings.map((player, index) => {
              const position = index + 1;
              const tier = getEloTier(player.elo_rating);
              const winRate = calculateWinRate(player.matches_won, player.matches_played);

              return (
                <motion.div
                  key={player.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                    position <= 3 ? 'bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                        {getRankIcon(position)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {player.profiles?.full_name || 'Anônimo'}
                          </h4>
                          <Badge variant={getRankBadgeColor(position)}>
                            #{position}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className={`font-medium ${tier.color}`}>
                            {tier.name}
                          </span>
                          <span>{player.elo_rating} ELO</span>
                          <span>{player.matches_played} partidas</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-green-600">
                            {winRate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">
                            {player.win_streak}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.matches_won}V - {player.matches_lost}D
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhum ranking encontrado</h4>
            <p className="text-muted-foreground">
              Seja o primeiro a jogar e aparecer no ranking!
            </p>
          </div>
        )}
      </Card>

      {/* Estatísticas gerais */}
      {rankings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Estatísticas Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {rankings.length}
              </p>
              <p className="text-sm text-muted-foreground">Jogadores Ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round(rankings.reduce((acc, p) => acc + p.elo_rating, 0) / rankings.length)}
              </p>
              <p className="text-sm text-muted-foreground">ELO Médio</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {rankings.reduce((acc, p) => acc + p.matches_played, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Partidas Jogadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.max(...rankings.map(p => p.best_win_streak))}
              </p>
              <p className="text-sm text-muted-foreground">Melhor Sequência</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};