-- Migration 002: Production Finalization Flow
-- Adiciona campos para controlar o fluxo de finalização e reabertura de dias

-- Adicionar campos em production_day_snapshots
ALTER TABLE production_day_snapshots
ADD COLUMN finalized_at DATETIME NULL COMMENT 'Data e hora em que o dia foi finalizado',
ADD COLUMN finalized_by VARCHAR(255) NULL COMMENT 'ID do usuário que finalizou',
ADD COLUMN reopened_at DATETIME NULL COMMENT 'Data e hora em que o dia foi reaberto',
ADD COLUMN reopened_by VARCHAR(255) NULL COMMENT 'ID do admin que reabriu',
ADD COLUMN is_open BOOLEAN DEFAULT TRUE COMMENT 'Indica se o dia está em aberto';

-- Criar índice para melhorar consultas de dias em aberto
CREATE INDEX idx_snapshots_open ON production_day_snapshots(session_date, is_open);

-- Atualizar snapshots existentes para considerar finalizados
UPDATE production_day_snapshots 
SET is_open = FALSE, finalized_at = created_at 
WHERE finalized_at IS NULL;
