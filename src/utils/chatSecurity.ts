import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitização de conteúdo de chat para prevenir XSS
 */
export function sanitizeChatContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Configuração restritiva - apenas texto e alguns elementos básicos
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^$/  // Não permitir nenhuma URI
  });

  return cleanContent.trim();
}

/**
 * Validar URL de mídia para chat
 */
export function validateMediaUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL inválida' };
  }

  // Apenas URLs do Supabase Storage
  const supabaseStoragePattern = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/(public|sign)\/chat-media\//;
  
  if (!supabaseStoragePattern.test(url)) {
    return { 
      valid: false, 
      error: 'URL deve ser do Supabase Storage chat-media bucket' 
    };
  }

  return { valid: true };
}

/**
 * Validar tipo de arquivo para upload
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido: ${file.type}`
    };
  }

  // Limite de 5MB
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB (máx: 5MB)`
    };
  }

  return { valid: true };
}

/**
 * Gerar nome seguro para arquivo
 */
export function generateSecureFileName(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop() || 'bin';
  
  // Sanitizar extensão
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return `${userId}/${timestamp}-${random}.${safeExtension}`;
}

/**
 * Detectar e bloquear conteúdo potencialmente perigoso
 */
export function detectSuspiciousContent(content: string): { 
  suspicious: boolean; 
  reasons: string[] 
} {
  const reasons: string[] = [];
  
  // Padrões suspeitos
  const suspiciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /<script/i,
    /on\w+\s*=/i,  // event handlers
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /document\.(write|createElement)/i,
    /window\.(open|location)/i
  ];

  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      reasons.push(`Suspicious pattern ${index + 1} detected`);
    }
  });

  return {
    suspicious: reasons.length > 0,
    reasons
  };
}

/**
 * Rate limiting simples para upload de mídia
 */
class UploadRateLimit {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxUploads = 10; // máximo por usuário
  private readonly windowMs = 60 * 1000; // janela de 1 minuto

  checkLimit(userId: string): { allowed: boolean; remainingUploads: number } {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    
    // Limpar tentativas antigas
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentAttempts.length >= this.maxUploads) {
      return { allowed: false, remainingUploads: 0 };
    }

    // Registrar nova tentativa
    recentAttempts.push(now);
    this.attempts.set(userId, recentAttempts);

    return { 
      allowed: true, 
      remainingUploads: this.maxUploads - recentAttempts.length 
    };
  }
}

export const uploadRateLimit = new UploadRateLimit();