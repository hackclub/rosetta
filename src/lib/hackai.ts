import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({
    apiKey: process.env.HACKAI_KEY,
    serverURL: "https://ai.hackclub.com/proxy/v1",
});

export async function needsTranslation(text: string): Promise<boolean> {
    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: `You are a language detector. Respond ONLY with "yes" or "no", nothing else.
Respond "yes" if the input contains ANY non-English words or phrases (including mixed language messages).
Respond "no" only if the entire message is 100% English.`,
            input: text,
        });

        const response = (await result.getText()).trim().toLowerCase();
        console.log("needs translation:", response);
        return response === "yes";
    } catch (error) {
        console.error("Error checking if text needs translation:", error);
        return false;
    }
}

export async function translate(text: string): Promise<string> {
    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: await Bun.file("./instructions.txt").text(),
            input: text,
        });

        return await result.getText();
    } catch (error) {
        console.error("Error checking if text needs translation:", error);
        return "";
    }
}

export async function detectLanguage(text: string): Promise<{
    languageName: string;
    languageCode: string;
    greeting: string;
}> {
    try {
        const result = await client.callModel({
            model: "google/gemini-2.5-flash",
            instructions: `You are a language detection assistant. 
Given a message, respond ONLY with a valid JSON object (no markdown, no backticks) with these fields:
- "languageName": the name of the language written IN THAT LANGUAGE (e.g. for Spanish write "Español", for French write "Français", for Chinese write "中文")
- "languageCode": the ISO 639-1 code (e.g. "es", "fr", "zh")
- "greeting": a natural, friendly message written ENTIRELY in the detected language explaining:
  1. That it seems they are writing in [language name]
  2. That other people won't be able to understand or respond to them
  3. That they need to write in English for communication and moderation reasons
  4. That Rosetta can instantly translate their messages from [language] to English with the exact same meaning, if they just authorize it
Keep it warm and helpful, not preachy. 2-3 short sentences max.`,
            input: text,
        });

        const raw = (await result.getText()).trim().replace(/```json|```/g, "");
        return JSON.parse(raw);

    } catch (error) {
        console.error("Error detecting language:", error);
        return {
            languageName: "another language",
            languageCode: "??",
            greeting: "It looks like you're writing in another language. Others here may not be able to understand you. Authorize Rosetta to translate your messages to English automatically!",
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