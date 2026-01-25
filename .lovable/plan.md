
# Redesign Completo - Inspiração Dashboard Moderno

## Visão Geral

Vou recriar completamente o layout baseado na imagem de referência que você enviou. O design atual será substituído por um visual moderno, elegante e profissional com sidebar dupla e paleta roxa/violeta.

---

## Principais Mudanças de Design

### 1. Nova Paleta de Cores

| Elemento | Cor Atual (Verde) | Nova Cor |
|----------|-------------------|----------|
| Primary | Verde (#16a34a) | Violeta (#6366f1) |
| Accent 1 | Verde claro | Rosa coral (#f97316) |
| Accent 2 | - | Rosa (#ec4899) |
| Background | Branco puro | Cinza suave (#f8fafc) |
| Sidebar | Branco | Branco com borda sutil |

### 2. Estrutura de Sidebar Dupla

**Mini Sidebar (esquerda, 64px)**
- Apenas ícones
- Logo no topo
- Navegação por ícones
- Avatar no rodapé

**Sidebar Expandida (240px)**
- Header com logo e versão
- Menu com ícones + texto
- Setas indicando submenus
- Card de upgrade no final
- Perfil do usuário no rodapé

### 3. Dashboard Renovado

**Header**
- Saudação personalizada ("Olá, [Nome]!")
- Campo de busca global

**Cards de Métricas (3 colunas)**
- Ícones em círculos com gradientes coloridos
- Valores grandes e destacados
- Indicadores de variação (setas + porcentagem)
- Cores diferenciadas: roxo, coral, rosa

**Seção de Gráficos**
- Gráfico de barras (Overview mensal)
- Gráfico de donut (Proporção de clientes)
- Dropdown para seleção de período

**Tabela de Cobranças**
- Design limpo com imagens/ícones
- Campo de busca integrado
- Filtro de período
- Hover states sutis

### 4. Novos Componentes

**Card de Métrica**
- Ícone em círculo colorido
- Label pequena
- Valor grande
- Indicador de variação

**Card de Upgrade (sidebar)**
- Gradiente laranja/rosa
- Texto de CTA
- Botão destacado

**Gráfico de Barras**
- Recharts já está instalado
- Estilo minimalista
- Destaque no mês atual

**Gráfico de Donut**
- Cores vibrantes
- Percentual central
- Legenda lateral

---

## Arquivos a Criar/Modificar

### Novos Componentes
1. `src/components/layout/MiniSidebar.tsx` - Sidebar de ícones
2. `src/components/layout/ExpandedSidebar.tsx` - Sidebar expandida
3. `src/components/dashboard/MetricCard.tsx` - Card de métrica
4. `src/components/dashboard/OverviewChart.tsx` - Gráfico de barras
5. `src/components/dashboard/CustomersChart.tsx` - Gráfico de donut
6. `src/components/dashboard/RecentCharges.tsx` - Tabela recente

### Arquivos a Modificar
7. `src/index.css` - Nova paleta de cores (violeta)
8. `tailwind.config.ts` - Ajustes de tema
9. `src/components/layout/MainLayout.tsx` - Layout com sidebar dupla
10. `src/pages/Dashboard.tsx` - Redesign completo
11. `src/pages/Auth.tsx` - Atualizar para nova paleta
12. `src/components/ui/card.tsx` - Cantos mais arredondados
13. `src/components/ui/button.tsx` - Novo estilo

---

## Detalhes Técnicos

### Nova Paleta CSS (index.css)
```text
:root {
  --primary: 239 84% 67%       /* Violeta #6366f1 */
  --primary-foreground: 0 0% 100%
  --accent-coral: 25 95% 53%   /* Coral #f97316 */
  --accent-pink: 330 81% 60%   /* Rosa #ec4899 */
  --background: 210 40% 98%    /* Cinza suave #f8fafc */
  --card: 0 0% 100%
  --border: 214 32% 91%        /* Cinza claro */
  --radius: 1rem               /* 16px */
}
```

### Estrutura do Layout
```text
┌──────┬──────────────┬─────────────────────────────────┐
│ Mini │   Expanded   │                                 │
│ Bar  │   Sidebar    │         Main Content            │
│ 64px │    240px     │                                 │
│      │              │   ┌─── Header ───────────────┐  │
│ [●]  │  Dashboard   │   │ Olá, User!    [Search]   │  │
│      │  Product     │   └─────────────────────────┘  │
│ [◎]  │  Customers   │                                 │
│ [◎]  │  Income      │   ┌────┐ ┌────┐ ┌────┐        │
│ [◎]  │  ...         │   │$198k│ │$2.4k│ │$89k│       │
│      │              │   └────┘ └────┘ └────┘        │
│      │ ┌──────────┐ │                                 │
│      │ │ Upgrade  │ │   ┌─── Chart ───┐ ┌─ Donut ─┐  │
│      │ │   PRO    │ │   │             │ │         │  │
│      │ └──────────┘ │   └─────────────┘ └─────────┘  │
│      │              │                                 │
│ [◎]  │ User Profile │   ┌─── Recent Table ─────────┐ │
└──────┴──────────────┴───┴─────────────────────────────┘
```

### Ícones e Elementos Visuais
- Ícones com stroke mais fino (lucide-react já usa isso)
- Círculos de fundo para ícones de métricas com gradientes
- Setas de navegação nos itens do menu
- Avatar circular no perfil

### Gráficos (Recharts)
```text
OverviewChart:
- BarChart com 12 meses
- Barra ativa destacada (mais escura)
- Tooltip com valor
- Cores: violeta claro/escuro

CustomersChart:
- PieChart (donut)
- Cores: rosa, violeta, coral
- Label central com percentual
```

---

## Resultado Esperado

- **Visual moderno e sofisticado** inspirado no exemplo
- **Sidebar dupla** funcional e elegante
- **Dashboard rico** com gráficos e métricas visuais
- **Paleta violeta** profissional e contemporânea
- **Muita respiração** (espaços em branco generosos)
- **Cantos arredondados** maiores (16px)
- **Sombras sutis** em cards
- **Consistência** em toda a aplicação

---

## Arquivos Finais

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/index.css` | Modificar | Nova paleta violeta |
| `tailwind.config.ts` | Modificar | Novos tokens de cor |
| `src/components/layout/MainLayout.tsx` | Reescrever | Sidebar dupla |
| `src/components/dashboard/MetricCard.tsx` | Criar | Card de métrica |
| `src/components/dashboard/OverviewChart.tsx` | Criar | Gráfico de barras |
| `src/components/dashboard/CustomersChart.tsx` | Criar | Gráfico de donut |
| `src/components/dashboard/WelcomeHeader.tsx` | Criar | Header com saudação |
| `src/pages/Dashboard.tsx` | Reescrever | Novo layout |
| `src/pages/Auth.tsx` | Modificar | Nova paleta |
| `src/components/ui/card.tsx` | Modificar | Cantos maiores |
| `src/components/ui/button.tsx` | Modificar | Novo estilo |
| `src/components/ui/input.tsx` | Modificar | Cantos maiores |
