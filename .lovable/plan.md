
# Plano: Agendamento CRON, Filtro por Número de Fatura e Mensagens sem Valor

## Visão Geral

Este plano implementa três funcionalidades solicitadas:

1. **Agendamento automático com CRON**: Disparar lotes de cobrança em dias e horários específicos
2. **Mensagens sem valor + Confirmação de CPF**: Remover o valor das mensagens e incluir confirmação com os 5 últimos dígitos do CPF
3. **Filtro por número de fatura**: Permitir filtrar por fatura 1, 2, 3, etc. (ordem cronológica de vencimento por cliente)

---

## 1. Agendamento Automático com CRON

### Conceito

O sistema permitirá agendar a geração de lotes de cobrança para rodar automaticamente em dias e horários específicos, usando pg_cron do Supabase.

### Nova Tabela: `configuracoes_cobranca`

Armazenará as configurações de agendamento:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| cron_expression | TEXT | Expressão CRON (ex: "0 8 * * 1-5" = 8h, seg-sex) |
| dias_atraso_minimo | INTEGER | Dias mínimos de atraso |
| incluir_atrasados | BOOLEAN | Incluir faturas atrasadas |
| incluir_pendentes | BOOLEAN | Incluir faturas pendentes |
| filtro_numero_fatura | INTEGER[] | Array de números de fatura (1, 2, 3...) |
| ativo | BOOLEAN | Se o agendamento está ativo |
| ultima_execucao | TIMESTAMPTZ | Data/hora da última execução |
| created_by | UUID | Usuário que criou |

### Fluxo do CRON

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          AGENDAMENTO CRON                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────┐                                                  │
│  │ pg_cron trigger   │                                                  │
│  │ (ex: 8h seg-sex)  │                                                  │
│  └─────────┬─────────┘                                                  │
│            │                                                            │
│            ▼                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Edge Function: executar-cron-cobranca                             │ │
│  │ - Ler configurações ativas                                        │ │
│  │ - Para cada config, chamar gerar-lote-automatico                  │ │
│  │ - Atualizar ultima_execucao                                       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│            │                                                            │
│            ▼                                                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Lote criado com status "aguardando_aprovacao"                     │ │
│  │ Admin recebe notificação para revisar e aprovar                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interface de Configuração

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENDAMENTO AUTOMÁTICO                                          [✓]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Frequência:          [Diariamente ▼]                                   │
│  Horário:             [08:00]                                           │
│  Dias da semana:      [✓] Seg [✓] Ter [✓] Qua [✓] Qui [✓] Sex [ ] Sab  │
│                                                                         │
│  Filtros:                                                               │
│  Dias Atraso Min:     [7]                                               │
│  Número da Fatura:    [✓] 1ª [✓] 2ª [✓] 3ª [ ] 4ª+ (selecionar)        │
│  Incluir:             [✓] Atrasados  [ ] Pendentes                      │
│                                                                         │
│  Última execução: 25/01/2026 às 08:00 - 45 faturas                     │
│                                                                         │
│                                    [Salvar] [Executar Agora]            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mensagens sem Valor + Confirmação de CPF

### Alteração no Prompt da IA

O prompt atual inclui o valor total. Será alterado para:
- Remover menção ao valor
- Adicionar confirmação de CPF (últimos 5 dígitos)

### Antes (atual)

```text
CONTEXTO:
- Nome: João
- Faturas em aberto: 3
- Valor total: R$ 450,00    <-- REMOVER
- Meses atrasados: Nov, Dez, Jan
```

### Depois (novo)

```text
CONTEXTO:
- Nome: João
- Faturas em aberto: 3
- Meses atrasados: Nov, Dez, Jan
- CPF (últimos 5 dígitos): *****78472   <-- ADICIONAR
```

### Novo Prompt para a IA

```text
Você é um assistente de cobrança educado e profissional.
Gere UMA mensagem de WhatsApp para cobrar o cliente.

CONTEXTO:
- Nome: {primeiroNome}
- Faturas em aberto: {quantidadeFaturas}
- Meses atrasados: {mesesAtrasados}
- Dias de atraso: {diasAtraso}
- Tipo de cobrança: {tipoCobranca}
- CPF para confirmação: *****{ultimosCincoCPF}

REGRAS IMPORTANTES:
- Seja cordial mas objetivo
- Use o primeiro nome do cliente
- Mencione a quantidade de parcelas em aberto
- NÃO mencione valores em reais
- Peça para o cliente confirmar os últimos 5 dígitos do CPF
- Inclua opção de contato para negociação
- Máximo 280 caracteres
- Não use emojis excessivos (máximo 2)
- NÃO inclua links ou URLs
- Termine com uma pergunta ou chamada para ação
```

