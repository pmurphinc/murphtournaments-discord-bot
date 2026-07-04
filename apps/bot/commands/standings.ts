import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { BotCommand } from "./types";
import { getStandings } from "../storage/standings";

export const standingsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("standings")
    .setDescription("Shows current FRP standings"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const standings = await getStandings();

      const embed = new EmbedBuilder()
        .setTitle("Murph Tournaments Standings")
        .setDescription(
          standings.length > 0
            ? standings
                .map(
                  (standing, index) =>
                    `${index + 1}. ${standing.teamName} (${standing.tournamentInstanceName ?? "Unassigned"}) - ${standing.frp} FRP`
                )
                .join("\n")
            : "No standings available."
        );

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.error("[standings-command] Failed to load standings:", error);
      await interaction.editReply({
        content: "Standings are not available yet.",
      });
    }
  },
};
