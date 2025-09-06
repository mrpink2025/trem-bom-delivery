import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WALLET-OPERATIONS] ${step}${detailsStr}`);
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

    const { operation, ...params } = await req.json();

    switch (operation) {
      case 'add_credits': {
        const { amount, reason = 'PURCHASE', description } = params;
        
        logStep("Adding credits", { userId: user.id, amount, reason });
        
        // Usar transação para garantir consistência
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .upsert({
            user_id: user.id,
            balance: 0,
            locked_balance: 0
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (walletError) {
          logStep("Error upserting wallet", walletError);
          throw new Error(`Failed to initialize wallet: ${walletError.message}`);
        }

        // Atualizar saldo
        const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
        const { error: updateError } = await supabaseClient
          .from('user_wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(`Failed to update balance: ${updateError.message}`);
        }

        // Registrar transação
        const { error: ledgerError } = await supabaseClient
          .from('wallet_ledger')
          .insert({
            user_id: user.id,
            type: 'CREDIT',
            amount: parseFloat(amount),
            reason,
            description
          });

        if (ledgerError) {
          throw new Error(`Failed to record transaction: ${ledgerError.message}`);
        }

        logStep("Credits added successfully");
        return new Response(JSON.stringify({ 
          success: true, 
          newBalance,
          amountAdded: amount 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'reserve_credits': {
        const { amount, matchId, reason = 'BUY_IN' } = params;
        
        logStep("Reserving credits", { userId: user.id, amount, matchId });

        // Buscar carteira atual
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          throw new Error(`Failed to fetch wallet: ${walletError.message}`);
        }

        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.locked_balance);
        if (availableBalance < parseFloat(amount)) {
          throw new Error('Insufficient balance');
        }

        // Reservar créditos
        const newLockedBalance = parseFloat(wallet.locked_balance) + parseFloat(amount);
        const { error: updateError } = await supabaseClient
          .from('user_wallets')
          .update({ locked_balance: newLockedBalance })
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(`Failed to reserve credits: ${updateError.message}`);
        }

        // Registrar transação
        const { error: ledgerError } = await supabaseClient
          .from('wallet_ledger')
          .insert({
            user_id: user.id,
            type: 'DEBIT',
            amount: parseFloat(amount),
            reason,
            match_id: matchId,
            description: `Reserved for match ${matchId}`
          });

        if (ledgerError) {
          throw new Error(`Failed to record reservation: ${ledgerError.message}`);
        }

        return new Response(JSON.stringify({ 
          success: true,
          reservedAmount: amount,
          newLockedBalance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'settle_match': {
        const { matchId, winnerUserIds, prizeMap, rake } = params;
        
        logStep("Settling match", { matchId, winnerUserIds, prizeMap, rake });

        // Buscar todos os jogadores da partida
        const { data: matchPlayers, error: playersError } = await supabaseClient
          .from('match_players')
          .select('user_id, match_id')
          .eq('match_id', matchId);

        if (playersError) {
          throw new Error(`Failed to fetch match players: ${playersError.message}`);
        }

        // Buscar informações da partida
        const { data: match, error: matchError } = await supabaseClient
          .from('game_matches')
          .select('buy_in, rake_pct')
          .eq('id', matchId)
          .single();

        if (matchError) {
          throw new Error(`Failed to fetch match: ${matchError.message}`);
        }

        // Calcular prize pool
        const totalBuyIn = parseFloat(match.buy_in) * matchPlayers.length;
        const rakeAmount = totalBuyIn * parseFloat(match.rake_pct);
        const prizePool = totalBuyIn - rakeAmount;

        // Liberar créditos locked de todos os jogadores
        for (const player of matchPlayers) {
          const { data: wallet, error: walletError } = await supabaseClient
            .from('user_wallets')
            .select('*')
            .eq('user_id', player.user_id)
            .single();

          if (walletError) continue;

          const newLockedBalance = Math.max(0, parseFloat(wallet.locked_balance) - parseFloat(match.buy_in));
          
          await supabaseClient
            .from('user_wallets')
            .update({ locked_balance: newLockedBalance })
            .eq('user_id', player.user_id);
        }

        // Distribuir prêmios para vencedores
        if (winnerUserIds && winnerUserIds.length > 0) {
          const prizePerWinner = prizePool / winnerUserIds.length;
          
          for (const winnerId of winnerUserIds) {
            const { data: wallet, error: walletError } = await supabaseClient
              .from('user_wallets')
              .select('*')
              .eq('user_id', winnerId)
              .single();

            if (walletError) continue;

            const newBalance = parseFloat(wallet.balance) + prizePerWinner;
            
            await supabaseClient
              .from('user_wallets')
              .update({ balance: newBalance })
              .eq('user_id', winnerId);

            // Registrar prêmio
            await supabaseClient
              .from('wallet_ledger')
              .insert({
                user_id: winnerId,
                type: 'CREDIT',
                amount: prizePerWinner,
                reason: 'PRIZE',
                match_id: matchId,
                description: `Prize from match ${matchId}`
              });
          }
        }

        // Atualizar status da partida
        await supabaseClient
          .from('game_matches')
          .update({
            status: 'FINISHED',
            finished_at: new Date().toISOString(),
            winner_user_ids: winnerUserIds,
            prize_pool: prizePool
          })
          .eq('id', matchId);

        logStep("Match settled successfully");
        return new Response(JSON.stringify({
          success: true,
          prizePool,
          rakeAmount,
          winners: winnerUserIds
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_balance': {
        const { data: wallet, error: walletError } = await supabaseClient
          .from('user_wallets')
          .select('balance, locked_balance')
          .eq('user_id', user.id)
          .single();

        if (walletError) {
          // Se não existe carteira, criar uma
          await supabaseClient
            .from('user_wallets')
            .insert({
              user_id: user.id,
              balance: 0,
              locked_balance: 0
            });
          
          return new Response(JSON.stringify({
            balance: 0,
            lockedBalance: 0,
            availableBalance: 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const availableBalance = parseFloat(wallet.balance) - parseFloat(wallet.locked_balance);
        
        return new Response(JSON.stringify({
          balance: parseFloat(wallet.balance),
          lockedBalance: parseFloat(wallet.locked_balance),
          availableBalance
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid operation');
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