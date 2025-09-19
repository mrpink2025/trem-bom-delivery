import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

interface PoolDebugPanelProps {
  matchId: string;
  wsConnected: boolean;
  gameState: any;
  frames: any[];
  onTestShot: () => void;
}

export const PoolDebugPanel: React.FC<PoolDebugPanelProps> = ({
  matchId,
  wsConnected,
  gameState,
  frames,
  onTestShot
}) => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testPhysics = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('pool-game-action', {
        body: {
          type: 'SHOOT',
          matchId,
          dir: 0,
          power: 0.5,
          spin: { sx: 0, sy: 0 }
        }
      });
      
      setTestResults({ data, error, success: !error });
      console.log('🧪 [DebugPanel] Physics test result:', { data, error });
    } catch (error) {
      console.error('🧪 [DebugPanel] Physics test failed:', error);
      setTestResults({ error, success: false });
    } finally {
      setTesting(false);
    }
  };

  const testAnimation = () => {
    // Create mock animation frames for testing
    const mockFrames = [
      { t: 0, balls: [{ id: 0, x: 100, y: 100, vx: 5, vy: 0 }], sounds: [] },
      { t: 16, balls: [{ id: 0, x: 105, y: 100, vx: 4, vy: 0 }], sounds: [] },
      { t: 32, balls: [{ id: 0, x: 109, y: 100, vx: 3, vy: 0 }], sounds: [] },
      { t: 48, balls: [{ id: 0, x: 112, y: 100, vx: 0, vy: 0 }], sounds: [] }
    ];
    
    console.log('🧪 [DebugPanel] Testing animation with mock frames:', mockFrames);
    // This would trigger the animation system
    onTestShot();
  };

  return (
    <Card className="mt-4 bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm">Debug Panel</CardTitle>
        <CardDescription>Diagnóstico da sinuca</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold">WebSocket:</span>
            <Badge variant={wsConnected ? "default" : "destructive"} className="ml-2">
              {wsConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          <div>
            <span className="font-semibold">Match ID:</span>
            <span className="ml-2 font-mono text-xs">{matchId.slice(-8)}</span>
          </div>
          <div>
            <span className="font-semibold">Frames:</span>
            <Badge variant="outline" className="ml-2">{frames.length}</Badge>
          </div>
          <div>
            <span className="font-semibold">Balls:</span>
            <Badge variant="outline" className="ml-2">{gameState?.balls?.length || 0}</Badge>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testPhysics}
              disabled={testing}
            >
              {testing ? 'Testando...' : 'Testar Física'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={testAnimation}
            >
              Testar Animação
            </Button>
          </div>
          
          {testResults && (
            <div className="p-2 rounded bg-muted text-xs">
              <div className="flex items-center gap-2">
                <Badge variant={testResults.success ? "default" : "destructive"}>
                  {testResults.success ? "Sucesso" : "Erro"}
                </Badge>
                <span>Teste de física</span>
              </div>
              {testResults.error && (
                <pre className="mt-1 text-red-600">{JSON.stringify(testResults.error, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          <div><strong>Estado atual:</strong></div>
          <div>• Turno: {gameState?.turnUserId?.slice(-8) || 'N/A'}</div>
          <div>• Fase: {gameState?.phase || 'N/A'}</div>
          <div>• Ball in Hand: {gameState?.ballInHand ? 'Sim' : 'Não'}</div>
        </div>
      </CardContent>
    </Card>
  );
};