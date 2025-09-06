import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, MessageCircle, Flag, Users } from 'lucide-react';

interface TrucoCard {
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades';
  rank: string;
  value: number;
  isManilha?: boolean;
}

interface GameState {
  players: string[];
  currentPlayer?: string;
  turn?: number;
  board?: TrucoCard[];
  playerHands?: { [key: string]: TrucoCard[] };
  currentRound?: number;
  scores?: { [key: string]: number };
  trucoCalled?: boolean;
  trucoValue?: number;
  phase: 'waiting' | 'playing' | 'finished';
}

interface TrucoGameProps {
  gameState: GameState | null;
  isMyTurn: boolean;
  myPlayerId: string;
  onPlayCard: (card: TrucoCard) => void;
  onCallTruco: () => void;
  onAcceptTruco: () => void;
  onRun: () => void;
  onSendMessage: (message: string) => void;
}

export const TrucoGame: React.FC<TrucoGameProps> = ({
  gameState,
  isMyTurn,
  myPlayerId,
  onPlayCard,
  onCallTruco,
  onAcceptTruco,
  onRun,
  onSendMessage
}) => {
  const [selectedCard, setSelectedCard] = useState<TrucoCard | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(20);

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
      setTimeLeft(20);
    }
  }, [isMyTurn]);

  if (!gameState || gameState.phase === 'waiting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Aguardando jogadores...</p>
        </div>
      </div>
    );
  }

  const myHand = gameState.playerHands?.[myPlayerId] || [];
  const currentBoard = gameState.board || [];

  const renderCard = (card: TrucoCard, onClick?: () => void) => (
    <motion.div
      key={`${card.suit}-${card.rank}`}
      className={`relative bg-white border-2 rounded-lg p-3 cursor-pointer transition-all ${
        selectedCard === card ? 'border-primary shadow-lg transform -translate-y-2' : 'border-gray-300'
      } ${card.isManilha ? 'ring-2 ring-amber-400' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{ width: '60px', height: '85px' }}
    >
      <div className="text-center">
        <div className={`font-bold text-lg ${
          card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'
        }`}>
          {card.rank}
        </div>
        <div className="text-xl">
          {card.suit === 'clubs' && '♣'}
          {card.suit === 'diamonds' && '♦'}
          {card.suit === 'hearts' && '♥'}
          {card.suit === 'spades' && '♠'}
        </div>
      </div>
      {card.isManilha && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">M</span>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header com informações da partida */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant={gameState.trucoCalled ? 'destructive' : 'default'}>
              {gameState.trucoCalled ? `Truco ${gameState.trucoValue}!` : 'Rodada Normal'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Rodada {gameState.currentRound}/3
            </span>
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
                {playerId === myPlayerId ? 'Você' : `Jogador ${playerId.slice(0, 8)}`}
              </div>
              <div className="text-2xl font-bold text-primary">
                {gameState.scores?.[playerId] || 0}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mesa de jogo */}
      <Card className="p-6">
        <div className="text-center mb-4">
          <h3 className="font-semibold">Mesa de Jogo</h3>
        </div>
        
        <div className="flex justify-center space-x-4 min-h-[100px] items-center">
          <AnimatePresence>
            {currentBoard.map((card, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -180 }}
                transition={{ delay: index * 0.1 }}
              >
                {renderCard(card)}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {currentBoard.length === 0 && (
            <div className="text-muted-foreground">Aguardando jogadas...</div>
          )}
        </div>
      </Card>

      {/* Ações de Truco */}
      {gameState.trucoCalled && (
        <Card className="p-4 bg-destructive/5 border-destructive">
          <div className="text-center space-y-4">
            <div className="text-lg font-semibold">
              Truco {gameState.trucoValue} foi pedido!
            </div>
            <div className="flex justify-center space-x-4">
              <Button onClick={onAcceptTruco} variant="destructive">
                Aceitar
              </Button>
              <Button onClick={onRun} variant="outline">
                Correr
              </Button>
              {gameState.trucoValue < 12 && (
                <Button onClick={onCallTruco} variant="secondary">
                  Aumentar ({gameState.trucoValue === 3 ? 6 : gameState.trucoValue === 6 ? 9 : 12})
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Mão do jogador */}
      <Card className="p-4">
        <div className="text-center mb-4">
          <h3 className="font-semibold">Suas Cartas</h3>
        </div>
        
        <div className="flex justify-center space-x-2">
          {myHand.map(card => (
            renderCard(
              card,
              () => {
                if (isMyTurn) {
                  setSelectedCard(card);
                }
              }
            )
          ))}
        </div>

        {/* Ações do jogador */}
        <div className="flex justify-center space-x-4 mt-6">
          <Button
            onClick={() => selectedCard && onPlayCard(selectedCard)}
            disabled={!isMyTurn || !selectedCard}
          >
            Jogar Carta
          </Button>
          
          {!gameState.trucoCalled && isMyTurn && (
            <Button onClick={onCallTruco} variant="destructive">
              Pedir Truco!
            </Button>
          )}
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
        
        {/* Predefined messages for quick use */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['Boa jogada!', 'Vamos!', 'Que sorte!', 'Próxima!'].map(msg => (
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