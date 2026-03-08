import { App, LogLevel } from "@slack/bolt";
import { Elysia } from "elysia";

import { oauthRoutes } from "./routes/oauth";

import { registerHomeTab } from "./handlers/home";
import { registerShortcuts } from "./handlers/shortcuts";
import { registerSlashCommands } from "./handlers/commands";
import { registerMessageHandler } from "./handlers/message";

const app = new App({
    socketMode: true,
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    logLevel: process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
});

registerHomeTab(app);
registerShortcuts(app);
registerSlashCommands(app);
registerMessageHandler(app);

app.error(async (error) => {
    console.error("oh my god, something went wrong in the app im gonna crash out: ", error);
});

(async () => {
    await app.start();
    console.log("Rosetta is now running!");
})();

new Elysia()
    .get("/up", () => "ok")
    .get("/", ({ redirect }) => redirect("https://github.com/hackclub/rosetta"))

    .use(oauthRoutes)
    .listen(process.env.PORT || 3000);

console.log(`OAuth server listening on port ${process.env.PORT || 3000}`);

export { app };