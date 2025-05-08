import "dotenv/config";
import {
    Client,
    GatewayIntentBits,
    Message,
    TextChannel,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
} from "discord.js";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TOXICITY_THRESHOLD = parseFloat(process.env.TOXICITY_THRESHOLD || "0.8");
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY as string;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN as string;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const allowedChannelIds = new Set<string>();

client.on("ready", () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}`);
    }
});

async function checkProfanityWithGemini(text: string): Promise<boolean> {
    try {
        const prompt = `
            Detect if the following message contains any profanity or offensive language in any language (including English and Tagalog).
            Respond with "YES" if it contains profanity, otherwise respond with "NO".
            Message: "${text}"
        `;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-001", // or "gemini-2.0-flash-001" for faster/cheaper
            contents: prompt,
        });
        const geminiReply = response.text?.trim().toUpperCase();
        return geminiReply === "YES";
    } catch (error: any) {
        console.error("Error calling Gemini:", error.message);
        return false;
    }
}

// Register slash commands on startup
client.once("ready", async () => {
    if (client.user) {
        console.log(`Logged in as ${client.user.tag}`);

        const commands = [
            new SlashCommandBuilder()
                .setName("addchannel")
                .setDescription("Add a channel to the allowed list.")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel to add")
                        .setRequired(true),
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder()
                .setName("removechannel")
                .setDescription("Remove a channel from the allowed list.")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Channel to remove")
                        .setRequired(true),
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder()
                .setName("listchannels")
                .setDescription("List all allowed channels.")
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        ].map((cmd) => cmd.toJSON());

        const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
        try {
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: commands,
            });
            console.log("Slash commands registered.");
        } catch (err) {
            console.error("Failed to register slash commands:", err);
        }
    }
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (
        !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
        await interaction.reply({
            content: "You need Administrator permission to use this command.",
            ephemeral: true,
        });
        return;
    }
    switch (interaction.commandName) {
        case "addchannel": {
            const channel = interaction.options.getChannel("channel");
            if (channel) {
                allowedChannelIds.add(channel.id);
                await interaction.reply({
                    content: `Channel <#${channel.id}> added to allowed list.`,
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "Invalid channel.",
                    ephemeral: true,
                });
            }
            break;
        }
        case "removechannel": {
            const channel = interaction.options.getChannel("channel");
            if (channel) {
                allowedChannelIds.delete(channel.id);
                await interaction.reply({
                    content: `Channel <#${channel.id}> removed from allowed list.`,
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: "Invalid channel.",
                    ephemeral: true,
                });
            }
            break;
        }
        case "listchannels": {
            const list = Array.from(allowedChannelIds);
            if (list.length === 0) {
                await interaction.reply({
                    content: "No allowed channels set.",
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: `Allowed channels: ${list
                        .map((id) => `<#${id}>`)
                        .join(", ")}`,
                    ephemeral: true,
                });
            }
            break;
        }
        default:
            break;
    }
});

client.on("messageCreate", async (message: Message) => {
    // Ignore messages from bots and messages not in allowed channels
    if (message.author.bot || !allowedChannelIds.has(message.channel.id))
        return;

    try {
        const text = message.content;
        // Send text to Perspective API
        const response = await axios.post(
            `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`,
            {
                comment: { text },
                languages: ["en"],
                requestedAttributes: { TOXICITY: {} },
            },
        );
        const score = response.data.attributeScores.TOXICITY.summaryScore
            .value as number;
        console.log(`[${message.author.username}] TOXICITY SCORE: ${score}`);

        let shouldDelete = false;

        if (score >= TOXICITY_THRESHOLD) {
            shouldDelete = true;
        } else {
            // Fallback: Use Gemini for multi-language profanity detection
            const hasProfanity = await checkProfanityWithGemini(text);
            console.log("hasProfanity", hasProfanity);
            if (hasProfanity) {
                shouldDelete = true;
            }
        }

        if (shouldDelete) {
            await message.delete();
            if (message.channel instanceof TextChannel) {
                await message.channel.send(
                    `⚠️ Message from <@${message.author.id}> was removed due to toxicity or profanity.`,
                );
            }
        }
    } catch (error: any) {
        console.error("Error analyzing message:", error.message);
    }
});

client.login(DISCORD_TOKEN);
