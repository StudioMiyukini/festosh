-- Support Tickets
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` text PRIMARY KEY NOT NULL,
  `festival_id` text NOT NULL REFERENCES `festivals`(`id`),
  `user_id` text REFERENCES `profiles`(`id`),
  `guest_name` text,
  `guest_email` text,
  `subject` text NOT NULL,
  `category` text NOT NULL DEFAULT 'general',
  `priority` text NOT NULL DEFAULT 'medium',
  `status` text NOT NULL DEFAULT 'open',
  `assigned_to` text REFERENCES `profiles`(`id`),
  `closed_at` integer,
  `created_at` integer,
  `updated_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_festival_id_idx` ON `support_tickets` (`festival_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_user_id_idx` ON `support_tickets` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_status_idx` ON `support_tickets` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_category_idx` ON `support_tickets` (`category`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `support_tickets_assigned_to_idx` ON `support_tickets` (`assigned_to`);
--> statement-breakpoint

-- Ticket Messages
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `ticket_id` text NOT NULL REFERENCES `support_tickets`(`id`),
  `sender_id` text REFERENCES `profiles`(`id`),
  `sender_type` text NOT NULL DEFAULT 'user',
  `content` text NOT NULL,
  `is_internal` integer NOT NULL DEFAULT 0,
  `created_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ticket_messages_ticket_id_idx` ON `ticket_messages` (`ticket_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ticket_messages_sender_id_idx` ON `ticket_messages` (`sender_id`);
--> statement-breakpoint

-- Chatbot FAQ entries (configurable per festival)
CREATE TABLE IF NOT EXISTS `chatbot_faq` (
  `id` text PRIMARY KEY NOT NULL,
  `festival_id` text NOT NULL REFERENCES `festivals`(`id`),
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `category` text DEFAULT 'general',
  `sort_order` integer DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` integer,
  `updated_at` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chatbot_faq_festival_id_idx` ON `chatbot_faq` (`festival_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `chatbot_faq_is_active_idx` ON `chatbot_faq` (`is_active`);
