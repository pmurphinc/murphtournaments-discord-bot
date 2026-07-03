import assert from "node:assert/strict";
import {
  DEFAULT_REGISTRATION_FORM_URL,
  buildTeamSetupAuditReason,
  getBotDisplayName,
  getRegistrationFormLabel,
  getRegistrationFormUrl,
  getTeamSetupAuditReasonPrefix,
  parseCommunityVoiceCategoryMap,
  resolveCommunityVoiceCategoryName,
} from "./branding";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("branding helper returns safe defaults", () => {
  const env = {} as NodeJS.ProcessEnv;

  assert.equal(getBotDisplayName(env), "Murph Tournaments");
  assert.equal(getRegistrationFormUrl(env), DEFAULT_REGISTRATION_FORM_URL);
  assert.equal(getRegistrationFormLabel(env), "Murph Tournaments Registration");
  assert.equal(getTeamSetupAuditReasonPrefix(env), "Murph Tournaments team setup");
  assert.equal(buildTeamSetupAuditReason("Alpha", env), "Murph Tournaments team setup for Alpha");
});

runTest("branding helper uses configured values", () => {
  const env = {
    BOT_DISPLAY_NAME: "Custom Bot",
    REGISTRATION_FORM_URL: "https://example.test/register",
    REGISTRATION_FORM_LABEL: "Custom Registration",
    TEAM_SETUP_AUDIT_REASON_PREFIX: "Custom setup",
  } as NodeJS.ProcessEnv;

  assert.equal(getBotDisplayName(env), "Custom Bot");
  assert.equal(getRegistrationFormUrl(env), "https://example.test/register");
  assert.equal(getRegistrationFormLabel(env), "Custom Registration");
  assert.equal(buildTeamSetupAuditReason("Bravo", env), "Custom setup for Bravo");
});

runTest("community voice category map ignores invalid entries safely", () => {
  const env = {
    COMMUNITY_VOICE_CATEGORY_MAP: JSON.stringify({
      Alpha: "Alpha Category",
      Empty: "  ",
      NonString: 42,
    }),
  } as NodeJS.ProcessEnv;

  assert.deepEqual(parseCommunityVoiceCategoryMap(env), { Alpha: "Alpha Category" });
});

runTest("category resolution prefers community map over generic category", () => {
  const env = {
    COMMUNITY_VOICE_CATEGORY_MAP: JSON.stringify({
      "Murph Tournament Community": "Mapped Murph Category",
    }),
    TEAM_VOICE_CATEGORY_NAME: "Generic Category",
  } as NodeJS.ProcessEnv;

  assert.equal(
    resolveCommunityVoiceCategoryName("Murph Tournament Community", env),
    "Mapped Murph Category"
  );
});

runTest("category resolution prefers generic category over legacy fallbacks", () => {
  const env = {
    TEAM_VOICE_CATEGORY_NAME: "Generic Category",
    MY_DIVISION_VOICE_CATEGORY_NAME: "Legacy Murph Category",
    SEVENTH_CIRCLE_DIVISION_VOICE_CATEGORY_NAME: "Legacy 7th Category",
  } as NodeJS.ProcessEnv;

  assert.equal(
    resolveCommunityVoiceCategoryName("Murph Tournament Community", env),
    "Generic Category"
  );
  assert.equal(resolveCommunityVoiceCategoryName("7th Circle", env), "Generic Category");
});

runTest("category resolution preserves legacy aliases and fallbacks", () => {
  assert.equal(
    resolveCommunityVoiceCategoryName("Murph Tournament Community", {} as NodeJS.ProcessEnv),
    "Murphs Division"
  );
  assert.equal(
    resolveCommunityVoiceCategoryName("7th Circle", {} as NodeJS.ProcessEnv),
    "7th Circle Division"
  );

  const env = {
    MY_DIVISION_VOICE_CATEGORY_NAME: "Legacy Murph Category",
    SEVENTH_CIRCLE_DIVISION_VOICE_CATEGORY_NAME: "Legacy 7th Category",
  } as NodeJS.ProcessEnv;

  assert.equal(
    resolveCommunityVoiceCategoryName("Murph Tournament Community", env),
    "Legacy Murph Category"
  );
  assert.equal(resolveCommunityVoiceCategoryName("7th Circle", env), "Legacy 7th Category");
});
