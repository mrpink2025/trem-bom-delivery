import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trophy, 
  Users, 
  Clock, 
  DollarSign, 
  Target, 
  Gamepad2,
  Search,
  Plus,
  Crown,
  Zap
} from 'lucide-react';

interface PoolMatch {
  id: string;
  mode: 'RANKED' | 'CASUAL';
  buyIn: number;
  rakePct: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  players: Array<{
    userId: string;
    seat: number;
    connected: boolean;
    mmr: number;
  }>;
  maxPlayers: number;
  createdAt: string;
  rules: {
    shotClockSec: number;
    assistLevel: 'NONE' | 'SHORT';
  };
}

interface PoolLobbyProps {
  onJoinMatch: (matchId: string) => void;
  userCredits: number;
}

const PoolLobby: React.FC<PoolLobbyProps> = ({ onJoinMatch, userCredits }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create match form state
  const [createForm, setCreateForm] = useState({
    mode: 'CASUAL' as 'RANKED' | 'CASUAL',
    buyIn: 10,
    shotClock: 60,
    assistLevel: 'SHORT' as 'NONE' | 'SHORT'
  });

  // Load available matches
  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('pool_matches')
        .select('*')
        .in('status', ['LOBBY', 'LIVE'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: "Erro ao carregar partidas",
        description: "Não foi possível carregar a lista de partidas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new match
  const createMatch = async () => {
    if (!user) return;
    
    if (userCredits < createForm.buyIn) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${createForm.buyIn} créditos para criar esta partida`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('pool-match-create', {
        body: {
          mode: createForm.mode,
          buyIn: createForm.buyIn,
          rules: {
            shotClockSec: createForm.shotClock,
            assistLevel: createForm.assistLevel
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Partida criada!",
        description: "Sua partida foi criada com sucesso"
      });

      setShowCreateDialog(false);
      loadMatches();
      
      // Auto-join the created match
      if (data?.matchId) {
        onJoinMatch(data.matchId);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Erro ao criar partida",
        description: "Não foi possível criar a partida. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Join existing match
  const joinMatch = async (matchId: string, buyIn: number) => {
    if (userCredits < buyIn) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${buyIn} créditos para participar desta partida`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('pool-match-join', {
        body: { matchId }
      });

      if (error) throw error;

      toast({
        title: "Entrando na partida...",
        description: "Conectando ao servidor de jogo"
      });

      onJoinMatch(matchId);
    } catch (error: any) {
      console.error('Error joining match:', error);
      toast({
        title: "Erro ao entrar na partida",
        description: error.message || "Não foi possível entrar na partida",
        variant: "destructive"
      });
    }
  };

  // Find quick match
  const findQuickMatch = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pool-match-quick', {
        body: {
          mode: 'CASUAL',
          buyIn: 10
        }
      });

      if (error) throw error;

      if (data?.matchId) {
        toast({
          title: "Partida encontrada!",
          description: "Conectando ao servidor de jogo"
        });
        onJoinMatch(data.matchId);
      } else {
        toast({
          title: "Nenhuma partida encontrada",
          description: "Criando uma nova partida para você"
        });
      }
    } catch (error) {
      console.error('Error finding quick match:', error);
      toast({
        title: "Erro na busca rápida",
        description: "Tente criar uma partida manualmente",
        variant: "destructive"
      });
    }
  };

  // Filter matches based on search
  const filteredMatches = matches.filter(match => 
    match.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    match.mode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadMatches();
    
    // Auto-refresh matches every 10 seconds
    const interval = setInterval(loadMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Sinuca 8-Ball
          </h1>
          <p className="text-muted-foreground">
            Créditos disponíveis: <span className="font-semibold">{userCredits}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={findQuickMatch} className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Partida Rápida
          </Button>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Criar Partida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Partida de Sinuca</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Modo de Jogo</label>
                  <Select 
                    value={createForm.mode} 
                    onValueChange={(value: 'RANKED' | 'CASUAL') => 
                      setCreateForm(prev => ({ ...prev, mode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASUAL">Casual</SelectItem>
                      <SelectItem value="RANKED">Ranqueada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Taxa de Entrada (Créditos)</label>
                  <Input
                    type="number"
                    value={createForm.buyIn}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      buyIn: Math.max(1, parseInt(e.target.value) || 1)
                    }))}
                    min="1"
                    max={userCredits}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Tempo por Tacada (segundos)</label>
                  <Select
                    value={createForm.shotClock.toString()}
                    onValueChange={(value) => 
                      setCreateForm(prev => ({ ...prev, shotClock: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 segundos</SelectItem>
                      <SelectItem value="60">60 segundos</SelectItem>
                      <SelectItem value="90">90 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Ajuda de Mira</label>
                  <Select
                    value={createForm.assistLevel}
                    onValueChange={(value: 'NONE' | 'SHORT') => 
                      setCreateForm(prev => ({ ...prev, assistLevel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sem ajuda</SelectItem>
                      <SelectItem value="SHORT">Linha curta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={createMatch}>
                    Criar Partida
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar partidas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Matches List */}
      <Tabs defaultValue="lobby">
        <TabsList>
          <TabsTrigger value="lobby">Aguardando Jogadores</TabsTrigger>
          <TabsTrigger value="live">Em Andamento</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lobby" className="space-y-3">
          {filteredMatches.filter(m => m.status === 'LOBBY').length === 0 ? (
            <Card className="p-8 text-center">
              <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma partida aguardando</h3>
              <p className="text-muted-foreground mb-4">
                Seja o primeiro a criar uma nova partida!
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Criar Primeira Partida
              </Button>
            </Card>
          ) : (
            filteredMatches
              .filter(match => match.status === 'LOBBY')
              .map(match => (
                <Card key={match.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={match.mode === 'RANKED' ? 'default' : 'secondary'}>
                            {match.mode === 'RANKED' ? (
                              <><Crown className="w-3 h-3 mr-1" />Ranqueada</>
                            ) : 'Casual'}
                          </Badge>
                          <Badge variant="outline">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {match.buyIn} créditos
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {match.players.length}/2
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {match.rules.shotClockSec}s por tacada
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {match.rules.assistLevel === 'NONE' ? 'Sem ajuda' : 'Linha curta'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => joinMatch(match.id, match.buyIn)}
                      disabled={userCredits < match.buyIn || match.players.length >= 2}
                    >
                      {match.players.length >= 2 ? 'Lotada' : 'Entrar'}
                    </Button>
                  </div>
                </Card>
              ))
          )}
        </TabsContent>
        
        <TabsContent value="live" className="space-y-3">
          {filteredMatches.filter(m => m.status === 'LIVE').length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma partida em andamento</h3>
              <p className="text-muted-foreground">
                Todas as partidas estão aguardando jogadores ou finalizadas
              </p>
            </Card>
          ) : (
            filteredMatches
              .filter(match => match.status === 'LIVE')
              .map(match => (
                <Card key={match.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={match.mode === 'RANKED' ? 'default' : 'secondary'}>
                            {match.mode === 'RANKED' ? (
                              <><Crown className="w-3 h-3 mr-1" />Ranqueada</>
                            ) : 'Casual'}
                          </Badge>
                          <Badge variant="destructive">Em Jogo</Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {match.players.length}/2
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {match.buyIn} créditos
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" disabled>
                      Assistir (em breve)
                    </Button>
                  </div>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PoolLobby;