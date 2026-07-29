import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Deterministic Sleeper model tests
await import(pathToFileURL(new URL("../sleeper-model.js", import.meta.url).pathname));
const { buildSleeperProfile, SLEEPER_SCORE_WEIGHTS, targetTypeMatches } = globalThis.FDLSleeperModel;

const context = Object.freeze({
  analysisDate: "2026-07-28",
  teams: 12,
  currentPick: 80,
  league: {
    teams: 12,
    scoringSettings: { reception: 1, passTd: 4, teReceptionBonus: 0.5 },
    roster: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 2 },
  },
  rosterCounts: { QB: 1, RB: 2, WR: 2, TE: 0 },
  survivalToNextPick: 0.31,
  roomPressure: 64,
});

const sum = Object.values(SLEEPER_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
assert.equal(sum, 1, "Sleeper Score weights must sum to 1");
assert.deepEqual(SLEEPER_SCORE_WEIGHTS, {
  priceEdge: 0.25,
  opportunityPath: 0.25,
  talentSignal: 0.2,
  ceilingCatalyst: 0.15,
  leagueFit: 0.1,
  roomTiming: 0.05,
});

const completeWr = {
  id: "wr-complete",
  name: "Structured Test WR",
  position: "WR",
  rank: 94,
  consensusRank: 94,
  adp: 118,
  age: 23,
  yearsExperience: 1,
  nflDraftRound: 2,
  nflDraftPick: 44,
  prospectScore: 78,
  routeParticipation: 0.76,
  targetShare: 0.23,
  targetsPerRoute: 0.25,
  yardsPerRoute: 2.1,
  airYardsShare: 0.28,
  firstReadShare: 0.27,
  redZoneTargetShare: 0.18,
  projectedOpportunityShare: 0.68,
  roleCertainty: 72,
  offenseEnvironmentScore: 70,
  depthChartBlockers: 1,
  depthChartBlockerStrength: 35,
  adpSampleSize: 1250,
  adp7DayChange: 4,
  adp30DayChange: 8,
  adpDate: "2026-07-23",
  dataUpdatedAt: "2026-07-24",
  roleSource: "uploaded",
  roleConfidence: "High",
  uploadedRole: "Starting three-wide receiver",
};

const first = buildSleeperProfile(completeWr, context);
const second = buildSleeperProfile(structuredClone(completeWr), structuredClone(context));
assert.deepEqual(first, second, "Identical data must produce identical profiles");
assert.equal(Object.isFrozen(first), true, "Profile should be immutable");
assert.equal(first.isSleeper, true, "Strong structured non-price evidence should qualify");
assert.ok(first.confidenceScore >= 70, "Complete fresh uploaded data should yield high confidence");
assert.equal(first.roleSource, "uploaded");
assert.equal(first.roleConfidence, "High");
assert.ok(first.evidence.some((e) => e.label === "Target earning"));
assert.ok(first.targetRound >= 1 && first.latestSafePick >= first.earliestReasonablePick);

const missing = buildSleeperProfile({ name: "Unknown Metrics", position: "WR", rank: 100, adp: 160 }, context);
assert.equal(typeof missing.sleeperScore, "number");
assert.equal(missing.isSleeper, false, "Late ADP alone must not qualify");
assert.equal(missing.confidenceLabel, "Low");
assert.equal(missing.roleSource, "ranking inference");
assert.match(missing.currentRole, /^Ranking-inferred/);
assert.ok(missing.failureReasons.length > 0);
assert.ok(missing.evidence.some((e) => e.label === "Late ADP is insufficient"));

const rankOnlyRb = buildSleeperProfile({
  name: "Ranking-Only RB", position: "RB", rank: 13, consensusRank: 13, adp: 14.5,
  depthChartRank: 1, roleSource: "ranking inference", roleConfidence: "Low",
}, context);
assert.equal(rankOnlyRb.isSleeper, false, "A ranking-inferred RB role must not qualify without structured opportunity evidence");
assert.ok(rankOnlyRb.contingentValueScore <= 50, "Sparse role inputs must retain a neutral prior instead of reweighting to 100");
assert.equal(rankOnlyRb.roleSource, "ranking inference");

const badInput = buildSleeperProfile(null, {});
for (const key of ["sleeperScore", "priceEdgeScore", "opportunityPathScore", "confidenceScore"]) {
  assert.ok(Number.isFinite(badInput[key]), `${key} must remain finite with missing input`);
}

const weakWr = buildSleeperProfile({ ...completeWr, id: "weak", routeParticipation: 0.25, targetShare: 0.08, targetsPerRoute: 0.08, yardsPerRoute: 0.6, airYardsShare: 0.08, firstReadShare: 0.07, redZoneTargetShare: 0.03, projectedOpportunityShare: 0.22 }, context);
assert.ok(first.opportunityPathScore > weakWr.opportunityPathScore + 20, "WR opportunity module must respond to structured route/target inputs");
assert.ok(first.talentSignalScore > weakWr.talentSignalScore + 15, "WR talent module must respond to TPRR/YPRR and related inputs");

const crowdedWr = buildSleeperProfile({ ...completeWr, id: "crowded", offenseEnvironmentScore: 28, depthChartBlockers: 4, depthChartBlockerStrength: 90 }, context);
assert.ok(first.opportunityPathScore > crowdedWr.opportunityPathScore + 8, "WR opportunity must account for depth-chart competition and passing environment");
assert.ok(first.ceilingCatalystScore > crowdedWr.ceilingCatalystScore + 4, "WR ceiling must account for projected passing environment");

const rb = buildSleeperProfile({
  name: "Contingent RB", position: "RB", rank: 120, adp: 142, age: 24, yearsExperience: 2,
  snapShare: 0.36, carryShare: 0.31, routeParticipation: 0.44, targetShare: 0.11,
  weightedOpportunity: 0.48, goalLineShare: 0.22, projectedOpportunityShare: 0.82,
  standaloneRoleScore: 58, contingentRoleScore: 88, depthChartBlockers: 1,
  prospectScore: 72, roleCertainty: 62, dataUpdatedAt: "2026-07-20", roleSource: "Sleeper player data", roleConfidence: "Moderate",
}, context);
assert.ok(rb.contingentValueScore > rb.standaloneValueScore);
assert.equal(targetTypeMatches(rb, "contingent"), true);

const openDepthRb = buildSleeperProfile({
  name: "Open Depth RB", position: "RB", rank: 125, adp: 150, projectedOpportunityShare: 0.78,
  goalLineShare: 0.35, roleCertainty: 60, depthChartBlockers: 1, depthChartBlockerStrength: 25,
  roleSource: "uploaded", roleConfidence: "Moderate",
}, context);
const blockedDepthRb = buildSleeperProfile({
  name: "Blocked Depth RB", position: "RB", rank: 125, adp: 150, projectedOpportunityShare: 0.78,
  goalLineShare: 0.35, roleCertainty: 60, depthChartBlockers: 4, depthChartBlockerStrength: 92,
  roleSource: "uploaded", roleConfidence: "Moderate",
}, context);
assert.ok(openDepthRb.contingentValueScore > blockedDepthRb.contingentValueScore + 10, "RB contingent value must reflect blocker count and strength");

const qb = buildSleeperProfile({
  name: "Rushing QB", position: "QB", rank: 125, adp: 145, rushingAttempts: 105,
  designedRushingAttempts: 66, scrambleRate: 0.11, passingJobSecurity: 78, passingVolume: 515,
  offenseEnvironmentScore: 68, prospectScore: 74, roleSource: "manual", roleConfidence: "High",
  dataUpdatedAt: "2026-07-25",
}, { ...context, superflex: true });
assert.equal(qb.archetype, "Rushing QB");
assert.ok(qb.leagueFitScore >= 60);

const te = buildSleeperProfile({
  name: "Route TE", position: "TE", rank: 118, adp: 138, routeParticipation: 0.78,
  targetShare: 0.17, targetsPerRoute: 0.19, yardsPerRoute: 1.55, slotRate: 0.41,
  blockingRate: 0.24, redZoneTargetShare: 0.22, projectedOpportunityShare: 0.70,
  depthChartBlockers: 0, depthChartBlockerStrength: 10,
  roleSource: "uploaded", roleConfidence: "High", dataUpdatedAt: "2026-07-22",
}, context);
assert.ok(["Full-route TE", "Red-zone TE", "League-specific scoring sleeper"].includes(te.archetype));
assert.ok(te.leagueFitScore >= 50, "TE premium should preserve or improve fit");

const blockedTe = buildSleeperProfile({
  name: "Blocked TE", position: "TE", rank: 118, adp: 138, routeParticipation: 0.78,
  targetShare: 0.17, targetsPerRoute: 0.19, yardsPerRoute: 1.55, slotRate: 0.41,
  blockingRate: 0.24, redZoneTargetShare: 0.22, projectedOpportunityShare: 0.70,
  depthChartBlockers: 4, depthChartBlockerStrength: 90, roleSource: "uploaded", roleConfidence: "High",
}, context);
assert.ok(te.opportunityPathScore > blockedTe.opportunityPathScore + 6, "TE opportunity must account for receiving-role competition");

const redundantContext = { ...context, rosterCounts: { QB: 3, RB: 2, WR: 2, TE: 0 } };
const redundantQb = buildSleeperProfile({
  name: "Redundant QB", position: "QB", rank: 110, adp: 140, rushingAttempts: 110,
  designedRushingAttempts: 70, scrambleRate: 0.12, passingJobSecurity: 90, passingVolume: 560,
  offenseEnvironmentScore: 75, prospectScore: 80, roleSource: "uploaded", roleConfidence: "High",
  dataUpdatedAt: "2026-07-26",
}, redundantContext);
assert.ok(redundantQb.rosterRedundancyPenalty >= 20);
assert.equal(redundantQb.primaryBlocker, "Severe roster redundancy at the position");

assert.equal(targetTypeMatches(first, "market_faller"), true);
assert.equal(targetTypeMatches(first, "not_supported"), false);

console.log("validate.mjs: deterministic Sleeper model assertions passed");

// Runtime, UI, assistant and integration contracts
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const app = read("app.js");
const lab = read("sleeper-lab.js");
const model = read("sleeper-model.js");
const html = read("index.html");
const assistantEndpoint = read("api/draft-assistant.js");
const tools = assistantEndpoint;
const instructions = assistantEndpoint;
const css = read("styles.css");

const functionBody = (source, name) => {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`Unable to parse ${name}`);
};

