import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import SinucaTremBao from '@/components/SinucaTremBao';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const SinucaPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [gameEvents, setGameEvents] = useState<Array<{ type: string; data: any; timestamp: number }>>([]);

  // Extract URL parameters
  const gameConfig = useMemo(() => {
    const uid = searchParams.get('uid') || 'guest';
    const jwt = searchParams.get('jwt') || '';
    const sig = searchParams.get('sig') || '';
    const returnUrl = searchParams.get('returnUrl') || '';
    const logoUrl = searchParams.get('logoUrl') || '/assets/brand/trembao-logo-sinuca.png';
    const logoScale = Math.max(0, Math.min(1, parseFloat(searchParams.get('logoScale') || '0.6')));
    const logoOpacity = Math.max(0, Math.min(1, parseFloat(searchParams.get('logoOpacity') || '0.9')));
    const logoRotation = parseFloat(searchParams.get('logoRotation') || '0');
    const targetOrigin = searchParams.get('targetOrigin') || window.location.origin;

    return {
      uid,
      jwt,
      sig,
      returnUrl,
      logoUrl,
      logoScale,
      logoOpacity,
      logoRotation,
      targetOrigin
    };
  }, [searchParams]);

  // Game event handler
  const handleGameEvent = (eventType: string, payload: any) => {
    const event = {
      type: eventType,
      data: payload,
      timestamp: Date.now()
    };
    
    setGameEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
    console.log('🎱 Game Event Received:', event);
  };

  // Handle return URL
  const handleGoBack = () => {
    if (gameConfig.returnUrl) {
      window.location.href = gameConfig.returnUrl;
    } else {
      window.history.back();
    }
  };

  // Initialize heartbeat logging
  useEffect(() => {
    console.log('🎱 Sinuca Page initialized with config:', gameConfig);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-secondary/80">
      {/* Header with return button */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          onClick={handleGoBack}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 backdrop-blur"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 z-50 max-w-sm">
          <div className="bg-black/50 backdrop-blur text-white p-3 rounded text-xs">
            <div className="font-bold mb-2">🎱 Debug Events</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {gameEvents.slice(-5).map((event, index) => (
                <div key={index} className="truncate">
                  <span className="text-primary">{event.type}</span>
                  {event.data.power && <span> P:{event.data.power.toFixed(2)}</span>}
                  {event.data.winner && <span> W:{event.data.winner}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Game */}
      <SinucaTremBao 
        config={gameConfig}
        onGameEvent={handleGameEvent}
      />
    </div>
  );
};

export default SinucaPage;