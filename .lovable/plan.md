
# Plano: Corrigir Erros de Build

## Problemas Identificados

### 1. Importacao Duplicada (ClientesAtrasados.tsx)
- Linha 21 e 31 tem a mesma importacao de `useClientesComFaturasAtrasadas`
- **Acao**: Remover a linha 31

### 2. Tabelas Inexistentes no Banco de Dados
O codigo em `useRegrasCobranca.tsx` tenta acessar:
- `regras_cobranca` - NAO EXISTE
- `fila_cobranca_critica` - NAO EXISTE

Tabelas que existem atualmente:
- clientes, cobranca_historico, cobrancas, configuracoes_cobranca, faturas, historico_mensagens, import_logs, itens_lote, lotes_cobranca, profiles, status_pagamento, user_roles

**Acao**: Criar as tabelas no banco de dados:

```sql
-- Criar tabela regras_cobranca
CREATE TABLE public.regras_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('antes_vencimento', 'apos_vencimento')),
  dias INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela fila_cobranca_critica
CREATE TABLE public.fila_cobranca_critica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  dias_atraso INTEGER NOT NULL DEFAULT 0,
  prioridade INTEGER NOT NULL DEFAULT 0,
  processado BOOLEAN NOT NULL DEFAULT false,
  processado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.regras_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_cobranca_critica ENABLE ROW LEVEL SECURITY;

-- Criar politicas RLS
CREATE POLICY "Admin can manage regras" ON public.regras_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view regras" ON public.regras_cobranca
  FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Admin can manage fila" ON public.fila_cobranca_critica
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view fila" ON public.fila_cobranca_critica
  FOR SELECT USING (is_authenticated_user());

-- Criar enum para tipo de regra
DO $$ BEGIN
  CREATE TYPE tipo_regra_cobranca AS ENUM ('antes_vencimento', 'apos_vencimento');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

### 3. Icone Inexistente (CobrancaAutomatica.tsx)
- O icone `Rule` nao existe em lucide-react
- **Acao**: Substituir `Rule` por `Scale` ou `ListChecks` (icones validos)

### 4. Tipos Incompativeis (GerenciarRegrasCobranca.tsx)
- O formulario envia campos opcionais mas o hook espera campos obrigatorios
- **Acao**: Garantir que todos os campos obrigatorios sejam enviados no submit

---

## Arquivos a Modificar

### 1. src/components/cobranca/ClientesAtrasados.tsx
- Remover linha 31 (importacao duplicada)

### 2. src/pages/CobrancaAutomatica.tsx
- Substituir importacao de `Rule` por `Scale` ou `ListChecks`

### 3. src/components/cobranca/GerenciarRegrasCobranca.tsx
- Ajustar handleSubmit para enviar objeto completo com tipo obrigatorio

### 4. Migracao SQL
- Criar tabelas `regras_cobranca` e `fila_cobranca_critica` no banco

---

## Sequencia de Implementacao

1. Executar migracao SQL para criar as tabelas ausentes
2. Corrigir importacao duplicada em ClientesAtrasados.tsx
3. Corrigir icone inexistente em CobrancaAutomatica.tsx
4. Corrigir tipos em GerenciarRegrasCobranca.tsx
5. Verificar se o types.ts sera regenerado automaticamente

---

## Por que isso aconteceu?

Quando voce edita codigo diretamente no GitHub:
- As alteracoes de **codigo** sao sincronizadas com o Lovable
- Porem, **migracoes de banco de dados** NAO sao executadas automaticamente

O codigo que voce subiu espera tabelas (`regras_cobranca`, `fila_cobranca_critica`) que nunca foram criadas no Supabase. Por isso os erros de tipo aparecem - o TypeScript sabe que essas tabelas nao existem.

---

## Resultado Esperado

Apos as correcoes:
- Build passara sem erros
- As funcionalidades de regras de cobranca funcionarao
- A fila de cobranca critica estara disponivel
