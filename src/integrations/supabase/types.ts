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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cobranca_historico: {
        Row: {
          campo_alterado: string
          cobranca_id: string
          created_at: string
          id: string
          user_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          cobranca_id: string
          created_at?: string
          id?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          cobranca_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobranca_historico_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          data_instalacao: string | null
          data_vencimento: string
          dia_vencimento: number | null
          id: string
          mes_referencia: string | null
          numero_proposta: string | null
          observacoes: string | null
          status_id: string | null
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          data_vencimento: string
          dia_vencimento?: number | null
          id?: string
          mes_referencia?: string | null
          numero_proposta?: string | null
          observacoes?: string | null
          status_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          data_vencimento?: string
          dia_vencimento?: number | null
          id?: string
          mes_referencia?: string | null
          numero_proposta?: string | null
          observacoes?: string | null
          status_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_cobranca: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          cron_expression: string
          dias_atraso_minimo: number
          dias_semana: number[]
          filtro_numero_fatura: number[] | null
          hora: string
          id: string
          incluir_atrasados: boolean
          incluir_pendentes: boolean
          intervalo_envio_segundos: number
          proxima_execucao: string | null
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          cron_expression?: string
          dias_atraso_minimo?: number
          dias_semana?: number[]
          filtro_numero_fatura?: number[] | null
          hora?: string
          id?: string
          incluir_atrasados?: boolean
          incluir_pendentes?: boolean
          intervalo_envio_segundos?: number
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          cron_expression?: string
          dias_atraso_minimo?: number
          dias_semana?: number[]
          filtro_numero_fatura?: number[] | null
          hora?: string
          id?: string
          incluir_atrasados?: boolean
          incluir_pendentes?: boolean
          intervalo_envio_segundos?: number
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          webhook_conectar_instancia: string | null
          webhook_criar_instancia: string | null
          webhook_disparo: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          webhook_conectar_instancia?: string | null
          webhook_criar_instancia?: string | null
          webhook_disparo?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          webhook_conectar_instancia?: string | null
          webhook_criar_instancia?: string | null
          webhook_disparo?: string | null
        }
        Relationships: []
      }
      faturas: {
        Row: {
          cobranca_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          mes_referencia: string
          observacoes: string | null
          status_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          cobranca_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status_id?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          cobranca_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_cobranca_critica: {
        Row: {
          cliente_id: string
          created_at: string
          dias_atraso: number
          fatura_id: string
          id: string
          prioridade: number
          processado: boolean
          processado_at: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          dias_atraso?: number
          fatura_id: string
          id?: string
          prioridade?: number
          processado?: boolean
          processado_at?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          dias_atraso?: number
          fatura_id?: string
          id?: string
          prioridade?: number
          processado?: boolean
          processado_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fila_cobranca_critica_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_cobranca_critica_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      filas_cobranca: {
        Row: {
          cliente_id: string
          created_at: string
          enviado_at: string | null
          erro_mensagem: string | null
          fatura_id: string
          id: string
          regra_id: string | null
          status: Database["public"]["Enums"]["status_fila_cobranca"]
          tentativas: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          enviado_at?: string | null
          erro_mensagem?: string | null
          fatura_id: string
          id?: string
          regra_id?: string | null
          status?: Database["public"]["Enums"]["status_fila_cobranca"]
          tentativas?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          enviado_at?: string | null
          erro_mensagem?: string | null
          fatura_id?: string
          id?: string
          regra_id?: string | null
          status?: Database["public"]["Enums"]["status_fila_cobranca"]
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filas_cobranca_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filas_cobranca_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filas_cobranca_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_cobranca"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_cobranca: {
        Row: {
          api_response: Json | null
          canal: string
          cliente_id: string
          created_at: string
          data_envio: string
          fatura_id: string
          fila_critica: boolean
          id: string
          mensagem_enviada: string | null
          regra_id: string | null
          status: Database["public"]["Enums"]["status_historico_cobranca"]
        }
        Insert: {
          api_response?: Json | null
          canal?: string
          cliente_id: string
          created_at?: string
          data_envio?: string
          fatura_id: string
          fila_critica?: boolean
          id?: string
          mensagem_enviada?: string | null
          regra_id?: string | null
          status?: Database["public"]["Enums"]["status_historico_cobranca"]
        }
        Update: {
          api_response?: Json | null
          canal?: string
          cliente_id?: string
          created_at?: string
          data_envio?: string
          fatura_id?: string
          fila_critica?: boolean
          id?: string
          mensagem_enviada?: string | null
          regra_id?: string | null
          status?: Database["public"]["Enums"]["status_historico_cobranca"]
        }
        Relationships: [
          {
            foreignKeyName: "historico_cobranca_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cobranca_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cobranca_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_cobranca"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_mensagens: {
        Row: {
          api_response: Json | null
          canal: string
          cliente_id: string
          created_at: string
          fatura_id: string | null
          id: string
          lote_id: string | null
          mensagem: string
          status: string | null
          tipo: Database["public"]["Enums"]["tipo_mensagem"]
        }
        Insert: {
          api_response?: Json | null
          canal?: string
          cliente_id: string
          created_at?: string
          fatura_id?: string | null
          id?: string
          lote_id?: string | null
          mensagem: string
          status?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mensagem"]
        }
        Update: {
          api_response?: Json | null
          canal?: string
          cliente_id?: string
          created_at?: string
          fatura_id?: string | null
          id?: string
          lote_id?: string | null
          mensagem?: string
          status?: string | null
          tipo?: Database["public"]["Enums"]["tipo_mensagem"]
        }
        Relationships: [
          {
            foreignKeyName: "historico_mensagens_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_mensagens_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_mensagens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_cobranca"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          detalhes_erro: Json | null
          id: string
          nome_arquivo: string
          registros_atualizados: number
          registros_erro: number
          registros_importados: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes_erro?: Json | null
          id?: string
          nome_arquivo: string
          registros_atualizados?: number
          registros_erro?: number
          registros_importados?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes_erro?: Json | null
          id?: string
          nome_arquivo?: string
          registros_atualizados?: number
          registros_erro?: number
          registros_importados?: number
          user_id?: string | null
        }
        Relationships: []
      }
      instancias_whatsapp: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome: string
          qrcode: string | null
          resposta_conexao: Json | null
          resposta_criacao: Json | null
          status: Database["public"]["Enums"]["status_instancia"]
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          qrcode?: string | null
          resposta_conexao?: Json | null
          resposta_criacao?: Json | null
          status?: Database["public"]["Enums"]["status_instancia"]
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          qrcode?: string | null
          resposta_conexao?: Json | null
          resposta_criacao?: Json | null
          status?: Database["public"]["Enums"]["status_instancia"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      itens_lote: {
        Row: {
          cliente_id: string
          created_at: string
          enviado_at: string | null
          erro_mensagem: string | null
          fatura_id: string
          id: string
          lote_id: string
          mensagem_gerada: string | null
          status_envio: Database["public"]["Enums"]["status_envio"]
          telefone: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          enviado_at?: string | null
          erro_mensagem?: string | null
          fatura_id: string
          id?: string
          lote_id: string
          mensagem_gerada?: string | null
          status_envio?: Database["public"]["Enums"]["status_envio"]
          telefone: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          enviado_at?: string | null
          erro_mensagem?: string | null
          fatura_id?: string
          id?: string
          lote_id?: string
          mensagem_gerada?: string | null
          status_envio?: Database["public"]["Enums"]["status_envio"]
          telefone?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_lote_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_lote_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_cobranca"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_cobranca: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["lote_status"]
          total_enviados: number
          total_falha: number
          total_faturas: number
          total_sucesso: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["lote_status"]
          total_enviados?: number
          total_falha?: number
          total_faturas?: number
          total_sucesso?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["lote_status"]
          total_enviados?: number
          total_falha?: number
          total_faturas?: number
          total_sucesso?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regras_cobranca: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          dias: number
          id: string
          ordem: number
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias?: number
          id?: string
          ordem?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias?: number
          id?: string
          ordem?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_pagamento: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
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
      increment_lote_failure: { Args: { lote_id: string }; Returns: undefined }
      increment_lote_success: { Args: { lote_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_operator: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operator"
      lote_status:
        | "rascunho"
        | "aguardando_aprovacao"
        | "aprovado"
        | "em_andamento"
        | "concluido"
        | "cancelado"
      status_envio: "pendente" | "enviando" | "enviado" | "falha"
      status_fila_cobranca: "pendente" | "processando" | "enviado" | "falha"
      status_historico_cobranca: "enviado" | "falha"
      status_instancia: "criada" | "conectada" | "desconectada" | "erro"
      tipo_mensagem: "cobranca" | "lembrete" | "agradecimento"
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
      app_role: ["admin", "operator"],
      lote_status: [
        "rascunho",
        "aguardando_aprovacao",
        "aprovado",
        "em_andamento",
        "concluido",
        "cancelado",
      ],
      status_envio: ["pendente", "enviando", "enviado", "falha"],
      status_fila_cobranca: ["pendente", "processando", "enviado", "falha"],
      status_historico_cobranca: ["enviado", "falha"],
      status_instancia: ["criada", "conectada", "desconectada", "erro"],
      tipo_mensagem: ["cobranca", "lembrete", "agradecimento"],
    },
  },
} as const
