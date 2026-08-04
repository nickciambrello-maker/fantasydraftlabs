(function installSleeperLab() {
  "use strict";

  if (!globalThis.FDLSleeperModel || typeof globalThis.FDLSleeperModel.buildSleeperProfile !== "function") {
    console.error("Value-breakout model is unavailable.");
    return;
  }

  const { buildSleeperProfile, targetTypeMatches, SLEEPER_SCORE_WEIGHTS } = globalThis.FDLSleeperModel;
  const STORAGE_KEY = "fantasyDraftLabSleeperLabV1";
  const STORAGE_VERSION = 1;
  const ADVANCED_NUMERIC_FIELDS = {
    age: ["age"],
    yearsExperience: ["years_experience", "years experience", "experience", "nfl_experience"],
    nflDraftRound: ["nfl_draft_round", "nfl draft round", "draft_round"],
    nflDraftPick: ["nfl_draft_pick", "nfl draft pick", "draft_pick"],
    prospectScore: ["prospect_score", "prospect score"],
    routeParticipation: ["route_participation", "route participation"],
    targetShare: ["target_share", "target share"],
    targetsPerRoute: ["targets_per_route", "targets per route", "tprr"],
    yardsPerRoute: ["yards_per_route", "yards per route", "yprr"],
    airYardsShare: ["air_yards_share", "air yards share"],
    firstReadShare: ["first_read_share", "first read share"],
    snapShare: ["snap_share", "snap share"],
    carryShare: ["carry_share", "carry share"],
    goalLineShare: ["goal_line_share", "goal line share"],
    redZoneTargetShare: ["red_zone_target_share", "red zone target share", "end_zone_target_share"],
    weightedOpportunity: ["weighted_opportunity", "weighted opportunity"],
    projectedOpportunityShare: ["projected_opportunity_share", "projected opportunity share"],
    standaloneRoleScore: ["standalone_role_score", "standalone role score"],
    contingentRoleScore: ["contingent_role_score", "contingent role score"],
    roleCertainty: ["role_certainty", "role certainty"],
    offenseEnvironmentScore: ["offense_environment_score", "offense environment score"],
    adpSampleSize: ["adp_sample_size", "adp sample size"],
    adp7DayChange: ["adp_7_day_change", "adp 7 day change"],
    adp30DayChange: ["adp_30_day_change", "adp 30 day change"],
    rushingAttempts: ["rushing_attempts", "rushing attempts", "rushing_projection"],
    designedRushingAttempts: ["designed_rush_attempts", "designed rushing attempts"],
    scrambleRate: ["scramble_rate", "scramble rate"],
    passingJobSecurity: ["passing_job_security", "passing job security"],
    passingVolume: ["passing_volume", "passing volume", "pass_attempts"],
    slotRate: ["slot_rate", "slot rate"],
    blockingRate: ["blocking_rate", "blocking rate", "blocking_burden"],
    depthChartBlockers: ["depth_chart_blockers", "depth chart blockers", "blocker_count"],
    depthChartBlockerStrength: ["depth_chart_blocker_strength", "depth chart blocker strength", "blocker_strength_score"],
  };
  const ADVANCED_TEXT_FIELDS = {
    adpSource: ["adp_source", "adp source"],
    adpFormat: ["adp_format", "adp format"],
    adpDate: ["adp_date", "adp date"],
    dataUpdatedAt: ["data_updated_at", "data updated at", "updated_at"],
    roleSource: ["role_source", "role source"],
    roleConfidence: ["role_confidence", "role confidence"],
  };
  const ARCHETYPES = [
    "Standalone-value RB", "Contingent lead-back", "Receiving-back specialist", "Target-earning WR",
    "Route-growth WR", "Post-hype breakout", "Rookie role bet", "Rushing QB", "Full-route TE",
    "Red-zone TE", "Ambiguous-depth-chart winner", "Injury discount", "Market faller", "League-specific scoring sleeper",
  ];

  function initialSleeperLabState() {
    return {
      version: STORAGE_VERSION,
      filters: { search: "", position: "ALL", archetype: "ALL", confidence: "ALL", freshness: "ALL", minimumAdp: "", maximumAdp: "", minimumScore: 0, sort: "score" },
      selectedPlayerId: "",
      portfolioIds: new Set(),
      adpSnapshots: [],
      outcomeRows: [],
      manualRoles: {},
      status: "",
    };
  }

  function normalizeSavedLab(raw) {
    const base = initialSleeperLabState();
    return {
      ...base,
      ...(raw && typeof raw === "object" ? raw : {}),
      filters: { ...base.filters, ...(raw?.filters || {}) },
      portfolioIds: new Set(Array.isArray(raw?.portfolioIds) ? raw.portfolioIds.map(String) : []),
      adpSnapshots: Array.isArray(raw?.adpSnapshots) ? raw.adpSnapshots.slice(-5000) : [],
      outcomeRows: Array.isArray(raw?.outcomeRows) ? raw.outcomeRows.slice(-2000) : [],
      manualRoles: raw?.manualRoles && typeof raw.manualRoles === "object" ? raw.manualRoles : {},
    };
  }

  function loadSleeperLabState() {
    try {
      return normalizeSavedLab(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return initialSleeperLabState();
    }
  }

  function saveSleeperLabState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state.sleeperLab,
        portfolioIds: [...state.sleeperLab.portfolioIds],
      }));
    } catch {
      state.sleeperLab.status = "Value-breakout evidence is active, but this browser blocked local saving.";
    }
  }

  state.sleeperLab = loadSleeperLabState();
  const sleeperRuntimeProfileCache = new Map();

  function advancedNumber(row, aliases) {
    const value = importedValue(row, aliases);
    const parsed = numberValue(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function advancedText(row, aliases) {
    const value = importedValue(row, aliases);
    return value === null || value === undefined ? "" : String(value).trim();
  }

  const originalNormalizeImportedRow = normalizeImportedRow;
  normalizeImportedRow = function sleeperAwareNormalizeImportedRow(row, fallbackSource) {
    const normalized = originalNormalizeImportedRow(row, fallbackSource);
    if (!normalized) return null;
    Object.entries(ADVANCED_NUMERIC_FIELDS).forEach(([key, aliases]) => {
      const value = advancedNumber(row, aliases);
      if (value !== null) normalized[key] = value;
    });
    Object.entries(ADVANCED_TEXT_FIELDS).forEach(([key, aliases]) => {
      const value = advancedText(row, aliases);
      if (value) normalized[key] = value;
    });
    if (normalized.depthChartRole) {
      normalized.uploadedRole = normalized.depthChartRole;
      normalized.depthChartRoleUploaded = normalized.depthChartRole;
      normalized.roleSource = normalized.roleSource || "uploaded";
      normalized.roleConfidence = normalized.roleConfidence || "Moderate";
    }
    return normalized;
  };

  function latestValue(rows, key) {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const value = rows[index]?.[key];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return null;
  }

  function importedMetricMap(rows = state.importedRankingRows) {
    const map = new Map();
    (rows || []).forEach((row) => {
      if (!row?.id) return;
      if (!map.has(row.id)) map.set(row.id, []);
      map.get(row.id).push(row);
    });
    return map;
  }

  function roleMetadataFor(player, rows) {
    const manual = state.sleeperLab.manualRoles[player.id];
    if (manual?.role) return { manualRole: manual.role, roleSource: "manual", roleConfidence: manual.confidence || "High" };
    const uploadedRole = latestValue(rows, "uploadedRole") || latestValue(rows, "depthChartRoleUploaded");
    if (uploadedRole) return {
      uploadedRole,
      depthChartRoleUploaded: uploadedRole,
      roleSource: latestValue(rows, "roleSource") || "uploaded",
      roleConfidence: latestValue(rows, "roleConfidence") || "Moderate",
    };
    if (player.roleSource === "manual") return { manualRole: player.manualRole || player.roleOverride || player.depthChartRole || "", roleSource: "manual", roleConfidence: player.roleConfidence || "High" };
    if (player.roleSource === "uploaded") return { uploadedRole: player.uploadedRole || player.depthChartRoleUploaded || player.depthChartRole || "", roleSource: "uploaded", roleConfidence: player.roleConfidence || "Moderate" };
    if (player.roleSource === "Sleeper player data" || player.sleeperRole || player.sleeperDepthChartOrder) return { sleeperRole: player.sleeperRole || player.depthChartRole || "", roleSource: "Sleeper player data", roleConfidence: player.roleConfidence || "Moderate" };
    return { roleSource: "ranking inference", roleConfidence: "Low" };
  }

  function sleeperContextFor(player) {
    let survival = null;
    let threats = [];
    let pressure = 45;
    try {
      const result = playerSurvivalEstimate(player, state.userTeam, state.currentPick);
      survival = result?.confidence === "Low" ? null : Number(result?.survivalProbability);
    } catch {
      survival = null;
    }
    try {
      const snipe = scoutingSnipeEvidence(player, state.userTeam, state.currentPick);
      threats = (snipe?.threats || []).slice(0, 5).map((item) => activeTeamName(item.team));
    } catch {
      threats = [];
    }
    try { pressure = currentRunPressure(player.position) * 100; } catch { pressure = 45; }
    return {
      league: activeLeague(),
      teams: LEAGUE.teams,
      currentPick: Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds),
      rosterCounts: positionCounts(rosterFor(state.userTeam)),
      survivalToNextPick: survival,
      roomThreats: threats,
      roomPressure: pressure,
      analysisDate: new Date().toISOString(),
    };
  }

  function refreshSleeperProfiles() {
    sleeperRuntimeProfileCache.clear();
    const metrics = importedMetricMap();
    PLAYERS = PLAYERS.map((player) => {
      const rows = metrics.get(player.id) || [];
      const advanced = {};
      [...Object.keys(ADVANCED_NUMERIC_FIELDS), ...Object.keys(ADVANCED_TEXT_FIELDS)].forEach((key) => {
        const value = latestValue(rows, key);
        if (value !== null) advanced[key] = value;
      });
      const role = roleMetadataFor(player, rows);
      const enriched = { ...player, ...advanced, ...role };
      const profile = buildSleeperProfile(enriched, sleeperContextFor(enriched));
      sleeperRuntimeProfileCache.set(sleeperRuntimeProfileKey(enriched), profile);
      return { ...enriched, roleSource: profile.roleSource, roleConfidence: profile.roleConfidence, sleeperProfile: profile };
    });
    clearProjectionCaches();
  }

  const originalRebuildConsensusPlayers = rebuildConsensusPlayers;
  rebuildConsensusPlayers = function sleeperAwareRebuildConsensusPlayers(rows = []) {
    const result = originalRebuildConsensusPlayers(rows);
    refreshSleeperProfiles();
    captureAdpSnapshots(rows);
    if ($("sleeperLabBoard")) renderSleeperLab();
    return result;
  };

  isYoungUpsidePlayer = function deterministicYoungUpsidePlayer(player) {
    const profile = profileFor(player);
    const age = Number(player?.age);
    const experience = Number(player?.yearsExperience);
    const developmental = Number.isFinite(age) ? age <= 25 : Number.isFinite(experience) ? experience <= 2 : false;
    return Boolean(developmental && profile.talentSignalScore >= 55 && profile.ceilingCatalystScore >= 55);
  };

  isRecognizableName = function deterministicRecognizability(player) {
    return Number(player?.consensusRank) <= 80 || Number(player?.sourceCount) >= 3 || Number(player?.weightedProjection) >= 14;
  };

  sleeperCandidateScore = function deterministicSleeperCandidateScore(player, team = state.userTeam, pickNumber = state.currentPick) {
    const profile = profileFor(player);
    const roster = rosterFor(team);
    const severeRedundancy = recommendationRosterPenalty(player, roster, pickNumber, state.strategy) >= 100;
    const rosterAdjustment = fillsRequiredRosterSlot(player, roster) ? 5 : severeRedundancy ? -18 : 0;
    return profile.sleeperScore + profile.roomTimingScore * 0.08 + rosterAdjustment;
  };

  isSleeperCandidate = function deterministicSleeperQualification(player) {
    return Boolean(profileFor(player).isSleeper);
  };

  function sleeperRuntimeProfileKey(player) {
    const league = activeLeague();
    const scoring = league.scoringSettings || {};
    const roster = league.roster || {};
    return [
      player?.id || player?.name || "unknown",
      state.currentPick,
      state.picks.length,
      state.userTeam,
      state.activeLeagueId || league.id || "default",
      scoring.reception ?? "",
      scoring.teReceptionBonus ?? "",
      scoring.passTd ?? "",
      roster.QB ?? "",
      roster.RB ?? "",
      roster.WR ?? "",
      roster.TE ?? "",
      roster.FLEX ?? "",
    ].join("|");
  }

  function profileFor(player) {
    const safePlayer = player || {};
    const key = sleeperRuntimeProfileKey(safePlayer);
    if (sleeperRuntimeProfileCache.has(key)) return sleeperRuntimeProfileCache.get(key);
    const profile = buildSleeperProfile(safePlayer, sleeperContextFor(safePlayer));
    sleeperRuntimeProfileCache.set(key, profile);
    return profile;
  }

  function sleeperPickSnapshot(player, pickNumber) {
    const profile = profileFor(player);
    return Object.freeze({
      modelVersion: profile.modelVersion,
      capturedAt: new Date().toISOString(),
      pickNumber,
      sleeperScore: profile.sleeperScore,
      priceEdgeScore: profile.priceEdgeScore,
      opportunityPathScore: profile.opportunityPathScore,
      talentSignalScore: profile.talentSignalScore,
      ceilingCatalystScore: profile.ceilingCatalystScore,
      leagueFitScore: profile.leagueFitScore,
      roomTimingScore: profile.roomTimingScore,
      confidenceScore: profile.confidenceScore,
      confidenceLabel: profile.confidenceLabel,
      archetype: profile.archetype,
      isSleeper: profile.isSleeper,
      roleSource: profile.roleSource,
      roleConfidence: profile.roleConfidence,
      targetRound: profile.targetRound,
      earliestReasonablePick: profile.earliestReasonablePick,
      latestSafePick: profile.latestSafePick,
      survivalToNextPick: profile.survivalToNextPick,
      rosterRedundancyPenalty: profile.rosterRedundancyPenalty,
    });
  }

  const originalMakePick = makePick;
  makePick = function sleeperAwareMakePick(player) {
    skipLockedPicks();
    const pickNumber = state.currentPick;
    const order = draftOrderFor(pickNumber);
    const snapshot = player && order?.team === state.userTeam ? sleeperPickSnapshot(player, pickNumber) : null;
    sleeperRuntimeProfileCache.clear();
    const result = originalMakePick(player);
    if (snapshot) {
      const completed = state.picks.find((pick) => pick.pick === pickNumber && pick.player?.id === player.id);
      if (completed) completed.sleeperAtPick = snapshot;
    }
    return result;
  };

  const originalMakePickSilent = makePickSilent;
  makePickSilent = function sleeperAwareMakePickSilent(player) {
    skipLockedPicks();
    const pickNumber = state.currentPick;
    const order = draftOrderFor(pickNumber);
    const snapshot = player && order?.team === state.userTeam ? sleeperPickSnapshot(player, pickNumber) : null;
    sleeperRuntimeProfileCache.clear();
    const pick = originalMakePickSilent(player);
    if (pick && snapshot) pick.sleeperAtPick = snapshot;
    return pick;
  };

  const originalCompactPick = compactPick;
  compactPick = function sleeperAwareCompactPick(pick) {
    const compact = originalCompactPick(pick);
    if (pick?.sleeperAtPick) compact.sleeperAtPick = structuredClone(pick.sleeperAtPick);
    return compact;
  };

  function snapshotIdentity(row) {
    return [row.playerId, row.platform, row.format, row.date, row.currentAdp].join("|");
  }

  function captureAdpSnapshots(rows = []) {
    if (!Array.isArray(rows) || !rows.length) return;
    const existing = new Set(state.sleeperLab.adpSnapshots.map(snapshotIdentity));
    const importedAt = new Date().toISOString().slice(0, 10);
    rows.forEach((row) => {
      if (!row?.id || !Number.isFinite(Number(row.adp))) return;
      const snapshot = {
        playerId: String(row.id),
        player: String(row.name || ""),
        platform: String(row.adpSource || row.source || "Uploaded rankings"),
        format: String(row.adpFormat || activeLeague().scoring || "Unknown"),
        date: String(row.adpDate || importedAt),
        dateSource: row.adpDate ? "source" : "import date",
        sampleSize: Number.isFinite(Number(row.adpSampleSize)) ? Number(row.adpSampleSize) : null,
        currentAdp: Number(row.adp),
        movement7Day: Number.isFinite(Number(row.adp7DayChange)) ? Number(row.adp7DayChange) : null,
        movement30Day: Number.isFinite(Number(row.adp30DayChange)) ? Number(row.adp30DayChange) : null,
      };
      const key = snapshotIdentity(snapshot);
      if (!existing.has(key)) {
        existing.add(key);
        state.sleeperLab.adpSnapshots.push(snapshot);
      }
    });
    state.sleeperLab.adpSnapshots = state.sleeperLab.adpSnapshots.slice(-5000);
    saveSleeperLabState();
  }

  const originalImportRankingFiles = importRankingFiles;
  importRankingFiles = async function sleeperAwareImportRankingFiles(files) {
    const result = await originalImportRankingFiles(files);
    captureAdpSnapshots(state.importedRankingRows);
    refreshSleeperProfiles();
    renderSleeperLab();
    return result;
  };

  function profileEvidenceText(profile, direction) {
    return profile.evidence.filter((item) => item.direction === direction).slice(0, 3).map((item) => `${item.label}: ${item.value}`).join(" · ") || (direction === "positive" ? "No strong structured positive evidence supplied." : "No material negative evidence identified.");
  }

  function sleeperFitText(profile) {
    if (profile.rosterRedundancyPenalty >= 20) return "Good player profile, poor current roster fit—watch rather than force.";
    if (profile.leagueFitScore >= 67) return "Strong league-specific fit.";
    if (profile.leagueFitScore >= 52) return "Neutral-to-positive league fit.";
    return "League settings do not materially improve the profile.";
  }

  function sleeperCardHtml(player) {
    const profile = profileFor(player);
    const watched = state.flaggedPlayerIds.has(player.id);
    const portfolio = state.sleeperLab.portfolioIds.has(player.id);
    const survival = profile.survivalToNextPick === null ? "Unknown" : `${Math.round(profile.survivalToNextPick * 100)}%`;
    const freshness = profile.dataFreshness?.label || "Unknown";
    return `<article class="sleeper-card ${profile.isSleeper ? "qualifies" : "does-not-qualify"}" data-sleeper-card="${escapeHtml(player.id)}">
      <div class="sleeper-card-head"><div><span class="sleeper-score" aria-label="Breakout Signal ${Math.round(profile.sleeperScore)}"><b>${Math.round(profile.sleeperScore)}</b><small>Breakout Signal</small></span><div><button class="player-name-button" type="button" data-sleeper-player="${escapeHtml(player.id)}"><strong>${escapeHtml(player.name)}</strong></button><small>${escapeHtml(player.position)} · ${escapeHtml(player.team || "FA")} · Lab #${Math.round(player.consensusRank || 999)}</small></div></div><span class="confidence-badge confidence-${profile.confidenceLabel.toLowerCase()}">${escapeHtml(profile.confidenceLabel)}</span></div>
      <div class="sleeper-card-metrics"><span><b>${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "Unknown"}</b> ADP</span><span><b>${Math.round(profile.priceEdgeScore)}</b> Price edge</span><span><b>${Math.round(profile.leagueFitScore)}</b> League fit</span><span><b>${escapeHtml(profile.archetype)}</b> Archetype</span></div>
      <dl class="sleeper-card-details"><div><dt>Current role</dt><dd>${escapeHtml(profile.currentRole)} <small>${escapeHtml(profile.roleSource)} · ${escapeHtml(profile.roleConfidence)}</small></dd></div><div><dt>Ceiling role</dt><dd>${escapeHtml(profile.ceilingRole)}</dd></div><div><dt>Catalyst</dt><dd>${escapeHtml(profile.catalystDescription)}</dd></div><div><dt>Main blocker</dt><dd>${escapeHtml(profile.primaryBlocker)}</dd></div><div><dt>Target round</dt><dd>Round ${profile.targetRound} · latest safe pick ${profile.latestSafePick}</dd></div><div><dt>Next-pick survival</dt><dd>${survival} · room threats ${escapeHtml(profile.roomThreats.join(", ") || "Unknown")}</dd></div></dl>
      <div class="sleeper-three-questions"><p><strong>Why target</strong>${escapeHtml(profileEvidenceText(profile, "positive"))}</p><p><strong>Why not</strong>${escapeHtml(profile.failureReasons.join(" ") || profileEvidenceText(profile, "negative"))}</p><p><strong>What must happen</strong>${escapeHtml(profile.catalystDescription)}</p></div>
      <p class="sleeper-fit-copy"><strong>Roster/league fit:</strong> ${escapeHtml(sleeperFitText(profile))} · Data freshness: ${escapeHtml(freshness)}</p>
      <div class="button-row"><button type="button" data-sleeper-watch="${escapeHtml(player.id)}">${watched ? "Remove watch" : "Watch"}</button><button type="button" data-sleeper-portfolio="${escapeHtml(player.id)}">${portfolio ? "Remove portfolio" : "Add portfolio"}</button><button type="button" data-player-detail="${escapeHtml(player.id)}">Player Details</button></div>
    </article>`;
  }

  function filteredSleeperPlayers() {
    const filters = state.sleeperLab.filters;
    const query = String(filters.search || "").toLowerCase();
    const minimumAdp = filters.minimumAdp === "" ? null : Number(filters.minimumAdp);
    const maximumAdp = filters.maximumAdp === "" ? null : Number(filters.maximumAdp);
    const minimumScore = Number(filters.minimumScore) || 0;
    const players = PLAYERS.filter((player) => !["K", "DEF"].includes(player.position)).filter((player) => {
      const profile = profileFor(player);
      if (query && !`${player.name} ${player.team} ${player.position} ${profile.archetype}`.toLowerCase().includes(query)) return false;
      if (filters.position !== "ALL" && player.position !== filters.position) return false;
      if (filters.archetype !== "ALL" && profile.archetype !== filters.archetype) return false;
      if (filters.confidence !== "ALL" && profile.confidenceLabel !== filters.confidence) return false;
      if (filters.freshness !== "ALL" && (profile.dataFreshness?.label || "Unknown") !== filters.freshness) return false;
      if (minimumAdp !== null && (!Number.isFinite(player.adp) || player.adp < minimumAdp)) return false;
      if (maximumAdp !== null && (!Number.isFinite(player.adp) || player.adp > maximumAdp)) return false;
      if (profile.sleeperScore < minimumScore) return false;
      return true;
    });
    return players.sort((a, b) => {
      const pa = profileFor(a), pb = profileFor(b);
      if (filters.sort === "adp") return (a.adp || 9999) - (b.adp || 9999);
      if (filters.sort === "confidence") return pb.confidenceScore - pa.confidenceScore || pb.sleeperScore - pa.sleeperScore;
      if (filters.sort === "price") return pb.priceEdgeScore - pa.priceEdgeScore || pb.sleeperScore - pa.sleeperScore;
      if (filters.sort === "timing") return pb.roomTimingScore - pa.roomTimingScore || pb.sleeperScore - pa.sleeperScore;
      return pb.sleeperScore - pa.sleeperScore || a.consensusRank - b.consensusRank;
    });
  }

  function detailHtml(player) {
    if (!player) return `<p class="empty">Select a player to inspect the complete sleeper profile.</p>`;
    const p = profileFor(player);
    const metric = (label, value) => `<div><strong>${Math.round(value)}</strong><span>${label}</span></div>`;
    return `<div class="sleeper-detail-heading"><div><p class="eyebrow">Sleeper profile</p><h3>${escapeHtml(player.name)}</h3><p>${escapeHtml(p.archetype)} · ${escapeHtml(p.confidenceLabel)} confidence · ${escapeHtml(p.dataFreshness?.label || "Unknown")} data</p></div><span class="sleeper-detail-score">${Math.round(p.sleeperScore)}</span></div>
      <div class="sleeper-component-grid">${metric("Price edge", p.priceEdgeScore)}${metric("Opportunity", p.opportunityPathScore)}${metric("Talent", p.talentSignalScore)}${metric("Catalyst", p.ceilingCatalystScore)}${metric("League fit", p.leagueFitScore)}${metric("Room timing", p.roomTimingScore)}</div>
      <div class="rank-analysis-grid"><section><h4>Role and provenance</h4><p><strong>Current:</strong> ${escapeHtml(p.currentRole)}</p><p><strong>Ceiling:</strong> ${escapeHtml(p.ceilingRole)}</p><p>${escapeHtml(p.roleSource)} · ${escapeHtml(p.roleConfidence)} confidence. Ranking inference is never presented as verified depth-chart data.</p></section><section><h4>Acquisition window</h4><p>Round ${p.targetRound}; earliest pick ${p.earliestReasonablePick}; latest safe pick ${p.latestSafePick}.</p><p>Survival to next pick: ${p.survivalToNextPick === null ? "Unknown" : `${Math.round(p.survivalToNextPick * 100)}%`}.</p></section><section><h4>Structured evidence</h4>${listItemsHtml(p.evidence.map((item) => `${item.direction === "negative" ? "Risk" : "Signal"}: ${item.label} — ${item.value}`))}</section><section><h4>Failure conditions</h4>${listItemsHtml(p.failureReasons, "No dominant failure condition in supplied data.")}</section><section><h4>Missing data</h4>${listItemsHtml(p.missingData, "No material model inputs are missing.")}</section></div>`;
  }

  function marketMoverRows() {
    const byPlayer = new Map();
    state.sleeperLab.adpSnapshots.forEach((snapshot) => {
      if (!byPlayer.has(snapshot.playerId)) byPlayer.set(snapshot.playerId, []);
      byPlayer.get(snapshot.playerId).push(snapshot);
    });
    return [...byPlayer.entries()].map(([playerId, rows]) => {
      const sorted = rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const latest = sorted[sorted.length - 1];
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      return { playerId, latest, previous, change: previous ? latest.currentAdp - previous.currentAdp : latest.movement7Day };
    }).filter((row) => Number.isFinite(row.change)).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 12);
  }

  function calibrationHtml() {
    const outcomes = state.sleeperLab.outcomeRows;
    const savedProfiles = state.completedDrafts.flatMap((draft) => draft.sleeperProfiles || []);
    if (!outcomes.length || !savedProfiles.length) {
      return `<p><strong>Calibration unavailable.</strong> Import season outcomes and save at least one completed draft containing draft-time breakout evidence. No historical outcome is fabricated.</p>`;
    }
    const outcomeMap = new Map(outcomes.map((row) => [row.playerId, row]));
    const matched = savedProfiles.filter((row) => outcomeMap.has(row.playerId));
    if (!matched.length) return `<p><strong>Calibration unavailable.</strong> The imported outcomes do not match saved draft-time player IDs.</p>`;
    const paired = matched.map((row) => ({ score: Number(row.sleeperScore), outcome: Number(outcomeMap.get(row.playerId)?.outcomeScore) })).filter((row) => Number.isFinite(row.score) && Number.isFinite(row.outcome));
    const averageOutcome = (rows) => rows.length ? rows.reduce((sum, row) => sum + row.outcome, 0) / rows.length : null;
    const correlation = (() => {
      if (paired.length < 3) return null;
      const meanScore = paired.reduce((sum, row) => sum + row.score, 0) / paired.length;
      const meanOutcome = paired.reduce((sum, row) => sum + row.outcome, 0) / paired.length;
      const numerator = paired.reduce((sum, row) => sum + (row.score - meanScore) * (row.outcome - meanOutcome), 0);
      const scoreSpread = Math.sqrt(paired.reduce((sum, row) => sum + (row.score - meanScore) ** 2, 0));
      const outcomeSpread = Math.sqrt(paired.reduce((sum, row) => sum + (row.outcome - meanOutcome) ** 2, 0));
      return scoreSpread && outcomeSpread ? numerator / (scoreSpread * outcomeSpread) : null;
    })();
    const bands = [
      { label: "70+", rows: paired.filter((row) => row.score >= 70) },
      { label: "60–69.9", rows: paired.filter((row) => row.score >= 60 && row.score < 70) },
      { label: "Below 60", rows: paired.filter((row) => row.score < 60) },
    ];
    return `<p>${paired.length} saved draft-time profiles matched imported outcomes. Score/outcome correlation: <strong>${correlation === null ? "Unknown (need at least three varied matches)" : correlation.toFixed(2)}</strong>.</p><div class="sleeper-calibration-rows">${bands.map((band) => `<div><strong>${band.label}</strong><span>${band.rows.length} players · average outcome ${band.rows.length ? averageOutcome(band.rows).toFixed(1) : "Unknown"}</span></div>`).join("")}</div><p class="helper">This is descriptive calibration only. Sample size and the user-supplied outcome definition control interpretation; no historical result is fabricated.</p>`;
  }

  function renderSleeperLab() {
    if (!$(`sleeperLabBoard`)) return;
    const filters = state.sleeperLab.filters;
    ["sleeperLabSearch", "sleeperLabMinimumAdp", "sleeperLabMaximumAdp", "sleeperLabMinimumScore"].forEach((id) => {
      if (!$(id)) return;
      const key = id === "sleeperLabSearch" ? "search" : id === "sleeperLabMinimumAdp" ? "minimumAdp" : id === "sleeperLabMaximumAdp" ? "maximumAdp" : "minimumScore";
      $(id).value = filters[key];
    });
    if ($("sleeperLabPosition")) $("sleeperLabPosition").value = filters.position;
    if ($("sleeperLabArchetype")) $("sleeperLabArchetype").value = filters.archetype;
    if ($("sleeperLabConfidence")) $("sleeperLabConfidence").value = filters.confidence;
    if ($("sleeperLabFreshness")) $("sleeperLabFreshness").value = filters.freshness;
    if ($("sleeperLabSort")) $("sleeperLabSort").value = filters.sort;
    const players = filteredSleeperPlayers();
    const qualifying = players.filter((player) => profileFor(player).isSleeper).length;
    $("sleeperLabSummary").textContent = `${players.length} profiles · ${qualifying} meet structured sleeper qualification · late ADP alone never qualifies`;
    $("sleeperLabBoard").innerHTML = players.slice(0, 120).map(sleeperCardHtml).join("") || `<p class="empty">No players match the current value-breakout filters.</p>`;
    const selected = playerById(state.sleeperLab.selectedPlayerId) || players[0] || null;
    if (selected) state.sleeperLab.selectedPlayerId = selected.id;
    $("sleeperLabDetail").innerHTML = detailHtml(selected);
    const watched = PLAYERS.filter((player) => state.flaggedPlayerIds.has(player.id)).sort((a, b) => profileFor(b).sleeperScore - profileFor(a).sleeperScore);
    $("sleeperWatchList").innerHTML = watched.length ? watched.slice(0, 20).map((player) => `<button type="button" data-sleeper-player="${escapeHtml(player.id)}"><strong>${escapeHtml(player.name)}</strong><span>${Math.round(profileFor(player).sleeperScore)} · ${escapeHtml(profileFor(player).archetype)}</span></button>`).join("") : `<p class="empty">No watched targets. Watch actions also appear in the Draft Room flagged list.</p>`;
    const portfolio = PLAYERS.filter((player) => state.sleeperLab.portfolioIds.has(player.id)).sort((a, b) => profileFor(b).sleeperScore - profileFor(a).sleeperScore);
    const positions = positionCounts(portfolio);
    $("sleeperPortfolio").innerHTML = portfolio.length ? `<p><strong>${portfolio.length} targets:</strong> ${["QB", "RB", "WR", "TE"].filter((pos) => positions[pos]).map((pos) => `${pos}${positions[pos]}`).join(" · ")}</p>${portfolio.map((player) => `<button type="button" data-sleeper-player="${escapeHtml(player.id)}">${escapeHtml(player.name)} <span>${Math.round(profileFor(player).sleeperScore)}</span></button>`).join("")}` : `<p class="empty">Build a diversified target portfolio instead of stacking one redundant archetype.</p>`;
    $("sleeperWindowPlanner").innerHTML = PLAYERS.filter((player) => profileFor(player).isSleeper).sort((a, b) => profileFor(a).latestSafePick - profileFor(b).latestSafePick).slice(0, 16).map((player) => { const p = profileFor(player); return `<div><button type="button" data-sleeper-player="${escapeHtml(player.id)}">${escapeHtml(player.name)}</button><span>R${p.targetRound} · ${p.earliestReasonablePick}-${p.latestSafePick} · next-pick survival ${p.survivalToNextPick === null ? "Unknown" : `${Math.round(p.survivalToNextPick * 100)}%`}</span></div>`; }).join("") || `<p class="empty">No qualified windows under current data.</p>`;
    const movers = marketMoverRows();
    $("sleeperMarketMovers").innerHTML = movers.length ? movers.map((row) => { const player = playerById(row.playerId); return `<div><strong>${escapeHtml(player?.name || row.latest.player || row.playerId)}</strong><span>ADP ${Number.isFinite(row.latest.currentAdp) ? Number(row.latest.currentAdp).toFixed(1) : "Unknown"} · movement ${row.change > 0 ? "+" : ""}${Number(row.change).toFixed(1)} · ${escapeHtml(row.latest.platform || "Unknown")} · ${escapeHtml(row.latest.format || "Unknown")} · ${escapeHtml(row.latest.date || "Unknown")} · sample ${Number.isFinite(row.latest.sampleSize) ? Math.round(row.latest.sampleSize) : "Unknown"}</span></div>`; }).join("") : `<p class="empty">Unknown. Import dated ADP snapshots to calculate movement history.</p>`;
    $("sleeperCalibration").innerHTML = calibrationHtml();
    $("sleeperLabStatus").textContent = state.sleeperLab.status || "";
    saveSleeperLabState();
  }

  const originalRender = render;
  render = function sleeperAwareRender() {
    const result = originalRender();
    renderSleeperLab();
    return result;
  };

  const originalRenderAvailable = renderAvailable;
  renderAvailable = function sleeperAwareRenderAvailable() {
    const result = originalRenderAvailable();
    document.querySelectorAll("#availableList .available-player").forEach((row) => {
      const id = row.querySelector("[data-player-detail]")?.dataset.playerDetail;
      const player = playerById(id);
      if (!player || row.querySelector(".inline-sleeper-score")) return;
      const profile = profileFor(player);
      if (!profile.isSleeper) return;
      const playerCell = row.children[1];
      if (playerCell) playerCell.insertAdjacentHTML("beforeend", `<span class="inline-sleeper-score" title="${escapeHtml(profile.archetype)} · ${escapeHtml(profile.confidenceLabel)} confidence">Breakout ${Math.round(profile.sleeperScore)}</span>`);
    });
    return result;
  };

  const originalRenderRecommendations = renderRecommendations;
  renderRecommendations = function sleeperAwareRenderRecommendations() {
    const result = originalRenderRecommendations();
    document.querySelectorAll("#decisionCenter [data-player-detail]").forEach((button) => {
      const player = playerById(button.dataset.playerDetail);
      const container = button.closest(".decision-candidate, .decision-title-row, .decision-empty");
      if (!player || !container || container.querySelector(".decision-sleeper-read")) return;
      const p = profileFor(player);
      if (!p.isSleeper) return;
      container.insertAdjacentHTML("beforeend", `<p class="decision-sleeper-read"><strong>Breakout ${Math.round(p.sleeperScore)}</strong> · ${p.twoRoundAdpEdge ? "two-round ADP edge" : `Tier ${p.marketTier} → Tier ${p.labTier}`} · ${escapeHtml(p.confidenceLabel)} confidence${p.rosterRedundancyPenalty >= 20 ? " · Watch-list only due to redundancy" : ""}</p>`);
    });
    return result;
  };

  const originalOpenPlayerDetail = openPlayerDetail;
  openPlayerDetail = function sleeperAwareOpenPlayerDetail(playerId) {
    const result = originalOpenPlayerDetail(playerId);
    const player = playerById(playerId);
    const grid = $("playerDetailModal")?.querySelector(".player-detail-grid");
    if (player && grid && !grid.querySelector(".player-sleeper-profile")) {
      const p = profileFor(player);
      if (p.isSleeper) grid.insertAdjacentHTML("beforeend", `<section class="player-sleeper-profile"><h4>Value Breakout Signal</h4><p><strong>${Math.round(p.sleeperScore)}/100 · ${p.twoRoundAdpEdge ? `${p.priceEdgePicks.toFixed(1)}-pick edge` : `Tier ${p.marketTier} → Tier ${p.labTier}`}</strong> · ${escapeHtml(p.confidenceLabel)} confidence</p><p><strong>Role:</strong> ${escapeHtml(p.currentRole)} → ${escapeHtml(p.ceilingRole)}.</p><p><strong>Catalyst:</strong> ${escapeHtml(p.catalystDescription)}</p><p><strong>Blocker:</strong> ${escapeHtml(p.primaryBlocker)}</p><p><strong>Window:</strong> Round ${p.targetRound}, latest safe pick ${p.latestSafePick}, survival ${p.survivalToNextPick === null ? "Unknown" : `${Math.round(p.survivalToNextPick * 100)}%`}.</p></section>`);
    }
    return result;
  };

  const originalCheatSheetPlayers = cheatSheetPlayers;
  cheatSheetPlayers = function sleeperAwareCheatSheetPlayers() {
    let players = originalCheatSheetPlayers();
    if (state.cheatSheetPlanFilter === "SLEEPER") players = players.filter((player) => profileFor(player).isSleeper);
    if (state.cheatSheetSort === "sleeper") players = [...players].sort((a, b) => profileFor(b).sleeperScore - profileFor(a).sleeperScore || a.consensusRank - b.consensusRank);
    return players;
  };

  const originalRenderCheatSheet = renderCheatSheet;
  renderCheatSheet = function sleeperAwareRenderCheatSheet() {
    const result = originalRenderCheatSheet();
    const players = cheatSheetPlayers().slice(0, 300);
    document.querySelectorAll("#cheatSheetList .cheat-sheet-row").forEach((row, index) => {
      const player = players[index];
      const cell = row.children[2];
      if (!player || !cell || cell.querySelector(".inline-sleeper-score")) return;
      const p = profileFor(player);
      if (!p.isSleeper) return;
      cell.insertAdjacentHTML("beforeend", `<small class="inline-sleeper-score">Breakout ${Math.round(p.sleeperScore)} · ${p.twoRoundAdpEdge ? "2-round edge" : `Tier ${p.marketTier}→${p.labTier}`}</small>`);
    });
    return result;
  };

  const originalBuildDraftPlanPriority = buildDraftPlanPriority;
  buildDraftPlanPriority = function sleeperAwareBuildDraftPlanPriority(summary, survivalRows) {
    const rows = originalBuildDraftPlanPriority(summary, survivalRows).map((row) => ({ ...row }));
    rows.forEach((row) => {
      const p = profileFor(row.player);
      const eligible = p.isSleeper && p.rosterRedundancyPenalty < 20;
      const boost = eligible ? Math.max(0, Math.min(6, (p.sleeperScore - 55) * 0.18)) : 0;
      row.sleeperScore = p.sleeperScore;
      row.sleeperConfidence = p.confidenceLabel;
      row.sleeperArchetype = p.archetype;
      row.sleeperPriorityBoost = boost;
      row.priorityScore = clampNumber(row.priorityScore + boost, 0, 100);
      if (eligible && boost >= 2) row.tags = [...new Set([...(row.tags || []), "Breakout Window"] )];
      if (p.rosterRedundancyPenalty >= 20) row.tags = [...new Set([...(row.tags || []), "Watch-List Only"] )];
    });
    rows.sort((a, b) => b.priorityScore - a.priorityScore || a.labRank - b.labRank);
    rows.forEach((row, index) => { row.priorityRank = index + 1; row.movement = Math.round(row.labRank - row.priorityRank); });
    return rows;
  };

  const originalAggregateCandidateOutcome = aggregateCandidateOutcome;
  aggregateCandidateOutcome = function sleeperAwareAggregateCandidateOutcome(candidate, trials) {
    const result = originalAggregateCandidateOutcome(candidate, trials);
    result.sleeperProfile = profileFor(candidate);
    result.sleeperScore = result.sleeperProfile.sleeperScore;
    return result;
  };

  const originalAssistantPlayerRecord = assistantPlayerRecord;
  assistantPlayerRecord = function sleeperAwareAssistantPlayerRecord(player, outcome = null) {
    const record = originalAssistantPlayerRecord(player, outcome);
    const p = profileFor(player);
    return assistantSafeClone({ ...record, sleeper: {
      sleeperScore: p.sleeperScore,
      priceEdgeScore: p.priceEdgeScore,
      opportunityPathScore: p.opportunityPathScore,
      talentSignalScore: p.talentSignalScore,
      ceilingCatalystScore: p.ceilingCatalystScore,
      leagueFitScore: p.leagueFitScore,
      roomTimingScore: p.roomTimingScore,
      confidenceScore: p.confidenceScore,
      confidenceLabel: p.confidenceLabel,
      archetype: p.archetype,
      currentRole: p.currentRole,
      ceilingRole: p.ceilingRole,
      catalyst: p.catalystDescription,
      blocker: p.primaryBlocker,
      targetRound: p.targetRound,
      earliestReasonablePick: p.earliestReasonablePick,
      latestSafePick: p.latestSafePick,
      survivalToNextPick: p.survivalToNextPick,
      roleSource: p.roleSource,
      roleConfidence: p.roleConfidence,
    } });
  };

  const originalAssistantCompactContextSummary = assistantCompactContextSummary;
  assistantCompactContextSummary = function sleeperAwareAssistantCompactContextSummary() {
    const context = originalAssistantCompactContextSummary();
    const targets = getSleeperTargetsTool({ positions: null, minimumScore: 58, minimumAdp: null, maximumAdp: null, targetType: "all", limit: 6 });
    return assistantSafeClone({ ...context, sleeperLab: { modelVersion: "value-breakout-v2", weights: SLEEPER_SCORE_WEIGHTS, topTargets: targets.targets, calibrationAvailable: Boolean(state.sleeperLab.outcomeRows.length) } });
  };

  function strictNullableToolNumber(value, label, minimum, maximum) {
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
      throw new Error(`${label} must be a finite number from ${minimum} to ${maximum}.`);
    }
    return value;
  }

  function getSleeperTargetsTool(args = {}) {
    assistantRequireObject(args);
    assistantAssertAllowedKeys(args, ["positions", "minimumScore", "minimumAdp", "maximumAdp", "targetType", "limit"]);
    const positions = assistantValidatePositions(args.positions);
    if (positions?.some((position) => !["QB", "RB", "WR", "TE"].includes(position)) || (positions?.length || 0) > 4) {
      throw new Error("Breakout target positions must contain at most QB, RB, WR and TE.");
    }
    const minimumScore = strictNullableToolNumber(args.minimumScore, "minimumScore", 0, 100) ?? 0;
    const minimumAdp = strictNullableToolNumber(args.minimumAdp, "minimumAdp", 1, 500);
    const maximumAdp = strictNullableToolNumber(args.maximumAdp, "maximumAdp", 1, 500);
    if (minimumAdp !== null && maximumAdp !== null && minimumAdp > maximumAdp) throw new Error("minimumAdp cannot exceed maximumAdp.");
    const allowedTypes = ["all", "standalone", "contingent", "breakout", "deep_stash", "market_faller", "league_specific"];
    if (typeof args.targetType !== "string" || !allowedTypes.includes(args.targetType)) throw new Error("Unsupported breakout target type.");
    const targetType = args.targetType;
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 30) throw new Error("limit must be an integer from 1 to 30.");
    const limit = args.limit;
    const targets = availablePlayers().filter((player) => !positions || positions.includes(player.position)).filter((player) => {
      const p = profileFor(player);
      if (!p.isSleeper) return false;
      if (p.sleeperScore < minimumScore) return false;
      if (minimumAdp !== null && (!Number.isFinite(player.adp) || player.adp < minimumAdp)) return false;
      if (maximumAdp !== null && (!Number.isFinite(player.adp) || player.adp > maximumAdp)) return false;
      return targetTypeMatches(p, targetType);
    }).sort((a, b) => sleeperCandidateScore(b) - sleeperCandidateScore(a) || a.consensusRank - b.consensusRank).slice(0, limit).map((player) => {
      const p = profileFor(player);
      return {
        playerId: player.id, name: player.name, position: player.position, nflTeam: player.team, labRank: player.consensusRank,
        adp: Number.isFinite(player.adp) ? player.adp : null,
        qualified: true,
        sleeperScore: p.sleeperScore, priceEdgeScore: p.priceEdgeScore, opportunityPathScore: p.opportunityPathScore,
        talentSignalScore: p.talentSignalScore, ceilingCatalystScore: p.ceilingCatalystScore, leagueFitScore: p.leagueFitScore,
        roomTimingScore: p.roomTimingScore, confidenceScore: p.confidenceScore, confidenceLabel: p.confidenceLabel,
        standaloneValueScore: p.standaloneValueScore, contingentValueScore: p.contingentValueScore, archetype: p.archetype,
        currentRole: p.currentRole, ceilingRole: p.ceilingRole, roleSource: p.roleSource, roleConfidence: p.roleConfidence,
        evidence: p.evidence, missingData: p.missingData, catalyst: { type: p.catalystType, description: p.catalystDescription },
        blocker: p.primaryBlocker, failureReasons: p.failureReasons, targetWindow: { targetRound: p.targetRound, earliestReasonablePick: p.earliestReasonablePick, latestSafePick: p.latestSafePick },
        survivalToNextPick: p.survivalToNextPick, roomPressure: { threats: p.roomThreats, timingScore: p.roomTimingScore },
        rosterDisposition: p.rosterRedundancyPenalty >= 20 ? "watch_list" : "draftable_when_window_opens",
        dataFreshness: p.dataFreshness,
      };
    });
    return assistantSafeClone({ modelVersion: "value-breakout-v2", deterministic: true, targetType, sampleSize: targets.length, targets, limitations: targets.length ? [] : ["No available player matched every requested deterministic filter."] });
  }
  globalThis.getSleeperTargetsTool = getSleeperTargetsTool;

  const originalRunDraftAssistantTool = runDraftAssistantTool;
  runDraftAssistantTool = async function sleeperAwareRunDraftAssistantTool(name, args) {
    if (name === "get_sleeper_targets") return getSleeperTargetsTool(args);
    return originalRunDraftAssistantTool(name, args);
  };

  function localSleeperAdvice(question) {
    const lower = question.toLowerCase();
    let targetType = "all";
    if (/immediately|right now|standalone/.test(lower)) targetType = "standalone";
    else if (/contingent|handcuff|injury upside/.test(lower)) targetType = "contingent";
    else if (/faller|discount/.test(lower)) targetType = "market_faller";
    else if (/league|scoring/.test(lower)) targetType = "league_specific";
    const positions = (lower.match(/\b(qb|rb|wr|te)\b/g) || []).map((pos) => pos.toUpperCase());
    const result = getSleeperTargetsTool({ positions: positions.length ? positions : null, minimumScore: 54, minimumAdp: null, maximumAdp: null, targetType, limit: 5 });
    if (!result.targets.length) return "The value-breakout model does not find a player who meets those deterministic filters. Late ADP by itself is not enough.";
    const rows = result.targets.map((target, index) => `${index + 1}. ${target.name} — Breakout ${Math.round(target.sleeperScore)}, ${target.archetype}, ${target.confidenceLabel} confidence. Window: Round ${target.targetWindow.targetRound}, latest safe pick ${target.targetWindow.latestSafePick}. Catalyst: ${target.catalyst.description} Blocker: ${target.blocker}${target.rosterDisposition === "watch_list" ? " Roster fit makes this a watch-list target, not a forced pick." : ""}`).join("\n");
    return `Deterministic value-breakout targets:\n${rows}\n\nScores come from application data only; the assistant cannot modify them or draft a player.`;
  }

  const originalLocalAssistantResponse = localAssistantResponse;
  localAssistantResponse = function sleeperAwareLocalAssistantResponse(question) {
    const lower = String(question || "").toLowerCase();
    if (/sleeper|contingent|deep stash|market faller|what could make.*fail/.test(lower)) return localSleeperAdvice(question);
    return originalLocalAssistantResponse(question);
  };

  const originalSaveCompletedDraft = saveCompletedDraft;
  saveCompletedDraft = function sleeperAwareSaveCompletedDraft() {
    const draft = originalSaveCompletedDraft();
    if (!draft) return draft;
    draft.sleeperProfiles = draft.picks.filter((pick) => pick.team === draft.userTeam).map((pick) => {
      const player = playerById(pick.player.id) || pick.player;
      const p = pick.sleeperAtPick || profileFor(player);
      return {
        playerId: player.id, player: player.name, position: player.position, pick: pick.pick, label: pick.label,
        sleeperScore: p.sleeperScore, priceEdgeScore: p.priceEdgeScore, opportunityPathScore: p.opportunityPathScore,
        talentSignalScore: p.talentSignalScore, ceilingCatalystScore: p.ceilingCatalystScore, leagueFitScore: p.leagueFitScore,
        roomTimingScore: p.roomTimingScore, confidenceScore: p.confidenceScore, confidenceLabel: p.confidenceLabel,
        archetype: p.archetype, isSleeper: Boolean(p.isSleeper), roleSource: p.roleSource, roleConfidence: p.roleConfidence,
        capturedAt: p.capturedAt || draft.createdAt, savedAt: draft.createdAt, modelVersion: p.modelVersion || "sleeper-lab-v1",
      };
    });
    saveDraftHistory();
    return draft;
  };

  const originalPostDraftProcessGrade = postDraftProcessGrade;
  postDraftProcessGrade = function sleeperAwarePostDraftProcessGrade(selected, picks) {
    const grade = originalPostDraftProcessGrade(selected, picks);
    const userPicks = picks.filter((pick) => pick.team === selected.team);
    const draftedSleepers = userPicks.map((pick) => ({ pick, profile: pick.sleeperAtPick || profileFor(playerById(pick.player.id) || pick.player) })).filter((row) => row.profile.isSleeper);
    grade.sleeperPortfolio = {
      count: draftedSleepers.length,
      averageScore: draftedSleepers.length ? draftedSleepers.reduce((sum, row) => sum + row.profile.sleeperScore, 0) / draftedSleepers.length : 0,
      targets: draftedSleepers.map((row) => `${row.pick.player.name} (${Math.round(row.profile.sleeperScore)}, ${row.profile.archetype})`),
      redundancyWarnings: draftedSleepers.filter((row) => row.profile.rosterRedundancyPenalty >= 20).map((row) => row.pick.player.name),
    };
    state.learning.postDraftGrades[grade.draftId] = grade;
    saveSimulatorState();
    return grade;
  };

  const originalRenderPostDraftProcessGrade = renderPostDraftProcessGrade;
  renderPostDraftProcessGrade = function sleeperAwareRenderPostDraftProcessGrade(grade) {
    const html = originalRenderPostDraftProcessGrade(grade);
    const portfolio = grade.sleeperPortfolio;
    if (!portfolio) return html;
    const insert = `<section class="process-grade-section sleeper-post-grade"><div class="section-heading"><div><p class="eyebrow">Value-breakout portfolio</p><h3>${portfolio.count} qualified breakout${portfolio.count === 1 ? "" : "s"} drafted</h3></div><span>${portfolio.count ? `${portfolio.averageScore.toFixed(1)} average score` : "No forced sleeper quota"}</span></div>${portfolio.targets.length ? listItemsHtml(portfolio.targets) : `<p>No qualified breakout was drafted. This is not automatically a process failure.</p>`}${portfolio.redundancyWarnings.length ? `<p><strong>Redundancy warnings:</strong> ${escapeHtml(portfolio.redundancyWarnings.join(", "))}</p>` : ""}</section>`;
    return `${html}${insert}`;
  };

  const originalBulkPriorityCsv = bulkPriorityCsv;
  bulkPriorityCsv = function sleeperAwareBulkPriorityCsv(rows) {
    const base = originalBulkPriorityCsv(rows);
    const lines = base.split("\n");
    if (!lines.length) return base;
    lines[0] += ",sleeper_score,sleeper_confidence,sleeper_archetype,sleeper_priority_boost";
    return lines.map((line, index) => {
      if (index === 0 || !line) return line;
      const row = rows[index - 1];
      const p = row?.player ? profileFor(row.player) : null;
      return `${line},${p?.sleeperScore ?? ""},${csvEscape(p?.confidenceLabel || "")},${csvEscape(p?.archetype || "")},${row?.sleeperPriorityBoost ?? ""}`;
    }).join("\n");
  };

  const originalBulkAllPicksCsv = bulkAllPicksCsv;
  bulkAllPicksCsv = function sleeperAwareBulkAllPicksCsv(runs) {
    const base = originalBulkAllPicksCsv(runs);
    const lines = base.split("\n");
    if (!lines.length) return base;
    lines[0] += ",sleeper_score,sleeper_confidence,sleeper_archetype";
    const flat = runs.flatMap((run) => (run.picks || []).map((pick) => ({ run, pick })));
    return lines.map((line, index) => {
      if (index === 0 || !line) return line;
      const item = flat[index - 1];
      const player = item ? playerById(item.pick.player?.id || item.pick.playerId) : null;
      const p = player ? profileFor(player) : null;
      return `${line},${p?.sleeperScore ?? ""},${csvEscape(p?.confidenceLabel || "")},${csvEscape(p?.archetype || "")}`;
    }).join("\n");
  };

  const originalExportCustomBoardCsv = exportCustomBoardCsv;
  exportCustomBoardCsv = function sleeperAwareExportCustomBoardCsv() {
    const headers = ["lab_rank", "player", "position", "team", "adp", "sleeper_score", "price_edge", "opportunity_path", "talent_signal", "ceiling_catalyst", "league_fit", "room_timing", "confidence", "archetype", "current_role", "role_source", "role_confidence", "catalyst", "primary_blocker", "target_round", "earliest_pick", "latest_safe_pick", "survival_to_next_pick", "missing_data"];
    const rows = PLAYERS.map((player) => { const p = profileFor(player); return [player.consensusRank, player.name, player.position, player.team, Number.isFinite(player.adp) ? player.adp : "", p.sleeperScore, p.priceEdgeScore, p.opportunityPathScore, p.talentSignalScore, p.ceilingCatalystScore, p.leagueFitScore, p.roomTimingScore, p.confidenceLabel, p.archetype, p.currentRole, p.roleSource, p.roleConfidence, p.catalystDescription, p.primaryBlocker, p.targetRound, p.earliestReasonablePick, p.latestSafePick, p.survivalToNextPick ?? "", p.missingData.join(" | ")]; });
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `fantasy-draft-labs-sleeper-board-${new Date().toISOString().slice(0, 10)}.csv`);
    state.sleeperLab.status = "Exported the deterministic value-breakout data.";
    renderSleeperLab();
  };

  function parseOutcomeRows(text) {
    return parseCsv(text, "Season outcomes").map((row) => {
      const name = importedValue(row, ["player", "name", "player_name"]);
      const player = PLAYERS.find((candidate) => candidate.id === playerKey(name));
      const outcomeScore = numberValue(importedValue(row, ["outcome_score", "outcome score", "fantasy_points", "points", "finish_score"]));
      const season = importedValue(row, ["season", "year"]);
      if (!player || !Number.isFinite(outcomeScore)) return null;
      return { playerId: player.id, player: player.name, outcomeScore, season: String(season || "Unknown"), importedAt: new Date().toISOString() };
    }).filter(Boolean);
  }

  function setupSleeperLabEvents() {
    document.addEventListener("click", (event) => {
      const playerId = event.target.closest("[data-sleeper-player]")?.dataset.sleeperPlayer;
      const watchId = event.target.closest("[data-sleeper-watch]")?.dataset.sleeperWatch;
      const portfolioId = event.target.closest("[data-sleeper-portfolio]")?.dataset.sleeperPortfolio;
      if (playerId) { state.sleeperLab.selectedPlayerId = playerId; saveSleeperLabState(); renderSleeperLab(); return; }
      if (watchId) { if (state.flaggedPlayerIds.has(watchId)) state.flaggedPlayerIds.delete(watchId); else state.flaggedPlayerIds.add(watchId); saveFlaggedPlayers(); renderAvailable(); renderSleeperLab(); return; }
      if (portfolioId) { if (state.sleeperLab.portfolioIds.has(portfolioId)) state.sleeperLab.portfolioIds.delete(portfolioId); else state.sleeperLab.portfolioIds.add(portfolioId); saveSleeperLabState(); renderSleeperLab(); return; }
    });
    document.addEventListener("input", (event) => {
      const map = { sleeperLabSearch: "search", sleeperLabMinimumAdp: "minimumAdp", sleeperLabMaximumAdp: "maximumAdp", sleeperLabMinimumScore: "minimumScore" };
      if (!map[event.target.id]) return;
      state.sleeperLab.filters[map[event.target.id]] = event.target.value;
      renderSleeperLab();
    });
    document.addEventListener("change", async (event) => {
      const map = { sleeperLabPosition: "position", sleeperLabArchetype: "archetype", sleeperLabConfidence: "confidence", sleeperLabFreshness: "freshness", sleeperLabSort: "sort" };
      if (map[event.target.id]) { state.sleeperLab.filters[map[event.target.id]] = event.target.value; renderSleeperLab(); return; }
      if (event.target.id === "sleeperOutcomeUpload") {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const rows = parseOutcomeRows(await file.text());
          state.sleeperLab.outcomeRows = rows;
          state.sleeperLab.status = rows.length ? `Imported ${rows.length} season outcomes for future-facing calibration.` : "No matching outcome rows were found. Use player and outcome_score columns.";
          saveSleeperLabState();
          renderSleeperLab();
        } catch (error) {
          state.sleeperLab.status = `Outcome import failed: ${error.message}`;
          renderSleeperLab();
        } finally { event.target.value = ""; }
      }
    });
  }

  function populateSleeperFilterOptions() {
    if ($("sleeperLabArchetype")) $("sleeperLabArchetype").innerHTML = `<option value="ALL">All archetypes</option>${ARCHETYPES.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  }

  refreshSleeperProfiles();
  captureAdpSnapshots(state.importedRankingRows);
  populateSleeperFilterOptions();
  setupSleeperLabEvents();
  renderSleeperLab();
  render();
})();
