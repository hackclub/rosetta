import type { App } from "@slack/bolt";
import { getUserToken, getUserSettings, upsertUserSettings, deleteUserToken } from "../db";

export function registerHomeTab(app: App) {
    app.event("app_home_opened", async ({ event, client }) => {
        const userId = event.user;

        const tokenRow = await getUserToken(userId);
        const settings = await getUserSettings(userId);
        const isLinked = !!tokenRow;
        const autoTranslate = settings?.autoTranslate ?? true;

        const blocks: any[] = [
            {
                type: "header",
                text: { type: "plain_text", text: "Rosetta", emoji: true },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "Rosetta automatically translates your non-English messages so everyone can understand you.",
                },
            },
            { type: "divider" },

            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: isLinked
                        ? "✅ *Account linked* - Rosetta can edit your messages in-place."
                        : "❌ *Account not linked* - Authorize Rosetta to translate your messages automatically.",
                },
                ...(isLinked
                    ? {
                        accessory: {
                            type: "button",
                            text: { type: "plain_text", text: "🔓 Unlink Account", emoji: true },
                            action_id: "home_revoke",
                            style: "danger",
                            confirm: {
                                title: { type: "plain_text", text: "Unlink account?" },
                                text: {
                                    type: "mrkdwn",
                                    text: "Rosetta will no longer be able to edit your messages in-place. You can re-link at any time.",
                                },
                                confirm: { type: "plain_text", text: "Unlink" },
                                deny: { type: "plain_text", text: "Cancel" },
                            },
                        },
                    }
                    : {
                        accessory: {
                            type: "button",
                            text: { type: "plain_text", text: "🔐 Authorize Rosetta", emoji: true },
                            action_id: "home_authorize",
                            url: `${process.env.BASE_URL}/oauth/authorize?user=${userId}`,
                            style: "primary",
                        },
                    }),
            },

            { type: "divider" },

            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: autoTranslate
                        ? "🟢 *Auto-translate is ON* - Your non-English messages are translated automatically."
                        : "🔴 *Auto-translate is OFF* - Your messages won't be translated.",
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: autoTranslate ? "Turn Off" : "Turn On",
                        emoji: true,
                    },
                    action_id: "home_toggle_autotranslate",
                    ...(autoTranslate ? { style: "danger" } : { style: "primary" }),
                },
            },

            { type: "divider" },

            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "Built with ❤️ by <https://github.com/sbeltranc|santi> at <https://github.com/hackclub|Hack Club> · <https://github.com/hackclub/rosetta|Source on GitHub>",
                    },
                ],
            },
        ];

        await client.views.publish({
            user_id: userId,
            view: {
                type: "home",
                blocks,
            },
        });
    });

    app.action("home_authorize", async ({ ack }) => await ack());

    app.action("home_revoke", async ({ ack, body, client }) => {
        await ack();
        await deleteUserToken(body.user.id);
        await refreshHome(client, body.user.id);
    });

    app.action("home_toggle_autotranslate", async ({ ack, body, client }) => {
        await ack();

        const userId = body.user.id;
        const settings = await getUserSettings(userId);
        const currentValue = settings?.autoTranslate ?? true;

        if (!currentValue) {
            const tokenRow = await getUserToken(userId);
            if (!tokenRow) {
                const channelId = (body as any).channel?.id;
                if (channelId) {
                    await client.chat.postEphemeral({
                        channel: channelId,
                        user: userId,
                        text: "⚠️ You must link your account before enabling auto-translate. Click *Authorize Rosetta* above to get started.",
                    });
                } else {
                    await client.views.open({
                        trigger_id: (body as any).trigger_id,
                        view: {
                            type: "modal",
                            title: { type: "plain_text", text: "Account not linked" },
                            close: { type: "plain_text", text: "OK" },
                            blocks: [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: "⚠️ You must *link your account* before enabling auto-translate.\n\nClick *Authorize Rosetta* on the home tab to get started.",
                                    },
                                },
                            ],
                        },
                    });
                }
                return;
            }
        }

        await upsertUserSettings(userId, {
            autoTranslate: !currentValue,
        });

        await refreshHome(client, userId);
    });
}

async function refreshHome(client: any, userId: string) {
    const tokenRow = await getUserToken(userId);
    const settings = await getUserSettings(userId);
    const isLinked = !!tokenRow;
    const autoTranslate = settings?.autoTranslate ?? true;

    const blocks: any[] = [
        {
            type: "header",
            text: { type: "plain_text", text: "🌐 Rosetta", emoji: true },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Rosetta automatically translates your non-English messages so everyone can understand you.",
            },
        },
        { type: "divider" },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: isLinked
                    ? "✅ *Account linked* - Rosetta can edit your messages in-place."
                    : "❌ *Account not linked* - Authorize Rosetta to translate your messages automatically.",
            },
            ...(isLinked
                ? {
                    accessory: {
                        type: "button",
                        text: { type: "plain_text", text: "🔓 Unlink Account", emoji: true },
                        action_id: "home_revoke",
                        style: "danger",
                        confirm: {
                            title: { type: "plain_text", text: "Unlink account?" },
                            text: {
                                type: "mrkdwn",
                                text: "Rosetta will no longer be able to edit your messages in-place. You can re-link at any time.",
                            },
                            confirm: { type: "plain_text", text: "Unlink" },
                            deny: { type: "plain_text", text: "Cancel" },
                        },
                    },
                }
                : {
                    accessory: {
                        type: "button",
                        text: { type: "plain_text", text: "🔐 Authorize Rosetta", emoji: true },
                        action_id: "home_authorize",
                        url: `${process.env.BASE_URL}/oauth/authorize?user=${userId}`,
                        style: "primary",
                    },
                }),
        },
        { type: "divider" },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: autoTranslate
                    ? "🟢 *Auto-translate is ON* - Your non-English messages are translated automatically."
                    : "🔴 *Auto-translate is OFF* - Your messages won't be translated.",
            },
            accessory: {
                type: "button",
                text: {
                    type: "plain_text",
                    text: autoTranslate ? "Turn Off" : "Turn On",
                    emoji: true,
                },
                action_id: "home_toggle_autotranslate",
                ...(autoTranslate ? { style: "danger" } : { style: "primary" }),
            },
        },
        { type: "divider" },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: "Built with ❤️ by <https://github.com/sbeltranc|santi> at <https://github.com/hackclub|Hack Club> · <https://github.com/hackclub/rosetta|Source on GitHub>",
                },
            ],
        },
    ];

    await client.views.publish({
        user_id: userId,
        view: {
            type: "home",
            blocks,
        },
    });
}
