
# CRM de Cobrança - Plano de Implementação

## Resumo
Sistema completo de gestão de cobranças com autenticação, controle de acesso por níveis (Admin/Operador), upload de planilhas Excel/CSV, monitoramento visual de vencimentos e status personalizáveis.

---

## Fase 1: Fundação e Autenticação

### Configuração do Banco de Dados (Supabase)
- Tabelas principais: clientes, cobranças, status_pagamento (personalizável), user_roles
- Sistema de autenticação com dois níveis de acesso: Admin e Operador
- Políticas de segurança (RLS) para proteção dos dados

### Página de Login/Cadastro
- Tela de autenticação com email e senha
- Design clean seguindo as diretrizes visuais (azul #0056b3, Roboto, cantos arredondados 10px)
- Redirecionamento automático após login

---

## Fase 2: Dashboard Principal

### Visão Geral das Cobranças
- Cards com métricas: total de cobranças, valores a receber, atrasados, pagos
- Indicadores visuais de vencimentos (cores por status: verde/amarelo/vermelho)
- Filtros rápidos por status e período

### Tabela de Cobranças
- Listagem com: nome, CPF, telefone, proposta, data instalação, vencimento, status
- Ordenação por colunas
- Busca por nome, CPF ou número da proposta
- Indicadores visuais de urgência (ícones, cores)

---

## Fase 3: Gestão de Clientes e Cobranças

### Cadastro e Edição
- Formulário completo: nome, CPF, telefone, número da proposta, data da instalação, data de vencimento, status
- Validação de campos (CPF, telefone)
- Edição inline ou via modal

### Status Personalizáveis
- Área para Admin criar/editar/excluir status de pagamento
- Definição de cor para cada status
- Ordenação dos status

---

## Fase 4: Import de Planilhas

### Upload de Arquivos
- Suporte a Excel (.xlsx) e CSV
- Preview dos dados antes de confirmar importação
- Mapeamento de colunas (associar colunas da planilha aos campos do sistema)
- Validação e relatório de erros

### Atualização em Massa
- Atualizar registros existentes ou criar novos
- Log das importações realizadas

---

## Fase 5: Controle de Acesso

### Painel do Admin
- Gerenciamento de usuários (criar, editar, desativar)
- Atribuição de níveis (Admin/Operador)
- Visualização de todas as funcionalidades

### Permissões do Operador
- Acesso ao dashboard e tabelas
- Edição de cobranças e status de pagamento
- Sem acesso à gestão de usuários ou configurações do sistema

---

## Fase 6: Relatórios e Filtros Avançados

### Filtros Avançados
- Por período de vencimento
- Por status de pagamento
- Por data de instalação
- Combinação de múltiplos filtros

### Histórico de Alterações
- Log de todas as modificações em cobranças
- Registro de quem alterou e quando
- Visualização do histórico por cobrança

### Exportação
- Exportar dados filtrados para Excel/CSV

---

## Design e Experiência

### Diretrizes Visuais
- Mobile-first com layout responsivo
- Fonte Roboto, cor primária #0056b3
- Espaçamento de 8pt, raio de cantos 10px
- Sombras sutis (10% opacidade)
- Interface clean e moderna

### Componentes
- Botões, inputs e tabelas reutilizáveis
- Notificações visuais (toasts) para ações
- Loading states e feedback visual

---

## Tecnologias Utilizadas
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (banco de dados, autenticação, políticas de segurança)
- **Upload de planilhas**: Biblioteca para parsing de Excel/CSV
