// Production-ready logging system
const isDevelopment = import.meta.env.DEV;

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, error || '');
    
    // In production, could send to error tracking service
    if (!isDevelopment && typeof window !== 'undefined') {
      // Example: Send to error tracking service
      // trackError(message, error);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }
};