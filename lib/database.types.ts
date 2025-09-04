export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database enums
export type UserStatus = 'REQUESTED' | 'APPROVED' | 'ACTIVE' | 'DISABLED'
export type UserRole = 'USER' | 'ADMIN'
export type ReportTier = 'ENHANCED' | 'BI'
export type EnrichStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
export type EmailStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'BOUNCED'

// Database schema types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          status: UserStatus
          role: UserRole
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          status?: UserStatus
          role?: UserRole
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          status?: UserStatus
          role?: UserRole
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          user_id: string | null
          token: string
          expires_at: string
          accepted_at: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          token: string
          expires_at: string
          accepted_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          token?: string
          expires_at?: string
          accepted_at?: string | null
          approved_by?: string | null
          created_at?: string
        }
      }
      searches: {
        Row: {
          id: string
          user_id: string
          name: string
          industry: string
          city: string
          state: string
          results_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          industry: string
          city: string
          state: string
          results_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          industry?: string
          city?: string
          state?: string
          results_data?: Json
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          search_id: string
          place_id: string
          name: string
          address: string | null
          phone: string | null
          website: string | null
          rating: number | null
          review_count: number | null
          selected: boolean
          created_at: string
        }
        Insert: {
          id?: string
          search_id: string
          place_id: string
          name: string
          address?: string | null
          phone?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          selected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          search_id?: string
          place_id?: string
          name?: string
          address?: string | null
          phone?: string | null
          website?: string | null
          rating?: number | null
          review_count?: number | null
          selected?: boolean
          created_at?: string
        }
      }
      enrichments: {
        Row: {
          id: string
          company_id: string
          status: EnrichStatus
          owner_name: string | null
          owner_email: string | null
          owner_phone: string | null
          employee_count: number | null
          revenue: number | null
          history: string | null
          sources: Json
          confidence: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          status?: EnrichStatus
          owner_name?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          employee_count?: number | null
          revenue?: number | null
          history?: string | null
          sources?: Json
          confidence?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          status?: EnrichStatus
          owner_name?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          employee_count?: number | null
          revenue?: number | null
          history?: string | null
          sources?: Json
          confidence?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          company_id: string
          user_id: string
          tier: ReportTier
          content_json: Json
          content_html: string | null
          pdf_path: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          tier: ReportTier
          content_json: Json
          content_html?: string | null
          pdf_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          tier?: ReportTier
          content_json?: Json
          content_html?: string | null
          pdf_path?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          template_id: string | null
          start_date: string
          weekday: number
          hour: number
          max_sends: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_id?: string | null
          start_date: string
          weekday: number
          hour: number
          max_sends?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_id?: string | null
          start_date?: string
          weekday?: number
          hour?: number
          max_sends?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      outreach_targets: {
        Row: {
          id: string
          campaign_id: string
          company_id: string
          last_sent_at: string | null
          send_count: number
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          company_id: string
          last_sent_at?: string | null
          send_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          company_id?: string
          last_sent_at?: string | null
          send_count?: number
          created_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          user_id: string | null
          name: string
          subject: string
          content: string
          variables: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          subject: string
          content: string
          variables?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          subject?: string
          content?: string
          variables?: Json
          created_at?: string
          updated_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          campaign_id: string
          company_id: string
          recipient_email: string
          subject: string
          status: EmailStatus
          sent_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          company_id: string
          recipient_email: string
          subject: string
          status?: EmailStatus
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          company_id?: string
          recipient_email?: string
          subject?: string
          status?: EmailStatus
          sent_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          pricing_config: Json
          email_config: Json
          api_keys: Json
          updated_at: string
        }
        Insert: {
          id?: string
          pricing_config?: Json
          email_config?: Json
          api_keys?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          pricing_config?: Json
          email_config?: Json
          api_keys?: Json
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_audit_log: {
        Args: {
          p_user_id: string
          p_action: string
          p_entity: string
          p_entity_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      handle_new_user: {
        Args: {}
        Returns: undefined
      }
      generate_invitation_token: {
        Args: {}
        Returns: string
      }
      create_invitation: {
        Args: {
          p_user_id: string
          p_expires_hours?: number
        }
        Returns: { id: string; token: string }[]
      }
      accept_invitation: {
        Args: {
          p_token: string
        }
        Returns: boolean
      }
      start_enrichment: {
        Args: {
          p_company_id: string
        }
        Returns: string
      }
      update_enrichment_status: {
        Args: {
          p_enrichment_id: string
          p_status: EnrichStatus
          p_data?: Json
        }
        Returns: boolean
      }
      create_report: {
        Args: {
          p_company_id: string
          p_user_id: string
          p_tier: ReportTier
          p_content_json: Json
          p_content_html?: string
          p_pdf_path?: string
        }
        Returns: string
      }
      get_user_stats: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_system_stats: {
        Args: {}
        Returns: Json
      }
      cleanup_expired_invitations: {
        Args: {}
        Returns: number
      }
      is_admin: {
        Args: {}
        Returns: boolean
      }
      is_active_user: {
        Args: {}
        Returns: boolean
      }
    }
    Enums: {
      user_status: UserStatus
      user_role: UserRole
      report_tier: ReportTier
      enrich_status: EnrichStatus
      email_status: EmailStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}