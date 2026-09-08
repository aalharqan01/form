ALTER TABLE `coaching_memberships` ADD `open_key` text;--> statement-breakpoint
ALTER TABLE `coaching_memberships` ADD `decided_at` text;--> statement-breakpoint
ALTER TABLE `coaching_memberships` ADD `decision_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `coaching_memberships_open_key_unique` ON `coaching_memberships` (`open_key`);