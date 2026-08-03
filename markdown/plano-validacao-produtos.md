# Plano de Implementação: Validação de Decimais e Cadastro de Produtos

Este documento detalha o plano de alteração e a lógica implementada para garantir que os campos decimais como Diâmetro, Espessura, Peso Unitário e Meta de Quebra sejam sempre validados e gravados com a precisão correta no banco de dados, independentemente de estarem em formato de modal ou planilha.

## 🎯 Objetivo
- Impedir inconsistências de formatação decimal devido ao uso de vírgula `,` ou ponto `.` no cadastro de produtos.
- Garantir que no banco de dados os decimais sejam sempre convertidos para ponto e limitados à sua respectiva precisão do schema:
  - `pesoUnitarioG`: 3 casas decimais (ex: `61.800`).
  - `diametroMm`: 3 casas decimais (ex: `0.190`).
  - `espessuraMm`: 2 casas decimais (ex: `0.80`).
  - `metaQuebraPct`: 2 casas decimais (ex: `1.00`).
- Atualizar a label da coluna da planilha de `Diâmetro (mm)` para `Diâmetro (m)` para corresponder à realidade física dos dados (metros).
- Recalcular automaticamente o peso estimado em gramas na planilha se o usuário alterar diâmetro ou espessura.

---

## 🗺️ Mapa de Fluxo

### 1. Sanitização e Gravação de Decimais no Backend

```mermaid
flowchart TD
    A[Chamada de Gravação no Backend] --> B{Possui pesoUnitarioG?}
    B -- Sim --> C[Substituir vírgula por ponto e formatar para 3 casas decimais]
    B -- Não --> D{Possui diametroMm?}
    C --> D
    D -- Sim --> E[Substituir vírgula por ponto e formatar para 3 casas decimais]
    D -- Não --> F{Possui espessuraMm?}
    E --> F
    F -- Sim --> G[Substituir vírgula por ponto e formatar para 2 casas decimais]
    F -- Não --> H{Possui metaQuebraPct?}
    G --> H
    H -- Sim --> I[Substituir vírgula por ponto e formatar para 2 casas decimais]
    H -- Não --> J[Gravar Produto no Banco de Dados]
    I --> J
```

### 2. Recálculo Automático de Peso na Planilha

```mermaid
flowchart TD
    A[Usuário Edita Célula na Planilha] --> B[handleRowsChange indexado]
    B --> C[Obter novo diametroMm e espessuraMm]
    C --> D[Substituir vírgula por ponto nas strings]
    D --> E{Diâmetro e Espessura > 0?}
    E -- Sim --> F["Peso estimado (g) = (Diâmetro * Diâmetro * Espessura * 2.14) * 1000"]
    F --> G[Atualizar célula de Peso Unit. g da linha]
    E -- Não --> H[Ignorar recálculo]
    G --> I[Atualizar estado do Grid e das Linhas Modificadas]
    H --> I
```

---

## 🛠️ Alterações Efetuadas

### 1. Frontend: `ProductsQuery.tsx`
- **Modal de Edição**:
  - `handleSaveEdit`: Adicionada conversão de vírgula para ponto e arredondamento estrito via `.toFixed` antes de chamar a mutação de gravação.
- **Tabela / Planilha**:
  - `columns`: Corrigido nome da coluna Diâmetro para `Diâmetro (m)`.
  - `handleRowsChange`: Implementado recálculo dinâmico e imediato do peso estimado em gramas caso diâmetro ou espessura mudem, além de padronizar as entradas numéricas substituindo vírgula por ponto no estado.
  - `handleSaveGrid`: Sanitizados todos os campos decimais que vão para o backend com conversão para ponto e fixação de casas decimais correspondentes.

### 2. Backend: `server/db.ts`
- **Gravação Centralizada**:
  - `createOrUpdateProduct` e `updateProductByCode`: Incluídas validações do tipo "Safety by Default". Se algum dado contendo vírgulas ou precisão inválida passar das validações do frontend, o backend converte, arredonda e grava no MySQL de forma limpa.
