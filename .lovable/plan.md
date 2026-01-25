

# Plano: Implementar Atualização de Cobranças Existentes (CPF + Proposta)

## Entendimento do Problema

Atualmente o sistema:
- Sempre cria novas cobranças na importação
- Não considera que um cliente pode ter múltiplas cobranças ao longo do tempo
- Não atualiza cobranças existentes

O que você precisa:
- Clientes têm cobranças mensais recorrentes
- Cada cobrança é identificada por **CPF + Número da Proposta**
- Se já existe uma cobrança com mesmo CPF + Proposta, **atualizar** os dados
- Se não existe, **criar** uma nova cobrança

## Mudanças Necessárias

### Arquivo: `src/pages/Importar.tsx`

**1. Tornar Número da Proposta obrigatório (labels)**

| Campo | Antes | Depois |
|-------|-------|--------|
| CPF | CPF * | CPF * |
| Nº Proposta | Nº Proposta | Nº Proposta * |

**2. Adicionar validação para número da proposta**

```text
Antes:
  if (!mapping.cpf) {
    toast({ description: 'Mapeie o campo CPF.' });
  }

Depois:
  if (!mapping.cpf || !mapping.numero_proposta) {
    toast({ description: 'Mapeie os campos CPF e Nº Proposta.' });
  }
```

**3. Buscar cobranças existentes antes do loop de importação**

```text
// Buscar todas as cobranças existentes com suas propostas
const { data: cobrancasExistentes } = await supabase
  .from('cobrancas')
  .select('id, numero_proposta, cliente:clientes(cpf)');
```

**4. Alterar lógica de processamento para verificar se já existe**

```text
Para cada linha da planilha:

1. Extrair CPF e número_proposta
2. Verificar se já existe cobrança com mesmo CPF + proposta
3. Se existe:
   - Atualizar cobrança existente (UPDATE)
   - Incrementar contador "updated"
4. Se não existe:
   - Criar nova cobrança (INSERT)
   - Incrementar contador "success"
```

**5. Implementar UPDATE quando cobrança existe**

```text
// Buscar cobrança existente
const cobrancaExistente = cobrancasExistentes?.find(c => 
  c.cliente?.cpf === cpf && 
  c.numero_proposta === numeroProposta
);

if (cobrancaExistente) {
  // UPDATE - atualizar dados
  const { error } = await supabase
    .from('cobrancas')
    .update({
      valor,
      data_instalacao: dataInstalacao,
      data_vencimento: dataVencimento,
      status_id: statusId,
      updated_by: user?.id
    })
    .eq('id', cobrancaExistente.id);
    
  results.updated++;
} else {
  // INSERT - criar nova
  await supabase.from('cobrancas').insert([...]);
  results.success++;
}
```

## Fluxo de Importação Atualizado

```text
+------------------+
| Upload Planilha  |
+--------+---------+
         |
         v
+------------------+
| Mapear Colunas   |
| - CPF *          |
| - Nº Proposta *  |
| - Demais campos  |
+--------+---------+
         |
         v
+------------------+
| Buscar Cobranças |
| Existentes       |
+--------+---------+
         |
         v
+------------------+
| Para cada linha: |
|                  |
| CPF + Proposta   |
| já existe?       |
+--------+---------+
    |         |
   SIM       NAO
    |         |
    v         v
+-------+ +-------+
|UPDATE | |INSERT |
+-------+ +-------+
    |         |
    v         v
+------------------+
| Contabilizar     |
| - Atualizados    |
| - Criados        |
| - Erros          |
+------------------+
```

## Resultado Esperado

| Cenário | Comportamento |
|---------|---------------|
| CPF + Proposta não existe | Cria novo cliente (se necessário) + nova cobrança |
| CPF + Proposta já existe | Atualiza valor, datas, status da cobrança existente |
| CPF existe, Proposta nova | Cria nova cobrança para o cliente existente |

## Mensagens de Feedback

```text
Importação concluída:
- X registros criados
- Y registros atualizados  
- Z erros
```

## Campos Obrigatórios Atualizados

| Campo | Obrigatório | Motivo |
|-------|-------------|--------|
| CPF | Sim | Identifica o cliente |
| Nº Proposta | Sim | Identifica a cobrança única |
| Nome | Não | Usa CPF como fallback |
| Valor | Não | Default: 0 |
| Data Vencimento | Não | Default: data atual |

