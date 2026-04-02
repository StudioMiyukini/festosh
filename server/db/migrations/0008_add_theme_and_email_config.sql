ALTER TABLE festivals ADD COLUMN theme_accent_color TEXT DEFAULT '#f59e0b';
--> statement-breakpoint
ALTER TABLE festivals ADD COLUMN theme_bg_color TEXT DEFAULT '#ffffff';
--> statement-breakpoint
ALTER TABLE festivals ADD COLUMN theme_text_color TEXT DEFAULT '#111827';
--> statement-breakpoint
ALTER TABLE festivals ADD COLUMN custom_css TEXT;
--> statement-breakpoint
ALTER TABLE festivals ADD COLUMN email_config TEXT;
--> statement-breakpoint
ALTER TABLE festivals ADD COLUMN header_style TEXT DEFAULT 'default';
