import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Gift, 
  Star, 
  Trophy, 
  Crown, 
  Coins, 
  Tag, 
  Calendar, 
  Copy,
  Check,
  Percent,
  ShoppingCart,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserLoyalty {
  currentPoints: number;
  totalEarned: number;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  nextLevelPoints: number;
  ordersCount: number;
  joinDate: string;
}

interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrder?: number;
  maxDiscount?: number;
  expiryDate: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  restaurantIds?: string[];
  isUsed?: boolean;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_delivery' | 'bonus_points';
  value: number;
  image?: string;
  available: boolean;
}

const mockUserLoyalty: UserLoyalty = {
  currentPoints: 1250,
  totalEarned: 3870,
  level: 'gold',
  nextLevelPoints: 2000,
  ordersCount: 47,
  joinDate: "2023-06-15"
};

const mockCoupons: Coupon[] = [
  {
    id: "coup-001",
    code: "WELCOME20",
    title: "Boas-vindas!",
    description: "20% de desconto no seu primeiro pedido",
    discount: 20,
    discountType: 'percentage',
    minOrder: 30,
    maxDiscount: 15,
    expiryDate: "2024-02-29",
    usageLimit: 1,
    usedCount: 0,
    isActive: true
  },
  {
    id: "coup-002", 
    code: "FRETE5",
    title: "Frete Grátis",
    description: "Frete grátis em pedidos acima de R$ 50",
    discount: 100,
    discountType: 'percentage',
    minOrder: 50,
    expiryDate: "2024-01-31",
    usageLimit: 3,
    usedCount: 1,
    isActive: true
  },
  {
    id: "coup-003",
    code: "GOLD15",
    title: "Desconto Gold",
    description: "R$ 15 de desconto - Exclusivo membros Gold",
    discount: 15,
    discountType: 'fixed',
    minOrder: 40,
    expiryDate: "2024-02-15",
    usageLimit: 2,
    usedCount: 2,
    isActive: false,
    isUsed: true
  }
];

const mockRewards: Reward[] = [
  {
    id: "rew-001",
    title: "10% de Desconto",
    description: "10% off em qualquer pedido",
    pointsCost: 500,
    type: 'discount',
    value: 10,
    available: true
  },
  {
    id: "rew-002",
    title: "Frete Grátis",
    description: "Entrega gratuita no próximo pedido",
    pointsCost: 300,
    type: 'free_delivery',
    value: 0,
    available: true
  },
  {
    id: "rew-003",
    title: "R$ 20 de Desconto",  
    description: "R$ 20 off em pedidos acima de R$ 60",
    pointsCost: 800,
    type: 'discount',
    value: 20,
    available: true
  },
  {
    id: "rew-004",
    title: "Pontos Bônus 2x",
    description: "Ganhe pontos em dobro no próximo pedido",
    pointsCost: 400,
    type: 'bonus_points',
    value: 2,
    available: false
  }
];

