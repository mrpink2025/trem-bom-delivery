import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Timer, Target, Zap, RotateCcw } from 'lucide-react';

// Extend Three.js materials for better pool ball materials

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wx: number;
  wy: number;
  color: string;
  number?: number;
  inPocket: boolean;
  type: 'SOLID' | 'STRIPE' | 'CUE' | 'EIGHT';
}

interface PoolGameState {
  balls: Ball[];
  turnUserId: string;
  players: Array<{
    userId: string;
    seat: number;
    connected: boolean;
    mmr: number;
    group?: 'SOLID' | 'STRIPE';
  }>;
  gamePhase: 'BREAK' | 'OPEN' | 'GROUPS_SET' | 'EIGHT_BALL';
  ballInHand?: boolean;
  shotClock?: number;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  winnerUserIds?: string[];
}

interface Pool3DGameProps {
  gameState: PoolGameState;
  isMyTurn: boolean;
  playerId: string;
  onShoot: (shot: { dir: number; power: number; spin: { sx: number; sy: number }; aimPoint: { x: number; y: number } }) => void;
  onPlaceCueBall: (x: number, y: number) => void;
  onSendMessage: (message: string) => void;
  messages: Array<{ userId: string; message: string; timestamp: number }>;
}

// Pool Ball Component with realistic materials and smooth animation
const PoolBall3D: React.FC<{ 
  ball: Ball; 
  scale?: number;
  onClick?: () => void;
}> = ({ ball, scale = 1, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [animationPosition, setAnimationPosition] = useState([ball.x, ball.y]);
  
  // Animate to new position smoothly
  useEffect(() => {
    setAnimationPosition([ball.x, ball.y]);
  }, [ball.x, ball.y]);
  
  // Convert 2D coordinates to 3D with smooth interpolation
  const position: [number, number, number] = useMemo(() => [
    (animationPosition[0] - 400) / 50, // Scale and center
    0.2, // Height above table
    -(animationPosition[1] - 200) / 50 // Invert Y and scale
  ], [animationPosition]);

  // Ball colors with realistic materials
  const ballMaterial = useMemo(() => {
    const baseColor = ball.color;
    return (
      <meshPhysicalMaterial
        color={baseColor}
        clearcoat={1}
        clearcoatRoughness={0.1}
        roughness={0.2}
        metalness={0.1}
        reflectivity={0.9}
      />
    );
  }, [ball.color]);

  // Smooth position animation
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smooth position interpolation
      const targetX = (ball.x - 400) / 50;
      const targetZ = -(ball.y - 200) / 50;
      const currentPos = meshRef.current.position;
      
      const lerpSpeed = 5; // Adjust for smoothness
      currentPos.x += (targetX - currentPos.x) * delta * lerpSpeed;
      currentPos.z += (targetZ - currentPos.z) * delta * lerpSpeed;
      
      // Add slight rolling animation when ball is moving
      if (ball.vx !== 0 || ball.vy !== 0) {
        meshRef.current.rotation.x += ball.vy * delta * 0.1;
        meshRef.current.rotation.z += ball.vx * delta * 0.1;
      }
    }
  });

  if (ball.inPocket) return null;

  return (
    <group>
      <mesh ref={meshRef} onClick={onClick} castShadow receiveShadow>
        <sphereGeometry args={[0.25 * scale, 32, 32]} />
        {ballMaterial}
      </mesh>
      
      {/* Ball number */}
      {ball.number !== undefined && ball.type !== 'CUE' && (
        <Text
          position={[position[0], position[1], position[2] + 0.26]}
          fontSize={0.15}
          color={ball.type === 'STRIPE' || ball.number === 8 ? '#FFFFFF' : '#000000'}
          anchorX="center"
          anchorY="middle"
        >
          {ball.number}
        </Text>
      )}
      
      {/* Stripe for stripe balls */}
      {ball.type === 'STRIPE' && ball.number !== 8 && (
        <mesh position={position}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 32]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            clearcoat={1}
            clearcoatRoughness={0.1}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
};

// Pool Table Component
const PoolTable3D: React.FC = () => {
  return (
    <group>
      {/* Table felt */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[16, 0.2, 8]} />
        <meshLambertMaterial color="#0F4C3A" />
      </mesh>
      
      {/* Table rails */}
      <group>
        {/* Long rails */}
        <mesh position={[0, 0.3, 4.1]} castShadow>
          <boxGeometry args={[16, 0.6, 0.2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 0.3, -4.1]} castShadow>
          <boxGeometry args={[16, 0.6, 0.2]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        
        {/* Short rails */}
        <mesh position={[8.1, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 8]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        <mesh position={[-8.1, 0.3, 0]} castShadow>
          <boxGeometry args={[0.2, 0.6, 8]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
      </group>
      
      {/* Pockets */}
      {[
        [-7.5, 0.1, -3.5], [-7.5, 0.1, 3.5],
        [0, 0.1, -3.8], [0, 0.1, 3.8],
        [7.5, 0.1, -3.5], [7.5, 0.1, 3.5]
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]}>
          <cylinderGeometry args={[0.4, 0.4, 0.2, 16]} />
          <meshLambertMaterial color="#000000" />
        </mesh>
      ))}
    </group>
  );
};

// Cue Stick Component
const CueStick: React.FC<{ 
  position: [number, number, number];
  rotation: [number, number, number];
  visible: boolean;
}> = ({ position, rotation, visible }) => {
  if (!visible) return null;
  
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.03, 3, 16]} />
        <meshLambertMaterial color="#D2691E" />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 16]} />
        <meshLambertMaterial color="#000000" />
      </mesh>
    </group>
  );
};

