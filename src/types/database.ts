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
  dia_vencimento: number | null;
  mes_referencia: string | null;
  status_id: string | null;
  observacoes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: Cliente;
  status?: StatusPagamento;
  faturas?: Fatura[];
  fatura_pendente?: Fatura;
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

// Fatura (histórico mensal de uma cobrança)
export interface Fatura {
  id: string;
  cobranca_id: string;
  mes_referencia: string;
  data_vencimento: string;
  valor: number;
  status_id: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  status?: StatusPagamento;
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

// ============= Sistema de Cobrança Automática =============

export type LoteStatus = 
  | 'rascunho' 
  | 'aguardando_aprovacao' 
  | 'aprovado' 
  | 'em_andamento' 
  | 'concluido' 
  | 'cancelado';

export type StatusEnvio = 'pendente' | 'enviando' | 'enviado' | 'falha';

export type TipoMensagem = 'cobranca' | 'lembrete' | 'agradecimento';

export interface LoteCobranca {
  id: string;
  nome: string;
  status: LoteStatus;
  total_faturas: number;
  total_enviados: number;
  total_sucesso: number;
  total_falha: number;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
}

export interface ItemLote {
  id: string;
  lote_id: string;
  fatura_id: string;
  cliente_id: string;
  telefone: string;
  mensagem_gerada: string | null;
  status_envio: StatusEnvio;
  tentativas: number;
  erro_mensagem: string | null;
  enviado_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: Cliente;
  fatura?: Fatura;
}

export interface HistoricoMensagem {
  id: string;
  cliente_id: string;
  fatura_id: string | null;
  lote_id: string | null;
  tipo: TipoMensagem;
  mensagem: string;
  canal: string;
  status: string | null;
  api_response: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  cliente?: Cliente;
  fatura?: Fatura;
}

// Agregação de faturas por cliente para cobrança
export interface ClienteComFaturas {
  cliente: Cliente;
  faturas: Fatura[];
  totalFaturas: number;
  valorTotal: number;
  diasAtraso: number;
  mesesAtrasados: string[];
}

// ============= Sistema de Regras de Cobrança =============

export type TipoRegraCobranca = 'antes_vencimento' | 'apos_vencimento';

export interface RegraCobranca {
  id: string;
  tipo: TipoRegraCobranca;
  dias: number; // Negativo para antes, positivo para depois
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface FilaCobrancaCritica {
  id: string;
  fatura_id: string;
  cliente_id: string;
  dias_atraso: number;
  prioridade: number;
  processado: boolean;
  processado_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  fatura?: Fatura;
  cliente?: Cliente;
}

// Cliente com faturas atrasadas para visão gerencial
export interface ClienteComFaturasAtrasadas {
  cliente: Cliente;
  faturas: Fatura[];
  totalFaturas: number;
  valorTotal: number;
  diasAtraso: number;
  maiorAtraso: number; // Maior número de dias de atraso entre as faturas
  status: 'pendente' | 'atrasado' | 'critico'; // Status baseado no maior atraso
  mesesAtrasados: string[];
}
