import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GAME-MATCHING] ${step}${detailsStr}`);
};

const generateRngSeed = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id });

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_match': {
        const { game, mode, buyIn } = params;
        
        logStep("Creating match", { game, mode, buyIn });

        // Verificar saldo disponível
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .select('balance, locked_balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          throw new Error('Wallet not found');
        }

        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.locked_balance);
        if (availableBalance < parseFloat(buyIn)) {
          throw new Error('Insufficient balance');
        }

        // Determinar número máximo de jogadores por jogo
        const maxPlayersMap = {
          'TRUCO': mode === 'RANKED' ? 2 : 4, // 1v1 para ranked, 2v2 para casual
          'SINUCA': 2,
          'DAMAS': 2,
          'VELHA': 2
        };

        const maxPlayers = maxPlayersMap[game as keyof typeof maxPlayersMap] || 2;

        // Criar partida
        const { data: match, error: matchError } = await supabaseClient
          .from('game_matches')
          .insert({
            game,
            mode,
            buy_in: parseFloat(buyIn),
            max_players: maxPlayers,
            current_players: 1,
            rng_seed: generateRngSeed(),
            created_by: user.id,
            status: 'LOBBY'
          })
          .select()
          .single();

        if (matchError) {
          throw new Error(`Failed to create match: ${matchError.message}`);
        }

        // Adicionar criador como jogador
        const { error: playerError } = await supabaseClient
          .from('match_players')
          .insert({
            match_id: match.id,
            user_id: user.id,
            seat_number: 1,
            is_ready: false
          });

        if (playerError) {
          throw new Error(`Failed to add player to match: ${playerError.message}`);
        }

        // Reservar créditos do criador
        await supabaseClient.functions.invoke('wallet-operations', {
          body: {
            operation: 'reserve_credits',
            amount: buyIn,
            matchId: match.id,
            reason: 'BUY_IN'
          },
          headers: { Authorization: authHeader }
        });

        logStep("Match created successfully", { matchId: match.id });

        return new Response(JSON.stringify({
          success: true,
          match: {
            ...match,
            players: [{
              user_id: user.id,
              seat_number: 1,
              is_ready: false,
              is_connected: true
            }]
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'join_match': {
        const { matchId } = params;
        
        logStep("Joining match", { matchId, userId: user.id });

        // Buscar partida
        const { data: match, error: matchError } = await supabaseClient
          .from('game_matches')
          .select(`
            *,
            match_players (*)
          `)
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Match not found: ${matchError.message}`);
        }

        if (match.status !== 'LOBBY') {
          throw new Error('Match is not in lobby state');
        }

        if (match.current_players >= match.max_players) {
          throw new Error('Match is full');
        }

        // Verificar se usuário já está na partida
        const isAlreadyInMatch = match.match_players.some((p: any) => p.user_id === user.id);
        if (isAlreadyInMatch) {
          throw new Error('Already in this match');
        }

        // Verificar saldo disponível
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .select('balance, locked_balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          throw new Error('Wallet not found');
        }

        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.locked_balance);
        if (availableBalance < parseFloat(match.buy_in)) {
          throw new Error('Insufficient balance');
        }

        // Encontrar próximo assento disponível
        const occupiedSeats = match.match_players.map((p: any) => p.seat_number);
        let nextSeat = 1;
        while (occupiedSeats.includes(nextSeat)) {
          nextSeat++;
        }

        // Adicionar jogador à partida
        const { error: playerError } = await supabaseClient
          .from('match_players')
          .insert({
            match_id: matchId,
            user_id: user.id,
            seat_number: nextSeat,
            is_ready: false
          });

        if (playerError) {
          throw new Error(`Failed to join match: ${playerError.message}`);
        }

        // Atualizar contador de jogadores
        const { error: updateError } = await supabaseClient
          .from('game_matches')
          .update({ 
            current_players: match.current_players + 1 
          })
          .eq('id', matchId);

        if (updateError) {
          throw new Error(`Failed to update match: ${updateError.message}`);
        }

        // Reservar créditos
        await supabaseClient.functions.invoke('wallet-operations', {
          body: {
            operation: 'reserve_credits',
            amount: match.buy_in,
            matchId: matchId,
            reason: 'BUY_IN'
          },
          headers: { Authorization: authHeader }
        });

        logStep("Joined match successfully");

        return new Response(JSON.stringify({
          success: true,
          seatNumber: nextSeat
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'leave_match': {
        const { matchId } = params;
        
        logStep("Leaving match", { matchId, userId: user.id });

        // Buscar partida e jogador
        const { data: match, error: matchError } = await supabaseClient
          .from('game_matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Match not found: ${matchError.message}`);
        }

        if (match.status !== 'LOBBY') {
          throw new Error('Cannot leave match in progress');
        }

        // Remover jogador
        const { error: playerError } = await supabaseClient
          .from('match_players')
          .delete()
          .eq('match_id', matchId)
          .eq('user_id', user.id);

        if (playerError) {
          throw new Error(`Failed to leave match: ${playerError.message}`);
        }

        // Liberar créditos reservados
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!walletError && wallet) {
          const newLockedBalance = Math.max(0, parseFloat(wallet.locked_balance) - parseFloat(match.buy_in));
          await supabaseClient
            .from('user_wallets')
            .update({ locked_balance: newLockedBalance })
            .eq('user_id', user.id);
        }

        // Atualizar contador de jogadores
        const newPlayerCount = match.current_players - 1;
        
        if (newPlayerCount === 0) {
          // Se não há mais jogadores, cancelar partida
          await supabaseClient
            .from('game_matches')
            .update({ status: 'CANCELLED' })
            .eq('id', matchId);
        } else {
          await supabaseClient
            .from('game_matches')
            .update({ current_players: newPlayerCount })
            .eq('id', matchId);
        }

        logStep("Left match successfully");

        return new Response(JSON.stringify({
          success: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'quick_match': {
        const { game, mode, buyIn } = params;
        
        logStep("Finding quick match", { game, mode, buyIn });

        // Buscar partidas disponíveis
        const { data: availableMatches, error: searchError } = await supabaseClient
          .from('game_matches')
          .select(`
            *,
            match_players (*)
          `)
          .eq('game', game)
          .eq('mode', mode)
          .eq('buy_in', parseFloat(buyIn))
          .eq('status', 'LOBBY')
          .lt('current_players', 'max_players');

        if (searchError) {
          throw new Error(`Failed to search matches: ${searchError.message}`);
        }

        let matchToJoin = null;
        
        if (availableMatches && availableMatches.length > 0) {
          // Encontrar partida que o usuário não esteja participando
          matchToJoin = availableMatches.find(match => 
            !match.match_players.some((p: any) => p.user_id === user.id)
          );
        }

        if (matchToJoin) {
          // Entrar na partida existente
          const joinResponse = await supabaseClient.functions.invoke('game-matching', {
            body: {
              action: 'join_match',
              matchId: matchToJoin.id
            },
            headers: { Authorization: authHeader }
          });

          const joinData = await joinResponse.json();
          
          return new Response(JSON.stringify({
            success: true,
            matchId: matchToJoin.id,
            joined: true,
            seatNumber: joinData.seatNumber
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Criar nova partida
          const createResponse = await supabaseClient.functions.invoke('game-matching', {
            body: {
              action: 'create_match',
              game,
              mode,
              buyIn
            },
            headers: { Authorization: authHeader }
          });

          const createData = await createResponse.json();
          
          return new Response(JSON.stringify({
            success: true,
            matchId: createData.match.id,
            created: true,
            match: createData.match
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      case 'get_matches': {
        const { game, status } = params;
        
        let query = supabaseClient
          .from('game_matches')
          .select(`
            *,
            match_players (
              user_id,
              seat_number,
              is_ready,
              is_connected
            ),
            profiles!match_players_user_id_fkey (
              full_name
            )
          `);

        if (game) {
          query = query.eq('game', game);
        }
        
        if (status) {
          query = query.eq('status', status);
        } else {
          query = query.in('status', ['LOBBY', 'LIVE']);
        }

        const { data: matches, error: matchesError } = await query
          .order('created_at', { ascending: false })
          .limit(50);

        if (matchesError) {
          throw new Error(`Failed to fetch matches: ${matchesError.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          matches: matches || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});