import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { RealtimeAIChat } from '@/utils/RealtimeAI';
import { supabase } from '@/integrations/supabase/client';
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
  const [detectedAssistant, setDetectedAssistant] = useState<{ gender: 'male' | 'female'; assistant: string } | null>(null);
  
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
    console.log('🎯 Função chamada:', functionName, args);
    
    try {
      switch (functionName) {
        case 'search_real_restaurants':
          const { query } = args;
          console.log('🔍 Buscando restaurantes:', query);
          try {
            const { data: restaurants, error } = await supabase
              .from('restaurants')
              .select('id, name, cuisine_type, description, is_active')
              .eq('is_active', true)
              .ilike('name', `%${query}%`);
            
            console.log('📍 Resultados:', restaurants, 'Erro:', error);
            
            if (error) {
              console.error('❌ Erro na busca:', error);
              return `Ô querido, deu erro na busca: ${error.message}`;
            }
            
            if (!restaurants || restaurants.length === 0) {
              const { data: restaurantsByCuisine } = await supabase
                .from('restaurants')
                .select('id, name, cuisine_type, description, is_active')
                .eq('is_active', true)
                .ilike('cuisine_type', `%${query}%`);
              
              if (!restaurantsByCuisine || restaurantsByCuisine.length === 0) {
                return `Uai, não achei "${query}". Tenta outro nome, meu filho!`;
              }
              
              const list = restaurantsByCuisine.map(r => `- ${r.name} - ID: ${r.id}`).join('\n');
              return `Achei esses trens bão:\n${list}\n\nQual cardápio você quer ver?`;
            }
            
            const list = restaurants.map(r => `- ${r.name} - ID: ${r.id}`).join('\n');
            return `Trem bão! Achei:\n${list}\n\nQual cardápio quer abrir?`;
          } catch (error) {
            return `Ô meu filho, deu erro: ${error}`;
          }

        case 'get_menu_items':
          const { restaurant_id: menuRestId, search_term } = args;
          console.log('🍽️ Buscando itens:', { menuRestId, search_term });
          
          try {
            if (!menuRestId) {
              return `Preciso do ID do restaurante, querido!`;
            }

            const response = await fetch(`https://ighllleypgbkluhcihvs.supabase.co/rest/v1/menu_items?restaurant_id=eq.${menuRestId}&is_active=eq.true&select=id,name,price,description,restaurant_id`, {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaGxsbGV5cGdia2x1aGNpaHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDg0MzIsImV4cCI6MjA3MTI4NDQzMn0.32KpEBVd6go9HUpd5IzlaKz2dTai0TqGn9P9Xqqkv2E',
                'Content-Type': 'application/json'
              }
            });
            
            console.log('📡 Resposta da API:', {
              status: response.status,
              ok: response.ok,
              url: response.url
            });
            
            if (!response.ok) {
              console.log('❌ Erro na resposta:', response.status, response.statusText);
              return `Erro ao buscar itens: ${response.status} ${response.statusText}`;
            }
            
            const menuItems = await response.json();
            console.log('📋 Itens RAW encontrados:', menuItems);
            console.log('📋 Primeiro item completo:', menuItems[0]);
            
            if (!menuItems || menuItems.length === 0) {
              console.log('⚠️ Nenhum item encontrado para restaurant_id:', menuRestId);
              return `Uai, esse restaurante não tem itens no cardápio disponíveis.`;
            }
            
            let filteredItems = menuItems;
            if (search_term) {
              filteredItems = menuItems.filter((item: any) => 
                item.name.toLowerCase().includes(search_term.toLowerCase())
              );
              console.log('🔍 Itens filtrados por termo:', filteredItems.length);
            }
            
            if (filteredItems.length === 0 && search_term) {
              return `Não achei "${search_term}" no cardápio. Tenta outro nome, sô!`;
            }
            
            const itemsList = filteredItems.slice(0, 5).map((item: any) => {
              console.log('📝 Formatando item:', { id: item.id, name: item.name, price: item.price, restaurant_id: item.restaurant_id });
              return `- ${item.name} (R$ ${Number(item.price).toFixed(2)}) - ID: ${item.id}`;
            }).join('\n');
            
            console.log('✅ Lista final formatada:', itemsList);
            return `Trem bão! Achei ${filteredItems.length} item(s):\n\n${itemsList}\n\nQual você quer adicionar no carrinho?`;
          } catch (error) {
            console.error('❌ Erro busca cardápio COMPLETO:', error);
            return `Deu problema ao buscar o cardápio. Erro: ${error}`;
          }

        case 'add_to_cart':
          const { menu_item_id, restaurant_id: restId, quantity = 1, special_instructions } = args;
          console.log('🛒 INÍCIO - Adicionando ao carrinho:', { 
            menu_item_id, 
            restId, 
            quantity, 
            special_instructions,
            args_completo: args 
          });
          
          try {
            // Validação rigorosa do menu_item_id
            if (!menu_item_id || typeof menu_item_id !== 'string' || menu_item_id.trim() === '') {
              console.log('❌ menu_item_id inválido:', menu_item_id);
              return `Ô querido, preciso do ID certinho do item! Primeiro me pergunta quais itens tem no cardápio usando "quais pratos tem"`;
            }
            
            let finalRestId = restId;
            if (!finalRestId) {
              // Extrair da URL atual
              const urlMatch = window.location.pathname.match(/\/menu\/([^\/]+)/);
              if (urlMatch && urlMatch[1]) {
                finalRestId = urlMatch[1];
                console.log('🔧 ID do restaurante extraído da URL:', finalRestId);
              } else {
                console.log('❌ Não conseguiu extrair restaurant_id da URL:', window.location.pathname);
                return `Uai, não consegui identificar o restaurante. Você tá no cardápio de algum restaurante? Se não, me fala qual restaurante você quer primeiro!`;
              }
            }

            // Validação final antes de chamar addToCart
            console.log('🔧 VALIDAÇÃO FINAL:', {
              menu_item_id: menu_item_id,
              finalRestId: finalRestId,
              quantity: quantity,
              special_instructions: special_instructions || ''
            });

            // Chamada para addToCart
            console.log('🚀 Chamando addToCart...');
            await addToCart(menu_item_id, finalRestId, quantity, special_instructions || '');
            console.log('✅ SUCESSO! Item adicionado ao carrinho');
            
            return `Pronto! Adicionei ao carrinho. Quer mais alguma coisa?`;
          } catch (error) {
            console.error('❌ ERRO COMPLETO add_to_cart:', {
              error: error,
              message: error instanceof Error ? error.message : 'Erro desconhecido',
              stack: error instanceof Error ? error.stack : undefined,
              menu_item_id,
              restId,
              quantity
            });
            
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            return `Deu problema ao adicionar no carrinho. Erro: ${errorMsg}. Vamos tentar novamente?`;
          }

        case 'view_cart':
          try {
            console.log('🛒 VIEW_CART - Consultando carrinho...');
            
            const itemCount = getItemCount();
            const total = getCartTotal();
            
            console.log('🛒 VIEW_CART - Contagem:', itemCount, 'Total:', total);
            
            if (itemCount === 0) {
              console.log('🛒 VIEW_CART - Carrinho vazio pelo getItemCount()');
              
              // Verificar diretamente no Supabase como fallback
              try {
                const { data: directCartItems, error: directError } = await supabase
                  .from('cart_items')
                  .select('id, quantity, menu_item_id')
                  .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
                
                console.log('🛒 VIEW_CART - Verificação direta no Supabase:', directCartItems, 'Erro:', directError);
                
                if (directCartItems && directCartItems.length > 0) {
                  console.log('🛒 VIEW_CART - Achei itens no Supabase mas getItemCount() retornou 0!');
                  // Forçar recálculo
                } else {
                  return `Carrinho vazio! Vamos escolher alguma coisa gostosa?`;
                }
              } catch (fallbackError) {
                console.error('❌ VIEW_CART - Erro na verificação direta:', fallbackError);
                return `Carrinho vazio! Vamos escolher alguma coisa gostosa?`;
              }
            }
            
            // Buscar itens detalhados do carrinho diretamente
            try {
              const user = await supabase.auth.getUser();
              if (!user.data.user?.id) {
                return `Erro: usuário não autenticado`;
              }

              console.log('🛒 VIEW_CART - Buscando itens para usuário:', user.data.user.id);
              
              // Primeiro buscar os cart_items
              const { data: cartItems, error: cartError } = await supabase
                .from('cart_items')
                .select('id, quantity, special_instructions, menu_item_id, restaurant_id')
                .eq('user_id', user.data.user.id);
              
              console.log('🛒 VIEW_CART - Cart items encontrados:', cartItems);
              console.log('🛒 VIEW_CART - Erro cart items:', cartError);
              
              if (cartError) {
                console.error('❌ VIEW_CART - Erro ao buscar cart items:', cartError);
                return `Seu carrinho: ${itemCount} item(s) - R$ ${total.toFixed(2)}. Tá tudo certinho!`;
              }
              
              if (!cartItems || cartItems.length === 0) {
                console.log('🛒 VIEW_CART - Nenhum cart item encontrado');
                return `Carrinho vazio! Vamos escolher alguma coisa gostosa?`;
              }
              
              // Agora buscar os detalhes dos menu items
              const menuItemIds = cartItems.map(item => item.menu_item_id);
              console.log('🛒 VIEW_CART - IDs dos menu items:', menuItemIds);
              
              const { data: menuItems, error: menuError } = await supabase
                .from('menu_items')
                .select('id, name, price')
                .in('id', menuItemIds);
              
              console.log('🛒 VIEW_CART - Menu items encontrados:', menuItems);
              console.log('🛒 VIEW_CART - Erro menu items:', menuError);
              
              if (menuError) {
                console.error('❌ VIEW_CART - Erro ao buscar menu items:', menuError);
                return `Seu carrinho: ${itemCount} item(s) - R$ ${total.toFixed(2)}. Tudo certinho! Quer finalizar?`;
              }
              
              // Combinar os dados
              const itemsList = cartItems.map((cartItem: any) => {
                const menuItem = menuItems?.find(m => m.id === cartItem.menu_item_id);
                if (!menuItem) {
                  console.log('🛒 VIEW_CART - Menu item não encontrado para:', cartItem.menu_item_id);
                  return `- ${cartItem.quantity}x Item desconhecido`;
                }
                
                const itemTotal = (menuItem.price * cartItem.quantity).toFixed(2);
                return `- ${cartItem.quantity}x ${menuItem.name} (R$ ${itemTotal})${cartItem.special_instructions ? ` - ${cartItem.special_instructions}` : ''}`;
              }).join('\n');
              
              console.log('🛒 VIEW_CART - Lista formatada:', itemsList);
              
              return `Seu carrinho tem:\n${itemsList}\n\nTotal: R$ ${total.toFixed(2)}\n\nTudo certinho! Quer finalizar o pedido?`;
              
            } catch (detailError) {
              console.error('❌ VIEW_CART - Erro detalhes:', detailError);
              return `Seu carrinho: ${itemCount} item(s) - R$ ${total.toFixed(2)}. Tudo certinho! Quer finalizar?`;
            }
            
          } catch (error) {
            console.error('❌ VIEW_CART - Erro geral:', error);
            return `Erro ao verificar carrinho. Vou tentar novamente!`;
          }

        case 'go_to_checkout':
          try {
            navigate('/checkout');
            return `Perfeito! Indo para o checkout!`;
          } catch (error) {
            return `Erro ao ir para checkout. Tenta clicar no carrinho!`;
          }

        case 'view_menu':
          const { restaurant_id: viewMenuId } = args;
          try {
            if (!viewMenuId) {
              return `Preciso do ID do restaurante!`;
            }
            
            navigate(`/menu/${viewMenuId}`);
            return `Trem bão! Abri o cardápio!`;
          } catch (error) {
            return `Erro ao abrir cardápio!`;
          }

        case 'clear_cart':
          try {
            await clearCart();
            return `Trem bão! Carrinho limpo!`;
          } catch (error) {
            return `Erro ao limpar carrinho!`;
          }

        case 'get_restaurant_info':
          const currentRestaurant = document.querySelector('[data-restaurant-id]');
          if (currentRestaurant) {
            const restaurantId = currentRestaurant.getAttribute('data-restaurant-id');
            const restaurantName = currentRestaurant.querySelector('h1, h2, .restaurant-name')?.textContent || 'Restaurante';
            return `Você tá no ${restaurantName}! Trem bão!`;
          }
          return `Não identifiquei o restaurante atual.`;

        case 'search_restaurants':
          const { cuisine_type, location } = args;
          const searchTerm = cuisine_type || '';
          navigate(`/?search=${encodeURIComponent(searchTerm)}`);
          return `Buscando ${cuisine_type || 'restaurantes'}...`;
          
        default:
          return `Função ${functionName} não reconhecida`;
      }
    } catch (error) {
      console.error('❌ Erro na função:', error);
      return `Deu erro, meu filho. Paciência!`;
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
          {/* Assistant indicator */}
          {detectedAssistant && (
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/10 text-primary">
                {detectedAssistant.assistant === 'Joana' ? '👩 Joana' : '👨 Marcos'} • {detectedAssistant.assistant}
              </Badge>
            </div>
          )}
          
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
                {detectedAssistant?.assistant || 'IA'} Falando
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