CREATE TABLE `coaching_media` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `coaching_media_membership` ON `coaching_media` (`membership_id`);--> statement-breakpoint
CREATE TABLE `progress_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`media_id` text NOT NULL,
	`view` text NOT NULL,
	`taken_on` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `progress_photos_membership` ON `progress_photos` (`membership_id`,`taken_on`);--> statement-breakpoint
ALTER TABLE `coaching_messages` ADD `media_id` text;