CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`entity` varchar(50) NOT NULL,
	`entity_id` varchar(36),
	`entity_code` varchar(100),
	`details` json,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_audit_created` UNIQUE(`created_at`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45),
	`user_agent` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`),
	CONSTRAINT `idx_sessions_token` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `product_history` MODIFY COLUMN `created_by` int;--> statement-breakpoint
ALTER TABLE `production_day_snapshots` MODIFY COLUMN `finalized_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `production_day_snapshots` ADD `finalized_by` varchar(255);--> statement-breakpoint
ALTER TABLE `production_day_snapshots` ADD `reopened_at` timestamp;--> statement-breakpoint
ALTER TABLE `production_day_snapshots` ADD `reopened_by` varchar(255);--> statement-breakpoint
ALTER TABLE `production_day_snapshots` ADD `is_open` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `production_day_snapshots` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `production_entries` ADD `checked_by` int;--> statement-breakpoint
ALTER TABLE `production_entries` ADD `checked_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;