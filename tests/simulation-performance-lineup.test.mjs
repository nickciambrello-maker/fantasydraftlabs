import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const initializationStart = app.lastIndexOf("\ninitializeLeagueProfiles();");
const testableSource = `${app.slice(0, initializationStart)}
;globalThis.__fdl = {
  state,
  LEAGUE,
  simulateBulkDraft,
  projectionProfileForPlayer,
  compactPick,
  optimizedLineupLayout,
  bestLineupForRoster,
  fullRosterRows,
  rosterSlotRows,
};`;

function loadAppModel() {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    createElement: () => ({}),
  };
  const window = {
    FDL_HISTORICAL_ADP: null,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (callback) => setTimeout(callback, 0),
    document,
    localStorage,
  };
  const sandbox = {
    console,
    window,
    document,
    localStorage,
    structuredClone,
    performance,
    crypto: globalThis.crypto,
    Blob: globalThis.Blob,
    URL: globalThis.URL,
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: window.requestAnimationFrame,
    navigator: {},
  };
  vm.createContext(sandbox);
  vm.runInContext(testableSource, sandbox, { timeout: 10_000 });
  return sandbox.__fdl;
}

test("optimized simulator preserves the fixed-model draft result", () => {
  const model = loadAppModel();
  Object.assign(model.state, {
    userTeam: 6,
    viewedDraftId: null,
    strategy: "balanced",
    picks: [],
    draftedIds: new Set(),
    currentPick: 1,
  });
  Object.assign(model.state.bulk, { depth: "standard", randomizeRoom: true });

  const run = model.simulateBulkDraft("balanced", 0, "fixed-performance-key");
  const stableResult = {
    strategy: "balanced",
    index: 0,
    draftPlayerIds: run.draftPlayerIds,
    userPicks: run.userPicks.map((pick) => [pick.pick, pick.player.id]),
    score: run.score,
    weeklyProjection: run.weeklyProjection,
    rank: run.rank,
  };
  const digest = createHash("sha256").update(JSON.stringify(stableResult)).digest("hex");

  assert.equal(run.draftPlayerIds.length, model.LEAGUE.teams * model.LEAGUE.rounds);
  assert.equal(digest, "bfb8f65af3cd1bd077022d4aee2ef2c3f4c3a1198436b7cea27350f8f05e0d8a");
});

test("early core picks remain starters when a late upload lacks comparable coverage", () => {
  const model = loadAppModel();
  const players = [
    { id: "early-rb-1", name: "Early RB One", position: "RB", team: "AAA", consensusRank: 1, rank: 1, adp: 1 },
    { id: "early-wr-1", name: "Early WR One", position: "WR", team: "AAA", consensusRank: 2, rank: 2, adp: 2 },
    { id: "early-rb-2", name: "Early RB Two", position: "RB", team: "BBB", consensusRank: 10, rank: 10, adp: 10 },
    { id: "early-wr-2", name: "Early WR Two", position: "WR", team: "BBB", consensusRank: 20, rank: 20, adp: 20 },
    { id: "early-wr-3", name: "Early WR Three", position: "WR", team: "CCC", consensusRank: 30, rank: 30, adp: 30 },
    { id: "early-te-1", name: "Early TE One", position: "TE", team: "CCC", consensusRank: 40, rank: 40, adp: 40 },
    { id: "early-rb-3", name: "Early RB Three", position: "RB", team: "EEE", consensusRank: 45, rank: 45, adp: 45 },
    {
      id: "late-rb",
      name: "Late Incomplete RB",
      position: "RB",
      team: "DDD",
      consensusRank: 120,
      rank: 120,
      adp: 120,
      weightedProjection: 60,
      valueNormalizedSourceCount: 0,
      projectionValueEvidence: [],
    },
  ];
  const rosterPicks = players.map((player, index) => ({ pick: index + 1, player }));

  assert.equal(model.projectionProfileForPlayer(players.at(-1)).projectionType, "model");

  const slotRows = model.rosterSlotRows(rosterPicks, model.LEAGUE);
  const starterIds = new Set(slotRows.filter((row) => row.starter && row.player).map((row) => row.player.id));
  assert.ok(starterIds.has("early-rb-1"));
  assert.ok(starterIds.has("early-rb-2"));
  assert.ok(starterIds.has("early-rb-3"));
  assert.ok(starterIds.has("early-wr-1"));
  assert.ok(!starterIds.has("late-rb"));

  const bestLineupIds = new Set(model.bestLineupForRoster(players).map((player) => player.id));
  assert.deepEqual(bestLineupIds, starterIds);
  const analysisRows = model.fullRosterRows(players);
  assert.equal(analysisRows.find((player) => player.id === "early-rb-1").rosterSlot, "Starter");
  assert.equal(analysisRows.find((player) => player.id === "late-rb").rosterSlot, "Bench");
});

test("completed drafts retain the projection used by lineup analysis", () => {
  const model = loadAppModel();
  const player = { id: "saved-rb", name: "Saved RB", position: "RB", team: "AAA", consensusRank: 8, rank: 8, adp: 8 };
  const saved = model.compactPick({ pick: 6, round: 1, index: 5, team: 6, label: "1.06", player });
  const restored = model.projectionProfileForPlayer(saved.player);

  assert.ok(Number.isFinite(saved.player.weeklyProjection));
  assert.equal(restored.weeklyValue, saved.player.weeklyProjection);
  assert.equal(restored.projectionType, saved.player.projectionType);
});
