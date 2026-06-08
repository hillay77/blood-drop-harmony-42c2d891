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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      blood_requests: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at: string
          hospital_id: string
          id: string
          notes: string | null
          patient_reference: string | null
          phenotype_required: string[] | null
          requester_id: string | null
          rh: Database["public"]["Enums"]["rh_factor"]
          status: Database["public"]["Enums"]["request_status"]
          units_needed: number
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency"]
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          created_at?: string
          hospital_id: string
          id?: string
          notes?: string | null
          patient_reference?: string | null
          phenotype_required?: string[] | null
          requester_id?: string | null
          rh: Database["public"]["Enums"]["rh_factor"]
          status?: Database["public"]["Enums"]["request_status"]
          units_needed: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          created_at?: string
          hospital_id?: string
          id?: string
          notes?: string | null
          patient_reference?: string | null
          phenotype_required?: string[] | null
          requester_id?: string | null
          rh?: Database["public"]["Enums"]["rh_factor"]
          status?: Database["public"]["Enums"]["request_status"]
          units_needed?: number
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "blood_requests_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_units: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          collected_at: string
          created_at: string
          expires_at: string
          hub_id: string
          id: string
          phenotype_tags: string[] | null
          rh: Database["public"]["Enums"]["rh_factor"]
          status: Database["public"]["Enums"]["unit_status"]
          storage_unit: string | null
          updated_at: string
          volume_ml: number
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          collected_at?: string
          created_at?: string
          expires_at: string
          hub_id: string
          id?: string
          phenotype_tags?: string[] | null
          rh: Database["public"]["Enums"]["rh_factor"]
          status?: Database["public"]["Enums"]["unit_status"]
          storage_unit?: string | null
          updated_at?: string
          volume_ml?: number
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          collected_at?: string
          created_at?: string
          expires_at?: string
          hub_id?: string
          id?: string
          phenotype_tags?: string[] | null
          rh?: Database["public"]["Enums"]["rh_factor"]
          status?: Database["public"]["Enums"]["unit_status"]
          storage_unit?: string | null
          updated_at?: string
          volume_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "blood_units_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_chain_readings: {
        Row: {
          hub_id: string
          id: string
          is_alert: boolean
          recorded_at: string
          storage_unit: string
          temp_c: number
        }
        Insert: {
          hub_id: string
          id?: string
          is_alert?: boolean
          recorded_at?: string
          storage_unit: string
          temp_c: number
        }
        Update: {
          hub_id?: string
          id?: string
          is_alert?: boolean
          recorded_at?: string
          storage_unit?: string
          temp_c?: number
        }
        Relationships: [
          {
            foreignKeyName: "cold_chain_readings_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatches: {
        Row: {
          created_at: string
          delivered_at: string | null
          dispatched_at: string | null
          distance_km: number | null
          eta_minutes: number | null
          hub_id: string
          id: string
          request_id: string
          status: Database["public"]["Enums"]["dispatch_status"]
          unit_ids: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          dispatched_at?: string | null
          distance_km?: number | null
          eta_minutes?: number | null
          hub_id: string
          id?: string
          request_id: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          unit_ids?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          dispatched_at?: string | null
          distance_km?: number | null
          eta_minutes?: number | null
          hub_id?: string
          id?: string
          request_id?: string
          status?: Database["public"]["Enums"]["dispatch_status"]
          unit_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatches_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          region: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          region: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      hubs: {
        Row: {
          address: string | null
          capacity_units: number
          contact_phone: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          region: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity_units?: number
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          region: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity_units?: number
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          hub_id: string
          id: string
          rh: Database["public"]["Enums"]["rh_factor"]
          snapshot_date: string
          units_available: number
          units_consumed: number
        }
        Insert: {
          blood_group: Database["public"]["Enums"]["blood_group"]
          hub_id: string
          id?: string
          rh: Database["public"]["Enums"]["rh_factor"]
          snapshot_date: string
          units_available?: number
          units_consumed?: number
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"]
          hub_id?: string
          id?: string
          rh?: Database["public"]["Enums"]["rh_factor"]
          snapshot_date?: string
          units_available?: number
          units_consumed?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_alerts: {
        Row: {
          donor_id: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          request_id: string | null
          sent_at: string
          status: Database["public"]["Enums"]["alert_status"]
          twilio_sid: string | null
        }
        Insert: {
          donor_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          request_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["alert_status"]
          twilio_sid?: string | null
        }
        Update: {
          donor_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          request_id?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["alert_status"]
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_alerts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "blood_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          blood_group: Database["public"]["Enums"]["blood_group"] | null
          created_at: string
          display_name: string | null
          donor_opt_in: boolean
          email: string | null
          hospital_id: string | null
          hub_id: string | null
          id: string
          phenotype_tags: string[] | null
          phone: string | null
          rh: Database["public"]["Enums"]["rh_factor"] | null
          updated_at: string
        }
        Insert: {
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          display_name?: string | null
          donor_opt_in?: boolean
          email?: string | null
          hospital_id?: string | null
          hub_id?: string | null
          id: string
          phenotype_tags?: string[] | null
          phone?: string | null
          rh?: Database["public"]["Enums"]["rh_factor"] | null
          updated_at?: string
        }
        Update: {
          blood_group?: Database["public"]["Enums"]["blood_group"] | null
          created_at?: string
          display_name?: string | null
          donor_opt_in?: boolean
          email?: string | null
          hospital_id?: string | null
          hub_id?: string | null
          id?: string
          phenotype_tags?: string[] | null
          phone?: string | null
          rh?: Database["public"]["Enums"]["rh_factor"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      shortage_forecasts: {
        Row: {
          avg_daily_consumption: number
          blood_group: Database["public"]["Enums"]["blood_group"]
          computed_at: string
          current_units: number
          hub_id: string
          id: string
          projected_days_remaining: number
          rh: Database["public"]["Enums"]["rh_factor"]
          shortage_risk: string
        }
        Insert: {
          avg_daily_consumption: number
          blood_group: Database["public"]["Enums"]["blood_group"]
          computed_at?: string
          current_units: number
          hub_id: string
          id?: string
          projected_days_remaining: number
          rh: Database["public"]["Enums"]["rh_factor"]
          shortage_risk: string
        }
        Update: {
          avg_daily_consumption?: number
          blood_group?: Database["public"]["Enums"]["blood_group"]
          computed_at?: string
          current_units?: number
          hub_id?: string
          id?: string
          projected_days_remaining?: number
          rh?: Database["public"]["Enums"]["rh_factor"]
          shortage_risk?: string
        }
        Relationships: [
          {
            foreignKeyName: "shortage_forecasts_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "queued" | "sent" | "failed" | "delivered"
      app_role: "admin" | "hub_staff" | "hospital_requester" | "donor"
      blood_group: "A" | "B" | "AB" | "O"
      dispatch_status: "pending" | "in_transit" | "delivered" | "cancelled"
      request_status:
        | "pending"
        | "matched"
        | "dispatched"
        | "fulfilled"
        | "cancelled"
      rh_factor: "positive" | "negative"
      unit_status:
        | "available"
        | "reserved"
        | "dispatched"
        | "expired"
        | "discarded"
      urgency: "routine" | "urgent" | "critical"
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
      alert_status: ["queued", "sent", "failed", "delivered"],
      app_role: ["admin", "hub_staff", "hospital_requester", "donor"],
      blood_group: ["A", "B", "AB", "O"],
      dispatch_status: ["pending", "in_transit", "delivered", "cancelled"],
      request_status: [
        "pending",
        "matched",
        "dispatched",
        "fulfilled",
        "cancelled",
      ],
      rh_factor: ["positive", "negative"],
      unit_status: [
        "available",
        "reserved",
        "dispatched",
        "expired",
        "discarded",
      ],
      urgency: ["routine", "urgent", "critical"],
    },
  },
} as const
