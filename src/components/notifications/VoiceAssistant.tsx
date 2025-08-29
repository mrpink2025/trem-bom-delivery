import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { RealtimeAIChat } from '@/utils/RealtimeAI';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  VolumeX,
  MessageSquare,
  Bot,
  Wifi,
  WifiOff,
  ShoppingCart,
  CreditCard
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const VoiceAssistant: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addToCart, getItemCount, clearCart, getCartTotal } = useCart();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const chatRef = useRef<RealtimeAIChat | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Function tools that the AI can call
  const handleFunctionCall = async (functionName: string, args: any) => {
    console.log('Function called:', functionName, args);
    
    try {
      switch (functionName) {
        case 'add_to_cart':
          const { menu_item_id, restaurant_id, quantity = 1, special_instructions } = args;
          await addToCart(menu_item_id, restaurant_id, quantity, special_instructions);
          return `Item adicionado ao carrinho com sucesso! Quantidade: ${quantity}`;
          
        case 'go_to_checkout':
          navigate('/checkout');
          toast({
            title: "Redirecionando",
            description: "Indo para finalização do pedido",
          });
          return "Redirecionando para a página de checkout";
          
        case 'view_cart':
          const itemCount = getItemCount();
          const total = getCartTotal();
          return `Você tem ${itemCount} itens no carrinho. Total: R$ ${total.toFixed(2)}`;
          
        case 'search_restaurants':
          const { cuisine_type, location } = args;
          navigate(`/?search=${encodeURIComponent(cuisine_type || '')}`);
          return `Buscando restaurantes de ${cuisine_type || 'todos os tipos'} ${location ? `em ${location}` : ''}`;
          
        case 'clear_cart':
          await clearCart();
          return "Carrinho limpo com sucesso";
          
        case 'view_menu':
          const { restaurant_slug } = args;
          navigate(`/menu/${restaurant_slug}`);
          return `Abrindo cardápio do restaurante`;
          
        default:
          return `Função ${functionName} não reconhecida`;
      }
    } catch (error) {
      console.error('Error executing function:', error);
      return `Erro ao executar ${functionName}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  };

  const handleAIMessage = (event: any) => {
    console.log('AI Event received:', event.type, event);
    
    switch (event.type) {
      case 'response.audio.delta':
        setIsSpeaking(true);
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        break;
        
      case 'response.audio_transcript.delta':
        if (event.delta) {
          setCurrentTranscript(prev => prev + event.delta);
        }
        break;
        
      case 'response.audio_transcript.done':
        if (currentTranscript.trim()) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'assistant',
            content: currentTranscript.trim(),
            timestamp: new Date()
          }]);
          setCurrentTranscript('');
        }
        break;
        
      case 'input_audio_buffer.speech_started':
        setIsRecording(true);
        break;
        
      case 'input_audio_buffer.speech_stopped':
        setIsRecording(false);
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: event.transcript,
            timestamp: new Date()
          }]);
        }
        break;
        
      case 'error':
        console.error('AI Error:', event);
        toast({
          title: "Erro na Conversa",
          description: event.error?.message || "Erro desconhecido na conversa com IA",
          variant: "destructive",
        });
        break;
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  };

  const startConversation = async () => {
    try {
      setConnectionStatus('connecting');
      
      chatRef.current = new RealtimeAIChat(handleAIMessage, handleConnectionChange, handleFunctionCall);
      await chatRef.current.init();
      
      toast({
        title: "Assistente Conectado",
        description: "Você pode começar a falar agora",
      });
      
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: 'Olá! Sou seu assistente do Trem Bão Delivery. Como posso ajudar você hoje?',
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setConnectionStatus('error');
      
      toast({
        title: "Erro de Conexão",
        description: error instanceof Error ? error.message : 'Falha ao conectar com o assistente',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setConnectionStatus('disconnected');
    setIsRecording(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
  };

  const sendTextMessage = async (text: string) => {
    if (!chatRef.current?.isConnectionReady()) {
      toast({
        title: "Não Conectado",
        description: "Inicie uma conversa primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'user',
        content: text,
        timestamp: new Date()
      }]);
      
      await chatRef.current.sendTextMessage(text);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao Enviar",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-yellow-600 animate-pulse" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-600" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Erro';
      default:
        return 'Desconectado';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-20 max-w-sm">
      {/* Minimized floating button */}
      {connectionStatus === 'disconnected' && (
        <Button
          onClick={startConversation}
          size="icon"
          className="h-12 w-12 rounded-full bg-primary/80 hover:bg-primary shadow-lg backdrop-blur-sm"
          title="Assistente de Voz IA"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}

      {/* Connection status indicator */}
      {connectionStatus === 'connecting' && (
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-3 py-2 shadow-lg">
          <Wifi className="w-4 h-4 text-yellow-600 animate-pulse" />
          <span className="text-sm font-medium">Conectando...</span>
        </div>
      )}

      {/* Active conversation - minimal UI */}
      {connectionStatus === 'connected' && (
        <div className="space-y-2">
          {/* Status indicators */}
          <div className="flex gap-2">
            {isRecording && (
              <Badge variant="secondary" className="animate-pulse bg-destructive/20 text-destructive border-destructive/30">
                <Mic className="w-3 h-3 mr-1" />
                Ouvindo
              </Badge>
            )}
            
            {isSpeaking && (
              <Badge variant="secondary" className="animate-pulse bg-primary/20 text-primary border-primary/30">
                <Volume2 className="w-3 h-3 mr-1" />
                Falando
              </Badge>
            )}
          </div>

          {/* Control button */}
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="sm"
            className="gap-2 bg-destructive/80 hover:bg-destructive backdrop-blur-sm"
          >
            <PhoneOff className="w-4 h-4" />
            Encerrar
          </Button>
        </div>
      )}

      {/* Error state */}
      {connectionStatus === 'error' && (
        <div className="flex items-center gap-2 bg-destructive/90 text-destructive-foreground backdrop-blur-sm border rounded-full px-3 py-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Erro</span>
          <Button
            onClick={startConversation}
            size="sm"
            variant="ghost"
            className="text-destructive-foreground hover:bg-destructive-foreground/20"
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
};