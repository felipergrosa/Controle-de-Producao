CREATE TABLE `_migrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`executed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `_migrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `_migrations_version_unique` UNIQUE(`version`),
	CONSTRAINT `idx_version` UNIQUE(`version`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` DROP INDEX `idx_audit_created`;--> statement-breakpoint
ALTER TABLE `product_history` DROP INDEX `idx_history_product`;--> statement-breakpoint
ALTER TABLE `paradas_maquina` DROP FOREIGN KEY `paradas_maquina_producao_repuxados_id_producao_repuxados_id_fk`;
--> statement-breakpoint
ALTER TABLE `paradas_maquina` DROP FOREIGN KEY `paradas_maquina_causa_quebra_id_causas_quebra_id_fk`;
--> statement-breakpoint
ALTER TABLE `producao_repuxados` DROP FOREIGN KEY `producao_repuxados_product_id_products_id_fk`;
--> statement-breakpoint
ALTER TABLE `producao_repuxados` DROP FOREIGN KEY `producao_repuxados_repuxador_id_repuxadores_id_fk`;
--> statement-breakpoint
ALTER TABLE `producao_repuxados` DROP FOREIGN KEY `producao_repuxados_causa_quebra_id_causas_quebra_id_fk`;
--> statement-breakpoint
ALTER TABLE `producao_repuxados` DROP FOREIGN KEY `producao_repuxados_created_by_users_id_fk`;
--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_history_product` ON `product_history` (`product_id`,`created_at`);