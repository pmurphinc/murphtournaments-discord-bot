import assert from "node:assert/strict";
import { getBracketMenuItems, buildViewerTournamentSummaryPanelFromInstances } from "./bracketPanel";
import { evaluateConfiguredRoleAccess } from "./permissions";

function runTest(name: string, fn: () => void | Promise<void>) {
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

runTest("Coach only gets viewer menu options", () => {
  const items = getBracketMenuItems({ isMurph: false, isStaff: false, isAdmin: false, isTeamLeader: false });
  assert.equal(items.includes("Team Leader Tools"), false);
  assert.equal(items.includes("Staff Tools"), false);
  assert.equal(items.includes("Murph Tools"), false);
});

runTest("Team Leader gets team tools but not staff tools", () => {
  const items = getBracketMenuItems({ isMurph: false, isStaff: false, isAdmin: false, isTeamLeader: true });
  assert.equal(items.includes("Team Leader Tools"), true);
  assert.equal(items.includes("Staff Tools"), false);
});

runTest("Staff and ADMIN get staff tools", () => {
  assert.equal(getBracketMenuItems({ isMurph: false, isStaff: true, isAdmin: true, isTeamLeader: false }).includes("Staff Tools"), true);
  assert.equal(getBracketMenuItems({ isMurph: false, isStaff: false, isAdmin: true, isTeamLeader: false }).includes("Staff Tools"), true);
});

runTest("Murph gets staff tools plus Murph tools", () => {
  const items = getBracketMenuItems({ isMurph: true, isStaff: false, isAdmin: false, isTeamLeader: false });
  assert.equal(items.includes("Staff Tools"), true);
  assert.equal(items.includes("Murph Tools"), true);
});

runTest("Staff role resolution works from STAFF_ROLE_ID and Staff fallback", () => {
  assert.deepEqual(evaluateConfiguredRoleAccess({ roleIds: new Set(["staff-id"]), staffRoleId: "staff-id", roleNames: [] }), { isAdmin: true, isStaff: true, isFounder: false });
  assert.deepEqual(evaluateConfiguredRoleAccess({ roleIds: new Set(), staffRoleId: null, roleNames: ["Staff"] }), { isAdmin: true, isStaff: true, isFounder: false });
});

runTest("Existing Founder/Admin compatibility remains intact", () => {
  assert.equal(evaluateConfiguredRoleAccess({ roleIds: new Set(), roleNames: ["Founder"] }).isFounder, true);
  assert.equal(evaluateConfiguredRoleAccess({ roleIds: new Set(), roleNames: ["Admin"] }).isAdmin, true);
  assert.equal(evaluateConfiguredRoleAccess({ roleIds: new Set(), roleNames: ["Murph"] }).isFounder, true);
});

runTest("Viewer/status panels do not expose admin action buttons", async () => {
  const panel = buildViewerTournamentSummaryPanelFromInstances([], "Murph Tournaments Status");
  const customIds = JSON.stringify(panel.components ?? []);
  assert.equal(customIds.includes("admin:"), false);
  assert.equal(customIds.includes("tournament:"), false);
});
