# Estratégia de Backup e Migração de Dados de Repuxo

Este documento detalha o fluxo de exportação e importação de dados de repuxo do banco de dados de desenvolvimento para o banco de produção.

---

## 🔹 Objetivo
Migrar os dados históricos importados e validados em ambiente de desenvolvimento (dev) para o ambiente de produção (prod) sem causar duplicações, inconsistências em chaves estrangeiras (`id` autoincrement) ou perdas de relacionamentos.

- **Modo:** N1 (Produção)
- **Escopo:**
  - Exportação seletiva das tabelas de repuxo de dev para um arquivo estruturado JSON.
  - Importação resiliente e idempotente do JSON no banco de produção.
  - Mapeamento dinâmico de chaves estrangeiras (`AUTO_INCREMENT`) que podem diferir entre dev e prod.

---

## 🔹 Tabelas Envolvidas
1. `repuxadores` (Lookup)
2. `causas_quebra` (Lookup)
3. `motivos_parada` (Lookup)
4. `products` (Catálogo filtrado por códigos de repuxo — não-numéricos)
5. `producao_repuxados` (Fatos de produção)
6. `paradas_maquina` (Detalhes de paradas associadas)

---

## 🔹 Fluxo de Execução

### 1. Exportação (Dev)
```mermaid
graph TD
    A[Iniciar Exportação] --> B[Conectar no Banco de Dev]
    B --> C[Exportar Tabelas de Lookup]
    C --> D[repuxadores, causas_quebra, motivos_parada]
    B --> E[Exportar products de Repuxo]
    E --> F[Filtrar: code não numérico]
    B --> G[Exportar producao_repuxados e paradas_maquina]
    D & F & G --> H[Agrupar em estrutura JSON]
    H --> I[Gravar arquivo 'repuxados-backup-data.json']
    I --> J[Fim da Exportação]
```

### 2. Importação e Remapeamento (Prod)
```mermaid
graph TD
    A[Ler arquivo JSON] --> B[Conectar no Banco de Prod]
    B --> C[Processar repuxadores]
    C -->|Ignora existente / Insere novo| D[Registrar ID Dev -> ID Prod]
    
    B --> E[Processar causas_quebra]
    E -->|Ignora existente / Insere novo| F[Registrar ID Dev -> ID Prod]
    
    B --> G[Processar motivos_parada]
    G -->|Ignora existente / Insere novo| H[Registrar ID Dev -> ID Prod]
    
    D & F & H --> I[Processar products]
    I -->|Insert Ignore por code| J[Processar producao_repuxados]
    
    J -->|Remapeia repuxador_id e causa_quebra_id| K{Existe em Prod?}
    K -->|Sim| L[Mapear ID Produção para Paradas]
    K -->|Não| M[Inserir Produção e Registrar ID Dev -> ID Prod]
    
    L & M --> N[Processar paradas_maquina]
    N -->|Remapeia producao_repuxados_id e motivos/causas| O[Inserir Paradas em Prod]
    O --> P[Fim do Processo com Sucesso]
```

---

## 🔹 Estrutura do Arquivo JSON de Backup
O arquivo contêm os dados na seguinte estrutura:
```json
{
  "exportDate": "2026-06-22T00:00:00.000Z",
  "sourceDatabase": "dev",
  "repuxadores": [],
  "causasQuebra": [],
  "motivosParada": [],
  "products": [],
  "producaoRepuxados": [],
  "paradasMaquina": []
}
```

---

## 🔹 Como Executar

### Passo 1: Gerar o Backup de Dev
Execute o script contra o banco local (dev). O arquivo `.env` já aponta para dev.
```bash
npx tsx scripts/export-repuxados-backup.ts
```
Isso gerará o arquivo `repuxados-backup-YYYY-MM-DD.json` na raiz do projeto.

### Passo 2: Executar no Banco de Produção (Modo Simulação / Dry-Run)
Para garantir que todos os dados serão processados sem erro antes de gravar de verdade:
```powershell
$env:DATABASE_URL="mysql://usuario:senha@host:porta/nome_banco"; npx tsx scripts/import-repuxados-backup.ts repuxados-backup-YYYY-MM-DD.json
```

### Passo 3: Executar no Banco de Produção (Modo Gravação Ativa / Commit)
Depois que a simulação rodar sem erros:
```powershell
$env:DATABASE_URL="mysql://usuario:senha@host:porta/nome_banco"; npx tsx scripts/import-repuxados-backup.ts repuxados-backup-YYYY-MM-DD.json --commit
```
