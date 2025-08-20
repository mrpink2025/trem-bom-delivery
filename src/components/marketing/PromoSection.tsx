import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download,
  Star,
  Clock,
  MapPin,
  Gift,
  Shield,
  Smartphone,
  Heart
} from 'lucide-react';
import { ScooterIcon } from '@/components/ui/scooter-icon';
import promoBanner from '@/assets/promo-banner-main.jpg';
import promoFood from '@/assets/promo-food-square.jpg';
import promoFamily from '@/assets/promo-family.jpg';

export default function PromoSection() {
  return (
    <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={promoBanner} 
            alt="Trem Bão Delivery - O melhor sabor na sua mesa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-3xl">
            <Badge className="mb-6 text-lg px-4 py-2 bg-secondary text-secondary-foreground">
              🎉 Lançamento Oficial!
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-secondary">Trem Bão</span><br />
              Delivery
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              O <strong>sabor autêntico</strong> de Minas e Goiás<br />
              agora na palma da sua mão! 🏠✨
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg" 
                className="text-xl px-8 py-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-glow font-bold"
              >
                <Download className="w-6 h-6 mr-3" />
                Baixar Agora - GRÁTIS
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-xl px-8 py-6 border-2 border-white/80 bg-white/10 text-white hover:bg-white hover:text-primary font-bold backdrop-blur-sm"
              >
                <Smartphone className="w-6 h-6 mr-3" />
                Ver Como Funciona
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">4.9★</span>
                <span>Avaliação</span>
              </div>
              <div className="flex items-center gap-2">
                <ScooterIcon className="w-5 h-5" />
                <span className="font-semibold">25 min</span>
                <span>Entrega Média</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-semibold">100%</span>
                <span>Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Trem Bão */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-base px-4 py-2">
              Por que escolher o Trem Bão?
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Muito mais que <span className="text-primary">delivery</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Conectamos você aos melhores sabores regionais com tecnologia de ponta
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Sabor Autêntico",
                description: "Comida caseira mineira e goiana feita com amor e tradição familiar",
                color: "text-red-500"
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Super Rápido",
                description: "Entrega expressa em até 25 minutos. Sua fome não pode esperar!",
                color: "text-blue-500"
              },
              {
                icon: <Gift className="w-8 h-8" />,
                title: "Programa Fidelidade",
                description: "Ganhe pontos a cada pedido e troque por descontos incríveis",
                color: "text-purple-500"
              },
              {
                icon: <MapPin className="w-8 h-8" />,
                title: "Rastreamento Real",
                description: "Acompanhe seu pedido em tempo real, do preparo até sua porta",
                color: "text-green-500"
              },
              {
                icon: <ScooterIcon className="w-8 h-8" />,
                title: "Frete Grátis",
                description: "Delivery gratuito em pedidos acima de R$ 30. Economia garantida!",
                color: "text-orange-500"
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Qualidade Premium",
                description: "Restaurantes selecionados com nota mínima de 4.5 estrelas",
                color: "text-yellow-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 mb-4 ${feature.color} group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Food Showcase */}
      <section className="py-20 bg-gradient-warm text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 text-base px-4 py-2 bg-secondary text-secondary-foreground">
                Sabores Regionais
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                De Minas e Goiás<br />
                para sua <span className="text-secondary">mesa</span>
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Descobrimos os melhores restaurantes que preservam a tradição culinária do interior. 
                Cada prato conta uma história de família e sabor autêntico.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  "🧀 Pão de açúcar quentinho e crocante",
                  "🌽 Pamonha doce e salgada fresquinha", 
                  "🥘 Feijão tropeiro como da vovó",
                  "🍖 Pequi com frango caipira",
                  "🥧 Pastel de queijo mineiro"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-secondary rounded-full" />
                    <span className="text-lg">{item}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                size="lg" 
                variant="secondary"
                className="text-xl px-8 py-6 font-bold"
              >
                Ver Cardápio Completo
              </Button>
            </div>
            
            <div className="relative">
              <img 
                src={promoFood} 
                alt="Deliciosas comidas mineiras e goianas"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute -top-4 -right-4 bg-secondary text-secondary-foreground px-4 py-2 rounded-full font-bold shadow-lg">
                +150 pratos! 🤤
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src={promoFamily} 
                alt="Família feliz com delivery Trem Bão"
                className="w-full rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold shadow-lg">
                +10.000 famílias felizes! ❤️
              </div>
            </div>
            
            <div>
              <Badge variant="secondary" className="mb-6 text-base px-4 py-2">
                Depoimentos Reais
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Quem usa <span className="text-primary">recomenda</span>
              </h2>
              
              <div className="space-y-6">
                {[
                  {
                    quote: "Finalmente encontrei pão de açúcar igual ao da minha cidade natal! O Trem Bão trouxe o interior para São Paulo.",
                    author: "Maria dos Santos",
                    location: "Vila Madalena, SP"
                  },
                  {
                    quote: "App super fácil de usar e a entrega é sempre no prazo. Virou rotina pedir pamonha no final de semana!",
                    author: "João Silva", 
                    location: "Perdizes, SP"
                  },
                  {
                    quote: "O programa de fidelidade é incrível! Já ganhei várias refeições grátis. Recomendo demais!",
                    author: "Ana Paula",
                    location: "Pinheiros, SP"
                  }
                ].map((testimonial, index) => (
                  <Card key={index} className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[1,2,3,4,5].map((star) => (
                        <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-lg mb-4 italic">"{testimonial.quote}"</p>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-primary via-secondary to-accent text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Que tal um <span className="text-yellow-300">Trem Bão</span><br />
            agora mesmo?
          </h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Baixe o app e ganhe <strong>20% OFF</strong> no seu primeiro pedido!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="text-xl px-8 py-6 bg-white text-primary hover:bg-gray-100 font-bold shadow-lg transform hover:scale-105 transition-all"
            >
              <Download className="w-6 h-6 mr-3" />
              Baixar App - 20% OFF
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-xl px-8 py-6 border-2 border-white text-white hover:bg-white hover:text-primary font-bold"
            >
              <Gift className="w-6 h-6 mr-3" />
              Ver Promoções
            </Button>
          </div>
          
          <p className="text-lg opacity-75">
            🎉 Oferta válida apenas para novos usuários | ⏰ Por tempo limitado
          </p>
        </div>
      </section>
    </div>
  );
}