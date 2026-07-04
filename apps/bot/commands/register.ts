import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { BotCommand } from "./types";
import { getActiveRegistrationLink, REGISTRATION_CLOSED_MESSAGE } from "../services/registrationWebsite";

export const registerCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Shows the Murph Tournaments registration link"),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Use /register inside the Discord server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const registrationLink = await getActiveRegistrationLink(interaction.guildId);

    if (!registrationLink) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Murph Tournaments Registration")
            .setDescription(REGISTRATION_CLOSED_MESSAGE),
        ],
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Murph Tournaments Registration")
      .setDescription(
        `Register for ${registrationLink.tournamentName} on the Murph Tournaments website.\n\n${registrationLink.url}`
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(registrationLink.label)
        .setStyle(ButtonStyle.Link)
        .setURL(registrationLink.url)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
};
