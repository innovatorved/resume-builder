CREATE TABLE `ai_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resume_id` text,
	`job_post_id` text,
	`kind` text NOT NULL,
	`prompt_summary` text,
	`model` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`job_post_id`) REFERENCES `job_post`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_generation_userId_idx` ON `ai_generation` (`user_id`);--> statement-breakpoint
CREATE TABLE `job_post` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resume_id` text,
	`title` text,
	`company` text,
	`raw_text` text NOT NULL,
	`parsed_requirements_json` text,
	`target_keywords` text,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_post_userId_idx` ON `job_post` (`user_id`);--> statement-breakpoint
CREATE TABLE `resume_version` (
	`id` text PRIMARY KEY NOT NULL,
	`resume_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`source_key` text NOT NULL,
	`pdf_key` text,
	`structured_data` text NOT NULL,
	`raw_latex` text,
	`is_latex_custom` integer DEFAULT false NOT NULL,
	`change_summary` text,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `resume_version_resumeId_idx` ON `resume_version` (`resume_id`);--> statement-breakpoint
CREATE INDEX `resume_version_createdAt_idx` ON `resume_version` (`created_at`);--> statement-breakpoint
CREATE TABLE `template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`engine` text DEFAULT 'pdftex' NOT NULL,
	`description` text,
	`preview_image_key` text,
	`default_latex` text NOT NULL,
	`required_packages` text,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `upload` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`resume_id` text,
	`upload_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`parsed_status` text DEFAULT 'pending' NOT NULL,
	`parsed_data_json` text,
	`created_at` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resume_id`) REFERENCES `resume`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `upload_userId_idx` ON `upload` (`user_id`);--> statement-breakpoint
ALTER TABLE `resume` ADD `template_id` text DEFAULT 'clean-modern';--> statement-breakpoint
ALTER TABLE `resume` ADD `current_version_id` text;