-- Migration 008: Add motivos_parada table and integrate with paradas_maquina
-- Criado manualmente para separar motivos de parada e quebra

CREATE TABLE IF NOT EXISTS `motivos_parada` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `motivos_parada_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `paradas_maquina` ADD COLUMN `motivo_parada_id` int NULL;
