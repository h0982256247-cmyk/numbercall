export type TicketStatus = 'waiting' | 'called' | 'entered' | 'skipped' | 'cancelled'
export type EventStatus = 'draft' | 'active' | 'paused' | 'ended'
export type BrandStatus = 'active' | 'inactive' | 'suspended'

export interface Database {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          slug: string
          status: BrandStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['brands']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
      }
      admin_users: {
        Row: {
          id: string
          auth_user_id: string
          brand_id: string | null
          display_name: string | null
          email: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
      brand_line_configs: {
        Row: {
          id: string
          brand_id: string
          channel_id: string
          channel_access_token: string
          liff_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['brand_line_configs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['brand_line_configs']['Insert']>
      }
      events: {
        Row: {
          id: string
          brand_id: string
          name: string
          slug: string
          description: string | null
          start_date: string
          end_date: string
          status: EventStatus
          last_queue_number: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at' | 'last_queue_number'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      line_users: {
        Row: {
          id: string
          line_user_id: string
          display_name: string | null
          picture_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['line_users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['line_users']['Row'], 'id' | 'created_at'>>
      }
      queue_tickets: {
        Row: {
          id: string
          event_id: string
          line_user_id: string
          queue_number: number
          status: TicketStatus
          called_at: string | null
          entered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['queue_tickets']['Row'], 'id' | 'queue_number' | 'created_at' | 'updated_at'>
        Update: Partial<Pick<Database['public']['Tables']['queue_tickets']['Row'], 'status' | 'called_at' | 'entered_at'>>
      }
      queue_logs: {
        Row: {
          id: string
          ticket_id: string
          action: string
          actor_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['queue_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

// Convenience types
export type Brand = Database['public']['Tables']['brands']['Row']
export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type BrandLineConfig = Database['public']['Tables']['brand_line_configs']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type LineUser = Database['public']['Tables']['line_users']['Row']
export type QueueTicket = Database['public']['Tables']['queue_tickets']['Row']
export type QueueLog = Database['public']['Tables']['queue_logs']['Row']
