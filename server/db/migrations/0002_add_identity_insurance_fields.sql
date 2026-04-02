-- Add identity fields to profiles
ALTER TABLE `profiles` ADD COLUMN `first_name` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `last_name` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD COLUMN `birth_date` text;--> statement-breakpoint

-- Add insurance and registration fields to exhibitor_profiles
ALTER TABLE `exhibitor_profiles` ADD COLUMN `registration_number` text;--> statement-breakpoint
ALTER TABLE `exhibitor_profiles` ADD COLUMN `insurer_name` text;--> statement-breakpoint
ALTER TABLE `exhibitor_profiles` ADD COLUMN `insurance_contract_number` text;
