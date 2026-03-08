import { Elysia } from "elysia";

import { generateLinkedDM } from "../lib/hackai";
import { saveUserToken, getUserSettings, upsertUserSettings } from "../db";

export const oauthRoutes = new Elysia({ prefix: "/oauth" })
    .get("/authorize", ({ redirect, query }) => {
        const params = new URLSearchParams({
            client_id: process.env.SLACK_CLIENT_ID!,
            user_scope: "chat:write",
            redirect_uri: `${process.env.BASE_URL}/oauth/callback`,
            ...(query.user ? { state: query.user as string } : {}),
        });

        return redirect(
            `https://slack.com/oauth/v2/authorize?${params.toString()}`
        );
    })

    .get("/callback", async ({ query, set }) => {
        const { code, error, state } = query as Record<string, string>;

        if (error || !code) {
            set.status = 400;
            return `OAuth error: ${error ?? "missing code"}`;
        }

        const response = await fetch("https://slack.com/api/oauth.v2.access", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code,
                redirect_uri: `${process.env.BASE_URL}/oauth/callback`,
            }),
        });

        const data = (await response.json()) as any;

        if (!data.ok) {
            set.status = 400;
            return `Slack OAuth error: ${data.error}`;
        }

        const xoxpToken = data.authed_user?.access_token;
        const userId = data.authed_user?.id;

        if (!xoxpToken || !userId) {
            set.status = 400;
            return "Missing user token in response, try again";
        }

        await saveUserToken(userId, xoxpToken);
        await upsertUserSettings(userId, { autoTranslate: true });

        try {
            const settings = await getUserSettings(userId);
            const langCode = settings?.targetLanguage ?? "en";

            const langNames: Record<string, string> = {
                es: "Español", fr: "Français", pt: "Português", de: "Deutsch",
                zh: "中文", ja: "日本語", ko: "한국어", ar: "العربية",
                ru: "Русский", it: "Italiano", hi: "हिन्दी", tr: "Türkçe",
            };
            const langName = langNames[langCode] ?? "the user's language";

            const dmText = await generateLinkedDM(langCode, langName);

            const dmOpen = await fetch("https://slack.com/api/conversations.open", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ users: userId }),
            });
            const dmData = (await dmOpen.json()) as any;

            if (dmData.ok && dmData.channel?.id) {
                await fetch("https://slack.com/api/chat.postMessage", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        channel: dmData.channel.id,
                        text: dmText,
                        blocks: [
                            {
                                type: "section",
                                text: { type: "mrkdwn", text: dmText },
                            },
                            {
                                type: "context",
                                elements: [
                                    {
                                        type: "mrkdwn",
                                        text: "_<https://github.com/hackclub/rosetta|Rosetta>_",
                                    },
                                ],
                            },
                        ],
                    }),
                });
            }
        } catch (err) { } // i mean i dont really care if the dm step fails tbh

        return "Everything's good now! You can close this window.";
    });