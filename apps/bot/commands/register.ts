import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { BotCommand } from "./types";
import { getBotDisplayName, getRegistrationFormLabel, getRegistrationFormUrl } from "../helpers/branding";

export const registerCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Shows the Murph Tournaments registration link"),

  async execute(interaction: ChatInputCommandInteraction) {
    const registrationUrl = getRegistrationFormUrl();
    const registrationLabel = getRegistrationFormLabel();
    const botDisplayName = getBotDisplayName();

    const embed = new EmbedBuilder()
      .setTitle(registrationLabel)
      .setDescription(
        `Use the form below to register your team for ${botDisplayName}.\n\n${registrationUrl}`
      );

    const row =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Open Registration Form")
          .setStyle(ButtonStyle.Link)
          .setURL(registrationUrl)
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};
