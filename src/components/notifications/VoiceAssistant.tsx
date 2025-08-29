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
  MessageCircle,
  Wifi,
  WifiOff,
  ShoppingCart,
  CreditCard,
  Move
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
  
  // Drag and drop state
  const [position, setPosition] = useState(() => {
    // Load saved position or use default
    const saved = localStorage.getItem('voice-assistant-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 80, y: window.innerHeight - 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const assistantRef = useRef<HTMLDivElement>(null);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voice-assistant-position', JSON.stringify(position));
  }, [position]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (connectionStatus === 'connected') return; // Don't allow dragging during conversation
    
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y
    });
    
    e.preventDefault();
  };

  // Handle drag move
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 60, clientX - dragOffset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 60, clientY - dragOffset.y));
    
    setPosition({ x: newX, y: newY });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Attach global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove);
      document.addEventListener('touchend', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, dragOffset]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(0, Math.min(window.innerWidth - 60, prev.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, prev.y))
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          // Use the current URL search params to show results
          const searchTerm = cuisine_type || '';
          navigate(`/?search=${encodeURIComponent(searchTerm)}`);
          
          // Wait a bit for navigation then try to get restaurant info
          setTimeout(() => {
            const restaurantElements = document.querySelectorAll('[data-restaurant-slug]');
            if (restaurantElements.length > 0) {
              const restaurantNames = Array.from(restaurantElements).slice(0, 3).map(el => {
                const name = el.querySelector('h3')?.textContent || 'Restaurante';
                const slug = el.getAttribute('data-restaurant-slug');
                return `${name} (slug: ${slug})`;
              }).join(', ');
              
              return `Encontrei restaurantes: ${restaurantNames}. Posso abrir o cardápio de algum deles?`;
            }
            return `Buscando restaurantes de ${cuisine_type || 'todos os tipos'} ${location ? `em ${location}` : ''}`;
          }, 1000);
          
          return `Buscando restaurantes de ${cuisine_type || 'todos os tipos'} ${location ? `em ${location}` : ''}`;
          
        case 'view_menu':
          const { restaurant_slug } = args;
          // Navigate to specific restaurant menu
          navigate(`/menu/${restaurant_slug}`);
          return `Abrindo cardápio do restaurante. Agora você pode ver os itens disponíveis e eu posso ajudar a adicionar ao carrinho.`;
          
        case 'clear_cart':
          await clearCart();
          return "Carrinho limpo com sucesso";
          
        case 'get_restaurant_info':
          // Try to extract restaurant info from current page
          const currentRestaurant = document.querySelector('[data-restaurant-id]');
          if (currentRestaurant) {
            const restaurantId = currentRestaurant.getAttribute('data-restaurant-id');
            const restaurantName = currentRestaurant.querySelector('h1, h2, .restaurant-name')?.textContent || 'Restaurante';
            return `Você está visualizando: ${restaurantName} (ID: ${restaurantId}). Posso ajudar a adicionar itens específicos ao carrinho.`;
          }
          return `Não foi possível identificar o restaurante atual. Tente navegar para um cardápio específico primeiro.`;
          
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
    <div 
      ref={assistantRef}
      className={`fixed z-50 transition-all duration-200 ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'} ${
        connectionStatus === 'connected' ? 'cursor-default' : 'hover:scale-105'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none',
        touchAction: 'none'
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      {/* Minimized floating button */}
      {connectionStatus === 'disconnected' && (
        <div className="relative group">
          <Button
            onClick={startConversation}
            size="icon"
            className="h-14 w-14 rounded-full bg-primary/80 hover:bg-primary shadow-lg backdrop-blur-sm border-2 border-primary/20"
            title="Assistente de Voz IA - Clique e arraste para mover"
          >
            <MessageCircle className="h-7 w-7" />
          </Button>
          
          {/* Drag indicator */}
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary/90 text-primary-foreground rounded-full p-1">
              <Move className="h-3 w-3" />
            </div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Clique para falar • Arraste para mover
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {connectionStatus === 'connecting' && (
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full px-4 py-3 shadow-lg">
          <Wifi className="w-4 h-4 text-yellow-600 animate-pulse" />
          <span className="text-sm font-medium">Conectando...</span>
        </div>
      )}

      {/* Active conversation - minimal UI */}
      {connectionStatus === 'connected' && (
        <div className="space-y-2">
          {/* Status indicators */}
          <div className="flex gap-2 justify-center">
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
            className="gap-2 bg-destructive/80 hover:bg-destructive backdrop-blur-sm w-full"
          >
            <PhoneOff className="w-4 h-4" />
            Encerrar
          </Button>
        </div>
      )}

      {/* Error state */}
      {connectionStatus === 'error' && (
        <div className="bg-destructive/90 text-destructive-foreground backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Erro de Conexão</span>
          </div>
          <Button
            onClick={startConversation}
            size="sm"
            variant="ghost"
            className="text-destructive-foreground hover:bg-destructive-foreground/20 w-full"
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
};