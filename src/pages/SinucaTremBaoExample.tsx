import React from 'react';
import SinucaTremBao from '@/components/games/SinucaTremBao';

/**
 * Example page showing how to use the SinucaTremBao component
 */
const SinucaTremBaoExample: React.FC = () => {
  const handleGameEvent = (event: any) => {
    console.log('Game Event:', event);
    
    // Example: Send to analytics
    if (event.type === 'shot') {
      console.log('Player shot with power:', event.data.power);
    }
    
    if (event.type === 'frameEnd') {
      console.log('Game ended, winner:', event.data.winner);
    }
  };

  return (
    <div className="w-full h-screen">
      <SinucaTremBao
        // Integration parameters (optional)
        uid="user123"
        jwt="your-jwt-token"
        sig="signature"
        returnUrl="https://trembao.com.br/dashboard"
        
        // Logo customization (optional)
        logoUrl="/assets/brand/trembao-logo.png"
        logoScale={0.6}
        logoOpacity={0.85}
        logoRotation={0}
        
        // Event handler
        onGameEvent={handleGameEvent}
      />
    </div>
  );
};

export default SinucaTremBaoExample;