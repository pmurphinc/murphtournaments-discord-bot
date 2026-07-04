import { TournamentInstanceStatus } from "@prisma/client";
import {
  listTournamentInstancesForGuild,
  syncTournamentInstancesForGuild,
} from "../storage/tournamentInstances";

const DEFAULT_WEBSITE_ORIGIN = "https://murphtournaments.com";

export const REGISTRATION_CLOSED_MESSAGE =
  "Registration is not currently open. Check murphtournaments.com for the next event.";

export interface ActiveRegistrationLink {
  url: string;
  label: string;
  tournamentName: string;
}

function normalizeOrigin(rawUrl: string | undefined): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return DEFAULT_WEBSITE_ORIGIN;

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    console.warn("[registration-website] Ignoring invalid TOURNAMENT_WEBHOOK_URL while resolving website origin.");
    return DEFAULT_WEBSITE_ORIGIN;
  }
}

export function getTournamentWebsiteOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return normalizeOrigin(env.TOURNAMENT_WEBHOOK_URL);
}

export function buildPublicTournamentUrl(tournamentId: number | string, env: NodeJS.ProcessEnv = process.env): string {
  const origin = getTournamentWebsiteOrigin(env);
  return `${origin}/tournaments/${encodeURIComponent(`${tournamentId}`)}`;
}

export async function getActiveRegistrationLink(guildId: string): Promise<ActiveRegistrationLink | null> {
  try {
    await syncTournamentInstancesForGuild(guildId);
    const instances = await listTournamentInstancesForGuild(guildId);
    const activeRegistration = instances.find(
      (instance) => instance.status === TournamentInstanceStatus.REGISTRATION_READY
    );

    if (!activeRegistration) return null;

    return {
      url: buildPublicTournamentUrl(activeRegistration.id),
      label: "Open Tournament Registration",
      tournamentName: activeRegistration.displayName ?? activeRegistration.name,
    };
  } catch (error) {
    console.error(
      "[registration-website] Failed to resolve active registration tournament; treating registration as closed.",
      error
    );
    return null;
  }
}
