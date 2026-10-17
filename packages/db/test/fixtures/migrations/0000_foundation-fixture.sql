CREATE TABLE `fixture_children` (
	`id` integer PRIMARY KEY NOT NULL,
	`parent_id` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `fixture_parents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fixture_parents` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
