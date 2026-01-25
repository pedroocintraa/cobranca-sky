
# Plano: Sistema de Cobrança Automática com IA e WhatsApp

## Visão Geral

Implementar um sistema completo de cobrança automática que:
1. Monitora faturas em aberto por cliente
2. Gera lotes de disparo para aprovação
3. Usa IA (Gemini) para criar mensagens personalizadas
4. Envia via UAZAPI (WhatsApp)
5. Registra histórico de envios e respostas

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAINEL DE COBRANÇA                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  Faturas Abertas │   │  Lotes Pendentes │   │  Histórico Envios│    │
│  │  por Cliente     │   │  (Aprovação)     │   │  (Logs)          │    │
│  └────────┬─────────┘   └────────┬─────────┘   └──────────────────┘    │
│           │                      │                                      │
│           ▼                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    CRIAR LOTE DE DISPARO                          │  │
│  │  [ ] Selecionar clientes    [Gerar Mensagens com IA]  [Aprovar]   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EDGE FUNCTIONS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │ gerar-mensagem  │     │ enviar-whatsapp │     │ processar-lote  │   │
│  │ (Lovable AI)    │     │ (UAZAPI)        │     │ (Orquestrador)  │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Novas Tabelas no Banco de Dados

### 1. `lotes_cobranca` - Lotes de disparo

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| nome | TEXT | Nome do lote (ex: "Cobrança Janeiro 2026") |
| status | ENUM | 'rascunho', 'aguardando_aprovacao', 'aprovado', 'em_andamento', 'concluido', 'cancelado' |
| total_faturas | INTEGER | Quantidade de faturas no lote |
| total_enviados | INTEGER | Quantidade já enviada |
| total_sucesso | INTEGER | Envios com sucesso |
| total_falha | INTEGER | Envios com falha |
| created_by | UUID | Usuário que criou |
| approved_by | UUID | Usuário que aprovou |
| created_at | TIMESTAMPTZ | Data de criação |
| approved_at | TIMESTAMPTZ | Data de aprovação |

### 2. `itens_lote` - Itens do lote (uma fatura por linha)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| lote_id | UUID | FK para lotes_cobranca |
| fatura_id | UUID | FK para faturas |
| cliente_id | UUID | FK para clientes |
| telefone | TEXT | Telefone do cliente (snapshot) |
| mensagem_gerada | TEXT | Mensagem gerada pela IA |
| status_envio | ENUM | 'pendente', 'enviando', 'enviado', 'falha' |
| tentativas | INTEGER | Número de tentativas |
| erro_mensagem | TEXT | Mensagem de erro (se houver) |
| enviado_at | TIMESTAMPTZ | Data/hora do envio |

### 3. `historico_mensagens` - Log de todas as mensagens

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| cliente_id | UUID | FK para clientes |
| fatura_id | UUID | FK para faturas |
| tipo | ENUM | 'cobranca', 'lembrete', 'agradecimento' |
| mensagem | TEXT | Conteúdo da mensagem |
| canal | TEXT | 'whatsapp' |
| status | TEXT | Status retornado pela API |
| api_response | JSONB | Resposta completa da API |
| created_at | TIMESTAMPTZ | Data/hora |

## Fluxo de Cobrança Automática

```text
1. PREPARAÇÃO DO LOTE
   ┌───────────────────────────────────────────────────────────────┐
   │ Operador seleciona faturas em aberto                          │
   │ - Filtro por status (Pendente, Atrasado)                      │
   │ - Filtro por mês de referência                                │
   │ - Filtro por quantidade de faturas em aberto do cliente       │
   └───────────────────────────────────────────────────────────────┘
                                │
                                ▼
2. GERAÇÃO DE MENSAGENS COM IA
   ┌───────────────────────────────────────────────────────────────┐
   │ Para cada cliente no lote:                                    │
   │ - Analisar situação (1 fatura atrasada? 3? todas?)            │
   │ - Gerar mensagem personalizada via Lovable AI (Gemini)        │
   │ - Armazenar mensagem para revisão                             │
   └───────────────────────────────────────────────────────────────┘
                                │
                                ▼
3. REVISÃO E APROVAÇÃO
   ┌───────────────────────────────────────────────────────────────┐
   │ Admin revisa mensagens geradas                                │
   │ - Pode editar mensagens individuais                           │
   │ - Pode remover clientes do lote                               │
   │ - Aprova lote para disparo                                    │
   └───────────────────────────────────────────────────────────────┘
                                │
                                ▼
4. DISPARO VIA WHATSAPP
   ┌───────────────────────────────────────────────────────────────┐
   │ Edge Function processa lote:                                  │
   │ - Envia mensagem via UAZAPI                                   │
   │ - Respeita limite de 100 msg/min                              │
   │ - Registra status de cada envio                               │
   │ - Atualiza progresso em tempo real                            │
   └───────────────────────────────────────────────────────────────┘
```

