

# Plano: Sistema de Cobranças Mensais Recorrentes com Atualização Automática de Status

## Entendimento do Cenário

Atualmente:
- Cobranças têm uma data de vencimento fixa (ex: 27/11/2025)
- O status precisa ser atualizado manualmente

O que você precisa:
- Cliente tem um **dia de vencimento** (ex: dia 27)
- Todo mês ele tem uma cobrança que vence nesse dia
- O status deve mudar automaticamente:
  - **Pendente**: quando o mês atual chega
  - **Atrasado**: quando passa do dia de vencimento sem pagamento

## Abordagem Proposta

Vou criar um **job automático** que roda diariamente para:
1. Verificar todas as cobranças
2. Atualizar status para "Atrasado" se a data de vencimento passou
3. Criar nova cobrança do próximo mês quando o mês atual terminar (opcional)

## Mudanças Necessárias

### 1. Adicionar campo `dia_vencimento` na tabela `cobrancas`

Este campo armazenará apenas o **dia** do mês (1-31) para facilitar o cálculo mensal.

```sql
ALTER TABLE cobrancas 
ADD COLUMN dia_vencimento INTEGER;

-- Preencher automaticamente baseado na data_vencimento existente
UPDATE cobrancas 
SET dia_vencimento = EXTRACT(DAY FROM data_vencimento);
```

### 2. Criar Edge Function para atualização automática de status

**Arquivo**: `supabase/functions/atualizar-status-cobrancas/index.ts`

```text
Lógica:
1. Buscar todas as cobranças que NÃO estão "Pago" ou "Cancelado"
2. Para cada cobrança:
   - Se data_vencimento < hoje → marcar como "Atrasado"
   - Se data_vencimento = hoje → marcar como "Pendente" (se não tiver status)
3. Registrar log da execução
```

### 3. Agendar execução diária via CRON

```sql
-- Executar todo dia às 00:05
SELECT cron.schedule(
  'atualizar-status-cobrancas',
  '5 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjwnkaoeiaylbhmmdbec.supabase.co/functions/v1/atualizar-status-cobrancas',
    headers := '{"Authorization": "Bearer <anon_key>"}'::jsonb
  ) AS request_id;
  $$
);
```

### 4. Opção: Gerar cobranças do próximo mês automaticamente

```text
Quando o mês termina:
1. Buscar todas as cobranças do mês atual
2. Criar cópia para o próximo mês com:
   - Mesmo cliente_id
   - Mesmo numero_proposta
   - Mesmo dia_vencimento
   - Status = Pendente
   - data_vencimento = dia_vencimento do próximo mês
```

## Fluxo Automático

```text
┌─────────────────────────────────────────────────────────────┐
│                     CRON (Todo dia 00:05)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function: atualizar-status                │
│                                                             │
│  1. Buscar cobranças com status != Pago/Cancelado           │
│  2. Para cada cobrança:                                     │
│     ┌─────────────────────────────────────────────────────┐ │
│     │ data_vencimento < hoje?                             │ │
│     │   SIM → status = "Atrasado"                         │ │
│     │   NÃO → mantém status atual                         │ │
│     └─────────────────────────────────────────────────────┘ │
│  3. Log: "X cobranças atualizadas para Atrasado"            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo Mensal (Importação)

```text
┌─────────────────────────────────────────────────────────────┐
│              Upload Planilha (Mensal)                       │
│              Ex: Planilha 01/2026                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Identificar por CPF + Nº Proposta                   │
│                                                             │
│  ┌────────────────┐        ┌──────────────────────────────┐ │
│  │ Já existe?     │   NÃO  │ Criar nova cobrança          │ │
│  │ (mesmo CPF +   │───────▶│ - data_vencimento: 27/01/26  │ │
│  │  proposta)     │        │ - dia_vencimento: 27         │ │
│  └────────────────┘        │ - status: Pendente           │ │
│         │ SIM              └──────────────────────────────┘ │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Atualizar data_vencimento para novo mês              │   │
│  │ - data_vencimento: 27/01/2026                        │   │
│  │ - Manter valor, proposta, cliente                    │   │
│  │ - Reset status para "Pendente"                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration SQL | Criar | Adicionar coluna `dia_vencimento` |
| `supabase/functions/atualizar-status-cobrancas/index.ts` | Criar | Edge function para atualização automática |
| `supabase/config.toml` | Editar | Registrar nova função |
| `src/pages/Importar.tsx` | Editar | Resetar status para Pendente ao atualizar |
| Migration SQL | Criar | Configurar CRON job |

## Comportamento Esperado

| Situação | Status Atual | Ação Automática |
|----------|--------------|-----------------|
| Vencimento no futuro | Pendente | Nada |
| Vencimento hoje | Pendente | Nada |
| Vencimento ontem | Pendente | → Atrasado |
| Já está Pago | Pago | Nada |
| Já está Cancelado | Cancelado | Nada |
| Nova importação (mesmo CPF+Proposta) | Atrasado | → Pendente (novo mês) |

## Exemplo Prático

```text
Cliente: João Silva
CPF: 123.456.789-00
Proposta: 5100199972
Dia vencimento: 27

Timeline:
- 27/11/2025: Cobrança criada → Status: Pendente
- 28/11/2025: CRON roda → Status: Atrasado (passou do dia 27)
- 15/12/2025: Importa planilha 12/2025 → Status: Pendente (nova data: 27/12/2025)
- 28/12/2025: CRON roda → Status: Atrasado
- E assim continua...
```

## Resultado Final

- Status atualiza automaticamente todos os dias
- Importação mensal atualiza a data de vencimento
- Histórico de mudanças de status é mantido (trigger existente)
- Cobranças pagas ou canceladas não são afetadas

