

# Plano: Tornar Apenas CPF Obrigatório na Importação

## Situação Atual

O sistema exige três campos obrigatórios:
- Nome do Cliente
- Valor  
- Data de Vencimento

Você quer que **apenas o CPF seja obrigatório**.

## Considerações do Banco de Dados

Analisei as tabelas e encontrei estas restrições:

| Tabela | Campo | Restrição |
|--------|-------|-----------|
| `clientes` | `nome` | NOT NULL (obrigatório) |
| `cobrancas` | `valor` | Default: 0 |
| `cobrancas` | `data_vencimento` | NOT NULL (obrigatório) |

Para contornar isso, vou:
- Usar o CPF como nome quando o nome não for mapeado
- Usar 0 como valor padrão
- Usar a data atual como vencimento padrão

## Mudanças Necessárias

### Arquivo: `src/pages/Importar.tsx`

**1. Atualizar labels dos campos (linha 67-76)**
```text
Antes:
  nome: 'Nome do Cliente *'
  valor: 'Valor *'
  data_vencimento: 'Data Vencimento *'
  cpf: 'CPF'

Depois:
  nome: 'Nome do Cliente'
  valor: 'Valor'
  data_vencimento: 'Data Vencimento'
  cpf: 'CPF *'
```

**2. Alterar validação inicial (linha 216-224)**
```text
Antes:
  if (!mapping.nome || !mapping.valor || !mapping.data_vencimento) {
    toast({ description: 'Mapeie os campos Nome, Valor e Data de Vencimento.' });
    return;
  }

Depois:
  if (!mapping.cpf) {
    toast({ description: 'Mapeie o campo CPF.' });
    return;
  }
```

**3. Ajustar lógica de processamento (linha 236-250)**
```text
Antes:
  const nome = row[mapping.nome]?.trim();
  if (!nome || !dataVencimento) { erro... }

Depois:
  const cpf = row[mapping.cpf]?.trim();
  const nome = mapping.nome ? row[mapping.nome]?.trim() : cpf;
  const valor = mapping.valor ? parseValor(row[mapping.valor]) : 0;
  const dataVencimento = mapping.data_vencimento 
    ? parseDate(row[mapping.data_vencimento]) 
    : new Date().toISOString().split('T')[0];
  
  if (!cpf) { 
    erro: 'CPF inválido ou vazio';
    continue; 
  }
```

**4. Ajustar busca de cliente existente (linha 254-256)**
```text
Antes:
  const existingCliente = clientes?.find(
    (c) => (cpf && c.cpf === cpf) || c.nome.toLowerCase() === nome.toLowerCase()
  );

Depois:
  const existingCliente = clientes?.find((c) => c.cpf === cpf);
```

## Comportamento Final

| Campo | Obrigatório | Valor Padrão |
|-------|-------------|--------------|
| CPF | Sim | - |
| Nome | Não | Usa o CPF |
| Valor | Não | 0 |
| Data Vencimento | Não | Data atual |
| Demais campos | Não | null |

## Resultado Esperado

- Importação funciona apenas com coluna CPF mapeada
- Clientes são identificados/criados pelo CPF
- Campos opcionais usam valores padrão quando não mapeados
- Labels atualizados para refletir novo campo obrigatório

