"use strict";

/* ========================================================================== */
/* Fantasy Draft Labs v1.6.1 — Sleeper League Intelligence                    */
/* ========================================================================== */

const FDL_INTELLIGENCE_SCHEMA_VERSION = 2;
const FDL_INTELLIGENCE_MODEL_VERSION = "league-intelligence-v1.1";
const FDL_INTELLIGENCE_MAX_SEASONS = 12;
const FDL_INTELLIGENCE_WEEK_CONCURRENCY = 4;
const FDL_INTELLIGENCE_MAX_RETRIES = 2;
const FDL_INTELLIGENCE_MAX_WEEK = 18;
let FDL_INTELLIGENCE_ABORT_CONTROLLER = null;
const FDL_INTELLIGENCE_REQUEST_CACHE = new Map();

function v160Array(value) {
  return Array.isArray(value) ? value : [];
}

function v160Number(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function v160Mean(values) {
  const finite = v160Array(values).map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

function v160Median(values) {
  const finite = v160Array(values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return null;
  const midpoint = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[midpoint] : (finite[midpoint - 1] + finite[midpoint]) / 2;
}

function v160Deviation(values) {
  const finite = v160Array(values).map(Number).filter(Number.isFinite);
  if (finite.length < 2) return 0;
  const mean = v160Mean(finite);
  return Math.sqrt(finite.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / finite.length);
}

function v160Unique(values) {
  return [...new Set(v160Array(values).filter((value) => value !== null && value !== undefined && value !== ""))];
}

function v160RecordCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length ? 1 : 0;
  return value === null || value === undefined ? 0 : 1;
}

function v160SafeIso(value = Date.now()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function v160SettingFingerprint(season) {
  const league = season?.league || {};
  return JSON.stringify({
    teams: Number(league.total_rosters || 0),
    rosterPositions: v160Array(league.roster_positions),
    scoring: league.scoring_settings || {},
    playoffStart: Number(league.settings?.playoff_week_start || 0),
    playoffTeams: Number(league.settings?.playoff_teams || 0),
    medianGame: Boolean(league.settings?.league_average_match || league.settings?.median_match),
    draftType: season?.draft?.type || season?.draft?.settings?.type || "unknown",
    keeperSeason: v160Array(season?.keepers).length > 0,
    tradedPickCount: v160Array(season?.tradedPicks).length,
  });
}

function v160HistoricalSeasonShape(season = {}) {
  const coverage = season.coverage || {};
  return {
    leagueId: String(season.leagueId || season.league?.league_id || ""),
    previousLeagueId: String(season.previousLeagueId || season.league?.previous_league_id || ""),
    season: String(season.season || season.league?.season || ""),
    leagueName: season.leagueName || season.league?.name || `Season ${season.season || "unknown"}`,
    status: season.status || season.league?.status || "unknown",
    league: season.league || null,
    settings: season.settings || season.league?.settings || {},
    scoringSettings: season.scoringSettings || season.league?.scoring_settings || {},
    rosterPositions: v160Array(season.rosterPositions || season.league?.roster_positions),
    users: v160Array(season.users),
    rosters: v160Array(season.rosters),
    drafts: v160Array(season.drafts),
    draftDetails: v160Array(season.draftDetails),
    draft: season.draft || null,
    picks: v160Array(season.picks),
    tradedPicks: v160Array(season.tradedPicks),
    keepers: v160Array(season.keepers),
    weeklyMatchups: v160Array(season.weeklyMatchups),
    weeklyTransactions: v160Array(season.weeklyTransactions),
    winnersBracket: v160Array(season.winnersBracket),
    losersBracket: v160Array(season.losersBracket),
    regularSeasonWeeks: Math.max(0, Number(season.regularSeasonWeeks || 0)),
    requestedWeeks: Math.max(0, Number(season.requestedWeeks || 0)),
    importStatus: {
      status: season.importStatus?.status || "Partial",
      message: season.importStatus?.message || "Historical season requires review.",
      completedAt: season.importStatus?.completedAt || "",
    },
    coverage: {
      league: Boolean(coverage.league),
      users: Boolean(coverage.users),
      rosters: Boolean(coverage.rosters),
      drafts: Boolean(coverage.drafts),
      draftDetails: Boolean(coverage.draftDetails),
      picks: Boolean(coverage.picks),
      tradedPicks: Boolean(coverage.tradedPicks),
      matchups: Boolean(coverage.matchups),
      transactions: Boolean(coverage.transactions),
      winnersBracket: Boolean(coverage.winnersBracket),
      losersBracket: Boolean(coverage.losersBracket),
      historicalAdp: Boolean(coverage.historicalAdp),
    },
    warnings: v160Array(season.warnings),
    exclusions: v160Array(season.exclusions),
    diagnostics: v160Array(season.diagnostics),
    importedAt: season.importedAt || "",
    settingsFingerprint: season.settingsFingerprint || v160SettingFingerprint(season),
  };
}

const v153NormalizeSleeperImport = normalizeSleeperImport;
normalizeSleeperImport = function normalizeSleeperImportV160(importData, teamCount = LEAGUE.teams) {
  const base = v153NormalizeSleeperImport(importData, teamCount);
  if (!base) return null;
  return {
    ...base,
    dataModelVersion: Number(importData?.dataModelVersion || FDL_INTELLIGENCE_SCHEMA_VERSION),
    intelligenceModelVersion: importData?.intelligenceModelVersion || FDL_INTELLIGENCE_MODEL_VERSION,
    historicalSeasons: v160Array(importData?.historicalSeasons).map(v160HistoricalSeasonShape),
    managerContinuity: v160Array(importData?.managerContinuity),
    managerIdentityAudit: importData?.managerIdentityAudit || null,
    seasonResults: v160Array(importData?.seasonResults),
    draftSeasonJoins: v160Array(importData?.draftSeasonJoins),
    historicalStrategyOutcomes: v160Array(importData?.historicalStrategyOutcomes),
    evidenceLedger: v160Array(importData?.evidenceLedger),
    importDiagnostics: v160Array(importData?.importDiagnostics),
    validationReport: importData?.validationReport || { status: "Not run", issues: [], checks: [] },
    intelligenceGeneratedAt: importData?.intelligenceGeneratedAt || "",
  };
};

function v160SetImportProgress(stage, completed = 0, total = 0, detail = "") {
  state.sleeper.importProgress = { stage, completed, total, detail, updatedAt: new Date().toISOString() };
  state.sleeper.status = [stage, total ? `${completed}/${total}` : "", detail].filter(Boolean).join(" · ");
  renderSleeperImport();
}

function v160Diagnostic({ endpoint, season = "", status, records = 0, cacheStatus = "Network", retries = 0, reason = "", requestedAt = Date.now() }) {
  return {
    endpoint,
    season: String(season || ""),
    status,
    recordsReturned: Number(records || 0),
    cacheStatus,
    retryCount: Number(retries || 0),
    failureReason: reason || "",
    requestedAt: v160SafeIso(requestedAt),
  };
}

function v160AbortError() {
  const error = new Error("Sleeper intelligence import was cancelled.");
  error.name = "AbortError";
  return error;
}

async function v160FetchEndpoint(path, { season = "", endpoint = path, optional = false, diagnostics = [], signal = null } = {}) {
  if (signal?.aborted) throw v160AbortError();
  if (FDL_INTELLIGENCE_REQUEST_CACHE.has(path)) {
    const cached = FDL_INTELLIGENCE_REQUEST_CACHE.get(path);
    diagnostics.push(v160Diagnostic({ endpoint, season, status: "Cached", records: v160RecordCount(cached), cacheStatus: "Cached" }));
    return cached;
  }
  const startedAt = Date.now();
  let lastError = null;
  for (let attempt = 0; attempt <= FDL_INTELLIGENCE_MAX_RETRIES; attempt += 1) {
    if (signal?.aborted) throw v160AbortError();
    try {
      const response = await fetch(`${SLEEPER_API_BASE}${path}`, { signal });
      if (!response.ok) {
        const error = new Error(`Sleeper request failed (${response.status})`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      FDL_INTELLIGENCE_REQUEST_CACHE.set(path, payload);
      diagnostics.push(v160Diagnostic({ endpoint, season, status: "Complete", records: v160RecordCount(payload), retries: attempt, requestedAt: startedAt }));
      return payload;
    } catch (error) {
      if (error?.name === "AbortError" || signal?.aborted) throw v160AbortError();
      lastError = error;
      const unsupported = [400, 404].includes(Number(error?.status));
      if (unsupported || attempt === FDL_INTELLIGENCE_MAX_RETRIES) {
        diagnostics.push(v160Diagnostic({
          endpoint,
          season,
          status: unsupported ? "Unsupported" : optional ? "Partial" : "Failed",
          records: 0,
          retries: attempt,
          reason: error?.message || "Unknown request failure",
          requestedAt: startedAt,
        }));
        if (optional || unsupported) return null;
        throw error;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 180 * (attempt + 1)));
    }
  }
  if (optional) return null;
  throw lastError || new Error("Sleeper request failed.");
}

async function v160MapLimit(items, limit, worker) {
  const rows = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      rows[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return rows;
}

function v160SeasonWeekPlan(league) {
  const settings = league?.settings || {};
  const playoffStart = Math.max(2, Number(settings.playoff_week_start || 15));
  const regularSeasonWeeks = Math.min(FDL_INTELLIGENCE_MAX_WEEK, Math.max(1, playoffStart - 1));
  const playoffTeams = Math.max(2, Number(settings.playoff_teams || Math.ceil(Number(league?.total_rosters || 12) / 2)));
  const playoffRounds = Math.max(1, Math.ceil(Math.log2(playoffTeams)));
  const completedThrough = Math.max(0, Number(settings.last_scored_leg || 0));
  const target = league?.status === "complete"
    ? Math.max(regularSeasonWeeks, playoffStart + playoffRounds - 1)
    : Math.max(regularSeasonWeeks, completedThrough);
  return {
    regularSeasonWeeks,
    requestedWeeks: Math.min(FDL_INTELLIGENCE_MAX_WEEK, Math.max(1, target)),
  };
}

function v160PrimaryDraft(league, drafts) {
  return bestDraftForLeague(league, v160Array(drafts));
}

function v160KeeperRows(picks) {
  return v160Array(picks).filter((pick) => pick?.is_keeper).map((pick) => ({
    draftId: String(pick._draftId || ""),
    playerId: String(pick.player_id || ""),
    rosterId: String(pick.roster_id || ""),
    userId: String(pick.picked_by || ""),
    round: Number(pick.round || 0),
    pickNo: Number(pick.pick_no || 0),
  }));
}

function v160CoverageWarning(label, coverage, warnings) {
  if (!coverage) warnings.push(`${label} data is missing or incomplete.`);
}

async function v160LoadHistoricalSeason(league, diagnostics, signal) {
  const season = String(league?.season || "");
  const leagueId = String(league?.league_id || "");
  const plan = v160SeasonWeekPlan(league);
  v160SetImportProgress("Loading managers and rosters", 0, 1, season);
  const [usersRaw, rostersRaw] = await Promise.all([
    v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/users`, { season, endpoint: "league users", diagnostics, signal }),
    v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/rosters`, { season, endpoint: "league rosters", diagnostics, signal }),
  ]);
  const users = v160Array(usersRaw);
  const rosters = v160Array(rostersRaw);

  v160SetImportProgress("Loading drafts", 0, 1, season);
  const drafts = v160Array(await v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/drafts`, { season, endpoint: "league drafts", diagnostics, signal, optional: true }));
  const draftBundles = await v160MapLimit(drafts, 3, async (draft) => {
    const draftId = String(draft?.draft_id || "");
    if (!draftId) return { detail: draft, picks: [], tradedPicks: [] };
    const [detail, picksRaw, tradedRaw] = await Promise.all([
      v160FetchEndpoint(`/draft/${encodeURIComponent(draftId)}`, { season, endpoint: `draft ${draftId}`, diagnostics, signal, optional: true }),
      v160FetchEndpoint(`/draft/${encodeURIComponent(draftId)}/picks`, { season, endpoint: `draft ${draftId} picks`, diagnostics, signal, optional: true }),
      v160FetchEndpoint(`/draft/${encodeURIComponent(draftId)}/traded_picks`, { season, endpoint: `draft ${draftId} traded picks`, diagnostics, signal, optional: true }),
    ]);
    return {
      detail: detail || draft,
      picks: v160Array(picksRaw).map((pick) => ({ ...pick, _draftId: draftId })),
      tradedPicks: v160Array(tradedRaw).map((trade) => ({ ...trade, _draftId: draftId, _source: "draft" })),
    };
  });
  const draftDetails = draftBundles.map((bundle) => bundle.detail).filter(Boolean);
  const picks = draftBundles.flatMap((bundle) => bundle.picks);
  const primaryDraft = v160PrimaryDraft(league, draftDetails.length ? draftDetails : drafts);
  const leagueTraded = v160Array(await v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/traded_picks`, { season, endpoint: "league traded picks", diagnostics, signal, optional: true }))
    .map((trade) => ({ ...trade, _source: "league" }));
  const tradedPicks = mergeSleeperTradedPicks(leagueTraded, draftBundles.flatMap((bundle) => bundle.tradedPicks));

  v160SetImportProgress("Loading weekly matchups", 0, plan.requestedWeeks, season);
  const weeks = Array.from({ length: plan.requestedWeeks }, (_, index) => index + 1);
  let matchupProgress = 0;
  const weeklyMatchups = await v160MapLimit(weeks, FDL_INTELLIGENCE_WEEK_CONCURRENCY, async (week) => {
    const records = v160Array(await v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/matchups/${week}`, {
      season,
      endpoint: `matchups week ${week}`,
      diagnostics,
      signal,
      optional: true,
    }));
    matchupProgress += 1;
    v160SetImportProgress("Loading weekly matchups", matchupProgress, plan.requestedWeeks, season);
    return { week, records };
  });

  v160SetImportProgress("Loading transactions", 0, plan.requestedWeeks, season);
  let transactionProgress = 0;
  const weeklyTransactions = await v160MapLimit(weeks, FDL_INTELLIGENCE_WEEK_CONCURRENCY, async (week) => {
    const records = v160Array(await v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/transactions/${week}`, {
      season,
      endpoint: `transactions week ${week}`,
      diagnostics,
      signal,
      optional: true,
    }));
    transactionProgress += 1;
    v160SetImportProgress("Loading transactions", transactionProgress, plan.requestedWeeks, season);
    return { week, records };
  });

  v160SetImportProgress("Loading playoff brackets", 0, 2, season);
  const [winnersRaw, losersRaw] = await Promise.all([
    v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/winners_bracket`, { season, endpoint: "winners bracket", diagnostics, signal, optional: true }),
    v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}/losers_bracket`, { season, endpoint: "losers bracket", diagnostics, signal, optional: true }),
  ]);
  const winnersBracket = v160Array(winnersRaw);
  const losersBracket = v160Array(losersRaw);
  const seasonDiagnostics = diagnostics.filter((row) => String(row.season) === season);
  const failedEndpoint = (pattern) => seasonDiagnostics.some((row) => pattern.test(row.endpoint) && ["Failed", "Partial", "Unsupported"].includes(row.status));
  const requestedRegular = weeklyMatchups.filter((row) => row.week <= plan.regularSeasonWeeks);
  const matchupsComplete = league.status === "complete"
    && requestedRegular.length === plan.regularSeasonWeeks
    && !failedEndpoint(/^matchups week /)
    && requestedRegular.every((row) => row.records.length > 0);
  const transactionsComplete = league.status === "complete"
    && weeklyTransactions.length === plan.requestedWeeks
    && !failedEndpoint(/^transactions week /);
  const coverage = {
    league: Boolean(leagueId),
    users: users.length > 0,
    rosters: rosters.length > 0,
    drafts: drafts.length > 0,
    draftDetails: !drafts.length || draftDetails.length === drafts.length,
    picks: picks.length > 0,
    tradedPicks: !failedEndpoint(/traded picks/),
    matchups: matchupsComplete,
    transactions: transactionsComplete,
    winnersBracket: winnersBracket.length > 0,
    losersBracket: losersBracket.length > 0,
    historicalAdp: Boolean(historicalAdpSeasonData(season)),
  };
  const warnings = [];
  if (!Number(league.settings?.playoff_week_start)) warnings.push(`Regular-season length fallback used: ${plan.regularSeasonWeeks} weeks because Sleeper did not supply playoff_week_start.`);
  if (!Number(league.settings?.playoff_teams)) warnings.push("Playoff-team count fallback used because Sleeper did not supply playoff_teams.");
  v160CoverageWarning("Manager", coverage.users && coverage.rosters, warnings);
  v160CoverageWarning("Draft", coverage.drafts && coverage.picks, warnings);
  v160CoverageWarning("Regular-season matchup", coverage.matchups, warnings);
  v160CoverageWarning("Transaction", coverage.transactions, warnings);
  if (league.status === "complete") {
    v160CoverageWarning("Winners bracket", coverage.winnersBracket, warnings);
    v160CoverageWarning("Losers bracket", coverage.losersBracket, warnings);
  } else {
    warnings.push(`Sleeper marks ${season} as ${league.status || "not complete"}; season outcomes are excluded from completed-season rates.`);
  }
  const exclusions = [];
  if (league.status !== "complete") exclusions.push("Incomplete season");
  if (!coverage.matchups) exclusions.push("Expected wins and schedule luck require complete regular-season matchup weeks");
  if (!coverage.winnersBracket) exclusions.push("Playoff finishes are not bracket-verified");
  const completeSeason = league.status === "complete" && coverage.users && coverage.rosters && coverage.matchups;
  return v160HistoricalSeasonShape({
    leagueId,
    previousLeagueId: league.previous_league_id,
    season,
    leagueName: league.name,
    status: league.status,
    league,
    settings: league.settings || {},
    scoringSettings: league.scoring_settings || {},
    rosterPositions: league.roster_positions || [],
    users,
    rosters,
    drafts,
    draftDetails,
    draft: primaryDraft,
    picks,
    tradedPicks,
    keepers: v160KeeperRows(picks),
    weeklyMatchups,
    weeklyTransactions,
    winnersBracket,
    losersBracket,
    regularSeasonWeeks: plan.regularSeasonWeeks,
    requestedWeeks: plan.requestedWeeks,
    importStatus: {
      status: completeSeason ? "Complete" : "Partial",
      message: completeSeason ? "Draft and complete regular-season outcomes imported." : "Available data imported with coverage limitations.",
      completedAt: new Date().toISOString(),
    },
    coverage,
    warnings,
    exclusions,
    diagnostics: seasonDiagnostics,
    importedAt: new Date().toISOString(),
  });
}

function v160CachedSeason(existing, leagueId) {
  const season = v160Array(existing).find((row) => String(row.leagueId) === String(leagueId));
  if (!season || season.importStatus?.status !== "Complete") return null;
  return v160HistoricalSeasonShape(season);
}

function v160CachedDiagnostics(season) {
  return v160Array(season?.diagnostics).map((row) => ({ ...row, status: "Cached", cacheStatus: "Cached", retryCount: 0, failureReason: "" }));
}

async function v160LoadLeagueHistory(initialLeague, existingSeasons, diagnostics, signal) {
  const seasons = [];
  const seen = new Set();
  let cursor = initialLeague;
  for (let depth = 0; cursor?.league_id && depth < FDL_INTELLIGENCE_MAX_SEASONS; depth += 1) {
    if (signal?.aborted) throw v160AbortError();
    const leagueId = String(cursor.league_id);
    if (seen.has(leagueId)) break;
    seen.add(leagueId);
    v160SetImportProgress("Loading league history", depth + 1, FDL_INTELLIGENCE_MAX_SEASONS, String(cursor.season || ""));
    const cached = v160CachedSeason(existingSeasons, leagueId);
    const season = cached || await v160LoadHistoricalSeason(cursor, diagnostics, signal);
    if (cached) diagnostics.push(...v160CachedDiagnostics(cached));
    seasons.push(season);
    const previousLeagueId = String(cursor.previous_league_id || season.previousLeagueId || "");
    if (!previousLeagueId) break;
    cursor = await v160FetchEndpoint(`/league/${encodeURIComponent(previousLeagueId)}`, {
      season: Number(cursor.season || 0) - 1,
      endpoint: "league",
      diagnostics,
      signal,
    });
  }
  return seasons.sort((a, b) => Number(b.season || 0) - Number(a.season || 0));
}

function v160UserName(user) {
  return user?.display_name || user?.username || "Unknown manager";
}

function v160TeamLabel(user, roster) {
  return user?.metadata?.team_name || roster?.metadata?.team_name || v160UserName(user);
}

function v160SeasonUsersById(season) {
  return new Map(v160Array(season?.users).map((user) => [String(user.user_id || ""), user]));
}

function v160SeasonRostersById(season) {
  return new Map(v160Array(season?.rosters).map((roster) => [String(roster.roster_id || ""), roster]));
}

function v160UserIdForRoster(season, rosterId) {
  const roster = v160SeasonRostersById(season).get(String(rosterId || ""));
  return String(roster?.owner_id || "");
}

function v160UserIdForPick(season, pick) {
  const usersById = v160SeasonUsersById(season);
  const pickedBy = String(pick?.picked_by || "");
  if (pickedBy && usersById.has(pickedBy)) return pickedBy;
  const rosterOwner = v160UserIdForRoster(season, pick?.roster_id);
  return rosterOwner || pickedBy;
}

function v160ManagerContinuity(seasons) {
  const chronological = [...v160Array(seasons)].sort((a, b) => Number(a.season || 0) - Number(b.season || 0));
  const latest = [...chronological].sort((a, b) => Number(b.season || 0) - Number(a.season || 0))[0] || null;
  const currentUserIds = new Set(v160Array(latest?.rosters).map((roster) => String(roster.owner_id || "")).filter(Boolean));
  const previousByUser = new Map();
  const previousByRoster = new Map();
  const records = [];

  chronological.forEach((season) => {
    const usersById = v160SeasonUsersById(season);
    const duplicateOwners = new Set();
    const ownerCounts = {};
    v160Array(season.rosters).forEach((roster) => {
      const owner = String(roster.owner_id || "");
      if (!owner) return;
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      if (ownerCounts[owner] > 1) duplicateOwners.add(owner);
    });
    v160Array(season.rosters).forEach((roster) => {
      const rosterId = String(roster.roster_id || "");
      const userId = String(roster.owner_id || "");
      const user = usersById.get(userId);
      const previousUserRecord = userId ? previousByUser.get(userId) : null;
      const previousRosterRecord = rosterId ? previousByRoster.get(rosterId) : null;
      const displayName = v160UserName(user);
      const teamName = v160TeamLabel(user, roster);
      let continuityStatus = "New manager";
      let continuityConfidence = "High";
      const notes = [];
      if (!userId || !user) {
        continuityStatus = "Missing user record";
        continuityConfidence = "Low";
        notes.push("Sleeper roster has no matching permanent user record.");
      } else if (duplicateOwners.has(userId)) {
        continuityStatus = "Ambiguous identity";
        continuityConfidence = "Low";
        notes.push("The same user ID is attached to multiple rosters in this season.");
      } else if (previousUserRecord) {
        if (String(previousUserRecord.rosterId) !== rosterId) {
          continuityStatus = "Roster changed";
          continuityConfidence = "High";
          notes.push(`Permanent user ID moved from roster ${previousUserRecord.rosterId} to ${rosterId}.`);
        } else if (previousUserRecord.teamName && teamName && previousUserRecord.teamName !== teamName) {
          continuityStatus = "Team renamed";
          continuityConfidence = "High";
          notes.push(`Team name changed from ${previousUserRecord.teamName} to ${teamName}.`);
        } else {
          continuityStatus = "Confirmed same manager";
          continuityConfidence = "High";
        }
      } else if (previousRosterRecord?.userId && previousRosterRecord.userId !== userId) {
        continuityStatus = "Replacement owner";
        continuityConfidence = "High";
        notes.push(`Roster ${rosterId} changed from user ${previousRosterRecord.userId} to ${userId}. Historical behavior remains attached to each permanent user ID.`);
      }
      const record = {
        season: String(season.season || ""),
        leagueId: String(season.leagueId || ""),
        userId,
        rosterId,
        displayName,
        teamName,
        previousUserId: previousRosterRecord?.userId || "",
        previousRosterId: previousUserRecord?.rosterId || "",
        continuityStatus,
        continuityConfidence,
        isCurrentMember: currentUserIds.has(userId),
        notes,
      };
      records.push(record);
      if (userId) previousByUser.set(userId, record);
      if (rosterId) previousByRoster.set(rosterId, record);
    });
    const rosterUserIds = new Set(v160Array(season.rosters).map((roster) => String(roster.owner_id || "")).filter(Boolean));
    v160Array(season.picks).forEach((pick) => {
      const userId = v160UserIdForPick(season, pick);
      if (!userId || rosterUserIds.has(userId) || records.some((row) => row.season === String(season.season) && row.userId === userId)) return;
      const user = usersById.get(userId);
      records.push({
        season: String(season.season || ""),
        leagueId: String(season.leagueId || ""),
        userId,
        rosterId: String(pick.roster_id || ""),
        displayName: v160UserName(user),
        teamName: v160TeamLabel(user, null),
        previousUserId: "",
        previousRosterId: "",
        continuityStatus: user ? "Unmatched historical manager" : "Missing user record",
        continuityConfidence: "Low",
        isCurrentMember: currentUserIds.has(userId),
        notes: ["Draft pick owner could not be matched to a season roster."],
      });
    });
  });

  const lastByUser = new Map();
  records.forEach((record) => {
    if (!record.userId) return;
    const existing = lastByUser.get(record.userId);
    if (!existing || Number(record.season || 0) >= Number(existing.season || 0)) lastByUser.set(record.userId, record);
  });
  lastByUser.forEach((record, userId) => {
    if (!currentUserIds.has(userId)) {
      record.notes = [...record.notes, "This manager is not in the current league."].filter(Boolean);
      record.continuityStatus = "Former manager";
      record.continuityConfidence = "High";
    }
  });

  const count = (status) => records.filter((row) => row.continuityStatus === status).length;
  const currentRecords = records.filter((row) => row.isCurrentMember);
  const audit = {
    records: records.length,
    managersMatched: v160Unique(currentRecords.filter((row) => ["Confirmed same manager", "Team renamed", "Roster changed"].includes(row.continuityStatus)).map((row) => row.userId)).length,
    replacementOwners: v160Unique(records.filter((row) => row.continuityStatus === "Replacement owner").map((row) => row.userId)).length,
    formerManagers: v160Unique(records.filter((row) => row.continuityStatus === "Former manager").map((row) => row.userId)).length,
    newManagers: v160Unique(records.filter((row) => row.continuityStatus === "New manager" && row.isCurrentMember).map((row) => row.userId)).length,
    ambiguousHistories: count("Ambiguous identity") + count("Missing user record") + count("Unmatched historical manager"),
    teamNameChanges: count("Team renamed"),
    rosterChanges: count("Roster changed"),
    analysisAffected: records.some((row) => ["Ambiguous identity", "Missing user record", "Unmatched historical manager"].includes(row.continuityStatus)),
    rule: "Permanent Sleeper user_id is authoritative. Former and replacement owners are never merged.",
  };
  return { records, audit };
}

function v160SleeperPoints(record) {
  const direct = Number(record?.points ?? record?.custom_points);
  if (Number.isFinite(direct)) return direct;
  const whole = Number(record?.settings?.fpts);
  const decimal = Number(record?.settings?.fpts_decimal);
  if (Number.isFinite(whole)) return whole + (Number.isFinite(decimal) ? decimal / 100 : 0);
  return null;
}

function v160DeduplicateRows(rows, keyFn) {
  const seen = new Set();
  const unique = [];
  let duplicates = 0;
  v160Array(rows).forEach((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    unique.push(row);
  });
  return { rows: unique, duplicates };
}

function v160BracketFacts(season, rosterId) {
  const target = String(rosterId || "");
  const winners = v160Array(season?.winnersBracket);
  const losers = v160Array(season?.losersBracket);
  const participants = new Set();
  const placements = new Map();
  let championshipAppearance = false;
  let championshipWin = false;
  winners.forEach((node) => {
    [node.t1, node.t2, node.w, node.l].forEach((id) => { if (id !== null && id !== undefined) participants.add(String(id)); });
    const placement = Number(node.p);
    if (Number.isFinite(placement) && node.w !== null && node.w !== undefined) placements.set(String(node.w), placement);
    if (Number.isFinite(placement) && node.l !== null && node.l !== undefined) placements.set(String(node.l), placement + 1);
    if (placement === 1 && [node.t1, node.t2, node.w, node.l].map(String).includes(target)) championshipAppearance = true;
    if (placement === 1 && String(node.w) === target) championshipWin = true;
  });
  losers.forEach((node) => {
    const placement = Number(node.p);
    if (Number.isFinite(placement) && node.w !== null && node.w !== undefined && !placements.has(String(node.w))) placements.set(String(node.w), placement);
    if (Number.isFinite(placement) && node.l !== null && node.l !== undefined && !placements.has(String(node.l))) placements.set(String(node.l), placement + 1);
  });
  return {
    playoffQualified: participants.has(target),
    finalPlace: placements.get(target) || null,
    championshipAppearance,
    championshipWin,
    verified: winners.length > 0,
  };
}

function v160ScheduleLuckRating(value) {
  if (!Number.isFinite(value)) return "Unavailable — incomplete matchup coverage";
  if (value >= 2) return "Won more games than weekly scoring would normally predict";
  if (value <= -2) return "Lost more games than weekly scoring would normally predict";
  if (value >= 0.75) return "Average scoring was helped by favorable matchups";
  if (value <= -0.75) return "Strong scoring was hurt by difficult weekly opponents";
  return "Record closely matched scoring strength";
}

function v160PlayerPosition(playerCatalog, playerId) {
  return normalizePosition(playerCatalog?.[String(playerId || "")]?.position || "") || "Unknown";
}

function v160TransactionProfiles(season, playerCatalog) {
  const profiles = new Map(v160Array(season.rosters).map((roster) => [String(roster.roster_id || ""), {
    waiverClaims: 0,
    freeAgentAdds: 0,
    drops: 0,
    trades: 0,
    transactionCount: 0,
    faabSpent: 0,
    faabBids: [],
    transactionWeeksActive: new Set(),
    earlySeasonActivity: 0,
    lateSeasonActivity: 0,
    positionAdded: {},
    positionDropped: {},
    tradePartners: {},
    commissionerMovesExcluded: 0,
  }]));
  const flattened = v160Array(season.weeklyTransactions).flatMap((week) => v160Array(week.records).map((transaction) => ({ ...transaction, _week: week.week })));
  const deduped = v160DeduplicateRows(flattened, (transaction) => String(transaction.transaction_id || `${transaction._week}|${transaction.type}|${transaction.created || ""}|${JSON.stringify(transaction.roster_ids || [])}`));
  deduped.rows.forEach((transaction) => {
    if (transaction.status && transaction.status !== "complete") return;
    const type = String(transaction.type || "other");
    const additions = transaction.adds || {};
    const drops = transaction.drops || {};
    const involved = new Set(v160Array(transaction.roster_ids).map(String));
    Object.values(additions).forEach((rosterId) => involved.add(String(rosterId)));
    Object.values(drops).forEach((rosterId) => involved.add(String(rosterId)));
    involved.forEach((rosterId) => {
      const profile = profiles.get(rosterId);
      if (!profile) return;
      if (["commissioner", "commish"].includes(type)) {
        profile.commissionerMovesExcluded += 1;
        return;
      }
      profile.transactionCount += 1;
      profile.transactionWeeksActive.add(Number(transaction._week || 0));
      if (Number(transaction._week || 0) <= Math.max(1, Math.floor(Number(season.regularSeasonWeeks || 14) / 2))) profile.earlySeasonActivity += 1;
      else profile.lateSeasonActivity += 1;
      const addedIds = Object.entries(additions).filter(([, targetRoster]) => String(targetRoster) === rosterId).map(([playerId]) => playerId);
      const droppedIds = Object.entries(drops).filter(([, targetRoster]) => String(targetRoster) === rosterId).map(([playerId]) => playerId);
      if (type === "waiver" && addedIds.length) {
        profile.waiverClaims += 1;
        const bid = Number(transaction.settings?.waiver_bid ?? transaction.waiver_bid);
        if (Number.isFinite(bid) && bid >= 0) {
          profile.faabSpent += bid;
          profile.faabBids.push(bid);
        }
      } else if (["free_agent", "free agent"].includes(type)) {
        profile.freeAgentAdds += addedIds.length;
      } else if (type === "trade") {
        profile.trades += 1;
        involved.forEach((partner) => {
          if (partner === rosterId) return;
          profile.tradePartners[partner] = (profile.tradePartners[partner] || 0) + 1;
        });
      }
      profile.drops += droppedIds.length;
      addedIds.forEach((playerId) => {
        const position = v160PlayerPosition(playerCatalog, playerId);
        profile.positionAdded[position] = (profile.positionAdded[position] || 0) + 1;
      });
      droppedIds.forEach((playerId) => {
        const position = v160PlayerPosition(playerCatalog, playerId);
        profile.positionDropped[position] = (profile.positionDropped[position] || 0) + 1;
      });
    });
  });
  profiles.forEach((profile) => {
    profile.transactionWeeksActive = [...profile.transactionWeeksActive].filter(Boolean).sort((a, b) => a - b);
    profile.averageFaabBid = profile.faabBids.length ? v160Mean(profile.faabBids) : null;
    profile.highestFaabBid = profile.faabBids.length ? Math.max(...profile.faabBids) : null;
    profile.duplicateTransactionsExcluded = deduped.duplicates;
    delete profile.faabBids;
  });
  return profiles;
}

function v160DraftedPlayersForUser(season, userId) {
  const primaryDraftId = String(season?.draft?.draft_id || "");
  return v160Array(season?.picks)
    .filter((pick) => !primaryDraftId || String(pick._draftId || primaryDraftId) === primaryDraftId)
    .filter((pick) => v160UserIdForPick(season, pick) === String(userId || ""))
    .sort((a, b) => Number(a.pick_no || 0) - Number(b.pick_no || 0));
}

function v160StarterCount(season) {
  const benchSlots = new Set(["BN", "BE", "IR", "TAXI", "RESERVE"]);
  return v160Array(season?.rosterPositions).filter((slot) => !benchSlots.has(String(slot))).length;
}

function v160SeasonResults(season, playerCatalog) {
  const regularWeeks = v160Array(season.weeklyMatchups).filter((week) => Number(week.week) <= Number(season.regularSeasonWeeks || 0));
  const flattened = regularWeeks.flatMap((week) => v160Array(week.records).map((record) => ({ ...record, _week: Number(week.week) })));
  const deduped = v160DeduplicateRows(flattened, (record) => `${record._week}|${record.roster_id}|${record.matchup_id ?? "bye"}`);
  const byRoster = new Map(v160Array(season.rosters).map((roster) => [String(roster.roster_id || ""), {
    weeklyScores: [],
    pointsAgainst: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    allPlayWins: 0,
    allPlayLosses: 0,
    allPlayTies: 0,
    expectedWins: 0,
    medianGameWins: 0,
  }]));
  const rowsByWeek = new Map();
  deduped.rows.forEach((record) => {
    if (!rowsByWeek.has(record._week)) rowsByWeek.set(record._week, []);
    const score = v160SleeperPoints(record);
    if (!Number.isFinite(score)) return;
    rowsByWeek.get(record._week).push({ ...record, score, rosterId: String(record.roster_id || "") });
    const aggregate = byRoster.get(String(record.roster_id || ""));
    if (aggregate) aggregate.weeklyScores.push({ week: record._week, score });
  });
  rowsByWeek.forEach((weekRows) => {
    const weekMedian = v160Median(weekRows.map((row) => row.score));
    weekRows.forEach((row) => {
      const aggregate = byRoster.get(row.rosterId);
      if (!aggregate) return;
      weekRows.forEach((opponent) => {
        if (opponent.rosterId === row.rosterId) return;
        if (row.score > opponent.score) aggregate.allPlayWins += 1;
        else if (row.score < opponent.score) aggregate.allPlayLosses += 1;
        else aggregate.allPlayTies += 1;
      });
      const denominator = Math.max(1, weekRows.length - 1);
      aggregate.expectedWins += (weekRows.filter((opponent) => opponent.rosterId !== row.rosterId && row.score > opponent.score).length
        + (weekRows.filter((opponent) => opponent.rosterId !== row.rosterId && row.score === opponent.score).length * 0.5)) / denominator;
      if (Number.isFinite(weekMedian)) aggregate.medianGameWins += row.score > weekMedian ? 1 : row.score === weekMedian ? 0.5 : 0;
    });
    const matchupGroups = new Map();
    weekRows.forEach((row) => {
      const matchupId = row.matchup_id;
      if (matchupId === null || matchupId === undefined) return;
      if (!matchupGroups.has(String(matchupId))) matchupGroups.set(String(matchupId), []);
      matchupGroups.get(String(matchupId)).push(row);
    });
    matchupGroups.forEach((matchup) => {
      if (matchup.length < 2) return;
      const top = Math.max(...matchup.map((row) => row.score));
      const bottom = Math.min(...matchup.map((row) => row.score));
      matchup.forEach((row) => {
        const aggregate = byRoster.get(row.rosterId);
        if (!aggregate) return;
        const opponents = matchup.filter((opponent) => opponent.rosterId !== row.rosterId);
        aggregate.pointsAgainst += opponents.reduce((sum, opponent) => sum + opponent.score, 0) / Math.max(1, opponents.length);
        if (top === bottom) aggregate.ties += 1;
        else if (row.score === top) aggregate.wins += 1;
        else aggregate.losses += 1;
      });
    });
  });

  const usersById = v160SeasonUsersById(season);
  const transactions = v160TransactionProfiles(season, playerCatalog);
  const matchupCoverageComplete = Boolean(season.coverage?.matchups)
    && regularWeeks.length === Number(season.regularSeasonWeeks || 0)
    && rowsByWeek.size === Number(season.regularSeasonWeeks || 0);
  const medianEnabled = Boolean(season.settings?.league_average_match || season.settings?.median_match);
  const totalTeams = Number(season.league?.total_rosters || season.rosters.length || 0);
  return v160Array(season.rosters).map((roster) => {
    const rosterId = String(roster.roster_id || "");
    const userId = String(roster.owner_id || "");
    const user = usersById.get(userId);
    const aggregate = byRoster.get(rosterId) || { weeklyScores: [], wins: 0, losses: 0, ties: 0, allPlayWins: 0, allPlayLosses: 0, expectedWins: 0, pointsAgainst: 0, medianGameWins: 0 };
    const scores = aggregate.weeklyScores.map((row) => row.score);
    const rosterWins = Number(roster.settings?.wins);
    const rosterLosses = Number(roster.settings?.losses);
    const rosterTies = Number(roster.settings?.ties);
    const wins = matchupCoverageComplete ? aggregate.wins : Number.isFinite(rosterWins) ? rosterWins : aggregate.wins;
    const losses = matchupCoverageComplete ? aggregate.losses : Number.isFinite(rosterLosses) ? rosterLosses : aggregate.losses;
    const ties = matchupCoverageComplete ? aggregate.ties : Number.isFinite(rosterTies) ? rosterTies : aggregate.ties;
    const expectedWins = matchupCoverageComplete ? aggregate.expectedWins : null;
    const scheduleLuckWins = Number.isFinite(expectedWins) ? wins - expectedWins : null;
    const bracket = v160BracketFacts(season, rosterId);
    const fallbackPlace = Number(roster.settings?.rank || roster.settings?.final_place);
    const finalPlace = bracket.finalPlace || (Number.isFinite(fallbackPlace) ? fallbackPlace : null);
    const drafted = v160DraftedPlayersForUser(season, userId);
    const finalPlayers = new Set(v160Array(roster.players).map(String));
    const retained = drafted.filter((pick) => finalPlayers.has(String(pick.player_id || "")));
    const starterDrafted = drafted.slice(0, Math.max(1, v160StarterCount(season)));
    const retainedStarters = starterDrafted.filter((pick) => finalPlayers.has(String(pick.player_id || "")));
    const transaction = transactions.get(rosterId) || {};
    const limitations = [];
    if (!matchupCoverageComplete) limitations.push("Expected wins and schedule luck are withheld because regular-season matchup coverage is incomplete.");
    if (!bracket.verified) limitations.push("Playoff and final-place results use an unverified roster-summary fallback where available.");
    if (!season.coverage?.transactions) limitations.push("Transaction totals may be incomplete.");
    return {
      season: String(season.season || ""),
      leagueId: String(season.leagueId || ""),
      userId,
      rosterId,
      displayName: v160UserName(user),
      teamName: v160TeamLabel(user, roster),
      wins,
      losses,
      ties,
      headToHeadWins: wins,
      pointsFor: scores.length ? scores.reduce((sum, score) => sum + score, 0) : v160SleeperPoints(roster),
      pointsAgainst: aggregate.pointsAgainst || null,
      averageWeeklyScore: v160Mean(scores),
      medianWeeklyScore: v160Median(scores),
      highestWeeklyScore: scores.length ? Math.max(...scores) : null,
      lowestWeeklyScore: scores.length ? Math.min(...scores) : null,
      scoreVolatility: v160Deviation(scores),
      allPlayWins: aggregate.allPlayWins,
      allPlayLosses: aggregate.allPlayLosses,
      expectedWins,
      scheduleLuckWins,
      scheduleLuckRating: v160ScheduleLuckRating(scheduleLuckWins),
      playoffQualified: bracket.verified ? bracket.playoffQualified : Number.isFinite(finalPlace) ? finalPlace <= Number(season.settings?.playoff_teams || 0) : null,
      playoffSeed: v160Number(roster.settings?.rank),
      finalPlace,
      finalPlaceVerified: bracket.verified && Number.isFinite(bracket.finalPlace),
      championshipAppearance: bracket.verified ? bracket.championshipAppearance : null,
      championshipWin: bracket.verified ? bracket.championshipWin : null,
      topThreeFinish: Number.isFinite(finalPlace) ? finalPlace <= 3 : null,
      lastPlaceFinish: bracket.verified && Number.isFinite(finalPlace) ? finalPlace === totalTeams : null,
      divisionFinish: v160Number(roster.settings?.division_rank),
      medianGameWins: medianEnabled ? aggregate.medianGameWins : null,
      waiverClaims: Number(transaction.waiverClaims || 0),
      freeAgentAdds: Number(transaction.freeAgentAdds || 0),
      drops: Number(transaction.drops || 0),
      trades: Number(transaction.trades || 0),
      transactionCount: Number(transaction.transactionCount || 0),
      faabSpent: Number(transaction.faabSpent || 0),
      averageFaabBid: v160Number(transaction.averageFaabBid),
      highestFaabBid: v160Number(transaction.highestFaabBid),
      transactionWeeksActive: v160Array(transaction.transactionWeeksActive),
      earlySeasonActivity: Number(transaction.earlySeasonActivity || 0),
      lateSeasonActivity: Number(transaction.lateSeasonActivity || 0),
      positionAdded: transaction.positionAdded || {},
      positionDropped: transaction.positionDropped || {},
      tradePartners: transaction.tradePartners || {},
      commissionerMovesExcluded: Number(transaction.commissionerMovesExcluded || 0),
      draftedPlayers: drafted.length,
      draftedPlayersRetained: retained.length,
      draftedPlayerRetentionRate: drafted.length ? retained.length / drafted.length : null,
      draftedStarterRetention: starterDrafted.length ? retainedStarters.length / starterDrafted.length : null,
      finalRosterTurnover: drafted.length ? 1 - (retained.length / drafted.length) : null,
      dataCoverage: {
        matchups: matchupCoverageComplete,
        transactions: Boolean(season.coverage?.transactions),
        playoffsVerified: bracket.verified,
        regularSeasonWeeks: rowsByWeek.size,
        expectedRegularSeasonWeeks: Number(season.regularSeasonWeeks || 0),
      },
      duplicateMatchupsExcluded: deduped.duplicates,
      limitations,
    };
  });
}

function v160PickPosition(pick) {
  return normalizePosition(pick?.metadata?.position || pick?.metadata?.pos || "");
}

function v160HistoricalMarketReference(season, pick) {
  const metadata = pick?.metadata || {};
  const pickTime = Number(metadata.adp || metadata.player_adp || metadata.overall_rank || pick.adp);
  if (Number.isFinite(pickTime) && pickTime > 0) return { value: pickTime, type: "Pick-time" };
  const name = sleeperPickPlayerName(pick);
  const position = v160PickPosition(pick);
  const baseline = historicalAdpForPlayer(season?.season, name, position);
  const value = Number(baseline?.adp);
  if (Number.isFinite(value) && value > 0) return { value, type: "Season baseline" };
  return { value: null, type: "Unavailable" };
}

function v160FirstRoundForPosition(picks, position) {
  const row = v160Array(picks).find((pick) => v160PickPosition(pick) === position);
  return row ? Number(row.round || 0) : null;
}

function v160DraftStrategy(picks) {
  const firstThree = v160Array(picks).filter((pick) => Number(pick.round || 0) <= 3);
  const firstFive = v160Array(picks).filter((pick) => Number(pick.round || 0) <= 5);
  const count = (rows, position) => rows.filter((pick) => v160PickPosition(pick) === position).length;
  const firstQb = v160FirstRoundForPosition(picks, "QB");
  const firstTe = v160FirstRoundForPosition(picks, "TE");
  const tags = [];
  if (count(firstFive, "RB") === 0) tags.push("Zero RB");
  if (count(firstThree, "RB") === 1 && count(firstThree, "WR") >= 1) tags.push("Hero RB");
  if (count(firstThree, "RB") >= 2) tags.push("Robust RB");
  if (count(firstThree, "WR") >= 2) tags.push("WR-heavy start");
  if (firstQb && firstQb <= 5) tags.push("Early QB");
  else tags.push("Late QB");
  if (firstTe && firstTe <= 5) tags.push("Early TE");
  else tags.push("Late TE");
  const primary = tags.find((tag) => ["Zero RB", "Hero RB", "Robust RB", "WR-heavy start"].includes(tag)) || "Balanced start";
  if (primary === "Balanced start") tags.unshift(primary);
  return { primary, tags: v160Unique(tags) };
}

function v160RunReactionForUser(season, userId) {
  const primaryDraftId = String(season?.draft?.draft_id || "");
  const rows = v160Array(season?.picks)
    .filter((pick) => !primaryDraftId || String(pick._draftId || primaryDraftId) === primaryDraftId)
    .sort((a, b) => Number(a.pick_no || 0) - Number(b.pick_no || 0));
  let opportunities = 0;
  let reactions = 0;
  rows.forEach((pick, index) => {
    if (v160UserIdForPick(season, pick) !== String(userId || "") || index < 2) return;
    const priorOne = v160PickPosition(rows[index - 1]);
    const priorTwo = v160PickPosition(rows[index - 2]);
    if (!priorOne || priorOne !== priorTwo) return;
    opportunities += 1;
    if (v160PickPosition(pick) === priorOne) reactions += 1;
  });
  return { opportunities, reactions, rate: opportunities ? reactions / opportunities : null };
}

function v160DraftSeasonJoins(seasons, seasonResults) {
  const resultBySeasonUser = new Map(v160Array(seasonResults).map((result) => [`${result.season}|${result.userId}`, result]));
  const joins = [];
  v160Array(seasons).forEach((season) => {
    const primaryDraftId = String(season?.draft?.draft_id || "");
    if (!primaryDraftId || !season.coverage?.picks) return;
    const primaryPicks = v160Array(season.picks)
      .filter((pick) => String(pick._draftId || primaryDraftId) === primaryDraftId)
      .sort((a, b) => Number(a.pick_no || 0) - Number(b.pick_no || 0));
    const byUser = new Map();
    primaryPicks.forEach((pick) => {
      const userId = v160UserIdForPick(season, pick);
      if (!userId) return;
      if (!byUser.has(userId)) byUser.set(userId, []);
      byUser.get(userId).push(pick);
    });
    byUser.forEach((picks, userId) => {
      const result = resultBySeasonUser.get(`${season.season}|${userId}`) || null;
      const strategy = v160DraftStrategy(picks);
      const positionCountsByRound = {};
      picks.forEach((pick) => {
        const round = Number(pick.round || 0);
        const position = v160PickPosition(pick);
        if (!round || !position) return;
        if (!positionCountsByRound[round]) positionCountsByRound[round] = {};
        positionCountsByRound[round][position] = (positionCountsByRound[round][position] || 0) + 1;
      });
      const references = picks.map((pick) => ({ pick, market: v160HistoricalMarketReference(season, pick) }))
        .filter((row) => Number.isFinite(row.market.value));
      const reaches = references.map((row) => Number(row.pick.pick_no || 0) - row.market.value);
      const firstRounds = Object.fromEntries(["QB", "RB", "WR", "TE"].map((position) => [position, v160FirstRoundForPosition(picks, position)]));
      const earlyPicks = picks.filter((pick) => Number(pick.round || 0) <= 5);
      const rookieExposure = earlyPicks.length
        ? earlyPicks.filter((pick) => Number(pick.metadata?.years_exp ?? pick.metadata?.yearsExperience) === 0).length / earlyPicks.length
        : null;
      const nflTeams = {};
      picks.forEach((pick) => {
        const team = String(pick.metadata?.team || "");
        if (!team) return;
        nflTeams[team] = (nflTeams[team] || 0) + 1;
      });
      const stackExposure = Object.values(nflTeams).filter((count) => count >= 2).length;
      const runReaction = v160RunReactionForUser(season, userId);
      const limitations = [];
      if (!result) limitations.push("No normalized season result matched this permanent user ID.");
      if (!season.coverage?.historicalAdp) limitations.push("Historical ADP is unavailable for some or all picks; current ADP was not substituted.");
      if (!result?.dataCoverage?.playoffsVerified) limitations.push("Final finish is not bracket-verified.");
      joins.push({
        season: String(season.season || ""),
        leagueId: String(season.leagueId || ""),
        userId,
        rosterId: result?.rosterId || String(v160Array(season.rosters).find((roster) => String(roster.owner_id || "") === userId)?.roster_id || picks[0]?.roster_id || ""),
        displayName: result?.displayName || v160UserName(v160SeasonUsersById(season).get(userId)),
        draftId: primaryDraftId,
        seasonComplete: season.status === "complete" && Boolean(result?.dataCoverage?.matchups),
        draftType: season.draft?.type || season.draft?.settings?.type || "unknown",
        draftSlot: Number(picks[0]?.draft_slot || ((Number(picks[0]?.pick_no || 1) - 1) % Math.max(1, Number(season.league?.total_rosters || 1))) + 1),
        draftStrategy: strategy.primary,
        strategyTags: strategy.tags,
        earlyRoundBuild: picks.filter((pick) => Number(pick.round || 0) <= 3).map(v160PickPosition).filter(Boolean).join("-") || "Unknown",
        firstQB: firstRounds.QB,
        firstTE: firstRounds.TE,
        firstRB: firstRounds.RB,
        firstWR: firstRounds.WR,
        positionCountsByRound,
        adpAggression: reaches.length ? -v160Mean(reaches) : null,
        historicalMarketReferences: references.length,
        marketReferenceTypes: v160Unique(references.map((row) => row.market.type)),
        runReactions: runReaction,
        rookieExposure,
        stackExposure,
        benchConstruction: {
          picksAfterStarterWindow: Math.max(0, picks.length - v160StarterCount(season)),
          positions: picks.slice(v160StarterCount(season)).reduce((counts, pick) => {
            const position = v160PickPosition(pick) || "Unknown";
            counts[position] = (counts[position] || 0) + 1;
            return counts;
          }, {}),
        },
        regularSeasonResult: result ? { wins: result.wins, losses: result.losses, ties: result.ties } : null,
        pointsResult: result?.pointsFor ?? null,
        expectedWinsResult: result?.expectedWins ?? null,
        scheduleLuckResult: result?.scheduleLuckWins ?? null,
        playoffResult: result?.playoffQualified ?? null,
        finalPlace: result?.finalPlace ?? null,
        championshipWin: result?.championshipWin ?? null,
        topThreeFinish: result?.topThreeFinish ?? null,
        lastPlaceFinish: result?.lastPlaceFinish ?? null,
        transactionProfile: result ? {
          waiverClaims: result.waiverClaims,
          freeAgentAdds: result.freeAgentAdds,
          trades: result.trades,
          transactionCount: result.transactionCount,
          faabSpent: result.faabSpent,
        } : null,
        rosterTurnover: result?.finalRosterTurnover ?? null,
        settingsFingerprint: season.settingsFingerprint,
        evidenceQuality: result?.dataCoverage?.matchups && result?.dataCoverage?.playoffsVerified ? "Complete season and verified playoffs" : result?.dataCoverage?.matchups ? "Complete regular season; playoff finish limited" : "Partial season evidence",
        limitations,
      });
    });
  });
  return joins;
}

function v160ConfidenceFramework({ observations = 0, seasons = 0, comparable = true, continuityConflict = false, heldOutPositive = false } = {}) {
  let sampleStatus = "Observation";
  let confidenceLevel = "Low";
  let score = Math.min(45, 24 + observations * 12);
  if (observations >= 2) {
    sampleStatus = "Emerging";
    confidenceLevel = "Moderate";
    score = Math.min(68, 42 + observations * 8);
  }
  if (observations >= 3 && seasons >= 2 && comparable && !continuityConflict) {
    sampleStatus = "Reliable";
    confidenceLevel = "Moderate";
    score = Math.min(78, 58 + observations * 3);
  }
  if (observations >= 6 && seasons >= 3 && comparable && !continuityConflict && heldOutPositive) {
    sampleStatus = "Strong";
    confidenceLevel = "High";
    score = Math.min(88, 72 + observations * 2);
  }
  if (!comparable) score = Math.min(score, 58);
  if (continuityConflict) {
    score = Math.min(score, 44);
    confidenceLevel = "Low";
  }
  return {
    confidenceLevel,
    confidenceScore: Math.round(score),
    sampleStatus,
    confidenceRule: sampleStatus === "Observation"
      ? "One qualifying event; not a tendency."
      : sampleStatus === "Emerging"
        ? "Two qualifying observations; possible pattern only."
        : sampleStatus === "Reliable"
          ? "At least three comparable observations across multiple seasons."
          : "Multiple comparable seasons with adequate evidence and positive held-out support.",
  };
}

function v160HistoricalStrategyOutcomes(joins) {
  const completed = v160Array(joins).filter((row) => row.seasonComplete !== false && Number.isFinite(row.pointsResult) && row.playoffResult !== null && row.playoffResult !== undefined);
  const groups = new Map();
  completed.forEach((row) => {
    v160Unique([row.draftStrategy, ...v160Array(row.strategyTags)]).forEach((strategy) => {
      if (!groups.has(strategy)) groups.set(strategy, []);
      groups.get(strategy).push(row);
    });
  });
  return [...groups.entries()].map(([strategy, rows]) => {
    const seasons = v160Unique(rows.map((row) => row.season));
    const managers = v160Unique(rows.map((row) => row.userId));
    const settingFingerprints = v160Unique(rows.map((row) => row.settingsFingerprint));
    const playoffAppearances = rows.filter((row) => row.playoffResult === true).length;
    const championshipAppearances = rows.filter((row) => Number(row.finalPlace) <= 2).length;
    const championships = rows.filter((row) => row.championshipWin === true).length;
    const topThreeFinishes = rows.filter((row) => row.topThreeFinish === true).length;
    const lastPlaceFinishes = rows.filter((row) => row.lastPlaceFinish === true).length;
    const expectedWinsRows = rows.map((row) => row.expectedWinsResult).filter(Number.isFinite);
    const confidence = v160ConfidenceFramework({
      observations: rows.length,
      seasons: seasons.length,
      comparable: settingFingerprints.length <= 1,
      heldOutPositive: false,
    });
    const limitations = ["Historical association does not prove that the strategy caused the outcome."];
    if (settingFingerprints.length > 1) limitations.push("League settings changed across qualifying team-seasons.");
    if (rows.length < 6) limitations.push("The sample is too small for a causal conclusion.");
    return {
      strategy,
      seasonsRepresented: seasons.length,
      seasons,
      teamsRepresented: managers.length,
      draftsRepresented: rows.length,
      qualifyingObservations: rows.length,
      averagePointsScored: v160Mean(rows.map((row) => row.pointsResult)),
      averageExpectedWins: v160Mean(expectedWinsRows),
      playoffAppearances,
      playoffRate: playoffAppearances / rows.length,
      championshipAppearances,
      championshipAppearanceRate: championshipAppearances / rows.length,
      championships,
      championshipRate: championships / rows.length,
      topThreeFinishes,
      topThreeRate: topThreeFinishes / rows.length,
      lastPlaceFinishes,
      lastPlaceRate: lastPlaceFinishes / rows.length,
      averageScheduleLuck: v160Mean(rows.map((row) => row.scheduleLuckResult).filter(Number.isFinite)),
      averageTransactionActivity: v160Mean(rows.map((row) => row.transactionProfile?.transactionCount).filter(Number.isFinite)),
      confidence,
      stability: settingFingerprints.length <= 1 && rows.length >= 3 ? "Comparable" : "Limited",
      evidenceClass: "Derived",
      limitations,
    };
  }).sort((a, b) => b.qualifyingObservations - a.qualifyingObservations || (b.averagePointsScored || 0) - (a.averagePointsScored || 0));
}

function v160EvidenceRecord(input) {
  const confidence = input.confidence || v160ConfidenceFramework({ observations: Number(input.observationCount || 0), seasons: v160Array(input.seasonsIncluded).length });
  return {
    insightId: input.insightId,
    insightType: input.insightType,
    subjectType: input.subjectType,
    subjectId: String(input.subjectId || ""),
    headline: input.headline,
    conclusion: input.conclusion,
    evidenceClass: input.evidenceClass,
    sourceTypes: v160Array(input.sourceTypes),
    seasonsIncluded: v160Array(input.seasonsIncluded),
    seasonsExcluded: v160Array(input.seasonsExcluded),
    draftsIncluded: Number(input.draftsIncluded || 0),
    qualifyingPickCount: Number(input.qualifyingPickCount || 0),
    qualifyingManagerCount: Number(input.qualifyingManagerCount || 0),
    qualifyingTeamSeasons: Number(input.qualifyingTeamSeasons || 0),
    observationCount: Number(input.observationCount || 0),
    historicalWindow: input.historicalWindow || "",
    roundWindow: input.roundWindow || "",
    pickWindow: input.pickWindow || "",
    contextFilters: input.contextFilters || {},
    recencyMethod: input.recencyMethod || "None",
    recencyWeights: input.recencyWeights || [],
    confidenceLevel: confidence.confidenceLevel,
    confidenceScore: confidence.confidenceScore,
    confidenceRule: confidence.confidenceRule,
    stabilityLevel: input.stabilityLevel || "Unknown",
    sampleStatus: confidence.sampleStatus,
    exclusions: v160Array(input.exclusions),
    limitations: v160Array(input.limitations),
    exceptions: v160Array(input.exceptions),
    recommendation: input.recommendation || "",
    draftImpact: input.draftImpact || "",
    reversalTriggers: v160Array(input.reversalTriggers),
    generatedAt: new Date().toISOString(),
    modelVersion: FDL_INTELLIGENCE_MODEL_VERSION,
  };
}

function v160BaseEvidenceLedger(seasons, results, strategies) {
  const completeSeasons = v160Array(seasons).filter((season) => season.importStatus?.status === "Complete");
  const excludedSeasons = v160Array(seasons).filter((season) => season.importStatus?.status !== "Complete").map((season) => season.season);
  const ledger = [];
  v160Array(strategies).forEach((strategy) => {
    ledger.push(v160EvidenceRecord({
      insightId: `historical-strategy-${playerKey(strategy.strategy)}`,
      insightType: "Historical strategy outcome",
      subjectType: "Strategy",
      subjectId: strategy.strategy,
      headline: `${strategy.strategy} historical outcomes`,
      conclusion: `${strategy.playoffAppearances} of ${strategy.qualifyingObservations} qualifying team-seasons made the playoffs.`,
      evidenceClass: "Derived",
      sourceTypes: ["Sleeper drafts", "Sleeper matchups", "Sleeper playoff brackets"],
      seasonsIncluded: strategy.seasons,
      seasonsExcluded: excludedSeasons,
      draftsIncluded: strategy.draftsRepresented,
      qualifyingManagerCount: strategy.teamsRepresented,
      qualifyingTeamSeasons: strategy.qualifyingObservations,
      observationCount: strategy.qualifyingObservations,
      historicalWindow: strategy.seasons.join("–"),
      confidence: strategy.confidence,
      stabilityLevel: strategy.stability,
      limitations: strategy.limitations,
      recommendation: "Use this association as one input alongside current rankings and simulations; do not force the strategy.",
      draftImpact: "Historical outcomes can support or challenge a current pre-draft plan without rewriting static player value.",
      reversalTriggers: ["League scoring or roster settings change", "Current simulations disagree", "The qualifying sample becomes non-comparable"],
    }));
  });
  const luckRows = v160Array(results).filter((row) => Number.isFinite(row.scheduleLuckWins));
  if (luckRows.length) {
    ledger.push(v160EvidenceRecord({
      insightId: "league-schedule-luck",
      insightType: "Season outcome context",
      subjectType: "League",
      subjectId: "league",
      headline: "Schedule luck separated from scoring strength",
      conclusion: `${luckRows.length} manager-seasons have complete all-play expected-win comparisons.`,
      evidenceClass: "Derived",
      sourceTypes: ["Sleeper weekly matchups"],
      seasonsIncluded: v160Unique(luckRows.map((row) => row.season)),
      seasonsExcluded: excludedSeasons,
      qualifyingManagerCount: v160Unique(luckRows.map((row) => row.userId)).length,
      qualifyingTeamSeasons: luckRows.length,
      observationCount: luckRows.length,
      confidence: v160ConfidenceFramework({ observations: luckRows.length, seasons: v160Unique(luckRows.map((row) => row.season)).length }),
      stabilityLevel: completeSeasons.length >= 3 ? "Multi-season" : "Limited",
      limitations: ["Expected wins measure weekly scoring strength against this league's active teams; they do not adjust for injuries or lineup mistakes."],
      recommendation: "Judge draft and manager quality using scoring, expected wins, and adaptation—not record alone.",
      draftImpact: "Avoid copying a strategy whose apparent success was mostly favorable scheduling.",
      reversalTriggers: ["A matchup week is missing", "Median-game settings change", "A scoring correction changes weekly results"],
    }));
  }
  return ledger;
}

function v160ValidationReport(importData) {
  const issues = [];
  const checks = [];
  const seasons = v160Array(importData.historicalSeasons);
  const duplicateSeasons = seasons.length - new Set(seasons.map((season) => String(season.leagueId))).size;
  checks.push({ id: "duplicate-seasons", passed: duplicateSeasons === 0, detail: `${duplicateSeasons} duplicate league-season records.` });
  if (duplicateSeasons) issues.push({ severity: "Error", rule: "Duplicate seasons", detail: `${duplicateSeasons} duplicate season records detected.` });
  let duplicatePicks = 0;
  let duplicateMatchups = 0;
  let duplicateTransactions = 0;
  seasons.forEach((season) => {
    const pickKeys = v160Array(season.picks).map((pick) => `${pick._draftId || season.draft?.draft_id || ""}|${pick.pick_no || ""}`);
    duplicatePicks += pickKeys.length - new Set(pickKeys).size;
    duplicateMatchups += v160Array(importData.seasonResults).filter((row) => row.season === season.season).reduce((sum, row) => sum + Number(row.duplicateMatchupsExcluded || 0), 0);
    const txIds = v160Array(season.weeklyTransactions).flatMap((week) => v160Array(week.records).map((tx) => String(tx.transaction_id || ""))).filter(Boolean);
    duplicateTransactions += txIds.length - new Set(txIds).size;
  });
  checks.push({ id: "duplicate-picks", passed: duplicatePicks === 0, detail: `${duplicatePicks} duplicate draft picks.` });
  checks.push({ id: "duplicate-matchups", passed: duplicateMatchups === 0, detail: `${duplicateMatchups} duplicate matchup rows excluded.` });
  checks.push({ id: "duplicate-transactions", passed: duplicateTransactions === 0, detail: `${duplicateTransactions} duplicate transactions found before de-duplication.` });
  if (duplicatePicks) issues.push({ severity: "Error", rule: "Duplicate draft picks", detail: `${duplicatePicks} duplicate pick keys remain.` });
  const badHistoricalMarket = v160Array(importData.draftSeasonJoins).some((row) => v160Array(row.marketReferenceTypes).includes("Current directional"));
  checks.push({ id: "historical-adp", passed: !badHistoricalMarket, detail: badHistoricalMarket ? "Current ADP entered a historical join." : "Historical joins use pick-time or same-season baselines only." });
  if (badHistoricalMarket) issues.push({ severity: "Error", rule: "Current ADP used as historical ADP", detail: "A historical join contains a current directional reference." });
  const mergedIdentity = v160Array(importData.managerContinuity)
    .filter((row) => row.continuityStatus === "Replacement owner")
    .some((row) => row.previousUserId && row.previousUserId === row.userId);
  checks.push({ id: "owner-continuity", passed: !mergedIdentity, detail: "Draft and outcome joins use permanent Sleeper user_id." });
  if (mergedIdentity) issues.push({ severity: "Error", rule: "Replacement-owner history merged incorrectly", detail: "A former and replacement owner share an analytical identity." });
  const incompleteInStrategy = v160Array(importData.historicalStrategyOutcomes).some((strategy) => v160Array(strategy.seasons).some((seasonKey) => seasons.find((season) => season.season === seasonKey)?.status !== "complete"));
  checks.push({ id: "completed-seasons-only", passed: !incompleteInStrategy, detail: "Historical strategy rates exclude incomplete seasons." });
  if (incompleteInStrategy) issues.push({ severity: "Error", rule: "Incomplete seasons treated as completed", detail: "An incomplete season entered historical success rates." });
  const missingTriggers = v160Array(importData.evidenceLedger).filter((record) => record.recommendation && !v160Array(record.reversalTriggers).length);
  checks.push({ id: "reversal-triggers", passed: !missingTriggers.length, detail: `${missingTriggers.length} actionable evidence records lack reversal triggers.` });
  if (missingTriggers.length) issues.push({ severity: "Error", rule: "Recommendations without reversal triggers", detail: `${missingTriggers.length} ledger records require a trigger.` });
  const highBelowMinimum = v160Array(importData.evidenceLedger).filter((record) => record.confidenceLevel === "High" && Number(record.observationCount || 0) < 6);
  checks.push({ id: "confidence-minimum", passed: !highBelowMinimum.length, detail: `${highBelowMinimum.length} high-confidence records fall below minimum evidence.` });
  if (highBelowMinimum.length) issues.push({ severity: "Error", rule: "High confidence below minimum evidence", detail: `${highBelowMinimum.length} records violate the confidence guardrail.` });
  const unverifiedPlayoffs = v160Array(importData.seasonResults).filter((result) => result.finalPlace && !result.finalPlaceVerified);
  checks.push({ id: "playoff-verification", passed: true, detail: `${unverifiedPlayoffs.length} fallback finishes are explicitly labeled unverified.` });
  const incompleteExpectedWins = v160Array(importData.seasonResults).filter((result) => !result.dataCoverage?.matchups && (Number.isFinite(result.expectedWins) || Number.isFinite(result.scheduleLuckWins)));
  checks.push({ id: "expected-wins-coverage", passed: !incompleteExpectedWins.length, detail: `${incompleteExpectedWins.length} incomplete results expose expected wins or schedule luck.` });
  if (incompleteExpectedWins.length) issues.push({ severity: "Error", rule: "Expected wins calculated from incomplete matchup weeks", detail: `${incompleteExpectedWins.length} results must withhold expected wins.` });
  const draftTypes = v160Unique(v160Array(importData.draftSeasonJoins).map((row) => row.draftType));
  checks.push({ id: "draft-type-context", passed: true, detail: `${draftTypes.length} draft type${draftTypes.length === 1 ? "" : "s"} retained: ${draftTypes.join(", ") || "unknown"}. Mixed formats are limited through setting fingerprints.` });
  const settingFingerprints = v160Unique(seasons.filter((season) => season.status === "complete").map((season) => season.settingsFingerprint));
  checks.push({ id: "settings-comparability", passed: true, detail: `${settingFingerprints.length} distinct complete-season setting context${settingFingerprints.length === 1 ? "" : "s"}; strategy confidence is capped when contexts differ.` });
  const commissionerMoves = v160Array(importData.seasonResults).reduce((sum, result) => sum + Number(result.commissionerMovesExcluded || 0), 0);
  checks.push({ id: "commissioner-moves", passed: true, detail: `${commissionerMoves} commissioner move${commissionerMoves === 1 ? "" : "s"} excluded from manager activity.` });
  checks.push({ id: "simulation-separation", passed: true, detail: "Historical strategy outcomes are stored separately from current bulk simulation summaries." });
  checks.push({ id: "median-win-separation", passed: true, detail: "Head-to-head wins and median-game wins use separate fields." });
  return {
    status: issues.some((issue) => issue.severity === "Error") ? "Review required" : "Passed",
    generatedAt: new Date().toISOString(),
    checks,
    issues,
  };
}

function v160ResumeKey(leagueId) {
  return `fantasyDraftLabIntelligenceResumeV1:${String(leagueId || "")}`;
}

function v160PersistResume(leagueId, seasons, diagnostics) {
  try {
    localStorage.setItem(v160ResumeKey(leagueId), JSON.stringify({
      leagueId: String(leagueId || ""),
      seasons: v160Array(seasons),
      diagnostics: v160Array(diagnostics).slice(-500),
      savedAt: new Date().toISOString(),
    }));
  } catch {
    // A full browser storage bucket must not interrupt the import itself.
  }
}

function v160LoadResume(leagueId) {
  try {
    const value = JSON.parse(localStorage.getItem(v160ResumeKey(leagueId)) || "null");
    return value?.leagueId === String(leagueId || "") ? value : null;
  } catch {
    return null;
  }
}

function v160ClearResume(leagueId) {
  try { localStorage.removeItem(v160ResumeKey(leagueId)); } catch { /* no-op */ }
}

const v160LoadLeagueHistoryBase = v160LoadLeagueHistory;
v160LoadLeagueHistory = async function v160LoadLeagueHistoryWithResume(initialLeague, existingSeasons, diagnostics, signal) {
  const seasons = [];
  const seen = new Set();
  let cursor = initialLeague;
  for (let depth = 0; cursor?.league_id && depth < FDL_INTELLIGENCE_MAX_SEASONS; depth += 1) {
    if (signal?.aborted) throw v160AbortError();
    const leagueId = String(cursor.league_id);
    if (seen.has(leagueId)) break;
    seen.add(leagueId);
    v160SetImportProgress("Loading league history", depth + 1, FDL_INTELLIGENCE_MAX_SEASONS, String(cursor.season || ""));
    const cached = v160CachedSeason(existingSeasons, leagueId);
    const season = cached || await v160LoadHistoricalSeason(cursor, diagnostics, signal);
    if (cached) diagnostics.push(...v160CachedDiagnostics(cached));
    seasons.push(season);
    v160PersistResume(initialLeague.league_id, seasons, diagnostics);
    const previousLeagueId = String(cursor.previous_league_id || season.previousLeagueId || "");
    if (!previousLeagueId) break;
    cursor = await v160FetchEndpoint(`/league/${encodeURIComponent(previousLeagueId)}`, {
      season: Number(cursor.season || 0) - 1,
      endpoint: "league",
      diagnostics,
      signal,
    });
  }
  return seasons.sort((a, b) => Number(b.season || 0) - Number(a.season || 0));
};

currentTeamForHistoricalPick = function currentTeamForHistoricalPickV160(pick, currentRosters, historicalRosters) {
  const historicalByRoster = new Map(v160Array(historicalRosters).map((roster) => [String(roster.roster_id || ""), roster]));
  const currentByUser = new Map(v160Array(currentRosters).map((roster) => [String(roster.owner_id || ""), roster]));
  const pickedBy = String(pick?.picked_by || "");
  const historicalRoster = historicalByRoster.get(String(pick?.roster_id || ""));
  const historicalUserId = String(historicalRoster?.owner_id || pickedBy || "");
  const currentRoster = currentByUser.get(historicalUserId);
  return currentRoster ? appTeamForSleeperRosterId(currentRosters, currentRoster.roster_id) : null;
};

function v160LeagueDraftAggregate(seasons, fallbackLeague = {}) {
  const aggregate = {
    ...fallbackLeague,
    draftsAnalyzed: 0,
    picksAnalyzed: 0,
    positionRounds: {},
    positionRoundCounts: {},
    positionCounts: {},
    firstRoundPositions: {},
    reachByPosition: {},
    seasonStats: [],
    marketReference: { historicalCount: 0, pickMetadataCount: 0, baselineCount: 0, directionalCount: 0, unavailableCount: 0 },
  };
  v160Array(seasons).forEach((season) => {
    const primaryDraftId = String(season?.draft?.draft_id || "");
    const picks = v160Array(season?.picks).filter((pick) => !primaryDraftId || String(pick._draftId || primaryDraftId) === primaryDraftId);
    if (!picks.length) return;
    aggregate.draftsAnalyzed += 1;
    const seasonStats = { season: String(season.season || ""), name: season.leagueName, picks: 0, positionCounts: {}, positionRoundCounts: {}, reachByPosition: {}, recencyWeight: 1 };
    picks.forEach((pick) => {
      const position = v160PickPosition(pick);
      const round = Number(pick.round || 0);
      const pickNo = Number(pick.pick_no || 0);
      if (!position || !round || !pickNo) return;
      const reference = v160HistoricalMarketReference(season, pick);
      const reach = Number.isFinite(reference.value) ? pickNo - reference.value : null;
      aggregate.picksAnalyzed += 1;
      seasonStats.picks += 1;
      aggregate.positionCounts[position] = (aggregate.positionCounts[position] || 0) + 1;
      seasonStats.positionCounts[position] = (seasonStats.positionCounts[position] || 0) + 1;
      if (!aggregate.positionRoundCounts[round]) aggregate.positionRoundCounts[round] = {};
      if (!seasonStats.positionRoundCounts[round]) seasonStats.positionRoundCounts[round] = {};
      aggregate.positionRoundCounts[round][position] = (aggregate.positionRoundCounts[round][position] || 0) + 1;
      seasonStats.positionRoundCounts[round][position] = (seasonStats.positionRoundCounts[round][position] || 0) + 1;
      if (!aggregate.positionRounds[position]) aggregate.positionRounds[position] = [];
      aggregate.positionRounds[position].push(round);
      if (round === 1) aggregate.firstRoundPositions[position] = (aggregate.firstRoundPositions[position] || 0) + 1;
      if (!aggregate.reachByPosition[position]) aggregate.reachByPosition[position] = { count: 0, sum: 0, ahead: 0, near: 0, after: 0 };
      if (!seasonStats.reachByPosition[position]) seasonStats.reachByPosition[position] = { count: 0, sum: 0, ahead: 0, near: 0, after: 0 };
      if (Number.isFinite(reach)) {
        [aggregate.reachByPosition[position], seasonStats.reachByPosition[position]].forEach((row) => {
          row.count += 1;
          row.sum += reach;
          if (reach <= -4) row.ahead += 1;
          else if (reach >= 4) row.after += 1;
          else row.near += 1;
        });
        aggregate.marketReference.historicalCount += 1;
        if (reference.type === "Pick-time") aggregate.marketReference.pickMetadataCount += 1;
        else aggregate.marketReference.baselineCount += 1;
      } else {
        aggregate.marketReference.unavailableCount += 1;
      }
    });
    aggregate.seasonStats.push(seasonStats);
  });
  return aggregate;
}

function v160ScoutingHistory(seasons) {
  return v160Array(seasons).map((season) => ({
    leagueId: season.leagueId,
    name: season.leagueName,
    season: season.season,
    rosters: season.rosters,
    draft: season.draft,
    picks: v160Array(season.picks).filter((pick) => !season.draft?.draft_id || String(pick._draftId || season.draft.draft_id) === String(season.draft.draft_id)),
  }));
}

function v160EnrichScoutingReport(report, importData) {
  const seasons = v160Array(importData?.historicalSeasons);
  const continuity = v160Array(importData?.managerContinuity);
  const joins = v160Array(importData?.draftSeasonJoins);
  const results = v160Array(importData?.seasonResults);
  report.league = {
    ...v160LeagueDraftAggregate(seasons, report.league),
    completeSeasonCount: seasons.filter((season) => season.importStatus?.status === "Complete").length,
    partialSeasonCount: seasons.filter((season) => season.importStatus?.status !== "Complete").length,
    matchupRecordCount: seasons.reduce((sum, season) => sum + v160Array(season.weeklyMatchups).reduce((weekSum, week) => weekSum + v160Array(week.records).length, 0), 0),
    transactionRecordCount: seasons.reduce((sum, season) => sum + v160Array(season.weeklyTransactions).reduce((weekSum, week) => weekSum + v160Array(week.records).length, 0), 0),
    identityAudit: importData?.managerIdentityAudit || null,
  };
  report.seasons = seasons.filter((season) => season.coverage?.picks).map((season) => ({ season: season.season, name: season.leagueName, picks: v160Array(season.picks).length }));
  report.teams = report.teams.map((profile, index) => {
    const importedTeam = importData?.teams?.[index] || {};
    const userId = String(importedTeam.sleeperOwnerId || "");
    const identityRows = continuity.filter((row) => row.userId === userId);
    const lastIdentity = [...identityRows].sort((a, b) => Number(b.season || 0) - Number(a.season || 0))[0] || null;
    const managerJoins = joins.filter((row) => row.userId === userId);
    return {
      ...profile,
      userId,
      continuityStatus: lastIdentity?.continuityStatus || "Missing user record",
      continuityConfidence: lastIdentity?.continuityConfidence || "Low",
      identityHistory: identityRows,
      outcomeHistory: results.filter((row) => row.userId === userId),
      draftSeasonJoins: managerJoins,
      settingsChanged: v160Unique(managerJoins.map((row) => row.settingsFingerprint)).length > 1,
    };
  });
  return normalizeScoutingReport(report, LEAGUE.teams);
}

function v160BuildScoutingReport(seasons, currentRosters, importData = null) {
  const base = buildScoutingReport(v160ScoutingHistory(seasons), currentRosters);
  return importData ? v160EnrichScoutingReport(base, importData) : base;
}

function v160KeeperSource(seasons) {
  return v160Array(seasons).find((season) => sleeperRosterPlayerCount(season.rosters) > 0 && sleeperDraftHasPicks(season.picks)) || v160Array(seasons)[0];
}

function v160PrimaryPicks(season) {
  const draftId = String(season?.draft?.draft_id || "");
  return v160Array(season?.picks).filter((pick) => !draftId || String(pick._draftId || draftId) === draftId);
}

async function v160ImportSelectedSleeperLeague() {
  const leagueId = state.sleeper.selectedLeagueId || $("sleeperLeagueSelect")?.value;
  const requestedSeason = String($("sleeperSeasonInput")?.value || state.sleeper.season || SLEEPER_DEFAULT_SEASON);
  if (!leagueId) {
    state.sleeper.status = "Choose a Sleeper league to import.";
    renderSleeperImport();
    return;
  }
  if (state.sleeper.loading) return;
  state.sleeper.loading = true;
  state.sleeper.importProgress = { stage: "Loading league history", completed: 0, total: 0, detail: "", updatedAt: new Date().toISOString() };
  FDL_INTELLIGENCE_ABORT_CONTROLLER = new AbortController();
  FDL_INTELLIGENCE_REQUEST_CACHE.clear();
  const signal = FDL_INTELLIGENCE_ABORT_CONTROLLER.signal;
  const diagnostics = [];
  const previousImport = state.sleeper.importData;
  const resume = v160LoadResume(leagueId);
  const existingSeasons = [
    ...v160Array(previousImport?.historicalSeasons),
    ...v160Array(resume?.seasons),
  ];
  try {
    v160SetImportProgress("Loading league history", 0, 1, requestedSeason);
    const league = await v160FetchEndpoint(`/league/${encodeURIComponent(leagueId)}`, {
      season: requestedSeason,
      endpoint: "league",
      diagnostics,
      signal,
    });
    v160SetImportProgress("Loading player directory", 0, 1, "Used only to label imported player IDs and transaction positions");
    const playerCatalog = await v160FetchEndpoint("/players/nfl", {
      season: requestedSeason,
      endpoint: "NFL players",
      diagnostics,
      signal,
      optional: true,
    }) || {};
    const historicalSeasons = await v160LoadLeagueHistory(league, existingSeasons, diagnostics, signal);
    const currentSeason = historicalSeasons.find((season) => String(season.leagueId) === String(leagueId)) || historicalSeasons[0];
    if (!currentSeason) throw new Error("Sleeper returned no usable league season.");
    const rosters = currentSeason.rosters;
    const users = currentSeason.users;
    const draft = currentSeason.draft;
    const picks = v160PrimaryPicks(currentSeason);
    const appLeague = sleeperLeagueSettingsToApp(league, draft);
    LEAGUE = appLeague;
    const keeperSeason = v160KeeperSource(historicalSeasons);
    const keeperSource = {
      league: keeperSeason.league,
      rosters: keeperSeason.rosters,
      draft: keeperSeason.draft,
      picks: v160PrimaryPicks(keeperSeason),
      season: keeperSeason.season,
      usedPreviousLeague: keeperSeason.leagueId !== currentSeason.leagueId,
    };
    const coreImport = buildSleeperImportData({
      league,
      draft,
      rosters,
      users,
      keeperSource,
      sleeperPlayers: playerCatalog,
      season: String(league.season || requestedSeason),
      importedUserId: state.sleeper.userId,
    });

    v160SetImportProgress("Building season outcomes", 0, historicalSeasons.length, "All-play records, schedule luck, playoffs, and transactions");
    const continuity = v160ManagerContinuity(historicalSeasons);
    const seasonResults = [];
    historicalSeasons.forEach((season, index) => {
      seasonResults.push(...v160SeasonResults(season, playerCatalog));
      v160SetImportProgress("Building season outcomes", index + 1, historicalSeasons.length, season.season);
    });
    const draftSeasonJoins = v160DraftSeasonJoins(historicalSeasons, seasonResults);
    const historicalStrategyOutcomes = v160HistoricalStrategyOutcomes(draftSeasonJoins);
    const evidenceLedger = v160BaseEvidenceLedger(historicalSeasons, seasonResults, historicalStrategyOutcomes);
    const provisional = normalizeSleeperImport({
      ...coreImport,
      dataModelVersion: FDL_INTELLIGENCE_SCHEMA_VERSION,
      intelligenceModelVersion: FDL_INTELLIGENCE_MODEL_VERSION,
      historicalSeasons,
      managerContinuity: continuity.records,
      managerIdentityAudit: continuity.audit,
      seasonResults,
      draftSeasonJoins,
      historicalStrategyOutcomes,
      evidenceLedger,
      importDiagnostics: diagnostics,
      intelligenceGeneratedAt: new Date().toISOString(),
    }, appLeague.teams);

    v160SetImportProgress("Calibrating manager profiles", 0, 1, "Permanent user IDs only");
    provisional.scoutingReport = v160BuildScoutingReport(historicalSeasons, rosters, provisional);
    provisional.validationReport = v160ValidationReport(provisional);

    state.activeLeagueId = state.activeLeagueId || appLeague.id;
    state.teamNames = provisional.teams.map((team) => team.name);
    const importedUserTeam = provisional.teams.find((team) => team.sleeperOwnerId && team.sleeperOwnerId === state.sleeper.userId)?.team;
    state.userTeam = importedUserTeam || Math.min(state.userTeam, LEAGUE.teams);
    state.roomRosterTeam = state.userTeam;
    const tradedPicks = currentSeason.tradedPicks;
    state.roundOrders = resizeRoundOrders(applySleeperTradedPicksToRoundOrders(tradedPicks, rosters, currentSeason.season, draft));
    state.keeperSelections = normalizeKeeperSelections(state.keeperSelections);
    state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id);
    state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => state.personaSources?.[index] || "default");
    state.sleeper.importData = provisional;
    applyScoutingPersonasToTeams(provisional.scoutingReport);
    clearTradeFinderIdeas();
    const persisted = saveActiveLeagueProfile();
    setupTeamSelects();
    renderLeagueSettings();
    renderOrderEditor();
    resetDraft();
    v160ClearResume(leagueId);
    const complete = historicalSeasons.filter((season) => season.importStatus?.status === "Complete").length;
    const draftCount = historicalSeasons.filter((season) => season.coverage?.picks).length;
    state.sleeper.status = `Imported ${provisional.leagueName}: ${draftCount} historical draft${draftCount === 1 ? "" : "s"}, ${complete} complete season histor${complete === 1 ? "y" : "ies"}, ${provisional.scoutingReport.league.picksAnalyzed} qualifying picks, ${provisional.scoutingReport.league.matchupRecordCount} matchup records, and ${provisional.scoutingReport.league.transactionRecordCount} transactions.${persisted ? " Saved history was verified for reload." : " Warning: the browser did not persist this history; it will need to be imported again after reload."}`;
    state.sleeper.importProgress = { stage: "Complete", completed: 1, total: 1, detail: provisional.validationReport.status, updatedAt: new Date().toISOString() };
  } catch (error) {
    if (error?.name === "AbortError") {
      state.sleeper.status = "Sleeper intelligence import cancelled. Completed season downloads were saved and can be resumed.";
      state.sleeper.importProgress = { stage: "Cancelled", completed: 0, total: 0, detail: "Resume by importing the same league again.", updatedAt: new Date().toISOString() };
    } else {
      state.sleeper.status = `Sleeper intelligence import failed: ${error?.message || "Unknown error"}. Completed season downloads were retained for retry.`;
      state.sleeper.importProgress = { stage: "Failed", completed: 0, total: 0, detail: error?.message || "Unknown error", updatedAt: new Date().toISOString() };
    }
  } finally {
    state.sleeper.loading = false;
    FDL_INTELLIGENCE_ABORT_CONTROLLER = null;
    renderSleeperImport();
  }
}

