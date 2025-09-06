import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Clock, Trophy, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface GameMatch {
  id: string;
  game: string;
  buy_in: number;
  status: string;
}

interface GameState {
  players: string[];
  board?: (string | null)[];
  currentPlayer?: string;
  turn?: number;
  winner?: string;
  result?: string;
  winningLine?: number[];
}

interface TicTacToeGameProps {
  match: GameMatch;
  gameState: GameState | null;
  onAction: (action: any) => void;
  isConnected: boolean;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({
  match,
  gameState,
  onAction,
  isConnected
}) => {
  const { user } = useAuth();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState(30);

  const isMyTurn = gameState?.currentPlayer === user?.id;
  const mySymbol = gameState?.players?.[0] === user?.id ? 'X' : 'O';
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const board = gameState?.board || Array(9).fill(null);

  // Timer do turno
  useEffect(() => {
    if (!isMyTurn || !gameState || gameState.winner || gameState.result) return;

    const timer = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // Tempo esgotado, jogar automaticamente na primeira posição livre
          const emptyIndex = board.findIndex(cell => cell === null);
          if (emptyIndex !== -1) {
            handleCellClick(emptyIndex);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, gameState, board]);

  // Resetar timer quando mudar o turno
  useEffect(() => {
    setTurnTimer(30);
  }, [gameState?.currentPlayer]);

  const handleCellClick = (position: number) => {
    if (!isMyTurn || board[position] !== null || !isConnected) return;

    setSelectedCell(position);
    onAction({ position });
  };

  const getPlayerName = (playerId: string) => {
    return playerId === user?.id ? 'Você' : 'Oponente';
  };

  const getCellContent = (index: number) => {
    const value = board[index];
    if (!value) return '';
    
    return (
      <motion.div
        initial={{ scale: 0, rotate: 180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "text-4xl font-bold",
          value === mySymbol ? "text-primary" : "text-secondary"
        )}
      >
        {value}
      </motion.div>
    );
  };

  const isWinningCell = (index: number) => {
    return gameState?.winningLine?.includes(index);
  };

  const getGameStatus = () => {
    if (!gameState) return 'Aguardando início...';
    
    if (gameState.winner) {
      if (gameState.winner === user?.id) {
        return '🎉 Você venceu!';
      } else {
        return '💔 Você perdeu!';
      }
    }
    
    if (gameState.result === 'draw') {
      return '🤝 Empate!';
    }
    
    if (isMyTurn) {
      return '🎯 Sua vez de jogar';
    } else {
      return '⏳ Aguardando oponente...';
    }
  };

  const getStatusColor = () => {
    if (!gameState) return 'text-muted-foreground';
    
    if (gameState.winner === user?.id) return 'text-green-600';
    if (gameState.winner && gameState.winner !== user?.id) return 'text-red-600';
    if (gameState.result === 'draw') return 'text-yellow-600';
    if (isMyTurn) return 'text-primary';
    
    return 'text-muted-foreground';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status da partida */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-full">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Jogo da Velha</h2>
              <p className="text-sm text-muted-foreground">
                Partida #{match.id.slice(-8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
            <div className="flex items-center gap-1 text-sm">
              <Trophy className="w-4 h-4 text-yellow-500" />
              {match.buy_in * 2} créditos
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Jogadores */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Jogadores
            </h3>
            {gameState?.players?.map((playerId, index) => (
              <div 
                key={playerId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  playerId === user?.id ? 'bg-primary/10' : 'bg-muted/50',
                  gameState.currentPlayer === playerId && 'ring-2 ring-primary/50'
                )}
              >
                <span className="font-medium">
                  {getPlayerName(playerId)} ({index === 0 ? 'X' : 'O'})
                </span>
                {gameState.currentPlayer === playerId && (
                  <Badge>Vez</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Status da Partida
            </h3>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className={cn("text-center font-semibold", getStatusColor())}>
                {getGameStatus()}
              </p>
              
              {/* Timer do turno */}
              {isMyTurn && !gameState?.winner && !gameState?.result && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Tempo restante:</span>
                    <span className="font-mono">{turnTimer}s</span>
                  </div>
                  <Progress value={(turnTimer / 30) * 100} />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabuleiro */}
      <Card className="p-6">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-2 aspect-square">
            {board.map((cell, index) => (
              <motion.button
                key={index}
                whileHover={!cell && isMyTurn && isConnected ? { scale: 1.05 } : {}}
                whileTap={!cell && isMyTurn && isConnected ? { scale: 0.95 } : {}}
                onClick={() => handleCellClick(index)}
                disabled={!isMyTurn || !!cell || !isConnected || !!gameState?.winner || !!gameState?.result}
                className={cn(
                  "aspect-square border-2 rounded-lg flex items-center justify-center",
                  "transition-all duration-200",
                  !cell && isMyTurn && isConnected 
                    ? "border-primary/50 hover:border-primary hover:bg-primary/5 cursor-pointer" 
                    : "border-muted",
                  isWinningCell(index) && "bg-green-100 dark:bg-green-900/20 border-green-500",
                  selectedCell === index && "ring-2 ring-primary"
                )}
              >
                {getCellContent(index)}
              </motion.button>
            ))}
          </div>
          
          {/* Indicações visuais */}
          <div className="mt-4 text-center space-y-2">
            {!isConnected && (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Conexão perdida</span>
              </div>
            )}
            
            {isMyTurn && isConnected && !gameState?.winner && !gameState?.result && (
              <p className="text-sm text-primary">
                Clique em uma casa vazia para jogar
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Controles da partida */}
      {(!gameState?.winner && !gameState?.result) && (
        <Card className="p-4">
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              disabled={!isConnected}
            >
              Abandonar Partida
            </Button>
          </div>
        </Card>
      )}

      {/* Resultado final */}
      <AnimatePresence>
        {(gameState?.winner || gameState?.result === 'draw') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <div className="text-6xl">
                  {gameState.winner === user?.id 
                    ? '🏆' 
                    : gameState.result === 'draw' 
                    ? '🤝' 
                    : '💔'
                  }
                </div>
                
                <h3 className="text-2xl font-bold">
                  {gameState.winner === user?.id 
                    ? 'Parabéns! Você venceu!' 
                    : gameState.result === 'draw' 
                    ? 'Empate!' 
                    : 'Que pena! Você perdeu!'
                  }
                </h3>
                
                <p className="text-muted-foreground">
                  {gameState.winner === user?.id 
                    ? `Você ganhou ${match.buy_in * 1.9} créditos!` 
                    : gameState.result === 'draw' 
                    ? 'Os créditos foram devolvidos para ambos os jogadores' 
                    : 'Melhor sorte na próxima vez!'
                  }
                </p>
                
                <div className="flex gap-4 justify-center">
                  <Button variant="outline">
                    Voltar ao Lobby
                  </Button>
                  <Button>
                    Nova Partida
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};