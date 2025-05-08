# Discord Profanity Filter Bot

A powerful Discord bot that automatically detects and removes toxic or profane messages in your server, supporting both English and Tagalog. It uses Google Perspective API for toxicity detection and Google Gemini for multi-language profanity detection.

## Features

-   **Automatic Moderation:** Deletes messages with high toxicity or profanity.
-   **Multi-language Support:** Detects offensive language in English, Tagalog, and more.
-   **Admin Controls:** Easily manage which channels are moderated using slash commands.
-   **Customizable Threshold:** Set your own toxicity threshold via environment variables.

## How It Works

1. **Message Monitoring:** The bot listens to messages in channels you specify.
2. **Toxicity Detection:** Each message is analyzed using the Perspective API for toxicity.
3. **Profanity Detection:** If the message isn't toxic, it is checked for profanity in multiple languages using Google Gemini.
4. **Action:** If a message is found to be toxic or profane, it is deleted and a warning is posted in the channel.

## Slash Commands

-   `/addchannel <channel>`: Add a channel to the list of moderated channels.
-   `/removechannel <channel>`: Remove a channel from moderation.
-   `/listchannels`: List all currently moderated channels.

> **Note:** Only users with Administrator permissions can use these commands.

## Setup

### Prerequisites

-   Node.js v18+
-   Discord Bot Token
-   Google Perspective API Key
-   Google Gemini API Key

### Environment Variables

Create a `.env` file in your project root with the following:

```
DISCORD_TOKEN=your_discord_bot_token
PERSPECTIVE_API_KEY=your_perspective_api_key
GEMINI_API_KEY=your_gemini_api_key
TOXICITY_THRESHOLD=0.8
CHANNEL_ID=your_default_channel_id
PORT=3000
```

### Installation

```bash
npm install
```

### Running the Bot

```bash
npm start
```

The bot will log in to Discord and start moderating messages in the allowed channels.

## How to Use

1. Invite the bot to your server.
2. Use `/addchannel` to specify which channels to moderate.
3. The bot will automatically delete toxic or profane messages and notify the channel.

## Customization

-   Adjust the `TOXICITY_THRESHOLD` in your `.env` to make moderation stricter or more lenient.
-   Add or remove channels at any time using the slash commands.

## License

MIT