function v160CancelImport() {
  if (FDL_INTELLIGENCE_ABORT_CONTROLLER) FDL_INTELLIGENCE_ABORT_CONTROLLER.abort();
}

const v153BehaviorConfidence = behaviorConfidence;
behaviorConfidence = function behaviorConfidenceV160(input = {}) {
  const result = v153BehaviorConfidence(input);
  const drafts = Number(input.drafts || 0);
  if (drafts <= 1) result.score = Math.min(result.score, 47);
  else if (drafts === 2) result.score = Math.min(result.score, 68);
  result.label = behaviorLevel(result.score);
  result.sampleStatus = drafts <= 1 ? "Observation" : drafts === 2 ? "Emerging" : drafts >= 4 && result.score >= 72 ? "Strong" : "Reliable";
  result.confidenceRule = result.sampleStatus === "Observation"
    ? "One qualifying draft; this is an observation, not a tendency."
    : result.sampleStatus === "Emerging"
      ? "Two qualifying drafts; this is an emerging pattern."
      : result.sampleStatus === "Reliable"
        ? "At least three qualifying drafts in comparable contexts."
        : "Multiple comparable seasons with stable evidence and supporting validation.";
  return result;
};

const v153BehaviorProfileConfidence = behaviorProfileConfidence;
behaviorProfileConfidence = function behaviorProfileConfidenceV160(profile, fallback = false) {
  const result = v153BehaviorProfileConfidence(profile, fallback);
  if (["Replacement owner", "Ambiguous identity", "Missing user record", "Unmatched historical manager"].includes(profile?.continuityStatus)) {
    result.score = Math.min(result.score, 44);
    result.label = behaviorLevel(result.score);
    result.sampleStatus = "Observation";
    result.explanation = `${result.explanation} Manager continuity limits this conclusion.`;
  }
  if (profile?.settingsChanged) {
    result.score = Math.min(result.score, 68);
    result.label = behaviorLevel(result.score);
    if (result.sampleStatus === "Strong") result.sampleStatus = "Reliable";
    result.explanation = `${result.explanation} League settings changed across the qualifying history.`;
  }
  return result;
};

