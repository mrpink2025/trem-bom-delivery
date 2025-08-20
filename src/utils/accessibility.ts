// Accessibility utilities

export const preventDoubleClick = (callback: () => void) => {
  let isProcessing = false;
  
  return () => {
    if (isProcessing) return;
    
    isProcessing = true;
    callback();
    
    // Reset after 1 second to prevent accidental double clicks
    setTimeout(() => {
      isProcessing = false;
    }, 1000);
  };
};

export const addLoadingState = (element: HTMLElement, loading: boolean) => {
  if (loading) {
    element.setAttribute('aria-busy', 'true');
    element.setAttribute('aria-disabled', 'true');
  } else {
    element.removeAttribute('aria-busy');
    element.removeAttribute('aria-disabled');
  }
};

export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};