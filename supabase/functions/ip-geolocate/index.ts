import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IpGeolocationPayload {
  ip?: string;
  lat?: number;
  lng?: number;
  reverse?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: IpGeolocationPayload = await req.json().catch(() => ({}))
    
    // Se reverse=true e temos lat/lng, fazer reverse geocoding
    if (body.reverse && body.lat && body.lng) {
      console.log(`Reverse geocoding request for: ${body.lat}, ${body.lng}`)
      
      try {
        // Usar serviço de reverse geocoding gratuito
        const reverseResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${body.lat}&longitude=${body.lng}&localityLanguage=pt`
        )
        
        if (!reverseResponse.ok) {
          throw new Error(`Reverse geocoding API responded with status: ${reverseResponse.status}`)
        }

        const reverseData = await reverseResponse.json()
        
        console.log(`Reverse geocoding result:`, reverseData)
        
        return new Response(
          JSON.stringify({
            lat: body.lat,
            lng: body.lng,
            city: reverseData.city || reverseData.locality || 'Unknown',
            state: reverseData.principalSubdivisionCode || reverseData.principalSubdivision || 'Unknown',
            neighborhood: reverseData.localityInfo?.administrative?.[0]?.name,
            address_text: reverseData.localityInfo?.informative?.[0]?.description || reverseData.locality,
            country: reverseData.countryName || 'Brasil',
            source: 'reverse_geocoding',
            provider: 'bigdatacloud'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      } catch (reverseError) {
        console.error('Reverse geocoding failed:', reverseError)
        
        // Fallback para localização aproximada baseada nas coordenadas do Brasil
        const isInGoias = body.lat > -20 && body.lat < -14 && body.lng > -52 && body.lng < -46
        
        return new Response(
          JSON.stringify({
            lat: body.lat,
            lng: body.lng,
            city: isInGoias ? 'Goiânia' : 'Unknown',
            state: isInGoias ? 'GO' : 'Unknown',
            country: 'Brasil',
            source: 'reverse_fallback',
            error: 'Reverse geocoding service unavailable'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }
    
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