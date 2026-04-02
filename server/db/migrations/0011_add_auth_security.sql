ALTER TABLE `profiles` ADD COLUMN `email_verified` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `email_verification_token` text;
--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `email_verification_expires` integer;
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `profiles`(`id`),
  `token_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `used_at` integer,
  `created_at` integer
);
--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);
--> statement-breakpoint
CREATE INDEX `password_reset_tokens_token_hash_idx` ON `password_reset_tokens` (`token_hash`);
--> statement-breakpoint
CREATE TABLE `token_blacklist` (
  `id` text PRIMARY KEY NOT NULL,
  `jti` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `token_blacklist_jti_idx` ON `token_blacklist` (`jti`);