// Aiming Line Component
const AimingLine: React.FC<{ 
  start: [number, number, number];
  end: [number, number, number];
  visible: boolean;
}> = ({ start, end, visible }) => {
  if (!visible) return null;
  
  return (
    <mesh>
      <tubeGeometry args={[
        new THREE.CatmullRomCurve3([new THREE.Vector3(...start), new THREE.Vector3(...end)]),
        20,
        0.02,
        8,
        false
      ]} />
      <meshBasicMaterial color="#FFFF00" />
    </mesh>
  );
};

const Pool3DGame: React.FC<Pool3DGameProps> = ({
  gameState,
  isMyTurn,
  playerId,
  onShoot,
  onPlaceCueBall,
  onSendMessage,
  messages
}) => {
  const { toast } = useToast();
  
  // Game controls state
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0.5);
  const [spin, setSpin] = useState({ sx: 0, sy: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [cameraMode, setCameraMode] = useState<'overhead' | 'side' | 'player'>('overhead');

  // Get current player info
  const currentPlayer = gameState.players.find(p => p.userId === playerId);
  const opponent = gameState.players.find(p => p.userId !== playerId);

  // Find cue ball
  const cueBall = gameState.balls.find(b => b.type === 'CUE' && !b.inPocket);

  // Calculate cue stick position and rotation
  const cueStickProps = useMemo(() => {
    if (!cueBall || !isMyTurn || gameState.ballInHand) {
      return { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], visible: false };
    }

    const cuePosX = (cueBall.x - 400) / 50;
    const cuePosZ = -(cueBall.y - 200) / 50;
    const distance = 1.5 + (power * 2);
    
    const stickX = cuePosX - Math.cos(aimAngle) * distance;
    const stickZ = cuePosZ + Math.sin(aimAngle) * distance;
    
    return {
      position: [stickX, 0.5, stickZ] as [number, number, number],
      rotation: [0, -aimAngle + Math.PI/2, Math.PI/4] as [number, number, number],
      visible: isAiming
    };
  }, [cueBall, isMyTurn, gameState.ballInHand, aimAngle, power, isAiming]);

  // Calculate aiming line
  const aimingLineProps = useMemo(() => {
    if (!cueBall || !isMyTurn || gameState.ballInHand || !isAiming) {
      return { start: [0, 0, 0] as [number, number, number], end: [0, 0, 0] as [number, number, number], visible: false };
    }

    const cuePosX = (cueBall.x - 400) / 50;
    const cuePosZ = -(cueBall.y - 200) / 50;
    const aimLength = 2 + (power * 2);
    
    const endX = cuePosX + Math.cos(aimAngle) * aimLength;
    const endZ = cuePosZ - Math.sin(aimAngle) * aimLength;
    
    return {
      start: [cuePosX, 0.2, cuePosZ] as [number, number, number],
      end: [endX, 0.2, endZ] as [number, number, number],
      visible: true
    };
  }, [cueBall, isMyTurn, gameState.ballInHand, isAiming, aimAngle, power]);

  // Handle shot execution
  const handleShoot = () => {
    console.log('🎱 [Pool3DGame] handleShoot called', { isMyTurn, ballInHand: gameState.ballInHand });
    
    if (!isMyTurn || gameState.ballInHand) {
      console.log('🎱 [Pool3DGame] Shot blocked - not my turn or ball in hand');
      return;
    }
    
    if (!cueBall) {
      console.log('🎱 [Pool3DGame] No cue ball found');
      return;
    }
    
    const shotData = {
      dir: aimAngle,
      power: power,
      spin: spin,
      aimPoint: { x: cueBall.x, y: cueBall.y }
    };
    
    console.log('🎱 [Pool3DGame] Executing shot:', shotData);
    
    onShoot(shotData);
    
    setIsAiming(false);
    toast({ title: "Tacada executada!", description: "Aguarde o resultado da simulação" });
  };

  // Send chat message
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      onSendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  // Get remaining balls for each player
  const getRemainingBalls = (group?: 'SOLID' | 'STRIPE') => {
    if (!group) return [];
    return gameState.balls.filter(ball => ball.type === group && !ball.inPocket);
  };

  // Handle cue ball placement
  const handleTableClick = (event: any) => {
    if (!gameState.ballInHand || !isMyTurn) return;
    
    const intersections = event.intersections;
    if (!intersections || intersections.length === 0) return;
    
    const point = intersections[0].point;
    if (!point) return;
    
    // Convert 3D coordinates back to 2D
    const clickX = (point.x * 50) + 400;
    const clickY = (-point.z * 50) + 200;
    
    // Validate position
    const isValidPosition = gameState.balls.every(ball => {
      if (ball.type === 'CUE' || ball.inPocket) return true;
      const dx = clickX - ball.x;
      const dy = clickY - ball.y;
      return Math.sqrt(dx * dx + dy * dy) > 25;
    });
    
    if (isValidPosition && clickX > 20 && clickX < 780 && clickY > 20 && clickY < 380) {
      onPlaceCueBall(clickX, clickY);
      toast({ title: "Bola posicionada", description: "Agora você pode fazer sua tacada" });
    } else {
      toast({ 
        title: "Posição inválida", 
        description: "Escolha uma posição válida para a bola branca",
        variant: "destructive"
      });
    }
  };

  // Mouse controls for aiming
  const handlePointerMove = (event: any) => {
    if (!isMyTurn || gameState.ballInHand || !cueBall) return;
    
    const intersections = event.intersections;
    if (!intersections || intersections.length === 0) return;
    
    const point = intersections[0].point;
    if (!point) return;
    
    const cuePosX = (cueBall.x - 400) / 50;
    const cuePosZ = -(cueBall.y - 200) / 50;
    
    const angle = Math.atan2(point.z - cuePosZ, point.x - cuePosX);
    setAimAngle(angle);
    setIsAiming(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background">
      {/* Game Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant={isMyTurn ? "default" : "secondary"}>
              {isMyTurn ? "Sua vez" : "Vez do oponente"}
            </Badge>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>{gameState.shotClock || 30}s</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={cameraMode === 'overhead' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCameraMode('overhead')}
            >
              Vista Superior
            </Button>
            <Button
              variant={cameraMode === 'side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCameraMode('side')}
            >
              Vista Lateral
            </Button>
            <Button
              variant={cameraMode === 'player' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCameraMode('player')}
            >
              Vista do Jogador
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Fase: {gameState.gamePhase === 'BREAK' ? 'Quebra' : 
                   gameState.gamePhase === 'OPEN' ? 'Grupos em aberto' :
                   gameState.gamePhase === 'GROUPS_SET' ? 'Grupos definidos' : 'Bola 8'}
          </div>
        </div>
      </Card>
      
      {/* Players Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Você {currentPlayer?.group && `(${currentPlayer.group})`}</h3>
          <div className="flex gap-1 flex-wrap">
            {getRemainingBalls(currentPlayer?.group).map(ball => (
              <div 
                key={ball.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: ball.color, color: ball.type === 'STRIPE' ? '#000' : '#fff' }}
              >
                {ball.number}
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-3">
          <h3 className="font-semibold text-sm mb-2">Oponente {opponent?.group && `(${opponent.group})`}</h3>
          <div className="flex gap-1 flex-wrap">
            {getRemainingBalls(opponent?.group).map(ball => (
              <div 
                key={ball.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: ball.color, color: ball.type === 'STRIPE' ? '#000' : '#fff' }}
              >
                {ball.number}
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* 3D Game Scene */}
      <Card className="p-4">
        <div className="h-96 w-full">
          <Canvas
            shadows
            camera={{ 
              position: cameraMode === 'overhead' ? [0, 12, 0] :
                       cameraMode === 'side' ? [15, 5, 0] :
                       cueBall ? [(cueBall.x - 400) / 50 - 3, 2, -(cueBall.y - 200) / 50 + 2] : [0, 5, 5],
              fov: 50 
            }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={1} 
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[0, 5, 0]} intensity={0.5} />
            
            {/* Pool Table */}
            <PoolTable3D />
            
            {/* Pool Balls */}
            {gameState.balls.map(ball => (
              <PoolBall3D key={ball.id} ball={ball} />
            ))}
            
            {/* Cue Stick */}
            <CueStick {...cueStickProps} />
            
            {/* Aiming Line */}
            <AimingLine {...aimingLineProps} />
            
            {/* Interactive table surface for aiming and ball placement */}
            <mesh
              position={[0, 0.11, 0]}
              onPointerMove={handlePointerMove}
              onClick={handleTableClick}
            >
              <boxGeometry args={[16, 0.01, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            
            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              maxPolarAngle={Math.PI / 2}
              minDistance={5}
              maxDistance={20}
            />
            <Environment preset="warehouse" />
            <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={20} blur={2} far={4} />
          </Canvas>
        </div>
        
        {gameState.ballInHand && isMyTurn && (
          <div className="mt-2 text-sm text-center text-muted-foreground">
            Clique na mesa para posicionar a bola branca
          </div>
        )}
      </Card>
      
      {/* Controls */}
      {isMyTurn && !gameState.ballInHand && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Power Control */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Força: {Math.round(power * 100)}%
              </label>
              <Slider
                value={[power]}
                onValueChange={(value) => setPower(value[0])}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
            
            {/* Spin Control */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Efeito
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs">Horizontal</label>
                  <Slider
                    value={[spin.sx]}
                    onValueChange={(value) => setSpin(prev => ({ ...prev, sx: value[0] }))}
                    min={-1}
                    max={1}
                    step={0.1}
                  />
                </div>
                <div>
                  <label className="text-xs">Vertical</label>
                  <Slider
                    value={[spin.sy]}
                    onValueChange={(value) => setSpin(prev => ({ ...prev, sy: value[0] }))}
                    min={-1}
                    max={1}
                    step={0.1}
                  />
                </div>
              </div>
            </div>
            
            {/* Shoot Button */}
            <Button 
              onClick={handleShoot}
              disabled={!isAiming}
              className="w-full"
              size="lg"
            >
              <Target className="w-4 h-4 mr-2" />
              Executar Tacada
            </Button>
          </div>
        </Card>
      )}
      
      {/* Chat */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2">Chat da Partida</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
          {messages.slice(-5).map((msg, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{msg.userId === playerId ? 'Você' : 'Oponente'}: </span>
              <span className="text-muted-foreground">{msg.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} size="sm">
            Enviar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Pool3DGame;