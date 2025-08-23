import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Send, 
  Phone, 
  Clock,
  MapPin,
  Truck,
  CheckCircle,
  User,
  Store
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_role: string;
  created_at: string;
  message_type: string;
}

interface CourierChatProps {
  orderId: string;
  restaurantId: string;
  clientId: string;
  courierId: string;
}

const QUICK_MESSAGES = [
  { text: "Cheguei no restaurante", icon: Store },
  { text: "Pedido retirado, a caminho", icon: Truck },
  { text: "Cheguei no local de entrega", icon: MapPin },
  { text: "Pedido entregue com sucesso", icon: CheckCircle },
  { text: "Estou atrasado, desculpe", icon: Clock },
  { text: "Preciso entrar em contato", icon: Phone }
];

export const CourierChat: React.FC<CourierChatProps> = ({
  orderId,
  restaurantId,
  clientId,
  courierId
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'restaurant' | 'client'>('restaurant');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll automático para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar mensagens do pedido
  useEffect(() => {
    loadMessages();
    
    // Configurar subscription em tempo real
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${orderId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const loadMessages = async () => {
    try {
      // Primeiro, garantir que a sala de chat existe
      await createChatRoomIfNotExists();
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
    }
  };

  const createChatRoomIfNotExists = async () => {
    try {
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (!existingRoom) {
        await supabase
          .from('chat_rooms')
          .insert({
            order_id: orderId,
            participants: [courierId, restaurantId, clientId]
          });
      }
    } catch (error) {
      console.error('Erro ao criar sala de chat:', error);
    }
  };

  const sendMessage = async (content: string, isQuickMessage = false) => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const messageData = {
        room_id: orderId,
        sender_id: courierId,
        sender_role: 'courier',
        content: content.trim(),
        message_type: isQuickMessage ? 'quick_message' : 'text'
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);

      if (error) {
        throw error;
      }

      setNewMessage('');
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso"
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newMessage);
    }
  };

  // Filtrar mensagens por participante
  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'restaurant') {
      return msg.sender_role === 'courier' || msg.sender_role === 'restaurant';
    } else {
      return msg.sender_role === 'courier' || msg.sender_role === 'client';
    }
  });

  const getSenderName = (msg: Message) => {
    switch (msg.sender_role) {
      case 'courier':
        return 'Você';
      case 'restaurant':
        return 'Restaurante';
      case 'client':
        return 'Cliente';
      default:
        return 'Desconhecido';
    }
  };

  const getSenderIcon = (role: string) => {
    switch (role) {
      case 'courier':
        return Truck;
      case 'restaurant':
        return Store;
      case 'client':
        return User;
      default:
        return MessageCircle;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>Chat do Pedido</span>
        </CardTitle>
        
        {/* Tabs para alternar entre restaurante e cliente */}
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'restaurant' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('restaurant')}
            className="flex-1"
          >
            <Store className="w-4 h-4 mr-2" />
            Restaurante
          </Button>
          <Button
            variant={activeTab === 'client' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('client')}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            Cliente
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Área de mensagens */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-2">
          {filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs">Use as mensagens rápidas abaixo</p>
              </div>
            </div>
          ) : (
            filteredMessages.map((message) => {
              const Icon = getSenderIcon(message.sender_role);
              const isOwnMessage = message.sender_role === 'courier';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    isOwnMessage 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="w-3 h-3" />
                      <span className="text-xs font-medium">
                        {getSenderName(message)}
                      </span>
                      {message.message_type === 'quick_message' && (
                        <Badge variant="outline" className="text-xs">
                          Rápida
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <Separator />

        {/* Mensagens rápidas */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Mensagens Rápidas:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {QUICK_MESSAGES.map((quickMsg, index) => {
              const Icon = quickMsg.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(quickMsg.text, true)}
                  disabled={loading}
                  className="justify-start text-left h-auto py-2"
                >
                  <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{quickMsg.text}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Campo de mensagem personalizada */}
        <div className="space-y-2">
          <Textarea
            placeholder="Digite uma mensagem personalizada..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            className="resize-none"
          />
          <Button
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim() || loading}
            size="sm"
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Enviando...' : 'Enviar Mensagem'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};