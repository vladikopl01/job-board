CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`source_host` text NOT NULL,
	`board_key` text NOT NULL,
	`canonical_url` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boards_source_unique` ON `boards` (`provider`,`source_host`,`board_key`);