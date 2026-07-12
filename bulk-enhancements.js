(function enhanceBulkSimulator() {
  if (!window.document || typeof state === "undefined") return;

  state.bulk.team = Math.max(1, Math.min(LEAGUE.teams, Number(state.bulk.team) || state.userTeam || 1));

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
    if (event.target.id !== "bulkTeamSelect") return;
    state.bulk.team = Number(event.target.value);
    state.bulk.results = null;
    state.bulk.selectedRunId = null;
    renderBulkSimulator();
  });

  if (typeof renderBulkSimulator === "function") renderBulkSimulator();
})();