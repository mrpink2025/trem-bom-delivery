import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IpGeolocationPayload {
  ip?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: IpGeolocationPayload = await req.json().catch(() => ({}))
    
    // Pegar IP do cabeçalho se não fornecido
    const clientIp = body.ip || 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') || 
      'unknown'

    console.log(`IP Geolocation request for IP: ${clientIp}`)

    // Fallback para coordenadas aproximadas do Brasil (Goiânia) se IP for local/inválido
    if (clientIp === 'unknown' || clientIp.startsWith('127.') || clientIp.startsWith('192.168.') || clientIp.startsWith('10.')) {
      console.log('Using fallback coordinates for local/unknown IP')
      return new Response(
        JSON.stringify({
          lat: -16.6869,
          lng: -49.2648,
          accuracy_km: 50,
          city: 'Goiânia',
          state: 'GO',
          source: 'fallback',
          ip: clientIp
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Tentar usar serviço gratuito de geolocalização IP
    try {
      // Usando ipapi.co (gratuito até 30k requests/mês)
      const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`)
      
      if (!geoResponse.ok) {
        throw new Error(`IP API responded with status: ${geoResponse.status}`)
      }

      const geoData = await geoResponse.json()
      
      if (geoData.error) {
        throw new Error(`IP API error: ${geoData.reason}`)
      }

      // Validar se temos coordenadas válidas
      if (!geoData.latitude || !geoData.longitude) {
        throw new Error('No coordinates returned from IP API')
      }

      console.log(`IP ${clientIp} located at: ${geoData.latitude}, ${geoData.longitude}`)

      return new Response(
        JSON.stringify({
          lat: parseFloat(geoData.latitude),
          lng: parseFloat(geoData.longitude),
          accuracy_km: 15, // IP geolocation é menos preciso
          city: geoData.city || 'Unknown',
          state: geoData.region_code || geoData.region || 'Unknown',
          country: geoData.country_name || 'Unknown',
          source: 'ip',
          ip: clientIp,
          provider: 'ipapi.co'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } catch (ipApiError) {
      console.error('IP API failed:', ipApiError)
      
      // Fallback para coordenadas do Brasil
      console.log('Using Brazil fallback coordinates due to IP API failure')
      return new Response(
        JSON.stringify({
          lat: -16.6869,
          lng: -49.2648,
          accuracy_km: 100,
          city: 'Goiânia',
          state: 'GO',
          country: 'Brasil',
          source: 'fallback',
          ip: clientIp,
          error: 'IP geolocation service unavailable'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
  } catch (error) {
    console.error('Error in ip-geolocate function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        // Fallback coordinates
        lat: -16.6869,
        lng: -49.2648,
        accuracy_km: 100,
        city: 'Goiânia',
        state: 'GO',
        source: 'error_fallback'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})