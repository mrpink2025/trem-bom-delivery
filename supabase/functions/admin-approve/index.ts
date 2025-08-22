import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    db: { schema: 'public' }
  }
)

interface ApprovalRequest {
  kind: 'merchant' | 'courier'
  id: string
  notes?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,  
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { kind, id, notes }: ApprovalRequest = await req.json()

    if (!kind || !id || !['merchant', 'courier'].includes(kind)) {
      return new Response(JSON.stringify({ 
        error: 'kind (merchant|courier) and id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (kind === 'merchant') {
      // Aprovar merchant
      const { data: merchant, error: fetchError } = await supabase
        .from('merchants')
        .select('id, status, owner_user_id, trade_name')
        .eq('id', id)
        .single()

      if (fetchError || !merchant) {
        return new Response(JSON.stringify({ error: 'Merchant not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (merchant.status !== 'UNDER_REVIEW') {
        return new Response(JSON.stringify({ 
          error: 'Merchant must be UNDER_REVIEW to approve' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atualizar status do merchant
      const { error: updateError } = await supabase
        .from('merchants')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error approving merchant:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to approve merchant' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marcar documentos como verificados
      await supabase
        .from('merchant_documents')
        .update({ 
          verified: true,
          ...(notes && { notes })
        })
        .eq('merchant_id', id)

      // Habilitar store_units do merchant (se existirem)
      await supabase
        .from('store_units')
        .update({ is_open: true })
        .eq('merchant_id', id)

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: 'MERCHANT_APPROVED',
        target_table: 'merchants',
        target_id: id,
        reason: notes || 'Merchant approved',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      // Notificar o merchant
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: merchant.owner_user_id,
            type: 'merchant_approved',
            title: 'Loja Aprovada!',
            message: `Sua loja "${merchant.trade_name}" foi aprovada e já está ativa.`,
            data: { merchant_id: id }
          }
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Merchant approved successfully',
        merchant_id: id,
        status: 'APPROVED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      // Aprovar courier
      const { data: courier, error: fetchError } = await supabase
        .from('couriers')
        .select('id, status, full_name')
        .eq('id', id)
        .single()

      if (fetchError || !courier) {
        return new Response(JSON.stringify({ error: 'Courier not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (courier.status !== 'UNDER_REVIEW') {
        return new Response(JSON.stringify({ 
          error: 'Courier must be UNDER_REVIEW to approve' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Atualizar status do courier
      const { error: updateError } = await supabase
        .from('couriers')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error approving courier:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to approve courier' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Marcar documentos como verificados
      await supabase
        .from('courier_documents')
        .update({ 
          verified: true,
          ...(notes && { notes })
        })
        .eq('courier_id', id)

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: 'COURIER_APPROVED',
        target_table: 'couriers',
        target_id: id,
        reason: notes || 'Courier approved',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      // Notificar o courier
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: id,
            type: 'courier_approved',
            title: 'Cadastro Aprovado!',
            message: `Parabéns ${courier.full_name}! Seu cadastro foi aprovado. Você já pode ficar online e aceitar corridas.`,
            data: { courier_id: id }
          }
        })
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Courier approved successfully',
        courier_id: id,
        status: 'APPROVED'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Error in admin-approve:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})