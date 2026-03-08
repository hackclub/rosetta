import type { App } from "@slack/bolt";
import { translate } from "../lib/hackai";

const truncate = (text: string, limit = 3000) =>
    text.length > limit ? text.slice(0, limit - 1) + "…" : text;

export function registerShortcuts(app: App) {
    app.shortcut("translate_shortcut", async ({ ack, shortcut, client }) => {
        await ack();

        await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: {
                type: "modal",
                callback_id: "rosetta_translate_modal",
                private_metadata: JSON.stringify({
                    channelId: (shortcut as any).channel?.id,
                }),
                title: { type: "plain_text", text: "Translate something!" },
                submit: { type: "plain_text", text: "Translate" },
                close: { type: "plain_text", text: "Cancel" },
                blocks: [
                    {
                        type: "input",
                        block_id: "translate_input_block",
                        element: {
                            type: "plain_text_input",
                            action_id: "translate_input",
                            multiline: true,
                            placeholder: {
                                type: "plain_text",
                                text: "Enter text to translate to English...",
                            },
                        },
                        label: { type: "plain_text", text: "Text" },
                    },
                ],
            },
        });
    });

    app.shortcut("translate_message", async ({ ack, shortcut, client }) => {
        await ack();

        const messageText = (shortcut as any).message?.text ?? "";
        const channelId = (shortcut as any).channel?.id;
        const threadTs = (shortcut as any).message?.ts;

        await client.views.open({
            trigger_id: shortcut.trigger_id,
            view: {
                type: "modal",
                callback_id: "rosetta_translate_modal",
                private_metadata: JSON.stringify({
                    channelId,
                    threadTs,
                }),
                title: { type: "plain_text", text: "Translate something!" },
                submit: { type: "plain_text", text: "Translate" },
                close: { type: "plain_text", text: "Cancel" },
                blocks: [
                    {
                        type: "input",
                        block_id: "translate_input_block",
                        element: {
                            type: "plain_text_input",
                            action_id: "translate_input",
                            multiline: true,
                            initial_value: messageText,
                            placeholder: {
                                type: "plain_text",
                                text: "Enter text to translate to English...",
                            },
                        },
                        label: { type: "plain_text", text: "Text" },
                    },
                ],
            },
        });
    });

    app.view("rosetta_translate_modal", async ({ ack, view, client, body }) => {
        const input =
            view.state.values?.["translate_input_block"]?.["translate_input"]?.value ?? "";

        const { channelId, threadTs } = JSON.parse(view.private_metadata || "{}");

        if (!input.trim()) {
            await ack({
                response_action: "errors",
                errors: {
                    translate_input_block: "Please enter some text to translate.",
                },
            });
            return;
        }

        await ack();

        const translated = await translate(input);

        try {
            await client.chat.postMessage({
                channel: channelId || body.user.id,
                thread_ts: threadTs,
                text: translated || "Uh oh... seems like the translation failed.",
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: truncate(translated || "Uh oh... seems like the translation failed."),
                        },
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `_Original:_ ${input.length > 100 ? input.slice(0, 100) + "…" : input}`,
                            },
                        ],
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "mrkdwn",
                                text: `Translated by <https://github.com/hackclub/rosetta|Rosetta> ${channelId ? `at the request of <@${body.user.id}>` : ""}`,
                            },
                        ],
                    },
                ],
            });
        } catch (err) {
            console.error("oh my god we failed to post this translation cuz of this: ", err);
        }
    });
}
