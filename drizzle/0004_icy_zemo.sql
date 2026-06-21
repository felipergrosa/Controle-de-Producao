CREATE TABLE `causas_quebra` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `causas_quebra_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metas_repuxo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` varchar(20) NOT NULL,
	`referencia_id` varchar(36),
	`meta_kg_dia` decimal(10,2) NOT NULL,
	`meta_quebra_pct` decimal(5,2) NOT NULL,
	`vigencia_inicio` date NOT NULL,
	`vigencia_fim` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metas_repuxo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paradas_maquina` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`producao_repuxados_id` varchar(36) NOT NULL,
	`tempo_minutos` int NOT NULL,
	`motivo` varchar(255),
	`causa_quebra_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paradas_maquina_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producao_repuxados` (
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
);
--> statement-breakpoint
CREATE TABLE `repuxadores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`matricula` varchar(50),
	`turno_padrao` varchar(20),
	`ativo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `repuxadores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `peso_unitario_g` decimal(10,3);--> statement-breakpoint
ALTER TABLE `products` ADD `diametro_mm` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `espessura_mm` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `ideal_pecas_hora` int;--> statement-breakpoint
ALTER TABLE `products` ADD `meta_quebra_pct` decimal(5,2);--> statement-breakpoint
ALTER TABLE `users` ADD `default_reader_mode` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `paradas_maquina` ADD CONSTRAINT `paradas_maquina_producao_repuxados_id_producao_repuxados_id_fk` FOREIGN KEY (`producao_repuxados_id`) REFERENCES `producao_repuxados`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paradas_maquina` ADD CONSTRAINT `paradas_maquina_causa_quebra_id_causas_quebra_id_fk` FOREIGN KEY (`causa_quebra_id`) REFERENCES `causas_quebra`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao_repuxados` ADD CONSTRAINT `producao_repuxados_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao_repuxados` ADD CONSTRAINT `producao_repuxados_repuxador_id_repuxadores_id_fk` FOREIGN KEY (`repuxador_id`) REFERENCES `repuxadores`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao_repuxados` ADD CONSTRAINT `producao_repuxados_causa_quebra_id_causas_quebra_id_fk` FOREIGN KEY (`causa_quebra_id`) REFERENCES `causas_quebra`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producao_repuxados` ADD CONSTRAINT `producao_repuxados_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;