import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const resume = sqliteTable(
  "resume",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    data: text("data", { mode: "json" }).notNull(),
    templateId: text("template_id").default("clean-modern"),
    currentVersionId: text("current_version_id"),
    isPinned: integer("is_pinned", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("resume_userId_idx").on(table.userId)]
);

export const resumeVersion = sqliteTable(
  "resume_version",
  {
    id: text("id").primaryKey(),
    resumeId: text("resume_id")
      .notNull()
      .references(() => resume.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    sourceKey: text("source_key").notNull(),
    pdfKey: text("pdf_key"),
    structuredData: text("structured_data", { mode: "json" }).notNull(),
    rawLatex: text("raw_latex"),
    isLatexCustom: integer("is_latex_custom", { mode: "boolean" }).default(false).notNull(),
    changeSummary: text("change_summary"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
  },
  (table) => [
    index("resume_version_resumeId_idx").on(table.resumeId),
    index("resume_version_createdAt_idx").on(table.createdAt),
  ]
);

export const template = sqliteTable("template", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  engine: text("engine").default("pdftex").notNull(),
  description: text("description"),
  previewImageKey: text("preview_image_key"),
  defaultLatex: text("default_latex").notNull(),
  requiredPackages: text("required_packages", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .notNull(),
});

export const upload = sqliteTable(
  "upload",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "set null" }),
    uploadKey: text("upload_key").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    parsedStatus: text("parsed_status").default("pending").notNull(),
    parsedDataJson: text("parsed_data_json", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
  },
  (table) => [index("upload_userId_idx").on(table.userId)]
);

export const jobPost = sqliteTable(
  "job_post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "cascade" }),
    title: text("title"),
    company: text("company"),
    rawText: text("raw_text").notNull(),
    parsedRequirementsJson: text("parsed_requirements_json", { mode: "json" }),
    targetKeywords: text("target_keywords", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
  },
  (table) => [index("job_post_userId_idx").on(table.userId)]
);

export const aiGeneration = sqliteTable(
  "ai_generation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    resumeId: text("resume_id").references(() => resume.id, { onDelete: "set null" }),
    jobPostId: text("job_post_id").references(() => jobPost.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    promptSummary: text("prompt_summary"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(cast(unixepoch() as integer))`)
      .notNull(),
  },
  (table) => [index("ai_generation_userId_idx").on(table.userId)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  resumes: many(resume),
  uploads: many(upload),
  jobPosts: many(jobPost),
  aiGenerations: many(aiGeneration),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const resumeRelations = relations(resume, ({ one, many }) => ({
  user: one(user, {
    fields: [resume.userId],
    references: [user.id],
  }),
  versions: many(resumeVersion),
  jobPosts: many(jobPost),
  uploads: many(upload),
  aiGenerations: many(aiGeneration),
}));

export const resumeVersionRelations = relations(resumeVersion, ({ one }) => ({
  resume: one(resume, {
    fields: [resumeVersion.resumeId],
    references: [resume.id],
  }),
}));

export const jobPostRelations = relations(jobPost, ({ one, many }) => ({
  user: one(user, {
    fields: [jobPost.userId],
    references: [user.id],
  }),
  resume: one(resume, {
    fields: [jobPost.resumeId],
    references: [resume.id],
  }),
  generations: many(aiGeneration),
}));

export const uploadRelations = relations(upload, ({ one }) => ({
  user: one(user, {
    fields: [upload.userId],
    references: [user.id],
  }),
  resume: one(resume, {
    fields: [upload.resumeId],
    references: [resume.id],
  }),
}));

export const aiGenerationRelations = relations(aiGeneration, ({ one }) => ({
  user: one(user, {
    fields: [aiGeneration.userId],
    references: [user.id],
  }),
  resume: one(resume, {
    fields: [aiGeneration.resumeId],
    references: [resume.id],
  }),
  jobPost: one(jobPost, {
    fields: [aiGeneration.jobPostId],
    references: [jobPost.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Resume = typeof resume.$inferSelect;
export type ResumeVersion = typeof resumeVersion.$inferSelect;
export type Template = typeof template.$inferSelect;
export type Upload = typeof upload.$inferSelect;
export type JobPost = typeof jobPost.$inferSelect;
export type AiGeneration = typeof aiGeneration.$inferSelect;