## Contexto para a IA Gerar Mensagens

A IA receberá os seguintes dados para gerar mensagens personalizadas:

```text
Contexto do Cliente:
- Nome do cliente
- Quantidade de faturas em aberto
- Valor total em aberto
- Lista de meses em atraso (ex: Nov/2025, Dez/2025)
- Dias de atraso da fatura mais antiga
- Histórico de pagamentos (se cliente costuma pagar em dia)

Tipos de Mensagem:
1. LEMBRETE GENTIL (1 fatura, poucos dias de atraso)
2. COBRANÇA MODERADA (2-3 faturas ou 30+ dias)
3. COBRANÇA FIRME (4+ faturas ou 60+ dias)
4. NEGOCIAÇÃO (muitas faturas, possível proposta)
```

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Cobranca.tsx` | Nova página de gestão de cobranças automáticas |
| `src/components/cobranca/LotesList.tsx` | Lista de lotes de cobrança |
| `src/components/cobranca/CreateLoteModal.tsx` | Modal para criar novo lote |
| `src/components/cobranca/LoteDetails.tsx` | Detalhes do lote com preview de mensagens |
| `src/components/cobranca/MessagePreview.tsx` | Preview da mensagem gerada pela IA |
| `src/hooks/useLotesCobranca.tsx` | Hook para CRUD de lotes |
| `src/hooks/useEnvioWhatsApp.tsx` | Hook para envio de mensagens |
| `supabase/functions/gerar-mensagem/index.ts` | Edge Function para gerar mensagem com IA |
| `supabase/functions/enviar-whatsapp/index.ts` | Edge Function para enviar via UAZAPI |
| `supabase/functions/processar-lote/index.ts` | Edge Function orquestradora |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota /cobranca |
| `src/components/layout/ExpandedSidebar.tsx` | Adicionar link "Cobrança Automática" |
| `src/components/layout/MiniSidebar.tsx` | Adicionar ícone |
| `src/types/database.ts` | Adicionar tipos LoteCobranca, ItemLote, HistoricoMensagem |

## Nova Página: Cobrança Automática

### Layout da Página

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Cobrança Automática                            [+ Novo Lote]           │
│  Gerencie seus disparos de cobrança via WhatsApp                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Em Rascunho │ │ Aguardando  │ │ Em Andamento│ │ Concluídos  │       │
│  │     2       │ │   Aprovação │ │      1      │ │     15      │       │
│  │             │ │      3      │ │             │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ LOTES RECENTES                                                     │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ Nome             │ Status      │ Faturas │ Enviados │ Ações       │ │
│  │ Cobrança Jan/26  │ ⏳ Aguard.  │ 45      │ 0/45     │ [Ver][Aprov]│ │
│  │ Cobrança Dez/25  │ ✅ Concluído│ 42      │ 40/42    │ [Ver]       │ │
│  │ Cobrança Nov/25  │ ✅ Concluído│ 45      │ 43/45    │ [Ver]       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modal de Criação de Lote

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Criar Novo Lote de Cobrança                                     [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Nome do Lote: [Cobrança Janeiro 2026                    ]              │
│                                                                         │
│  Filtros:                                                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Status: [Atrasado ▼]  Mês: [Todos ▼]  Dias Atraso: [> 7 dias ▼]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Clientes Selecionados: 45 de 45                                       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ [✓] Cliente                │ Faturas │ Valor Total │ Dias Atraso │ │
│  │ [✓] João Silva             │ 3       │ R$ 450,00   │ 62 dias     │ │
│  │ [✓] Maria Santos           │ 2       │ R$ 300,00   │ 31 dias     │ │
│  │ [✓] Pedro Costa            │ 1       │ R$ 150,00   │ 5 dias      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│           [Cancelar]  [Gerar Mensagens com IA]                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Edge Function: Geração de Mensagens com IA

A função usará o **Lovable AI** (que já está configurado com `LOVABLE_API_KEY`) para gerar mensagens personalizadas:

```text
Prompt base para a IA:

