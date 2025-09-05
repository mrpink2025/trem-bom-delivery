export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_actions_log: {
        Row: {
          action: string
          actor_admin_id: string
          created_at: string | null
          diff: Json | null
          id: string
          ip_address: unknown | null
          reason: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_admin_id: string
          created_at?: string | null
          diff?: Json | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_admin_id?: string
          created_at?: string | null
          diff?: Json | null
          id?: string
          ip_address?: unknown | null
          reason?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          blocked_until: string | null
          created_by: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          reason: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_until?: string | null
          created_by?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          reason: string
        }
        Update: {
          blocked_at?: string | null
          blocked_until?: string | null
          created_by?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          reason?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          quantity: number
          restaurant_id: string
          special_instructions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          quantity?: number
          restaurant_id: string
          special_instructions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          quantity?: number
          restaurant_id?: string
          special_instructions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cart_items_menu_item"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cart_items_restaurant"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_campaigns: {
        Row: {
          cashback_percent: number
          created_at: string
          id: string
          is_active: boolean
          max_cashback_cents: number | null
          min_order_value_cents: number | null
          name: string
          platform_contribution_percent: number
          restaurant_contribution_percent: number
          restaurant_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          cashback_percent: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_cashback_cents?: number | null
          min_order_value_cents?: number | null
          name: string
          platform_contribution_percent?: number
          restaurant_contribution_percent?: number
          restaurant_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          cashback_percent?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_cashback_cents?: number | null
          min_order_value_cents?: number | null
          name?: string
          platform_contribution_percent?: number
          restaurant_contribution_percent?: number
          restaurant_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      cashback_transactions: {
        Row: {
          campaign_id: string | null
          cashback_amount_cents: number
          created_at: string
          credited_at: string | null
          expires_at: string | null
          id: string
          order_id: string
          platform_contribution_cents: number
          restaurant_contribution_cents: number
          status: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          cashback_amount_cents: number
          created_at?: string
          credited_at?: string | null
          expires_at?: string | null
          id?: string
          order_id: string
          platform_contribution_cents: number
          restaurant_contribution_cents: number
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          cashback_amount_cents?: number
          created_at?: string
          credited_at?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string
          platform_contribution_cents?: number
          restaurant_contribution_cents?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cashback_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          read_by: Json | null
          room_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_by?: Json | null
          room_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          read_by?: Json | null
          room_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          participants: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          participants: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          participants?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          courier_id: string | null
          created_at: string
          customer_id: string
          id: string
          is_active: boolean
          order_id: string
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          order_id: string
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          order_id?: string
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cleanup_metrics: {
        Row: {
          chat_media_cleaned: number | null
          error_message: string | null
          execution_date: string
          execution_time_ms: number | null
          id: string
          status: string | null
          tracking_records_removed: number | null
          triggered_by: string | null
        }
        Insert: {
          chat_media_cleaned?: number | null
          error_message?: string | null
          execution_date?: string
          execution_time_ms?: number | null
          id?: string
          status?: string | null
          tracking_records_removed?: number | null
          triggered_by?: string | null
        }
        Update: {
          chat_media_cleaned?: number | null
          error_message?: string | null
          execution_date?: string
          execution_time_ms?: number | null
          id?: string
          status?: string | null
          tracking_records_removed?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          id: string
          order_id: string | null
          promotion_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          promotion_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string | null
          promotion_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_active_orders: {
        Row: {
          courier_id: string
          created_at: string | null
          delivery_eta: string | null
          distance_km: number | null
          order_id: string
          pickup_eta: string | null
          sequence_order: number
        }
        Insert: {
          courier_id: string
          created_at?: string | null
          delivery_eta?: string | null
          distance_km?: number | null
          order_id: string
          pickup_eta?: string | null
          sequence_order?: number
        }
        Update: {
          courier_id?: string
          created_at?: string | null
          delivery_eta?: string | null
          distance_km?: number | null
          order_id?: string
          pickup_eta?: string | null
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "courier_active_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_documents: {
        Row: {
          courier_id: string
          created_at: string | null
          file_url: string
          id: string
          mime: string
          notes: string | null
          size_bytes: number
          type: Database["public"]["Enums"]["doc_type"]
          verified: boolean
        }
        Insert: {
          courier_id: string
          created_at?: string | null
          file_url: string
          id?: string
          mime: string
          notes?: string | null
          size_bytes: number
          type: Database["public"]["Enums"]["doc_type"]
          verified?: boolean
        }
        Update: {
          courier_id?: string
          created_at?: string | null
          file_url?: string
          id?: string
          mime?: string
          notes?: string | null
          size_bytes?: number
          type?: Database["public"]["Enums"]["doc_type"]
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courier_documents_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_earnings: {
        Row: {
          amount_cents: number
          courier_id: string
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          reference_date: string
          type: Database["public"]["Enums"]["earning_type"]
        }
        Insert: {
          amount_cents: number
          courier_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          reference_date?: string
          type: Database["public"]["Enums"]["earning_type"]
        }
        Update: {
          amount_cents?: number
          courier_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          reference_date?: string
          type?: Database["public"]["Enums"]["earning_type"]
        }
        Relationships: [
          {
            foreignKeyName: "courier_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_locations: {
        Row: {
          accuracy_m: number | null
          courier_id: string
          created_at: string | null
          heading_deg: number | null
          id: number
          location: unknown
          speed_mps: number | null
          timestamp: string
        }
        Insert: {
          accuracy_m?: number | null
          courier_id: string
          created_at?: string | null
          heading_deg?: number | null
          id?: number
          location: unknown
          speed_mps?: number | null
          timestamp?: string
        }
        Update: {
          accuracy_m?: number | null
          courier_id?: string
          created_at?: string | null
          heading_deg?: number | null
          id?: number
          location?: unknown
          speed_mps?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      courier_presence: {
        Row: {
          battery_level: number | null
          courier_id: string
          device_info: Json | null
          is_online: boolean
          last_location: unknown | null
          last_seen: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          battery_level?: number | null
          courier_id: string
          device_info?: Json | null
          is_online?: boolean
          last_location?: unknown | null
          last_seen?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          battery_level?: number | null
          courier_id?: string
          device_info?: Json | null
          is_online?: boolean
          last_location?: unknown | null
          last_seen?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_reviews_log: {
        Row: {
          actor: string | null
          courier_id: string
          created_at: string | null
          from_status: Database["public"]["Enums"]["courier_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["courier_status"] | null
        }
        Insert: {
          actor?: string | null
          courier_id: string
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["courier_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["courier_status"] | null
        }
        Update: {
          actor?: string | null
          courier_id?: string
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["courier_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["courier_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_reviews_log_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_sessions: {
        Row: {
          app_version: string | null
          battery_pct: number | null
          courier_id: string
          created_at: string | null
          device_model: string | null
          is_online: boolean
          last_seen: string | null
          location: unknown | null
          updated_at: string | null
        }
        Insert: {
          app_version?: string | null
          battery_pct?: number | null
          courier_id: string
          created_at?: string | null
          device_model?: string | null
          is_online?: boolean
          last_seen?: string | null
          location?: unknown | null
          updated_at?: string | null
        }
        Update: {
          app_version?: string | null
          battery_pct?: number | null
          courier_id?: string
          created_at?: string | null
          device_model?: string | null
          is_online?: boolean
          last_seen?: string | null
          location?: unknown | null
          updated_at?: string | null
        }
        Relationships: []
      }
      couriers: {
        Row: {
          address_json: Json | null
          approved_at: string | null
          birth_date: string
          cnh_valid_until: string | null
          cpf: string
          created_at: string | null
          crlv_valid_until: string | null
          full_name: string
          id: string
          phone: string
          pix_key: string | null
          pix_key_type: Database["public"]["Enums"]["pix_key_type"] | null
          plate: string | null
          rejection_reason: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["courier_status"]
          submitted_at: string | null
          suspended_reason: string | null
          updated_at: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          address_json?: Json | null
          approved_at?: string | null
          birth_date: string
          cnh_valid_until?: string | null
          cpf: string
          created_at?: string | null
          crlv_valid_until?: string | null
          full_name: string
          id: string
          phone: string
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          plate?: string | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          submitted_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          address_json?: Json | null
          approved_at?: string | null
          birth_date?: string
          cnh_valid_until?: string | null
          cpf?: string
          created_at?: string | null
          crlv_valid_until?: string | null
          full_name?: string
          id?: string
          phone?: string
          pix_key?: string | null
          pix_key_type?: Database["public"]["Enums"]["pix_key_type"] | null
          plate?: string | null
          rejection_reason?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["courier_status"]
          submitted_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      customer_rewards: {
        Row: {
          created_at: string
          current_points: number
          id: string
          total_points_earned: number
          total_points_redeemed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_points?: number
          id?: string
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_points?: number
          id?: string
          total_points_earned?: number
          total_points_redeemed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          monthly_fee_cents: number
          started_at: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_fee_cents?: number
          started_at?: string
          subscription_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_fee_cents?: number
          started_at?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_areas: {
        Row: {
          area: unknown | null
          created_at: string | null
          fee_extra: number | null
          id: string
          name: string | null
          store_id: string
        }
        Insert: {
          area?: unknown | null
          created_at?: string | null
          fee_extra?: number | null
          id?: string
          name?: string | null
          store_id: string
        }
        Update: {
          area?: unknown | null
          created_at?: string | null
          fee_extra?: number | null
          id?: string
          name?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_areas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_confirmations: {
        Row: {
          code_attempts: number | null
          confirmation_code: string
          confirmed_at: string | null
          courier_id: string
          created_at: string | null
          customer_id: string
          id: string
          is_confirmed: boolean | null
          location_lat: number | null
          location_lng: number | null
          order_id: string
        }
        Insert: {
          code_attempts?: number | null
          confirmation_code: string
          confirmed_at?: string | null
          courier_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_confirmed?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          order_id: string
        }
        Update: {
          code_attempts?: number | null
          confirmation_code?: string
          confirmed_at?: string | null
          courier_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_confirmed?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          order_id?: string
        }
        Relationships: []
      }
      delivery_slots: {
        Row: {
          created_at: string
          current_orders: number
          id: string
          is_available: boolean
          max_capacity: number
          slot_end: string
          slot_start: string
          store_unit_id: string
        }
        Insert: {
          created_at?: string
          current_orders?: number
          id?: string
          is_available?: boolean
          max_capacity?: number
          slot_end: string
          slot_start: string
          store_unit_id: string
        }
        Update: {
          created_at?: string
          current_orders?: number
          id?: string
          is_available?: boolean
          max_capacity?: number
          slot_end?: string
          slot_start?: string
          store_unit_id?: string
        }
        Relationships: []
      }
      delivery_tracking: {
        Row: {
          courier_id: string
          distance_to_destination: number | null
          eta_minutes: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"] | null
          timestamp: string
        }
        Insert: {
          courier_id: string
          distance_to_destination?: number | null
          eta_minutes?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"] | null
          timestamp?: string
        }
        Update: {
          courier_id?: string
          distance_to_destination?: number | null
          eta_minutes?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"] | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_fee: number
          created_at: string | null
          id: string
          is_active: boolean
          max_distance_km: number
          max_time_minutes: number
          min_time_minutes: number
          name: string
          per_km_rate: number
          polygon: Json
          updated_at: string | null
        }
        Insert: {
          base_fee?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_distance_km?: number
          max_time_minutes?: number
          min_time_minutes?: number
          name: string
          per_km_rate?: number
          polygon: Json
          updated_at?: string | null
        }
        Update: {
          base_fee?: number
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_distance_km?: number
          max_time_minutes?: number
          min_time_minutes?: number
          name?: string
          per_km_rate?: number
          polygon?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          created_at: string
          device_hash: string
          first_seen: string
          id: string
          ip_address: unknown | null
          is_suspicious: boolean
          last_seen: string
          order_count: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_hash: string
          first_seen?: string
          id?: string
          ip_address?: unknown | null
          is_suspicious?: boolean
          last_seen?: string
          order_count?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_hash?: string
          first_seen?: string
          id?: string
          ip_address?: unknown | null
          is_suspicious?: boolean
          last_seen?: string
          order_count?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dispatch_offers: {
        Row: {
          courier_id: string
          created_at: string | null
          distance_km: number | null
          estimated_earnings_cents: number | null
          eta_minutes: number | null
          expires_at: string
          id: string
          order_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["dispatch_offer_status"]
        }
        Insert: {
          courier_id: string
          created_at?: string | null
          distance_km?: number | null
          estimated_earnings_cents?: number | null
          eta_minutes?: number | null
          expires_at: string
          id?: string
          order_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_offer_status"]
        }
        Update: {
          courier_id?: string
          created_at?: string | null
          distance_km?: number | null
          estimated_earnings_cents?: number | null
          eta_minutes?: number | null
          expires_at?: string
          id?: string
          order_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["dispatch_offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_fees: {
        Row: {
          conditions: Json
          created_at: string | null
          fee_type: string
          fee_value: number
          id: string
          is_active: boolean
          max_order_value: number | null
          min_order_value: number | null
          name: string
          priority: number | null
          type: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          conditions: Json
          created_at?: string | null
          fee_type: string
          fee_value: number
          id?: string
          is_active?: boolean
          max_order_value?: number | null
          min_order_value?: number | null
          name: string
          priority?: number | null
          type: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string | null
          fee_type?: string
          fee_value?: number
          id?: string
          is_active?: boolean
          max_order_value?: number | null
          min_order_value?: number | null
          name?: string
          priority?: number | null
          type?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      gdpr_erasure_queue: {
        Row: {
          erasure_type: string
          id: string
          notes: string | null
          process_after: string
          processed_at: string | null
          reason: string
          requested_at: string | null
          requested_by_admin: string
          status: string
          user_id: string
        }
        Insert: {
          erasure_type?: string
          id?: string
          notes?: string | null
          process_after: string
          processed_at?: string | null
          reason: string
          requested_at?: string | null
          requested_by_admin: string
          status?: string
          user_id: string
        }
        Update: {
          erasure_type?: string
          id?: string
          notes?: string | null
          process_after?: string
          processed_at?: string | null
          reason?: string
          requested_at?: string | null
          requested_by_admin?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      kitchen_tickets: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          menu_item_id: string
          notes: string | null
          order_id: string
          priority: number
          quantity: number
          restaurant_id: string
          station: string | null
          status: Database["public"]["Enums"]["kitchen_ticket_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          priority?: number
          quantity: number
          restaurant_id: string
          station?: string | null
          status?: Database["public"]["Enums"]["kitchen_ticket_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          priority?: number
          quantity?: number
          restaurant_id?: string
          station?: string | null
          status?: Database["public"]["Enums"]["kitchen_ticket_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_tickets_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          description: string | null
          earned_from: string | null
          expires_at: string | null
          id: string
          order_id: string | null
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          earned_from?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          earned_from?: string | null
          expires_at?: string | null
          id?: string
          order_id?: string | null
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_per_real: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_per_real?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_per_real?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          id: string
          order_id: string | null
          points_used: number
          redeemed_at: string | null
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          points_used: number
          redeemed_at?: string | null
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          order_id?: string | null
          points_used?: number
          redeemed_at?: string | null
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string | null
          current_uses: number | null
          description: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          points_required: number
          reward_type: string
          reward_value: number
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          points_required: number
          reward_type: string
          reward_value: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          points_required?: number
          reward_type?: string
          reward_value?: number
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      markup_configurations: {
        Row: {
          basket_max_increase_percent: number | null
          cover_payment_fees: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_item_increase_percent: number | null
          max_markup_amount: number | null
          payment_fee_fixed: number | null
          payment_fee_rate: number | null
          restaurant_id: string
          rounding_type: string | null
          service_fee_percent: number | null
          updated_at: string | null
        }
        Insert: {
          basket_max_increase_percent?: number | null
          cover_payment_fees?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_item_increase_percent?: number | null
          max_markup_amount?: number | null
          payment_fee_fixed?: number | null
          payment_fee_rate?: number | null
          restaurant_id: string
          rounding_type?: string | null
          service_fee_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          basket_max_increase_percent?: number | null
          cover_payment_fees?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_item_increase_percent?: number | null
          max_markup_amount?: number | null
          payment_fee_fixed?: number | null
          payment_fee_rate?: number | null
          restaurant_id?: string
          rounding_type?: string | null
          service_fee_percent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      markup_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          margin_type: string
          margin_value: number
          priority: number | null
          restaurant_id: string
          rule_type: string
          target_id: string | null
          time_conditions: Json | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          value_ranges: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          margin_type?: string
          margin_value: number
          priority?: number | null
          restaurant_id: string
          rule_type: string
          target_id?: string | null
          time_conditions?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value_ranges?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          margin_type?: string
          margin_value?: number
          priority?: number | null
          restaurant_id?: string
          rule_type?: string
          target_id?: string | null
          time_conditions?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          value_ranges?: Json | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_combo_items: {
        Row: {
          combo_id: string
          created_at: string | null
          delta_price: number
          id: string
          item_id: string
          max_select: number | null
          min_select: number | null
          sort_order: number | null
        }
        Insert: {
          combo_id: string
          created_at?: string | null
          delta_price?: number
          id?: string
          item_id: string
          max_select?: number | null
          min_select?: number | null
          sort_order?: number | null
        }
        Update: {
          combo_id?: string
          created_at?: string | null
          delta_price?: number
          id?: string
          item_id?: string
          max_select?: number | null
          min_select?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "menu_combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_combo_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_combos: {
        Row: {
          base_price: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          restaurant_id: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          restaurant_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          restaurant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_combos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_option_groups: {
        Row: {
          created_at: string | null
          item_id: string
          option_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          item_id: string
          option_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          item_id?: string
          option_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_option_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_option_groups_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_options"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_option_values: {
        Row: {
          created_at: string | null
          delta_price: number
          id: string
          is_active: boolean
          option_id: string
          sort_order: number | null
          value: string
        }
        Insert: {
          created_at?: string | null
          delta_price?: number
          id?: string
          is_active?: boolean
          option_id: string
          sort_order?: number | null
          value: string
        }
        Update: {
          created_at?: string | null
          delta_price?: number
          id?: string
          is_active?: boolean
          option_id?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_options"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_options: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          max_select: number | null
          min_select: number | null
          name: string
          required: boolean
          restaurant_id: string
          type: Database["public"]["Enums"]["option_group_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_select?: number | null
          min_select?: number | null
          name: string
          required?: boolean
          restaurant_id: string
          type?: Database["public"]["Enums"]["option_group_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          max_select?: number | null
          min_select?: number | null
          name?: string
          required?: boolean
          restaurant_id?: string
          type?: Database["public"]["Enums"]["option_group_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_options_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_variants: {
        Row: {
          created_at: string | null
          delta_price: number
          id: string
          is_active: boolean
          item_id: string
          name: string
          sku: string | null
          sort_order: number | null
          stock: number | null
          track_stock: boolean
        }
        Insert: {
          created_at?: string | null
          delta_price?: number
          id?: string
          is_active?: boolean
          item_id: string
          name: string
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          track_stock?: boolean
        }
        Update: {
          created_at?: string | null
          delta_price?: number
          id?: string
          is_active?: boolean
          item_id?: string
          name?: string
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          track_stock?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          barcode: string | null
          base_price: number
          calories: number | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_active: boolean | null
          is_gluten_free: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          max_qty: number | null
          min_qty: number | null
          name: string
          preparation_time: number | null
          price: number
          restaurant_id: string
          schedule_json: Json | null
          sku: string | null
          stock: number | null
          tags: string[] | null
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          barcode?: string | null
          base_price: number
          calories?: number | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          max_qty?: number | null
          min_qty?: number | null
          name: string
          preparation_time?: number | null
          price: number
          restaurant_id: string
          schedule_json?: Json | null
          sku?: string | null
          stock?: number | null
          tags?: string[] | null
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          barcode?: string | null
          base_price?: number
          calories?: number | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean | null
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          max_qty?: number | null
          min_qty?: number | null
          name?: string
          preparation_time?: number | null
          price?: number
          restaurant_id?: string
          schedule_json?: Json | null
          sku?: string | null
          stock?: number | null
          tags?: string[] | null
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_menu_items_restaurant"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_capacity: {
        Row: {
          auto_accept: boolean
          auto_reject_when_queue_gt: number | null
          created_at: string | null
          is_busy: boolean
          max_parallel_orders: number | null
          prep_time_base_minutes: number
          prep_time_busy_minutes: number
          store_id: string
          surge_prep_increment: number
          updated_at: string | null
        }
        Insert: {
          auto_accept?: boolean
          auto_reject_when_queue_gt?: number | null
          created_at?: string | null
          is_busy?: boolean
          max_parallel_orders?: number | null
          prep_time_base_minutes?: number
          prep_time_busy_minutes?: number
          store_id: string
          surge_prep_increment?: number
          updated_at?: string | null
        }
        Update: {
          auto_accept?: boolean
          auto_reject_when_queue_gt?: number | null
          created_at?: string | null
          is_busy?: boolean
          max_parallel_orders?: number | null
          prep_time_base_minutes?: number
          prep_time_busy_minutes?: number
          store_id?: string
          surge_prep_increment?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_capacity_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_documents: {
        Row: {
          created_at: string
          file_url: string
          id: string
          merchant_id: string
          mime: string
          size_bytes: number
          type: Database["public"]["Enums"]["merchant_doc_type"]
          verified: boolean
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          merchant_id: string
          mime: string
          size_bytes: number
          type: Database["public"]["Enums"]["merchant_doc_type"]
          verified?: boolean
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          merchant_id?: string
          mime?: string
          size_bytes?: number
          type?: Database["public"]["Enums"]["merchant_doc_type"]
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "merchant_documents_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_reviews_log: {
        Row: {
          actor: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["merchant_status"] | null
          id: string
          merchant_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["merchant_status"]
        }
        Insert: {
          actor?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["merchant_status"] | null
          id?: string
          merchant_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["merchant_status"]
        }
        Update: {
          actor?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["merchant_status"] | null
          id?: string
          merchant_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["merchant_status"]
        }
        Relationships: [
          {
            foreignKeyName: "merchant_reviews_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address_json: Json
          approved_at: string | null
          banner_url: string | null
          cnpj: string
          created_at: string
          email: string
          id: string
          legal_name: string
          logo_url: string | null
          owner_user_id: string
          phone: string
          rejection_reason: string | null
          responsible_cpf: string
          responsible_name: string
          status: Database["public"]["Enums"]["merchant_status"]
          submitted_at: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          address_json: Json
          approved_at?: string | null
          banner_url?: string | null
          cnpj: string
          created_at?: string
          email: string
          id?: string
          legal_name: string
          logo_url?: string | null
          owner_user_id: string
          phone: string
          rejection_reason?: string | null
          responsible_cpf: string
          responsible_name: string
          status?: Database["public"]["Enums"]["merchant_status"]
          submitted_at?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          address_json?: Json
          approved_at?: string | null
          banner_url?: string | null
          cnpj?: string
          created_at?: string
          email?: string
          id?: string
          legal_name?: string
          logo_url?: string | null
          owner_user_id?: string
          phone?: string
          rejection_reason?: string | null
          responsible_cpf?: string
          responsible_name?: string
          status?: Database["public"]["Enums"]["merchant_status"]
          submitted_at?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          delivered_at: string | null
          id: string
          location_data: Json | null
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json | null
          read_at: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"]
          thread_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          location_data?: Json | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          read_at?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"]
          thread_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          location_data?: Json | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"]
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_assignments: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          courier_id: string
          created_at: string | null
          declined: boolean | null
          order_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          courier_id: string
          created_at?: string | null
          declined?: boolean | null
          order_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          courier_id?: string
          created_at?: string | null
          declined?: boolean | null
          order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: []
      }
      order_locations: {
        Row: {
          accuracy: number | null
          bearing: number | null
          courier_id: string
          distance_km: number | null
          eta_min: number | null
          id: string
          latitude: number
          location: unknown | null
          longitude: number
          order_id: string
          speed: number | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          bearing?: number | null
          courier_id: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          latitude: number
          location?: unknown | null
          longitude: number
          order_id: string
          speed?: number | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          bearing?: number | null
          courier_id?: string
          distance_km?: number | null
          eta_min?: number | null
          id?: string
          latitude?: number
          location?: unknown | null
          longitude?: number
          order_id?: string
          speed?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pod: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          method: string
          order_id: string
          otp_code: string | null
          photo_url: string | null
          qr_payload: string | null
          signature_url: string | null
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          method: string
          order_id: string
          otp_code?: string | null
          photo_url?: string | null
          qr_payload?: string | null
          signature_url?: string | null
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          method?: string
          order_id?: string
          otp_code?: string | null
          photo_url?: string | null
          qr_payload?: string | null
          signature_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_pod_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          arrive_radius_client_m: number | null
          courier_id: string | null
          created_at: string
          delivery_address: Json
          delivery_location: Json | null
          delivery_slot_end: string | null
          delivery_slot_start: string | null
          estimated_delivery_time: string | null
          id: string
          items: Json
          pickup_location: Json | null
          restaurant_address: Json
          restaurant_id: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_history: Json | null
          status_updated_at: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          arrive_radius_client_m?: number | null
          courier_id?: string | null
          created_at?: string
          delivery_address: Json
          delivery_location?: Json | null
          delivery_slot_end?: string | null
          delivery_slot_start?: string | null
          estimated_delivery_time?: string | null
          id?: string
          items: Json
          pickup_location?: Json | null
          restaurant_address: Json
          restaurant_id: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json | null
          status_updated_at?: string | null
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          arrive_radius_client_m?: number | null
          courier_id?: string | null
          created_at?: string
          delivery_address?: Json
          delivery_location?: Json | null
          delivery_slot_end?: string | null
          delivery_slot_start?: string | null
          estimated_delivery_time?: string | null
          id?: string
          items?: Json
          pickup_location?: Json | null
          restaurant_address?: Json
          restaurant_id?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json | null
          status_updated_at?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          order_id: string
          payment_method: string
          pix_copy_paste: string | null
          pix_qr_code: string | null
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          payment_method: string
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_method?: string
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          failure_reason: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          receipt_url: string | null
          refunded_amount: number | null
          status: string
          stripe_event_id: string | null
          stripe_payment_intent_id: string
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          receipt_url?: string | null
          refunded_amount?: number | null
          status: string
          stripe_event_id?: string | null
          stripe_payment_intent_id: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          receipt_url?: string | null
          refunded_amount?: number | null
          status?: string
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          config_data: Json
          config_type: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          config_data: Json
          config_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          config_data?: Json
          config_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pricing_snapshots: {
        Row: {
          calculation_steps: Json
          created_at: string | null
          created_by: string | null
          final_result: Json
          id: string
          input_data: Json
          order_id: string | null
          restaurant_id: string
          rules_applied: Json
        }
        Insert: {
          calculation_steps: Json
          created_at?: string | null
          created_by?: string | null
          final_result: Json
          id?: string
          input_data: Json
          order_id?: string | null
          restaurant_id: string
          rules_applied: Json
        }
        Update: {
          calculation_steps?: Json
          created_at?: string | null
          created_by?: string | null
          final_result?: Json
          id?: string
          input_data?: Json
          order_id?: string | null
          restaurant_id?: string
          rules_applied?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_number: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          applicable_to: Json | null
          code: string
          created_at: string | null
          description: string | null
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_value: number | null
          name: string
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          usage_limit_per_user: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_to?: Json | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_value?: number | null
          name: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_to?: Json | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_value?: number | null
          name?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_type: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_type?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_type?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          active: boolean
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          file_size: number | null
          file_url: string | null
          format: string | null
          id: string
          name: string
          parameters: Json | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          format?: string | null
          id?: string
          name: string
          parameters?: Json | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          format?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      restaurant_analytics: {
        Row: {
          created_at: string | null
          date_recorded: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          restaurant_id: string
        }
        Update: {
          created_at?: string | null
          date_recorded?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_analytics_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_financial_summary: {
        Row: {
          cashback_contribution_cents: number
          commission_cents: number
          created_at: string
          gross_revenue_cents: number
          id: string
          monthly_fee_cents: number
          net_revenue_cents: number
          online_payment_fees_cents: number
          period_end: string
          period_start: string
          restaurant_id: string
          total_orders: number
          updated_at: string
        }
        Insert: {
          cashback_contribution_cents?: number
          commission_cents?: number
          created_at?: string
          gross_revenue_cents?: number
          id?: string
          monthly_fee_cents?: number
          net_revenue_cents?: number
          online_payment_fees_cents?: number
          period_end: string
          period_start: string
          restaurant_id: string
          total_orders?: number
          updated_at?: string
        }
        Update: {
          cashback_contribution_cents?: number
          commission_cents?: number
          created_at?: string
          gross_revenue_cents?: number
          id?: string
          monthly_fee_cents?: number
          net_revenue_cents?: number
          online_payment_fees_cents?: number
          period_end?: string
          period_start?: string
          restaurant_id?: string
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_financial_summary_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_plans: {
        Row: {
          commission_rate: number
          created_at: string
          delivery_included: boolean
          description: string | null
          id: string
          is_active: boolean
          monthly_fee_cents: number
          monthly_fee_threshold_cents: number | null
          name: string
          online_payment_rate: number
          plan_type: Database["public"]["Enums"]["restaurant_plan_type"]
          updated_at: string
        }
        Insert: {
          commission_rate: number
          created_at?: string
          delivery_included?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_fee_cents: number
          monthly_fee_threshold_cents?: number | null
          name: string
          online_payment_rate?: number
          plan_type: Database["public"]["Enums"]["restaurant_plan_type"]
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          delivery_included?: boolean
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_fee_cents?: number
          monthly_fee_threshold_cents?: number | null
          name?: string
          online_payment_rate?: number
          plan_type?: Database["public"]["Enums"]["restaurant_plan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_subscriptions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          is_active: boolean
          monthly_revenue_cents: number
          plan_id: string
          restaurant_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_revenue_cents?: number
          plan_id: string
          restaurant_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          monthly_revenue_cents?: number
          plan_id?: string
          restaurant_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "restaurant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: Json
          arrive_radius_m: number | null
          city: string | null
          complement: string | null
          created_at: string
          cuisine_type: string
          delivery_fee: number
          delivery_time_max: number | null
          delivery_time_min: number | null
          description: string | null
          email: string | null
          estimated_delivery_time: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_open: boolean | null
          latitude: number | null
          location: unknown | null
          longitude: number | null
          minimum_order: number | null
          name: string
          neighborhood: string | null
          notification_settings: Json | null
          number: string | null
          opening_hours: Json | null
          owner_id: string | null
          payment_settings: Json | null
          phone: string | null
          rating: number | null
          score: number | null
          state: string | null
          street: string | null
          submitted_for_review_at: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address: Json
          arrive_radius_m?: number | null
          city?: string | null
          complement?: string | null
          created_at?: string
          cuisine_type: string
          delivery_fee?: number
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          email?: string | null
          estimated_delivery_time?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          minimum_order?: number | null
          name: string
          neighborhood?: string | null
          notification_settings?: Json | null
          number?: string | null
          opening_hours?: Json | null
          owner_id?: string | null
          payment_settings?: Json | null
          phone?: string | null
          rating?: number | null
          score?: number | null
          state?: string | null
          street?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: Json
          arrive_radius_m?: number | null
          city?: string | null
          complement?: string | null
          created_at?: string
          cuisine_type?: string
          delivery_fee?: number
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          email?: string | null
          estimated_delivery_time?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          latitude?: number | null
          location?: unknown | null
          longitude?: number | null
          minimum_order?: number | null
          name?: string
          neighborhood?: string | null
          notification_settings?: Json | null
          number?: string | null
          opening_hours?: Json | null
          owner_id?: string | null
          payment_settings?: Json | null
          phone?: string | null
          rating?: number | null
          score?: number | null
          state?: string | null
          street?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean
          order_id: string
          stars: number
          target_id: string
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          order_id: string
          stars: number
          target_id: string
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          order_id?: string
          stars?: number
          target_id?: string
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_carts: {
        Row: {
          cart_data: Json
          created_at: string
          expires_at: string
          id: string
          notification_sent: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cart_data: Json
          created_at?: string
          expires_at: string
          id?: string
          notification_sent?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          cart_data?: Json
          created_at?: string
          expires_at?: string
          id?: string
          notification_sent?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_filters: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          clicked_result_id: string | null
          filters: Json | null
          id: string
          results_count: number | null
          search_term: string
          searched_at: string | null
          user_id: string | null
        }
        Insert: {
          clicked_result_id?: string | null
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_term: string
          searched_at?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_result_id?: string | null
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_term?: string
          searched_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          is_verified: boolean | null
          phone_number: string
          user_id: string
          verification_code: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_verified?: boolean | null
          phone_number: string
          user_id: string
          verification_code: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          phone_number?: string
          user_id?: string
          verification_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      store_documents: {
        Row: {
          file_url: string
          id: string
          mime: string
          notes: string | null
          size_bytes: number
          store_id: string
          type: Database["public"]["Enums"]["store_doc_type"]
          uploaded_at: string | null
          verified: boolean
        }
        Insert: {
          file_url: string
          id?: string
          mime: string
          notes?: string | null
          size_bytes: number
          store_id: string
          type: Database["public"]["Enums"]["store_doc_type"]
          uploaded_at?: string | null
          verified?: boolean
        }
        Update: {
          file_url?: string
          id?: string
          mime?: string
          notes?: string | null
          size_bytes?: number
          store_id?: string
          type?: Database["public"]["Enums"]["store_doc_type"]
          uploaded_at?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "store_documents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          role: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["store_member_role"]
          store_id: string
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["store_member_role"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews_log: {
        Row: {
          actor: string | null
          created_at: string | null
          from_status: Database["public"]["Enums"]["store_status"] | null
          id: string
          reason: string | null
          store_id: string
          to_status: Database["public"]["Enums"]["store_status"] | null
        }
        Insert: {
          actor?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["store_status"] | null
          id?: string
          reason?: string | null
          store_id: string
          to_status?: Database["public"]["Enums"]["store_status"] | null
        }
        Update: {
          actor?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["store_status"] | null
          id?: string
          reason?: string | null
          store_id?: string
          to_status?: Database["public"]["Enums"]["store_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_units: {
        Row: {
          address: Json
          avg_prep_minutes: number | null
          cep: string | null
          city: string | null
          created_at: string
          geo_point: unknown
          id: string
          is_active: boolean
          location: unknown | null
          max_orders_per_hour: number
          merchant_id: string | null
          name: string
          neighborhood: string | null
          restaurant_id: string
          score: number | null
          state: string | null
          updated_at: string
          working_hours: Json
        }
        Insert: {
          address: Json
          avg_prep_minutes?: number | null
          cep?: string | null
          city?: string | null
          created_at?: string
          geo_point: unknown
          id?: string
          is_active?: boolean
          location?: unknown | null
          max_orders_per_hour?: number
          merchant_id?: string | null
          name: string
          neighborhood?: string | null
          restaurant_id: string
          score?: number | null
          state?: string | null
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          address?: Json
          avg_prep_minutes?: number | null
          cep?: string | null
          city?: string | null
          created_at?: string
          geo_point?: unknown
          id?: string
          is_active?: boolean
          location?: unknown | null
          max_orders_per_hour?: number
          merchant_id?: string | null
          name?: string
          neighborhood?: string | null
          restaurant_id?: string
          score?: number | null
          state?: string | null
          updated_at?: string
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "store_units_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: Json | null
          banner_url: string | null
          category: string | null
          cnpj: string
          created_at: string | null
          created_by: string
          delivery_radius_km: number | null
          description: string | null
          email: string | null
          id: string
          ie: string | null
          is_open: boolean | null
          latitude: number | null
          location: unknown | null
          logo_url: string | null
          longitude: number | null
          min_order: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          prep_time_minutes: number | null
          pricing_settings: Json | null
          rejection_reason: string | null
          slug: string | null
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          banner_url?: string | null
          category?: string | null
          cnpj: string
          created_at?: string | null
          created_by: string
          delivery_radius_km?: number | null
          description?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          is_open?: boolean | null
          latitude?: number | null
          location?: unknown | null
          logo_url?: string | null
          longitude?: number | null
          min_order?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          prep_time_minutes?: number | null
          pricing_settings?: Json | null
          rejection_reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          banner_url?: string | null
          category?: string | null
          cnpj?: string
          created_at?: string | null
          created_by?: string
          delivery_radius_km?: number | null
          description?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          is_open?: boolean | null
          latitude?: number | null
          location?: unknown | null
          logo_url?: string | null
          longitude?: number | null
          min_order?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          prep_time_minutes?: number | null
          pricing_settings?: Json | null
          rejection_reason?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string | null
          data: Json
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          benefits: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
        }
        Insert: {
          benefits: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price: number
          name: string
        }
        Update: {
          benefits?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          number: string | null
          state: string
          street: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          number?: string | null
          state: string
          street: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          block_type: string
          blocked_at: string
          blocked_until: string
          cancelled_orders_count: number | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reason: string
          user_id: string
        }
        Insert: {
          block_type?: string
          blocked_at?: string
          blocked_until: string
          cancelled_orders_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reason: string
          user_id: string
        }
        Update: {
          block_type?: string
          blocked_at?: string
          blocked_until?: string
          cancelled_orders_count?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy_km: number | null
          address_text: string | null
          city: string | null
          consent_given: boolean
          consent_timestamp: string | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          neighborhood: string | null
          source: string
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_km?: number | null
          address_text?: string | null
          city?: string | null
          consent_given?: boolean
          consent_timestamp?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          neighborhood?: string | null
          source: string
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_km?: number | null
          address_text?: string | null
          city?: string | null
          consent_given?: boolean
          consent_timestamp?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          neighborhood?: string | null
          source?: string
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          author_admin_id: string
          created_at: string | null
          id: string
          is_sensitive: boolean | null
          note: string
          target_user_id: string
        }
        Insert: {
          author_admin_id: string
          created_at?: string | null
          id?: string
          is_sensitive?: boolean | null
          note: string
          target_user_id: string
        }
        Update: {
          author_admin_id?: string
          created_at?: string | null
          id?: string
          is_sensitive?: boolean | null
          note?: string
          target_user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          id: string
          is_online: boolean
          is_typing: boolean
          last_seen: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          is_typing?: boolean
          last_seen?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          is_typing?: boolean
          last_seen?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suspensions: {
        Row: {
          created_at: string | null
          created_by_admin: string
          ends_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          starts_at: string | null
          target_user_id: string
          type: Database["public"]["Enums"]["user_enforcement"]
        }
        Insert: {
          created_at?: string | null
          created_by_admin: string
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          starts_at?: string | null
          target_user_id: string
          type: Database["public"]["Enums"]["user_enforcement"]
        }
        Update: {
          created_at?: string | null
          created_by_admin?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          starts_at?: string | null
          target_user_id?: string
          type?: Database["public"]["Enums"]["user_enforcement"]
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      accept_dispatch_offer: {
        Args: { p_courier_id: string; p_offer_id: string }
        Returns: Json
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
          | {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
        Returns: string
      }
      apply_gdpr_anonymization: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      apply_psychological_rounding: {
        Args: { amount: number; rounding_type?: string }
        Returns: number
      }
      audit_function_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          function_name: string
          has_search_path: boolean
          security_status: string
        }[]
      }
      award_loyalty_points: {
        Args: {
          p_description?: string
          p_earned_from?: string
          p_order_id?: string
          p_points: number
          p_user_id: string
        }
        Returns: string
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_dynamic_pricing: {
        Args: { p_items: Json; p_restaurant_id: string }
        Returns: Json
      }
      calculate_eta: {
        Args: { distance_km: number }
        Returns: number
      }
      calculate_order_sla: {
        Args: { p_order_id: string }
        Returns: {
          order_id: string
          t_accept_minutes: number
          t_delivery_minutes: number
          t_prep_minutes: number
          t_wait_courier_minutes: number
          total_time_minutes: number
        }[]
      }
      cancel_unconfirmed_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_location_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_tracking_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
          | { column_name: string; schema_name: string; table_name: string }
          | { column_name: string; table_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      expire_courier_documents: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_nearby_couriers: {
        Args: {
          p_limit?: number
          p_radius_km?: number
          p_restaurant_id: string
        }
        Returns: {
          active_orders_count: number
          battery_level: number
          courier_id: string
          distance_km: number
          eta_minutes: number
        }[]
      }
      format_address_from_json: {
        Args: { address_json: Json }
        Returns: string
      }
      generate_delivery_confirmation_code: {
        Args: { p_customer_phone: string }
        Returns: string
      }
      generate_store_slug: {
        Args: { store_name: string }
        Returns: string
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_analytics_data: {
        Args: { days_back?: number }
        Returns: {
          avg_delivery_time: number
          monthly_data: Json
          orders_growth: number
          revenue_growth: number
          total_orders: number
          total_revenue: number
          total_users: number
        }[]
      }
      get_current_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          full_name: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_extensions: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
        }[]
      }
      get_file_url: {
        Args: { bucket_name: string; file_path: string }
        Returns: string
      }
      get_mapbox_token: {
        Args: Record<PropertyKey, never>
        Returns: {
          token: string
        }[]
      }
      get_nearby_couriers: {
        Args: {
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_radius_km?: number
        }
        Returns: {
          battery_pct: number
          courier_id: string
          distance_km: number
          last_seen: string
        }[]
      }
      get_nearest_store_unit: {
        Args: {
          restaurant_id_param: string
          user_lat: number
          user_lng: number
        }
        Returns: {
          distance_km: number
          estimated_time_minutes: number
          store_id: string
        }[]
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      get_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_restaurants: number
          avg_delivery_time: number
          orders_today: number
          total_orders: number
          total_restaurants: number
          total_users: number
        }[]
      }
      get_user_activity_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_order_value: number
          full_name: string
          last_order_date: string
          total_orders: number
          total_spent: number
          user_id: string
        }[]
      }
      get_user_loyalty_balance: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_admin_role: {
        Args: { required_role: Database["public"]["Enums"]["admin_role"] }
        Returns: boolean
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_restaurant_open: {
        Args: { opening_hours: Json }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      log_security_violation: {
        Args: { details?: Json; violation_type: string }
        Returns: undefined
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_message_as_read: {
        Args: { message_id: string; reader_id: string }
        Returns: boolean
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: string
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      process_stripe_webhook: {
        Args: { p_event_data: Json; p_event_id: string; p_event_type: string }
        Returns: Json
      }
      schedule_data_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_restaurants_basic: {
        Args: {
          lat_param: number
          limit_param: number
          lng_param: number
          only_open_param: boolean
          radius_km_param: number
        }
        Returns: {
          city: string
          cuisine_type: string
          description: string
          distance_km: number
          id: string
          image_url: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood: string
          opening_hours: Json
          score: number
          state: string
        }[]
      }
      search_restaurants_by_city: {
        Args: {
          limit_count?: number
          open_only?: boolean
          radius_km?: number
          search_query?: string
          target_city?: string
          user_lat: number
          user_lng: number
        }
        Returns: {
          address: Json
          city: string
          cuisine_type: string
          delivery_fee: number
          delivery_time_max: number
          delivery_time_min: number
          description: string
          distance_km: number
          id: string
          image_url: string
          is_active: boolean
          is_open: boolean
          latitude: number
          longitude: number
          name: string
          rating: number
          score: number
          search_expanded: boolean
          state: string
        }[]
      }
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
          | {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { format?: string; geom: unknown }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; rel?: number }
          | { geom: unknown; maxdecimaldigits?: number; rel?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; options?: string; radius: number }
          | { geom: unknown; quadsegs: number; radius: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { dm?: number; dx: number; dy: number; dz?: number; geom: unknown }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { font?: Json; letters: string }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { from_proj: string; geom: unknown; to_proj: string }
          | { from_proj: string; geom: unknown; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      update_order_status: {
        Args: {
          p_courier_id?: string
          p_new_status: string
          p_order_id: string
        }
        Returns: Json
      }
      update_order_status_v2: {
        Args: {
          p_actor_id?: string
          p_courier_id?: string
          p_new_status: string
          p_order_id: string
        }
        Returns: Json
      }
      update_order_status_v3: {
        Args:
          | {
              p_actor_id?: string
              p_actor_role?: string
              p_notes?: string
              p_order_id: string
              p_to_status: string
            }
          | {
              p_actor_id?: string
              p_new_status: Database["public"]["Enums"]["order_status"]
              p_order_id: string
              p_validation_data?: Json
            }
        Returns: Json
      }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
      validate_data_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          issue_count: number
          issue_type: string
          table_name: string
        }[]
      }
      validate_delivery_confirmation: {
        Args: {
          p_confirmation_code: string
          p_courier_id: string
          p_location_lat?: number
          p_location_lng?: number
          p_order_id: string
        }
        Returns: Json
      }
      validate_security_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          recommendation: string
          status: string
        }[]
      }
      verify_rls_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          security_level: string
          table_name: string
        }[]
      }
    }
    Enums: {
      admin_role: "SUPERADMIN" | "ADMIN" | "SUPPORT" | "AUDITOR"
      courier_status:
        | "DRAFT"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      delivery_status:
        | "created"
        | "accepted"
        | "picked_up"
        | "in_transit"
        | "arrived"
        | "delivered"
        | "cancelled"
      dispatch_offer_status:
        | "PENDING"
        | "ACCEPTED"
        | "DECLINED"
        | "EXPIRED"
        | "CANCELLED"
      doc_type:
        | "CNH_FRENTE"
        | "CNH_VERSO"
        | "SELFIE"
        | "CPF_RG"
        | "COMPROVANTE_ENDERECO"
        | "CRLV"
        | "FOTO_VEICULO"
        | "FOTO_PLACA"
      earning_type: "BASE" | "BONUS" | "SURGE" | "REFUND" | "ADJUST"
      kitchen_ticket_status: "QUEUED" | "IN_PROGRESS" | "READY" | "SERVED"
      merchant_doc_type:
        | "CNPJ"
        | "CONTRATO_SOCIAL"
        | "ALVARA"
        | "VISA_SANITARIA"
        | "ENDERECO"
        | "LOGO"
        | "BANNER"
      merchant_status:
        | "DRAFT"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "location" | "system"
      option_group_type: "SINGLE" | "MULTI"
      order_status:
        | "placed"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "pending_payment"
        | "courier_assigned"
        | "en_route_to_store"
        | "picked_up"
        | "arrived_at_destination"
      order_status_v2:
        | "PLACED"
        | "CONFIRMED"
        | "PREPARING"
        | "READY"
        | "COURIER_ASSIGNED"
        | "EN_ROUTE_TO_STORE"
        | "PICKED_UP"
        | "OUT_FOR_DELIVERY"
        | "ARRIVED_AT_DESTINATION"
        | "DELIVERED"
        | "CANCELLED"
      pix_key_type: "CPF" | "PHONE" | "EMAIL" | "EVP"
      restaurant_plan_type: "BASIC" | "DELIVERY"
      store_doc_type:
        | "CNPJ"
        | "IE"
        | "CONTRATO_SOCIAL"
        | "LOGO"
        | "ALVARA"
        | "ENDERECO_COMPROV"
        | "FOTO_FACHADA"
      store_member_role: "OWNER" | "MANAGER" | "STAFF"
      store_status:
        | "DRAFT"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      user_enforcement: "WARN" | "SUSPEND" | "BAN"
      user_role: "client" | "restaurant" | "courier" | "admin" | "seller"
      zone_shape: "RADIUS" | "POLYGON"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["SUPERADMIN", "ADMIN", "SUPPORT", "AUDITOR"],
      courier_status: [
        "DRAFT",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      delivery_status: [
        "created",
        "accepted",
        "picked_up",
        "in_transit",
        "arrived",
        "delivered",
        "cancelled",
      ],
      dispatch_offer_status: [
        "PENDING",
        "ACCEPTED",
        "DECLINED",
        "EXPIRED",
        "CANCELLED",
      ],
      doc_type: [
        "CNH_FRENTE",
        "CNH_VERSO",
        "SELFIE",
        "CPF_RG",
        "COMPROVANTE_ENDERECO",
        "CRLV",
        "FOTO_VEICULO",
        "FOTO_PLACA",
      ],
      earning_type: ["BASE", "BONUS", "SURGE", "REFUND", "ADJUST"],
      kitchen_ticket_status: ["QUEUED", "IN_PROGRESS", "READY", "SERVED"],
      merchant_doc_type: [
        "CNPJ",
        "CONTRATO_SOCIAL",
        "ALVARA",
        "VISA_SANITARIA",
        "ENDERECO",
        "LOGO",
        "BANNER",
      ],
      merchant_status: [
        "DRAFT",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      message_status: ["sent", "delivered", "read"],
      message_type: ["text", "image", "location", "system"],
      option_group_type: ["SINGLE", "MULTI"],
      order_status: [
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "pending_payment",
        "courier_assigned",
        "en_route_to_store",
        "picked_up",
        "arrived_at_destination",
      ],
      order_status_v2: [
        "PLACED",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COURIER_ASSIGNED",
        "EN_ROUTE_TO_STORE",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "ARRIVED_AT_DESTINATION",
        "DELIVERED",
        "CANCELLED",
      ],
      pix_key_type: ["CPF", "PHONE", "EMAIL", "EVP"],
      restaurant_plan_type: ["BASIC", "DELIVERY"],
      store_doc_type: [
        "CNPJ",
        "IE",
        "CONTRATO_SOCIAL",
        "LOGO",
        "ALVARA",
        "ENDERECO_COMPROV",
        "FOTO_FACHADA",
      ],
      store_member_role: ["OWNER", "MANAGER", "STAFF"],
      store_status: [
        "DRAFT",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      user_enforcement: ["WARN", "SUSPEND", "BAN"],
      user_role: ["client", "restaurant", "courier", "admin", "seller"],
      zone_shape: ["RADIUS", "POLYGON"],
    },
  },
} as const
