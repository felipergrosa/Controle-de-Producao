# Sistema de Controle de Produção - NOBRE

## 🚀 Início Rápido

### Iniciar o Sistema
```bash
cd /home/ubuntu
pnpm dev
```

O sistema estará disponível em: **http://localhost:5003**

### Parar o Sistema
```bash
# Encontrar o processo
ps aux | grep "tsx watch"

# Matar o processo (substitua PID pelo número do processo)
kill -9 PID
```

## 📊 Funcionalidades

1. **Dashboard** - Visão geral e KPIs
2. **Importar Produtos** - Upload de Excel/CSV
3. **Lançamento de Produção** - Registro diário
4. **Relatório Diário** - Consultas e exportação
5. **Consulta de Produtos** - Busca e visualização

## 🗄️ Banco de Dados

- **Banco**: production_control
- **Host**: localhost:3306
- **Usuário**: root (sem senha)

## 📝 Arquivos Importantes

- `.env` - Configurações de ambiente
- `start.sh` - Script de inicialização
- `RESTAURACAO.md` - Documentação completa da restauração
- `todo.md` - Lista de tarefas e bugs conhecidos

## ✅ Status

Sistema **restaurado e funcionando** corretamente!

Para mais detalhes, consulte `RESTAURACAO.md`.
