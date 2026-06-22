-- Criar tabela de turnos
CREATE TABLE IF NOT EXISTS `turnos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL UNIQUE,
  `descricao` VARCHAR(255) NOT NULL,
  `cor` VARCHAR(50) DEFAULT '#6366f1' NOT NULL,
  `ativo` TINYINT(1) DEFAULT 1 NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar colunas cor e codigo em repuxadores
ALTER TABLE `repuxadores` ADD COLUMN `cor` VARCHAR(50) DEFAULT '#6366f1' NOT NULL;
ALTER TABLE `repuxadores` ADD COLUMN `codigo` VARCHAR(50) DEFAULT '' NOT NULL;

-- Adicionar colunas cor e codigo em causas_quebra
ALTER TABLE `causas_quebra` ADD COLUMN `cor` VARCHAR(50) DEFAULT '#ef4444' NOT NULL;
ALTER TABLE `causas_quebra` ADD COLUMN `codigo` VARCHAR(50) DEFAULT '' NOT NULL;

-- Adicionar colunas cor e codigo em motivos_parada
ALTER TABLE `motivos_parada` ADD COLUMN `cor` VARCHAR(50) DEFAULT '#f59e0b' NOT NULL;
ALTER TABLE `motivos_parada` ADD COLUMN `codigo` VARCHAR(50) DEFAULT '' NOT NULL;

-- Inserir turnos iniciais para compatibilidade e não quebrar a aplicação
INSERT IGNORE INTO `turnos` (`codigo`, `descricao`, `cor`, `ativo`) VALUES 
('TURNO_A', 'Turno A', '#6366f1', 1),
('TURNO_B', 'Turno B', '#10b981', 1),
('TURNO_C', 'Turno C', '#ef4444', 1);
