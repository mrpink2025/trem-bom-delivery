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
          seller_id: string
          updated_at: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean
          order_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean
          order_id?: string
          seller_id?: string
          updated_at?: string
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
      menu_items: {
        Row: {
          allergens: string[] | null
          calories: number | null
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_available: boolean | null
          is_gluten_free: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          name: string
          preparation_time: number | null
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          is_gluten_free?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      order_locations: {
        Row: {
          accuracy: number | null
          bearing: number | null
          courier_id: string
          id: string
          latitude: number
          longitude: number
          order_id: string
          speed: number | null
          timestamp: string | null
        }
        Insert: {
          accuracy?: number | null
          bearing?: number | null
          courier_id: string
          id?: string
          latitude: number
          longitude: number
          order_id: string
          speed?: number | null
          timestamp?: string | null
        }
        Update: {
          accuracy?: number | null
          bearing?: number | null
          courier_id?: string
          id?: string
          latitude?: number
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
      orders: {
        Row: {
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
          status: string
          status_history: Json | null
          status_updated_at: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
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
          status?: string
          status_history?: Json | null
          status_updated_at?: string | null
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
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
          status?: string
          status_history?: Json | null
          status_updated_at?: string | null
          stripe_session_id?: string | null
          total_amount?: number
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
          refunded_amount: number | null
          status: string
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
          refunded_amount?: number | null
          status: string
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
          refunded_amount?: number | null
          status?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
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
      restaurants: {
        Row: {
          address: Json
          created_at: string
          cuisine_type: string
          delivery_fee: number
          delivery_time_max: number | null
          delivery_time_min: number | null
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_open: boolean | null
          minimum_order: number | null
          name: string
          owner_id: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address: Json
          created_at?: string
          cuisine_type: string
          delivery_fee?: number
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          minimum_order?: number | null
          name: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: Json
          created_at?: string
          cuisine_type?: string
          delivery_fee?: number
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          minimum_order?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
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
      store_units: {
        Row: {
          address: Json
          created_at: string
          geo_point: unknown
          id: string
          is_active: boolean
          max_orders_per_hour: number
          name: string
          restaurant_id: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          address: Json
          created_at?: string
          geo_point: unknown
          id?: string
          is_active?: boolean
          max_orders_per_hour?: number
          name: string
          restaurant_id: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          address?: Json
          created_at?: string
          geo_point?: unknown
          id?: string
          is_active?: boolean
          max_orders_per_hour?: number
          name?: string
          restaurant_id?: string
          updated_at?: string
          working_hours?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_eta: {
        Args: { distance_km: number }
        Returns: number
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      mark_message_as_read: {
        Args: { message_id: string; reader_id: string }
        Returns: boolean
      }
      update_order_status: {
        Args: {
          p_courier_id?: string
          p_new_status: string
          p_order_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      delivery_status:
        | "created"
        | "accepted"
        | "picked_up"
        | "in_transit"
        | "arrived"
        | "delivered"
        | "cancelled"
      message_status: "sent" | "delivered" | "read"
      message_type: "text" | "image" | "location" | "system"
      order_status:
        | "placed"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      user_role: "client" | "restaurant" | "courier" | "admin" | "seller"
    }
    CompositeTypes: {
      [_ in never]: never
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
      delivery_status: [
        "created",
        "accepted",
        "picked_up",
        "in_transit",
        "arrived",
        "delivered",
        "cancelled",
      ],
      message_status: ["sent", "delivered", "read"],
      message_type: ["text", "image", "location", "system"],
      order_status: [
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      user_role: ["client", "restaurant", "courier", "admin", "seller"],
    },
  },
} as const
