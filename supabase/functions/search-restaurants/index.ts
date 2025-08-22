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
  client_city?: string; // Nova propriedade para a cidade do cliente
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
      filters = {},
      client_city = null
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

    console.log(`Searching restaurants near ${lat}, ${lng} within ${radius_km}km for city: ${client_city || 'any'}`)

    // Usar função melhorada que prioriza restaurantes da mesma cidade
    console.log('Using city-prioritized search with expansion')
    
    const query = supabase
      .rpc('search_restaurants_by_city', {
        center_lat: lat,
        center_lng: lng,
        search_radius_km: radius_km,
        search_limit: limit,
        open_only: only_open,
        filter_category: filters.category || null,
        client_city_name: client_city
      })

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

    // Contar quantos foram da busca expandida
    const expandedCount = filteredResults.filter((r: any) => r.search_expanded).length
    const nearbyCount = filteredResults.length - expandedCount

    console.log(`Found ${nearbyCount} nearby restaurants and ${expandedCount} city-expanded restaurants`)

    const response = {
      items: filteredResults,
      meta: {
        lat,
        lng,
        radius_km,
        client_city: client_city || 'any',
        source: 'gps',
        ts: new Date().toISOString(),
        total_found: filteredResults.length,
        using_city_priority: true,
        search_expanded_count: expandedCount,
        nearby_count: nearbyCount
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