const v160BehaviorLeagueConfidence = behaviorLeagueConfidence;
behaviorLeagueConfidence = function behaviorLeagueConfidenceV161(report) {
  const authority = v161IntelligenceAuthority(state.sleeper.importData);
  if (!authority.hasAuditableDraftHistory) {
    return {
      score: 0,
      label: authority.requiresRefresh ? "History refresh required" : "No verified history",
      sampleStatus: "Unavailable",
      explanation: "No confidence is calculated until season-level Sleeper draft records are present and auditable.",
    };
  }
  const result = v160BehaviorLeagueConfidence(report);
  if (!authority.hasCompleteOutcomeHistory) {
    return {
      ...result,
      score: Math.min(Number(result.score || 0), 68),
      label: "Draft-only evidence",
      sampleStatus: "Partial coverage",
      explanation: "Draft tendencies are available, but matchup-derived and outcome-derived conclusions are withheld until a complete season history loads.",
    };
  }
  return result;
};

function v160EvidenceClasses(value) {
  const supported = new Set(["Observed", "Derived", "Inferred", "Simulated", "Market-based"]);
  const values = Array.isArray(value) ? value : [value];
  return v160Unique(values.filter((item) => supported.has(item)));
}

const v153BehaviorInsight = behaviorInsight;
behaviorInsight = function behaviorInsightV160(options = {}) {
  const insight = v153BehaviorInsight(options);
  const evidenceClass = v160EvidenceClasses(options.evidenceClass || (
    String(insight.theme || "").startsWith("live-window") ? ["Inferred", "Market-based"]
      : String(insight.theme || "").startsWith("market-") ? ["Derived", "Market-based"]
        : String(insight.theme || "").startsWith("historical-strategy") ? ["Derived"]
          : ["Inferred"]
  ));
  const sampleStatus = insight.confidence.sampleStatus || (insight.evidenceCount <= 1 ? "Observation" : insight.evidenceCount <= 2 ? "Emerging" : "Reliable");
  const reversalTriggers = v160Unique([options.watchFor || insight.watchFor, ...v160Array(options.reversalTriggers)]).filter(Boolean);
  const evidenceRecord = v160EvidenceRecord({
    insightId: insight.id,
    insightType: options.insightType || "Draft-day edge",
    subjectType: options.subjectType || "League",
    subjectId: options.subjectId || insight.theme,
    headline: insight.headline,
    conclusion: insight.conclusion,
    evidenceClass: evidenceClass.join(" + "),
    sourceTypes: options.sourceTypes || [insight.baseline || "League history"],
    seasonsIncluded: insight.seasons,
    draftsIncluded: scoutingReport().league.draftsAnalyzed,
    qualifyingPickCount: insight.evidenceCount,
    qualifyingManagerCount: Number(options.qualifyingManagerCount || 0),
    qualifyingTeamSeasons: Number(options.qualifyingTeamSeasons || 0),
    observationCount: insight.evidenceCount,
    confidence: {
      confidenceLevel: insight.confidence.score >= 72 ? "High" : insight.confidence.score >= 48 ? "Moderate" : "Low",
      confidenceScore: insight.confidence.score,
      sampleStatus,
      confidenceRule: insight.confidence.confidenceRule || insight.confidence.explanation,
    },
    stabilityLevel: options.stabilityLevel || behaviorRecencySummary({ seasonStats: [] }),
    limitations: insight.limitations,
    recommendation: insight.recommendation,
    draftImpact: insight.draftImpact,
    reversalTriggers,
  });
  return { ...insight, evidenceClass, sampleStatus, reversalTriggers, evidenceRecord };
};

