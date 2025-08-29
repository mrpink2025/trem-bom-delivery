import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  WifiOff
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const VoiceAssistant: React.FC = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const chatRef = useRef<RealtimeAIChat | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

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
      
      chatRef.current = new RealtimeAIChat(handleAIMessage, handleConnectionChange);
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with connection status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">Assistente de Voz IA</h2>
                <div className="flex items-center gap-2">
                  {getConnectionStatusIcon()}
                  <span className="text-sm text-muted-foreground">
                    {getConnectionStatusText()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isRecording && (
                <Badge variant="secondary" className="animate-pulse">
                  <Mic className="w-3 h-3 mr-1" />
                  Ouvindo
                </Badge>
              )}
              
              {isSpeaking && (
                <Badge variant="secondary" className="animate-pulse">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Falando
                </Badge>
              )}
              
              {connectionStatus === 'connected' ? (
                <Button 
                  onClick={endConversation}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  Encerrar
                </Button>
              ) : (
                <Button 
                  onClick={startConversation}
                  disabled={connectionStatus === 'connecting'}
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  {connectionStatus === 'connecting' ? 'Conectando...' : 'Iniciar Conversa'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="min-h-96">
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Inicie uma conversa para começar</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Show current AI response being generated */}
            {currentTranscript && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-muted mr-4 opacity-70">
                  <p className="text-sm">{currentTranscript}...</p>
                  <p className="text-xs opacity-70 mt-1">Digitando...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Perguntas Rápidas:</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTextMessage("Qual o status do meu pedido?")}
              >
                Status do Pedido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTextMessage("Recomende um restaurante bom")}
              >
                Recomendar Restaurante
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTextMessage("Quanto tempo vai demorar a entrega?")}
              >
                Tempo de Entrega
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendTextMessage("Preciso de ajuda com um problema")}
              >
                Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};