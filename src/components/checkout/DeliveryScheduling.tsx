import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addHours, addDays, startOfHour, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeliverySlot {
  id: string;
  slot_start: string;
  slot_end: string;
  max_capacity: number;
  current_orders: number;
  is_available: boolean;
}

interface DeliverySchedulingProps {
  restaurantId: string;
  onSlotSelect?: (slot: DeliverySlot | null) => void;
}

export const DeliveryScheduling = ({ restaurantId, onSlotSelect }: DeliverySchedulingProps) => {
  const [selectedDate, setSelectedDate] = useState(0); // 0=today, 1=tomorrow, etc
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);

  // Generate next 3 days
  const days = Array.from({ length: 3 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date,
      label: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : format(date, 'EEE dd/MM', { locale: ptBR })
    };
  });

  // Fetch available delivery slots
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['delivery-slots', restaurantId, selectedDate],
    queryFn: async () => {
      const selectedDay = days[selectedDate].date;
      const startOfDay = new Date(selectedDay);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDay);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('delivery_slots')
        .select(`
          *,
          store_units!inner(restaurant_id)
        `)
        .eq('store_units.restaurant_id', restaurantId)
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_end', endOfDay.toISOString())
        .eq('is_available', true)
        .order('slot_start');

      if (error) throw error;
      return data as DeliverySlot[];
    },
    enabled: !!restaurantId,
  });

  // Generate time slots if none exist
  useEffect(() => {
    const generateSlots = async () => {
      if (slots.length > 0) return;

      // Get store units for this restaurant
      const { data: storeUnits } = await supabase
        .from('store_units')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .limit(1);

      if (!storeUnits?.length) return;

      const selectedDay = days[selectedDate].date;
      const now = new Date();
      const slotsToCreate = [];

      // Generate slots from 11:00 to 22:00, every hour
      for (let hour = 11; hour <= 22; hour++) {
        const slotStart = new Date(selectedDay);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setTime(slotEnd.getTime() + 60 * 60 * 1000); // +1 hour

        // Skip past slots
        if (selectedDate === 0 && isBefore(slotStart, addHours(now, 1))) continue;

        slotsToCreate.push({
          store_unit_id: storeUnits[0].id,
          slot_start: slotStart.toISOString(),
          slot_end: slotEnd.toISOString(),
          max_capacity: 5,
          current_orders: 0,
          is_available: true
        });
      }

      if (slotsToCreate.length > 0) {
        await supabase.from('delivery_slots').insert(slotsToCreate);
      }
    };

    generateSlots();
  }, [restaurantId, selectedDate, slots.length, days]);

  const handleSlotSelect = (slot: DeliverySlot) => {
    setSelectedSlot(slot);
    onSlotSelect?.(slot);
  };

  const getSlotStatus = (slot: DeliverySlot) => {
    const available = slot.max_capacity - slot.current_orders;
    if (available <= 0) return { label: 'Lotado', variant: 'destructive' as const };
    if (available <= 2) return { label: `${available} vagas`, variant: 'secondary' as const };
    return { label: 'Disponível', variant: 'default' as const };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendar Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day selector */}
        <div className="grid grid-cols-3 gap-2">
          {days.map((day, index) => (
            <Button
              key={index}
              variant={selectedDate === index ? 'default' : 'outline'}
              onClick={() => {
                setSelectedDate(index);
                setSelectedSlot(null);
                onSlotSelect?.(null);
              }}
              className="text-sm"
            >
              {day.label}
            </Button>
          ))}
        </div>

        {/* Time slots */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Horários disponíveis
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Carregando horários...
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Nenhum horário disponível para este dia
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const status = getSlotStatus(slot);
                const isSelected = selectedSlot?.id === slot.id;
                const isDisabled = status.variant === 'destructive';

                return (
                  <Button
                    key={slot.id}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={isDisabled}
                    className="flex flex-col h-auto p-3"
                  >
                    <div className="font-medium">
                      {format(new Date(slot.slot_start), 'HH:mm')} - {format(new Date(slot.slot_end), 'HH:mm')}
                    </div>
                    <Badge variant={status.variant} className="text-xs mt-1">
                      {status.label}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {selectedSlot && (
          <div className="p-3 bg-muted rounded-md">
            <div className="font-medium">Horário selecionado:</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(selectedSlot.slot_start), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};