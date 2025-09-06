import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  buy_in: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  max_players: number;
  players: any[];
  rules: {
    shot_clock: number;
    assist_level: 'NONE' | 'SHORT';
  };
  created_at: string;
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
  
  const [createForm, setCreateForm] = useState({
    mode: 'CASUAL' as 'RANKED' | 'CASUAL',
    buyIn: 10,
    shotClock: 60,
    assistLevel: 'SHORT' as 'NONE' | 'SHORT'
  });

  const loadMatches = async () => {
    console.log('[PoolLobby] Loading matches...');
    try {
      const { data, error } = await supabase.functions.invoke('get-pool-matches-lobby');
      console.log('[PoolLobby] Load matches response:', { data, error });
      
      if (error) {
        console.error('[PoolLobby] Load matches error:', error);
        setMatches([]);
        return;
      }
      console.log('[PoolLobby] Matches loaded:', data);
      setMatches(data || []);
    } catch (error) {
      console.error('[PoolLobby] Load matches catch error:', error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const createMatch = async () => {
    if (!user || userCredits < createForm.buyIn) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${createForm.buyIn} créditos para criar esta partida.`,
        variant: "destructive"
      });
      return;
    }

    console.log('[PoolLobby] Creating match with params:', {
      mode: createForm.mode,
      buyIn: createForm.buyIn,
      rules: {
        shotClockSec: createForm.shotClock,
        assistLevel: createForm.assistLevel
      }
    });

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

      console.log('[PoolLobby] Create match response:', { data, error });

      if (error) {
        console.error('[PoolLobby] Create match error:', error);
        
        // Handle different error types with specific messages
        let errorMessage = "Erro desconhecido";
        let errorTitle = "Erro ao criar partida";
        
        try {
          // Parse error response for better error handling
          if (error.message?.includes('Edge Function returned a non-2xx status code')) {
            errorMessage = "Erro interno do servidor. Tente novamente.";
          } else if (typeof error === 'object' && error.error) {
            switch (error.error) {
              case 'INSUFFICIENT_FUNDS':
                errorTitle = "Créditos insuficientes";
                errorMessage = error.message || "Você não tem créditos suficientes para criar esta partida.";
                break;
              case 'VALIDATION_ERROR':
                errorTitle = "Dados inválidos";
                errorMessage = "Por favor, verifique os dados inseridos.";
                break;
              case 'UNAUTHENTICATED':
                errorTitle = "Erro de autenticação";
                errorMessage = "Faça login para criar partidas.";
                break;
              default:
                errorMessage = error.message || "Erro interno do servidor";
            }
          }
        } catch (parseError) {
          console.error('[PoolLobby] Error parsing response:', parseError);
        }
        
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      toast({ 
        title: "Partida criada!", 
        description: "Aguardando outros jogadores..." 
      });
      setShowCreateDialog(false);
      loadMatches();
      
      // Cleanup old lobby matches before joining
      await supabase.functions.invoke('cleanup-lobby-matches');
      
      if (data?.matchId) {
        console.log('[PoolLobby] 🎯 Joining created match:', data.matchId);
        onJoinMatch(data.matchId);
      }
    } catch (error) {
      console.error('[PoolLobby] Catch block error:', error);
      toast({
        title: "Erro ao criar partida",
        description: "Erro de conexão. Verifique sua internet e tente novamente.",
        variant: "destructive"
      });
    }
  };

  const quickMatch = async () => {
    if (userCredits < 10) {
      toast({
        title: "Créditos insuficientes",
        description: "Você precisa de 10 créditos para uma partida rápida.",
        variant: "destructive"
      });
      return;
    }

    console.log('[PoolLobby] Starting quick match...');

    try {
      const { data, error } = await supabase.functions.invoke('pool-match-quick', {
        body: {
          mode: 'CASUAL',
          buyIn: 10
        }
      });

      console.log('[PoolLobby] Quick match response:', { data, error });

      if (error) {
        console.error('[PoolLobby] Quick match error:', error);
        toast({
          title: "Erro ao encontrar partida",
          description: "Tente novamente ou crie uma nova partida.",
          variant: "destructive"
        });
        return;
      }

      if (data?.matchId) {
        toast({ title: "Partida encontrada!", description: "Entrando na partida..." });
        onJoinMatch(data.matchId);
      } else {
        toast({
          title: "Nenhuma partida encontrada",  
          description: "Que tal criar uma nova partida?"
        });
      }
    } catch (error) {
      console.error('[PoolLobby] Quick match catch error:', error);
      toast({
        title: "Erro de conexão",
        description: "Verifique sua internet e tente novamente.",
        variant: "destructive"
      });
    }
  };

  const joinMatch = async (matchId: string, buyIn: number) => {
    if (userCredits < buyIn) {
      toast({
        title: "Créditos insuficientes",
        variant: "destructive"
      });
      return;
    }

    console.log('[PoolLobby] Joining match:', matchId);

    try {
      const { error } = await supabase.functions.invoke('pool-match-join', {
        body: { matchId }
      });

      console.log('[PoolLobby] Join match result:', { error });

      if (error) {
        console.error('[PoolLobby] Join match error:', error);
        toast({
          title: "Erro ao entrar na partida",
          description: error.message || "Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({ title: "Entrando na partida..." });
      onJoinMatch(matchId);
    } catch (error) {
      console.error('[PoolLobby] Join match catch error:', error);
      toast({
        title: "Erro ao entrar na partida",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Cleanup old matches when component mounts
    const cleanupAndLoad = async () => {
      console.log('[PoolLobby] 🧹 Cleaning up old LOBBY matches on mount...');
      try {
        await supabase.functions.invoke('cleanup-lobby-matches');
        console.log('[PoolLobby] ✅ Cleanup completed, loading fresh matches...');
      } catch (error) {
        console.warn('[PoolLobby] ⚠️ Cleanup failed, continuing with load:', error);
      }
      loadMatches();
    };
    
    cleanupAndLoad();
    const interval = setInterval(() => {
      console.log('[PoolLobby] 🔄 Periodic matches reload...');
      loadMatches();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredMatches = matches.filter(match => 
    match.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Sinuca 8-Ball
          </h1>
          <p className="text-muted-foreground">
            Créditos: <span className="font-semibold">{userCredits}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={quickMatch} className="flex items-center gap-2">
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
                  <label className="text-sm font-medium">Valor da Aposta (créditos)</label>
                  <Select 
                    value={createForm.buyIn.toString()} 
                    onValueChange={(value) => 
                      setCreateForm(prev => ({ ...prev, buyIn: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 créditos</SelectItem>
                      <SelectItem value="25">25 créditos</SelectItem>
                      <SelectItem value="50">50 créditos</SelectItem>
                      <SelectItem value="100">100 créditos</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <label className="text-sm font-medium">Assistência de Mira</label>
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
                      <SelectItem value="NONE">Sem assistência</SelectItem>
                      <SelectItem value="SHORT">Assistência curta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {userCredits < createForm.buyIn && (
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <p className="text-sm text-destructive">
                      Você precisa de {createForm.buyIn} créditos para criar esta partida.
                      Você tem apenas {userCredits} créditos.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={createMatch}
                    disabled={userCredits < createForm.buyIn}
                  >
                    Criar Partida
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              <p className="text-muted-foreground mb-4">Seja o primeiro a criar uma nova partida!</p>
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
                            {match.mode === 'RANKED' ? 'Ranqueada' : 'Casual'}
                          </Badge>
                          <Badge variant="outline">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {match.buy_in} créditos
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {match.players.length}/2
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {match.rules.shot_clock}s por tacada
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => joinMatch(match.id, match.buy_in)}
                      disabled={userCredits < match.buy_in || match.players.length >= 2}
                    >
                      {match.players.length >= 2 ? 'Lotada' : 'Entrar'}
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