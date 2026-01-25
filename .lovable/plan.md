
# Plano: Sidebar Unificada com Toggle de Expansão

## Problema Atual

Atualmente temos dois sidebars separados aparecendo ao mesmo tempo:
- **MiniSidebar**: Visível em `md:flex` (768px+)
- **ExpandedSidebar**: Visível em `lg:flex` (1024px+)

Resultado: Em telas grandes (1024px+), ambos aparecem lado a lado.

## Solução

Criar uma **sidebar única** com estado de expansão controlado por um botão toggle. O mini sidebar só aparece quando o usuário minimiza o expandido.

## Mudanças Planejadas

### 1. MainLayout.tsx - Estado de Expansão
- Adicionar estado `sidebarCollapsed` com `useState`
- Adicionar botão toggle no header para expandir/minimizar
- Renderizar condicionalmente: se colapsado mostra Mini, senão mostra Expanded

### 2. ExpandedSidebar.tsx - Remover Upgrade PRO
- Remover o bloco do card "Upgrade PRO" (linhas 100-114)
- Manter apenas a navegação e configurações

### 3. Comportamento Final
```text
Desktop (lg+):
┌─────────────────────────────────────────────────┐
│ [≡] Toggle                                      │
├──────────────┬──────────────────────────────────┤
│  Expanded    │                                  │
│  Sidebar     │         Conteúdo                 │
│  (240px)     │                                  │
└──────────────┴──────────────────────────────────┘

Após clicar no toggle:
┌─────────────────────────────────────────────────┐
│ [≡] Toggle                                      │
├──────┬──────────────────────────────────────────┤
│ Mini │                                          │
│(64px)│              Conteúdo                    │
│      │                                          │
└──────┴──────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/MainLayout.tsx` | Adicionar estado de colapso e renderização condicional |
| `src/components/layout/ExpandedSidebar.tsx` | Remover card "Upgrade PRO" |

## Detalhes Técnicos

### MainLayout.tsx
```text
1. Adicionar: const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
2. No header: Adicionar botão com ícone PanelLeftClose/PanelLeftOpen
3. Renderização condicional:
   - Se sidebarCollapsed: mostrar MiniSidebar
   - Se não: mostrar ExpandedSidebar
4. Ambos com classe "hidden lg:flex" para desktop
```

### ExpandedSidebar.tsx
```text
- Remover linhas 100-114 (div com gradient-coral e conteúdo do upgrade)
```

## Resultado Esperado

- Sidebar única com toggle funcional
- Mini sidebar aparece apenas quando expandido está minimizado
- Sem duplicação de menus
- Sem card "Upgrade PRO"
- Transição suave entre estados