### Exemplo de Mensagem Gerada

**Antes:**
> "Olá João! Identificamos 3 parcelas em aberto (Nov, Dez, Jan) totalizando R$ 450,00. Podemos ajudar a regularizar? Responda ou ligue (XX) XXXX-XXXX"

**Depois:**
> "Olá João! Identificamos 3 parcelas em aberto (Nov, Dez, Jan). Para sua segurança, confirme seu CPF final *****78472. Podemos ajudar a regularizar? Responda esta mensagem."

### Função para Mascarar CPF

```typescript
function mascararCPF(cpf: string): string {
  if (!cpf) return "*****00000";
  // Remove caracteres não numéricos
  const digits = cpf.replace(/\D/g, '');
  // Pega os últimos 5 dígitos
  const ultimos5 = digits.slice(-5).padStart(5, '0');
  return `*****${ultimos5}`;
}

// Exemplo:
// mascararCPF("238.725.784-72") => "*****78472"
// mascararCPF("23872578472")    => "*****78472"
```

---

## 3. Filtro por Número de Fatura

### Conceito

Cada cliente pode ter várias faturas em aberto. O "número da fatura" representa a ordem cronológica:
- Fatura 1 = primeira fatura em aberto (mais antiga)
- Fatura 2 = segunda fatura em aberto
- Fatura 3 = terceira fatura em aberto
- E assim por diante

### Exemplos dos Dados Reais

Com base nos dados do banco:
- **Braz Ribeiro Do Carmo**: Fatura 1 (Nov/25), Fatura 2 (Dez/25), Fatura 3 (Jan/26)
- **Lucineide De Amorim Silva**: Fatura 1 (Nov/25), Fatura 2 (Dez/25), Fatura 3 (Jan/26)

### Casos de Uso

| Filtro | Descrição | Uso |
|--------|-----------|-----|
| Fatura 1 apenas | Só primeira fatura de cada cliente | Primeiro contato, cobrança leve |
| Fatura 2 apenas | Segunda fatura em diante | Segundo aviso |
| Fatura 3+ | Três ou mais faturas | Cobrança mais firme |
| Faturas 1 e 2 | Até 2 faturas | Cobranças moderadas |

### Interface de Filtro

Na criação de lote (manual ou automático), adicionar:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  FILTROS                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Status:              [✓] Atrasado  [ ] Pendente                        │
│  Dias Atraso Min:     [7 dias ▼]                                        │
│                                                                         │
│  Número da Fatura:                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ [✓] 1ª Fatura  [✓] 2ª Fatura  [ ] 3ª Fatura  [ ] 4ª+ Faturas     ││
│  │                                                                    ││
│  │ Ou especifique: [1-3] (ex: "1" ou "1-3" ou "2,3")                 ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lógica de Cálculo do Número da Fatura

```sql
-- Para cada cliente, enumerar as faturas por ordem de vencimento
SELECT 
  f.*,
  ROW_NUMBER() OVER (
    PARTITION BY cl.id 
    ORDER BY f.data_vencimento ASC
  ) as numero_fatura
FROM faturas f
JOIN cobrancas co ON f.cobranca_id = co.id
JOIN clientes cl ON co.cliente_id = cl.id
WHERE f.status_id IN (SELECT id FROM status_pagamento WHERE nome IN ('Pendente', 'Atrasado'))
```

### Hook Atualizado: useFaturasEmAberto

O hook será atualizado para:
1. Calcular o número da fatura de cada cliente
2. Aceitar um parâmetro de filtro por número de fatura
3. Retornar apenas as faturas que correspondem ao filtro

---

## Detalhes Técnicos

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/cobranca/AgendamentoCard.tsx` | Card de configuração de agendamento |
| `src/components/cobranca/FiltroNumeroFatura.tsx` | Componente de filtro por número de fatura |
| `src/hooks/useAgendamentoCobranca.tsx` | Hook para gerenciar configurações de agendamento |
| `supabase/functions/executar-cron-cobranca/index.ts` | Edge Function chamada pelo CRON |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/gerar-mensagem/index.ts` | Remover valor, adicionar CPF mascarado |
| `supabase/functions/gerar-lote-automatico/index.ts` | Adicionar filtro por número de fatura |
| `src/components/cobranca/CreateLoteModal.tsx` | Adicionar filtro por número de fatura |
| `src/components/cobranca/GeracaoAutomaticaCard.tsx` | Adicionar filtro por número de fatura e agendamento |
| `src/hooks/useLotesCobranca.tsx` | Atualizar useFaturasEmAberto para calcular número da fatura |
| `src/types/database.ts` | Adicionar tipo ConfiguracaoCobranca |

