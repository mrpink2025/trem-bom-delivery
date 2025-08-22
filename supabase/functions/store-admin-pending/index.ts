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
          status: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string;
          email: string;
          role: string;
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

    // Get pending restaurants (those with status 'pending' or newly created inactive ones)
    const { data: pendingStores, error: storesError } = await supabaseAdmin
      .from("restaurants")
      .select(`
        id,
        name,
        is_active,
        created_at,
        updated_at,
        owner_id,
        profiles!restaurants_owner_id_fkey (
          full_name,
          email
        )
      `)
      .eq("is_active", false)
      .order("created_at", { ascending: false });

    if (storesError) {
      throw storesError;
    }

    return new Response(
      JSON.stringify({ 
        stores: pendingStores || []
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in store-admin-pending:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});