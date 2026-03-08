# Rosetta
Rosetta is an Slack bot intended to translate messages in-place on Slack channels. It's name comes from the Rosetta Stone, an ancient artifact that was used to translate hieroglyphics into Greek.

The whole intention of this bot is to be added into the channels of a program that may have come with a influx of non-English speakers, allowing for communication and messages to be sent in languages other than English, while still maintaining the ability to understand the message.

The way it works, it checks on designated channels if a message is using a language other than English, and if it is, it will prompt the person to authorize Rosetta to translate their message to English on their behalf.

https://github.com/user-attachments/assets/cc7ab9a8-9435-4af4-ab92-8c2b6725ed9f

## Development
In order to get started with development, you will need to have a Slack app set up and a database set up. 

```md
# Clone the repository
$ git clone https://github.com/hackclub/rosetta.git
$ cd rosetta

# Install dependencies
$ bun install

# Create a .env file
$ cp .env.example .env

# Configure the .env file with your OpenRouter API key and Slack bot token

# You can get a Slack bot token from https://api.slack.com/apps
# You can get an OpenRouter API key from https://openrouter.ai/api or get a free AI API by being a Hack Clubber at https://ai.hackclub.com/

# Run the bot
$ bun run src/index.ts
```

## Production
Rosetta was built to be deployed on Coolify, but it should be deployable on any platform that supports Dockerfiles or Bun.

You need to setup a Postgresql database and configure the environment variables in Coolify, same goes with the Slack app and OpenRouter API key.

To deploy Rosetta in Coolify, you can use the following instructions:

https://github.com/user-attachments/assets/a7e6b0e4-eecf-458f-a807-43e9419da17a

After this, you can add your environment variables and deploy Rosetta onto production!
