CREATE TABLE `postings` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`external_reference` text NOT NULL,
	`title` text NOT NULL,
	`description_plain` text NOT NULL,
	`description_html` text,
	`job_url` text NOT NULL,
	`apply_url` text NOT NULL,
	`locations` text NOT NULL,
	`workplace_type` text NOT NULL,
	`department` text,
	`team` text,
	`employment_type` text,
	`compensation` text,
	`published_at` text,
	`raw` text NOT NULL,
	`content_hash` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`content_updated_at` text NOT NULL,
	`unavailable_at` text,
	`unavailable_reason` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `postings_current_reference_unique` ON `postings` (`board_id`,`external_reference`) WHERE "postings"."unavailable_at" is null;--> statement-breakpoint
CREATE INDEX `postings_list_order` ON `postings` (`first_seen_at`,`id`);--> statement-breakpoint
CREATE INDEX `postings_board_availability` ON `postings` (`board_id`,`unavailable_at`);--> statement-breakpoint
CREATE TABLE `board_refresh_tasks` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`board_id` text NOT NULL,
	`request_source` text NOT NULL,
	`state` text NOT NULL,
	`phase` text NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`finished_at` text,
	`owner_token` text,
	`lease_expires_at` text,
	`generation` integer,
	`new_count` integer,
	`updated_count` integer,
	`unavailable_count` integer,
	`error_code` text,
	`error_message` text,
	`retry_at` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `board_refresh_tasks_id_unique` ON `board_refresh_tasks` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tasks_active_board_unique` ON `board_refresh_tasks` (`board_id`) WHERE "board_refresh_tasks"."state" IN ('queued', 'running');--> statement-breakpoint
CREATE INDEX `refresh_tasks_board_latest` ON `board_refresh_tasks` (`board_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `refresh_tasks_queue` ON `board_refresh_tasks` (`state`,`sequence`);--> statement-breakpoint
ALTER TABLE `boards` ADD `last_successful_refresh_at` text;--> statement-breakpoint
ALTER TABLE `boards` ADD `refresh_generation` integer DEFAULT 0 NOT NULL;