import { ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import {
  buildBracketHomePanel,
  buildBracketStaffToolPanel,
  buildBracketTeamPanel,
  buildWebsiteTeamLookupUnavailablePanel,
  buildInfoPanel,
  buildMurphToolsPanel,
  buildRegisterPanel,
  buildStaffToolsPanel,
  buildViewerStandingsPanel,
  buildViewerTournamentSummaryPanel,
} from "../helpers/bracketPanel";
import { getBracketRoleAccessForInteraction } from "../helpers/permissions";

type BracketInteraction = ButtonInteraction | StringSelectMenuInteraction;

async function update(interaction: BracketInteraction, panel: any) {
  await interaction.update(panel);
}

export async function handleBracketInteraction(interaction: BracketInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("bracket:")) return false;
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: "This bracket menu is outdated. Run /bracket again inside the server.", ephemeral: true });
    return true;
  }

  const access = await getBracketRoleAccessForInteraction(interaction);
  const home = () => buildBracketHomePanel(access);

  if (interaction.isButton()) {
    if (interaction.customId === "bracket:home" || interaction.customId === "bracket:back") {
      await update(interaction, home());
      return true;
    }
    await interaction.reply({ content: "This bracket menu is outdated. Run /bracket again.", ephemeral: true });
    return true;
  }

  if (interaction.customId === "bracket:staff_select") {
    if (!(access.isStaff || access.isAdmin || access.isMurph)) {
      await interaction.reply({ content: "You do not have permission to use this action.", ephemeral: true });
      return true;
    }
    await update(interaction, await buildBracketStaffToolPanel(interaction.guildId, interaction.values[0]));
    return true;
  }

  if (!interaction.customId.startsWith("bracket:menu:")) {
    await interaction.reply({ content: "This bracket menu is outdated. Run /bracket again.", ephemeral: true });
    return true;
  }

  const selected = interaction.values[0];
  if (selected === "live") await update(interaction, await buildViewerTournamentSummaryPanel(interaction.guildId));
  else if (selected === "standings") {
    await interaction.deferUpdate();
    await interaction.editReply(await buildViewerStandingsPanel());
  }
  else if (selected === "status") await update(interaction, await buildViewerTournamentSummaryPanel(interaction.guildId, "Murph Tournaments Status"));
  else if (selected === "info") await update(interaction, buildInfoPanel());
  else if (selected === "register") {
    await interaction.deferUpdate();
    await interaction.editReply(await buildRegisterPanel(interaction.guildId));
  }
  else if (selected === "my_team") await update(interaction, buildWebsiteTeamLookupUnavailablePanel());
  else if (selected === "team_tools" && access.isTeamLeader) await update(interaction, await buildBracketTeamPanel(interaction.user.id, interaction.guildId, interaction.member.roles));
  else if (selected === "staff_tools" && (access.isStaff || access.isAdmin || access.isMurph)) await update(interaction, buildStaffToolsPanel());
  else if (selected === "murph_tools" && access.isMurph) await update(interaction, await buildMurphToolsPanel(interaction.guildId));
  else await interaction.reply({ content: "This option is not available for your roles. Run /bracket again if your roles changed.", ephemeral: true });
  return true;
}
