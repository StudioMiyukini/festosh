CREATE TABLE `booth_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`exhibitor_id` text NOT NULL,
	`preferred_zone` text,
	`requested_width_m` real,
	`requested_depth_m` real,
	`needs_electricity` integer DEFAULT 0,
	`requested_wattage` integer,
	`needs_water` integer DEFAULT 0,
	`needs_tables` integer,
	`needs_chairs` integer,
	`special_requests` text,
	`products_description` text,
	`status` text DEFAULT 'draft',
	`reviewed_by` text,
	`reviewed_at` integer,
	`review_notes` text,
	`assigned_booth_id` text,
	`amount_cents` integer,
	`is_paid` integer DEFAULT 0,
	`paid_at` integer,
	`documents` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exhibitor_id`) REFERENCES `exhibitor_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_booth_id`) REFERENCES `booth_locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booth_applications_edition_exhibitor_idx` ON `booth_applications` (`edition_id`,`exhibitor_id`);--> statement-breakpoint
CREATE INDEX `booth_applications_edition_id_idx` ON `booth_applications` (`edition_id`);--> statement-breakpoint
CREATE INDEX `booth_applications_exhibitor_id_idx` ON `booth_applications` (`exhibitor_id`);--> statement-breakpoint
CREATE INDEX `booth_applications_status_idx` ON `booth_applications` (`status`);--> statement-breakpoint
CREATE TABLE `booth_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`code` text,
	`zone` text,
	`width_m` real,
	`depth_m` real,
	`has_electricity` integer DEFAULT 0,
	`max_wattage` integer,
	`has_water` integer DEFAULT 0,
	`is_interior` integer DEFAULT 1,
	`is_accessible` integer DEFAULT 1,
	`price_cents` integer DEFAULT 0,
	`equipment_included` text,
	`notes` text,
	`plan_position` text,
	`is_available` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booth_locations_edition_code_idx` ON `booth_locations` (`edition_id`,`code`);--> statement-breakpoint
CREATE INDEX `booth_locations_edition_id_idx` ON `booth_locations` (`edition_id`);--> statement-breakpoint
CREATE INDEX `booth_locations_zone_idx` ON `booth_locations` (`zone`);--> statement-breakpoint
CREATE INDEX `booth_locations_is_available_idx` ON `booth_locations` (`is_available`);--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`name` text,
	`entry_type` text,
	`color` text,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_categories_festival_name_type_idx` ON `budget_categories` (`festival_id`,`name`,`entry_type`);--> statement-breakpoint
CREATE INDEX `budget_categories_festival_id_idx` ON `budget_categories` (`festival_id`);--> statement-breakpoint
CREATE TABLE `budget_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`category_id` text,
	`entry_type` text,
	`description` text,
	`amount_cents` integer,
	`date` text,
	`receipt_url` text,
	`payment_method` text,
	`notes` text,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `budget_entries_edition_id_idx` ON `budget_entries` (`edition_id`);--> statement-breakpoint
