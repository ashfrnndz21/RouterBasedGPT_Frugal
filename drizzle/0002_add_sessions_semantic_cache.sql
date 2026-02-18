CREATE TABLE IF NOT EXISTS `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`payload` text NOT NULL,
	`createdAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `semantic_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cacheKey` text NOT NULL,
	`query` text NOT NULL,
	`queryEmbedding` text NOT NULL,
	`response` text NOT NULL,
	`sources` text DEFAULT '[]',
	`hitCount` integer NOT NULL DEFAULT 0,
	`createdAt` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `semantic_cache_cacheKey_unique` ON `semantic_cache` (`cacheKey`);
