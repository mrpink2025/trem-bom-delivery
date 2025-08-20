import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Star, ThumbsUp, ThumbsDown, Flag, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  orderId?: string;
  restaurantId: string;
  restaurantName: string;
  likes: number;
  dislikes: number;
  isVerified: boolean;
  response?: {
    text: string;
    date: string;
    author: string;
  };
}

const mockReviews: Review[] = [
  {
    id: "rev-001",
    userId: "user-001",
    userName: "Maria Silva",
    userAvatar: "",
    rating: 5,
    comment: "Comida maravilhosa! O tempero goiano estava perfeito e a entrega foi super rápida. Já virei cliente fiel!",
    date: "2024-01-15T14:30:00Z",
    orderId: "ORD-1001",
    restaurantId: "rest-001",
    restaurantName: "Tempero Goiano",
    likes: 12,
    dislikes: 0,
    isVerified: true,
    response: {
      text: "Obrigado Maria! Ficamos muito felizes com seu feedback. Volte sempre!",
      date: "2024-01-15T16:00:00Z",
      author: "Sebastião - Proprietário"
    }
  },
  {
    id: "rev-002",
    userId: "user-002", 
    userName: "Carlos Santos",
    rating: 4,
    comment: "Pizza boa, massa crocante. Só demorou um pouco mais que o esperado para chegar, mas valeu a pena.",
    date: "2024-01-14T19:45:00Z",
    restaurantId: "rest-002",
    restaurantName: "Pizzaria Trem Bom",
    likes: 8,
    dislikes: 1,
    isVerified: true
  },
  {
    id: "rev-003",
    userId: "user-003",
    userName: "Ana Costa",
    rating: 5,
    comment: "Pamonha deliciosa e doce de leite caseiro! Sabor da roça que eu tanto sentia falta. Recomendo demais!",
    date: "2024-01-13T16:20:00Z",
    restaurantId: "rest-003", 
    restaurantName: "Pamonharia Central",
    likes: 15,
    dislikes: 0,
    isVerified: true
  },
  {
    id: "rev-004",
    userId: "user-004",
    userName: "Pedro Oliveira",
    rating: 3,
    comment: "Comida boa mas chegou fria. O entregador foi educado mas a comida perdeu a qualidade no caminho.",
    date: "2024-01-12T12:15:00Z",
    restaurantId: "rest-001",
    restaurantName: "Tempero Goiano",
    likes: 5,
    dislikes: 3,
    isVerified: true
  }
];

interface ReviewSystemProps {
  restaurantId?: string;
  showAddReview?: boolean;
}

export default function ReviewSystem({ restaurantId, showAddReview = true }: ReviewSystemProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const filteredReviews = mockReviews
    .filter(review => !restaurantId || review.restaurantId === restaurantId)
    .filter(review => filterRating === "all" || review.rating === parseInt(filterRating))
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "rating_high":
          return b.rating - a.rating;
        case "rating_low":
          return a.rating - b.rating;
        case "helpful":
          return (b.likes - b.dislikes) - (a.likes - a.dislikes);
        default:
          return 0;
      }
    });

  const averageRating = filteredReviews.reduce((sum, review) => sum + review.rating, 0) / filteredReviews.length;
  
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: filteredReviews.filter(review => review.rating === rating).length,
    percentage: (filteredReviews.filter(review => review.rating === rating).length / filteredReviews.length) * 100
  }));

  const StarRating = ({ rating, size = "sm", interactive = false, onRatingChange }: {
    rating: number;
    size?: "sm" | "md" | "lg";
    interactive?: boolean;
    onRatingChange?: (rating: number) => void;
  }) => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5", 
      lg: "w-6 h-6"
    };

    return (
      <div className="flex space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= rating ? "fill-secondary text-secondary" : "text-muted-foreground",
              interactive && "cursor-pointer hover:text-secondary transition-colors"
            )}
            onClick={() => interactive && onRatingChange?.(star)}
          />
        ))}
      </div>
    );
  };

  const handleSubmitReview = () => {
    if (selectedRating === 0 || !reviewText.trim()) return;
    
    // Here you would normally submit to your backend
    console.log("Submitting review:", {
      rating: selectedRating,
      comment: reviewText,
      restaurantId
    });
    
    // Reset form
    setSelectedRating(0);
    setReviewText("");
  };

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-secondary" />
            <span>Avaliações dos Clientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {averageRating ? averageRating.toFixed(1) : "0.0"}
                </div>
                <StarRating rating={Math.round(averageRating)} size="lg" />
                <p className="text-sm text-muted-foreground mt-2">
                  Baseado em {filteredReviews.length} avaliações
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 w-12">
                    <span className="text-sm">{rating}</span>
                    <Star className="w-3 h-3 fill-secondary text-secondary" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="reviews" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reviews">Todas as Avaliações</TabsTrigger>
          {showAddReview && <TabsTrigger value="add">Escrever Avaliação</TabsTrigger>}
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por nota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as notas</SelectItem>
                <SelectItem value="5">5 estrelas</SelectItem>
                <SelectItem value="4">4 estrelas</SelectItem>
                <SelectItem value="3">3 estrelas</SelectItem>
                <SelectItem value="2">2 estrelas</SelectItem>
                <SelectItem value="1">1 estrela</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigas</SelectItem>
                <SelectItem value="rating_high">Maior nota</SelectItem>
                <SelectItem value="rating_low">Menor nota</SelectItem>
                <SelectItem value="helpful">Mais úteis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-card transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Review Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={review.userAvatar} />
                          <AvatarFallback>
                            {review.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{review.userName}</h4>
                            {review.isVerified && (
                              <Badge variant="outline" className="text-xs">
                                Compra Verificada
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <StarRating rating={review.rating} />
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Flag className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Restaurant Info (if not filtered by restaurant) */}
                    {!restaurantId && (
                      <Badge variant="outline" className="w-fit">
                        {review.restaurantName}
                      </Badge>
                    )}

                    {/* Review Content */}
                    <p className="text-foreground leading-relaxed">
                      {review.comment}
                    </p>

                    {/* Review Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Útil ({review.likes})
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <ThumbsDown className="w-4 h-4 mr-2" />
                          ({review.dislikes})
                        </Button>
                      </div>
                      {review.orderId && (
                        <Badge variant="outline" className="text-xs">
                          Pedido #{review.orderId}
                        </Badge>
                      )}
                    </div>

                    {/* Restaurant Response */}
                    {review.response && (
                      <>
                        <Separator />
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">Resposta do {review.response.author}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.response.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.response.text}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {showAddReview && (
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Escrever uma Avaliação</CardTitle>
                <p className="text-muted-foreground">
                  Compartilhe sua experiência para ajudar outros clientes
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sua Avaliação</label>
                  <div className="flex items-center space-x-2">
                    <StarRating 
                      rating={selectedRating} 
                      size="lg" 
                      interactive 
                      onRatingChange={setSelectedRating}
                    />
                    {selectedRating > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        {selectedRating === 5 ? "Excelente!" : 
                         selectedRating === 4 ? "Muito bom!" :
                         selectedRating === 3 ? "Bom" :
                         selectedRating === 2 ? "Regular" : "Precisa melhorar"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sua Opinião</label>
                  <Textarea
                    placeholder="Conte-nos sobre sua experiência... Como foi a comida? O atendimento? A entrega?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 10 caracteres. Seja específico e honesto em sua avaliação.
                  </p>
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handleSubmitReview}
                  disabled={selectedRating === 0 || reviewText.length < 10}
                  className="w-full"
                >
                  Publicar Avaliação
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}