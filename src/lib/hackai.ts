import { detect } from 'tinyld';
import { iso6393 } from 'iso-639-3';
import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    serverURL: process.env.OPENROUTER_API_URL,
});

const iso1Map = new Map(
    iso6393
        .filter(lang => lang.iso6391)
        .map(lang => [lang.iso6391!, { name: lang.name }])
);

export function needsTranslation(text: string): boolean {
    const lang = detect(text);
    return lang !== 'en' && lang !== '';
}

export async function translate(text: string, targetLanguage: string = "English"): Promise<string> {
    try {
        const instructions = await Bun.file("./instructions.txt").text();
        const basePrompt = instructions.replace("into English", `into ${targetLanguage}`);

        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: basePrompt,
            input: text,
        });

        return await result.getText();
    } catch (error) {
        console.error("Error translating text:", error);
        return "";
    }
}

export async function detectLanguage(text: string): Promise<{
    languageName: string;
    languageCode: string;
    greeting: string;
}> {
    const iso1 = detect(text);

    if (!iso1) {
        return {
            languageName: 'another language',
            languageCode: '??',
            greeting: "It looks like you're writing in another language. Authorize Rosetta to translate your messages to English automatically!",
        };
    }

    const langInfo = iso1Map.get(iso1);
    const languageName = langInfo?.name ?? 'another language';
    const languageCode = iso1;

    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: `Write a short, warm message ENTIRELY in ${languageName} (${languageCode}) that:
1. Notes the user seems to be writing in ${languageName}
2. Explains others won't be able to understand or respond to them
3. Says they need English for communication and moderation
4. Mentions Rosetta can instantly translate their messages from ${languageName} to English if they authorize it
Keep it warm and helpful, not preachy. 2-3 short sentences max. Output ONLY the message text, nothing else.`,
            input: `Write the greeting in ${languageName}.`,
        });

        const greeting = (await result.getText()).trim();
        return { languageName, languageCode, greeting };

    } catch (error) {
        console.error("Error generating greeting:", error);
        return {
            languageName,
            languageCode,
            greeting: "It looks like you're writing in another language. Authorize Rosetta to translate your messages to English automatically!",
        };
    }
}

export async function translateUI(
    labels: string[],
    languageCode: string,
    languageName: string
): Promise<string[]> {
    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: `You are a UI translation assistant. Translate the given UI button labels into ${languageName} (${languageCode}).
Respond ONLY with a valid JSON array of translated strings in the same order. No markdown, no backticks, no explanation.
Keep emoji prefixes exactly as-is. Only translate the text portion.`,
            input: JSON.stringify(labels),
        });

        const raw = (await result.getText()).trim().replace(/```json|```/g, "");
        return JSON.parse(raw);
    } catch (error) {
        console.error("Error translating UI labels:", error);
        return labels;
    }
}

export async function generateLinkedDM(
    languageCode: string,
    languageName: string
): Promise<string> {
    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: `You write short, friendly confirmation messages. 
Write a message ENTIRELY in ${languageName} (${languageCode}) that tells the user:
1. Their account has been successfully linked with Rosetta
2. From now on, their messages will be automatically translated to English in channels where Rosetta is present
3. They can keep writing naturally in ${languageName}
Keep it warm and concise — 2-3 sentences max. Output ONLY the message text, nothing else.`,
            input: "generate the confirmation message",
        });

        return (await result.getText()).trim();
    } catch (error) {
        console.error("Error generating linked DM:", error);
        return ":rac_woah: Your account has been linked with Rosetta! Your messages will now be automatically translated to English in channels where Rosetta is present.";
    }
}