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
      approvals: {
        Row: {
          amount: number | null
          approval_type: string
          approver_id: string | null
          created_at: string
          decided_at: string | null
          decision: string
          decision_comments: string
          details: string
          entity_id: string | null
          entity_table: string
          id: string
          job_number_id: string | null
          project_id: string | null
          reference: string
          rejection_reason: string
          revision_requested: boolean
          submitted_at: string
          submitted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          approval_type: string
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          decision_comments?: string
          details?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          job_number_id?: string | null
          project_id?: string | null
          reference?: string
          rejection_reason?: string
          revision_requested?: boolean
          submitted_at?: string
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          approval_type?: string
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: string
          decision_comments?: string
          details?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          job_number_id?: string | null
          project_id?: string | null
          reference?: string
          rejection_reason?: string
          revision_requested?: boolean
          submitted_at?: string
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_tag: string
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          installation_date: string | null
          last_service_date: string | null
          maintenance_frequency_months: number | null
          manufacturer: string
          model: string
          next_service_date: string | null
          notes: string
          serial_number: string
          site_location: string
          status: string
          system_type: string
          updated_at: string
          warranty_end: string | null
        }
        Insert: {
          asset_tag: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          installation_date?: string | null
          last_service_date?: string | null
          maintenance_frequency_months?: number | null
          manufacturer?: string
          model?: string
          next_service_date?: string | null
          notes?: string
          serial_number?: string
          site_location?: string
          status?: string
          system_type?: string
          updated_at?: string
          warranty_end?: string | null
        }
        Update: {
          asset_tag?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          installation_date?: string | null
          last_service_date?: string | null
          maintenance_frequency_months?: number | null
          manufacturer?: string
          model?: string
          next_service_date?: string | null
          notes?: string
          serial_number?: string
          site_location?: string
          status?: string
          system_type?: string
          updated_at?: string
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          department: string
          entity_id: string | null
          entity_label: string
          entity_table: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          department?: string
          entity_id?: string | null
          entity_label?: string
          entity_table?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_id?: string | null
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          department?: string
          entity_id?: string | null
          entity_label?: string
          entity_table?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      bom_items: {
        Row: {
          amount: number
          bom_id: string
          category: string
          created_at: string
          description: string
          id: string
          quantity: number
          remarks: string
          sequence: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          amount?: number
          bom_id: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          remarks?: string
          sequence?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bom_id?: string
          category?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          remarks?: string
          sequence?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
        ]
      }
      boms: {
        Row: {
          bom_type: string
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          estimated_cost: number
          id: string
          job_number_id: string | null
          notes: string
          prepared_by: string | null
          project_id: string | null
          reference: string
          revision: number
          stage: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bom_type?: string
          created_at?: string
          created_by: string
          currency?: string
          customer_id?: string | null
          estimated_cost?: number
          id?: string
          job_number_id?: string | null
          notes?: string
          prepared_by?: string | null
          project_id?: string | null
          reference: string
          revision?: number
          stage?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          bom_type?: string
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          estimated_cost?: number
          id?: string
          job_number_id?: string | null
          notes?: string
          prepared_by?: string | null
          project_id?: string | null
          reference?: string
          revision?: number
          stage?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boms_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boms_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pos: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          discrepancy_notes: string
          document_url: string
          id: string
          notes: string
          po_date: string | null
          po_number: string
          po_value: number
          project_id: string | null
          quotation_id: string | null
          reference: string
          stage: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          discrepancy_notes?: string
          document_url?: string
          id?: string
          notes?: string
          po_date?: string | null
          po_number?: string
          po_value?: number
          project_id?: string | null
          quotation_id?: string | null
          reference: string
          stage?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          discrepancy_notes?: string
          document_url?: string
          id?: string
          notes?: string
          po_date?: string | null
          po_number?: string
          po_value?: number
          project_id?: string | null
          quotation_id?: string | null
          reference?: string
          stage?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pos_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          city: string
          contact_person: string
          created_at: string
          created_by: string
          credit_terms: string
          email: string
          id: string
          name: string
          notes: string
          payment_terms: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          credit_terms?: string
          email?: string
          id?: string
          name: string
          notes?: string
          payment_terms?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          credit_terms?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          payment_terms?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          assigned_to: string | null
          contact_email: string
          contact_person: string
          contact_phone: string
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          notes: string
          received_date: string
          reference: string
          requirement_details: string
          scope_type: string
          site_location: string
          source: string
          stage: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          notes?: string
          received_date?: string
          reference: string
          requirement_details?: string
          scope_type?: string
          site_location?: string
          source?: string
          stage?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          notes?: string
          received_date?: string
          reference?: string
          requirement_details?: string
          scope_type?: string
          site_location?: string
          source?: string
          stage?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_numbers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_date: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          description: string
          id: string
          job_number: string
          progress_percent: number
          project_id: string
          scope_type: string
          site_location: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          description?: string
          id?: string
          job_number: string
          progress_percent?: number
          project_id: string
          scope_type?: string
          site_location?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          description?: string
          id?: string
          job_number?: string
          progress_percent?: number
          project_id?: string
          scope_type?: string
          site_location?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_numbers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
          asset_id: string | null
          client_name: string
          completed_at: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          due_date: string
          id: string
          job_number_id: string | null
          project: string
          project_id: string | null
          reminder_2day_sent_at: string | null
          reminder_due_sent_at: string | null
          report_id: string
          sequence: number
          site_location: string
          status: string
        }
        Insert: {
          asset_id?: string | null
          client_name?: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          due_date: string
          id?: string
          job_number_id?: string | null
          project?: string
          project_id?: string | null
          reminder_2day_sent_at?: string | null
          reminder_due_sent_at?: string | null
          report_id: string
          sequence: number
          site_location?: string
          status?: string
        }
        Update: {
          asset_id?: string | null
          client_name?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          due_date?: string
          id?: string
          job_number_id?: string | null
          project?: string
          project_id?: string | null
          reminder_2day_sent_at?: string | null
          reminder_due_sent_at?: string | null
          report_id?: string
          sequence?: number
          site_location?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      material_request_items: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity_allocated: number
          quantity_issued: number
          quantity_requested: number
          remarks: string
          request_id: string
          sequence: number
          stock_item_id: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          quantity_allocated?: number
          quantity_issued?: number
          quantity_requested?: number
          remarks?: string
          request_id: string
          sequence?: number
          stock_item_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity_allocated?: number
          quantity_issued?: number
          quantity_requested?: number
          remarks?: string
          request_id?: string
          sequence?: number
          stock_item_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_request_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          bom_id: string | null
          created_at: string
          created_by: string
          id: string
          issued_at: string | null
          issued_by: string | null
          job_number_id: string | null
          notes: string
          project_id: string | null
          received_by: string
          reference: string
          required_date: string | null
          site_location: string
          stage: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          bom_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_number_id?: string | null
          notes?: string
          project_id?: string | null
          received_by?: string
          reference: string
          required_date?: string | null
          site_location?: string
          stage?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          bom_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_number_id?: string | null
          notes?: string
          project_id?: string | null
          received_by?: string
          reference?: string
          required_date?: string | null
          site_location?: string
          stage?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          link: string
          message: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          link?: string
          message?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          link?: string
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
      project_tasks: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          job_number_id: string | null
          notes: string
          planned_end: string | null
          planned_start: string | null
          priority: string
          progress_percent: number
          project_id: string | null
          sequence: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          job_number_id?: string | null
          notes?: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          progress_percent?: number
          project_id?: string | null
          sequence?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          job_number_id?: string | null
          notes?: string
          planned_end?: string | null
          planned_start?: string | null
          priority?: string
          progress_percent?: number
          project_id?: string | null
          sequence?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          completed_date: string | null
          contract_value: number
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          estimated_cost: number
          id: string
          name: string
          notes: string
          progress_percent: number
          project_manager_id: string | null
          project_number: string
          project_type: string
          site_location: string
          stage: string
          start_date: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          estimated_cost?: number
          id?: string
          name: string
          notes?: string
          progress_percent?: number
          project_manager_id?: string | null
          project_number: string
          project_type?: string
          site_location?: string
          stage?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          contract_value?: number
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          estimated_cost?: number
          id?: string
          name?: string
          notes?: string
          progress_percent?: number
          project_manager_id?: string | null
          project_number?: string
          project_type?: string
          site_location?: string
          stage?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          quantity: number
          quotation_id: string
          sequence: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id: string
          sequence?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          quotation_id?: string
          sequence?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string
          currency: string
          customer_id: string | null
          decision_notes: string
          delivery_terms: string
          discount_amount: number
          estimated_cost: number
          id: string
          inquiry_id: string | null
          payment_terms: string
          reference: string
          revision: number
          scope_notes: string
          sent_at: string | null
          site_location: string
          stage: string
          status: string
          subtotal: number
          title: string
          total_amount: number
          updated_at: string
          validity_days: number
          vat_percent: number
        }
        Insert: {
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          decision_notes?: string
          delivery_terms?: string
          discount_amount?: number
          estimated_cost?: number
          id?: string
          inquiry_id?: string | null
          payment_terms?: string
          reference: string
          revision?: number
          scope_notes?: string
          sent_at?: string | null
          site_location?: string
          stage?: string
          status?: string
          subtotal?: number
          title?: string
          total_amount?: number
          updated_at?: string
          validity_days?: number
          vat_percent?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: string
          customer_id?: string | null
          decision_notes?: string
          delivery_terms?: string
          discount_amount?: number
          estimated_cost?: number
          id?: string
          inquiry_id?: string | null
          payment_terms?: string
          reference?: string
          revision?: number
          scope_notes?: string
          sent_at?: string | null
          site_location?: string
          stage?: string
          status?: string
          subtotal?: number
          title?: string
          total_amount?: number
          updated_at?: string
          validity_days?: number
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
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
          asset_id: string | null
          client_designation: string | null
          client_email: string
          client_name: string | null
          client_sign_name: string | null
          client_signature: string | null
          contract: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          date_completed: string | null
          devices: Json
          employee_signature: string | null
          id: string
          job_number_id: string | null
          maintenance_count: string
          maintenance_interval_unit: string
          maintenance_interval_value: number | null
          msr_no: string | null
          next_maintenance: string
          order_no: string | null
          our_ref_no: string | null
          performed_by: string | null
          project: string | null
          project_id: string | null
          remarks: string | null
          report_date: string | null
          site_location: string | null
          spare_parts: Json
        }
        Insert: {
          action_taken?: string | null
          asset_id?: string | null
          client_designation?: string | null
          client_email?: string
          client_name?: string | null
          client_sign_name?: string | null
          client_signature?: string | null
          contract?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          date_completed?: string | null
          devices?: Json
          employee_signature?: string | null
          id?: string
          job_number_id?: string | null
          maintenance_count?: string
          maintenance_interval_unit?: string
          maintenance_interval_value?: number | null
          msr_no?: string | null
          next_maintenance?: string
          order_no?: string | null
          our_ref_no?: string | null
          performed_by?: string | null
          project?: string | null
          project_id?: string | null
          remarks?: string | null
          report_date?: string | null
          site_location?: string | null
          spare_parts?: Json
        }
        Update: {
          action_taken?: string | null
          asset_id?: string | null
          client_designation?: string | null
          client_email?: string
          client_name?: string | null
          client_sign_name?: string | null
          client_signature?: string | null
          contract?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          date_completed?: string | null
          devices?: Json
          employee_signature?: string | null
          id?: string
          job_number_id?: string | null
          maintenance_count?: string
          maintenance_interval_unit?: string
          maintenance_interval_value?: number | null
          msr_no?: string | null
          next_maintenance?: string
          order_no?: string | null
          our_ref_no?: string | null
          performed_by?: string | null
          project?: string | null
          project_id?: string | null
          remarks?: string | null
          report_date?: string | null
          site_location?: string | null
          spare_parts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reports_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          item_code: string
          notes: string
          quantity_on_hand: number
          quantity_reserved: number
          reorder_level: number
          status: string
          store_location: string
          supplier: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          item_code?: string
          notes?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number
          status?: string
          store_location?: string
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          item_code?: string
          notes?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number
          status?: string
          store_location?: string
          supplier?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          description: string
          id: string
          job_number_id: string | null
          moved_by: string
          movement_type: string
          project_id: string | null
          quantity: number
          reference: string
          remarks: string
          request_id: string | null
          stock_item_id: string | null
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          job_number_id?: string | null
          moved_by: string
          movement_type?: string
          project_id?: string | null
          quantity?: number
          reference?: string
          remarks?: string
          request_id?: string | null
          stock_item_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_number_id?: string | null
          moved_by?: string
          movement_type?: string
          project_id?: string | null
          quantity?: number
          reference?: string
          remarks?: string
          request_id?: string | null
          stock_item_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_job_number_id_fkey"
            columns: ["job_number_id"]
            isOneToOne: false
            referencedRelation: "job_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "material_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
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
      app_role:
        | "admin"
        | "employee"
        | "sales"
        | "project_manager"
        | "inventory"
        | "technician"
        | "accounts"
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
        "admin",
        "employee",
        "sales",
        "project_manager",
        "inventory",
        "technician",
        "accounts",
      ],
    },
  },
} as const
