CREATE TABLE `production_day_snapshots` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`session_date` date NOT NULL,
	`total_items` int NOT NULL,
	`total_quantity` int NOT NULL,
	`finalized_at` timestamp NOT NULL DEFAULT (now()),
	`payload_json` json NOT NULL,
	`created_by` int,
	CONSTRAINT `production_day_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_day_snapshots_session_date_unique` UNIQUE(`session_date`)
);
--> statement-breakpoint
CREATE TABLE `production_entries` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`product_id` varchar(36) NOT NULL,
	`product_code` varchar(100) NOT NULL,
	`product_description` text NOT NULL,
	`photo_url` text,
	`quantity` int NOT NULL,
	`inserted_at` timestamp NOT NULL DEFAULT (now()),
	`checked` boolean NOT NULL DEFAULT false,
	`session_date` date NOT NULL,
	`created_by` int,
	CONSTRAINT `production_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_entries_session_product` UNIQUE(`session_date`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`code` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`photo_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_code_unique` UNIQUE(`code`),
	CONSTRAINT `idx_products_code` UNIQUE(`code`)
);
