-- Migration: Sistema de Autenticação Local e Auditoria
-- Data: 2025-11-01
-- Descrição: Adiciona campos de autenticação local na tabela users e cria tabelas sessions e audit_logs

-- 1. Atualizar tabela users
ALTER TABLE users 
  MODIFY openId VARCHAR(64) NULL; -- Torna openId opcional

-- Adicionar colunas necessárias (ignorar erro se já existirem)
ALTER TABLE users 
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;

ALTER TABLE users 
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER role;

ALTER TABLE users 
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active;

-- 2. Criar tabela sessions
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_token (token),
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Criar tabela audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NULL,
  entity_code VARCHAR(100) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_entity (entity),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Corrigir tipo de createdBy em product_history (consistência)
ALTER TABLE product_history 
  MODIFY created_by INT NULL;

-- 6. Comentários nas tabelas
-- Finalizado
-- IMPORTANTE: 
-- 1. Alterar senha do usuário admin após primeira execução
-- 2. Testar login local em /login
-- 3. Verificar logs de auditoria em /audit-logs
