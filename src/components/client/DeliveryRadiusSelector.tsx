import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface DeliveryRadiusSelectorProps {
  currentRadius: number;
  restaurantCount: number;
  onRadiusChange: (radius: number) => void;
  loading?: boolean;
}

const radiusOptions = [
  { value: 2, label: '2km', desc: 'Muito próximo' },
  { value: 5, label: '5km', desc: 'Próximo' },
  { value: 10, label: '10km', desc: 'Médio' },
  { value: 15, label: '15km', desc: 'Longe' },
  { value: 25, label: '25km', desc: 'Muito longe' },
];

export const DeliveryRadiusSelector = ({ 
  currentRadius, 
  restaurantCount, 
  onRadiusChange, 
  loading = false 
}: DeliveryRadiusSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = radiusOptions.find(option => option.value === currentRadius) || radiusOptions[1];

  return (
    <div className="flex justify-center">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 border-2 border-primary/20 hover:border-primary/40 transition-all duration-200"
            disabled={loading}
          >
            <MapPin className="w-4 h-4 text-primary" />
            <div className="flex flex-col items-start">
              <div className="text-sm font-medium">
                {loading ? 'Buscando...' : `${restaurantCount} restaurante${restaurantCount !== 1 ? 's' : ''}`}
              </div>
              <div className="text-xs text-muted-foreground">
                Raio de {currentOption.label}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="center" className="w-56">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
            Raio de entrega
          </div>
          
          {radiusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onRadiusChange(option.value);
                setIsOpen(false);
              }}
              className="flex items-center justify-between py-2 px-3 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.desc}</span>
              </div>
              
              {currentRadius === option.value && (
                <Badge variant="default" className="text-xs">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          <div className="px-2 py-1.5 mt-1 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Maior raio = mais opções
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};