const youngBody = functionBody(app, "isYoungUpsidePlayer");
assert.doesNotMatch(youngBody, /\.name|playerNames?|[A-Z][a-z]+\|[A-Z][a-z]+/, "isYoungUpsidePlayer cannot contain player-name logic");

const legacyScoreBody = functionBody(app, "sleeperCandidateScore");
assert.doesNotMatch(legacyScoreBody, /recommendationScore\s*\+\s*marketDelay|marketDelay/, "legacy sleeper score formula must be removed");

const legacyCandidateBody = functionBody(app, "isSleeperCandidate");
assert.doesNotMatch(legacyCandidateBody, /upside|competition|breakout|\brole\b/i, "broad keyword sleeper qualification must be removed");

for (const field of [
  "sleeperScore", "priceEdgeScore", "opportunityPathScore", "talentSignalScore", "ceilingCatalystScore",
  "leagueFitScore", "roomTimingScore", "confidenceScore", "confidenceLabel", "currentRole", "ceilingRole",
  "standaloneValueScore", "contingentValueScore", "catalystType", "catalystDescription", "primaryBlocker",
  "failureReasons", "archetype", "targetRound", "earliestReasonablePick", "latestSafePick", "survivalToNextPick",
  "roomThreats", "evidence", "missingData", "dataFreshness",
]) assert.match(model, new RegExp(`\\b${field}\\b`), `profile field ${field} must exist`);

