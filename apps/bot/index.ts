import "dotenv/config";
import { Client, GatewayIntentBits, Interaction, REST, Routes } from "discord.js";
import { initializePanelAutoUpdateService, unregisterPanelMessage } from "./services/panelAutoUpdateService";
import {
  logResolvedDatabaseTarget,
  validateBotPrismaClient,
  validatePanelLifecycleSchema,
} from "./storage/prisma";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const discordCommandsEnabled = process.env.DISCORD_COMMANDS_ENABLED === "true";

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN");
if (!clientId) throw new Error("Missing DISCORD_CLIENT_ID");

validateBotPrismaClient();
logResolvedDatabaseTarget();

const config = {
  token,
  clientId,
  guildId,
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

import { pingCommand } from "./commands/ping";
import { registerCommand } from "./commands/register";
import { teamCommand } from "./commands/team";
import { matchCommand } from "./commands/match";
import { helpCommand } from "./commands/help";
import { statusCommand } from "./commands/status";
import { tournamentCommand } from "./commands/tournament";
import { adminCommand } from "./commands/admin";
import { checkinCommand } from "./commands/checkin";
import { reviewCommand } from "./commands/review";
import { reportCommand } from "./commands/report";
import { reportsCommand } from "./commands/reports";
import { standingsCommand } from "./commands/standings";
import { cycleresultsCommand } from "./commands/cycleresults";
import { syncstatusCommand } from "./commands/syncstatus";
import { scrimCommand } from "./commands/scrim";
import { bracketCommand } from "./commands/bracket";
import { handleButtonInteraction } from "./handlers/buttonHandler";
import { handleCommandInteraction } from "./handlers/commandHandler";
import { handleModalInteraction } from "./handlers/modalHandler";
import { handleSelectMenuInteraction } from "./handlers/selectMenuHandler";
import { handleBracketInteraction } from "./handlers/bracketInteractions";
import { startRegistrationSheetSyncPolling } from "./services/registrationSheetSync";
// Dormant slash-command definitions are intentionally retained so commands can be
// restored later by setting DISCORD_COMMANDS_ENABLED=true. They are not
// registered or handled while commands are disabled.
const commandList = [
  pingCommand,
  registerCommand,
  teamCommand,
  matchCommand,
  helpCommand,
  statusCommand,
  tournamentCommand,
  adminCommand,
  checkinCommand,
  reviewCommand,
  reportCommand,
  reportsCommand,
  standingsCommand,
  cycleresultsCommand,
  syncstatusCommand,
  scrimCommand,
  bracketCommand,
];

const commands = commandList.map((cmd) => cmd.data.toJSON());

function getGuildIdsForCommandCleanup(): string[] {
  const rawValues = [
    process.env.DISCORD_GUILD_IDS,
    process.env.DISCORD_COMMAND_CLEANUP_GUILD_IDS,
    process.env.DISCORD_DEV_GUILD_ID,
    process.env.DISCORD_TEST_GUILD_ID,
    process.env.DISCORD_PRODUCTION_GUILD_ID,
    process.env.DISCORD_GUILD_ID,
  ];

  return Array.from(
    new Set(
      rawValues
        .flatMap((value) => value?.split(/[\s,]+/) ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

type CommandCleanupResult = {
  globalRemoved: number;
  guildRemoved: Array<{ guildId: string; removed: number }>;
};

const rest = new REST({ version: "10" }).setToken(config.token);

async function clearApplicationCommands(): Promise<CommandCleanupResult> {
  const guildIds = getGuildIdsForCommandCleanup();
  const result: CommandCleanupResult = { globalRemoved: 0, guildRemoved: [] };

  const globalCommands = (await rest.get(
    Routes.applicationCommands(config.clientId)
  )) as Array<{ id: string }>;
  result.globalRemoved = globalCommands.length;

  await rest.put(Routes.applicationCommands(config.clientId), {
    body: [],
  });

  for (const commandGuildId of guildIds) {
    const guildCommands = (await rest.get(
      Routes.applicationGuildCommands(config.clientId, commandGuildId)
    )) as Array<{ id: string }>;

    result.guildRemoved.push({
      guildId: commandGuildId,
      removed: guildCommands.length,
    });

    await rest.put(Routes.applicationGuildCommands(config.clientId, commandGuildId), {
      body: [],
    });
  }

  return result;
}

async function cleanupRegisteredCommandsOnStartup(): Promise<void> {
  try {
    const result = await clearApplicationCommands();
    const guildSummary = result.guildRemoved.length
      ? result.guildRemoved
          .map(({ guildId, removed }) => `${guildId}:${removed}`)
          .join(", ")
      : "none configured";

    console.log(
      `[commands] Cleared Discord application commands. global_removed=${result.globalRemoved} guild_removed={${guildSummary}}`
    );
  } catch (error) {
    console.error(
      "[commands] Failed to clear Discord application commands. Continuing startup so outbound TCR messaging remains available.",
      error
    );
  }
}

async function registerCommands() {
  if (!discordCommandsEnabled) {
    console.log(
      "[commands] DISCORD_COMMANDS_ENABLED is not true; slash command registration remains disabled."
    );
    return;
  }

  if (!config.guildId) {
    console.warn(
      "[commands] DISCORD_COMMANDS_ENABLED=true but DISCORD_GUILD_ID is missing; guild slash commands were not registered."
    );
    return;
  }

  try {
    console.log("[commands] Registering guild slash commands...");
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });

    console.log("[commands] Guild slash commands registered.");
  } catch (error) {
    console.error("[commands] Failed to register commands:", error);
  }
}

async function initializePanelServices(): Promise<void> {
  try {
    await validatePanelLifecycleSchema();
    initializePanelAutoUpdateService(client);
  } catch (error) {
    console.error(
      "[startup] Panel lifecycle storage unavailable. Panel auto-update service will not start.",
      error
    );
  }
}

client.once("ready", async () => {
  console.log(`Bot is online as ${client.user?.tag}`);
  await initializePanelServices();
  await cleanupRegisteredCommandsOnStartup();
  await registerCommands();
  startRegistrationSheetSyncPolling(client);
});


client.on("messageDelete", async (message) => {
  if (!message.guildId) return;
  unregisterPanelMessage(message.channelId, message.id);
});

async function replyToInteractionError(interaction: Interaction, error: unknown): Promise<void> {
  console.error("[interaction] Unhandled interaction error:", error);

  if (!interaction.isRepliable()) return;

  const message = {
    content: "Something went wrong while handling that interaction. Please try again.",
    ephemeral: true,
  };

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(message);
      return;
    }

    await interaction.reply(message);
  } catch (replyError) {
    console.error("[interaction] Failed to send interaction error response:", replyError);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!discordCommandsEnabled) {
    console.log(
      `[interaction] Ignored user-triggered Discord interaction while commands are disabled. type=${interaction.type}`
    );
    return;
  }

  try {
    if (interaction.isButton()) {
      if (await handleBracketInteraction(interaction)) {
        return;
      }
      await handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (await handleBracketInteraction(interaction)) {
        return;
      }
      await handleSelectMenuInteraction(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    await handleCommandInteraction(interaction, commandList);
  } catch (error) {
    await replyToInteractionError(interaction, error);
  }
});

client.login(config.token);
