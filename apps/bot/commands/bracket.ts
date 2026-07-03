import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { BotCommand } from "./types";
import { buildBracketHomePanel } from "../helpers/bracketPanel";
import { getBracketRoleAccessForInteraction } from "../helpers/permissions";

export const bracketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("bracket")
    .setDescription("Opens your private Murph Tournaments bracket menu"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({ content: "Use /bracket inside the Discord server.", ephemeral: true });
      return;
    }

    const access = await getBracketRoleAccessForInteraction(interaction);
    await interaction.reply({ ...buildBracketHomePanel(access), ephemeral: true });
  },
};
