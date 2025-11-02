# Sistema de Controle de Produção - NOBRE

## 🚀 Início Rápido

### Opção 1: Docker (Recomendado) 🐳

**Desenvolvimento local com hot reload:**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Produção:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

Acesse: **http://localhost:5000**

📖 **Guia completo:** Consulte [DOCKER.md](./DOCKER.md) para instruções detalhadas de desenvolvimento, CI/CD e deploy.

### Opção 2: Node.js Local

**Pré-requisitos:**
- Node.js 20+
- MySQL 8.4+
- PNPM

**Iniciar:**
```bash
cp .env.example .env
pnpm install
pnpm db:push
pnpm dev
```

Acesse: **http://localhost:5000**

## 📊 Funcionalidades

1. **Dashboard** - Visão geral e KPIs
2. **Importar Produtos** - Upload de Excel/CSV
3. **Lançamento de Produção** - Registro diário
4. **Relatório Diário** - Consultas e exportação
5. **Consulta de Produtos** - Busca e visualização

## 🗄️ Banco de Dados

- **Banco**: production_control
- **Host**: localhost:3306 (ou `db:3306` no Docker)
- **Usuário**: root
- **Senha**: root (Docker) ou vazio (local)

### Tabelas
1. `products` - Cadastro de produtos
2. `production_entries` - Lançamentos de produção
3. `production_day_snapshots` - Snapshots diários
4. `product_history` - Histórico de movimentações
5. `users` - Usuários do sistema

## 📝 Arquivos Importantes

### Configuração
- `.env.example` - Template de variáveis de ambiente
- `.env.prod.example` - Template para produção
- `Dockerfile` - Build da aplicação
- `docker-compose.dev.yml` - Desenvolvimento com hot reload
- `docker-compose.prod.yml` - Produção (Portainer/VPS)

### Documentação
- `DOCKER.md` - Guia completo Docker, CI/CD e deploy
- `RESTAURACAO.md` - Documentação da restauração
- `todo.md` - Lista de tarefas e bugs conhecidos

### CI/CD
- `.github/workflows/docker-publish.yml` - Pipeline automático para Docker Hub

## 🛠️ Stack Tecnológica

- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Node.js + Express + tRPC + TypeScript
- **Banco de Dados:** MySQL 8.4 + Drizzle ORM
- **Infraestrutura:** Docker + Docker Compose
- **CI/CD:** GitHub Actions → Docker Hub → Portainer

## 🚢 Deploy

### Workflow Automático

1. **Push para GitHub** → Dispara GitHub Actions
2. **Build automático** → Publica imagem no Docker Hub
3. **Pull no Portainer** → Atualiza stack em produção

**Configuração necessária:**
- Secrets no GitHub: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- Variáveis no Portainer: veja `.env.prod.example`

📖 **Detalhes completos:** [DOCKER.md](./DOCKER.md)

## ✅ Status

Sistema **dockerizado e funcionando** corretamente!

- ✅ Desenvolvimento local com hot reload
- ✅ Build otimizado para produção
- ✅ CI/CD automatizado
- ✅ Pronto para deploy no Portainer
