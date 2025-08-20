import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReviewCardProps {
  review: {
    id: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    date: string;
    restaurantName?: string;
    likes: number;
    dislikes: number;
    isVerified: boolean;
  };
  showRestaurant?: boolean;
}

export default function ReviewCard({ review, showRestaurant = false }: ReviewCardProps) {
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-4 h-4",
            star <= rating ? "fill-secondary text-secondary" : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );

  return (
    <Card className="hover:shadow-card transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.userAvatar} />
                <AvatarFallback>
                  {review.userName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-sm">{review.userName}</h4>
                  {review.isVerified && (
                    <Badge variant="outline" className="text-xs">
                      Verificado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(review.date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Flag className="w-3 h-3" />
            </Button>
          </div>

          {/* Restaurant */}
          {showRestaurant && review.restaurantName && (
            <Badge variant="outline" className="w-fit text-xs">
              {review.restaurantName}
            </Badge>
          )}

          {/* Comment */}
          <p className="text-sm text-foreground leading-relaxed">
            {review.comment}
          </p>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-8">
              <ThumbsUp className="w-3 h-3 mr-1" />
              {review.likes}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-8">
              <ThumbsDown className="w-3 h-3 mr-1" />
              {review.dislikes}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}