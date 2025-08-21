import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';
import { Gift, Star, Trophy, Clock } from 'lucide-react';

export function LoyaltyDashboard() {
  const { points, rewards, balance, loading, redeemReward } = useLoyaltyProgram();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const nextLevelThreshold = Math.ceil(balance / 1000) * 1000;
  const progressToNextLevel = ((balance % 1000) / 1000) * 100;

  const getLevelInfo = (points: number) => {
    if (points >= 5000) return { level: 'Diamante', color: 'bg-blue-500', icon: Trophy };
    if (points >= 2000) return { level: 'Ouro', color: 'bg-yellow-500', icon: Star };
    if (points >= 500) return { level: 'Prata', color: 'bg-gray-400', icon: Star };
    return { level: 'Bronze', color: 'bg-orange-600', icon: Star };
  };

  const levelInfo = getLevelInfo(balance);

  return (
    <div className="space-y-6">
      {/* Points Balance Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{balance.toLocaleString()} pontos</h2>
              <p className="text-muted-foreground">Seu saldo de fidelidade</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${levelInfo.color}`} />
              <Badge variant="secondary">
                {levelInfo.level}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Próximo nível em</span>
              <span>{nextLevelThreshold - balance} pontos</span>
            </div>
            <Progress value={progressToNextLevel} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Resgates</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Gift className="h-8 w-8 text-primary" />
                    <Badge variant={reward.current_uses >= (reward.max_uses || Infinity) ? "destructive" : "secondary"}>
                      {reward.current_uses >= (reward.max_uses || Infinity) ? "Esgotado" : "Disponível"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{reward.name}</CardTitle>
                  {reward.description && (
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Custo:</span>
                      <span className="text-lg font-bold text-primary">
                        {reward.points_required.toLocaleString()} pts
                      </span>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => redeemReward(reward.id, reward.points_required)}
                      disabled={
                        balance < reward.points_required || 
                        reward.current_uses >= (reward.max_uses || Infinity)
                      }
                    >
                      {balance < reward.points_required ? "Pontos insuficientes" : "Resgatar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pontos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {points.slice(0, 10).map((point) => (
                  <div key={point.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{point.description || 'Pontos ganhos'}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(point.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline">{point.earned_from}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        +{point.points}
                      </span>
                    </div>
                  </div>
                ))}
                
                {points.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum ponto ganho ainda</p>
                    <p className="text-sm">Faça um pedido para ganhar seus primeiros pontos!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="font-medium">Ganhe pontos</h4>
                    <p className="text-sm text-muted-foreground">1 ponto para cada R$ 1,00 gasto em pedidos</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="font-medium">Suba de nível</h4>
                    <p className="text-sm text-muted-foreground">Desbloqueie benefícios especiais conforme acumula pontos</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="font-medium">Resgate prêmios</h4>
                    <p className="text-sm text-muted-foreground">Troque seus pontos por descontos e benefícios exclusivos</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-3">Níveis de Fidelidade</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-600" />
                    <span className="text-sm">Bronze (0-499 pontos)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-sm">Prata (500-1999 pontos)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Ouro (2000-4999 pontos)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Diamante (5000+ pontos)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}