CREATE INDEX `budget_entries_category_id_idx` ON `budget_entries` (`category_id`);--> statement-breakpoint
CREATE INDEX `budget_entries_entry_type_idx` ON `budget_entries` (`entry_type`);--> statement-breakpoint
CREATE INDEX `budget_entries_date_idx` ON `budget_entries` (`date`);--> statement-breakpoint
CREATE TABLE `cms_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`block_type` text,
	`content` text,
	`settings` text,
	`sort_order` integer DEFAULT 0,
	`is_visible` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`page_id`) REFERENCES `cms_pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cms_blocks_page_id_idx` ON `cms_blocks` (`page_id`);--> statement-breakpoint
CREATE INDEX `cms_blocks_sort_order_idx` ON `cms_blocks` (`sort_order`);--> statement-breakpoint
CREATE TABLE `cms_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`slug` text,
	`title` text,
	`is_published` integer DEFAULT 0,
	`is_homepage` integer DEFAULT 0,
	`meta_description` text,
	`sort_order` integer DEFAULT 0,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_pages_festival_slug_idx` ON `cms_pages` (`festival_id`,`slug`);--> statement-breakpoint
CREATE INDEX `cms_pages_festival_id_idx` ON `cms_pages` (`festival_id`);--> statement-breakpoint
CREATE INDEX `cms_pages_is_published_idx` ON `cms_pages` (`is_published`);--> statement-breakpoint
CREATE TABLE `editions` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`name` text,
	`slug` text,
	`description` text,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'planning',
	`exhibitor_registration_start` integer,
	`exhibitor_registration_end` integer,
	`volunteer_registration_start` integer,
	`volunteer_registration_end` integer,
	`expected_visitors` integer,
	`max_exhibitors` integer,
	`max_volunteers` integer,
	`visitor_hours` text,
	`is_active` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `editions_festival_slug_idx` ON `editions` (`festival_id`,`slug`);--> statement-breakpoint
CREATE INDEX `editions_festival_id_idx` ON `editions` (`festival_id`);--> statement-breakpoint
CREATE INDEX `editions_status_idx` ON `editions` (`status`);--> statement-breakpoint
CREATE INDEX `editions_is_active_idx` ON `editions` (`is_active`);--> statement-breakpoint
CREATE TABLE `equipment_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`assigned_to_type` text,
	`assigned_to_id` text,
	`quantity` integer DEFAULT 1,
	`status` text DEFAULT 'requested',
	`notes` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`item_id`) REFERENCES `equipment_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `equipment_assignments_item_id_idx` ON `equipment_assignments` (`item_id`);--> statement-breakpoint
CREATE INDEX `equipment_assignments_edition_id_idx` ON `equipment_assignments` (`edition_id`);--> statement-breakpoint
CREATE INDEX `equipment_assignments_status_idx` ON `equipment_assignments` (`status`);--> statement-breakpoint
CREATE TABLE `equipment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`name` text,
	`description` text,
	`category` text,
	`unit` text DEFAULT 'unit',
	`photo_url` text,
	`total_quantity` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `equipment_items_festival_id_idx` ON `equipment_items` (`festival_id`);--> statement-breakpoint
