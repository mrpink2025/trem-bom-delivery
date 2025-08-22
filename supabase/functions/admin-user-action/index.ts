import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface UserActionRequest {
  action: 'suspend' | 'ban' | 'warn' | 'restore' | 'delete' | 'force_logout' | 'change_role'
  user_id: string
  reason: string
  type?: 'SOFT' | 'ANON' | 'HARD'
  ends_at?: string
  new_role?: string
  new_admin_role?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Autenticar o usuário
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

    // Verificar se o usuário tem permissão administrativa
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const body: UserActionRequest = await req.json()
      const { action, user_id, reason, type, ends_at, new_role, new_admin_role } = body

      if (!action || !user_id || !reason) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Verificar permissões específicas para cada ação
      const canPerformAction = (action: string, adminRole: string): boolean => {
        switch (action) {
          case 'suspend':
          case 'ban':
          case 'warn':
          case 'restore':
            return ['SUPERADMIN', 'ADMIN'].includes(adminRole)
          case 'delete':
            return ['SUPERADMIN', 'ADMIN'].includes(adminRole)
          case 'force_logout':
            return ['SUPERADMIN', 'ADMIN', 'SUPPORT'].includes(adminRole)
          case 'change_role':
            if (new_admin_role && new_admin_role === 'SUPERADMIN') {
              return adminRole === 'SUPERADMIN'
            }
            return ['SUPERADMIN', 'ADMIN'].includes(adminRole)
          default:
            return false
        }
      }

      if (!canPerformAction(action, adminUser.role)) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions for this action' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Executar ação
      let result = null
      let actionDetails = {}

      switch (action) {
        case 'suspend':
        case 'ban':
        case 'warn':
          const { data: suspension, error: suspensionError } = await supabase
            .from('user_suspensions')
            .insert({
              target_user_id: user_id,
              type: action.toUpperCase(),
              reason,
              ends_at: ends_at || null,
              created_by_admin: user.id
            })
            .select()
            .single()

          if (suspensionError) {
            throw suspensionError
          }
          result = suspension
          actionDetails = { type: action.toUpperCase(), ends_at }
          break

        case 'restore':
          const { error: restoreError } = await supabase
            .from('user_suspensions')
            .update({ 
              ends_at: new Date().toISOString(),
              is_active: false 
            })
            .eq('target_user_id', user_id)
            .eq('is_active', true)

          if (restoreError) {
            throw restoreError
          }
          actionDetails = { restored: true }
          break

        case 'delete':
          if (type === 'HARD' && adminUser.role !== 'SUPERADMIN') {
            return new Response(JSON.stringify({ error: 'Only SUPERADMIN can perform HARD delete' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }

          if (type === 'ANON') {
            // Aplicar anonimização LGPD
            const { error: anonError } = await supabase.rpc('apply_gdpr_anonymization', {
              target_user_id: user_id
            })
            if (anonError) throw anonError
            actionDetails = { anonymized: true }
          } else if (type === 'SOFT') {
            // Soft delete - marcar como deletado
            const { error: softDeleteError } = await supabase
              .from('profiles')
              .update({ 
                full_name: 'Usuário Deletado',
                email: null,
                phone: null 
              })
              .eq('user_id', user_id)

            if (softDeleteError) throw softDeleteError
            actionDetails = { soft_deleted: true }
          }
          break

        case 'force_logout':
          // Invalidar sessões do usuário via Auth Admin API
          const { error: logoutError } = await supabase.auth.admin.signOut(user_id)
          if (logoutError) throw logoutError
          actionDetails = { forced_logout: true }
          break

        case 'change_role':
          if (new_role) {
            const { error: roleError } = await supabase
              .from('profiles')
              .update({ role: new_role })
              .eq('user_id', user_id)
            if (roleError) throw roleError
            actionDetails = { new_app_role: new_role }
          }

          if (new_admin_role) {
            const { error: adminRoleError } = await supabase
              .from('admin_users')
              .upsert({ 
                user_id: user_id, 
                role: new_admin_role,
                created_by: user.id
              })
            if (adminRoleError) throw adminRoleError
            actionDetails = { ...actionDetails, new_admin_role }
          }
          break

        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
      }

      // Registrar ação administrativa
      await supabase.from('admin_actions_log').insert({
        actor_admin_id: user.id,
        action: `USER_${action.toUpperCase()}`,
        target_table: 'profiles',
        target_id: user_id,
        reason,
        diff: actionDetails,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent')
      })

      return new Response(JSON.stringify({ 
        success: true, 
        action, 
        result,
        message: `User ${action} completed successfully` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in admin-user-action function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})