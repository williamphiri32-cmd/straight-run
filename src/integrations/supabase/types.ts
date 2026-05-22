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
      contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          id: string
          member_id: string
          note: string | null
          payment_method: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date?: string
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          payment_method?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          payment_method?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      group_settings: {
        Row: {
          created_at: string
          default_interest_rate: number
          default_max_tenure_months: number
          default_penalty_rate: number
          id: string
          loan_limit_multiplier: number
          saving_duration_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_interest_rate?: number
          default_max_tenure_months?: number
          default_penalty_rate?: number
          id?: string
          loan_limit_multiplier?: number
          saving_duration_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_interest_rate?: number
          default_max_tenure_months?: number
          default_penalty_rate?: number
          id?: string
          loan_limit_multiplier?: number
          saving_duration_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decision_note: string | null
          id: string
          member_id: string
          payment_method: string | null
          purpose: string | null
          status: Database["public"]["Enums"]["loan_application_status"]
          term_months: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          member_id: string
          payment_method?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_application_status"]
          term_months?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          member_id?: string
          payment_method?: string | null
          purpose?: string | null
          status?: Database["public"]["Enums"]["loan_application_status"]
          term_months?: number
          user_id?: string
        }
        Relationships: []
      }
      loan_tiers: {
        Row: {
          created_at: string
          id: string
          installments: number
          interest_rate: number
          max_amount: number | null
          min_amount: number
          repayment_months: number
          requires_approval: boolean
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          installments: number
          interest_rate: number
          max_amount?: number | null
          min_amount: number
          repayment_months: number
          requires_approval?: boolean
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          installments?: number
          interest_rate?: number
          max_amount?: number | null
          min_amount?: number
          repayment_months?: number
          requires_approval?: boolean
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          application_id: string | null
          created_at: string
          due_date: string | null
          id: string
          interest_rate: number
          issued_date: string
          member_id: string
          note: string | null
          payment_method: string | null
          penalty_period_days: number
          penalty_rate: number
          principal: number
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          issued_date?: string
          member_id: string
          note?: string | null
          payment_method?: string | null
          penalty_period_days?: number
          penalty_rate?: number
          principal: number
          status?: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          interest_rate?: number
          issued_date?: string
          member_id?: string
          note?: string | null
          payment_method?: string | null
          penalty_period_days?: number
          penalty_rate?: number
          principal?: number
          status?: Database["public"]["Enums"]["loan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_loan_limits: {
        Row: {
          created_at: string
          id: string
          max_tenure_months: number
          member_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_tenure_months: number
          member_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          max_tenure_months?: number
          member_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_loan_limits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          joined_at: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          joined_at?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offence_rules: {
        Row: {
          created_at: string
          id: string
          offence: string
          penalty_amount: number
          penalty_is_percent: boolean
          penalty_note: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offence: string
          penalty_amount?: number
          penalty_is_percent?: boolean
          penalty_note?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offence?: string
          penalty_amount?: number
          penalty_is_percent?: boolean
          penalty_note?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          member_id: string
          mime_type: string
          post_id: string
          size_bytes: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          member_id: string
          mime_type: string
          post_id: string
          size_bytes?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          member_id?: string
          mime_type?: string
          post_id?: string
          size_bytes?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          member_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          member_id: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          member_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          member_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          member_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repayments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          paid_date: string
          payment_method: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          paid_date?: string
          payment_method?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          paid_date?: string
          payment_method?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_inactivity_rules: {
        Row: {
          action: string
          created_at: string
          expels_member: boolean
          id: string
          months_without_saving: number
          outcome: string | null
          penalty_amount: number
          sort_order: number
          suspends_borrowing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          expels_member?: boolean
          id?: string
          months_without_saving: number
          outcome?: string | null
          penalty_amount?: number
          sort_order?: number
          suspends_borrowing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          expels_member?: boolean
          id?: string
          months_without_saving?: number
          outcome?: string | null
          penalty_amount?: number
          sort_order?: number
          suspends_borrowing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_out_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          share_out_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          member_id: string
          share_out_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          share_out_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_out_allocations_share_out_id_fkey"
            columns: ["share_out_id"]
            isOneToOne: false
            referencedRelation: "share_outs"
            referencedColumns: ["id"]
          },
        ]
      }
      share_outs: {
        Row: {
          created_at: string
          id: string
          note: string | null
          share_out_date: string
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          share_out_date?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          share_out_date?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_group_ids: { Args: never; Returns: string[] }
      my_member_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      loan_application_status: "pending" | "approved" | "rejected"
      loan_status: "active" | "paid" | "overdue"
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
      loan_application_status: ["pending", "approved", "rejected"],
      loan_status: ["active", "paid", "overdue"],
    },
  },
} as const
