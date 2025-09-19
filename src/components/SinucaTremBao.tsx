import React from 'react';
import ProfessionalPoolGame from './ProfessionalPoolGame';

interface GameConfig {
  uid?: string;
  logoUrl?: string;
  logoScale?: number;
  logoOpacity?: number;
  logoRotation?: number;
  targetOrigin?: string;
}

interface SinucaTremBaoProps {
  config?: GameConfig;
  onGameEvent?: (eventType: string, payload: any) => void;
}

const SinucaTremBao: React.FC<SinucaTremBaoProps> = ({ 
  config = {}, 
  onGameEvent 
}) => {
  // Game config with defaults
  const gameConfig = {
    uid: config.uid || 'guest',
    logoUrl: config.logoUrl || '/assets/brand/trembao-logo-sinuca.png',
    logoScale: Math.max(0, Math.min(1, config.logoScale || 0.6)),
    logoOpacity: Math.max(0, Math.min(1, config.logoOpacity || 0.3)),
    logoRotation: config.logoRotation || 0,
    targetOrigin: config.targetOrigin || window.location.origin
  };

  // Event emitter
  const handleGameEvent = (eventType: string, payload: any = {}) => {
    const eventData = {
      uid: gameConfig.uid,
      ts: Date.now(),
      ...payload
    };
    
    if (onGameEvent) {
      onGameEvent(eventType, eventData);
    }
    
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'sinuca-' + eventType,
        ...eventData
      }, gameConfig.targetOrigin);
    }
    
    console.log('🎱 Event:', eventType, eventData);
  };

  return (
    <ProfessionalPoolGame 
      config={gameConfig}
      onGameEvent={handleGameEvent}
    />
  );
};

export default SinucaTremBao;