CREATE INDEX `equipment_items_category_idx` ON `equipment_items` (`category`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`venue_id` text,
	`title` text,
	`description` text,
	`category` text,
	`start_time` integer,
	`end_time` integer,
	`is_public` integer DEFAULT 1,
	`image_url` text,
	`max_participants` integer,
	`speaker_names` text,
	`tags` text,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_edition_id_idx` ON `events` (`edition_id`);--> statement-breakpoint
CREATE INDEX `events_venue_id_idx` ON `events` (`venue_id`);--> statement-breakpoint
CREATE INDEX `events_category_idx` ON `events` (`category`);--> statement-breakpoint
CREATE INDEX `events_start_time_idx` ON `events` (`start_time`);--> statement-breakpoint
CREATE TABLE `exhibitor_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`company_name` text,
	`trade_name` text,
	`activity_type` text,
	`category` text,
	`description` text,
	`logo_url` text,
	`photo_url` text,
	`website` text,
	`social_links` text,
	`legal_form` text,
	`siret` text,
	`vat_number` text,
	`contact_first_name` text,
	`contact_last_name` text,
	`contact_email` text,
	`contact_phone` text,
	`address_line1` text,
	`address_line2` text,
	`postal_code` text,
	`city` text,
	`country` text DEFAULT 'FR',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exhibitor_profiles_user_id_unique` ON `exhibitor_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `exhibitor_profiles_user_id_idx` ON `exhibitor_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `exhibitor_profiles_category_idx` ON `exhibitor_profiles` (`category`);--> statement-breakpoint
CREATE TABLE `festival_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`festival_id` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `festival_favorites_user_festival_idx` ON `festival_favorites` (`user_id`,`festival_id`);--> statement-breakpoint
CREATE INDEX `festival_favorites_user_id_idx` ON `festival_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `festival_favorites_festival_id_idx` ON `festival_favorites` (`festival_id`);--> statement-breakpoint
CREATE TABLE `festival_members` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'exhibitor',
	`invited_by` text,
	`joined_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `festival_members_festival_user_idx` ON `festival_members` (`festival_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `festival_members_festival_id_idx` ON `festival_members` (`festival_id`);--> statement-breakpoint
CREATE INDEX `festival_members_user_id_idx` ON `festival_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `festival_members_role_idx` ON `festival_members` (`role`);--> statement-breakpoint
CREATE TABLE `festivals` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`logo_url` text,
	`banner_url` text,
	`theme_primary_color` text DEFAULT '#6366f1',
	`theme_secondary_color` text DEFAULT '#ec4899',
	`theme_font` text DEFAULT 'Inter',
	`country` text,
	`city` text,
	`address` text,
	`latitude` real,
	`longitude` real,
	`website` text,
	`contact_email` text,
	`social_links` text,
	`tags` text,
	`status` text DEFAULT 'draft',
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `festivals_slug_unique` ON `festivals` (`slug`);--> statement-breakpoint
CREATE INDEX `festivals_slug_idx` ON `festivals` (`slug`);--> statement-breakpoint
CREATE INDEX `festivals_status_idx` ON `festivals` (`status`);--> statement-breakpoint
CREATE INDEX `festivals_created_by_idx` ON `festivals` (`created_by`);--> statement-breakpoint
CREATE INDEX `festivals_city_idx` ON `festivals` (`city`);--> statement-breakpoint
CREATE TABLE `floor_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`name` text DEFAULT 'Plan principal',
	`width_px` integer DEFAULT 1200,
	`height_px` integer DEFAULT 800,
	`grid_size` integer DEFAULT 20,
	`background_url` text,
	`canvas_data` text,
	`version` integer DEFAULT 1,
	`created_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `floor_plans_edition_id_idx` ON `floor_plans` (`edition_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`festival_id` text,
	`title` text,
	`body` text,
	`link` text,
	`channel` text DEFAULT 'in_app',
	`is_read` integer DEFAULT 0,
	`read_at` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_festival_id_idx` ON `notifications` (`festival_id`);--> statement-breakpoint
CREATE INDEX `notifications_is_read_idx` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`avatar_url` text,
	`bio` text,
	`platform_role` text DEFAULT 'user',
	`locale` text DEFAULT 'fr',
	`timezone` text DEFAULT 'Europe/Paris',
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE INDEX `profiles_email_idx` ON `profiles` (`email`);--> statement-breakpoint
CREATE INDEX `profiles_username_idx` ON `profiles` (`username`);--> statement-breakpoint
CREATE INDEX `profiles_platform_role_idx` ON `profiles` (`platform_role`);--> statement-breakpoint
CREATE TABLE `shift_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`user_id` text NOT NULL,
	`assigned_by` text,
	`notes` text,
	`created_at` integer,
	FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shift_assignments_shift_user_idx` ON `shift_assignments` (`shift_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `shift_assignments_shift_id_idx` ON `shift_assignments` (`shift_id`);--> statement-breakpoint
CREATE INDEX `shift_assignments_user_id_idx` ON `shift_assignments` (`user_id`);--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`role_id` text,
	`venue_id` text,
	`title` text,
	`description` text,
	`start_time` integer,
	`end_time` integer,
	`max_volunteers` integer DEFAULT 1,
	`status` text DEFAULT 'open',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `volunteer_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shifts_edition_id_idx` ON `shifts` (`edition_id`);--> statement-breakpoint
CREATE INDEX `shifts_role_id_idx` ON `shifts` (`role_id`);--> statement-breakpoint
CREATE INDEX `shifts_venue_id_idx` ON `shifts` (`venue_id`);--> statement-breakpoint
CREATE INDEX `shifts_status_idx` ON `shifts` (`status`);--> statement-breakpoint
CREATE INDEX `shifts_start_time_idx` ON `shifts` (`start_time`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`name` text,
	`description` text,
	`venue_type` text,
	`capacity` integer,
	`address` text,
	`plan_position` text,
	`is_active` integer DEFAULT 1,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `venues_festival_id_idx` ON `venues` (`festival_id`);--> statement-breakpoint
CREATE INDEX `venues_venue_type_idx` ON `venues` (`venue_type`);--> statement-breakpoint
CREATE TABLE `volunteer_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`festival_id` text NOT NULL,
	`name` text,
	`description` text,
	`color` text,
	`created_at` integer,
	FOREIGN KEY (`festival_id`) REFERENCES `festivals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `volunteer_roles_festival_id_idx` ON `volunteer_roles` (`festival_id`);