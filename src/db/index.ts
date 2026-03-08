import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import { userTokens, userSettings } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

export async function saveUserToken(slackUserId: string, xoxpToken: string) {
    const existing = await getUserToken(slackUserId);
    if (existing) {
        return db.update(userTokens)
            .set({ xoxpToken, updatedAt: new Date() })
            .where(eq(userTokens.slackUserId, slackUserId));
    }
    return db.insert(userTokens).values({ slackUserId, xoxpToken });
}

export async function getUserToken(slackUserId: string) {
    const rows = await db.select().from(userTokens).where(eq(userTokens.slackUserId, slackUserId));
    return rows[0] ?? null;
}

export async function getUserSettings(slackUserId: string) {
    const rows = await db.select().from(userSettings).where(eq(userSettings.slackUserId, slackUserId));
    return rows[0] ?? null;
}

export async function upsertUserSettings(
    slackUserId: string,
    data: Partial<typeof userSettings.$inferInsert>
) {
    const existing = await getUserSettings(slackUserId);
    if (existing) {
        return db.update(userSettings)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(userSettings.slackUserId, slackUserId));
    }
    return db.insert(userSettings).values({ slackUserId, ...data });
}

export async function deleteUserToken(slackUserId: string) {
    return db.delete(userTokens).where(eq(userTokens.slackUserId, slackUserId));
}

export default db;
