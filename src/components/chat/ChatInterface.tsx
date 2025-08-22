import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, MapPin, MoreVertical, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeChat, ChatMessage } from '@/hooks/useRealtimeChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  sanitizeChatContent, 
  detectSuspiciousContent,
  uploadRateLimit 
} from '@/utils/chatSecurity';
import { supabase } from '@/integrations/supabase/client';

interface ChatInterfaceProps {
  orderId?: string;
  threadId?: string;
  className?: string;
}

export function ChatInterface({ orderId, threadId, className }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    thread,
    isLoading,
    typingUsers,
    sendMessage,
    updateTypingStatus,
    markAsRead,
    uploadImage,
    reportMessage
  } = useRealtimeChat({ orderId, threadId });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!user) return;
    
    const unreadMessages = messages.filter(
      msg => msg.sender_id !== user.id && msg.status !== 'read'
    );
    
    unreadMessages.forEach(msg => markAsRead(msg.id));
  }, [messages, user, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // 🔒 Security: Sanitize message content
      const sanitizedContent = sanitizeChatContent(message.trim());
      
      // 🔒 Security: Detect suspicious content
      const suspiciousCheck = detectSuspiciousContent(sanitizedContent);
      if (suspiciousCheck.suspicious) {
        console.warn('🚨 Suspicious content detected:', suspiciousCheck.reasons);
        
        // Log security event to audit_logs
        await supabase.from('audit_logs').insert({
          table_name: 'chat_messages',
          operation: 'SUSPICIOUS_MESSAGE_BLOCKED',
          new_values: { 
            original_content: message.trim(),
            sanitized_content: sanitizedContent,
            reasons: suspiciousCheck.reasons,
            thread_id: threadId || orderId
          },
          user_id: user?.id
        });
        
        toast({
          title: 'Mensagem Bloqueada',
          description: 'Mensagem contém conteúdo não permitido. Por favor, reformule sua mensagem.',
          variant: 'destructive'
        });
        return;
      }

      if (!sanitizedContent) {
        toast({
          title: 'Erro',
          description: 'Mensagem inválida após sanitização.',
          variant: 'destructive'
        });
        return;
      }

      await sendMessage(sanitizedContent);
      setMessage('');
      updateTypingStatus(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive'
      });
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    
    if (value.trim()) {
      updateTypingStatus(true);
    } else {
      updateTypingStatus(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 🔒 Security: Check upload rate limit
    const rateLimitCheck = uploadRateLimit.checkLimit(user.id);
    if (!rateLimitCheck.allowed) {
      toast({
        title: 'Limite Excedido',
        description: 'Limite de upload excedido. Tente novamente em alguns minutos.',
        variant: 'destructive'
      });
      
      // Log security event
      await supabase.from('audit_logs').insert({
        table_name: 'chat_uploads',
        operation: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        new_values: { 
          file_name: file.name,
          file_size: file.size,
          remaining_uploads: rateLimitCheck.remainingUploads
        },
        user_id: user.id
      });
      
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'Imagem muito grande. Limite de 10MB.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Apenas imagens são permitidas.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await uploadImage(file);
      await sendMessage(imageUrl, 'image');
      
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a imagem',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Erro',
        description: 'Geolocalização não suportada',
        variant: 'destructive'
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'Localização atual'
      };

      await sendMessage(JSON.stringify(locationData), 'location');
      
      toast({
        title: 'Sucesso',
        description: 'Localização enviada!'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível obter sua localização',
        variant: 'destructive'
      });
    }
  };

  const handleReportMessage = async (messageId: string) => {
    try {
      await reportMessage(messageId, 'Conteúdo inapropriado');
      toast({
        title: 'Sucesso',
        description: 'Mensagem reportada com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível reportar a mensagem',
        variant: 'destructive'
      });
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isOwnMessage = msg.sender_id === user?.id;
    const timeAgo = formatDistanceToNow(new Date(msg.created_at), {
      addSuffix: true,
      locale: ptBR
    });

    return (
      <div
        key={msg.id}
        className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwnMessage && (
            <Avatar className="w-8 h-8 mr-2">
              <AvatarFallback>
                {msg.sender_id.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={`relative group ${isOwnMessage ? 'mr-2' : 'ml-0'}`}>
            <Card className={`p-3 ${
              isOwnMessage 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              {msg.message_type === 'text' && (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              
              {msg.message_type === 'image' && (
                <div className="space-y-2">
                  <img
                    src={msg.media_url}
                    alt="Imagem compartilhada"
                    className="max-w-full h-auto rounded"
                    loading="lazy"
                  />
                  {msg.content && (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              )}
              
              {msg.message_type === 'location' && msg.location_data && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">Localização compartilhada</p>
                    <p className="text-xs opacity-70">
                      {msg.location_data.address || `${msg.location_data.lat.toFixed(6)}, ${msg.location_data.lng.toFixed(6)}`}
                    </p>
                  </div>
                </div>
              )}
              
              {msg.message_type === 'system' && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    Sistema
                  </Badge>
                  <p className="text-sm">{msg.content}</p>
                </div>
              )}
            </Card>
            
            <div className={`flex items-center mt-1 space-x-2 ${
              isOwnMessage ? 'justify-end' : 'justify-start'
            }`}>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              
              {isOwnMessage && (
                <Badge
                  variant={msg.status === 'read' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {msg.status === 'sent' && 'Enviado'}
                  {msg.status === 'delivered' && 'Entregue'}
                  {msg.status === 'read' && 'Lido'}
                </Badge>
              )}
              
              {!isOwnMessage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleReportMessage(msg.id)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Reportar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando chat...</p>
        </div>
      </Card>
    );
  }

  if (!thread) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Chat não encontrado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col h-96 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Chat do Pedido</h3>
          <p className="text-sm text-muted-foreground">
            {typingUsers.length > 0 && `${typingUsers.length} pessoa(s) digitando...`}
          </p>
        </div>
        <Badge variant="outline">
          {thread.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Image className="w-4 h-4" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSendLocation}
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>

          <Input
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={isUploading}
          />

          <Button type="submit" size="sm" disabled={!message.trim() || isUploading}>
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </Card>
  );
}