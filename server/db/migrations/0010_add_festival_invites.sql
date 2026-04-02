CREATE TABLE `festival_invites` (
  `id` text PRIMARY KEY NOT NULL,
  `festival_id` text NOT NULL REFERENCES `festivals`(`id`),
  `token` text NOT NULL,
  `role` text NOT NULL DEFAULT 'volunteer',
  `max_uses` integer DEFAULT 0,
  `use_count` integer DEFAULT 0 NOT NULL,
  `expires_at` integer,
  `created_by` text NOT NULL REFERENCES `profiles`(`id`),
  `created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `festival_invites_token_idx` ON `festival_invites` (`token`);
--> statement-breakpoint
CREATE INDEX `festival_invites_festival_id_idx` ON `festival_invites` (`festival_id`);
