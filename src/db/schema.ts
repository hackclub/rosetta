import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const userTokens = pgTable("user_tokens", {
    id: serial("id").primaryKey(),
    slackUserId: text("slack_user_id").notNull().unique(),
    xoxpToken: text("xoxp_token").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
    id: serial("id").primaryKey(),
    slackUserId: text("slack_user_id").notNull().unique(),
    autoTranslate: boolean("auto_translate").default(false),
    targetLanguage: text("target_language").default("EN"),
    promptStatus: text("prompt_status"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});