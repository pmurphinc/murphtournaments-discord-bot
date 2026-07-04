function readOptionalEnv(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  return env[name]?.trim() || null;
}

export function getBotDisplayName(env: NodeJS.ProcessEnv = process.env): string {
  return readOptionalEnv("BOT_DISPLAY_NAME", env) ?? "Murph Tournaments";
}

export function getTeamSetupAuditReasonPrefix(env: NodeJS.ProcessEnv = process.env): string {
  return readOptionalEnv("TEAM_SETUP_AUDIT_REASON_PREFIX", env) ?? "Murph Tournaments team setup";
}

export function buildTeamSetupAuditReason(
  teamName: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  return `${getTeamSetupAuditReasonPrefix(env)} for ${teamName}`;
}

export function parseCommunityVoiceCategoryMap(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const rawValue = readOptionalEnv("COMMUNITY_VOICE_CATEGORY_MAP", env);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn("[branding] COMMUNITY_VOICE_CATEGORY_MAP must be a JSON object.");
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : ""])
        .filter(([key, value]) => Boolean(key && value))
    );
  } catch (error) {
    console.warn(
      "[branding] Failed to parse COMMUNITY_VOICE_CATEGORY_MAP as JSON.",
      error
    );
    return {};
  }
}

export function resolveCommunityVoiceCategoryName(
  communityOrSourceLabel: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const label = communityOrSourceLabel?.trim() || null;
  const configuredMap = parseCommunityVoiceCategoryMap(env);

  if (label && configuredMap[label]) {
    return configuredMap[label];
  }

  const genericCategoryName = readOptionalEnv("TEAM_VOICE_CATEGORY_NAME", env);
  if (genericCategoryName) {
    return genericCategoryName;
  }

  if (label === "Murph Tournament Community") {
    return readOptionalEnv("MY_DIVISION_VOICE_CATEGORY_NAME", env) ?? "Murphs Division";
  }

  if (label === "7th Circle") {
    return (
      readOptionalEnv("SEVENTH_CIRCLE_DIVISION_VOICE_CATEGORY_NAME", env) ??
      "7th Circle Division"
    );
  }

  return null;
}
