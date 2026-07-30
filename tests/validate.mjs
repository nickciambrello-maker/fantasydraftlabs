import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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
assert.ok(!missing.evidence.some((e) => e.label === "Value breakout qualification"), "Sparse inputs must not receive the value-breakout qualification");

const rankOnlyRb = buildSleeperProfile({
  name: "Ranking-Only RB", position: "RB", rank: 13, consensusRank: 13, adp: 14.5,
  depthChartRank: 1, roleSource: "ranking inference", roleConfidence: "Low",
}, context);
assert.equal(rankOnlyRb.isSleeper, false, "A ranking-inferred RB role must not qualify without structured opportunity evidence");
assert.ok(rankOnlyRb.contingentValueScore <= 50, "Sparse role inputs must retain a neutral prior instead of reweighting to 100");
assert.equal(rankOnlyRb.roleSource, "ranking inference");

const premiumGuard = buildSleeperProfile({ ...completeWr, id: "premium", rank: 1, consensusRank: 1, adp: 9, marketTier: 2, tier: 1 }, context);
assert.equal(premiumGuard.isSleeper, false, "First-round players must never receive the sleeper/value-breakout label");
assert.ok(premiumGuard.evidence.some((e) => e.label === "Premium-player guardrail"));

const tierPromotion = buildSleeperProfile({ ...completeWr, id: "tier-promotion", rank: 55, consensusRank: 55, adp: 67, marketTier: 4, tier: 3 }, context);
assert.equal(tierPromotion.tierPromotion, true, "A full market-to-Lab tier promotion must satisfy the value gate");
assert.equal(tierPromotion.isSleeper, true, "A full tier promotion plus strong structured evidence should qualify");

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

assert.ok(!html.includes('data-panel-tab="sleeper-lab"'), "The standalone Sleeper Lab tab must be removed");
assert.ok(!html.includes('data-panel="sleeper-lab"'), "The standalone Sleeper Lab workspace must be removed");
assert.ok(!html.includes('data-panel-tab="personas"'), "The standalone Personas tab must be removed");
assert.ok(html.includes('class="league-persona-section"'), "Personas must be embedded in League Settings");
assert.ok(html.includes("Which players have a true two-round ADP edge or a full-tier projection promotion?"), "Value-breakout assistant prompt missing");

