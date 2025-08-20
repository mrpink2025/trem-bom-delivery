import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { isNativeApp, getPlatform } from '@/capacitor';
import { Smartphone, Globe, Monitor } from 'lucide-react';

export const PlatformInfo = () => {
  const [platform, setPlatform] = useState<string>('web');
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());
    setPlatform(getPlatform());
  }, []);

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="w-3 h-3" />;
      case 'web':
        return <Globe className="w-3 h-3" />;
      default:
        return <Monitor className="w-3 h-3" />;
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'ios':
        return 'iOS App';
      case 'android':
        return 'Android App';
      case 'web':
        return 'Web App';
      default:
        return 'Desktop App';
    }
  };

  // Only show in development or when explicitly needed
  if (process.env.NODE_ENV === 'production' && !window.location.search.includes('showPlatformInfo')) {
    return null;
  }

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <Badge 
        variant={isNative ? 'default' : 'secondary'} 
        className="flex items-center gap-1 text-xs"
      >
        {getPlatformIcon()}
        {getPlatformName()}
      </Badge>
    </div>
  );
};