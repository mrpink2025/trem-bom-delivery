import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User } from 'lucide-react';
import { Review } from '@/hooks/useReviews';

interface NewReviewCardProps {
  review: Review;
}

export const NewReviewCard: React.FC<NewReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}.0</span>
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {renderStars(review.stars)}
                {review.is_verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verificado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(review.created_at)}
              </p>
            </div>
          </div>
        </div>
        
        {review.comment && (
          <p className="text-sm text-foreground leading-relaxed">
            {review.comment}
          </p>
        )}
      </CardContent>
    </Card>
  );
};