import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  category?: string;
}

serve(async (req) => {
  console.log('Push notification request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      user_id, 
      title, 
      body, 
      data = {}, 
      badge = 1,
      sound = 'default',
      priority = 'high',
      category = 'delivery'
    }: PushNotificationRequest = await req.json();

    console.log('Processing push notification for user:', user_id);

    // Get user's push tokens from database
    const { data: pushTokens, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      throw new Error(`Failed to fetch push tokens: ${tokenError.message}`);
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log('No active push tokens found for user:', user_id);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active push tokens found for user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pushTokens.length} push tokens for user`);

    // Send notifications to each device
    const notificationPromises = pushTokens.map(async (tokenData) => {
      const { token, platform } = tokenData;
      
      try {
        let notificationPayload;
        
        if (platform === 'ios') {
          // iOS notification format
          notificationPayload = {
            to: token,
            notification: {
              title,
              body,
              badge,
              sound,
            },
            data: {
              ...data,
              category,
              user_id,
              timestamp: new Date().toISOString()
            },
            priority,
            content_available: true
          };
        } else {
          // Android notification format
          notificationPayload = {
            to: token,
            notification: {
              title,
              body,
              icon: 'ic_notification',
              color: '#4F46E5',
              sound,
            },
            data: {
              ...data,
              category,
              user_id,
              timestamp: new Date().toISOString(),
              click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            priority,
            android: {
              notification: {
                channel_id: 'delivery_updates',
                priority: 'high',
                visibility: 'public'
              }
            }
          };
        }

        // Send via FCM (Firebase Cloud Messaging)
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload),
        });

        const fcmResult = await fcmResponse.json();
        console.log(`FCM response for ${platform}:`, fcmResult);

        return {
          token,
          platform,
          success: fcmResponse.ok,
          result: fcmResult
        };
      } catch (error) {
        console.error(`Error sending to ${platform} token:`, error);
        return {
          token,
          platform,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successCount = results.filter(r => r.success).length;

    // Store notification in database for history
    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        title,
        body,
        data,
        category,
        sent_at: new Date().toISOString(),
        status: successCount > 0 ? 'sent' : 'failed',
        delivery_count: successCount
      });

    if (insertError) {
      console.error('Error storing notification:', insertError);
    }

    console.log(`Notification sent successfully to ${successCount}/${results.length} devices`);

    return new Response(JSON.stringify({ 
      success: successCount > 0,
      sent_to_devices: successCount,
      total_devices: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});