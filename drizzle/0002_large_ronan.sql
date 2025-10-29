CREATE TABLE `product_history` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`product_id` varchar(36) NOT NULL,
	`product_code` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`type` enum('production','adjustment','import') NOT NULL DEFAULT 'production',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`created_by` varchar(64),
	CONSTRAINT `product_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_history_product` UNIQUE(`product_id`,`created_at`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `barcode` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `total_produced` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `last_produced_at` timestamp;--> statement-breakpoint
ALTER TABLE `products` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;