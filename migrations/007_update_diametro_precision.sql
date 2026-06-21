-- Migration 007: Update diametro_mm precision to scale 3
-- Gerado via Drizzle Kit

ALTER TABLE `products` MODIFY COLUMN `diametro_mm` decimal(10,3);