export default function LoyaltyProgram() {
  const [couponCode, setCouponCode] = useState("");
  const [copiedCoupon, setCopiedCoupon] = useState("");

  const getLevelInfo = (level: string) => {
    switch (level) {
      case 'bronze':
        return { name: 'Bronze', color: 'text-amber-600', icon: Star, nextLevel: 'Silver (500 pts)' };
      case 'silver':
        return { name: 'Silver', color: 'text-gray-500', icon: Trophy, nextLevel: 'Gold (1000 pts)' };
      case 'gold':
        return { name: 'Gold', color: 'text-yellow-500', icon: Crown, nextLevel: 'Platinum (2000 pts)' };
      case 'platinum':
        return { name: 'Platinum', color: 'text-purple-500', icon: Crown, nextLevel: 'Nível máximo!' };
      default:
        return { name: 'Bronze', color: 'text-amber-600', icon: Star, nextLevel: 'Silver (500 pts)' };
    }
  };

  const levelInfo = getLevelInfo(mockUserLoyalty.level);
  const LevelIcon = levelInfo.icon;
  const progressPercentage = (mockUserLoyalty.currentPoints / mockUserLoyalty.nextLevelPoints) * 100;

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(""), 2000);
  };

  const redeemReward = (rewardId: string, pointsCost: number) => {
    if (mockUserLoyalty.currentPoints >= pointsCost) {
      // Here you would handle the redemption logic
      console.log(`Redeeming reward ${rewardId} for ${pointsCost} points`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loyalty Status Card */}
      <Card className="bg-gradient-warm text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Avatar className="w-16 h-16 border-2 border-primary-foreground/20">
                <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-lg">
                  MS
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">Maria Silva</h2>
                <div className="flex items-center space-x-2">
                  <LevelIcon className="w-5 h-5" />
                  <span className="font-semibold">Membro {levelInfo.name}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-1">
                <Coins className="w-5 h-5" />
                <span className="text-2xl font-bold">{mockUserLoyalty.currentPoints}</span>
              </div>
              <p className="text-sm opacity-80">pontos disponíveis</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progresso para {levelInfo.nextLevel}</span>
              <span>{mockUserLoyalty.currentPoints}/{mockUserLoyalty.nextLevelPoints} pontos</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-primary-foreground/20" />
            
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center">
                <div className="text-lg font-bold">{mockUserLoyalty.totalEarned}</div>
                <div className="text-xs opacity-80">Pontos Ganhos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{mockUserLoyalty.ordersCount}</div>
                <div className="text-xs opacity-80">Pedidos Feitos</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {format(new Date(mockUserLoyalty.joinDate), "MMM/yy", { locale: ptBR })}
                </div>
                <div className="text-xs opacity-80">Membro Desde</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Recompensas</TabsTrigger>
          <TabsTrigger value="coupons">Meus Cupons</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="w-5 h-5" />
                <span>Troque seus Pontos</span>
              </CardTitle>
              <p className="text-muted-foreground">
                Você tem {mockUserLoyalty.currentPoints} pontos para trocar por recompensas
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockRewards.map((reward) => (
                  <Card key={reward.id} className={cn(
                    "hover:shadow-card transition-all duration-200",
                    !reward.available && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{reward.title}</h4>
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-primary">
                              <Coins className="w-4 h-4" />
                              <span className="font-bold">{reward.pointsCost}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full" 
                          disabled={!reward.available || mockUserLoyalty.currentPoints < reward.pointsCost}
                          onClick={() => redeemReward(reward.id, reward.pointsCost)}
                        >
                          {!reward.available ? "Indisponível" :
                           mockUserLoyalty.currentPoints < reward.pointsCost ? "Pontos Insuficientes" :
                           "Resgatar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-4">
          {/* Add Coupon Code */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Cupom</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Digite o código do cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <Button>Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Coupons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="w-5 h-5" />
                <span>Meus Cupons</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCoupons.map((coupon) => (
                  <Card key={coupon.id} className={cn(
                    "hover:shadow-card transition-shadow",
                    !coupon.isActive && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{coupon.title}</h4>
                            {coupon.isUsed && <Badge variant="outline">Usado</Badge>}
                            {!coupon.isActive && !coupon.isUsed && <Badge variant="destructive">Expirado</Badge>}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {coupon.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Percent className="w-3 h-3" />
                              <span>
                                {coupon.discountType === 'percentage' ? `${coupon.discount}%` : `R$ ${coupon.discount}`}
                                {coupon.maxDiscount && ` (máx R$ ${coupon.maxDiscount})`}
                              </span>
                            </div>
                            {coupon.minOrder && (
                              <div className="flex items-center space-x-1">
                                <ShoppingCart className="w-3 h-3" />
                                <span>Mín. R$ {coupon.minOrder}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                Até {format(new Date(coupon.expiryDate), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-md">
                            <code className="font-mono font-bold">{coupon.code}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyCoupon(coupon.code)}
                              className="h-auto p-1"
                            >
                              {copiedCoupon === coupon.code ? (
                                <Check className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                          
                          {coupon.usageLimit && (
                            <div className="text-xs text-muted-foreground">
                              {coupon.usedCount}/{coupon.usageLimit} usos
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Histórico de Pontos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: "2024-01-15", description: "Pedido #ORD-1001", points: 45, type: "earned" },
                  { date: "2024-01-14", description: "Resgate: 10% Desconto", points: -500, type: "redeemed" },
                  { date: "2024-01-12", description: "Pedido #ORD-1000", points: 38, type: "earned" },
                  { date: "2024-01-10", description: "Bônus por avaliação", points: 50, type: "bonus" }
                ].map((transaction, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className={cn(
                      "font-bold",
                      transaction.points > 0 ? "text-success" : "text-destructive"
                    )}>
                      {transaction.points > 0 ? "+" : ""}{transaction.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}