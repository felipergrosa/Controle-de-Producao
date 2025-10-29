# Production Control - TODO

## Modelo de Dados
- [x] Criar tabela `products` (id, code, description, photo_url, created_at)
- [x] Criar tabela `production_entries` (id, product_id, product_code, product_description, photo_url, quantity, inserted_at, checked, session_date)
- [x] Criar tabela `production_day_snapshots` (id, session_date, total_items, total_quantity, finalized_at, payload_json)
- [x] Criar índices em products.code, products.description, production_entries.session_date

## Tela 1: Importar Produtos (Excel)
- [x] Componente de upload (.xlsx e .csv)
- [x] Parser de Excel/CSV com mapeamento de colunas
- [x] Validação de dados (code obrigatório, único)
- [ ] Upload de imagens para storage (URL ou arquivo)
- [ ] Prévia das 10 primeiras linhas
- [x] Lógica de upsert (atualizar se code existir)
- [x] Resumo final (inseridos, atualizados, erros)
- [x] API tRPC para importação

## Tela 2: Lançamento de Produção
- [x] Resumo do dia (Qtd. de itens, Qtd. total produzida)
- [x] Campo de busca com toggle (Código/Descrição)
- [x] Busca incremental indexada (mín. 2 caracteres)
- [x] Modal "Informar quantidade"
- [x] Lista do dia com foto, código, descrição, quantidade, data/hora
- [x] Ícones de ação (check, apagar)
- [x] Toggle "Agrupar itens iguais" (ON por padrão)
- [x] Lógica de agrupamento e soma de quantidades
- [x] Filtro "Mostrar apenas não conferidos"
- [x] Ordenação por inserted_at (desc)
- [x] Botão "Finalizar dia!" com snapshot
- [x] API tRPC para CRUD de production_entries
- [x] API tRPC para finalizar dia

## Tela 3: Relatório Diário de Produção
- [x] Filtro por data (default hoje)
- [x] Exibição de resumo (Qtd. de itens, Qtd. total)
- [x] Lista detalhada com foto, código, descrição, quantidade, inserido em, checked
- [x] Aviso se dia não finalizado
- [x] Exportar CSV do dia
- [x] Exportar XLSX do dia
- [x] API tRPC para buscar relatório

## Tela 4: Consulta de Produtos
- [x] Campo de busca (Código/Descrição)
- [x] Lista de produtos com foto, código, descrição
- [x] Modal/visualização ampliada ao selecionar
- [x] Imagem grande (fit/contain)
- [x] API tRPC para buscar produtos

## UX/UI e Comportamentos
- [x] Design responsivo e limpo
- [x] Thumbnails quadrados (64px)
- [x] Ícones universais (✔️, 🗑️)
- [x] Atualização em tempo real da lista
- [x] Formato de datas DD/MM/YYYY HH:mm
- [x] Validações (quantidade > 0, code obrigatório)
- [x] Estados de carregamento e erro
- [x] Placeholder para imagens ausentes
- [x] Navegação entre telas
- [x] Sidebar/layout dashboard

## Segurança & Auditoria
- [x] Registrar created_by/updated_by nas tabelas
- [x] Logar ação de "Finalizar dia"
- [x] Autenticação de usuários (já integrada)

## Extras (Opcional)
- [ ] Preferências de usuário (Agrupar itens ON/OFF)
- [ ] Campo "Observações do dia" no snapshot
- [ ] Impressão do relatório diário (layout A4)


## Bugs Encontrados
- [x] Erro React #185 na página `/production` - corrigido (removido useEffect que causava loop infinito)


## Novas Funcionalidades Solicitadas

### Tela Importar Produtos - Melhorias
- [ ] Botão "+ Incluir Produto" para criar produto manualmente
- [ ] Modal de criação com campos: código (obrigatório), descrição (obrigatório, maiúsculo), imagem (opcional), barras (opcional)
- [ ] Mapeamento de colunas antes de importar Excel (Código, Descrição, Barras, Imagem)
- [ ] Validação de descrição em maiúsculo

### Modelo de Dados - Histórico
- [ ] Adicionar tabela `product_history` para rastrear quantidades, datas e horas
- [ ] Adicionar campos de histórico nos produtos (última atualização, total produzido, etc)

### Tela Consulta de Produtos - Ações
- [ ] Botão de editar produto
- [ ] Botão de excluir produto
- [ ] Botão de visualizar histórico (modal com gráfico/tabela de movimentações)

