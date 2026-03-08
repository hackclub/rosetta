import type { App } from "@slack/bolt";
import { translate } from "../lib/hackai";

export function registerSlashCommands(app: App) {
    app.command("/translate", async ({ command, ack, respond }) => {
        await ack();

        const input = command.text.trim();

        if (!input) {
            await respond({
                response_type: "ephemeral",
                text: "Usage: `/translate [text]`\nExample: `/translate Hola, ¿cómo estás?`",
            });
            return;
        }

        try {
            const translated = await translate(input);

            await respond({
                response_type: "ephemeral",
                blocks: [
                    {
                        type: "section",
                        text: { type: "mrkdwn", text: translated },
                    },
                    {
                        type: "context",
                        elements: [
                            { type: "mrkdwn", text: `Translated by <https://github.com/hackclub/rosetta|Rosetta> • Original: *${input}*` },
                        ],
                    },
                ],
                text: translated,
            });
        } catch (err) {
            console.error("Translation error:", err);
            await respond({
                response_type: "ephemeral",
                text: "Uh oh... seems like the translation failed, maybe let's try again?",
            });
        }
    });
}