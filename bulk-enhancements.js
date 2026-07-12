(function enhanceBulkSimulator() {
  if (!window.document || typeof state === "undefined") return;

  state.bulk.team = Math.max(1, Math.min(LEAGUE.teams, Number(state.bulk.team) || state.userTeam || 1));
  state.keeperValueTeam = state.keeperValueTeam || "all";

  const originalBulkPersonaMix = bulkPersonaMix;

  function bulkTargetTeam() {
    return Math.max(1, Math.min(LEAGUE.teams, Number(state.bulk.team) || state.userTeam || 1));
  }

  function bulkTargetName(team = bulkTargetTeam()) {
    return teamName(team);
  }

  function personaNameForTeam(team) {
    return getPersonaForTeam(team)?.name || "Balanced drafter";
  }

  function installKeeperToolUi() {
    const tabs = document.querySelector(".workspace-tabs");
    if (tabs && !$("[data-panel-tab='keepers']")) {
      const button = document.createElement("button");
      button.dataset.panelTab = "keepers";
      button.type = "button";
      button.textContent = "Keepers";
      const setupTab = tabs.querySelector("[data-panel-tab='setup']");
      tabs.insertBefore(button, setupTab || tabs.children[2] || null);
    }

    const workspace = document.querySelector(".workspace");
    if (workspace && !$("[data-panel='keepers']")) {
      const panel = document.createElement("section");
      panel.className = "keeper-value-panel workspace-panel";
      panel.dataset.panel = "keepers";
      panel.setAttribute("aria-labelledby", "keeper-value-heading");
      panel.hidden = true;
      panel.innerHTML = `
        <div class="panel-heading ownership-heading">
          <div>
            <p class="eyebrow">Keeper value</p>
            <h2 id="keeper-value-heading">Keeper Rankings</h2>
          </div>
          <label class="keeper-focus-select">
            Team
            <select id="keeperValueTeamSelect"></select>
          </label>
        </div>
        <p class="helper">Ranks Sleeper-imported keeper candidates by current ADP discount, projected impact when a projection upload is available, and the actual pick each team would lose in that keeper round.</p>
        <div id="keeperValueResults" class="keeper-value-results"></div>
      `;
      const orderPanel = $("[data-panel='setup']");
      workspace.insertBefore(panel, orderPanel || workspace.querySelector("[data-panel='trade']"));
    }
  }

  function originalSlotIndexForRound(team, round) {
    return Number(round) % 2 === 1 ? team - 1 : LEAGUE.teams - team;
  }

  function keeperCostPickForTeam(team, round) {
    const roundIndex = Number(round) - 1;
    const order = state.roundOrders[roundIndex] || [];
    const ownedIndexes = order
      .map((owner, index) => owner === team ? index : null)
      .filter((index) => index !== null);
    if (!ownedIndexes.length) return null;
    const originalIndex = originalSlotIndexForRound(team, round);
    const closestIndex = ownedIndexes.sort((a, b) => Math.abs(a - originalIndex) - Math.abs(b - originalIndex) || a - b)[0];
    return {
      pick: roundIndex * LEAGUE.teams + closestIndex + 1,
      round: Number(round),
      index: closestIndex,
      label: `${Number(round)}.${String(closestIndex + 1).padStart(2, "0")}`,
      originalLabel: `${Number(round)}.${String(originalIndex + 1).padStart(2, "0")}`,
      pickCountInRound: ownedIndexes.length,
    };
  }

  function projectedSeasonTotalForPlayer(player) {
    const rows = (state.importedRankingRows || [])
      .filter((row) => row.id === player.id && Number.isFinite(Number(row.projection)))
      .map((row) => Number(row.projection));
    if (!rows.length) return null;
    return median(rows);
  }

  function keeperCandidateRowsForTeam(team) {
    const importedTeam = state.sleeper.importData?.teams?.[team - 1];
    if (!importedTeam?.keeperCandidates?.length) return [];
    return importedTeam.keeperCandidates
      .map((candidate) => {
        const player = playerById(candidate.playerId);
        if (!player || !candidate.round) return null;
        const cost = keeperCostPickForTeam(team, candidate.round);
        const adpPick = Number.isFinite(player.adp) ? player.adp : player.consensusRank || player.rank || null;
        const marketRound = adpPick ? Math.max(1, adpPick / LEAGUE.teams) : null;
        const valuePicks = cost && adpPick ? cost.pick - adpPick : -999;
        const projectionTotal = projectedSeasonTotalForPlayer(player);
        const projectedAvg = Number.isFinite(projectionTotal) ? projectionTotal / 16 : null;
        const adpImpact = adpPick ? Math.max(0, (LEAGUE.teams * LEAGUE.rounds - adpPick) / 10) : 0;
        const projectionImpact = Number.isFinite(projectedAvg) ? projectedAvg * 2.8 : 0;
        const scarcity = player.position === "RB" ? 5 : player.position === "WR" ? 4 : player.position === "TE" ? 3 : player.position === "QB" ? 2 : 0;
        const score = cost
          ? (Math.max(-24, valuePicks) * 1.35) + adpImpact + projectionImpact + scarcity
          : -999;
        return {
          team,
          player,
          round: Number(candidate.round),
          cost,
          adpPick,
          marketRound,
          valuePicks,
          projectionTotal,
          projectedAvg,
          score,
          status: cost ? "Eligible" : "No owned pick in round",
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  function formatKeeperAdp(candidate) {
    if (!candidate.adpPick) return "N/A";
    return `Pick ${candidate.adpPick.toFixed(1)} / R${candidate.marketRound.toFixed(1)}`;
  }

  function formatKeeperProjection(candidate) {
    if (!Number.isFinite(candidate.projectedAvg)) return "N/A";
    return `${candidate.projectedAvg.toFixed(1)} avg`;
  }

  function keeperValueSummary(candidate) {
    if (!candidate.cost) return "Cannot keep without a pick in that round.";
    const valueText = candidate.valuePicks >= 0
      ? `${candidate.valuePicks.toFixed(1)} picks cheaper than ADP`
      : `${Math.abs(candidate.valuePicks).toFixed(1)} picks above ADP`;
    const multiPickText = candidate.cost.pickCountInRound > 1
      ? ` Multiple owned picks in Round ${candidate.round}; using ${candidate.cost.label}, closest to original slot ${candidate.cost.originalLabel}.`
      : "";
    return `${valueText}.${multiPickText}`;
  }

  function renderKeeperCandidateCard(candidate, rank) {
    const isSelected = state.keeperSelections[candidate.team - 1]?.playerId === candidate.player.id;
    return `
      <article class="keeper-candidate-card ${rank === 0 ? "leader" : ""} ${isSelected ? "selected" : ""}">
        <div>
          <strong>${rank + 1}. ${escapeHtml(candidate.player.name)}</strong>
          <span>${candidate.player.position} ${candidate.player.team} - ${escapeHtml(candidate.status)}</span>
        </div>
        <div><b>Keep cost</b><span>${candidate.cost ? candidate.cost.label : `Round ${candidate.round}`}</span></div>
        <div><b>ADP</b><span>${formatKeeperAdp(candidate)}</span></div>
        <div><b>Proj avg</b><span>${formatKeeperProjection(candidate)}</span></div>
        <div><b>Value</b><span>${candidate.cost ? candidate.valuePicks.toFixed(1) : "N/A"}</span></div>
        <p>${escapeHtml(keeperValueSummary(candidate))}</p>
        <button data-apply-keeper="${candidate.team}:${candidate.player.id}:${candidate.round}" type="button" ${candidate.cost ? "" : "disabled"}>
          ${isSelected ? "Selected keeper" : "Use as keeper"}
        </button>
      </article>
    `;
  }

  function renderKeeperValueTool() {
    installKeeperToolUi();
    if (!$("keeperValueResults")) return;
    const selectedValue = state.keeperValueTeam || "all";
    const selectedTeam = Math.max(1, Math.min(LEAGUE.teams, Number(selectedValue) || state.userTeam || 1));
    $("keeperValueTeamSelect").innerHTML = `<option value="all" ${selectedValue === "all" ? "selected" : ""}>All teams</option>${Array.from({ length: LEAGUE.teams }, (_, index) => {
      const team = index + 1;
      return `<option value="${team}" ${selectedValue !== "all" && team === selectedTeam ? "selected" : ""}>${escapeHtml(teamName(team))}</option>`;
    }).join("")}`;
    $("keeperValueTeamSelect").value = selectedValue === "all" ? "all" : String(selectedTeam);

    if (!state.sleeper.importData) {
      $("keeperValueResults").innerHTML = `
        <div class="keeper-empty">
          <h3>Import a Sleeper league to rank keeper options.</h3>
          <p>The tool needs last year's draft round and rostered players from Sleeper. Projection averages will appear only after you upload a rankings/projections file with a <code>projection</code> or <code>points</code> column.</p>
        </div>
      `;
      return;
    }

    const teams = selectedValue === "all"
      ? Array.from({ length: LEAGUE.teams }, (_, index) => index + 1)
      : [selectedTeam];
    const hasProjectionUploads = (state.importedRankingRows || []).some((row) => Number.isFinite(Number(row.projection)));
    const teamCards = teams.map((team) => {
      const rows = keeperCandidateRowsForTeam(team).slice(0, 5);
      return `
        <section class="keeper-team-card">
          <div class="keeper-team-head">
            <div>
              <p class="eyebrow">${escapeHtml(teamName(team))}</p>
              <h3>Top Keeper Options</h3>
            </div>
            <span>${escapeHtml(teamKeeperLabel(team))}</span>
          </div>
          ${rows.length ? rows.map(renderKeeperCandidateCard).join("") : `<p class="empty">No ranked Sleeper keeper candidates matched the current player database for this team.</p>`}
        </section>
      `;
    }).join("");

    $("keeperValueResults").innerHTML = `
      <div class="keeper-method-note">
        <strong>Recommended home:</strong> this belongs in its own Keepers tab, between League and Pick Order, because it uses league import data and directly affects draft setup.
        ${hasProjectionUploads ? "" : "<span> Projection averages are hidden until a projection/points upload is available; the ranking is currently driven by ADP discount and player market impact.</span>"}
      </div>
      <div class="keeper-team-grid">${teamCards}</div>
    `;
  }

  const originalRender = render;
  render = function enhancedRender() {
    originalRender();
    renderKeeperValueTool();
    renderWorkspacePanels();
  };

  function teamKeeperLabel(team) {
    const selection = state.keeperSelections[team - 1];
    if (!selection?.playerId || !selection.round) return "No keeper";
    const player = playerById(selection.playerId);
    if (!player) return `Round ${selection.round} keeper`;
    return `${player.name} in Round ${selection.round}`;
  }

  function recommendationOptionsForTeam(team, pickNumber, strategy, runIndex, limit = 5) {
    return candidatePoolForTeam(team, pickNumber, 44)
      .map((player) => ({ player, score: bulkUserPickScore(player, team, pickNumber, strategy, runIndex) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ player, score }) => ({
        id: player.id,
        name: player.name,
        position: player.position,
        team: player.team,
        rank: player.consensusRank,
        score,
      }));
  }

  bulkPersonaMix = function enhancedBulkPersonaMix(runIndex, seed) {
    if (!state.bulk.randomizeRoom) return [...state.teamPersonas];
    const targetTeam = bulkTargetTeam();
    return Array.from({ length: LEAGUE.teams }, (_, index) => {
      if (index + 1 === targetTeam) return state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id;
      const baseIndex = PERSONAS.findIndex((persona) => persona.id === (state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id));
      const shift = Math.abs(Math.round(seededWave(seed, runIndex, index) * 4));
      return PERSONAS[(baseIndex + shift + PERSONAS.length) % PERSONAS.length].id;
    });
  };

  bulkUserPick = function enhancedBulkUserPick(strategy, runIndex, team = bulkTargetTeam()) {
    return candidatePoolForTeam(team, state.currentPick, 44)
      .map((player) => ({ player, score: bulkUserPickScore(player, team, state.currentPick, strategy, runIndex) }))
      .sort((a, b) => b.score - a.score)[0]?.player || null;
  };

  simulateBulkDraft = function enhancedSimulateBulkDraft(strategy, runIndex) {
    const snapshot = {
      picks: state.picks,
      draftedIds: state.draftedIds,
      currentPick: state.currentPick,
      strategy: state.strategy,
      mockSeed: state.mockSeed,
      teamPersonas: state.teamPersonas,
      viewedDraftId: state.viewedDraftId,
    };
    const targetTeam = bulkTargetTeam();
    const seed = Date.now() * 0.001 + runIndex * 101.37;
    const targetPickSnapshots = [];

    try {
      state.viewedDraftId = null;
      state.strategy = strategy;
      state.mockSeed = seed;
      state.teamPersonas = bulkPersonaMix(runIndex, seed);
      state.picks = buildKeeperPicks();
      state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
      state.currentPick = 1;
      skipLockedPicks();

      const total = LEAGUE.teams * LEAGUE.rounds;
      while (state.currentPick <= total) {
        const order = draftOrderFor(state.currentPick);
        if (order.team === targetTeam) {
          const availableRecommendations = recommendationOptionsForTeam(targetTeam, state.currentPick, strategy, runIndex, 6);
          const player = bulkUserPick(strategy, runIndex, targetTeam);
          if (!player) break;
          targetPickSnapshots.push({
            pick: state.currentPick,
            round: order.round,
            label: order.label,
            available: availableRecommendations,
            player,
          });
          makePickSilent(player);
        } else {
          const player = personaPick(order.team, state.currentPick);
          if (!player) break;
          makePickSilent(player);
        }
      }

      const analyses = allTeamAnalyses();
      const targetAnalysis = analyses.find((analysis) => analysis.team === targetTeam) || analyzeTeam(targetTeam, state.picks);
      const targetPicks = state.picks.filter((pick) => pick.team === targetTeam).sort((a, b) => a.pick - b.pick);
      const firstFive = targetPicks.slice(0, 5);
      return {
        id: `bulk-${Date.now()}-${runIndex}`,
        runIndex: runIndex + 1,
        strategy,
        strategyLabel: BULK_STRATEGIES.find((item) => item.id === strategy)?.label || strategy,
        simulatedTeam: targetTeam,
        simulatedTeamName: bulkTargetName(targetTeam),
        simulatedKeeper: teamKeeperLabel(targetTeam),
        rank: targetAnalysis.rank || analyses.findIndex((analysis) => analysis.team === targetTeam) + 1,
        grade: targetAnalysis.grade || gradeFromRank(targetAnalysis.rank || 12),
        playoffOdds: targetAnalysis.playoffOdds || 0,
        weeklyProjection: targetAnalysis.weeklyProjection,
        score: targetAnalysis.score,
        value: targetAnalysis.value,
        balance: targetAnalysis.balance,
        firstFiveBuild: firstFive.map((pick) => pick.player.position).join("-") || "None",
        firstFivePlayers: firstFive.map((pick) => `${pick.player.name} (${pick.player.position})`),
        userPicks: targetPicks.map(compactPick),
        userRoster: targetAnalysis.roster.map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) })),
        strengths: targetAnalysis.strengths,
        weaknesses: targetAnalysis.weaknesses,
        pickBreakdown: targetAnalysis.pickBreakdown.slice(0, 8).map((pick) => ({
          pick: pick.pick,
          label: pick.label,
          player: pick.player,
          pickValue: pick.pickValue,
          alternatives: pick.alternatives.slice(0, 3),
        })),
        availability: targetPickSnapshots,
      };
    } finally {
      restoreSimulationState(snapshot);
    }
  };

  function commonRecommendationsByRound(runs) {
    const roundMap = new Map();
    runs.forEach((run) => {
      run.availability.forEach((snapshot) => {
        if (!roundMap.has(snapshot.round)) roundMap.set(snapshot.round, new Map());
        const players = roundMap.get(snapshot.round);
        snapshot.available.slice(0, 4).forEach((player, index) => {
          const key = `${player.name}:${player.position}`;
          const existing = players.get(key) || { round: snapshot.round, name: player.name, position: player.position, count: 0, topOptionCount: 0 };
          existing.count += 1;
          if (index === 0) existing.topOptionCount += 1;
          players.set(key, existing);
        });
      });
    });
    return [...roundMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, players]) => ({
        round,
        players: [...players.values()]
          .sort((a, b) => b.count - a.count || b.topOptionCount - a.topOptionCount)
          .slice(0, 5)
          .map((player) => ({ ...player, rate: runs.length ? player.count / runs.length : 0 })),
      }));
  }

  function summarizeOtherTeams(runs) {
    const targetTeam = bulkTargetTeam();
    return Array.from({ length: LEAGUE.teams }, (_, index) => index + 1)
      .filter((team) => team !== targetTeam)
      .map((team) => {
        const persona = getPersonaForTeam(team);
        const picks = allOwnedPickOptions(team);
        const earlyPicks = picks.filter((pick) => pick.round <= 5).length;
        const keeper = teamKeeperLabel(team);
        return {
          team,
          name: teamName(team),
          persona: persona.name,
          style: persona.strategyStyle,
          earlyPicks,
          keeper,
        };
      })
      .sort((a, b) => b.earlyPicks - a.earlyPicks)
      .slice(0, 6);
  }

  function buildBulkAiSummary(summary, runs) {
    const targetTeam = bulkTargetTeam();
    const bestStrategy = summary.bestStrategy;
    const bestBuild = summary.bestBuild;
    const runnerUp = summary.strategies[1];
    const topRecommendedRound = summary.commonRecommendations.find((round) => round.players.length)?.players[0];
    const targetPersona = personaNameForTeam(targetTeam);
    const pressureTeams = summary.otherTeams.slice(0, 4).map((team) => `${team.name} (${team.persona})`).join(", ");
    const keeperText = teamKeeperLabel(targetTeam);
    const strategyGap = runnerUp ? bestStrategy.avgScore - runnerUp.avgScore : 0;
    const confidence = strategyGap >= 4 ? "clear" : strategyGap >= 1.5 ? "modest" : "thin";
    const buildText = bestBuild ? `${bestBuild.label} was the best early roster shape` : "No stable early build emerged";
    const playerText = topRecommendedRound
      ? `${topRecommendedRound.name} was one of the most frequent recommended available names`
      : "The recommended available-player pool was spread out";

    return [
      `${bulkTargetName(targetTeam)} was simulated with ${keeperText} locked in and all league keepers/traded picks applied before every run.`,
      `${bestStrategy?.label || "The leading strategy"} had a ${confidence} edge; ${buildText}, averaging ${formatNumber(bestBuild?.avgProjection)} starter points and a ${percent(bestBuild?.top3Rate)} top-3 rate.`,
      `${playerText}, which means your real draft plan should include a pivot list instead of anchoring to one player.`,
      `Room pressure came most from ${pressureTeams || "the surrounding managers"}; their personas make positional runs more likely when their roster needs line up with tier breaks.`,
      `For the real draft, start with the best strategy, but watch the first two rounds closely: if RB-heavy teams pull backs forward, lean into WR/elite onesie value; if WR value dries up, use your next pick window to secure RB depth before the middle rounds.`,
    ];
  }

  summarizeBulkResults = function enhancedSummarizeBulkResults(runs) {
    const byStrategy = BULK_STRATEGIES
      .map((strategy) => summarizeRunGroup(runs.filter((run) => run.strategy === strategy.id), strategy.label))
      .filter((group) => group.count)
      .sort((a, b) => b.avgScore - a.avgScore);
    const buildMap = new Map();
    runs.forEach((run) => {
      if (!buildMap.has(run.firstFiveBuild)) buildMap.set(run.firstFiveBuild, []);
      buildMap.get(run.firstFiveBuild).push(run);
    });
    const builds = [...buildMap.entries()]
      .map(([build, buildRuns]) => summarizeRunGroup(buildRuns, build))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 8);
    const playerMap = new Map();
    runs.forEach((run) => {
      run.userPicks.slice(0, 8).forEach((pick, index) => {
        const key = `${index + 1}:${pick.player.name}:${pick.player.position}`;
        playerMap.set(key, (playerMap.get(key) || 0) + 1);
      });
    });
    const commonPlayers = [...playerMap.entries()]
      .map(([key, count]) => {
        const [round, name, position] = key.split(":");
        return { round: Number(round), name, position, count, rate: count / runs.length };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    const bestOverall = [...runs].sort((a, b) => b.score - a.score)[0] || null;
    const worstOverall = [...runs].sort((a, b) => a.score - b.score)[0] || null;
    const medianOverall = [...runs].sort((a, b) => b.score - a.score)[Math.floor(runs.length / 2)] || null;
    const summary = {
      createdAt: new Date().toISOString(),
      totalRuns: runs.length,
      simulatedTeam: bulkTargetTeam(),
      simulatedTeamName: bulkTargetName(),
      simulatedKeeper: teamKeeperLabel(bulkTargetTeam()),
      strategies: byStrategy,
      builds,
      commonPlayers,
      commonRecommendations: commonRecommendationsByRound(runs),
      otherTeams: summarizeOtherTeams(runs),
      examples: [bestOverall, medianOverall, worstOverall].filter(Boolean),
      bestStrategy: byStrategy[0] || null,
      bestBuild: builds[0] || null,
    };
    summary.aiSummary = buildBulkAiSummary(summary, runs);
    return summary;
  };

  startBulkSimulations = function enhancedStartBulkSimulations() {
    if (state.bulk.running) return;
    state.bulk.count = Math.max(1, Math.min(100, Number($("bulkCountInput").value) || 50));
    state.bulk.mode = $("bulkModeSelect").value;
    state.bulk.strategy = $("bulkStrategySelect").value;
    state.bulk.team = Math.max(1, Math.min(LEAGUE.teams, Number($("bulkTeamSelect")?.value) || state.userTeam || 1));
    state.bulk.randomizeRoom = $("bulkRandomizeRoomInput").checked;
    const schedule = bulkStrategySchedule();
    const runs = [];
    state.bulk.running = true;
    state.bulk.progress = 0;
    state.bulk.total = schedule.length;
    state.bulk.results = null;
    state.bulk.selectedRunId = null;
    renderBulkSimulator();

    const runBatch = () => {
      const batchSize = 5;
      const start = state.bulk.progress;
      const end = Math.min(schedule.length, start + batchSize);
      for (let index = start; index < end; index += 1) {
        runs.push(simulateBulkDraft(schedule[index], index));
        state.bulk.progress = index + 1;
      }
      renderBulkSimulator();
      if (state.bulk.progress < schedule.length) {
        window.setTimeout(runBatch, 0);
        return;
      }
      state.bulk.running = false;
      state.bulk.results = { runs, summary: summarizeBulkResults(runs) };
      state.bulk.selectedRunId = state.bulk.results.summary.examples[0]?.id || null;
      render();
    };

    window.setTimeout(runBatch, 0);
  };

  function setupBulkTeamSelect() {
    const select = $("bulkTeamSelect");
    if (!select) return;
    const selected = bulkTargetTeam();
    select.innerHTML = Array.from({ length: LEAGUE.teams }, (_, index) => {
      const team = index + 1;
      const keeper = teamKeeperLabel(team);
      return `<option value="${team}" ${team === selected ? "selected" : ""}>${escapeHtml(teamName(team))} - ${escapeHtml(keeper)}</option>`;
    }).join("");
    select.value = selected;
  }

  function commonRecommendationRows(summary) {
    return summary.commonRecommendations.slice(0, 10).map((round) => {
      const players = round.players.map((player) => `
        <span><strong>${escapeHtml(player.name)}</strong> ${player.position} - ${player.count}/${summary.totalRuns}</span>
      `).join("");
      return `
        <div class="bulk-round-row">
          <strong>Round ${round.round}</strong>
          <div>${players || "<span>No recommendations captured</span>"}</div>
        </div>
      `;
    }).join("");
  }

  function roomInsightRows(summary) {
    return summary.otherTeams.map((team) => `
      <div class="bulk-room-row">
        <strong>${escapeHtml(team.name)}</strong>
        <span>${escapeHtml(team.persona)} - ${escapeHtml(team.style)}</span>
        <small>${escapeHtml(team.keeper)}; ${team.earlyPicks} early picks</small>
      </div>
    `).join("");
  }

  renderBulkSimulator = function enhancedRenderBulkSimulator() {
    $("bulkCountInput").value = state.bulk.count;
    $("bulkModeSelect").value = state.bulk.mode;
    $("bulkStrategySelect").value = state.bulk.strategy;
    $("bulkRandomizeRoomInput").checked = state.bulk.randomizeRoom;
    setupBulkTeamSelect();
    updateBulkProgress();

    const data = state.bulk.results;
    if (!data?.summary) {
      $("bulkResults").innerHTML = `
        <div class="bulk-empty">
          <h3>Run a strategy batch to find your strongest paths.</h3>
          <p>Choose the team you want to draft for. Each run locks in that team's keeper, every other league keeper, traded pick ownership, rankings, and team personas before comparing strategy paths.</p>
        </div>
      `;
      return;
    }

    const { summary, runs } = data;
    const strategyRows = summary.strategies.map((group, index) => `
      <div class="bulk-table-row ${index === 0 ? "leader" : ""}">
        <strong>${escapeHtml(group.label)}</strong>
        <span>${group.count} runs</span>
        <span>${formatNumber(group.avgProjection)}</span>
        <span>${formatNumber(group.avgScore)}</span>
        <span>${percent(group.top3Rate)}</span>
        <span>${formatNumber(group.avgPlayoffOdds, 0)}%</span>
      </div>
    `).join("");
    const buildRows = summary.builds.map((group, index) => `
      <div class="bulk-build-row ${index === 0 ? "leader" : ""}">
        <strong>${escapeHtml(group.label)}</strong>
        <span>${group.count}x</span>
        <span>${formatNumber(group.avgProjection)} starter pts</span>
        <span>${percent(group.top3Rate)} top-3</span>
        <small>${group.best?.strategyLabel || "Mixed"} best example</small>
      </div>
    `).join("");
    const playerRows = summary.commonPlayers.map((item) => `
      <div class="bulk-player-row">
        <strong>R${item.round} ${escapeHtml(item.name)}</strong>
        <span>${item.position}</span>
        <span>${item.count}/${summary.totalRuns} drafts</span>
      </div>
    `).join("");
    const examples = [
      { label: "Best draft", run: summary.examples[0] },
      { label: "Median draft", run: summary.examples[1] },
      { label: "Worst draft", run: summary.examples[2] },
    ].map((item) => runDetailCard(item.run, item.label)).join("");
    const selected = runs.find((run) => run.id === state.bulk.selectedRunId) || summary.examples[0];
    const selectedPickAnalysis = selected?.pickBreakdown.slice(0, 5).map((pick) => {
      const alternatives = pick.alternatives.map((player) => `${player.name} (${player.position})`).join(", ");
      return `<li><strong>${pick.label}:</strong> ${escapeHtml(pick.player.name)} at pick ${pick.pick}. Available alternatives: ${escapeHtml(alternatives || "None")}</li>`;
    }).join("") || "";
    const aiRows = summary.aiSummary.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

    $("bulkResults").innerHTML = `
      <div class="bulk-hero">
        <div>
          <p class="eyebrow">Best path for ${escapeHtml(summary.simulatedTeamName)}</p>
          <h3>${escapeHtml(summary.bestStrategy?.label || "Run simulations")}: ${escapeHtml(summary.bestBuild?.label || "No build yet")}</h3>
          <p>${summary.totalRuns} simulations with ${escapeHtml(summary.simulatedKeeper)} locked in. Best build averaged ${formatNumber(summary.bestBuild?.avgProjection)} starter points with a ${percent(summary.bestBuild?.top3Rate)} top-3 rate.</p>
        </div>
        <div><strong>${formatNumber(summary.bestStrategy?.avgProjection)}</strong><span>Best strategy avg starter pts</span></div>
        <div><strong>${percent(summary.bestStrategy?.top3Rate)}</strong><span>Best strategy top-3 rate</span></div>
      </div>
      <div class="bulk-grid">
        <section class="bulk-wide bulk-ai-summary">
          <h3>AI Simulation Summary</h3>
          <ul>${aiRows}</ul>
        </section>
        <section>
          <h3>Strategy Comparison</h3>
          <div class="bulk-table">
            <div class="bulk-table-head"><span>Strategy</span><span>Runs</span><span>Starter</span><span>Score</span><span>Top 3</span><span>Playoffs</span></div>
            ${strategyRows}
          </div>
        </section>
        <section>
          <h3>First 5 Rounds Optimizer</h3>
          <div class="bulk-build-list">${buildRows}</div>
        </section>
        <section>
          <h3>Most Common Drafted Targets</h3>
          <div class="bulk-player-list">${playerRows || `<p class="empty">No target data yet.</p>`}</div>
        </section>
        <section>
          <h3>Recommended Available By Round</h3>
          <div class="bulk-round-list">${commonRecommendationRows(summary) || `<p class="empty">No recommendation data yet.</p>`}</div>
        </section>
        <section>
          <h3>League Member Pressure</h3>
          <div class="bulk-room-list">${roomInsightRows(summary)}</div>
        </section>
        <section>
          <h3>Best / Median / Worst Examples</h3>
          <div class="bulk-example-list">${examples}</div>
        </section>
        <section class="bulk-wide">
          <h3>Detailed Pick Analysis</h3>
          <ul>${selectedPickAnalysis || "<li>Select an example draft to review pick detail.</li>"}</ul>
        </section>
      </div>
    `;
  };

  const style = document.createElement("style");
  style.textContent = `
    .keeper-value-panel {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), transparent), var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .keeper-focus-select { min-width: 220px; }
    .keeper-value-results { display: grid; gap: 14px; margin-top: 14px; }
    .keeper-method-note,
    .keeper-empty,
    .keeper-team-card {
      background: var(--panel-strong);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .keeper-method-note { color: var(--muted); font-size: 0.86rem; line-height: 1.45; }
    .keeper-method-note span { display: block; margin-top: 6px; }
    .keeper-team-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(300px, 1fr)); }
    .keeper-team-card { display: grid; gap: 10px; }
    .keeper-team-head {
      align-items: center;
      border-bottom: 1px solid var(--chalk-line);
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr auto;
      padding-bottom: 10px;
    }
    .keeper-team-head h3 { margin: 0; }
    .keeper-team-head span { color: var(--muted); font-size: 0.8rem; font-weight: 800; }
    .keeper-candidate-card {
      align-items: center;
      background: rgba(19, 37, 31, 0.035);
      border: 1px solid var(--chalk-line);
      border-radius: 8px;
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(180px, 1fr) repeat(4, minmax(82px, auto)) auto;
      padding: 10px;
    }
    .keeper-candidate-card.leader {
      background: rgba(183, 243, 75, 0.16);
      border-color: var(--highlight);
    }
    .keeper-candidate-card.selected {
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .keeper-candidate-card div { display: grid; gap: 2px; }
    .keeper-candidate-card b,
    .keeper-candidate-card span {
      color: var(--muted);
      font-size: 0.78rem;
    }
    .keeper-candidate-card strong { font-size: 0.92rem; }
    .keeper-candidate-card p {
      color: var(--muted);
      font-size: 0.78rem;
      grid-column: 1 / -1;
      margin: 0;
    }
    .keeper-candidate-card button { padding: 8px 10px; white-space: nowrap; }
    .bulk-controls { grid-template-columns: repeat(5, minmax(140px, 1fr)); }
    .bulk-ai-summary ul { margin: 0; padding-left: 18px; }
    .bulk-ai-summary li { margin: 0 0 8px; }
    .bulk-round-list, .bulk-room-list { display: grid; gap: 8px; }
    .bulk-round-row, .bulk-room-row {
      background: rgba(19, 37, 31, 0.035);
      border: 1px solid var(--chalk-line);
      border-radius: 8px;
      display: grid;
      gap: 6px;
      padding: 9px;
    }
    .bulk-round-row div { display: grid; gap: 4px; }
    .bulk-round-row span, .bulk-room-row span, .bulk-room-row small {
      color: var(--muted);
      font-size: 0.8rem;
    }
    @media (max-width: 1100px) {
      .bulk-controls { grid-template-columns: repeat(2, minmax(160px, 1fr)); }
      .keeper-team-grid { grid-template-columns: 1fr; }
      .keeper-candidate-card { grid-template-columns: 1fr 1fr; }
      .keeper-candidate-card button { justify-self: start; }
    }
  `;
  document.head.appendChild(style);

  const runButton = $("runBulkSimBtn");
  if (runButton) {
    runButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      startBulkSimulations();
    }, true);
  }

  document.addEventListener("change", (event) => {
    if (event.target.id === "keeperValueTeamSelect") {
      state.keeperValueTeam = event.target.value;
      renderKeeperValueTool();
      return;
    }
    if (event.target.id !== "bulkTeamSelect") return;
    state.bulk.team = Number(event.target.value);
    state.bulk.results = null;
    state.bulk.selectedRunId = null;
    renderBulkSimulator();
  });

  document.addEventListener("click", (event) => {
    const applyValue = event.target.closest("[data-apply-keeper]")?.dataset.applyKeeper;
    if (!applyValue) return;
    const [teamRaw, playerId, roundRaw] = applyValue.split(":");
    const team = Number(teamRaw);
    state.keeperSelections[team - 1] = { playerId, round: Number(roundRaw) };
    saveKeeperSelections();
    refreshKeeperPicksInCurrentDraft();
    render();
  });

  installKeeperToolUi();
  if (typeof renderBulkSimulator === "function") renderBulkSimulator();
  renderKeeperValueTool();
})();
