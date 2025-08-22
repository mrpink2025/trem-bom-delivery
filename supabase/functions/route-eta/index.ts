import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouteRequest {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  mode?: 'driving' | 'walking' | 'cycling'
}

interface RouteResponse {
  success: boolean
  distance_km?: number
  duration_min?: number
  polyline?: string
  using_mapbox?: boolean
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { from, to, mode = 'driving' }: RouteRequest = await req.json()
    
    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
      throw new Error('from and to coordinates are required')
    }

    console.log(`Calculating route from ${from.lat},${from.lng} to ${to.lat},${to.lng}`)

    // Try Mapbox first
    const mapboxToken = Deno.env.get('MAPBOX_TOKEN')
    
    if (mapboxToken) {
      try {
        const mapboxResult = await getMapboxRoute(from, to, mode, mapboxToken)
        if (mapboxResult.success) {
          return new Response(
            JSON.stringify(mapboxResult),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (mapboxError) {
        console.warn('Mapbox API failed, falling back to Haversine:', mapboxError)
      }
    }

    // Fallback to Haversine calculation
    const fallbackResult = calculateHaversineRoute(from, to, mode)
    
    return new Response(
      JSON.stringify(fallbackResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Route calculation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function getMapboxRoute(
  from: { lat: number; lng: number }, 
  to: { lat: number; lng: number }, 
  mode: string,
  token: string
): Promise<RouteResponse> {
  const profile = mode === 'walking' ? 'walking' : mode === 'cycling' ? 'cycling' : 'driving'
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = new URLSearchParams({
    access_token: token,
    geometries: 'polyline',
    overview: 'full',
    steps: 'false'
  })

  const response = await fetch(`${url}?${params}`)
  
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found')
  }

  const route = data.routes[0]
  
  return {
    success: true,
    distance_km: Math.round(route.distance / 1000 * 100) / 100, // Round to 2 decimal places
    duration_min: Math.ceil(route.duration / 60), // Round up to next minute
    polyline: route.geometry,
    using_mapbox: true
  }
}

function calculateHaversineRoute(
  from: { lat: number; lng: number }, 
  to: { lat: number; lng: number },
  mode: string
): RouteResponse {
  // Calculate straight-line distance using Haversine formula
  const R = 6371 // Earth's radius in kilometers
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const straightDistance = R * c

  // Apply factors for realistic routing distance and speeds
  let distanceFactor = 1.3 // Roads are ~30% longer than straight-line
  let avgSpeedKmh = 30 // Default driving speed

  switch (mode) {
    case 'walking':
      distanceFactor = 1.2
      avgSpeedKmh = 5
      break
    case 'cycling':
      distanceFactor = 1.25
      avgSpeedKmh = 15
      break
    case 'driving':
    default:
      distanceFactor = 1.3
      avgSpeedKmh = 30
      break
  }

  const routeDistance = straightDistance * distanceFactor
  const durationMinutes = Math.ceil((routeDistance / avgSpeedKmh) * 60)

  // Generate a simple polyline (straight line between points)
  const polyline = encodePolyline([
    [from.lat, from.lng],
    [to.lat, to.lng]
  ])

  return {
    success: true,
    distance_km: Math.round(routeDistance * 100) / 100,
    duration_min: durationMinutes,
    polyline,
    using_mapbox: false
  }
}

// Simple polyline encoding for fallback
function encodePolyline(coordinates: number[][]): string {
  let result = ''
  let prevLat = 0
  let prevLng = 0

  for (const [lat, lng] of coordinates) {
    const encodedLat = Math.round(lat * 1e5) - prevLat
    const encodedLng = Math.round(lng * 1e5) - prevLng
    
    result += encodeSignedNumber(encodedLat)
    result += encodeSignedNumber(encodedLng)
    
    prevLat = Math.round(lat * 1e5)
    prevLng = Math.round(lng * 1e5)
  }

  return result
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1
  if (num < 0) {
    sgn_num = ~sgn_num
  }
  return encodeNumber(sgn_num)
}

function encodeNumber(num: number): string {
  let encodeString = ''
  while (num >= 0x20) {
    encodeString += String.fromCharCode((0x20 | (num & 0x1f)) + 63)
    num >>= 5
  }
  encodeString += String.fromCharCode(num + 63)
  return encodeString
}