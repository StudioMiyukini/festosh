-- Add user type and volunteer fields to profiles
ALTER TABLE `profiles` ADD COLUMN `user_type` text DEFAULT 'visitor';--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `phone` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `volunteer_bio` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `volunteer_skills` text;--> statement-breakpoint
CREATE INDEX `profiles_user_type_idx` ON `profiles` (`user_type`);--> statement-breakpoint

-- Documents table for uploaded files (KBIS, insurance, ID, etc.)
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`document_type` text NOT NULL,
	`label` text,
	`status` text DEFAULT 'pending',
	`review_notes` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `documents_user_id_idx` ON `documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `documents_document_type_idx` ON `documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `documents_status_idx` ON `documents` (`status`);