Você é um assistente de cobrança educado e profissional.
Gere uma mensagem de WhatsApp para cobrar o cliente.

CONTEXTO:
- Nome: {nome_cliente}
- Faturas em aberto: {qtd_faturas}
- Valor total: R$ {valor_total}
- Meses atrasados: {lista_meses}
- Dias de atraso: {dias_atraso}

REGRAS:
- Seja cordial mas objetivo
- Use o primeiro nome do cliente
- Mencione o valor e quantidade de parcelas
- Inclua opção de contato para negociação
- Máximo 300 caracteres
- Não use emojis excessivos

EXEMPLO:
"Olá João! Identificamos 2 parcelas em aberto (Nov e Dez) 
totalizando R$ 300,00. Podemos ajudar a regularizar?
Responda esta mensagem ou ligue (XX) XXXX-XXXX"
```

## Edge Function: Envio via UAZAPI

Integração com a API UAZAPI para envio de WhatsApp:

```text
Configuração necessária:
- UAZAPI_TOKEN: Token de autenticação
- UAZAPI_INSTANCE_ID: ID da instância WhatsApp

Endpoint: POST https://api.uazapi.com/message/sendText

Request:
{
  "phoneNumber": "5511999999999",
  "messageText": "Mensagem de cobrança...",
  "additionalFields": {
    "delay": 2
  }
}

Tratamento:
- Rate limit: 100 msg/min
- Retry em caso de falha (até 3x)
- Log de cada envio
```

## Secrets Necessários

Será necessário adicionar os seguintes secrets ao projeto:

| Secret | Descrição |
|--------|-----------|
| `UAZAPI_TOKEN` | Token de autenticação da UAZAPI |
| `UAZAPI_INSTANCE_ID` | ID da instância WhatsApp configurada |

## Sequência de Implementação

### Fase 1: Estrutura Base
1. Criar migração SQL para novas tabelas
2. Adicionar tipos TypeScript
3. Criar hooks de acesso aos dados

### Fase 2: Interface de Gestão
4. Criar página de Cobrança Automática
5. Implementar lista de lotes
6. Implementar modal de criação de lote
7. Implementar seleção de clientes/faturas

### Fase 3: Geração de Mensagens
8. Criar Edge Function `gerar-mensagem` com Lovable AI
9. Implementar preview de mensagens na UI
10. Permitir edição manual de mensagens

### Fase 4: Envio via WhatsApp
11. Criar Edge Function `enviar-whatsapp` com UAZAPI
12. Criar Edge Function `processar-lote` (orquestrador)
13. Implementar fluxo de aprovação
14. Implementar acompanhamento em tempo real

### Fase 5: Histórico e Relatórios
15. Implementar histórico de mensagens por cliente
16. Criar relatório de efetividade de cobranças

## Detalhes Técnicos

### Tipos TypeScript

```typescript
type LoteStatus = 
  | 'rascunho' 
  | 'aguardando_aprovacao' 
  | 'aprovado' 
  | 'em_andamento' 
  | 'concluido' 
  | 'cancelado';

type StatusEnvio = 'pendente' | 'enviando' | 'enviado' | 'falha';

type TipoMensagem = 'cobranca' | 'lembrete' | 'agradecimento';

interface LoteCobranca {
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
}

interface ItemLote {
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
  // Joined
  cliente?: Cliente;
  fatura?: Fatura;
}

interface HistoricoMensagem {
  id: string;
  cliente_id: string;
  fatura_id: string | null;
  tipo: TipoMensagem;
  mensagem: string;
  canal: string;
  status: string;
  api_response: Record<string, unknown> | null;
  created_at: string;
}
```

### RLS Policies

```sql
-- Lotes: mesmo padrão das outras tabelas
CREATE POLICY "Authenticated users can view lotes"
  ON lotes_cobranca FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert lotes"
  ON lotes_cobranca FOR INSERT WITH CHECK (is_authenticated_user());

-- Apenas admin pode aprovar e disparar
CREATE POLICY "Admin can update lotes"
  ON lotes_cobranca FOR UPDATE USING (is_admin());
```

### Integração UAZAPI

```typescript
// Formato do telefone: remover caracteres especiais
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Adicionar código do país se não tiver
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  return digits;
}

// Exemplo de envio
const response = await fetch('https://api.uazapi.com/message/sendText', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${UAZAPI_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumber: formatPhone(cliente.telefone),
    messageText: mensagem,
    additionalFields: { delay: 2 }
  })
});
```
