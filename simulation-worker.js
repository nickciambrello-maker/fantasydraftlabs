"use strict";

function seededAwardRandom(seed) {
  let value = Math.sin(seed) * 10000;
  return () => {
    value = Math.sin(value + 1.61803398875) * 10000;
    return value - Math.floor(value);
  };
}

function seededNormal(random) {
  const u = Math.max(0.000001, random());
  const v = Math.max(0.000001, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulatedSeasonAwards(analyses, league, seasonCount, seed) {
  const random = seededAwardRandom(seed);
  const teamCount = Math.max(2, Number(league?.teams) || analyses.length || 12);
  const playoffTeams = Math.max(2, Math.min(teamCount, Number(league?.playoffTeams) || Math.min(6, Math.max(2, Math.ceil(teamCount / 2)))));
  const roomWeeklyMean = analyses.reduce((sum, analysis) => sum + (Number.isFinite(analysis.weeklyProjection) ? analysis.weeklyProjection : 100), 0) / Math.max(1, analyses.length);
  const teams = analyses.map((analysis) => {
    const rawProjection = Number.isFinite(analysis.weeklyProjection) ? analysis.weeklyProjection : roomWeeklyMean;
    const valueImpact = Math.max(-12, Math.min(12, Number(analysis.value) || 0));
    const balanceImpact = Math.max(-12, Math.min(12, Number(analysis.balance) || 0));
    return {
      team: analysis.team,
      weeklyMean: roomWeeklyMean + (rawProjection - roomWeeklyMean) * 0.38 + valueImpact * 0.05 + balanceImpact * 0.02,
      playoffMean: roomWeeklyMean + (rawProjection - roomWeeklyMean) * 0.50 + valueImpact * 0.04 + balanceImpact * 0.02,
      weekStdDev: 22 + Math.max(0, 6 - (Number(analysis.balance) || 0)) * 0.40,
      playoffAppearances: 0,
      championships: 0,
      championshipAppearances: 0,
      topThreeFinishes: 0,
      lastPlaces: 0,
      finishSum: 0,
    };
  });
  const teamScore = (team, playoff = false) => (playoff ? team.playoffMean : team.weeklyMean) + seededNormal(random) * team.weekStdDev * (playoff ? 1.25 : 1) + (random() - 0.5) * 4;
  for (let season = 0; season < seasonCount; season += 1) {
    const rows = teams.map((team) => ({ ...team, wins: 0, points: 0 }));
    for (let week = 0; week < 14; week += 1) {
      const shuffled = rows.map((team) => ({ team, sort: random() })).sort((a, b) => a.sort - b.sort).map((item) => item.team);
      for (let index = 0; index < shuffled.length; index += 2) {
        const a = shuffled[index];
        const b = shuffled[index + 1] || shuffled[0];
        if (a === b) continue;
        const aScore = teamScore(a);
        const bScore = teamScore(b);
        a.points += aScore;
        b.points += bScore;
        if (aScore >= bScore) a.wins += 1;
        else b.wins += 1;
      }
    }
    const standings = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points);
    standings.forEach((row, index) => {
      const target = teams.find((team) => team.team === row.team);
      if (target) target.finishSum += index + 1;
    });
    standings.slice(0, 3).forEach((row) => {
      const target = teams.find((team) => team.team === row.team);
      if (target) target.topThreeFinishes += 1;
    });
    let bracket = standings.slice(0, playoffTeams);
    bracket.forEach((row) => {
      const target = teams.find((team) => team.team === row.team);
      if (target) target.playoffAppearances += 1;
    });
    while (bracket.length > 1) {
      const winners = [];
      if (bracket.length === 2) {
        bracket.forEach((row) => {
          const target = teams.find((team) => team.team === row.team);
          if (target) target.championshipAppearances += 1;
        });
      }
      for (let index = 0; index < Math.ceil(bracket.length / 2); index += 1) {
        const favorite = bracket[index];
        const underdog = bracket[bracket.length - 1 - index];
        if (!underdog || favorite.team === underdog.team) {
          winners.push(favorite);
          continue;
        }
        winners.push(teamScore(favorite, true) >= teamScore(underdog, true) ? favorite : underdog);
      }
      bracket = winners;
    }
    const champion = bracket[0] || standings[0];
    const last = standings[standings.length - 1];
    const championTarget = teams.find((team) => team.team === champion.team);
    const lastTarget = teams.find((team) => team.team === last.team);
    if (championTarget) championTarget.championships += 1;
    if (lastTarget) lastTarget.lastPlaces += 1;
  }
  return teams.map((team) => ({
    team: team.team,
    playoffRate: team.playoffAppearances / seasonCount,
    topThreeRate: team.topThreeFinishes / seasonCount,
    championshipRate: team.championships / seasonCount,
    championshipAppearanceRate: team.championshipAppearances / seasonCount,
    lastPlaceRate: team.lastPlaces / seasonCount,
    championshipOdds: team.championships / seasonCount,
    lastPlaceOdds: team.lastPlaces / seasonCount,
    playoffAppearances: team.playoffAppearances,
    averageFinish: team.finishSum / seasonCount,
    simulationCount: seasonCount,
  }));
}

self.addEventListener("message", (event) => {
  const request = event.data || {};
  if (request.type !== "SIMULATE_SEASONS") return;
  try {
    const analyses = Array.isArray(request.analyses) ? request.analyses : [];
    const seasonCount = Math.max(1, Math.min(500, Number(request.seasonCount) || 16));
    const rows = simulatedSeasonAwards(analyses, request.league || {}, seasonCount, Number(request.seed) || 1);
    self.postMessage({ type: "SIMULATE_SEASONS_RESULT", requestId: request.requestId, rows });
  } catch (error) {
    self.postMessage({ type: "SIMULATE_SEASONS_ERROR", requestId: request.requestId, error: error?.message || "Season simulation worker failed." });
  }
});