for (const label of [
  "Sleeper Board", "Player sleeper-profile detail", "Archetype filters", "Position and ADP filters",
  "Confidence and data-freshness filters", "Watch list and flagged targets", "Sleeper portfolio builder",
  "Draft-window planner", "Market movers", "Sleeper model explanation",
]) assert.ok(html.includes(label), `Sleeper Lab workspace must include ${label}`);

for (const prompt of [
  "Who are my best sleeper targets?", "Which sleeper can help immediately?", "Who has the best contingent upside?",
  "Which sleeper fits my roster?", "When should I take this sleeper?", "What could make this sleeper fail?",
]) assert.ok(html.includes(prompt), `Assistant quick prompt missing: ${prompt}`);

assert.match(tools, /get_sleeper_targets/);
for (const arg of ["positions", "minimumScore", "minimumAdp", "maximumAdp", "targetType", "limit"]) assert.match(tools, new RegExp(`\\b${arg}\\b`));
for (const type of ["all", "standalone", "contingent", "breakout", "deep_stash", "market_faller", "league_specific"]) assert.ok(tools.includes(type));
assert.match(instructions, /cannot modify[^\n]*Sleeper Scores/i);
assert.match(instructions, /cannot draft|never draft|does not draft|No automatic drafting/i);
assert.match(lab, /name === ["']get_sleeper_targets["']/);
assert.match(lab, /fantasyDraftLabSleeperLabV1/);
assert.match(lab, /escapeHtml\(/, "new UI text must use existing escaping");
assert.match(css, /@media\s*\(max-width:\s*720px\)/);
assert.match(css, /min-width:\s*0/);

assert.doesNotMatch(assistantEndpoint, /\.\.\/server\//, "consolidated assistant endpoint must not depend on removed server modules");

for (const integration of [
  "originalRenderAvailable", "originalRenderRecommendations", "originalOpenPlayerDetail", "originalCheatSheetPlayers",
  "originalRenderCheatSheet", "originalBuildDraftPlanPriority", "originalAggregateCandidateOutcome",
  "originalAssistantPlayerRecord", "originalAssistantCompactContextSummary", "originalRunDraftAssistantTool",
  "originalLocalAssistantResponse", "originalSaveCompletedDraft", "originalPostDraftProcessGrade",
  "originalBulkPriorityCsv", "originalBulkAllPicksCsv",
]) assert.ok(lab.includes(integration), `Sleeper integration missing: ${integration}`);
assert.ok(html.includes('<option value="SLEEPER">Qualified Sleeper Lab targets</option>'));
assert.ok(html.includes('<option value="sleeper">Sleeper Score</option>'));
assert.match(lab, /Math\.min\(6, \(p\.sleeperScore - 55\)/, "Draft Plan sleeper boost must remain capped");
assert.match(lab, /p\.rosterRedundancyPenalty < 20/, "Severe roster redundancy must block Draft Plan sleeper boost");
assert.match(lab, /strictNullableToolNumber/);
assert.match(lab, /minimumAdp cannot exceed maximumAdp/);
assert.match(lab, /if \(!p\.isSleeper\) return false;/, "Assistant sleeper targets must return qualified profiles only");
assert.match(lab, /sleeperAtPick/, "Draft-time Sleeper Score snapshots must be retained");

assert.ok(html.indexOf("sleeper-model.js") < html.indexOf("app.js"));
assert.ok(html.indexOf("app.js") < html.indexOf("sleeper-lab.js"));

assert.match(app, /const BULK_DEPTH_PRESETS = \{ quick: 10, standard: 25, deep: 50 \}/, "Bulk presets must remain high-confidence");
assert.match(app, /const SIMULATOR_SCHEMA_VERSION = 5;/, "Simulator schema must migrate legacy preset counts");
assert.match(app, /maxScheduledRuns: constrained \? 225 : highCapacity \? 720 : 450/, "Device-aware high-confidence caps are missing");
assert.match(app, /const legacyPresets = \{ quick: 3, standard: 6, deep: 10 \}/, "Legacy preset migration is missing");
assert.match(app, /const BULK_WORKER_TIMEOUT_MS = 4000/, "Season worker failover must remain bounded");
assert.doesNotMatch(app, /\}, 20000\);/, "Bulk worker cannot reintroduce repeated 20-second waits");
assert.match(app, /function bulkPickTrace\(/, "Bulk runs must use compact pick traces");
assert.match(app, /function bulkRunPicks\(/, "Replay and exports must reconstruct compact pick traces");
assert.match(functionBody(app, "startBulkSimulations"), /const batchSize = 1;/, "Bulk simulation must yield between individual drafts");
assert.match(app, /async function summarizeBulkResultsAsync\(/, "Draft Plan finalization must be asynchronous");
assert.match(app, /async function deriveSimulationSurvivalAsync\(/, "Survival finalization must yield between run batches");
assert.match(app, /async function buildDraftPlanPriorityAsync\(/, "Priority finalization must yield between player batches");
assert.match(app, /fallbackDraftPlan\(/, "Completed simulations must produce a fallback plan instead of remaining stuck");
assert.ok(html.includes("Quick — 10 per strategy"));
assert.ok(html.includes("Standard — 25 per strategy"));
assert.ok(html.includes("Deep — 50 per strategy"));

console.log("validate.mjs: source and safety contract assertions passed");

console.log("validate.mjs: all assertions passed");