### Migração SQL

```sql
-- Tabela de configurações de cobrança
CREATE TABLE IF NOT EXISTS public.configuracoes_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_expression TEXT NOT NULL DEFAULT '0 8 * * 1-5',
  dias_atraso_minimo INTEGER NOT NULL DEFAULT 1,
  incluir_atrasados BOOLEAN NOT NULL DEFAULT true,
  incluir_pendentes BOOLEAN NOT NULL DEFAULT false,
  filtro_numero_fatura INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ativo BOOLEAN NOT NULL DEFAULT false,
  ultima_execucao TIMESTAMPTZ,
  proxima_execucao TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.configuracoes_cobranca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage configuracoes"
  ON public.configuracoes_cobranca FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view configuracoes"
  ON public.configuracoes_cobranca FOR SELECT
  USING (public.is_authenticated_user());
```

### CRON Job SQL

Para criar o job CRON que executa diariamente:

```sql
SELECT cron.schedule(
  'cobranca-automatica-cron',
  '0 8 * * 1-5',  -- 8h, segunda a sexta
  $$
  SELECT net.http_post(
    url := 'https://pjwnkaoeiaylbhmmdbec.supabase.co/functions/v1/executar-cron-cobranca',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Sequência de Implementação

### Fase 1: Filtro por Número de Fatura
1. Atualizar `useFaturasEmAberto` para calcular número da fatura
2. Criar componente `FiltroNumeroFatura`
3. Atualizar `CreateLoteModal` com novo filtro
4. Atualizar `GeracaoAutomaticaCard` com novo filtro
5. Atualizar Edge Function `gerar-lote-automatico`

### Fase 2: Mensagens sem Valor + CPF
6. Atualizar Edge Function `gerar-mensagem` com novo prompt
7. Adicionar função de mascaramento de CPF
8. Buscar CPF do cliente junto com outros dados

### Fase 3: Agendamento CRON
9. Criar migração para tabela `configuracoes_cobranca`
10. Criar Edge Function `executar-cron-cobranca`
11. Criar componente `AgendamentoCard`
12. Criar hook `useAgendamentoCobranca`
13. Integrar na página principal
14. Configurar CRON job via SQL

---

## Interface Final da Geração Automática

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚡ GERAÇÃO AUTOMÁTICA DE LOTES                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ AGENDAMENTO                                           [Ativo ✓]   ││
│  │ Executa: Seg a Sex às 08:00                                       ││
│  │ Última execução: 25/01/2026 08:00 (45 faturas)                    ││
│  │                                               [Configurar]        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  FILTROS PARA GERAÇÃO                                                   │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐     │
│  │ Dias Atraso: [1 dia    ▼]   │ │ [✓] Atrasados [ ] Pendentes  │     │
│  └──────────────────────────────┘ └──────────────────────────────┘     │
│                                                                         │
│  NÚMERO DA FATURA                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ [✓] 1ª Fatura   [✓] 2ª Fatura   [ ] 3ª Fatura   [ ] 4ª+ Faturas │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                            [⚡ Gerar Lote Agora]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

Após a implementação:

1. **Agendamento CRON**: O sistema gerará lotes automaticamente nos horários configurados, aguardando apenas aprovação do admin

2. **Mensagens sem valor**: As mensagens não mencionarão valores, apenas quantidade de parcelas e meses em aberto

3. **Confirmação de CPF**: Cada mensagem incluirá os últimos 5 dígitos do CPF para confirmação de identidade

4. **Filtro por número de fatura**: O operador poderá escolher cobrar apenas a 1ª fatura, ou 2ª, ou 3ª+, permitindo estratégias diferenciadas de cobrança

### Benefícios

- **Automação total**: Lotes gerados automaticamente, admin só aprova
- **Segurança**: CPF mascarado para confirmação de identidade
- **Privacidade**: Sem valores expostos nas mensagens
- **Estratégia**: Filtros permitem abordagens diferentes por estágio de inadimplência
