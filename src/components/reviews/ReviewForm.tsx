import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ReviewFormProps {
  orderId: string;
  targetType: 'restaurant' | 'courier' | 'product';
  targetId: string;
  targetName: string;
  onSubmit?: () => void;
}

export const ReviewForm = ({ orderId, targetType, targetId, targetName, onSubmit }: ReviewFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async ({ stars, comment }: { stars: number; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: orderId,
          user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          stars,
          comment: comment.trim() || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Avaliação enviada!",
        description: "Obrigado pelo seu feedback.",
      });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onSubmit?.();
    },
    onError: (error) => {
      console.error('Error submitting review:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Avaliação obrigatória",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate({ stars: rating, comment });
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'restaurant': return 'restaurante';
      case 'courier': return 'entregador';
      case 'product': return 'produto';
      default: return 'item';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliar {getTargetTypeLabel()}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Como foi sua experiência com <strong>{targetName}</strong>?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Sua avaliação:</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-colors"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} {rating === 1 ? 'estrela' : 'estrelas'}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Comentário (opcional):
          </label>
          <Textarea
            placeholder="Compartilhe sua experiência..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {comment.length}/500 caracteres
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitReviewMutation.isPending}
          className="w-full"
        >
          {submitReviewMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Enviar Avaliação
        </Button>
      </CardContent>
    </Card>
  );
};