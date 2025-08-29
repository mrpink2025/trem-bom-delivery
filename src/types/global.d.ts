declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'exception',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

export {};