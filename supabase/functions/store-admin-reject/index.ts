import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          owner_id: string;
        };
        Update: {
          is_active?: boolean;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          role: string;
        };
      };
      admin_actions_log: {
        Insert: {
          actor_admin_id: string;
          action: string;
          target_table: string;
          target_id: string;
          reason?: string;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }

    const { storeId, reason } = await req.json();
    
    if (!storeId || !reason) {
      throw new Error("Store ID and reason are required");
    }

    const supabaseAdmin = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error("Invalid token");
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      throw new Error("Access denied - admin only");
    }

    // Keep store inactive and log rejection
    const { data: updatedStore, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", storeId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabaseAdmin
      .from("admin_actions_log")
      .insert({
        actor_admin_id: user.id,
        action: "REJECT_STORE",
        target_table: "restaurants",
        target_id: storeId,
        reason: reason
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        store: updatedStore
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in store-admin-reject:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
