
# Plano de Refinamento - Design Profissional Corporativo

## Diagnóstico do Problema

Após analisar a interface atual, identifiquei os elementos que contribuem para a aparência "infantil":

| Elemento | Problema Atual | Solução |
|----------|----------------|---------|
| Badges | Muito arredondados (bolhas) | Cantos menos arredondados |
| Cores | Saturação alta | Tons mais sóbrios |
| Tabelas | Sem destaque no cabeçalho | Fundo cinza no header |
| Cards | Bordas muito sutis | Bordas mais definidas |
| Botões | Sem peso visual | Sombras sutis |
| Tipografia | Pesos uniformes | Maior hierarquia |

---

## Mudanças Planejadas

### 1. Componente Badge (badge.tsx)
Reduzir o arredondamento e melhorar a legibilidade:
- De `rounded-full` para `rounded-md`
- Adicionar leve sombra para "peso"
- Ajustar padding para mais compacto

### 2. Componente Table (table.tsx)
Adicionar visual corporativo:
- Fundo cinza claro no cabeçalho (`bg-muted/50`)
- Bordas mais visíveis
- Hover states mais sutis
- Maior altura nas células

### 3. Componente Button (button.tsx)
Refinar aparência:
- Adicionar sombra sutil no estado default
- Transições mais suaves
- Melhor feedback visual no hover

### 4. Componente Input (input.tsx)
Aparência mais profissional:
- Bordas mais definidas
- Focus state mais sutil
- Altura padronizada

### 5. Componente Card (card.tsx)
Estrutura mais corporativa:
- Sombra mais presente
- Borda mais visível
- Separação visual entre header e content

### 6. Paleta de Cores (index.css)
Ajustar saturação e contraste:
- Verde primário mais sóbrio
- Cinzas mais neutros
- Bordas mais visíveis
- Backgrounds com mais contraste

### 7. Páginas (Cobrancas, Clientes, Dashboard)
Ajustes de layout:
- Espaçamentos mais generosos
- Hierarquia visual mais clara
- Títulos com mais destaque

---

## Detalhes Técnicos

### Arquivo: src/components/ui/badge.tsx
```text
- Alterar rounded-full para rounded-md
- Reduzir padding horizontal
- Adicionar font-weight mais leve
```

### Arquivo: src/components/ui/table.tsx
```text
- TableHead: adicionar bg-muted/50
- TableRow: hover mais sutil (hover:bg-muted/30)
- Bordas mais visíveis
```

### Arquivo: src/components/ui/button.tsx
```text
- Adicionar shadow-sm no variant default
- Melhorar transição (transition-all)
```

### Arquivo: src/components/ui/card.tsx
```text
- Aumentar sombra (shadow-sm para shadow)
- Borda mais visível
```

### Arquivo: src/index.css
```text
- Ajustar tons de verde (menos saturado)
- Bordas com mais contraste
- Backgrounds mais definidos
```

### Arquivos de páginas
```text
- Dashboard.tsx: Refinar cards de métricas
- Cobrancas.tsx: Melhorar visual da tabela
- Clientes.tsx: Consistência visual
- Auth.tsx: Ajustes de contraste
```

---

## Resultado Esperado

- Interface com aparência mais **corporativa e madura**
- Elementos visuais que transmitem **confiança e profissionalismo**
- Melhor **hierarquia visual** entre elementos
- **Consistência** em toda a aplicação
- Cores **sóbrias** sem perder a identidade verde

---

## Arquivos que serão modificados

1. `src/components/ui/badge.tsx` - Forma menos arredondada
2. `src/components/ui/table.tsx` - Cabeçalho com destaque
3. `src/components/ui/button.tsx` - Sombras sutis
4. `src/components/ui/card.tsx` - Estrutura mais forte
5. `src/components/ui/input.tsx` - Bordas mais definidas
6. `src/index.css` - Paleta refinada
7. `src/pages/Dashboard.tsx` - Layout profissional
8. `src/pages/Cobrancas.tsx` - Visual corporativo
9. `src/pages/Clientes.tsx` - Consistência
10. `src/components/layout/MainLayout.tsx` - Ajustes finos
