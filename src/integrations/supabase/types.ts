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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      maintenance_reminder_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          label?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      maintenance_tasks: {
        Row: {
          client_name: string
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string
          id: string
          project: string
          reminder_2day_sent_at: string | null
          reminder_due_sent_at: string | null
          report_id: string
          sequence: number
          site_location: string
          status: string
        }
        Insert: {
          client_name?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date: string
          id?: string
          project?: string
          reminder_2day_sent_at?: string | null
          reminder_due_sent_at?: string | null
          report_id: string
          sequence: number
          site_location?: string
          status?: string
        }
        Update: {
          client_name?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string
          id?: string
          project?: string
          reminder_2day_sent_at?: string | null
          reminder_due_sent_at?: string | null
          report_id?: string
          sequence?: number
          site_location?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          designation: string
          email: string | null
          full_name: string
          hidden: boolean
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          designation?: string
          email?: string | null
          full_name?: string
          hidden?: boolean
          id: string
          status?: string
        }
        Update: {
          created_at?: string
          designation?: string
          email?: string | null
          full_name?: string
          hidden?: boolean
          id?: string
          status?: string
        }
        Relationships: []
      }
      report_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          label?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_taken: string | null
          client_designation: string | null
          client_email: string
          client_name: string | null
          client_sign_name: string | null
          client_signature: string | null
          contract: string | null
          created_at: string
          created_by: string
          date_completed: string | null
          devices: Json
          employee_signature: string | null
          id: string
          maintenance_count: string
          maintenance_interval_unit: string
          maintenance_interval_value: number | null
          msr_no: string | null
          next_maintenance: string
          order_no: string | null
          our_ref_no: string | null
          performed_by: string | null
          project: string | null
          remarks: string | null
          report_date: string | null
          site_location: string | null
          spare_parts: Json
        }
        Insert: {
          action_taken?: string | null
          client_designation?: string | null
          client_email?: string
          client_name?: string | null
          client_sign_name?: string | null
          client_signature?: string | null
          contract?: string | null
          created_at?: string
          created_by: string
          date_completed?: string | null
          devices?: Json
          employee_signature?: string | null
          id?: string
          maintenance_count?: string
          maintenance_interval_unit?: string
          maintenance_interval_value?: number | null
          msr_no?: string | null
          next_maintenance?: string
          order_no?: string | null
          our_ref_no?: string | null
          performed_by?: string | null
          project?: string | null
          remarks?: string | null
          report_date?: string | null
          site_location?: string | null
          spare_parts?: Json
        }
        Update: {
          action_taken?: string | null
          client_designation?: string | null
          client_email?: string
          client_name?: string | null
          client_sign_name?: string | null
          client_signature?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string
          date_completed?: string | null
          devices?: Json
          employee_signature?: string | null
          id?: string
          maintenance_count?: string
          maintenance_interval_unit?: string
          maintenance_interval_value?: number | null
          msr_no?: string | null
          next_maintenance?: string
          order_no?: string | null
          our_ref_no?: string | null
          performed_by?: string | null
          project?: string | null
          remarks?: string | null
          report_date?: string | null
          site_location?: string | null
          spare_parts?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
