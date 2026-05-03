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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_releases: {
        Row: {
          id: string
          note: string | null
          released_at: string
          released_by: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          released_at?: string
          released_by?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          released_at?: string
          released_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          admin_comment: string | null
          assigned_to: string | null
          attachments: string[] | null
          category: string
          comments: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          resident_id: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resident_id: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resident_id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          original_id: string
          payload: Json
          source_table: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_id: string
          payload: Json
          source_table: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          original_id?: string
          payload?: Json
          source_table?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by_name: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          is_visible: boolean
          notes: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_by_name?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          is_visible?: boolean
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_by_name?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          is_visible?: boolean
          notes?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      family_member_details: {
        Row: {
          age: number | null
          created_at: string
          id: string
          name: string
          occupation: string | null
          relation: string
          resident_id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          id?: string
          name: string
          occupation?: string | null
          relation?: string
          resident_id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          created_at?: string
          id?: string
          name?: string
          occupation?: string | null
          relation?: string
          resident_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_member_details_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      helpers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mobile: string | null
          name: string
          notes: string | null
          photo_url: string | null
          role_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mobile?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          role_title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mobile?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          role_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inbox_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip: string | null
          mobile: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip?: string | null
          mobile: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip?: string | null
          mobile?: string
          success?: boolean
        }
        Relationships: []
      }
      maintenance_collections: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_amount: number
          due_date: string | null
          id: string
          is_visible: boolean
          month: string
          paid_date: string | null
          payment_mode: string | null
          receipt_no: string | null
          resident_id: string
          status: string
          total_maintenance: number
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_amount?: number
          due_date?: string | null
          id?: string
          is_visible?: boolean
          month: string
          paid_date?: string | null
          payment_mode?: string | null
          receipt_no?: string | null
          resident_id: string
          status?: string
          total_maintenance?: number
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_amount?: number
          due_date?: string | null
          id?: string
          is_visible?: boolean
          month?: string
          paid_date?: string | null
          payment_mode?: string | null
          receipt_no?: string | null
          resident_id?: string
          status?: string
          total_maintenance?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_collections_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_receipts: {
        Row: {
          amount_paid: number
          created_at: string
          custom_fields: Json | null
          due_amount: number
          house_no: string | null
          id: string
          lane_no: string | null
          maintenance_collection_id: string
          month: string
          notes: string | null
          payment_mode: string | null
          receipt_date: string
          receipt_no: string | null
          resident_id: string
          resident_name: string | null
          society_name: string
          total_maintenance: number
          updated_at: string
          year: number
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          custom_fields?: Json | null
          due_amount?: number
          house_no?: string | null
          id?: string
          lane_no?: string | null
          maintenance_collection_id: string
          month: string
          notes?: string | null
          payment_mode?: string | null
          receipt_date?: string
          receipt_no?: string | null
          resident_id: string
          resident_name?: string | null
          society_name?: string
          total_maintenance?: number
          updated_at?: string
          year: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          custom_fields?: Json | null
          due_amount?: number
          house_no?: string | null
          id?: string
          lane_no?: string | null
          maintenance_collection_id?: string
          month?: string
          notes?: string | null
          payment_mode?: string | null
          receipt_date?: string
          receipt_no?: string | null
          resident_id?: string
          resident_name?: string | null
          society_name?: string
          total_maintenance?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_receipts_maintenance_collection_id_fkey"
            columns: ["maintenance_collection_id"]
            isOneToOne: true
            referencedRelation: "maintenance_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_receipts_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          audience_type: string
          audience_user_ids: string[]
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_draft: boolean
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string
          audience_user_ids?: string[]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_draft?: boolean
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          audience_user_ids?: string[]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_draft?: boolean
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          notice_id: string
          target_type: string
          target_user_ids: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          notice_id: string
          target_type?: string
          target_user_ids?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          notice_id?: string
          target_type?: string
          target_user_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          options: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          house_no: string | null
          id: string
          is_approved: boolean
          is_blocked: boolean
          lane_no: string | null
          mobile: string | null
          resident_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          house_no?: string | null
          id?: string
          is_approved?: boolean
          is_blocked?: boolean
          lane_no?: string | null
          mobile?: string | null
          resident_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          house_no?: string | null
          id?: string
          is_approved?: boolean
          is_blocked?: boolean
          lane_no?: string | null
          mobile?: string | null
          resident_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          created_at: string
          created_by: string | null
          family_members: number | null
          house_no: string
          id: string
          is_active: boolean
          lane_no: string
          maintenance_amount: number
          mobile: string
          move_in_date: string | null
          name: string
          owner_id: string | null
          pending_role: string | null
          resident_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          family_members?: number | null
          house_no: string
          id?: string
          is_active?: boolean
          lane_no: string
          maintenance_amount?: number
          mobile: string
          move_in_date?: string | null
          name: string
          owner_id?: string | null
          pending_role?: string | null
          resident_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          family_members?: number | null
          house_no?: string
          id?: string
          is_active?: boolean
          lane_no?: string
          maintenance_amount?: number
          mobile?: string
          move_in_date?: string | null
          name?: string
          owner_id?: string | null
          pending_role?: string | null
          resident_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      role_page_permissions: {
        Row: {
          allowed: boolean
          id: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed?: boolean
          id?: string
          page_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean
          id?: string
          page_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      society_info: {
        Row: {
          admin_name: string
          id: string
          lanes: string
          monthly_maintenance: string
          name: string
          singleton: boolean
          total_houses: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_name?: string
          id?: string
          lanes?: string
          monthly_maintenance?: string
          name?: string
          singleton?: boolean
          total_houses?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_name?: string
          id?: string
          lanes?: string
          monthly_maintenance?: string
          name?: string
          singleton?: boolean
          total_houses?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      society_management: {
        Row: {
          created_at: string
          display_order: number
          id: string
          mobile: string | null
          name: string
          photo_url: string | null
          role_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          mobile?: string | null
          name: string
          photo_url?: string | null
          role_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          mobile?: string | null
          name?: string
          photo_url?: string | null
          role_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          make_model: string | null
          registration_no: string
          resident_id: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          make_model?: string | null
          registration_no: string
          resident_id: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          make_model?: string | null
          registration_no?: string
          resident_id?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_duplicate_resident: {
        Args: { _mobile: string }
        Returns: {
          existing_house: string
          existing_name: string
          exists_in_helpers: boolean
          exists_in_residents: boolean
        }[]
      }
      clear_login_attempts: { Args: { _mobile: string }; Returns: undefined }
      generate_new_fy_dues: {
        Args: { _target_year?: number }
        Returns: {
          created: boolean
          new_due: number
          resident_id: string
        }[]
      }
      get_email_by_mobile: { Args: { _mobile: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_coordinator: { Args: { _user_id: string }; Returns: boolean }
      is_mobile_locked: { Args: { _mobile: string }; Returns: boolean }
      is_supervisor: { Args: { _user_id: string }; Returns: boolean }
      purge_old_deleted_records: { Args: never; Returns: undefined }
      record_login_attempt: {
        Args: { _mobile: string; _success: boolean }
        Returns: undefined
      }
      restore_deleted_record: { Args: { _id: string }; Returns: undefined }
      signup_lookup_owner: {
        Args: { _owner_mobile: string }
        Returns: {
          house_no: string
          lane_no: string
          owner_id: string
          owner_name: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "president"
        | "vice_president"
        | "treasury_head"
        | "secretary"
        | "coordinator"
        | "resident"
        | "supervisor"
      expense_category:
        | "repair"
        | "purchase"
        | "maintenance"
        | "staff_salary"
        | "electricity"
        | "water"
        | "security"
        | "gardening"
        | "cleaning"
        | "events"
        | "legal"
        | "insurance"
        | "other"
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
        "master_admin",
        "president",
        "vice_president",
        "treasury_head",
        "secretary",
        "coordinator",
        "resident",
        "supervisor",
      ],
      expense_category: [
        "repair",
        "purchase",
        "maintenance",
        "staff_salary",
        "electricity",
        "water",
        "security",
        "gardening",
        "cleaning",
        "events",
        "legal",
        "insurance",
        "other",
      ],
    },
  },
} as const