function v160EvidenceBadgeHtml(classes) {
  return `<span class="evidence-class-badges">${v160EvidenceClasses(classes).map((label) => `<span class="evidence-class evidence-${playerKey(label)}">${escapeHtml(label)}</span>`).join("")}</span>`;
}

renderBehaviorInsightCard = function renderBehaviorInsightCardV160(insight) {
  const sample = insight.sampleStatus || insight.confidence?.sampleStatus || "Observation";
  return `
    <details class="behavior-edge-card">
      <summary>
        <div class="behavior-edge-heading">
          <div class="behavior-edge-badges">
            <span class="impact-${insight.impact.score >= 72 ? "high" : insight.impact.score >= 48 ? "medium" : "low"}">${escapeHtml(insight.impact.label)}</span>
            <span>${escapeHtml(insight.confidence.label)} · ${escapeHtml(sample)}</span>
            ${v160EvidenceBadgeHtml(insight.evidenceClass)}
          </div>
          <h3>${escapeHtml(insight.headline)}</h3>
          <p>${escapeHtml(insight.conclusion)}</p>
          ${behaviorInsightVisual(insight)}
        </div>
        <span class="behavior-expand-label">View evidence</span>
      </summary>
      <div class="behavior-edge-details">
        <section><h4>Observation</h4><p>${escapeHtml(insight.conclusion)}</p></section>
        <section><h4>Evidence</h4><ul>${insight.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
        <section><h4>Interpretation</h4><p>${escapeHtml(insight.interpretation)}</p></section>
        <section><h4>Draft impact</h4><p>${escapeHtml(insight.draftImpact)}</p></section>
        <section class="behavior-response"><h4>Recommended response</h4><p>${escapeHtml(insight.recommendation)}</p></section>
        <section><h4>Reversal trigger</h4><ul>${v160Array(insight.reversalTriggers).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || `<li>${escapeHtml(insight.watchFor || "Re-evaluate when the underlying evidence changes.")}</li>`}</ul></section>
        ${insight.limitations.length ? `<section><h4>Limitations</h4><ul>${insight.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
        <details class="behavior-calculation"><summary>Audit this conclusion</summary><div>
          <p><strong>Evidence class:</strong> ${escapeHtml(v160Array(insight.evidenceClass).join(" + ") || "Inferred")}</p>
          <p><strong>Qualifying observations:</strong> ${insight.evidenceCount || 0}</p>
          <p><strong>Seasons:</strong> ${escapeHtml(insight.seasons?.join(", ") || "Not available")}</p>
          <p><strong>Baseline:</strong> ${escapeHtml(insight.baseline || "League history")}</p>
          <p><strong>Confidence rule:</strong> ${escapeHtml(insight.confidence.confidenceRule || insight.confidence.explanation || sample)}</p>
          <p><strong>Predictability:</strong> ${insight.predictability}% · ${escapeHtml(behaviorLevel(insight.predictability, "predictability"))}</p>
        </div></details>
      </div>
    </details>`;
};

function v160StrategyEdge(report) {
  const outcomes = v160Array(state.sleeper.importData?.historicalStrategyOutcomes)
    .filter((row) => row.qualifyingObservations >= 2 && Number.isFinite(row.averagePointsScored))
    .sort((a, b) => (b.averagePointsScored || 0) - (a.averagePointsScored || 0))[0];
  if (!outcomes) return null;
  const confidence = behaviorConfidence({
    drafts: outcomes.draftsRepresented,
    picks: outcomes.qualifyingObservations,
    consistency: Math.min(1, outcomes.playoffRate + 0.2),
    recency: 0.7,
  });
  return behaviorInsight({
    id: `historical-strategy-edge-${playerKey(outcomes.strategy)}`,
    theme: `historical-strategy-${outcomes.strategy}`,
    headline: `${outcomes.strategy} produced the strongest historical scoring association`,
    conclusion: `${outcomes.strategy} averaged ${outcomes.averagePointsScored.toFixed(1)} points across ${outcomes.qualifyingObservations} qualifying team-seasons; ${outcomes.playoffAppearances} of ${outcomes.qualifyingObservations} reached the playoffs.`,
    evidence: [
      `${outcomes.qualifyingObservations} qualifying team-seasons across ${outcomes.seasonsRepresented} season${outcomes.seasonsRepresented === 1 ? "" : "s"}.`,
      `${outcomes.playoffAppearances}/${outcomes.qualifyingObservations} playoff rate and ${outcomes.championships}/${outcomes.qualifyingObservations} championship rate.`,
      `${outcomes.averageExpectedWins === null ? "Expected wins unavailable for part of the sample." : `${outcomes.averageExpectedWins.toFixed(1)} average expected wins.`}`,
    ],
    interpretation: "This is a historical association, not proof that the opening caused the result.",
    draftImpact: "The strategy deserves consideration when current player value and roster settings also support it.",
    recommendation: `Treat ${outcomes.strategy} as a supported path, but keep taking superior tier value when the board presents it.`,
    watchFor: "Reverse the preference if current simulations disagree, league settings changed, or the strategy would require reaching past a clear value tier.",
    limitations: outcomes.limitations,
    confidence,
    impact: behaviorImpact({ round: 3, affectedManagers: outcomes.teamsRepresented, scarcity: 0.5 }),
    predictability: Math.min(80, 35 + outcomes.qualifyingObservations * 7),
    actionability: 72,
    evidenceCount: outcomes.qualifyingObservations,
    seasons: outcomes.seasons,
    baseline: "Completed Sleeper seasons only",
    evidenceClass: "Derived",
    sourceTypes: ["Sleeper drafts", "Sleeper matchups", "Sleeper playoff brackets"],
    qualifyingManagerCount: outcomes.teamsRepresented,
    qualifyingTeamSeasons: outcomes.qualifyingObservations,
  });
}

const v153BehaviorDraftDayEdges = behaviorDraftDayEdges;
behaviorDraftDayEdges = function behaviorDraftDayEdgesV160(report) {
  if (!v161IntelligenceAuthority(state.sleeper.importData).hasAuditableDraftHistory) return [];
  const rows = [...v153BehaviorDraftDayEdges(report), v160StrategyEdge(report)].filter(Boolean);
  const deduped = new Map();
  rows.forEach((row) => {
    const existing = deduped.get(row.theme);
    if (!existing || row.priority > existing.priority) deduped.set(row.theme, row);
  });
  return [...deduped.values()].sort((a, b) => b.priority - a.priority).slice(0, 5);
};

function v161IntelligenceAuthority(importData = state.sleeper.importData) {
  const seasons = v160Array(importData?.historicalSeasons);
  const draftSeasons = seasons.filter((season) => (
    Boolean(season?.coverage?.picks)
    && v160Array(season?.picks).some((pick) => pick?.player_id && Number(pick?.round) > 0)
  ));
  const completeOutcomeSeasons = seasons.filter((season) => (
    season?.status === "complete"
    && season?.importStatus?.status === "Complete"
    && Boolean(season?.coverage?.matchups)
  ));
  const cachedDrafts = Number(importData?.scoutingReport?.league?.draftsAnalyzed || 0);
  const cachedPicks = Number(importData?.scoutingReport?.league?.picksAnalyzed || 0);
  const requiresRefresh = Boolean(
    importData
    && !draftSeasons.length
    && (importData.historyRefreshRequired || cachedDrafts > 0 || cachedPicks > 0)
  );
  return {
    seasons,
    draftSeasons,
    completeOutcomeSeasons,
    hasAuditableDraftHistory: draftSeasons.length > 0,
    hasCompleteOutcomeHistory: completeOutcomeSeasons.length > 0,
    requiresRefresh,
    cachedDrafts,
    cachedPicks,
  };
}

function v160CoverageCell(value, partial = false) {
  const label = value ? "Yes" : partial ? "Partial" : "No";
  return `<span class="coverage-state coverage-${value ? "complete" : partial ? "partial" : "missing"}">${label}</span>`;
}

function v160SeasonCoverageSummary(importData = state.sleeper.importData) {
  const authority = v161IntelligenceAuthority(importData);
  const seasons = authority.seasons;
  const drafts = authority.draftSeasons.length;
  const complete = authority.completeOutcomeSeasons.length;
  const partialTransactions = seasons.filter((season) => season.status === "complete" && !season.coverage?.transactions).length;
  return `${drafts} historical draft${drafts === 1 ? "" : "s"} analyzed. Complete season outcomes available for ${complete} season${complete === 1 ? "" : "s"}.${partialTransactions ? ` Transaction history is incomplete for ${partialTransactions} season${partialTransactions === 1 ? "" : "s"}.` : ""}`;
}

function renderSeasonCoverageMap(importData = state.sleeper.importData) {
  const seasons = v160Array(importData?.historicalSeasons);
  if (!seasons.length) return `<section class="behavior-primary-section"><h3>Season Coverage Map</h3><p class="empty">No historical season objects are available.</p></section>`;
  const rows = seasons.map((season) => {
    const continuityIssues = v160Array(importData?.managerContinuity).filter((row) => row.season === season.season && ["Replacement owner", "Ambiguous identity", "Missing user record", "Unmatched historical manager"].includes(row.continuityStatus));
    return `<tr>
      <th scope="row"><strong>${escapeHtml(season.season)}</strong><small>${escapeHtml(season.leagueId)}</small></th>
      <td>${v160CoverageCell(season.coverage.league)}</td>
      <td>${v160CoverageCell(season.coverage.users)}</td>
      <td>${v160CoverageCell(season.coverage.rosters)}</td>
      <td>${v160CoverageCell(season.coverage.drafts && season.coverage.picks)}</td>
      <td>${v160CoverageCell(season.coverage.matchups, v160Array(season.weeklyMatchups).some((week) => week.records.length))}</td>
      <td>${v160CoverageCell(season.coverage.transactions, v160Array(season.weeklyTransactions).some((week) => week.records.length))}</td>
      <td>${v160CoverageCell(season.coverage.winnersBracket)}</td>
      <td>${v160CoverageCell(season.coverage.losersBracket)}</td>
      <td>${v160CoverageCell(season.coverage.historicalAdp)}</td>
      <td>${continuityIssues.length ? `<span class="coverage-state coverage-partial">${continuityIssues.length} review</span>` : `<span class="coverage-state coverage-complete">Matched</span>`}</td>
      <td><details><summary>${season.warnings.length ? `${season.warnings.length} warning${season.warnings.length === 1 ? "" : "s"}` : "None"}</summary><ul>${season.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("") || "<li>No coverage warning.</li>"}${season.exclusions.map((reason) => `<li><strong>Excluded:</strong> ${escapeHtml(reason)}</li>`).join("")}</ul></details></td>
    </tr>`;
  }).join("");
  return `<section class="behavior-primary-section season-coverage-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">League History</p><h3>Season Coverage Map</h3></div><span>${escapeHtml(v160SeasonCoverageSummary(importData))}</span></div>
    <p class="behavior-conclusion"><strong>Plain-language conclusion:</strong> A draft is counted separately from a complete season. Matchup-derived and transaction-derived conclusions use only the seasons marked complete for those sources.</p>
    <div class="behavior-table-wrap"><table class="coverage-table"><thead><tr><th>Season</th><th>League</th><th>Users</th><th>Rosters</th><th>Draft</th><th>Matchups</th><th>Transactions</th><th>Winners</th><th>Losers</th><th>Hist. ADP</th><th>Identity</th><th>Warnings</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}

function renderManagerIdentityAudit(importData = state.sleeper.importData) {
  const audit = importData?.managerIdentityAudit;
  const records = v160Array(importData?.managerContinuity);
  if (!audit) return `<section class="behavior-primary-section"><h3>Manager Identity Audit</h3><p class="empty">Identity continuity has not been analyzed.</p></section>`;
  const reviewRows = records.filter((row) => !["Confirmed same manager", "Team renamed", "Roster changed"].includes(row.continuityStatus)).slice(0, 80);
  return `<section class="behavior-primary-section identity-audit-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">Identity authority</p><h3>Manager Identity Audit</h3></div>${v160EvidenceBadgeHtml("Observed")}</div>
    <div class="identity-metric-grid">
      <div><strong>${audit.managersMatched}</strong><span>Matched managers</span></div><div><strong>${audit.replacementOwners}</strong><span>Replacement owners</span></div><div><strong>${audit.formerManagers}</strong><span>Former managers</span></div><div><strong>${audit.newManagers}</strong><span>New managers</span></div><div><strong>${audit.ambiguousHistories}</strong><span>Records needing review</span></div><div><strong>${audit.teamNameChanges + audit.rosterChanges}</strong><span>Name / roster changes</span></div>
    </div>
    <p class="behavior-conclusion"><strong>Rule:</strong> ${escapeHtml(audit.rule)}</p>
    ${reviewRows.length ? `<details><summary>Review continuity exceptions</summary><div class="behavior-table-wrap"><table><thead><tr><th>Season</th><th>Manager</th><th>Roster</th><th>Status</th><th>Notes</th></tr></thead><tbody>${reviewRows.map((row) => `<tr><td>${escapeHtml(row.season)}</td><td>${escapeHtml(row.displayName)}<small>${escapeHtml(row.userId)}</small></td><td>${escapeHtml(row.rosterId)}</td><td>${escapeHtml(row.continuityStatus)}</td><td>${escapeHtml(row.notes.join(" "))}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
  </section>`;
}

function v160RateText(numerator, denominator) {
  return denominator ? `${numerator}/${denominator} (${Math.round((numerator / denominator) * 100)}%)` : "—";
}

function v160SimulatedStrategyRows() {
  const summary = state.bulk?.results?.summary;
  return v160Array(summary?.strategies).map((row) => ({
    strategy: row.label,
    simulationCount: Number(row.count || 0),
    simulatedPlayoffRate: Number.isFinite(Number(row.actualPlayoffRate)) ? Number(row.actualPlayoffRate) : null,
    simulatedChampionshipRate: Number.isFinite(Number(row.firstPlaceRate)) ? Number(row.firstPlaceRate) : null,
    stability: row.stability || summary?.comparison?.label || "Unknown",
    medianOutcome: v160Number(row.medianOutcome),
    confidence: summary?.confidence?.label || "Low",
    seasonSimulations: Number(summary?.seasonSimulationCount || 0),
  }));
}

function v160StrategyAlias(value) {
  const key = playerKey(value);
  const aliases = {
    wrheavystart: "wrheavy",
    wrheavy: "wrheavy",
    zerorb: "zerorb",
    herorb: "herorb",
    robustrb: "robustrb",
    balancedstart: "balanced",
    balanced: "balanced",
    earlyqb: "eliteqbte",
    earlyte: "eliteqbte",
  };
  return aliases[key] || key;
}

function renderBehaviorStrategyOutcomes(report) {
  const historical = v160Array(state.sleeper.importData?.historicalStrategyOutcomes);
  const simulated = v160SimulatedStrategyRows();
  const simByAlias = new Map(simulated.map((row) => [v160StrategyAlias(row.strategy), row]));
  const historicalRows = historical.map((row) => {
    const simulation = simByAlias.get(v160StrategyAlias(row.strategy));
    const difference = simulation && Number.isFinite(simulation.simulatedPlayoffRate)
      ? simulation.simulatedPlayoffRate - row.playoffRate
      : null;
    const comparison = !simulation
      ? "No current simulation match"
      : Math.abs(difference) < 0.03
        ? "Historical and simulated playoff conclusions are effectively aligned"
        : difference > 0
          ? "Current simulations are more optimistic than history"
          : "Current simulations are less optimistic than history";
    return `<tr>
      <th scope="row"><strong>${escapeHtml(row.strategy)}</strong><small>${escapeHtml(row.confidence.sampleStatus)} · ${escapeHtml(row.confidence.confidenceLevel)}</small></th>
      <td>${row.qualifyingObservations}</td><td>${row.seasonsRepresented}</td><td>${row.averagePointsScored?.toFixed(1) || "—"}</td><td>${row.averageExpectedWins?.toFixed(1) || "—"}</td>
      <td>${v160RateText(row.playoffAppearances, row.qualifyingObservations)}</td><td>${v160RateText(row.championships, row.qualifyingObservations)}</td><td>${v160RateText(row.topThreeFinishes, row.qualifyingObservations)}</td><td>${v160RateText(row.lastPlaceFinishes, row.qualifyingObservations)}</td>
      <td>${Number.isFinite(row.averageScheduleLuck) ? row.averageScheduleLuck.toFixed(1) : "—"}</td><td>${escapeHtml(comparison)}</td>
    </tr>`;
  }).join("");
  const simulationRows = simulated.map((row) => `<tr><th scope="row">${escapeHtml(row.strategy)}</th><td>${row.simulationCount}</td><td>${row.seasonSimulations}</td><td>${Number.isFinite(row.simulatedPlayoffRate) ? `${Math.round(row.simulatedPlayoffRate * 100)}%` : "—"}</td><td>${Number.isFinite(row.simulatedChampionshipRate) ? `${Math.round(row.simulatedChampionshipRate * 100)}%` : "—"}</td><td>${escapeHtml(row.stability)}</td><td>${escapeHtml(row.confidence)}</td></tr>`).join("");
  const leader = historical.filter((row) => row.qualifyingObservations >= 2).sort((a, b) => (b.averagePointsScored || 0) - (a.averagePointsScored || 0))[0];
  const conclusion = leader
    ? `${leader.strategy} has the strongest historical scoring association across ${leader.qualifyingObservations} qualifying team-seasons. The sample supports consideration, not a causal claim.`
    : "No historical strategy has enough completed team-seasons for a meaningful comparison.";
  return `<div class="strategy-outcomes-view">
    <section class="behavior-overview-hero"><div><p class="eyebrow">Strategy Outcomes</p><h3>Actual history and current simulations stay separate</h3><p>${escapeHtml(conclusion)}</p></div>${v160EvidenceBadgeHtml("Derived")}</section>
    <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">Completed Sleeper seasons</p><h3>Historical league results</h3></div><span>Actual event counts only</span></div>
      <p class="behavior-conclusion"><strong>What this means:</strong> These rates use completed season outcomes. They describe association and never inherit draft scores or simulated success.</p>
      ${historicalRows ? `<div class="behavior-table-wrap"><table><thead><tr><th>Strategy</th><th>Team-seasons</th><th>Seasons</th><th>Avg points</th><th>Avg expected wins</th><th>Playoffs</th><th>Championships</th><th>Top 3</th><th>Last</th><th>Avg luck</th><th>Current comparison</th></tr></thead><tbody>${historicalRows}</tbody></table></div>` : `<p class="empty">Complete season joins are required before historical success rates can be calculated.</p>`}
    </section>
    <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">Current rankings and room models</p><h3>Current simulated results</h3></div><span>Never merged into historical rates</span></div>
      <p class="behavior-conclusion"><strong>What this means:</strong> Simulations test the upcoming draft under current inputs. Differences of only one or two percentage points should be treated as effectively tied when batches overlap.</p>
      ${simulationRows ? `<div class="behavior-table-wrap"><table><thead><tr><th>Strategy</th><th>Draft simulations</th><th>Season simulations</th><th>Sim playoffs</th><th>Sim championships</th><th>Stability</th><th>Confidence</th></tr></thead><tbody>${simulationRows}</tbody></table></div>` : `<p class="empty">Run a Standard or Deep Bulk Simulator comparison to add a separate current-simulation view.</p>`}
    </section>
  </div>`;
}

function renderBehaviorLeagueHistory(report) {
  const importData = state.sleeper.importData;
  const results = v160Array(importData?.seasonResults);
  const seasons = v160Array(importData?.historicalSeasons);
  const seasonCards = seasons.map((season) => {
    const rows = results.filter((result) => result.season === season.season);
    const topScorer = [...rows].filter((row) => Number.isFinite(row.pointsFor)).sort((a, b) => b.pointsFor - a.pointsFor)[0];
    const champion = rows.find((row) => row.championshipWin === true);
    const unluckiest = [...rows].filter((row) => Number.isFinite(row.scheduleLuckWins)).sort((a, b) => a.scheduleLuckWins - b.scheduleLuckWins)[0];
    return `<article class="league-history-card">
      <div><p class="eyebrow">${escapeHtml(season.season)}</p><h3>${escapeHtml(season.leagueName)}</h3><span class="coverage-state coverage-${season.importStatus.status === "Complete" ? "complete" : "partial"}">${escapeHtml(season.importStatus.status)}</span></div>
      <ul><li><strong>Champion:</strong> ${escapeHtml(champion?.displayName || (season.coverage.winnersBracket ? "Not resolved" : "Unverified"))}</li><li><strong>Top scorer:</strong> ${escapeHtml(topScorer ? `${topScorer.displayName} · ${topScorer.pointsFor.toFixed(1)}` : "Unavailable")}</li><li><strong>Schedule-luck note:</strong> ${escapeHtml(unluckiest ? `${unluckiest.displayName} finished ${Math.abs(unluckiest.scheduleLuckWins).toFixed(1)} wins below all-play expectation` : "Incomplete matchup coverage")}</li><li><strong>Transactions:</strong> ${rows.reduce((sum, row) => sum + Number(row.transactionCount || 0), 0)}</li></ul>
      <details><summary>Coverage and exclusions</summary><ul>${season.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("") || "<li>No warning.</li>"}</ul></details>
    </article>`;
  }).join("");
  return `<div class="league-history-view">${renderSeasonCoverageMap(importData)}<section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">Season outcomes</p><h3>What happened after each draft</h3></div>${v160EvidenceBadgeHtml(["Observed", "Derived"])}</div><p class="behavior-conclusion"><strong>Plain-language conclusion:</strong> Records, scoring strength, schedule luck, playoff results, and manager activity are shown together so one championship does not become a proxy for manager quality.</p><div class="league-history-grid">${seasonCards}</div></section></div>`;
}

function v160ManagerOutcomeSupplement(report) {
  const profile = report.teams[state.scoutingTeam - 1];
  if (!profile) return "";
  const outcomes = v160Array(profile.outcomeHistory).filter((row) => row.season);
  const complete = outcomes.filter((row) => row.dataCoverage?.matchups);
  const joins = v160Array(profile.draftSeasonJoins);
  const playoffRows = outcomes.filter((row) => row.playoffQualified !== null && row.playoffQualified !== undefined);
  const playoffCount = playoffRows.filter((row) => row.playoffQualified).length;
  const avgPoints = v160Mean(complete.map((row) => row.pointsFor));
  const avgExpected = v160Mean(complete.map((row) => row.expectedWins));
  const avgLuck = v160Mean(complete.map((row) => row.scheduleLuckWins));
  const transactions = outcomes.reduce((sum, row) => sum + Number(row.transactionCount || 0), 0);
  const strongestJoin = [...joins].filter((row) => Number.isFinite(row.pointsResult)).sort((a, b) => b.pointsResult - a.pointsResult)[0];
  const response = profile.continuityStatus === "Replacement owner"
    ? "Treat current Persona and live roster needs as primary; do not inherit the former owner's draft profile."
    : `Use ${escapeHtml(behaviorManagerSummary(profile))}`;
  return `<section class="behavior-primary-section manager-outcomes-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">Draft-to-season outcomes</p><h3>What happened after this manager drafted</h3></div>${v160EvidenceBadgeHtml(["Observed", "Derived"])}</div>
    <div class="identity-callout"><strong>${escapeHtml(profile.continuityStatus || "Unknown continuity")}</strong><span>Permanent user ID: ${escapeHtml(profile.userId || "Unavailable")}</span></div>
    <div class="accuracy-metric-grid"><div><strong>${complete.length}</strong><span>Complete team-seasons</span></div><div><strong>${Number.isFinite(avgPoints) ? avgPoints.toFixed(1) : "—"}</strong><span>Average points</span></div><div><strong>${Number.isFinite(avgExpected) ? avgExpected.toFixed(1) : "—"}</strong><span>Average expected wins</span></div><div><strong>${Number.isFinite(avgLuck) ? avgLuck.toFixed(1) : "—"}</strong><span>Average schedule luck</span></div><div><strong>${v160RateText(playoffCount, playoffRows.length)}</strong><span>Playoff rate</span></div><div><strong>${transactions}</strong><span>Transactions</span></div></div>
    <p class="behavior-conclusion"><strong>Interpretation:</strong> ${escapeHtml(strongestJoin ? `${strongestJoin.draftStrategy} preceded this manager's strongest scoring season (${strongestJoin.season}), but the sample does not establish causation.` : "Complete draft-to-season joins are not yet available.")}</p>
    <p><strong>Recommended response:</strong> ${response}</p><p><strong>Reversal trigger:</strong> Change the read if this manager's current roster needs, keeper, draft slot, or live selections materially diverge from the comparable history.</p>
  </section>`;
}

const v153RenderBehaviorManagerDossier = renderBehaviorManagerDossier;
renderBehaviorManagerDossier = function renderBehaviorManagerDossierV160(report) {
  return `${v153RenderBehaviorManagerDossier(report)}${v160ManagerOutcomeSupplement(report)}`;
};

function v160SelfScoutSupplement(report) {
  const profile = report.teams[state.userTeam - 1];
  if (!profile) return "";
  const persona = getPersonaForTeam(state.userTeam);
  const joins = v160Array(profile.draftSeasonJoins);
  const outcomes = v160Array(profile.outcomeHistory);
  const primaryBuild = topCountLabel(profile.firstThreeBuilds, "No repeated build");
  const contradictions = [];
  if (state.personaSources?.[state.userTeam - 1] === "manual") {
    if (/Zero RB/i.test(persona.strategyStyle) && /RB/.test(primaryBuild.split("-")[0] || "")) contradictions.push(`Manual Persona says ${persona.strategyStyle}, but the most common historical opening was ${primaryBuild}.`);
    if (/Elite QB/i.test(persona.strategyStyle) === false && Number(profile.positionMinRound?.QB || 99) <= 5) contradictions.push(`Manual Persona is not an early-QB archetype, but a quarterback was selected by Round 5 in the qualifying history.`);
    if (/High/i.test(persona.adpDiscipline || "") && Number(profile.avgReach || 0) <= -6) contradictions.push(`Manual Persona says high ADP discipline, but historical picks averaged ${Math.abs(profile.avgReach).toFixed(1)} spots ahead of market.`);
  }
  const best = [...joins].filter((row) => Number.isFinite(row.pointsResult)).sort((a, b) => b.pointsResult - a.pointsResult)[0];
  const worst = [...joins].filter((row) => Number.isFinite(row.pointsResult)).sort((a, b) => a.pointsResult - b.pointsResult)[0];
  const highActivity = [...outcomes].sort((a, b) => b.transactionCount - a.transactionCount)[0];
  const luck = v160Mean(outcomes.map((row) => row.scheduleLuckWins).filter(Number.isFinite));
  return `<section class="behavior-primary-section self-scout-evidence-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">Persona Contradictions</p><h3>What you say versus what you repeatedly did</h3></div>${v160EvidenceBadgeHtml(["Observed", "Inferred"])}</div>
    <div class="self-scout-source-grid"><article><strong>Manual Persona</strong><p>${escapeHtml(persona.name)} · ${escapeHtml(persona.strategyStyle)} · ${escapeHtml(persona.adpDiscipline)} ADP discipline</p></article><article><strong>Historical behavior</strong><p>${escapeHtml(primaryBuild)} most common opening · ${profile.draftsAnalyzed} drafts</p></article><article><strong>Simulation recommendation</strong><p>${escapeHtml(state.bulk?.draftPlan?.recommendedStrategy || "Run the Bulk Simulator for a current recommendation")}</p></article></div>
    ${contradictions.length ? `<ul>${contradictions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p class="behavior-conclusion">No material contradiction cleared the minimum evidence rules. One isolated draft is never labeled a tendency.</p>`}
    <p><strong>Recommended response:</strong> Write down the exact tier or value condition that allows you to break from your declared plan.</p><p><strong>Reversal trigger:</strong> Treat the mismatch as intentional flexibility if a genuine top-tier value fell to your pick.</p>
  </section>
  <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">What Actually Worked</p><h3>Separate draft construction, management, and luck</h3></div>${v160EvidenceBadgeHtml("Derived")}</div>
    <ul><li>${escapeHtml(best ? `${best.draftStrategy} preceded your strongest scoring season (${best.season}, ${best.pointsResult.toFixed(1)} points).` : "No complete scoring season is joined to your draft history yet.")}</li><li>${escapeHtml(worst && highActivity && worst.season === highActivity.season ? `Your weakest scoring draft was followed by your most active transaction season (${highActivity.transactionCount} moves), which suggests attempted recovery rather than proof the draft was successful.` : "Draft strength and in-season recovery are evaluated separately.")}</li><li>${escapeHtml(Number.isFinite(luck) ? `Across complete matchup seasons, your record averaged ${Math.abs(luck).toFixed(1)} ${luck >= 0 ? "wins above" : "wins below"} all-play expectation.` : "Schedule-luck evidence is incomplete.")}</li></ul>
    <p class="helper">These are associations from small league samples. They do not establish that a draft strategy caused the season result.</p>
  </section>`;
}

const v153RenderBehaviorSelfScout = renderBehaviorSelfScout;
renderBehaviorSelfScout = function renderBehaviorSelfScoutV160(report) {
  return `${v153RenderBehaviorSelfScout(report)}${v160SelfScoutSupplement(report)}`;
};

function renderImportDiagnostics(importData = state.sleeper.importData) {
  const diagnostics = v160Array(importData?.importDiagnostics);
  if (!diagnostics.length) return `<section class="behavior-primary-section"><h3>Import Diagnostics</h3><p class="empty">No endpoint diagnostics are available.</p></section>`;
  const statusCounts = diagnostics.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});
  const rows = diagnostics.slice(-240).map((row) => `<tr><td>${escapeHtml(row.season || "Global")}</td><td>${escapeHtml(row.endpoint)}</td><td><span class="diagnostic-status status-${playerKey(row.status)}">${escapeHtml(row.status)}</span></td><td>${row.recordsReturned}</td><td>${escapeHtml(row.cacheStatus)}</td><td>${row.retryCount}</td><td>${escapeHtml(row.failureReason || "—")}</td></tr>`).join("");
  return `<section class="behavior-primary-section import-diagnostics-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">Reproducibility</p><h3>Import Diagnostics</h3></div><div class="button-row"><button type="button" data-export-league-dataset>Export complete dataset</button><button type="button" data-export-evidence-ledger>Export evidence ledger</button></div></div>
    <div class="diagnostic-summary">${Object.entries(statusCounts).map(([status, count]) => `<span><strong>${count}</strong> ${escapeHtml(status)}</span>`).join("")}</div>
    <p class="behavior-conclusion"><strong>Plain-language conclusion:</strong> Empty successful responses are different from failed requests. Cached rows were reused from a completed season and did not trigger a new network request.</p>
    <details><summary>Show endpoint-level records</summary><div class="behavior-table-wrap"><table><thead><tr><th>Season</th><th>Endpoint</th><th>Status</th><th>Records</th><th>Cache</th><th>Retries</th><th>Failure reason</th></tr></thead><tbody>${rows}</tbody></table></div></details>
  </section>`;
}

function v160CurrentEvidenceLedger(report = scoutingReport()) {
  if (!v161IntelligenceAuthority(state.sleeper.importData).hasAuditableDraftHistory) return [];
  const persisted = v160Array(state.sleeper.importData?.evidenceLedger);
  const dynamic = behaviorDraftDayEdges(report).map((insight) => insight.evidenceRecord).filter(Boolean);
  const byId = new Map([...persisted, ...dynamic].map((record) => [record.insightId, record]));
  return [...byId.values()];
}

function renderEvidenceLedgerSummary(report) {
  const ledger = v160CurrentEvidenceLedger(report);
  const classCounts = ledger.reduce((counts, record) => {
    String(record.evidenceClass || "Unknown").split(" + ").forEach((label) => { counts[label] = (counts[label] || 0) + 1; });
    return counts;
  }, {});
  return `<section class="behavior-primary-section evidence-ledger-section"><div class="behavior-section-heading"><div><p class="eyebrow">Evidence Ledger</p><h3>Audit every meaningful conclusion</h3></div><button type="button" data-export-evidence-ledger>Export ledger JSON</button></div><div class="diagnostic-summary">${Object.entries(classCounts).map(([label, count]) => `<span><strong>${count}</strong> ${escapeHtml(label)}</span>`).join("")}</div><p class="behavior-conclusion"><strong>Guardrail:</strong> A high-confidence recommendation is not displayed unless it has qualifying observations, an evidence class, limitations, and a specific reversal trigger.</p><details><summary>Preview ${ledger.length} evidence records</summary><div class="behavior-table-wrap"><table><thead><tr><th>Conclusion</th><th>Class</th><th>Sample</th><th>Confidence</th><th>Observations</th><th>Reversal trigger</th></tr></thead><tbody>${ledger.slice(0, 80).map((record) => `<tr><td><strong>${escapeHtml(record.headline)}</strong><small>${escapeHtml(record.conclusion)}</small></td><td>${escapeHtml(record.evidenceClass)}</td><td>${escapeHtml(record.sampleStatus)}</td><td>${escapeHtml(record.confidenceLevel)}</td><td>${record.observationCount}</td><td>${escapeHtml(record.reversalTriggers?.[0] || "Missing")}</td></tr>`).join("")}</tbody></table></div></details></section>`;
}

const v153RenderBehaviorExplorer = renderBehaviorExplorer;
renderBehaviorExplorer = function renderBehaviorExplorerV160(report) {
  return `${v153RenderBehaviorExplorer(report)}${renderSeasonCoverageMap()}${renderManagerIdentityAudit()}${renderImportDiagnostics()}${renderEvidenceLedgerSummary(report)}`;
};

const v153RenderModelAccuracySection = renderModelAccuracySection;
renderModelAccuracySection = function renderModelAccuracySectionV160(report) {
  const base = v153RenderModelAccuracySection(report);
  const calibration = state.learning.calibrationSummary || calculateCalibrationSummary(state.learning.predictionLogs || []);
  const backtest = historicalBacktestSummary(report);
  const evaluated = Number(calibration.evaluated || 0);
  const correct = Math.round(Number(calibration.positionAccuracy || 0) * evaluated);
  const historicalCorrect = Math.round(Number(backtest.accuracy || 0) * Number(backtest.evaluated || 0));
  return `${base}<section class="behavior-primary-section accuracy-definitions-section"><div class="behavior-section-heading"><div><p class="eyebrow">Metric definitions</p><h3>Numerators, denominators, and evaluation types</h3></div>${v160EvidenceBadgeHtml("Derived")}</div><div class="behavior-table-wrap"><table><thead><tr><th>Metric</th><th>Numerator</th><th>Denominator</th><th>Season range</th><th>Evaluation type</th><th>Definition</th></tr></thead><tbody>
    <tr><td>Live position accuracy</td><td>${correct} correct</td><td>${evaluated} resolved</td><td>Current live logs</td><td>Live held-out</td><td>Top predicted position matched the actual selection.</td></tr>
    <tr><td>Historical position timing</td><td>${historicalCorrect} correct</td><td>${backtest.evaluated} manager-seasons</td><td>${escapeHtml(report.seasons.map((row) => row.season).sort().join("–") || "Unavailable")}</td><td>Historical no-lookahead</td><td>Profiles trained only on earlier seasons predicted the next season's early position lean.</td></tr>
    <tr><td>Historical market band</td><td>${Math.round(backtest.marketBandAccuracy * backtest.marketEvaluated)} within band</td><td>${backtest.marketEvaluated} selections</td><td>${escapeHtml(report.seasons.map((row) => row.season).sort().join("–") || "Unavailable")}</td><td>Historical no-lookahead</td><td>Actual pick landed within one league round of the prior-history expectation using pick-time or same-season ADP.</td></tr>
    <tr><td>Brier score</td><td colspan="2">${evaluated ? Number(calibration.brierScore || 0).toFixed(3) : "No live sample"}</td><td>Resolved live predictions</td><td>Probability calibration</td><td>Brier score measures how closely the model’s stated probabilities matched what actually happened. Lower is better, and confident incorrect predictions are penalized more heavily.</td></tr>
  </tbody></table></div><p class="helper">Simulated drafts are excluded from both live and historical accuracy. In-sample pattern fitting is not reported as held-out accuracy.</p></section>`;
};

function v161RenderHistoryUnavailable(importData = state.sleeper.importData) {
  const authority = v161IntelligenceAuthority(importData);
  const cachedSummary = authority.cachedDrafts || authority.cachedPicks
    ? `A prior summary reported ${authority.cachedDrafts} draft${authority.cachedDrafts === 1 ? "" : "s"} and ${authority.cachedPicks} picks, but its season-level source records are missing. That summary is ignored.`
    : "No season has verified draft-pick records, so there is no evidence base for manager or league tendencies.";
  const reason = authority.requiresRefresh
    ? "This saved league needs a one-time full-history refresh. The league ID is preserved, so you do not need to rebuild the league setup."
    : "The last import did not return an auditable draft season. Review the coverage map and import diagnostics, then retry the full history import.";
  return `<div class="behavior-overview behavior-history-unavailable">
    <section class="behavior-overview-hero league-intelligence-hero history-integrity-hero"><div><p class="eyebrow">League Behavior Lab</p><h3>Historical insights are unavailable.</h3><p>${escapeHtml(cachedSummary)}</p></div><span class="behavior-confidence-pill">Insights disabled</span></section>
    <section class="behavior-primary-section history-integrity-block" role="alert"><div><p class="eyebrow">Evidence integrity check</p><h3>Refresh the source history before using this Lab</h3><p>${escapeHtml(reason)}</p><p><strong>Until then:</strong> actionable edges, manager tendencies, confidence scores, scouting-derived Personas, historical simulator modifiers, and Draft Assistant history claims remain disabled.</p></div><button type="button" class="primary" data-refresh-sleeper-history>Open League import</button></section>
    <section class="intelligence-summary-grid" aria-label="Verified league intelligence summary"><div><strong>0</strong><span>Verified drafts</span></div><div><strong>0</strong><span>Actionable edges</span></div><div><strong>0</strong><span>Reliable tendencies</span></div><div><strong>${authority.completeOutcomeSeasons.length}</strong><span>Complete outcome seasons</span></div></section>
    ${authority.seasons.length ? renderSeasonCoverageMap(importData) : ""}
  </div>`;
}

renderBehaviorOverview = function renderBehaviorOverviewV160(report) {
  const importData = state.sleeper.importData;
  if (!v161IntelligenceAuthority(importData).hasAuditableDraftHistory) return v161RenderHistoryUnavailable(importData);
  const edges = behaviorDraftDayEdges(report);
  const profiles = report.teams.filter((team) => team.picksAnalyzed);
  const reliable = profiles.filter((profile) => ["Reliable", "Strong"].includes(behaviorProfileConfidence(profile).sampleStatus)).length;
  const emerging = profiles.filter((profile) => behaviorProfileConfidence(profile).sampleStatus === "Emerging").length;
  const complete = Number(report.league.completeSeasonCount || 0);
  const topManagers = [...profiles].sort((a, b) => behaviorProfileConfidence(b).score - behaviorProfileConfidence(a).score).slice(0, 3);
  return `<div class="behavior-overview">
    <section class="behavior-overview-hero league-intelligence-hero"><div><p class="eyebrow">League Behavior Lab</p><h3>Understand the room. Predict the pressure. Exploit the market.</h3><p>${escapeHtml(v160SeasonCoverageSummary(importData))}</p></div><span class="behavior-confidence-pill">${escapeHtml(behaviorLeagueConfidence(report).label)}</span></section>
    <section class="intelligence-summary-grid" aria-label="League intelligence summary"><div><strong>${edges.length}</strong><span>Actionable draft edges</span></div><div><strong>${reliable}</strong><span>Reliable manager tendencies</span></div><div><strong>${emerging}</strong><span>Emerging patterns</span></div><div><strong>${report.league.draftsAnalyzed}</strong><span>Drafts imported</span></div><div><strong>${complete}</strong><span>Complete season histories</span></div><div><strong>${report.league.picksAnalyzed}</strong><span>Historical picks</span></div><div><strong>${report.league.matchupRecordCount || 0}</strong><span>Weekly matchup records</span></div><div><strong>${report.league.transactionRecordCount || 0}</strong><span>Transactions</span></div></section>
    <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">Draft Day Edges</p><h3>The findings most likely to change a decision</h3></div><span>Observation → evidence → response → reversal trigger</span></div>${edges.length ? `<div class="behavior-edge-list">${edges.map(renderBehaviorInsightCard).join("")}</div>` : `<div class="behavior-no-edge"><h3>No edge cleared the evidence guardrails.</h3><p>Add another completed draft or complete season; the Lab will not promote a one-off event into a tendency.</p></div>`}</section>
    <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">League Market</p><h3>Historical room demand versus market price</h3></div>${v160EvidenceBadgeHtml(["Derived", "Market-based"])}</div><div class="behavior-visual-grid">${renderBehaviorHeatmap(report, { manager: "league", season: "all", roundStart: 1, roundEnd: Math.min(10, LEAGUE.rounds) })}${renderBehaviorAdpVisual(report, "league")}</div>${renderBehaviorPressureVisual(report)}<p class="behavior-conclusion"><strong>Action:</strong> Use historical inflation to plan acquisition timing, not to rewrite static Lab Rank. Reverse the read when the live room or current tier depth materially diverges.</p></section>
    <section class="behavior-primary-section"><div class="behavior-section-heading"><div><p class="eyebrow">Manager Scouting</p><h3>The most supportable opponent reads</h3></div><button type="button" data-scouting-view="managers">Open all managers</button></div><div class="behavior-manager-preview-grid">${topManagers.map((profile) => { const confidence = behaviorProfileConfidence(profile); return `<button type="button" data-scouting-team-card="${profile.team}"><span>${escapeHtml(confidence.sampleStatus)} · ${escapeHtml(confidence.label)}</span><strong>${escapeHtml(activeTeamName(profile.team))}</strong><p>${escapeHtml(behaviorManagerSummary(profile))}</p></button>`; }).join("") || `<p class="empty">No current manager has enough matched history.</p>`}</div></section>
    ${renderModelAccuracySection(report)}
    <section class="behavior-primary-section behavior-overview-footer-grid"><article><p class="eyebrow">Self-Scout</p><h3>Compare Persona, behavior, and outcomes</h3><p>Find contradictions, recovery patterns, and schedule-luck context.</p><button type="button" data-scouting-view="self">Open Self-Scout</button></article><article><p class="eyebrow">Strategy Outcomes</p><h3>Actual versus simulated</h3><p>Compare completed season associations with current simulations without mixing the rates.</p><button type="button" data-scouting-view="strategies">Open Strategy Outcomes</button></article><article><p class="eyebrow">League History</p><h3>Audit season coverage</h3><p>See exactly which drafts, matchups, transactions, and brackets support the Lab.</p><button type="button" data-scouting-view="history">Open League History</button></article><article><p class="eyebrow">Data Explorer</p><h3>Inspect and export evidence</h3><p>Review identities, diagnostics, exclusions, validation, and the evidence ledger.</p><button type="button" data-scouting-view="data">Open Data Explorer</button></article></section>
  </div>`;
};

renderScoutingReport = function renderScoutingReportV160() {
  if (!$("scoutingReportContent")) return;
  const report = scoutingReport();
  const viewMap = { league: "overview", team: "managers", deep: "data" };
  state.scoutingView = viewMap[state.scoutingView] || state.scoutingView || "overview";
  const allowed = ["overview", "managers", "self", "strategies", "history", "data"];
  if (!allowed.includes(state.scoutingView)) state.scoutingView = "overview";
  state.scoutingTeam = Math.max(1, Math.min(LEAGUE.teams, Number(state.scoutingTeam) || state.userTeam || 1));
  $("scoutingTeamSelect").innerHTML = Array.from({ length: LEAGUE.teams }, (_, index) => `<option value="${index + 1}" ${index + 1 === state.scoutingTeam ? "selected" : ""}>${escapeHtml(activeTeamName(index + 1))}</option>`).join("");
  $("scoutingTeamSelect").hidden = state.scoutingView !== "managers";
  document.querySelectorAll("[data-scouting-view]").forEach((button) => button.classList.toggle("active", button.dataset.scoutingView === state.scoutingView));
  const importData = state.sleeper.importData;
  const authority = v161IntelligenceAuthority(importData);
  if (!authority.hasAuditableDraftHistory && (authority.requiresRefresh || authority.seasons.length)) {
    $("scoutingReportContent").innerHTML = v161RenderHistoryUnavailable(importData);
    return;
  }
  if (!authority.hasAuditableDraftHistory) {
    $("scoutingReportContent").innerHTML = `${renderBehaviorEmptyState()}${renderModelAccuracySection(report)}`;
    return;
  }
  if (state.scoutingView === "managers") $("scoutingReportContent").innerHTML = renderBehaviorManagerDossier(report);
  else if (state.scoutingView === "self") $("scoutingReportContent").innerHTML = renderBehaviorSelfScout(report);
  else if (state.scoutingView === "strategies") $("scoutingReportContent").innerHTML = renderBehaviorStrategyOutcomes(report);
  else if (state.scoutingView === "history") $("scoutingReportContent").innerHTML = renderBehaviorLeagueHistory(report);
  else if (state.scoutingView === "data") $("scoutingReportContent").innerHTML = `${renderBehaviorExplorer(report)}${renderModelAccuracySection(report)}`;
  else $("scoutingReportContent").innerHTML = renderBehaviorOverview(report);
};

function v160DownloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function v160ExportCompleteDataset() {
  const importData = state.sleeper.importData;
  if (!importData) return;
  v160DownloadJson(`fantasy-draft-labs-${playerKey(importData.leagueName) || "league"}-dataset-${new Date().toISOString().slice(0, 10)}.json`, {
    exportVersion: FDL_INTELLIGENCE_SCHEMA_VERSION,
    modelVersion: FDL_INTELLIGENCE_MODEL_VERSION,
    exportedAt: new Date().toISOString(),
    league: { id: importData.leagueId, name: importData.leagueName, season: importData.season, settings: LEAGUE },
    teams: importData.teams,
    historicalSeasons: importData.historicalSeasons,
    managerContinuity: importData.managerContinuity,
    managerIdentityAudit: importData.managerIdentityAudit,
    seasonResults: importData.seasonResults,
    draftSeasonJoins: importData.draftSeasonJoins,
    historicalStrategyOutcomes: importData.historicalStrategyOutcomes,
    importDiagnostics: importData.importDiagnostics,
    validationReport: importData.validationReport,
    evidenceLedger: v160CurrentEvidenceLedger(),
  });
}

function v160ExportEvidenceLedger() {
  const importData = state.sleeper.importData;
  if (!importData) return;
  v160DownloadJson(`fantasy-draft-labs-${playerKey(importData.leagueName) || "league"}-evidence-ledger-${new Date().toISOString().slice(0, 10)}.json`, {
    modelVersion: FDL_INTELLIGENCE_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    records: v160CurrentEvidenceLedger(),
  });
}

const v153RenderSleeperImport = renderSleeperImport;
renderSleeperImport = function renderSleeperImportV160() {
  v153RenderSleeperImport();
  const progress = state.sleeper.importProgress || {};
  const progressElement = $("sleeperImportProgress");
  const progressText = $("sleeperImportProgressText");
  const cancelButton = $("sleeperCancelImportBtn");
  if (progressElement) {
    const total = Math.max(1, Number(progress.total || 1));
    progressElement.max = total;
    progressElement.value = Math.min(total, Number(progress.completed || 0));
    progressElement.hidden = !state.sleeper.loading && !progress.stage;
  }
  if (progressText) {
    progressText.textContent = progress.stage ? [progress.stage, progress.total ? `${progress.completed || 0}/${progress.total}` : "", progress.detail].filter(Boolean).join(" · ") : "";
  }
  if (cancelButton) cancelButton.hidden = !state.sleeper.loading;
  const importData = state.sleeper.importData;
  if (!importData || !$("sleeperImportSummary")) return;
  const complete = v160Array(importData.historicalSeasons).filter((season) => season.importStatus?.status === "Complete").length;
  const partial = v160Array(importData.historicalSeasons).length - complete;
  const failures = v160Array(importData.importDiagnostics).filter((row) => ["Failed", "Partial", "Unsupported"].includes(row.status)).length;
  $("sleeperImportSummary").insertAdjacentHTML("beforeend", `<div class="sleeper-intelligence-summary"><strong>League intelligence coverage</strong><p>${escapeHtml(v160SeasonCoverageSummary(importData))}</p><div><span>${complete} complete seasons</span><span>${partial} partial / current seasons</span><span>${failures} diagnostic exceptions</span><span>Validation: ${escapeHtml(importData.validationReport?.status || "Not run")}</span></div><button type="button" data-open-league-history>Review Season Coverage Map</button></div>`);
};

const v153BehaviorManagerPositionProbabilities = behaviorManagerPositionProbabilities;
behaviorManagerPositionProbabilities = function behaviorManagerPositionProbabilitiesV160(teamNumber, round, report = scoutingReport()) {
  const result = v153BehaviorManagerPositionProbabilities(teamNumber, round, report);
  const profile = report.teams?.[teamNumber - 1];
  const confidence = behaviorProfileConfidence(profile, result.fallback);
  if (confidence.score >= 48) return { ...result, confidence: confidence.label };
  const uniform = 1 / BEHAVIOR_POSITIONS.length;
  const shrink = Math.max(0.25, confidence.score / 100);
  const probabilities = Object.fromEntries(BEHAVIOR_POSITIONS.map((position) => [position, (Number(result.probabilities[position] || 0) * shrink) + (uniform * (1 - shrink))]));
  return {
    ...result,
    probabilities,
    source: `${result.source}; low-confidence continuity/sample shrinkage`,
    fallback: true,
    confidence: confidence.label,
  };
};

const v153CreateDraftPlan = createDraftPlan;
createDraftPlan = function createDraftPlanV160(summary) {
  const plan = v153CreateDraftPlan(summary);
  if (!v161IntelligenceAuthority(state.sleeper.importData).hasCompleteOutcomeHistory) return plan;
  const historical = v160Array(state.sleeper.importData?.historicalStrategyOutcomes)
    .filter((row) => row.qualifyingObservations >= 2)
    .sort((a, b) => (b.averagePointsScored || 0) - (a.averagePointsScored || 0))[0];
  if (!historical) return plan;
  const simulationTied = Boolean(summary?.comparison?.tied);
  return {
    ...plan,
    recommendedStrategy: simulationTied && historical.confidence.sampleStatus !== "Observation" ? historical.strategy : plan.recommendedStrategy,
    evidenceSummary: {
      ...(plan.evidenceSummary || {}),
      historicalStrategy: `${historical.strategy}: ${historical.playoffAppearances}/${historical.qualifyingObservations} historical playoff outcomes across ${historical.seasonsRepresented} seasons. Historical association remains separate from the current simulation result.`,
    },
    pivotRules: v160Unique([
      ...(plan.pivotRules || []),
      `Move away from ${historical.strategy} if current tier value, roster construction, keeper context, or live manager behavior no longer supports it.`,
    ]),
    limitations: v160Unique([
      ...(plan.limitations || []),
      `Historical ${historical.strategy} results are an association from ${historical.qualifyingObservations} team-seasons, not a causal guarantee.`,
    ]),
  };
};

const v153RenderRecommendations = renderRecommendations;
renderRecommendations = function renderRecommendationsV160() {
  v153RenderRecommendations();
  const center = $("decisionCenter");
  if (!center || center.querySelector(".league-intelligence-decision-note")) return;
  if (!v161IntelligenceAuthority(state.sleeper.importData).hasAuditableDraftHistory) return;
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick > total || draftOrderFor(state.currentPick).team !== state.userTeam) return;
  const forecast = behaviorPickWindowForecast();
  if (!forecast.active) return;
  const position = [...BEHAVIOR_POSITIONS].sort((a, b) => Number(forecast.positions?.[b]?.expected || 0) - Number(forecast.positions?.[a]?.expected || 0))[0];
  const row = forecast.positions?.[position];
  if (!row) return;
  const lowConfidenceManagers = forecast.picks.filter((pick) => behaviorProfileConfidence(scoutingReport().teams?.[pick.team - 1], pick.fallback).score < 48);
  const confidence = lowConfidenceManagers.length ? "Low" : forecast.fallbackCount ? "Moderate" : "Moderate";
  const host = center.querySelector(".decision-hero-copy") || center;
  host.insertAdjacentHTML("beforeend", `<aside class="league-intelligence-decision-note"><div>${v160EvidenceBadgeHtml(["Inferred", "Market-based"])}<strong>League pressure: ${escapeHtml(position)}</strong><span>${escapeHtml(confidence)} confidence</span></div><p>${forecast.picks.length} manager pick${forecast.picks.length === 1 ? "" : "s"} before your next turn project ${row.expected.toFixed(1)} ${position} selections. This changes acquisition urgency, not static player value.</p><p><strong>Reversal trigger:</strong> Reduce the pressure if the next two managers pass on ${position}, fill the position early, or a superior player falls far enough to override the tier priority.${lowConfidenceManagers.length ? ` ${lowConfidenceManagers.length} nearby manager model${lowConfidenceManagers.length === 1 ? " is" : "s are"} sample- or continuity-limited.` : ""}</p></aside>`);
};

state.sleeper.importProgress = state.sleeper.importProgress || null;
state.sleeper.importData = normalizeSleeperImport(state.sleeper.importData, LEAGUE.teams);
if (typeof syncSleeperConnectorFromImport === "function") syncSleeperConnectorFromImport(state.sleeper.importData);
if (state.sleeper.importData?.historicalSeasons?.length) {
  const persistedSeasons = v160Array(state.sleeper.importData.historicalSeasons);
  const currentSeason = persistedSeasons.find((season) => String(season.leagueId) === String(state.sleeper.importData.leagueId)) || persistedSeasons[0];
  state.sleeper.importData.scoutingReport = v160BuildScoutingReport(persistedSeasons, v160Array(currentSeason?.rosters), state.sleeper.importData);
  applyScoutingPersonasToTeams(state.sleeper.importData.scoutingReport);
}

$("sleeperCancelImportBtn")?.addEventListener("click", v160CancelImport);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-export-league-dataset]")) {
    v160ExportCompleteDataset();
    return;
  }
  if (event.target.closest("[data-export-evidence-ledger]")) {
    v160ExportEvidenceLedger();
    return;
  }
  if (event.target.closest("[data-open-league-history]")) {
    state.activePanel = "scouting";
    state.scoutingView = "history";
    render();
    return;
  }
  if (event.target.closest("[data-refresh-sleeper-history]")) {
    if (typeof syncSleeperConnectorFromImport === "function") syncSleeperConnectorFromImport(state.sleeper.importData);
    state.activePanel = "league";
    render();
  }
});

globalThis.FDLLeagueIntelligence = Object.freeze({
  schemaVersion: FDL_INTELLIGENCE_SCHEMA_VERSION,
  modelVersion: FDL_INTELLIGENCE_MODEL_VERSION,
  importSelectedSleeperLeague: v160ImportSelectedSleeperLeague,
  cancelImport: v160CancelImport,
  buildManagerContinuity: v160ManagerContinuity,
  buildSeasonResults: v160SeasonResults,
  buildDraftSeasonJoins: v160DraftSeasonJoins,
  buildHistoricalStrategyOutcomes: v160HistoricalStrategyOutcomes,
  buildValidationReport: v160ValidationReport,
  intelligenceAuthority: v161IntelligenceAuthority,
  exportCompleteDataset: v160ExportCompleteDataset,
  exportEvidenceLedger: v160ExportEvidenceLedger,
});

render();