assert.match(tools, /get_sleeper_targets/);
for (const arg of ["positions", "minimumScore", "minimumAdp", "maximumAdp", "targetType", "limit"]) assert.match(tools, new RegExp(`\\b${arg}\\b`));
for (const type of ["all", "standalone", "contingent", "breakout", "deep_stash", "market_faller", "league_specific"]) assert.ok(tools.includes(type));
assert.match(instructions, /cannot modify[^\n]*value-breakout scores/i);
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
assert.ok(html.includes('<option value="SLEEPER">ADP / tier breakout targets</option>'));
assert.ok(html.includes('<option value="sleeper">Breakout signal</option>'));
assert.match(lab, /Math\.min\(6, \(p\.sleeperScore - 55\)/, "Draft Plan sleeper boost must remain capped");
assert.match(lab, /p\.rosterRedundancyPenalty < 20/, "Severe roster redundancy must block Draft Plan sleeper boost");
assert.match(lab, /strictNullableToolNumber/);
assert.match(lab, /minimumAdp cannot exceed maximumAdp/);
assert.match(lab, /if \(!p\.isSleeper\) return false;/, "Assistant sleeper targets must return qualified profiles only");
assert.match(lab, /sleeperAtPick/, "Draft-time Sleeper Score snapshots must be retained");

assert.ok(html.indexOf("sleeper-model.js") < html.indexOf("app.js"));
assert.ok(html.indexOf("app.js") < html.indexOf("sleeper-lab.js"));

// v1.3 league decision laboratory contracts
const worker = read("simulation-worker.js");
let workerListener = null;
const workerMessages = [];
vm.runInNewContext(worker, {
  self: {
    addEventListener(type, listener) { if (type === "message") workerListener = listener; },
    postMessage(message) { workerMessages.push(message); },
  },
  Math,
  Number,
  Array,
  Object,
  String,
  Boolean,
  console,
});
assert.equal(typeof workerListener, "function", "Season worker message listener must initialize");
workerListener({ data: {
  type: "SIMULATE_SEASONS",
  requestId: "validate-v13-worker",
  analyses: Array.from({ length: 12 }, (_, index) => ({ team: index + 1, weeklyProjection: 100 + index, value: 2, balance: 3, benchDepth: 8, replacementValue: 6, riskConcentration: 3, missingStarters: 0, stackPairs: index % 3 === 0 ? 1 : 0, byeConcentration: index % 4 === 0 ? 1 : 0 })),
  league: { teams: 12, playoffTeams: 6 },
  seasonCount: 12,
  seed: 12345,
} });
assert.equal(workerMessages[0]?.type, "SIMULATE_SEASONS_RESULT", "Season worker must return a result message");
assert.equal(workerMessages[0]?.rows?.length, 12, "Season worker must return every team");
assert.ok(workerMessages[0].rows.every((row) => Number.isFinite(row.playoffRate) && Number.isFinite(row.averageFinish)), "Season worker outputs must remain finite");
const mission = "A league-specific decision laboratory that learns how your league values players, predicts how its managers will behave, and tests the consequences of every major draft and keeper decision.";
assert.ok(html.includes(mission), "Core mission statement must appear verbatim in the application shell");
assert.match(app, /valuePercentilesBySource/);
assert.match(app, /evidencePercentile/);
assert.match(app, /convictionClassification/);
assert.match(app, /leagueMarketEstimate/);
assert.match(html, /General market/);
assert.match(html, /Conviction edge/);
for (const environment of ["baseline", "market_heavy", "aggressive_room", "conservative", "injury_stress"]) assert.ok(app.includes(environment), `Decision environment missing: ${environment}`);
assert.match(app, /shared-decision-seed/);
assert.match(app, /decisionScore/);
assert.match(app, /Simulator Calibration Center/);
assert.match(app, /survivalMeanAbsoluteError/);
assert.match(app, /rosterSimulationProfile/);
for (const realismSignal of ["injuryExposure", "replacementQuality", "stackPairs", "byeConcentration"]) {
  assert.ok(app.includes(realismSignal), `Main simulator realism signal missing: ${realismSignal}`);
  assert.ok(worker.includes(realismSignal), `Worker simulator realism signal missing: ${realismSignal}`);
}
for (const keeperContract of ["keeperRules", "keeperSetOptimizer", "keeperSetIsLegal", "predictedKeeperSelections", "keeperAdjustedMarketPick", "nextSeasonMarketPickEstimate", "startKeeperScenarioAnalysis"]) assert.ok(app.includes(keeperContract), `Keeper contract missing: ${keeperContract}`);
assert.ok(app.includes("Keeper Set Optimizer"));
assert.match(html, /Keeper rules engine/i);
assert.match(app, /beamWidth\s*=\s*220/, "Keeper optimizer must use bounded beam search");
for (const control of ["keeperMinKeepers", "keeperEarliestEligibleRound", "keeperAllowWaiver", "keeperAllowTraded", "keeperFranchiseExemptions"]) assert.ok(html.includes(`id="${control}"`), `Keeper rules control missing: ${control}`);
for (const keeperRule of ["allowWaiverKeepers", "allowTradedKeepers", "franchiseExemptions", "earliestEligibleRound", "acquisitionType", "ineligibilityReason"]) assert.ok(app.includes(keeperRule), `Keeper eligibility logic missing: ${keeperRule}`);
assert.match(app, /roundIsKeeperCost/);
assert.match(app, /manually selected keeper round is the current upcoming draft cost/);
assert.match(app, /keeper-mini-table/);
assert.match(app, /revealDraftAssistant/);
assert.match(app, /data-open-draft-assistant/);
assert.match(model, /twoRoundAdpEdge/);
assert.match(model, /tierPromotion/);
assert.match(model, /Premium-player guardrail/);
assert.match(app, /dynamicMarketTiers/);
assert.doesNotMatch(app.slice(app.indexOf("function nextSeasonMarketPickEstimate"), app.indexOf("function rawKeeperCandidateRows")), /seasonOffset\s*=\s*[23]|three-year|3-year/i, "Keeper projections must stop at next season");
assert.ok(html.includes("Draft Portfolio Planning"));
assert.match(app, /portfolioDecisionAdjustment/);
assert.match(app, /Diversification applies only as a tie-breaker/);
assert.match(app, /Opponent Reaction Matrix/);
assert.match(app, /managerReactionMatrix/);
assert.match(app, /paired rollouts/);
assert.match(css, /mission-banner/);
assert.match(css, /portfolio-metric-grid/);
assert.match(css, /reaction-matrix-grid/);

console.log("validate.mjs: v1.4 league decision laboratory contracts passed");

console.log("validate.mjs: source and safety contract assertions passed");


assert.match(app, /function applyRankingSourceWeight\(/, "Canonical slider weight handler missing");
assert.match(app, /projectionShare = value\?\.coverageEligible \? 0\.20 : 0/, "Projection evidence cap missing");
assert.match(app, /rankGuardrailApplied/, "Consensus rank guardrail missing");
assert.match(app, /function compactBulkRunRuntime\(/, "Bulk runtime compaction helper missing");
assert.match(app, /function draftStateFingerprint\(/, "Fixed-length draft fingerprint missing");
assert.match(app, /currentDraftStateIdentifier[\s\S]{0,260}draftStateFingerprint/, "Draft identifiers must use the compact fingerprint");
assert.doesNotMatch(app.slice(app.indexOf("function currentDraftStateIdentifier"), app.indexOf("function predictionConfidenceForProfile")), /state\.picks\.map/, "Draft identifiers must not retain the full simulated board");
const v13Candidate = app.slice(app.indexOf("simulateCandidateTrial = function simulateCandidateTrialV13"), app.indexOf("function rosterSimulationProfile"));
assert.match(v13Candidate, /INTERNAL_SIMULATION_DEPTH \+= 1/, "V13 candidate trials must enter internal simulation mode");
assert.match(v13Candidate, /INTERNAL_SIMULATION_DEPTH = Math\.max\(0, INTERNAL_SIMULATION_DEPTH - 1\)/, "V13 candidate trials must exit internal simulation mode");
assert.match(app, /function renderAfterBulkSimulation\(/, "Targeted end-of-run rendering helper missing");
assert.match(app, /const visibleLimit = 40/, "Run Explorer initial DOM must remain bounded");
assert.match(app, /compactBulkSimulationPlayer\(player, \{ includeProjection: true \}\)/, "Bulk rosters must retain compact projection evidence only");
assert.match(app, /run\.pickBreakdown = \(run\.pickBreakdown \|\| \[\]\)\.slice\(0, 6\)/, "Bulk pick breakdown retention must be bounded");
assert.match(app, /run\.availability = \(run\.availability \|\| \[\]\)\.map/, "Bulk availability must be compacted before retention");
assert.match(app, /BULK_SIMULATION_CACHE\.clear\(\);[\s\S]{0,180}BULK_SIMULATION_CACHE\.set\(modelKey, state\.bulk\.results\)/, "Bulk cache must retain only the current full batch");
assert.match(app, /compactBulkRunRuntime\(run\);[\s\S]{0,220}runSeasonSimulationForBulk/, "A run must be compacted before awaiting season simulation");
assert.match(app, /function inlineSeasonSimulationWorkerSource\(/, "Blob-backed season worker source missing");
assert.match(app, /new Worker\(BULK_SEASON_WORKER_URL\)/, "Runtime must create the season worker from a Blob URL");
assert.doesNotMatch(app.slice(app.indexOf("function seasonSimulationWorker"), app.indexOf("function runSeasonSimulationForBulk")), /window\.location\.protocol\s*===\s*["']file:/, "Local file mode must not disable the background worker");
assert.match(app, /phase = "analyzing"/, "Bulk finalization analyzing phase missing");
assert.match(app, /phase = "rendering"/, "Bulk finalization rendering phase missing");
assert.match(app, /window\.setTimeout\(saveSimulatorState, 0\)/, "Results must render before simulator persistence");
assert.match(app, /BULK_PRIORITY_PLAYER_LIMIT\s*=\s*420/, "Draft Plan Priority player-pool bound missing");
assert.match(app, /function draftPlanPriorityPlayerPool\(/, "Bounded Draft Plan Priority pool helper missing");
assert.match(app, /fallbackBulkSummary/, "Completed-run finalization fallback missing");
assert.match(html, /app\.js\?v=153/, "v1.5.3 canonical app asset missing");
assert.match(html, /styles\.css\?v=153/, "v1.5.3 canonical stylesheet asset missing");
assert.doesNotMatch(html, /app-v14\d\.js|styles-v14\d\.css/, "Versioned duplicate assets must not be referenced");
assert.match(app, /v150RenderStaticDecisionCenter\(\);[\s\S]{0,80}return;/, "Legacy Draft Room renderer must delegate fallback states to the stable v1.5 Decision Center");

assert.match(app, /function scoutingTopPositionForPick\(/, "Scouting top-position helper must exist");
assert.match(app, /strategy-comparison-section/, "Strategy comparison must expose the calibration placement anchor");
assert.match(app, /Calibration begins during live drafts/, "Calibration empty-state guidance missing");
assert.match(app, /Bulk simulations test draft decisions against the Lab's own modeled rooms/, "Calibration self-grading explanation missing");
assert.match(app, /Historical no-lookahead evidence/, "Historical no-lookahead metrics missing from Calibration Center");
for (const section of [
  "Simulation Summary",
  "Recommended Draft Plan",
  "Best Draft Approaches",
  "Full League View",
  "Common Availability by Pick",
  "Positional Draft Windows",
  "Key Findings",
  "Backup Plans",
  "Optional Methodology",
]) assert.ok(app.includes(section), `Bulk MVP section missing: ${section}`);
assert.match(app, /renderMvpSimulationSummary\(summary, runs\)/, "Bulk results must lead with the MVP simulation summary");
assert.doesNotMatch(app.slice(app.indexOf("function renderBulkSimulator()"), app.indexOf("function renderOverlayFormulaSummary")), /renderCounterfactualPickLab|renderOpeningBuilds|renderSurvivalResults|renderCommonTargets/, "Bulk MVP primary renderer must not include legacy dense results sections");

console.log("validate.mjs: all assertions passed");
