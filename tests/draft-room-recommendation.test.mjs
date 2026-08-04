import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const start = app.indexOf("// v1.7.0 — Scannable Draft Room recommendations.");
const end = app.indexOf("initializeLeagueProfiles();", start);
const recommendationSource = app.slice(start, end);

test("renders one stable concise recommendation structure", () => {
  assert.ok(start >= 0, "v1.7 recommendation layer should exist");
  assert.match(recommendationSource, /data-recommendation-version="1\.7"/);
  assert.match(recommendationSource, /data-reason-count="3"/);
  assert.equal((recommendationSource.match(/<article class="recommendation-reason">/g) || []).length, 1, "reason cards should come from one mapped three-item model");
  assert.match(recommendationSource, /reasons:\s*\[\s*\{ heading: "Best value"[\s\S]*\{ heading: "Why now"[\s\S]*\{ heading: "Best path forward"/);
});

test("keeps required decision lines and actions visible before evidence", () => {
  const cardStart = recommendationSource.indexOf("function v170DecisionCardHtml");
  const cardEnd = recommendationSource.indexOf("function v170RenderStaticDecisionCenter", cardStart);
  const card = recommendationSource.slice(cardStart, cardEnd);
  for (const label of ["Next pick outlook", "Main risk", "Change the pick if", "Compare alternatives", "View player"]) {
    assert.ok(card.includes(label), `missing ${label}`);
  }
  assert.ok(recommendationSource.includes("View full evidence"), "missing View full evidence");
  assert.ok(card.indexOf("recommendation-actions") < card.lastIndexOf("v170FullEvidenceHtml"), "actions must remain above collapsed evidence");
});

test("keeps the core call available while simulation work runs or fails", () => {
  assert.match(recommendationSource, /\["calculating", "queued", "refining"\]/);
  assert.match(recommendationSource, /Core recommendation ready\.<\/strong> Simulation comparison is still refining/);
  assert.match(recommendationSource, /status === "fallback"/);
  assert.match(recommendationSource, /Simulation comparison is unavailable, so this call uses current board, roster, and league evidence/);
  assert.match(recommendationSource, /if \(results\.length\) v170RenderAdvancedDecisionCenter\(results\);\s*else v170RenderStaticDecisionCenter\(\);/);
  assert.doesNotMatch(recommendationSource, /Calculating candidate outcomes|Finishing the Bulk Simulator first/);
});

test("does not use model-input jargon in the primary recommendation layer", () => {
  for (const phrase of [
    "fills an open starter path",
    "Acquisition urgency",
    "Static player value",
    "League market 1.0",
    "Projected positional selection volume",
    "advanced matched-path outcomes run separately",
    "recommendation currently uses weighted rankings",
  ]) {
    assert.ok(!recommendationSource.includes(phrase), `primary layer still contains: ${phrase}`);
  }
});

test("stacks reason blocks and prevents mobile recommendation overflow", () => {
  assert.match(css, /\.recommendation-reasons-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*\.recommendation-reasons-grid,[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 650px\)[\s\S]*\.decision-center\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.match(css, /\.recommendation-headline h2\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
});

test("builds a usable board-only card while matched paths are still running", () => {
  const bijan = { id: "1", name: "Bijan Robinson", position: "RB", team: "ATL", tier: 1, consensusRank: 1, sourceCount: 3, adp: 1.5 };
  const chase = { id: "3", name: "Ja'Marr Chase", position: "WR", team: "CIN", tier: 1, consensusRank: 3, sourceCount: 3, adp: 2.5 };
  const nextWr = { id: "20", name: "Nico Collins", position: "WR", team: "HOU", tier: 2, consensusRank: 20 };
  const survival = { confidence: "High", survivalProbability: 0.22, nextPick: 24, picksUntil: 18, explanation: "18 selections before 2.12; six intervening teams have an open RB path." };
  const sandbox = {
    console,
    state: { strategy: "heroRB", userTeam: 6, currentPick: 6, candidateOutcome: { status: "calculating", progress: 2, total: 16 }, bulk: { draftPlan: null, staleReason: "" } },
    LEAGUE: { teams: 12, rounds: 16 },
    BULK_STRATEGIES: [{ id: "heroRB", label: "Hero RB" }],
    availablePlayers: () => [bijan, chase, nextWr],
    rosterFor: () => [],
    draftOrderFor: () => ({ round: 1 }),
    currentDraftPlanPriority: () => null,
    strategyScore: () => -10,
    fillsRequiredRosterSlot: () => true,
    playerSurvivalEstimate: () => survival,
    convictionClassification: () => ({ id: "lab_target", label: "Lab target", explanation: "League-adjusted value is stronger than market price." }),
    scoutingSnipeEvidence: () => ({ level: "High", score: 8, teamCount: 6, historicalProfiles: 4, text: "High RB pressure before 2.12.", threats: [{ team: 2, reasons: ["historically leans RB"] }] }),
    recommendationScore: (player) => player.id === "1" ? 100 : 95,
    nextPickForTeam: () => 24,
    pickLabel: () => "2.12",
    likelyNextPickOptions: () => ({ nextPick: 24, players: [nextWr] }),
    scoringRankBonus: () => 2.5,
    joinNatural: (items) => items.join(" and "),
    activeTeamName: () => "Team Alpha",
    currentPlanStatus: () => ({ label: "Analysis unavailable", reason: "Run the Draft Simulator to create a Draft Plan." }),
    projectionProfileForPlayer: () => ({ projectionType: "imported" }),
    percentRate: (value) => `${Math.round(value * 100)}%`,
    starterImpactLabel: () => "+2.0 pts/wk",
    escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"),
    draftRoomPlanStrip: () => '<section class="draft-room-plan-strip">Plan evidence</section>',
    v150StaticRecommendationRecord: (player) => ({ player, survival, openStarter: true }),
    v150StaticCandidateCard: () => "",
    decisionCandidateCard: () => "",
    renderRecommendations() {},
    currentPickAdvice() {},
    localAssistantStructured() {},
    localAssistantResponse: () => "Local answer",
    mentionedPlayerFromQuestion: () => null,
    currentOutcomeResults: () => [],
    recommendations: () => [bijan, chase],
    renderCurrentPickHeader() {},
    renderPickWindow() {},
    renderAvailable() {},
    renderDraftPortfolioPlanning() {},
    startCandidateOutcomeRecommendations() {},
    $: () => ({ innerHTML: "" }),
    CANDIDATE_OUTCOME_RUN_TOKEN: 0,
  };
  vm.createContext(sandbox);
  vm.runInContext(recommendationSource, sandbox);
  const primary = { player: bijan, survival, openStarter: true };
  const alternative = { player: chase, survival };
  const model = sandbox.v170RecommendationPresentation(primary, alternative, false);
  const html = sandbox.v170DecisionCardHtml(model, primary, alternative, "");
  const summaryWords = model.summary.split(/\s+/).length;

  assert.equal(model.reasons.length, 3);
  assert.equal(model.headline, "Draft Bijan Robinson");
  assert.ok(summaryWords >= 30 && summaryWords <= 50, `summary should be 30–50 words, received ${summaryWords}`);
  assert.equal((html.match(/class="recommendation-reason"/g) || []).length, 3);
  assert.ok(html.indexOf("recommendation-actions") < html.indexOf("recommendation-refinement"), "status should follow the usable recommendation and actions");
  assert.ok(html.includes("Core recommendation ready."));
  assert.ok(html.includes("View full evidence"));
});
