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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["category_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          assigned_to: string | null
          body: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_whatsapp: string | null
          id: string
          source: Database["public"]["Enums"]["message_source"]
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          body: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          id?: string
          source?: Database["public"]["Enums"]["message_source"]
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          body?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          id?: string
          source?: Database["public"]["Enums"]["message_source"]
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          order_id: string | null
          quantity_delta: number
          reason: string
          reserved_after: number
          reserved_before: number
          stock_after: number
          stock_before: number
          type: Database["public"]["Enums"]["inventory_transaction_type"]
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          quantity_delta: number
          reason: string
          reserved_after: number
          reserved_before: number
          stock_after: number
          stock_before: number
          type: Database["public"]["Enums"]["inventory_transaction_type"]
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          quantity_delta?: number
          reason?: string
          reserved_after?: number
          reserved_before?: number
          stock_after?: number
          stock_before?: number
          type?: Database["public"]["Enums"]["inventory_transaction_type"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          payload: Json
          processed_at: string | null
          provider_message_id: string | null
          recipient: string
          scheduled_at: string
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          template_key: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total_price_xof: number
          unit_price_xof: number
          updated_at: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          sku?: string | null
          total_price_xof: number
          unit_price_xof: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total_price_xof?: number
          unit_price_xof?: number
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_note: string | null
          customer_phone: string | null
          customer_whatsapp: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_area: string | null
          delivery_city: string
          delivery_commune: string | null
          delivery_country: string
          delivery_fee_xof: number
          delivery_instructions: string | null
          delivery_landmark: string | null
          delivery_method: string
          discount_xof: number
          id: string
          internal_note: string | null
          order_number: string
          out_for_delivery_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          prepared_at: string | null
          ready_at: string | null
          returned_at: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal_xof: number
          total_xof: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_note?: string | null
          customer_phone?: string | null
          customer_whatsapp?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_area?: string | null
          delivery_city: string
          delivery_commune?: string | null
          delivery_country?: string
          delivery_fee_xof?: number
          delivery_instructions?: string | null
          delivery_landmark?: string | null
          delivery_method: string
          discount_xof?: number
          id?: string
          internal_note?: string | null
          order_number: string
          out_for_delivery_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prepared_at?: string | null
          ready_at?: string | null
          returned_at?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_xof?: number
          total_xof?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string | null
          customer_whatsapp?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_area?: string | null
          delivery_city?: string
          delivery_commune?: string | null
          delivery_country?: string
          delivery_fee_xof?: number
          delivery_instructions?: string | null
          delivery_landmark?: string | null
          delivery_method?: string
          discount_xof?: number
          id?: string
          internal_note?: string | null
          order_number?: string
          out_for_delivery_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          prepared_at?: string | null
          ready_at?: string | null
          returned_at?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_xof?: number
          total_xof?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_xof: number
          created_at: string
          id: string
          metadata: Json
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider: string | null
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_xof: number
          created_at?: string
          id?: string
          metadata?: Json
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_xof?: number
          created_at?: string
          id?: string
          metadata?: Json
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_image_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          created_by: string | null
          declared_byte_size: number
          declared_mime_type: string
          expires_at: string
          finalized_at: string | null
          id: string
          object_path: string
          product_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          created_by?: string | null
          declared_byte_size: number
          declared_mime_type: string
          expires_at?: string
          finalized_at?: string | null
          id?: string
          object_path: string
          product_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          created_by?: string | null
          declared_byte_size?: number
          declared_mime_type?: string
          expires_at?: string
          finalized_at?: string | null
          id?: string
          object_path?: string
          product_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_image_uploads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_uploads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_uploads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          active: boolean
          alt_text: string
          approved: boolean
          bucket_id: string
          byte_size: number | null
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          image_url: string | null
          is_primary: boolean
          mime_type: string | null
          object_path: string | null
          product_id: string
          sort_order: number
          storage_path: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          active?: boolean
          alt_text: string
          approved?: boolean
          bucket_id?: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          mime_type?: string | null
          object_path?: string | null
          product_id: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          active?: boolean
          alt_text?: string
          approved?: boolean
          bucket_id?: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_primary?: boolean
          mime_type?: string | null
          object_path?: string | null
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          compare_at_price_xof: number | null
          concentration: string | null
          cost_price_xof: number | null
          created_at: string
          id: string
          inventory_initialized_at: string | null
          low_stock_threshold: number
          price_xof: number
          product_id: string
          reserved_quantity: number
          size_ml: number
          sku: string
          stock_on_hand: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          compare_at_price_xof?: number | null
          concentration?: string | null
          cost_price_xof?: number | null
          created_at?: string
          id?: string
          inventory_initialized_at?: string | null
          low_stock_threshold?: number
          price_xof?: number
          product_id: string
          reserved_quantity?: number
          size_ml: number
          sku: string
          stock_on_hand?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          compare_at_price_xof?: number | null
          concentration?: string | null
          cost_price_xof?: number | null
          created_at?: string
          id?: string
          inventory_initialized_at?: string | null
          low_stock_threshold?: number
          price_xof?: number
          product_id?: string
          reserved_quantity?: number
          size_ml?: number
          sku?: string
          stock_on_hand?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_notes: string[]
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          featured: boolean
          fragrance_family: string | null
          gender_category: string | null
          heart_notes: string[]
          id: string
          name: string
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          top_notes: string[]
          updated_at: string
        }
        Insert: {
          base_notes?: string[]
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fragrance_family?: string | null
          gender_category?: string | null
          heart_notes?: string[]
          id?: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          top_notes?: string[]
          updated_at?: string
        }
        Update: {
          base_notes?: string[]
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          fragrance_family?: string | null
          gender_category?: string | null
          heart_notes?: string[]
          id?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          top_notes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["brand_id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["category_id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      store_content: {
        Row: {
          content: Json
          created_at: string
          page_key: string
          public_readable: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          page_key: string
          public_readable?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          page_key?: string
          public_readable?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_content_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_low_stock_threshold: number
          delivery_information: string | null
          facebook_url: string | null
          id: boolean
          instagram_url: string | null
          legal_name: string | null
          moov_money_number: string | null
          mtn_momo_number: string | null
          notification_email: string | null
          orange_money_number: string | null
          public_readable: boolean
          store_name: string
          tiktok_url: string | null
          updated_at: string
          wave_number: string | null
          whatsapp_number: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_low_stock_threshold?: number
          delivery_information?: string | null
          facebook_url?: string | null
          id?: boolean
          instagram_url?: string | null
          legal_name?: string | null
          moov_money_number?: string | null
          mtn_momo_number?: string | null
          notification_email?: string | null
          orange_money_number?: string | null
          public_readable?: boolean
          store_name: string
          tiktok_url?: string | null
          updated_at?: string
          wave_number?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_low_stock_threshold?: number
          delivery_information?: string | null
          facebook_url?: string | null
          id?: boolean
          instagram_url?: string | null
          legal_name?: string | null
          moov_money_number?: string | null
          mtn_momo_number?: string | null
          notification_email?: string | null
          orange_money_number?: string | null
          public_readable?: boolean
          store_name?: string
          tiktok_url?: string | null
          updated_at?: string
          wave_number?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      public_catalogue_images: {
        Row: {
          alt_text: string | null
          bucket_id: string | null
          byte_size: number | null
          created_at: string | null
          height: number | null
          id: string | null
          is_primary: boolean | null
          mime_type: string | null
          object_path: string | null
          product_id: string | null
          sort_order: number | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_catalogue_products: {
        Row: {
          base_notes: string[] | null
          brand_id: string | null
          brand_name: string | null
          brand_slug: string | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          fragrance_family: string | null
          gender_category: string | null
          heart_notes: string[] | null
          id: string | null
          name: string | null
          short_description: string | null
          slug: string | null
          top_notes: string[] | null
        }
        Relationships: []
      }
      public_catalogue_variants: {
        Row: {
          availability_status: string | null
          available_quantity: number | null
          compare_at_price_xof: number | null
          concentration: string | null
          id: string | null
          price_xof: number | null
          product_id: string | null
          size_ml: number | null
          sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_catalogue_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      initialize_variant_inventory: {
        Args: {
          initial_stock: number
          movement_reason?: string
          target_variant_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "OWNER"
        | "ADMIN"
        | "INVENTORY_MANAGER"
        | "ORDER_MANAGER"
        | "CUSTOMER_SUPPORT"
      inventory_transaction_type:
        | "RECEIVED"
        | "RESERVED"
        | "RELEASED"
        | "SOLD"
        | "RETURNED"
        | "DAMAGED"
        | "ADJUSTMENT"
      message_source:
        | "WEBSITE"
        | "INSTAGRAM"
        | "FACEBOOK"
        | "TIKTOK"
        | "WHATSAPP"
        | "PHONE"
        | "EMAIL"
        | "OTHER"
      message_status: "NEW" | "OPEN" | "RESOLVED" | "SPAM"
      notification_channel: "EMAIL" | "IN_APP"
      notification_status:
        | "PENDING"
        | "PROCESSING"
        | "SENT"
        | "FAILED"
        | "CANCELLED"
      order_source:
        | "WEBSITE"
        | "INSTAGRAM"
        | "FACEBOOK"
        | "TIKTOK"
        | "WHATSAPP"
        | "PHONE"
        | "PHYSICAL_STORE"
        | "OTHER"
      order_status:
        | "PENDING_CONFIRMATION"
        | "CONFIRMED"
        | "PREPARING"
        | "READY_FOR_PICKUP"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED"
        | "RETURNED"
      payment_method:
        | "CASH_ON_DELIVERY"
        | "ORANGE_MONEY"
        | "MTN_MOMO"
        | "WAVE"
        | "MOOV_MONEY"
        | "BANK_TRANSFER"
        | "PAY_IN_STORE"
      payment_status:
        | "UNPAID"
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "PARTIALLY_REFUNDED"
      product_status: "DRAFT" | "ACTIVE" | "ARCHIVED"
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
      app_role: [
        "OWNER",
        "ADMIN",
        "INVENTORY_MANAGER",
        "ORDER_MANAGER",
        "CUSTOMER_SUPPORT",
      ],
      inventory_transaction_type: [
        "RECEIVED",
        "RESERVED",
        "RELEASED",
        "SOLD",
        "RETURNED",
        "DAMAGED",
        "ADJUSTMENT",
      ],
      message_source: [
        "WEBSITE",
        "INSTAGRAM",
        "FACEBOOK",
        "TIKTOK",
        "WHATSAPP",
        "PHONE",
        "EMAIL",
        "OTHER",
      ],
      message_status: ["NEW", "OPEN", "RESOLVED", "SPAM"],
      notification_channel: ["EMAIL", "IN_APP"],
      notification_status: [
        "PENDING",
        "PROCESSING",
        "SENT",
        "FAILED",
        "CANCELLED",
      ],
      order_source: [
        "WEBSITE",
        "INSTAGRAM",
        "FACEBOOK",
        "TIKTOK",
        "WHATSAPP",
        "PHONE",
        "PHYSICAL_STORE",
        "OTHER",
      ],
      order_status: [
        "PENDING_CONFIRMATION",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      payment_method: [
        "CASH_ON_DELIVERY",
        "ORANGE_MONEY",
        "MTN_MOMO",
        "WAVE",
        "MOOV_MONEY",
        "BANK_TRANSFER",
        "PAY_IN_STORE",
      ],
      payment_status: [
        "UNPAID",
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      product_status: ["DRAFT", "ACTIVE", "ARCHIVED"],
    },
  },
} as const