## Dashboard de KPI (Nova Funcionalidade)
- [x] Adicionar queries de agregação ao banco de dados
- [x] Criar procedimentos tRPC para análise de dados históricos
- [x] Criar página Dashboard com gráficos (linha, barra, pizza)
- [x] Implementar KPIs principais (Total, Média, Top Produtos)
- [x] Adicionar filtros por período (Hoje, 7 dias, 30 dias, Customizado)
- [x] Implementar exportação de relatórios do Dashboard
- [x] Adicionar Dashboard ao menu de navegação
- [x] Testar Dashboard com dados reais


## Bugs a Corrigir (Prioridade Alta)
- [x] Erro ao adicionar lançamento: campo photoUrl null
- [x] Modal de importação pequeno, precisa aumentar
- [x] Botão "Confirmar Importação" inativo mesmo com campos preenchidos
- [ ] Produtos não aparecem na lista de lançamento (busca retorna vazio)
- [ ] Busca por descrição não funciona, só por código

## Novas Funcionalidades Solicitadas (Fase 2)
- [ ] Relat\u00f3rio de Movimenta\u00e7\u00f5es: Hist\u00f3rico detalhado de cada produto com gr\u00e1ficos
- [ ] Alertas e Notifica\u00e7\u00f5es: Avisos quando a produ\u00e7\u00e3o cai abaixo de um limite
- [ ] Gest\u00e3o de Usu\u00e1rios: Controle de permiss\u00f5es e pap\u00e9is (admin, operador, gerente)
- [ ] Integra\u00e7\u00e3o com API Externa: Sincronizar dados com outro sistema


## Correcao de Bugs - Busca (28/10/2025)

### Problema Identificado
- Busca por descricao nao funcionava (retornava resultados vazios)
- Busca por codigo funcionava, mas descricao nao
- Exemplo: buscar "ret" nao encontrava "RETRO"

### Causa Raiz
- As funcoes searchProducts() e searchProductsByDescription() nao convertiam o input do usuario para MAIUSCULA
- O banco de dados armazena descricoes em MAIUSCULA, mas a busca estava usando minusculas
- O LIKE do SQL eh case-sensitive em alguns bancos de dados

### Solucao Implementada
- Adicionar .toUpperCase() no input da busca em ambas as funcoes
- Agora: const upperQuery = query.toUpperCase(); antes de fazer o LIKE
- Resultado: Busca case-insensitive funcionando perfeitamente

### Testes Realizados
- [x] Busca por "ret" encontra "RETRO"
- [x] Busca por "viena" encontra "VIENA"
- [x] Busca por "50" encontra codigos com "50"
- [x] Busca combinada (codigo E descricao) funcionando
- [x] Modal de quantidade abre corretamente
- [x] Botao "Adicionar" funciona


## Bug de Exibição de Itens Lançados (28/10/2025)

### Problema Identificado
- Itens lançados não aparecem na seção "Itens Lançados" da página de Produção
- Backend retorna dados corretamente (verificado com SQL - 6 itens no banco)
- Busca de produtos funciona perfeitamente
- Adição de itens funciona (dados são salvos no banco de dados)
- Cards com 2 por linha foram implementados corretamente

### Causa Raiz (Investigação em Andamento)
- Problema parece estar na serialização/renderização dos dados no frontend
- O console do navegador está vazio (sem erros visíveis)
- Possíveis causas:
  * Problema com superjson transformer do tRPC
  * Problema com serialização de datas (insertedAt, sessionDate)
  * Problema com como o React está renderizando os dados retornados
  * Possível erro silencioso no ErrorBoundary

### Testes Realizados
- [x] Verificação de dados no banco de dados (SQL) - OK
- [x] Verificação de logs do backend - dados retornados corretamente
- [x] Verificação de tipos TypeScript - corretos
- [x] Adição de fallbacks robustos no frontend
- [x] Verificação de configuração do tRPC - OK
- [x] Verificação de ErrorBoundary - OK
- [ ] Problema ainda não resolvido

### Próximas Etapas para Resolver
- [ ] Adicionar logging detalhado no cliente tRPC
- [ ] Verificar se superjson está transformando corretamente as datas
- [ ] Considerar usar uma abordagem alternativa para retornar os dados
- [ ] Possível reescrever completamente a lógica de carregamento de dados
