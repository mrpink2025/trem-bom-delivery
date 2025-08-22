import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchRestaurantsPayload {
  lat: number;
  lng: number;
  radius_km?: number;
  limit?: number;
  only_open?: boolean;
  filters?: {
    city?: string;
    category?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      lat,
      lng,
      radius_km = 5,
      limit = 50,
      only_open = true,
      filters = {}
    }: SearchRestaurantsPayload = await req.json()

    // Validar payload
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Searching restaurants near ${lat}, ${lng} within ${radius_km}km`)

    // Verificar se PostGIS está disponível
    const { data: extensions } = await supabase.rpc('get_extensions')
    const hasPostGIS = extensions?.some((ext: any) => ext.name === 'postgis')

    let query: any

    if (hasPostGIS) {
      // Query com PostGIS
      console.log('Using PostGIS for distance calculation')
      
      query = supabase
        .rpc('search_restaurants_postgis', {
          lat_param: lat,
          lng_param: lng,
          radius_km_param: radius_km,
          limit_param: limit,
          only_open_param: only_open
        })
    } else {
      // Fallback com earthdistance
      console.log('Using earthdistance for distance calculation')
      
      query = supabase
        .rpc('search_restaurants_earthdistance', {
          lat_param: lat,
          lng_param: lng,
          radius_km_param: radius_km,
          limit_param: limit,
          only_open_param: only_open
        })
    }

    const { data: restaurants, error } = await query

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Aplicar filtros adicionais
    let filteredResults = restaurants || []

    if (filters.city) {
      filteredResults = filteredResults.filter((r: any) => 
        r.city?.toLowerCase().includes(filters.city!.toLowerCase())
      )
    }

    if (filters.category) {
      filteredResults = filteredResults.filter((r: any) => 
        r.cuisine_type?.toLowerCase().includes(filters.category!.toLowerCase())
      )
    }

    const response = {
      items: filteredResults,
      meta: {
        lat,
        lng,
        radius_km,
        source: 'gps', // será definido pela chamada
        ts: new Date().toISOString(),
        total_found: filteredResults.length,
        using_postgis: hasPostGIS
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in search-restaurants function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})