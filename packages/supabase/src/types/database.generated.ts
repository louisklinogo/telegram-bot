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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          team_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          team_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          team_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          end_at: string | null
          id: string
          location: string | null
          notes: string | null
          reminder_at: string | null
          staff_user_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          team_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          reminder_at?: string | null
          staff_user_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          team_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          reminder_at?: string | null
          staff_user_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          line_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          line_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          line_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_allocations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          amount: number
          balance: number | null
          created_at: string
          description: string | null
          external_ref: string | null
          id: string
          occurred_at: string
          statement_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          created_at?: string
          description?: string | null
          external_ref?: string | null
          id?: string
          occurred_at: string
          statement_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          created_at?: string
          description?: string | null
          external_ref?: string | null
          id?: string
          occurred_at?: string
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          account_label: string | null
          closing_balance: number | null
          created_at: string
          currency: string
          id: string
          opening_balance: number | null
          period_end: string | null
          period_start: string | null
          source: string
          team_id: string
        }
        Insert: {
          account_label?: string | null
          closing_balance?: number | null
          created_at?: string
          currency?: string
          id?: string
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          source: string
          team_id: string
        }
        Update: {
          account_label?: string | null
          closing_balance?: number | null
          created_at?: string
          currency?: string
          id?: string
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          source?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          country: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          occupation: string | null
          phone: string | null
          referral_source: string | null
          tags: Json | null
          team_id: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          referral_source?: string | null
          tags?: Json | null
          team_id: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          address?: string | null
          company?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          referral_source?: string | null
          tags?: Json | null
          team_id?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_accounts: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          display_name: string | null
          external_id: string
          id: string
          provider: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          display_name?: string | null
          external_id: string
          id?: string
          provider: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          display_name?: string | null
          external_id?: string
          id?: string
          provider?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_accounts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          client_message_id: string | null
          content: string | null
          created_at: string
          delivered_at: string | null
          direction: string
          error: string | null
          id: string
          is_status: boolean
          meta: Json | null
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["comm_message_status"] | null
          team_id: string
          thread_id: string
          type: string
        }
        Insert: {
          client_message_id?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction: string
          error?: string | null
          id?: string
          is_status?: boolean
          meta?: Json | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_message_status"] | null
          team_id: string
          thread_id: string
          type: string
        }
        Update: {
          client_message_id?: string | null
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          is_status?: boolean
          meta?: Json | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["comm_message_status"] | null
          team_id?: string
          thread_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_outbox: {
        Row: {
          account_id: string
          caption: string | null
          client_message_id: string | null
          content: string
          created_at: string
          error: string | null
          id: string
          media_filename: string | null
          media_path: string | null
          media_type: string | null
          recipient: string
          status: string
          team_id: string
        }
        Insert: {
          account_id: string
          caption?: string | null
          client_message_id?: string | null
          content: string
          created_at?: string
          error?: string | null
          id?: string
          media_filename?: string | null
          media_path?: string | null
          media_type?: string | null
          recipient: string
          status?: string
          team_id: string
        }
        Update: {
          account_id?: string
          caption?: string | null
          client_message_id?: string | null
          content?: string
          created_at?: string
          error?: string | null
          id?: string
          media_filename?: string | null
          media_path?: string | null
          media_type?: string | null
          recipient?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbox_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "communication_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body: string | null
          category: string | null
          created_at: string
          external_id: string | null
          id: string
          locale: string | null
          name: string
          provider: string
          status: string | null
          team_id: string
          variables: Json | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          locale?: string | null
          name: string
          provider: string
          status?: string | null
          team_id: string
          variables?: Json | null
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          locale?: string | null
          name?: string
          provider?: string
          status?: string | null
          team_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_threads: {
        Row: {
          account_id: string
          assigned_user_id: string | null
          channel: string
          created_at: string
          customer_id: string | null
          external_contact_id: string
          id: string
          instagram_contact_id: string | null
          last_message_at: string | null
          status: string
          team_id: string
          updated_at: string
          whatsapp_contact_id: string | null
        }
        Insert: {
          account_id: string
          assigned_user_id?: string | null
          channel: string
          created_at?: string
          customer_id?: string | null
          external_contact_id: string
          id?: string
          instagram_contact_id?: string | null
          last_message_at?: string | null
          status?: string
          team_id: string
          updated_at?: string
          whatsapp_contact_id?: string | null
        }
        Update: {
          account_id?: string
          assigned_user_id?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          external_contact_id?: string
          id?: string
          instagram_contact_id?: string | null
          last_message_at?: string | null
          status?: string
          team_id?: string
          updated_at?: string
          whatsapp_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "communication_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_instagram_contact_id_fkey"
            columns: ["instagram_contact_id"]
            isOneToOne: false
            referencedRelation: "instagram_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_whatsapp_contact_id_fkey"
            columns: ["whatsapp_contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          order_id: string | null
          path_tokens: string[] | null
          processing_status: string | null
          size: number | null
          tags: string[] | null
          team_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          order_id?: string | null
          path_tokens?: string[] | null
          processing_status?: string | null
          size?: number | null
          tags?: string[] | null
          team_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          order_id?: string | null
          path_tokens?: string[] | null
          processing_status?: string | null
          size?: number | null
          tags?: string[] | null
          team_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_clients_id_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_invoice_id_invoices_id_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_order_id_orders_id_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_team_id_teams_id_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_users_id_fk"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          created_at: string
          currency: string
          external_id: string | null
          id: string
          name: string
          opening_balance: number | null
          provider: string | null
          status: string
          sync_cursor: string | null
          team_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          provider?: string | null
          status?: string
          sync_cursor?: string | null
          team_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          provider?: string | null
          status?: string
          sync_cursor?: string | null
          team_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_contacts: {
        Row: {
          created_at: string
          display_name: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          profile_pic_url: string | null
          team_id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          profile_pic_url?: string | null
          team_id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          profile_pic_url?: string | null
          team_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          name: string
          order_item_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          name: string
          order_item_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          name?: string
          order_item_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          discount: number | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_number: string
          invoice_url: string | null
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          paid_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax: number | null
          team_id: string
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number: string
          invoice_url?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax?: number | null
          team_id: string
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          discount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_number?: string
          invoice_url?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax?: number | null
          team_id?: string
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          client_id: string
          created_at: string
          deleted_at: string | null
          garment_type: string | null
          id: string
          is_active: boolean
          measurement_group_id: string | null
          measurements: Json
          notes: string | null
          previous_version_id: string | null
          record_name: string | null
          tags: string[] | null
          taken_at: string | null
          team_id: string
          updated_at: string
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          deleted_at?: string | null
          garment_type?: string | null
          id?: string
          is_active?: boolean
          measurement_group_id?: string | null
          measurements?: Json
          notes?: string | null
          previous_version_id?: string | null
          record_name?: string | null
          tags?: string[] | null
          taken_at?: string | null
          team_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          garment_type?: string | null
          id?: string
          is_active?: boolean
          measurement_group_id?: string | null
          measurements?: Json
          notes?: string | null
          previous_version_id?: string | null
          record_name?: string | null
          tags?: string[] | null
          taken_at?: string | null
          team_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_previous_version_id_measurements_id_fk"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          checksum: string | null
          content_type: string | null
          created_at: string
          id: string
          message_id: string
          size: number | null
          storage_path: string
        }
        Insert: {
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          message_id: string
          size?: number | null
          storage_path: string
        }
        Update: {
          checksum?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          message_id?: string
          size?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_delivery: {
        Row: {
          created_at: string
          id: string
          message_id: string
          provider_error_code: string | null
          retries: number | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          provider_error_code?: string | null
          retries?: number | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          provider_error_code?: string | null
          retries?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_delivery_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          id: string
          notification_type: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          balance_amount: number
          cancelled_at: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          deposit_amount: number
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          team_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          balance_amount?: number
          cancelled_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: Database["public"]["Enums"]["order_status"]
          team_id: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          balance_amount?: number
          cancelled_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          team_id?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          base_currency: string | null
          country: string | null
          created_at: string
          id: string
          locale: string | null
          name: string | null
          quiet_hours: string | null
          timezone: string | null
        }
        Insert: {
          base_currency?: string | null
          country?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          name?: string | null
          quiet_hours?: string | null
          timezone?: string | null
        }
        Update: {
          base_currency?: string | null
          country?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          name?: string | null
          quiet_hours?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      transaction_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_attachments: {
        Row: {
          checksum: string | null
          created_at: string
          id: string
          mime_type: string | null
          name: string
          path: string[]
          size: number | null
          team_id: string
          transaction_id: string
          type: string | null
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          path: string[]
          size?: number | null
          team_id: string
          transaction_id: string
          type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          path?: string[]
          size?: number | null
          team_id?: string
          transaction_id?: string
          type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          system: boolean
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          system?: boolean
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          system?: boolean
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_category_embeddings: {
        Row: {
          created_at: string
          embedding: string | null
          model: string
          name: string
          system: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          model?: string
          name: string
          system?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          model?: string
          name?: string
          system?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      transaction_embeddings: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          model: string
          source_text: string
          team_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          model?: string
          source_text: string
          team_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          model?: string
          source_text?: string
          team_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_embeddings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_embeddings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_embeddings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_embeddings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_enrichments: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          metadata: Json | null
          reviewed: boolean
          suggested_category_slug: string | null
          team_id: string
          transaction_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          suggested_category_slug?: string | null
          team_id: string
          transaction_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reviewed?: boolean
          suggested_category_slug?: string | null
          team_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_suggested_category"
            columns: ["team_id", "suggested_category_slug"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["team_id", "slug"]
          },
          {
            foreignKeyName: "transaction_enrichments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_enrichments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_enrichments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_enrichments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          team_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          team_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          team_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_income"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          assigned_id: string | null
          balance: number | null
          base_amount: number | null
          base_currency: string | null
          category: string | null
          category_slug: string | null
          client_id: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          date: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          enrichment_completed: boolean | null
          exclude_from_analytics: boolean
          frequency: Database["public"]["Enums"]["transaction_frequency"] | null
          fts_vector: unknown | null
          id: string
          internal_id: string
          invoice_id: string | null
          manual: boolean | null
          merchant_name: string | null
          name: string
          notes: string | null
          order_id: string | null
          payment_method: string | null
          payment_reference: string | null
          recurring: boolean | null
          status: Database["public"]["Enums"]["transaction_status"]
          team_id: string
          transaction_date: string
          transaction_number: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          assigned_id?: string | null
          balance?: number | null
          base_amount?: number | null
          base_currency?: string | null
          category?: string | null
          category_slug?: string | null
          client_id?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          date: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          enrichment_completed?: boolean | null
          exclude_from_analytics?: boolean
          frequency?:
            | Database["public"]["Enums"]["transaction_frequency"]
            | null
          fts_vector?: unknown | null
          id?: string
          internal_id: string
          invoice_id?: string | null
          manual?: boolean | null
          merchant_name?: string | null
          name: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          recurring?: boolean | null
          status?: Database["public"]["Enums"]["transaction_status"]
          team_id: string
          transaction_date?: string
          transaction_number: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          assigned_id?: string | null
          balance?: number | null
          base_amount?: number | null
          base_currency?: string | null
          category?: string | null
          category_slug?: string | null
          client_id?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          date?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          enrichment_completed?: boolean | null
          exclude_from_analytics?: boolean
          frequency?:
            | Database["public"]["Enums"]["transaction_frequency"]
            | null
          fts_vector?: unknown | null
          id?: string
          internal_id?: string
          invoice_id?: string | null
          manual?: boolean | null
          merchant_name?: string | null
          name?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          recurring?: boolean | null
          status?: Database["public"]["Enums"]["transaction_status"]
          team_id?: string
          transaction_date?: string
          transaction_number?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_financial_accounts_id_fk"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_assigned_user"
            columns: ["assigned_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_category"
            columns: ["team_id", "category_slug"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["team_id", "slug"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          code: string
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          current_team_id: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          current_team_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          current_team_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      users_on_team: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_on_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_on_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          metadata: Json | null
          phone: string | null
          profile_pic_url: string | null
          team_id: string
          updated_at: string
          wa_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          profile_pic_url?: string | null
          team_id: string
          updated_at?: string
          wa_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          metadata?: Json | null
          phone?: string | null
          profile_pic_url?: string | null
          team_id?: string
          updated_at?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      financial_summary: {
        Row: {
          month: string | null
          net_profit: number | null
          total_expenses: number | null
          total_income: number | null
        }
        Relationships: []
      }
      transactions_expenses: {
        Row: {
          amount: number | null
          category: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          invoice_id: string | null
          notes: string | null
          order_id: string | null
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          team_id: string | null
          transaction_date: string | null
          transaction_number: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_income: {
        Row: {
          amount: number | null
          category: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          invoice_id: string | null
          invoice_number: string | null
          notes: string | null
          order_id: string | null
          order_number: string | null
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          team_id: string | null
          transaction_date: string | null
          transaction_number: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fuzzy_search_transactions: {
        Args: {
          p_limit?: number
          p_query: string
          p_team_id: string
          p_threshold?: number
        }
        Returns: {
          amount: number
          date: string
          description: string
          name: string
          similarity: number
          transaction_id: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      recalc_invoice_payments: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      recalc_order_totals: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      search_transactions: {
        Args: { p_limit?: number; p_query: string; p_team_id: string }
        Returns: {
          amount: number
          date: string
          description: string
          name: string
          rank: number
          transaction_id: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      comm_message_status: "queued" | "sent" | "delivered" | "read" | "failed"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      order_status: "generated" | "in_progress" | "completed" | "cancelled"
      team_role: "owner" | "admin" | "agent" | "viewer"
      transaction_frequency:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "semi_monthly"
        | "annually"
        | "irregular"
      transaction_method:
        | "cash"
        | "bank_transfer"
        | "mobile_money"
        | "card"
        | "cheque"
        | "other"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type: "payment" | "expense" | "refund" | "adjustment"
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
      appointment_status: ["scheduled", "completed", "cancelled", "no_show"],
      comm_message_status: ["queued", "sent", "delivered", "read", "failed"],
      invoice_status: [
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled",
        "partially_paid",
      ],
      order_status: ["generated", "in_progress", "completed", "cancelled"],
      team_role: ["owner", "admin", "agent", "viewer"],
      transaction_frequency: [
        "weekly",
        "biweekly",
        "monthly",
        "semi_monthly",
        "annually",
        "irregular",
      ],
      transaction_method: [
        "cash",
        "bank_transfer",
        "mobile_money",
        "card",
        "cheque",
        "other",
      ],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: ["payment", "expense", "refund", "adjustment"],
    },
  },
} as const
