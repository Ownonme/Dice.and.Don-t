export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string
          user_id?: string
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
      spells: {
        Row: {
          id: string
          name: string
          grade: string
          primary_branch: string
          secondary_branch: string | null
          primary_specificity: string | null
          secondary_specificity: string | null
          description: string | null
          additional_description: string | null
          story_one: string | null
          story_two: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          grade: string
          primary_branch: string
          secondary_branch?: string | null
          primary_specificity?: string | null
          secondary_specificity?: string | null
          description?: string | null
          additional_description?: string | null
          story_one?: string | null
          story_two?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          grade?: string
          primary_branch?: string
          secondary_branch?: string | null
          primary_specificity?: string | null
          secondary_specificity?: string | null
          description?: string | null
          additional_description?: string | null
          story_one?: string | null
          story_two?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      spell_levels: {
        Row: {
          id: string
          spell_id: string | null
          level_number: number
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          spell_id?: string | null
          level_number: number
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          spell_id?: string | null
          level_number?: number
          description?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spell_levels_spell_id_fkey"
            columns: ["spell_id"]
            isOneToOne: false
            referencedRelation: "spells"
            referencedColumns: ["id"]
          }
        ]
      }
      characters: {
        Row: {
          id: string
          user_id: string
          name: string
          level: number
          data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          level?: number
          data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          level?: number
          data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diaries: {
        Row: {
          id: string
          title: string
          is_public: boolean
          owner_id: string
          created_at: string
          character_id: string | null
        }
        Insert: {
          id?: string
          title: string
          is_public?: boolean
          owner_id: string
          created_at?: string
          character_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          is_public?: boolean
          owner_id?: string
          created_at?: string
          character_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diaries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diaries_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          }
        ]
      }
      diary_pages: {
        Row: {
          id: string
          diary_id: string
          page_number: number
          content_html: string
          background_color: string | null
          background_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          diary_id: string
          page_number: number
          content_html?: string
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          diary_id?: string
          page_number?: number
          content_html?: string
          background_color?: string | null
          background_image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_pages_diary_id_fkey"
            columns: ["diary_id"]
            isOneToOne: false
            referencedRelation: "diaries"
            referencedColumns: ["id"]
          }
        ]
      }
      anomalies: {
        Row: {
          id: string
          name: string
          description: string | null
          malus: string | null
          turns: number | null
          does_damage: boolean
          damage_per_turn: number | null
          damage_effect_id: string | null
          modifies_stats: boolean
          stats: Json
          modifies_specifics: boolean
          temp_health: number | null
          temp_action_points: number | null
          temp_armour: number | null
          heals: boolean
          healing_per_turn: number | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          malus?: string | null
          turns?: number | null
          does_damage?: boolean
          damage_per_turn?: number | null
          damage_effect_id?: string | null
          modifies_stats?: boolean
          stats?: Json
          modifies_specifics?: boolean
          temp_health?: number | null
          temp_action_points?: number | null
          temp_armour?: number | null
          heals?: boolean
          healing_per_turn?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          malus?: string | null
          turns?: number | null
          does_damage?: boolean
          damage_per_turn?: number | null
          damage_effect_id?: string | null
          modifies_stats?: boolean
          stats?: Json
          modifies_specifics?: boolean
          temp_health?: number | null
          temp_action_points?: number | null
          temp_armour?: number | null
          heals?: boolean
          healing_per_turn?: number | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anomalies_damage_effect_id_fkey"
            columns: ["damage_effect_id"]
            isOneToOne: false
            referencedRelation: "damage_effects"
            referencedColumns: ["id"]
          }
        ]
      }
      damage_effects: {
        Row: {
          id: string
          name: string
          description: string | null
          affects_action_points: boolean
          affects_health: boolean
          affects_armor: boolean
          affects_classic_damage: boolean
          bonus_effects: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          affects_action_points?: boolean
          affects_health?: boolean
          affects_armor?: boolean
          affects_classic_damage?: boolean
          bonus_effects?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          affects_action_points?: boolean
          affects_health?: boolean
          affects_armor?: boolean
          affects_classic_damage?: boolean
          bonus_effects?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
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
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "personale"
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
      app_role: ["admin", "personale"],
    },
  },
} as const
