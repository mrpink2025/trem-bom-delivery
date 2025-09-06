import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, Coins, RefreshCw, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface GameLobbyProps {
  availableMatches: GameMatch[];
  onJoinMatch: (match: GameMatch) => void;
  onRefresh: () => void;
  gameInfo: any;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ 
  availableMatches, 
  onJoinMatch, 
  onRefresh,
  gameInfo 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');

  // Filtrar e ordenar partidas
  const filteredMatches = availableMatches
    .filter(match => {
      if (filterGame !== 'all' && match.game !== filterGame) return false;
      if (filterMode !== 'all' && match.mode !== filterMode) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'buy_in':
          return b.buy_in - a.buy_in;
        case 'players':
          return b.current_players - a.current_players;
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtros</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar:</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="ID da partida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Jogo:</label>
            <Select value={filterGame} onValueChange={setFilterGame}>
              <SelectTrigger>
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
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Modo:</label>
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os modos</SelectItem>
                <SelectItem value="CASUAL">Casual</SelectItem>
                <SelectItem value="RANKED">Ranqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ordenar por:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Mais recente</SelectItem>
                <SelectItem value="buy_in">Maior aposta</SelectItem>
                <SelectItem value="players">Mais jogadores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de partidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match, index) => {
            const game = gameInfo[match.game];
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full bg-gradient-to-r ${game.color}`}>
                        {game.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{game.name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={match.mode === 'RANKED' ? 'default' : 'secondary'}
                          >
                            {match.mode === 'RANKED' ? 'Ranqueado' : 'Casual'}
                          </Badge>
                          <Badge variant="outline">
                            {match.status === 'LOBBY' ? 'Aguardando' : 'Em andamento'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        {formatTimeAgo(match.created_at)}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        {match.buy_in} créditos
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {match.current_players} / {match.max_players} jogadores
                      </span>
                      
                      {/* Barra de progresso */}
                      <div className="w-20 bg-muted rounded-full h-2 ml-2">
                        <div 
                          className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(match.current_players / match.max_players) * 100}%` 
                          }}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => onJoinMatch(match)}
                      disabled={match.current_players >= match.max_players}
                      className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      {match.current_players >= match.max_players ? 'Lotada' : 'Entrar'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma partida encontrada</h3>
              <p className="text-muted-foreground mb-6">
                {availableMatches.length === 0 
                  ? 'Não há partidas disponíveis no momento'
                  : 'Nenhuma partida corresponde aos filtros aplicados'
                }
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={onRefresh}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Lista
                </Button>
                {availableMatches.length === 0 && (
                  <Button>
                    Criar Nova Partida
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Estatísticas do lobby */}
      {availableMatches.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Estatísticas do Lobby</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {availableMatches.length}
              </p>
              <p className="text-sm text-muted-foreground">Partidas Ativas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {availableMatches.reduce((sum, match) => sum + match.current_players, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Jogadores Online</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {availableMatches
                  .reduce((sum, match) => sum + match.buy_in * match.current_players, 0)
                  .toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Créditos em Jogo</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(availableMatches.reduce((sum, match) => sum + match.buy_in, 0) / availableMatches.length)}
              </p>
              <p className="text-sm text-muted-foreground">Aposta Média</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};