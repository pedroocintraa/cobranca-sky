export type AppRole = 'admin' | 'operator';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusPagamento {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cobranca {
  id: string;
  cliente_id: string;
  numero_proposta: string | null;
  valor: number;
  data_instalacao: string | null;
  data_vencimento: string;
  status_id: string | null;
  observacoes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: Cliente;
  status?: StatusPagamento;
}

export interface CobrancaHistorico {
  id: string;
  cobranca_id: string;
  user_id: string | null;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
  // Joined data
  profile?: Profile;
}

export interface ImportLog {
  id: string;
  user_id: string | null;
  nome_arquivo: string;
  registros_importados: number;
  registros_atualizados: number;
  registros_erro: number;
  detalhes_erro: Record<string, unknown> | null;
  created_at: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalCobrancas: number;
  valorTotal: number;
  totalPagos: number;
  valorPagos: number;
  totalAtrasados: number;
  valorAtrasados: number;
  totalPendentes: number;
  valorPendentes: number;
  vencendoHoje: number;
  vencendo7Dias: number;
}
