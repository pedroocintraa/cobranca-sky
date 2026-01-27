
# Plano: Criar Tabelas Faltantes no Banco de Dados

## Problema Identificado

O codigo sincronizado do GitHub espera duas tabelas que nao existem no banco de dados:

1. **`filas_cobranca`** - Tabela para gerenciar filas de cobranca por regra
2. **`historico_cobranca`** - Tabela para registrar historico de envios de cobranca

### Tabelas Existentes vs Esperadas

| Existe no Banco | Esperado no Codigo | Status |
|-----------------|-------------------|--------|
| `fila_cobranca_critica` | `filas_cobranca` | DIFERENTE |
| `historico_mensagens` | `historico_cobranca` | DIFERENTE |
| `regras_cobranca` | `regras_cobranca` | OK |

---

## Estrutura Esperada das Tabelas

### 1. Tabela `filas_cobranca`

Baseado no tipo `FilaCobranca` em `src/types/database.ts`:

```text
Campos:
- id: UUID (PK)
- regra_id: UUID (FK -> regras_cobranca, nullable para fila critica)
- fatura_id: UUID (FK -> faturas)
- cliente_id: UUID (FK -> clientes)
- status: ENUM ('pendente', 'processando', 'enviado', 'falha')
- tentativas: INTEGER (default 0)
- erro_mensagem: TEXT (nullable)
- enviado_at: TIMESTAMPTZ (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 2. Tabela `historico_cobranca`

Baseado no tipo `HistoricoCobranca` em `src/types/database.ts`:

```text
Campos:
- id: UUID (PK)
- fatura_id: UUID (FK -> faturas)
- regra_id: UUID (FK -> regras_cobranca, nullable)
- cliente_id: UUID (FK -> clientes)
- fila_critica: BOOLEAN (default false)
- data_envio: TIMESTAMPTZ
- status: ENUM ('enviado', 'falha')
- mensagem_enviada: TEXT (nullable)
- canal: TEXT (default 'whatsapp')
- api_response: JSONB (nullable)
- created_at: TIMESTAMPTZ
```

---

## SQL Migration a Executar

```sql
-- Criar enum para status da fila
CREATE TYPE status_fila_cobranca AS ENUM ('pendente', 'processando', 'enviado', 'falha');

-- Criar enum para status do historico
CREATE TYPE status_historico_cobranca AS ENUM ('enviado', 'falha');

-- Criar tabela filas_cobranca
CREATE TABLE public.filas_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE SET NULL,
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  status status_fila_cobranca NOT NULL DEFAULT 'pendente',
  tentativas INTEGER NOT NULL DEFAULT 0,
  erro_mensagem TEXT,
  enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela historico_cobranca
CREATE TABLE public.historico_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
  regra_id UUID REFERENCES public.regras_cobranca(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fila_critica BOOLEAN NOT NULL DEFAULT false,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT now(),
  status status_historico_cobranca NOT NULL DEFAULT 'enviado',
  mensagem_enviada TEXT,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  api_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.filas_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cobranca ENABLE ROW LEVEL SECURITY;

-- Politicas RLS para filas_cobranca
CREATE POLICY "Admin can manage filas" ON public.filas_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view filas" ON public.filas_cobranca
  FOR SELECT USING (is_authenticated_user());

-- Politicas RLS para historico_cobranca
CREATE POLICY "Admin can manage historico" ON public.historico_cobranca
  FOR ALL USING (is_admin());

CREATE POLICY "Authenticated users can view historico" ON public.historico_cobranca
  FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert historico" ON public.historico_cobranca
  FOR INSERT WITH CHECK (is_authenticated_user());

-- Trigger para updated_at em filas_cobranca
CREATE TRIGGER update_filas_cobranca_updated_at
  BEFORE UPDATE ON public.filas_cobranca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indices para performance
CREATE INDEX idx_filas_cobranca_regra_id ON public.filas_cobranca(regra_id);
CREATE INDEX idx_filas_cobranca_status ON public.filas_cobranca(status);
CREATE INDEX idx_filas_cobranca_fatura_id ON public.filas_cobranca(fatura_id);
CREATE INDEX idx_historico_cobranca_fatura_id ON public.historico_cobranca(fatura_id);
CREATE INDEX idx_historico_cobranca_data_envio ON public.historico_cobranca(data_envio);
```

---

## Sequencia de Implementacao

1. **Executar migracao SQL** - Criar as tabelas `filas_cobranca` e `historico_cobranca` com seus enums, RLS e indices

2. **Regeneracao automatica** - O arquivo `types.ts` sera atualizado automaticamente apos a migracao

3. **Build passara** - Com as tabelas existindo, os erros de TypeScript serao resolvidos

---

## Resultado Esperado

Apos a migracao:

- Build passara sem erros
- O hook `useFilasCobranca` funcionara corretamente
- O hook `useHistoricoCobranca` funcionara corretamente
- O componente `FilasCobranca` exibira as filas de cobranca
- O sistema de disparo de cobrancas funcionara

---

## Detalhes Tecnicos

### Relacionamentos

```text
filas_cobranca:
  - regra_id -> regras_cobranca (opcional, NULL = fila critica)
  - fatura_id -> faturas
  - cliente_id -> clientes

historico_cobranca:
  - fatura_id -> faturas
  - regra_id -> regras_cobranca (opcional)
  - cliente_id -> clientes
```

### RLS Policies

- **Admin**: Pode gerenciar (CRUD) todas as filas e historicos
- **Authenticated Users**: Podem visualizar (SELECT) e inserir historicos
