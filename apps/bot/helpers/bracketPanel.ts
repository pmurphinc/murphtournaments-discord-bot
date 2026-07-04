import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMemberRoleManager,
  StringSelectMenuBuilder,
} from "discord.js";
import { getActiveRegistrationLink, REGISTRATION_CLOSED_MESSAGE } from "../services/registrationWebsite";
import { buildTeamPanel } from "./teamPanel";
import { getStandings } from "../storage/standings";
import { listTournamentInstancesForGuild, syncTournamentInstancesForGuild, getTournamentInstanceLabel } from "../storage/tournamentInstances";
import { buildAdminInstancePicker, buildAdminPanel } from "./adminPanel";
import { buildReviewQueue, buildApprovedSetupRecoveryPanel } from "./reviewPanel";
import { buildReportsPanel } from "./reportsPanel";

export interface BracketRoleAccess {
  isMurph: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isTeamLeader: boolean;
}

export function getBracketMenuItems(access: BracketRoleAccess): string[] {
  const items = [
    "Live Bracket",
    "Standings",
    "Tournament Status",
    "Tournament Info",
    "Register",
    "My Team",
  ];
  if (access.isTeamLeader) items.push("Team Leader Tools");
  if (access.isStaff || access.isAdmin || access.isMurph) items.push("Staff Tools");
  if (access.isMurph) items.push("Murph Tools");
  return items;
}

export function buildBracketHomePanel(access: BracketRoleAccess) {
  const embed = new EmbedBuilder()
    .setTitle("Murph Tournaments Bracket Menu")
    .setDescription("Choose a private tournament view or tool.")
    .addFields({ name: "Available Options", value: getBracketMenuItems(access).map((item) => `• ${item}`).join("\n") });

  const options = [
    ["live", "Live Bracket"], ["standings", "Standings"], ["status", "Tournament Status"], ["info", "Tournament Info"],
    ["register", "Register"], ["my_team", "My Team"],
  ];
  if (access.isTeamLeader) options.push(["team_tools", "Team Leader Tools"]);
  if (access.isStaff || access.isAdmin || access.isMurph) options.push(["staff_tools", "Staff Tools"]);
  if (access.isMurph) options.push(["murph_tools", "Murph Tools"]);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`bracket:menu:${Date.now()}`)
    .setPlaceholder("Open a bracket menu view")
    .addOptions(options.map(([value, label]) => ({ label, value })));

  return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] };
}

export function buildBracketNavigationRow(includeBack = true) {
  const buttons: ButtonBuilder[] = [new ButtonBuilder().setCustomId("bracket:home").setLabel("Home").setStyle(ButtonStyle.Secondary)];
  if (includeBack) buttons.unshift(new ButtonBuilder().setCustomId("bracket:back").setLabel("Back").setStyle(ButtonStyle.Secondary));
  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

function withNavigation(panel: any) {
  return { ...panel, components: [...(panel.components ?? []), buildBracketNavigationRow()] };
}

export async function buildViewerStandingsPanel() {
  try {
    const standings = await getStandings();
    return withNavigation({ embeds: [new EmbedBuilder().setTitle("Murph Tournaments Standings").setDescription(standings.length ? standings.map((s, i) => `${i + 1}. ${s.teamName} (${s.tournamentInstanceName ?? "Unassigned"}) - ${s.frp} FRP`).join("\n") : "No standings available.")] });
  } catch (error) {
    console.error("[bracket-standings] Failed to load standings:", error);
    return withNavigation({ embeds: [new EmbedBuilder().setTitle("Murph Tournaments Standings").setDescription("Standings are not available yet.")] });
  }
}

export async function buildViewerTournamentSummaryPanel(guildId: string, title = "Murph Tournaments Live Bracket") {
  await syncTournamentInstancesForGuild(guildId);
  const instances = await listTournamentInstancesForGuild(guildId);
  return buildViewerTournamentSummaryPanelFromInstances(instances, title);
}

export function buildViewerTournamentSummaryPanelFromInstances(instances: Array<{ status: string; currentStage: string | null; currentCycle: number | null; [key: string]: any }>, title = "Murph Tournaments Live Bracket") {
  return withNavigation({ embeds: [new EmbedBuilder().setTitle(title).setDescription(instances.length ? instances.slice(0, 10).map((i) => `• ${getTournamentInstanceLabel(i as any)} — ${i.status} — ${i.currentStage ?? "Registration"}${i.currentCycle ? ` cycle ${i.currentCycle}` : ""}`).join("\n") : "No active tournament instances are available yet.")] });
}

export async function buildRegisterPanel(guildId: string) {
  const link = await getActiveRegistrationLink(guildId);

  if (!link) {
    return withNavigation({
      embeds: [
        new EmbedBuilder()
          .setTitle("Murph Tournaments Registration")
          .setDescription(REGISTRATION_CLOSED_MESSAGE),
      ],
    });
  }

  return withNavigation({
    embeds: [
      new EmbedBuilder()
        .setTitle("Murph Tournaments Registration")
        .setDescription(`Register for ${link.tournamentName} on the Murph Tournaments website.\n\n${link.url}`),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel(link.label).setStyle(ButtonStyle.Link).setURL(link.url)
      ),
    ],
  });
}

export function buildInfoPanel() {
  return withNavigation({ embeds: [new EmbedBuilder().setTitle("Murph Tournaments Info").setDescription("Use this private menu for bracket views, standings, registration, team status, and permitted tournament tools.")] });
}

export function buildWebsiteTeamLookupUnavailablePanel() {
  return withNavigation({
    embeds: [
      new EmbedBuilder()
        .setTitle("Murph Tournaments Team Panel")
        .setDescription("Team lookup is not connected to the Murph Tournaments website yet."),
    ],
  });
}

export async function buildBracketTeamPanel(userId: string, guildId: string, roles?: GuildMemberRoleManager) {
  return withNavigation(await buildTeamPanel(userId, guildId, roles));
}

export function buildStaffToolsPanel() {
  const menu = new StringSelectMenuBuilder().setCustomId("bracket:staff_select").setPlaceholder("Choose a staff tool").addOptions([
    { label: "Tournament Control", value: "tournament_control" },
    { label: "Registration Review", value: "registration_review" },
    { label: "Reports / Result Review", value: "reports" },
    { label: "Team Management", value: "team_management" },
    { label: "Team Discord Setup", value: "team_discord_setup" },
  ]);
  return withNavigation({ embeds: [new EmbedBuilder().setTitle("Staff Tools").setDescription("Staff/admin tournament operations.")], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] });
}

export async function buildBracketStaffToolPanel(guildId: string, tool: string) {
  if (tool === "tournament_control") return withNavigation(await buildAdminInstancePicker(guildId, "tournament_instance_select"));
  if (tool === "registration_review") return withNavigation(await buildReviewQueue("pending"));
  if (tool === "reports") return withNavigation(await buildReportsPanel("pending"));
  if (tool === "team_discord_setup") return withNavigation(await buildApprovedSetupRecoveryPanel({ guildId }));
  return withNavigation(await buildAdminInstancePicker(guildId, "admin_team_select"));
}

export async function buildMurphToolsPanel(guildId: string) {
  return withNavigation(await buildAdminPanel(guildId));
}
