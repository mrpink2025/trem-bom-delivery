import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Timer, MessageCircle, Crown, Circle } from 'lucide-react';

interface Piece {
  id: string;
  row: number;
  col: number;
  player: string;
  isKing: boolean;
}

interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
  captures?: { row: number; col: number }[];
}

interface GameState {
  players: string[];
  currentPlayer?: string;
  board?: (Piece | null)[][];
  pieces?: Piece[];
  gamePhase: 'waiting' | 'playing' | 'finished';
  winner?: string;
  capturedPieces?: { [key: string]: number };
  possibleMoves?: Move[];
}

interface DamasGameProps {
  gameState: GameState | null;
  isMyTurn: boolean;
  myPlayerId: string;
  onMove: (move: Move) => void;
  onSendMessage: (message: string) => void;
}

export const DamasGame: React.FC<DamasGameProps> = ({
  gameState,
  isMyTurn,
  myPlayerId,
  onMove,
  onSendMessage
}) => {
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [availableMoves, setAvailableMoves] = useState<Move[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  // Timer para o turno
  useEffect(() => {
    if (isMyTurn && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, timeLeft]);

  // Reset timer quando muda o turno
  useEffect(() => {
    if (isMyTurn) {
      setTimeLeft(30);
    }
  }, [isMyTurn]);

  // Calcular movimentos possíveis para a peça selecionada
  useEffect(() => {
    if (selectedPiece && gameState?.possibleMoves) {
      const moves = gameState.possibleMoves.filter(
        move => move.from.row === selectedPiece.row && move.from.col === selectedPiece.col
      );
      setAvailableMoves(moves);
    } else {
      setAvailableMoves([]);
    }
  }, [selectedPiece, gameState?.possibleMoves]);

  const handleSquareClick = (row: number, col: number) => {
    if (!isMyTurn || !gameState) return;

    const piece = gameState.board?.[row]?.[col];
    
    // Selecionar peça própria
    if (piece && piece.player === myPlayerId) {
      setSelectedPiece({ row, col });
      return;
    }

    // Mover peça selecionada
    if (selectedPiece) {
      const move = availableMoves.find(
        m => m.to.row === row && m.to.col === col
      );
      
      if (move) {
        onMove(move);
        setSelectedPiece(null);
      }
    }
  };

  const isSquareHighlighted = (row: number, col: number) => {
    if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
      return 'selected';
    }
    
    if (availableMoves.some(move => move.to.row === row && move.to.col === col)) {
      return 'available';
    }
    
    return null;
  };

  const renderPiece = (piece: Piece | null) => {
    if (!piece) return null;

    const isMyPiece = piece.player === myPlayerId;
    
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
          isMyPiece 
            ? 'bg-primary border-primary-foreground text-primary-foreground' 
            : 'bg-destructive border-destructive-foreground text-destructive-foreground'
        }`}
      >
        {piece.isKing ? (
          <Crown className="h-4 w-4" />
        ) : (
          <Circle className="h-4 w-4 fill-current" />
        )}
      </motion.div>
    );
  };

  if (!gameState || gameState.gamePhase === 'waiting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Aguardando jogadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant={isMyTurn ? 'default' : 'secondary'}>
              {isMyTurn ? 'Sua vez' : 'Aguardando...'}
            </Badge>
            
            <div className="text-sm text-muted-foreground">
              Damas - Regras Brasileiras
            </div>
          </div>
          
          {isMyTurn && (
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className={`font-mono ${timeLeft <= 5 ? 'text-destructive animate-pulse' : ''}`}>
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Placar */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {gameState.players.map(playerId => (
            <div key={playerId} className={`text-center p-3 rounded-lg ${
              playerId === gameState.currentPlayer ? 'bg-primary/10 border border-primary' : 'bg-muted'
            }`}>
              <div className="font-semibold">
                {playerId === myPlayerId ? 'Você' : 'Oponente'}
              </div>
              <div className="text-2xl font-bold text-primary">
                {gameState.pieces?.filter(p => p.player === playerId).length || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Peças restantes
              </div>
              <div className="text-sm font-medium">
                Capturas: {gameState.capturedPieces?.[playerId] || 0}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabuleiro */}
      <Card className="p-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">Tabuleiro de Damas</h3>
        </div>
        
        <div className="inline-block bg-amber-900 p-2 rounded-lg">
          <div className="grid grid-cols-8 gap-0 border border-amber-800">
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => {
                const isBlackSquare = (row + col) % 2 === 1;
                const piece = gameState.board?.[row]?.[col];
                const highlight = isSquareHighlighted(row, col);
                
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`
                      w-12 h-12 flex items-center justify-center cursor-pointer relative
                      ${isBlackSquare ? 'bg-amber-800' : 'bg-amber-100'}
                      ${highlight === 'selected' ? 'ring-2 ring-primary' : ''}
                      ${highlight === 'available' ? 'ring-2 ring-green-500' : ''}
                      hover:opacity-80 transition-opacity
                    `}
                    onClick={() => handleSquareClick(row, col)}
                  >
                    {renderPiece(piece)}
                    
                    {highlight === 'available' && (
                      <div className="absolute inset-0 bg-green-500/20 rounded-full m-1"></div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-4 text-sm text-muted-foreground text-center space-y-1">
          <p>Clique em uma peça para selecioná-la, depois clique no destino</p>
          <p>Capturas são obrigatórias quando possível</p>
          <p><Crown className="inline h-3 w-3" /> = Dama (pode mover em qualquer direção)</p>
        </div>
      </Card>

      {/* Chat */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-semibold">Chat</h3>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-3 py-2 border rounded-lg"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && chatMessage.trim()) {
                onSendMessage(chatMessage);
                setChatMessage('');
              }
            }}
          />
          <Button
            onClick={() => {
              if (chatMessage.trim()) {
                onSendMessage(chatMessage);
                setChatMessage('');
              }
            }}
            size="sm"
          >
            Enviar
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {['Boa jogada!', 'Excelente captura!', 'Que estratégia!', 'Próxima!'].map(msg => (
            <Button
              key={msg}
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(msg)}
            >
              {msg}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};