import type { App } from "@slack/bolt";
import { needsTranslation, translate, detectLanguage, translateUI } from "../lib/hackai";
import { getUserSettings, getUserToken, upsertUserSettings } from "../db";

const lastReminderSent = new Map<string, number>(); // im not adding redis for this.

const truncate = (text: string, limit = 3000) =>
    text.length > limit ? text.slice(0, limit - 1) + "…" : text;

export function registerMessageHandler(app: App) {
    app.event("message", async ({ event, client, say }) => {
        if (event.subtype) return;
        if (!("text" in event) || !event.text) return;
        if ("bot_id" in event && event.bot_id) return;

        const { text, user: userId, channel, ts, thread_ts } = event as any;
        if (!userId || !text.trim()) return;

        (async () => {
            try {
                const tokenRow = await getUserToken(userId);

                if (!tokenRow) {
                    // be quiet like a good boy
                    const recentlySent = lastReminderSent.get(userId) ?? 0;
                    if (Date.now() - recentlySent < 5 * 60 * 1000) return;
                }

                const settings = await getUserSettings(userId);
                const promptStatus = settings?.promptStatus ?? null;

                if (promptStatus === "dismissed") return;

                const shouldTranslate = await needsTranslation(text);
                if (!shouldTranslate) return;

                if (promptStatus === null) {
                    const lang = await detectLanguage(text);
                    const translatedLabels = await translateUI(
                        ["🔐 Authorize Rosetta", "🙅 Don't ask me again"],
                        lang.languageCode,
                        lang.languageName
                    );
                    const authorizeLabel = translatedLabels[0] ?? "🔐 Authorize Rosetta";
                    const dismissLabel = translatedLabels[1] ?? "🙅 Don't ask me again";

                    await client.chat.postEphemeral({
                        channel,
                        user: userId,
                        text: lang.greeting,
                        thread_ts,
                        blocks: [
                            {
                                type: "section",
                                text: { type: "mrkdwn", text: lang.greeting },
                            },
                            {
                                type: "actions",
                                elements: [
                                    {
                                        type: "button",
                                        text: { type: "plain_text", text: authorizeLabel, emoji: true },
                                        action_id: "rosetta_authorize",
                                        url: `${process.env.BASE_URL}/oauth/authorize?user=${userId}`,
                                        style: "primary",
                                    },
                                    {
                                        type: "button",
                                        text: { type: "plain_text", text: dismissLabel, emoji: true },
                                        action_id: "rosetta_dismiss",
                                        style: "danger",
                                    },
                                ],
                            },
                        ],
                    });

                    await upsertUserSettings(userId, {
                        promptStatus: "prompted",
                        targetLanguage: lang.languageCode,
                    });
                    return;
                }

                if (!tokenRow) {
                    const now = Date.now();
                    const lastSent = lastReminderSent.get(userId) ?? 0;

                    if (now - lastSent >= 5 * 60 * 1000) { // 5 minutes
                        lastReminderSent.set(userId, now);
                        const lang = await detectLanguage(text);

                        if (lang.languageCode === "en") return; // you would be surprised.

                        const translatedLabels = await translateUI(
                            ["🔐 Authorize Rosetta", "🙅 Don't ask me again"],
                            lang.languageCode,
                            lang.languageName
                        );
                        const authorizeLabel = translatedLabels[0] ?? "🔐 Authorize Rosetta";
                        const dismissLabel = translatedLabels[1] ?? "🙅 Don't ask me again";

                        await client.chat.postEphemeral({
                            channel,
                            user: userId,
                            text: lang.greeting,
                            thread_ts,
                            blocks: [
                                {
                                    type: "section",
                                    text: { type: "mrkdwn", text: lang.greeting },
                                },
                                {
                                    type: "actions",
                                    elements: [
                                        {
                                            type: "button",
                                            text: { type: "plain_text", text: authorizeLabel, emoji: true },
                                            action_id: "rosetta_authorize",
                                            url: `${process.env.BASE_URL}/oauth/authorize?user=${userId}`,
                                            style: "primary",
                                        },
                                        {
                                            type: "button",
                                            text: { type: "plain_text", text: dismissLabel, emoji: true },
                                            action_id: "rosetta_dismiss",
                                            style: "danger",
                                        },
                                    ],
                                },
                            ],
                        });

                        await upsertUserSettings(userId, {
                            promptStatus: "prompted",
                            targetLanguage: lang.languageCode,
                        });
                        return;
                    }
                    return;
                }

                const translated = await translate(text);
                if (!translated) return;

                const autoTranslate = settings?.autoTranslate ?? true;
                if (!autoTranslate) return;

                await client.chat.update({
                    token: tokenRow.xoxpToken,
                    channel,
                    ts,
                    text: translated,
                    blocks: [
                        {
                            type: "section",
                            text: { type: "mrkdwn", text: truncate(translated) },
                        },
                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: "Translated by <https://github.com/hackclub/rosetta|Rosetta>",
                                },
                            ],
                        },
                    ],
                });
            } catch (err) {
                console.error("Failed to process message in background:", err);
            }
        })();
    });

    app.action("rosetta_authorize", async ({ ack }) => {
        await ack();
    });

    app.action("rosetta_dismiss", async ({ ack, body, client }) => {
        await ack();
        const userId = body.user.id;

        await upsertUserSettings(userId, {
            promptStatus: "dismissed",
        });

        try {
            if ("response_url" in body && body.response_url) {
                await fetch(body.response_url as string, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ delete_original: true }),
                });
            }
        } catch { }
    });
}
