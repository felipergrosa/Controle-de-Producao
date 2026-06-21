-- Migration 006: Add repuxados support
-- Gerado via Drizzle Kit com compatibilidade de deploy seguro

CREATE TABLE IF NOT EXISTS `repuxadores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`matricula` varchar(50),
	`turno_padrao` varchar(20),
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `repuxadores_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `causas_quebra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `causas_quebra_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `producao_repuxados` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`product_id` varchar(36) NOT NULL,
	`repuxador_id` int NOT NULL,
	`data_producao` date NOT NULL,
	`turno` varchar(20) NOT NULL,
	`hora_inicio` varchar(8) NOT NULL,
	`hora_fim` varchar(8) NOT NULL,
	`pecas_produzidas` int NOT NULL,
	`pecas_quebradas` int NOT NULL DEFAULT 0,
	`causa_quebra_id` int,
	`obs` text,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `producao_repuxados_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `paradas_maquina` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`producao_repuxados_id` varchar(36) NOT NULL,
	`tempo_minutos` int NOT NULL,
	`motivo` varchar(255),
	`causa_quebra_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paradas_maquina_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `metas_repuxo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` varchar(20) NOT NULL,
	`referencia_id` varchar(36),
	`meta_kg_dia` decimal(10,2) NOT NULL,
	`meta_quebra_pct` decimal(5,2) NOT NULL,
	`vigencia_inicio` date NOT NULL,
	`vigencia_fim` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metas_repuxo_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `products` ADD `peso_unitario_g` decimal(10,3);
ALTER TABLE `products` ADD `diametro_mm` decimal(10,2);
ALTER TABLE `products` ADD `espessura_mm` decimal(10,2);
ALTER TABLE `products` ADD `ideal_pecas_hora` int;
ALTER TABLE `products` ADD `meta_quebra_pct` decimal(5,2);
