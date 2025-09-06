import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GAMES-WEBSOCKET] ${step}${detailsStr}`);
};

// Gerenciamento de conexões ativas
const activeConnections = new Map<string, {
  socket: WebSocket;
  userId: string;
  matchId: string;
  lastPing: number;
}>();

const matchRooms = new Map<string, Set<string>>();

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// Broadcast para todos em uma sala
function broadcastToMatch(matchId: string, message: any, excludeConnectionId?: string) {
  const room = matchRooms.get(matchId);
  if (!room) return;
  
  room.forEach(connectionId => {
    if (connectionId === excludeConnectionId) return;
    
    const connection = activeConnections.get(connectionId);
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      try {
        connection.socket.send(JSON.stringify(message));
      } catch (error) {
        logStep("Error broadcasting message", { connectionId, error: error.message });
        // Remove conexão com erro
        cleanupConnection(connectionId);
      }
    }
  });
}

// Cleanup de conexão
function cleanupConnection(connectionId: string) {
  const connection = activeConnections.get(connectionId);
  if (connection) {
    const room = matchRooms.get(connection.matchId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        matchRooms.delete(connection.matchId);
      }
    }
    activeConnections.delete(connectionId);
    
    // Notificar outros jogadores sobre desconexão
    broadcastToMatch(connection.matchId, {
      type: 'player_disconnected',
      userId: connection.userId,
      timestamp: Date.now()
    });
  }
}

// Validar movimento do Jogo da Velha
function validateTicTacToeMove(gameState: any, position: number, userId: string): { valid: boolean; error?: string } {
  if (!gameState.board) {
    gameState.board = Array(9).fill(null);
    gameState.currentPlayer = gameState.players[0];
    gameState.turn = 0;
  }

  if (gameState.currentPlayer !== userId) {
    return { valid: false, error: 'Not your turn' };
  }

  if (position < 0 || position > 8) {
    return { valid: false, error: 'Invalid position' };
  }

  if (gameState.board[position] !== null) {
    return { valid: false, error: 'Position already occupied' };
  }

  return { valid: true };
}

// Verificar vitória no Jogo da Velha
function checkTicTacToeWinner(board: any[]): { winner: string | null; winningLine: number[] | null } {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
    [0, 4, 8], [2, 4, 6] // Diagonais
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: pattern };
    }
  }

  return { winner: null, winningLine: null };
}

// Processar ação do jogo
async function processGameAction(matchId: string, userId: string, action: any) {
  try {
    // Buscar estado atual da partida
    const { data: match, error: matchError } = await supabaseClient
      .from('game_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError) {
      throw new Error(`Failed to fetch match: ${matchError.message}`);
    }

    if (match.status !== 'LIVE') {
      throw new Error('Match is not live');
    }

    let newGameState = { ...match.game_state };
    let matchFinished = false;
    let winners: string[] = [];

    // Processar ação baseada no jogo
    switch (match.game) {
      case 'VELHA': {
        const { position } = action;
        
        const validation = validateTicTacToeMove(newGameState, position, userId);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Aplicar movimento
        const playerIndex = newGameState.players.indexOf(userId);
        const symbol = playerIndex === 0 ? 'X' : 'O';
        
        newGameState.board[position] = symbol;
        newGameState.turn++;
        
        // Verificar vitória
        const result = checkTicTacToeWinner(newGameState.board);
        if (result.winner) {
          newGameState.winner = result.winner === 'X' ? newGameState.players[0] : newGameState.players[1];
          newGameState.winningLine = result.winningLine;
          matchFinished = true;
          winners = [newGameState.winner];
        } else if (newGameState.turn >= 9) {
          // Empate
          newGameState.result = 'draw';
          matchFinished = true;
          winners = newGameState.players; // Empate = todos ganham
        } else {
          // Próximo jogador
          const nextPlayerIndex = (playerIndex + 1) % newGameState.players.length;
          newGameState.currentPlayer = newGameState.players[nextPlayerIndex];
        }
        
        break;
      }
      
      case 'DAMAS':
        // TODO: Implementar lógica das Damas
        break;
        
      case 'TRUCO':
        // TODO: Implementar lógica do Truco
        break;
        
      case 'SINUCA':
        // TODO: Implementar lógica da Sinuca
        break;
        
      default:
        throw new Error('Unsupported game type');
    }

    // Atualizar estado da partida
    const updateData: any = {
      game_state: newGameState,
      updated_at: new Date().toISOString()
    };

    if (matchFinished) {
      updateData.status = 'FINISHED';
      updateData.finished_at = new Date().toISOString();
      updateData.winner_user_ids = winners;
    }

    const { error: updateError } = await supabaseClient
      .from('game_matches')
      .update(updateData)
      .eq('id', matchId);

    if (updateError) {
      throw new Error(`Failed to update match: ${updateError.message}`);
    }

    // Registrar evento de auditoria
    const { data: auditLogs, error: auditCountError } = await supabaseClient
      .from('match_audit_log')
      .select('sequence_number')
      .eq('match_id', matchId)
      .order('sequence_number', { ascending: false })
      .limit(1);

    const nextSequence = (auditLogs && auditLogs.length > 0) ? auditLogs[0].sequence_number + 1 : 1;

    await supabaseClient
      .from('match_audit_log')
      .insert({
        match_id: matchId,
        user_id: userId,
        event_type: 'GAME_ACTION',
        event_data: {
          action,
          gameState: newGameState,
          timestamp: Date.now()
        },
        sequence_number: nextSequence
      });

    // Broadcast da atualização para todos os jogadores
    broadcastToMatch(matchId, {
      type: 'game_update',
      gameState: newGameState,
      action,
      userId,
      timestamp: Date.now()
    });

    // Se partida terminou, fazer settlement
    if (matchFinished) {
      setTimeout(async () => {
        await supabaseClient.functions.invoke('wallet-operations', {
          body: {
            operation: 'settle_match',
            matchId,
            winnerUserIds: winners,
            prizeMap: {},
            rake: match.rake_pct
          }
        });

        broadcastToMatch(matchId, {
          type: 'match_finished',
          winners,
          gameState: newGameState,
          timestamp: Date.now()
        });
      }, 1000); // Delay para permitir que a UI processe a vitória
    }

  } catch (error) {
    logStep("Error processing game action", { matchId, userId, error: error.message });
    throw error;
  }
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();
  
  logStep("WebSocket connection established", { connectionId });

  socket.onopen = () => {
    logStep("Socket opened", { connectionId });
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      logStep("Message received", { connectionId, type: message.type });

      switch (message.type) {
        case 'join_match': {
          const { matchId, userId, token } = message;
          
          // Verificar autenticação
          const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
          if (authError || userData.user?.id !== userId) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Authentication failed'
            }));
            return;
          }

          // Adicionar conexão ao gerenciamento
          activeConnections.set(connectionId, {
            socket,
            userId,
            matchId,
            lastPing: Date.now()
          });

          // Adicionar à sala
          if (!matchRooms.has(matchId)) {
            matchRooms.set(matchId, new Set());
          }
          matchRooms.get(matchId)!.add(connectionId);

          // Atualizar status de conexão do jogador
          await supabaseClient
            .from('match_players')
            .update({ is_connected: true })
            .eq('match_id', matchId)
            .eq('user_id', userId);

          // Notificar outros jogadores
          broadcastToMatch(matchId, {
            type: 'player_connected',
            userId,
            timestamp: Date.now()
          }, connectionId);

          // Enviar estado atual para o jogador
          const { data: match } = await supabaseClient
            .from('game_matches')
            .select(`
              *,
              match_players (*)
            `)
            .eq('id', matchId)
            .single();

          if (match) {
            socket.send(JSON.stringify({
              type: 'match_state',
              match,
              timestamp: Date.now()
            }));
          }

          break;
        }

        case 'game_action': {
          const connection = activeConnections.get(connectionId);
          if (!connection) {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Not connected to match'
            }));
            return;
          }

          await processGameAction(connection.matchId, connection.userId, message.action);
          break;
        }

        case 'chat_message': {
          const connection = activeConnections.get(connectionId);
          if (!connection) return;

          const { content } = message;
          
          // Broadcast mensagem de chat
          broadcastToMatch(connection.matchId, {
            type: 'chat_message',
            userId: connection.userId,
            content,
            timestamp: Date.now()
          });
          break;
        }

        case 'ready': {
          const connection = activeConnections.get(connectionId);
          if (!connection) return;

          // Atualizar status de pronto
          await supabaseClient
            .from('match_players')
            .update({ is_ready: true })
            .eq('match_id', connection.matchId)
            .eq('user_id', connection.userId);

          // Verificar se todos estão prontos
          const { data: players } = await supabaseClient
            .from('match_players')
            .select('*')
            .eq('match_id', connection.matchId);

          if (players && players.every(p => p.is_ready)) {
            // Iniciar partida
            const gameState = {
              players: players.map(p => p.user_id),
              startedAt: Date.now()
            };

            // Para Jogo da Velha, inicializar tabuleiro
            if (players.length === 2) {
              gameState.board = Array(9).fill(null);
              gameState.currentPlayer = gameState.players[0];
              gameState.turn = 0;
            }

            await supabaseClient
              .from('game_matches')
              .update({
                status: 'LIVE',
                game_state: gameState,
                started_at: new Date().toISOString()
              })
              .eq('id', connection.matchId);

            broadcastToMatch(connection.matchId, {
              type: 'match_started',
              gameState,
              timestamp: Date.now()
            });
          } else {
            broadcastToMatch(connection.matchId, {
              type: 'player_ready',
              userId: connection.userId,
              timestamp: Date.now()
            });
          }
          break;
        }

        case 'ping': {
          const connection = activeConnections.get(connectionId);
          if (connection) {
            connection.lastPing = Date.now();
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          break;
        }
      }

    } catch (error) {
      logStep("Error processing message", { connectionId, error: error.message });
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  };

  socket.onerror = (error) => {
    logStep("Socket error", { connectionId, error });
    cleanupConnection(connectionId);
  };

  socket.onclose = () => {
    logStep("Socket closed", { connectionId });
    cleanupConnection(connectionId);
  };

  return response;
});