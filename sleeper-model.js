(function installSleeperModel(globalScope) {
  "use strict";

  const SLEEPER_SCORE_WEIGHTS = Object.freeze({
    priceEdge: 0.25,
    opportunityPath: 0.25,
    talentSignal: 0.20,
    ceilingCatalyst: 0.15,
    leagueFit: 0.10,
    roomTiming: 0.05,
  });

  const POSITION_METRICS = Object.freeze({
    QB: ["rushingAttempts", "designedRushingAttempts", "scrambleRate", "passingJobSecurity", "passingVolume", "offenseEnvironmentScore"],
    RB: ["snapShare", "carryShare", "routeParticipation", "targetShare", "weightedOpportunity", "goalLineShare", "standaloneRoleScore", "contingentRoleScore", "projectedOpportunityShare", "depthChartBlockers", "depthChartBlockerStrength"],
    WR: ["routeParticipation", "targetShare", "targetsPerRoute", "yardsPerRoute", "airYardsShare", "firstReadShare", "redZoneTargetShare", "projectedOpportunityShare", "offenseEnvironmentScore", "depthChartBlockers", "depthChartBlockerStrength"],
    TE: ["routeParticipation", "targetShare", "targetsPerRoute", "yardsPerRoute", "slotRate", "blockingRate", "redZoneTargetShare", "projectedOpportunityShare", "depthChartBlockers", "depthChartBlockerStrength"],
  });

  const ROLE_CONFIDENCE_POINTS = Object.freeze({ High: 14, Moderate: 7, Low: 0 });
  const VALID_ROLE_SOURCES = new Set(["uploaded", "Sleeper player data", "manual", "ranking inference"]);

  function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min = 0, max = 100) {
    const number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
  }

  function round1(value) {
    return Math.round(clamp(value) * 10) / 10;
  }

  function normalizedShare(value) {
    const number = finite(value);
    if (number === null) return null;
    return clamp(number > 1.5 ? number : number * 100);
  }

  function shareScore(value, low, high, options = {}) {
    const number = finite(value);
    if (number === null) return null;
    const fraction = number > 1.5 ? number / 100 : number;
    return scaled(fraction, low, high, options);
  }

  function scaled(value, low, high, options = {}) {
    const number = finite(value);
    if (number === null) return null;
    const result = ((number - low) / Math.max(0.0001, high - low)) * 100;
    return clamp(options.invert ? 100 - result : result);
  }

  function weightedPresent(parts, fallback = 45) {
    const present = parts.filter((part) => part && finite(part.value) !== null && finite(part.weight) !== null && part.weight > 0);
    if (!present.length) return fallback;
    const weight = present.reduce((sum, part) => sum + part.weight, 0);
    return clamp(present.reduce((sum, part) => sum + clamp(part.value) * part.weight, 0) / Math.max(0.0001, weight));
  }

  function weightedWithPrior(parts, prior = 45) {
    const weighted = parts.filter((part) => part && finite(part.weight) !== null && part.weight > 0);
    if (!weighted.length) return clamp(prior);
    const totalWeight = weighted.reduce((sum, part) => sum + part.weight, 0);
    const total = weighted.reduce((sum, part) => {
      const value = finite(part.value);
      return sum + (value === null ? clamp(prior) : clamp(value)) * part.weight;
    }, 0);
    return clamp(total / Math.max(0.0001, totalWeight));
  }

  function presentMetric(player, key) {
    const value = player?.[key];
    return finite(value) !== null ? value : null;
  }

  function pushEvidence(target, condition, entry) {
    if (condition) target.push({
      type: entry.type || "signal",
      label: String(entry.label || "Evidence"),
      value: String(entry.value ?? ""),
      direction: entry.direction || "positive",
      source: entry.source || "deterministic model",
    });
  }

  function draftCapitalScore(player) {
    const round = finite(player.nflDraftRound);
    const pick = finite(player.nflDraftPick);
    if (round === null && pick === null) return null;
    if (pick !== null) return clamp(102 - Math.sqrt(Math.max(1, pick)) * 7.2);
    return clamp(100 - Math.max(0, round - 1) * 15);
  }

  function ageCurveScore(player) {
    const age = finite(player.age);
    const experience = finite(player.yearsExperience);
    if (age === null && experience === null) return null;
    const position = String(player.position || "").toUpperCase();
    const peak = position === "RB" ? 24.5 : position === "WR" ? 26 : position === "TE" ? 27 : 28;
    const ageScore = age === null ? null : clamp(100 - Math.abs(age - peak) * (position === "RB" ? 10 : 7));
    const experienceScore = experience === null ? null : experience <= 3 ? 82 - experience * 3 : clamp(75 - (experience - 3) * 6);
    return weightedPresent([{ value: ageScore, weight: 0.65 }, { value: experienceScore, weight: 0.35 }], 50);
  }

  function roleProvenance(player) {
    const explicitSource = VALID_ROLE_SOURCES.has(player.roleSource) ? player.roleSource : null;
    const explicitConfidence = ["High", "Moderate", "Low"].includes(player.roleConfidence) ? player.roleConfidence : null;
    if (explicitSource) return { source: explicitSource, confidence: explicitConfidence || (explicitSource === "ranking inference" ? "Low" : "Moderate") };
    if (player.manualRole || player.roleOverride) return { source: "manual", confidence: explicitConfidence || "High" };
    if (player.sleeperRole || player.sleeperDepthChartOrder) return { source: "Sleeper player data", confidence: explicitConfidence || "Moderate" };
    if (player.uploadedRole || player.depthChartRoleUploaded) return { source: "uploaded", confidence: explicitConfidence || "Moderate" };
    return { source: "ranking inference", confidence: "Low" };
  }

  function inferredRoleLabel(player, standalone, contingent) {
    const position = String(player.position || "").toUpperCase();
    const depth = finite(player.depthChartRank);
    if (position === "QB") return depth === 1 ? "Ranking-inferred starting QB" : "Ranking-inferred backup or developmental QB";
    if (position === "RB") {
      if (standalone >= 68) return "Ranking-inferred standalone committee role";
      if (contingent >= 68) return "Ranking-inferred contingent backfield role";
      return depth && depth <= 2 ? "Ranking-inferred backfield rotation role" : "Ranking-inferred depth RB role";
    }
    if (position === "WR") {
      if (normalizedShare(player.routeParticipation) >= 75) return "Ranking-inferred regular route role";
      return depth && depth <= 3 ? "Ranking-inferred top-three WR role" : "Ranking-inferred depth WR role";
    }
    if (position === "TE") {
      if (normalizedShare(player.routeParticipation) >= 70) return "Ranking-inferred receiving TE role";
      return depth === 1 ? "Ranking-inferred primary TE role" : "Ranking-inferred secondary TE role";
    }
    return "Ranking-inferred depth role";
  }

  function blockerCount(player) {
    const direct = finite(player.depthChartBlockers);
    if (direct !== null) return Math.max(0, Math.round(direct));
    if (Array.isArray(player.blockers)) return player.blockers.length;
    if (roleProvenance(player).source === "ranking inference") return null;
    const depth = finite(player.depthChartRank);
    return depth === null ? null : Math.max(0, Math.round(depth - 1));
  }

  function blockerStrength(player) {
    const direct = finite(player.depthChartBlockerStrength ?? player.blockerStrengthScore);
    if (direct !== null) return clamp(direct <= 1.5 ? direct * 100 : direct);
    if (!Array.isArray(player.blockers)) return null;
    const values = player.blockers.map((blocker) => {
      if (typeof blocker === "number") return clamp(blocker <= 1.5 ? blocker * 100 : blocker);
      const value = finite(blocker?.strength ?? blocker?.strengthScore ?? blocker?.score);
      return value === null ? null : clamp(value <= 1.5 ? value * 100 : value);
    }).filter((value) => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function depthChartProfile(player) {
    const count = blockerCount(player);
    const strength = blockerStrength(player);
    const countAccess = count === null ? null : clamp(100 - count * 23);
    const strengthAccess = strength === null ? null : clamp(100 - strength);
    const access = weightedWithPrior([
      { value: countAccess, weight: 0.62 },
      { value: strengthAccess, weight: 0.38 },
    ], 45);
    return { count, strength, access };
  }

  function priceEdgeModule(player, evidence, missing) {
    const adp = finite(player.adp);
    const rank = finite(player.consensusRank ?? player.rank);
    const sevenDay = finite(player.adp7DayChange);
    const thirtyDay = finite(player.adp30DayChange);
    if (adp === null) missing.push("current ADP");
    if (rank === null) missing.push("Lab Rank");
    const edgePicks = adp !== null && rank !== null ? adp - rank : null;
    const rankEdgeScore = edgePicks === null ? 38 : clamp(50 + edgePicks * 3.1);
    const movementScore = weightedPresent([
      { value: sevenDay === null ? null : clamp(50 + sevenDay * 6), weight: 0.65 },
      { value: thirtyDay === null ? null : clamp(50 + thirtyDay * 3), weight: 0.35 },
    ], 50);
    const score = weightedPresent([
      { value: rankEdgeScore, weight: 0.85 },
      { value: movementScore, weight: 0.15 },
    ], 38);
    if (edgePicks !== null && edgePicks >= 4) {
      pushEvidence(evidence, true, {
        type: "price", label: "Price advantage", value: `${edgePicks.toFixed(1)} picks later than Lab Rank`, direction: "positive", source: "Lab Rank vs ADP",
      });
    }
    if (edgePicks !== null && edgePicks <= -8) {
      pushEvidence(evidence, true, {
        type: "price", label: "Acquisition cost", value: `${Math.abs(edgePicks).toFixed(1)} picks earlier than Lab Rank`, direction: "negative", source: "Lab Rank vs ADP",
      });
    }
    if (sevenDay !== null && sevenDay >= 3) {
      pushEvidence(evidence, true, {
        type: "market", label: "Market faller", value: `ADP moved ${sevenDay.toFixed(1)} picks later in 7 days`, direction: "positive", source: "ADP snapshot",
      });
    }
    return { score, edgePicks, movementScore };
  }

  function qbModule(player, evidence, missing) {
    const rushingAttempts = scaled(player.rushingAttempts, 15, 120);
    const designed = scaled(player.designedRushingAttempts, 5, 80);
    const scramble = scaled(player.scrambleRate, 0.02, 0.12);
    const security = finite(player.passingJobSecurity) !== null ? clamp(player.passingJobSecurity) : (finite(player.roleCertainty) !== null ? clamp(player.roleCertainty) : null);
    const passingVolume = finite(player.passingVolume) !== null ? scaled(player.passingVolume, 350, 650) : shareScore(player.projectedOpportunityShare, 0.40, 0.90);
    const environment = finite(player.offenseEnvironmentScore) !== null ? clamp(player.offenseEnvironmentScore) : null;
    if (rushingAttempts === null && designed === null && scramble === null) missing.push("QB rushing projection");
    if (security === null) missing.push("passing job security");
    if (passingVolume === null) missing.push("passing volume");
    const rushingUpside = weightedWithPrior([{ value: rushingAttempts, weight: 0.45 }, { value: designed, weight: 0.35 }, { value: scramble, weight: 0.20 }], 38);
    const opportunity = weightedWithPrior([{ value: security, weight: 0.40 }, { value: passingVolume, weight: 0.30 }, { value: rushingUpside, weight: 0.20 }, { value: environment, weight: 0.10 }], 43);
    const talent = weightedWithPrior([
      { value: finite(player.prospectScore), weight: 0.30 },
      { value: draftCapitalScore(player), weight: 0.30 },
      { value: environment, weight: 0.15 },
      { value: ageCurveScore(player), weight: 0.25 },
    ], 45);
    const ceiling = weightedWithPrior([{ value: rushingUpside, weight: 0.55 }, { value: passingVolume, weight: 0.20 }, { value: environment, weight: 0.15 }, { value: security, weight: 0.10 }], 42);
    pushEvidence(evidence, rushingUpside >= 65, { type: "talent", label: "Rushing ceiling", value: `${Math.round(rushingUpside)}/100 rushing profile`, direction: "positive", source: "QB rushing inputs" });
    pushEvidence(evidence, security !== null && security < 45, { type: "role", label: "Job-security risk", value: `${Math.round(security)}/100`, direction: "negative", source: "role certainty" });
    return { opportunity, talent, ceiling, standalone: security ?? 45, contingent: clamp(100 - (security ?? 50)), rushingUpside };
  }

  function rbModule(player, evidence, missing) {
    const snap = shareScore(player.snapShare, 0.25, 0.78);
    const carry = shareScore(player.carryShare, 0.15, 0.68);
    const route = shareScore(player.routeParticipation, 0.18, 0.62);
    const target = shareScore(player.targetShare, 0.03, 0.18);
    const weightedOpp = shareScore(player.weightedOpportunity, 0.20, 0.75);
    const goalLine = shareScore(player.goalLineShare, 0.08, 0.70);
    const projected = shareScore(player.projectedOpportunityShare, 0.25, 0.85);
    const standalone = finite(player.standaloneRoleScore) !== null ? clamp(player.standaloneRoleScore) : weightedWithPrior([{ value: snap, weight: 0.35 }, { value: carry, weight: 0.30 }, { value: route, weight: 0.20 }, { value: target, weight: 0.15 }], 42);
    const depthChart = depthChartProfile(player);
    const contingentBase = finite(player.contingentRoleScore) !== null ? clamp(player.contingentRoleScore) : weightedWithPrior([{ value: projected, weight: 0.50 }, { value: goalLine, weight: 0.20 }, { value: finite(player.roleCertainty), weight: 0.10 }, { value: depthChart.count === null && depthChart.strength === null ? null : depthChart.access, weight: 0.20 }], 45);
    if ([snap, carry, route, target, weightedOpp].every((value) => value === null)) missing.push("RB opportunity shares");
    if (depthChart.count === null && depthChart.strength === null) missing.push("RB depth-chart blockers");
    const opportunity = weightedWithPrior([
      { value: weightedOpp, weight: 0.22 }, { value: snap, weight: 0.16 }, { value: carry, weight: 0.16 },
      { value: route, weight: 0.11 }, { value: target, weight: 0.10 }, { value: goalLine, weight: 0.10 },
      { value: standalone, weight: 0.08 }, { value: contingentBase, weight: 0.07 },
    ], 43);
    const receiving = weightedWithPrior([{ value: route, weight: 0.55 }, { value: target, weight: 0.45 }], 40);
    const talent = weightedWithPrior([
      { value: finite(player.prospectScore), weight: 0.30 }, { value: draftCapitalScore(player), weight: 0.25 },
      { value: weightedOpp, weight: 0.20 }, { value: receiving, weight: 0.10 }, { value: ageCurveScore(player), weight: 0.15 },
    ], 44);
    const ceiling = weightedWithPrior([{ value: contingentBase, weight: 0.35 }, { value: goalLine, weight: 0.20 }, { value: receiving, weight: 0.15 }, { value: projected, weight: 0.20 }, { value: talent, weight: 0.10 }], 44);
    pushEvidence(evidence, standalone >= 65, { type: "role", label: "Standalone workload", value: `${Math.round(standalone)}/100`, direction: "positive", source: "RB role inputs" });
    pushEvidence(evidence, contingentBase >= 68, { type: "catalyst", label: "Contingent lead-back path", value: `${Math.round(contingentBase)}/100`, direction: "positive", source: "contingent role inputs" });
    pushEvidence(evidence, receiving >= 65, { type: "league", label: "Receiving role", value: `${Math.round(receiving)}/100`, direction: "positive", source: "route and target shares" });
    pushEvidence(evidence, depthChart.count !== null && depthChart.count >= 3, { type: "blocker", label: "Crowded depth chart", value: `${depthChart.count} blockers`, direction: "negative", source: "structured depth chart" });
    pushEvidence(evidence, depthChart.strength !== null && depthChart.strength >= 70, { type: "blocker", label: "Strong depth-chart blockers", value: `${Math.round(depthChart.strength)}/100 blocker strength`, direction: "negative", source: "structured depth chart" });
    return { opportunity, talent, ceiling, standalone, contingent: contingentBase, receiving, blockers: depthChart.count, blockerStrength: depthChart.strength, competitionAccess: depthChart.access };
  }

  function wrModule(player, evidence, missing) {
    const route = shareScore(player.routeParticipation, 0.45, 0.95);
    const target = shareScore(player.targetShare, 0.10, 0.30);
    const tprr = scaled(player.targetsPerRoute, 0.10, 0.30);
    const yprr = scaled(player.yardsPerRoute, 0.8, 2.5);
    const air = shareScore(player.airYardsShare, 0.10, 0.40);
    const firstRead = shareScore(player.firstReadShare, 0.10, 0.35);
    const redZone = shareScore(player.redZoneTargetShare, 0.07, 0.28);
    const projected = shareScore(player.projectedOpportunityShare, 0.35, 0.90);
    const environment = finite(player.offenseEnvironmentScore) !== null ? clamp(player.offenseEnvironmentScore) : null;
    const depthChart = depthChartProfile(player);
    if ([route, target, tprr, yprr, air, firstRead].every((value) => value === null)) missing.push("WR route and target metrics");
    if (environment === null) missing.push("projected passing environment");
    if (depthChart.count === null && depthChart.strength === null) missing.push("WR depth-chart competition");
    const opportunity = weightedWithPrior([{ value: route, weight: 0.22 }, { value: target, weight: 0.18 }, { value: tprr, weight: 0.14 }, { value: firstRead, weight: 0.12 }, { value: air, weight: 0.08 }, { value: projected, weight: 0.10 }, { value: depthChart.count === null && depthChart.strength === null ? null : depthChart.access, weight: 0.08 }, { value: environment, weight: 0.08 }], 43);
    const talent = weightedWithPrior([{ value: tprr, weight: 0.23 }, { value: yprr, weight: 0.25 }, { value: firstRead, weight: 0.12 }, { value: finite(player.prospectScore), weight: 0.16 }, { value: draftCapitalScore(player), weight: 0.12 }, { value: ageCurveScore(player), weight: 0.12 }], 44);
    const ceiling = weightedWithPrior([{ value: air, weight: 0.20 }, { value: redZone, weight: 0.18 }, { value: firstRead, weight: 0.17 }, { value: projected, weight: 0.18 }, { value: yprr, weight: 0.15 }, { value: environment, weight: 0.12 }], 43);
    const standalone = weightedWithPrior([{ value: route, weight: 0.40 }, { value: target, weight: 0.31 }, { value: firstRead, weight: 0.19 }, { value: depthChart.count === null && depthChart.strength === null ? null : depthChart.access, weight: 0.10 }], 43);
    const contingent = weightedWithPrior([{ value: projected, weight: 0.45 }, { value: talent, weight: 0.35 }, { value: clamp(100 - (finite(player.roleCertainty) ?? 50)), weight: 0.20 }], 44);
    pushEvidence(evidence, target !== null && target >= 65, { type: "talent", label: "Target earning", value: `${Math.round(target)}% target-share score`, direction: "positive", source: "target share" });
    pushEvidence(evidence, tprr !== null && tprr >= 65, { type: "talent", label: "Targets per route", value: `${Math.round(tprr)}/100`, direction: "positive", source: "targets per route" });
    pushEvidence(evidence, route !== null && route < 45, { type: "blocker", label: "Limited route role", value: `${Math.round(route)}/100 route score`, direction: "negative", source: "route participation" });
    pushEvidence(evidence, depthChart.access <= 35 && (depthChart.count !== null || depthChart.strength !== null), { type: "blocker", label: "Strong target competition", value: `${Math.round(depthChart.access)}/100 access score`, direction: "negative", source: "structured depth chart" });
    pushEvidence(evidence, environment !== null && environment >= 68, { type: "league", label: "Passing environment", value: `${Math.round(environment)}/100`, direction: "positive", source: "offense environment score" });
    return { opportunity, talent, ceiling, standalone, contingent, route, target, tprr, yprr, redZone, environment, blockers: depthChart.count, blockerStrength: depthChart.strength, competitionAccess: depthChart.access };
  }

  function teModule(player, evidence, missing) {
    const route = shareScore(player.routeParticipation, 0.35, 0.90);
    const target = shareScore(player.targetShare, 0.06, 0.22);
    const tprr = scaled(player.targetsPerRoute, 0.08, 0.26);
    const yprr = scaled(player.yardsPerRoute, 0.7, 2.2);
    const slot = shareScore(player.slotRate, 0.10, 0.65);
    const blocking = shareScore(player.blockingRate, 0.15, 0.65);
    const redZone = shareScore(player.redZoneTargetShare, 0.06, 0.25);
    const projected = shareScore(player.projectedOpportunityShare, 0.30, 0.82);
    const depthChart = depthChartProfile(player);
    if ([route, target, tprr, yprr, slot, redZone].every((value) => value === null)) missing.push("TE route and receiving metrics");
    if (depthChart.count === null && depthChart.strength === null) missing.push("TE depth-chart competition");
    const receivingAlignment = weightedWithPrior([{ value: slot, weight: 0.55 }, { value: blocking === null ? null : clamp(100 - blocking), weight: 0.45 }], 45);
    const opportunity = weightedWithPrior([{ value: route, weight: 0.28 }, { value: target, weight: 0.20 }, { value: tprr, weight: 0.14 }, { value: receivingAlignment, weight: 0.12 }, { value: redZone, weight: 0.08 }, { value: projected, weight: 0.10 }, { value: depthChart.count === null && depthChart.strength === null ? null : depthChart.access, weight: 0.08 }], 42);
    const talent = weightedWithPrior([{ value: tprr, weight: 0.24 }, { value: yprr, weight: 0.24 }, { value: finite(player.prospectScore), weight: 0.18 }, { value: draftCapitalScore(player), weight: 0.15 }, { value: ageCurveScore(player), weight: 0.19 }], 43);
    const ceiling = weightedWithPrior([{ value: route, weight: 0.25 }, { value: redZone, weight: 0.24 }, { value: receivingAlignment, weight: 0.18 }, { value: projected, weight: 0.13 }, { value: talent, weight: 0.10 }, { value: depthChart.count === null && depthChart.strength === null ? null : depthChart.access, weight: 0.10 }], 43);
    const standalone = weightedWithPrior([{ value: route, weight: 0.50 }, { value: target, weight: 0.30 }, { value: receivingAlignment, weight: 0.20 }], 42);
    const contingent = weightedWithPrior([{ value: projected, weight: 0.50 }, { value: talent, weight: 0.30 }, { value: clamp(100 - (finite(player.roleCertainty) ?? 50)), weight: 0.20 }], 43);
    pushEvidence(evidence, route !== null && route >= 70, { type: "role", label: "Full-route profile", value: `${Math.round(route)}/100 route score`, direction: "positive", source: "route participation" });
    pushEvidence(evidence, redZone !== null && redZone >= 60, { type: "catalyst", label: "Red-zone role", value: `${Math.round(redZone)}/100`, direction: "positive", source: "red-zone target share" });
    pushEvidence(evidence, blocking !== null && blocking >= 65, { type: "blocker", label: "Blocking burden", value: `${Math.round(blocking)}/100 blocking-burden score`, direction: "negative", source: "blocking alignment" });
    pushEvidence(evidence, depthChart.access <= 35 && (depthChart.count !== null || depthChart.strength !== null), { type: "blocker", label: "Receiving-role competition", value: `${Math.round(depthChart.access)}/100 access score`, direction: "negative", source: "structured depth chart" });
    return { opportunity, talent, ceiling, standalone, contingent, route, redZone, receivingAlignment, blockers: depthChart.count, blockerStrength: depthChart.strength, competitionAccess: depthChart.access };
  }

  function positionModule(player, evidence, missing) {
    switch (String(player.position || "").toUpperCase()) {
      case "QB": return qbModule(player, evidence, missing);
      case "RB": return rbModule(player, evidence, missing);
      case "WR": return wrModule(player, evidence, missing);
      case "TE": return teModule(player, evidence, missing);
      default:
        missing.push("position-specific sleeper metrics");
        return { opportunity: 30, talent: 35, ceiling: 28, standalone: 35, contingent: 25 };
    }
  }

  function leagueFitModule(player, context, module, evidence) {
    const league = context.league || {};
    const scoring = league.scoringSettings || context.scoringSettings || {};
    const roster = league.roster || {};
    const position = String(player.position || "").toUpperCase();
    const existing = finite(player.leagueFitScore);
    let scoringFit = existing === null ? 50 : clamp(existing);
    if (position === "QB") {
      const passTd = finite(scoring.passTd) ?? 4;
      scoringFit += (passTd - 4) * 5;
      if ((finite(roster.QB) ?? 1) >= 2 || context.superflex) scoringFit += 12;
      if (module.rushingUpside >= 65 && passTd <= 4) scoringFit += 6;
    } else if (position === "RB") {
      const reception = finite(scoring.reception) ?? 0.5;
      scoringFit += (reception - 0.5) * ((module.receiving ?? 50) - 45) * 0.22;
    } else if (position === "WR") {
      const reception = finite(scoring.reception) ?? 0.5;
      scoringFit += (reception - 0.5) * ((module.target ?? 50) - 42) * 0.20;
    } else if (position === "TE") {
      const reception = finite(scoring.reception) ?? 0.5;
      const premium = finite(scoring.teReceptionBonus) ?? 0;
      scoringFit += (reception - 0.5 + premium) * ((module.route ?? 50) - 38) * 0.25;
    }
    const counts = context.rosterCounts || {};
    const required = finite(roster[position]) ?? 0;
    const current = finite(counts[position]) ?? 0;
    let redundancyPenalty = 0;
    if (["QB", "TE"].includes(position) && required > 0 && current >= required + 1) redundancyPenalty = 24;
    if (["RB", "WR"].includes(position) && required > 0 && current >= required + Math.max(3, finite(roster.FLEX) ?? 1)) redundancyPenalty = 13;
    const score = clamp(scoringFit - redundancyPenalty);
    pushEvidence(evidence, score >= 67, { type: "league", label: "League-specific fit", value: `${Math.round(score)}/100`, direction: "positive", source: "league scoring and roster settings" });
    pushEvidence(evidence, redundancyPenalty >= 20, { type: "roster", label: "Roster redundancy", value: `${position} depth already exceeds core needs`, direction: "negative", source: "current roster construction" });
    return { score, redundancyPenalty };
  }

  function timingModule(player, context, price, evidence) {
    const teams = Math.max(2, finite(context.teams ?? context.league?.teams) ?? 12);
    const currentPick = Math.max(1, finite(context.currentPick) ?? 1);
    const adp = finite(player.adp);
    const rank = finite(player.consensusRank ?? player.rank);
    const targetPick = adp !== null ? adp - Math.max(0, (price.edgePicks ?? 0) * 0.20) : rank !== null ? rank + 6 : currentPick + teams;
    const earliestReasonablePick = Math.max(1, Math.round(targetPick - Math.max(4, teams * 0.55)));
    const latestSafePick = Math.max(earliestReasonablePick, Math.round(targetPick + Math.max(2, teams * 0.22)));
    const survival = finite(context.survivalToNextPick);
    const distance = targetPick - currentPick;
    const windowAlignment = distance > teams * 1.4 ? 42 : distance >= 0 ? 70 : distance >= -teams * 0.5 ? 58 : 32;
    const survivalScore = survival === null ? 50 : clamp(100 - survival * 75);
    const roomPressure = finite(context.roomPressure) ?? 45;
    const score = weightedPresent([{ value: windowAlignment, weight: 0.45 }, { value: survivalScore, weight: 0.35 }, { value: roomPressure, weight: 0.20 }], 47);
    const targetRound = Math.max(1, Math.ceil(targetPick / teams));
    pushEvidence(evidence, survival !== null && survival <= 0.35, { type: "timing", label: "Low survival", value: `${Math.round(survival * 100)}% chance to reach next pick`, direction: "positive", source: "room survival model" });
    pushEvidence(evidence, currentPick < earliestReasonablePick - 2, { type: "timing", label: "Too early now", value: `Target begins near pick ${earliestReasonablePick}`, direction: "negative", source: "draft-window model" });
    return { score, targetPick, targetRound, earliestReasonablePick, latestSafePick, survival };
  }

  function freshness(player, context, missing) {
    const raw = player.dataUpdatedAt || player.adpDate || context.dataUpdatedAt || "";
    const parsed = raw ? new Date(raw) : null;
    const analysisDate = new Date(context.analysisDate || new Date().toISOString());
    if (!parsed || Number.isNaN(parsed.getTime())) {
      missing.push("data freshness date");
      return { label: "Unknown", asOf: null, ageDays: null, score: 35 };
    }
    const ageDays = Math.max(0, Math.floor((analysisDate.getTime() - parsed.getTime()) / 86400000));
    const label = ageDays <= 14 ? "Current" : ageDays <= 45 ? "Recent" : ageDays <= 120 ? "Stale" : "Old";
    const score = ageDays <= 14 ? 100 : ageDays <= 45 ? 78 : ageDays <= 120 ? 50 : 25;
    return { label, asOf: parsed.toISOString().slice(0, 10), ageDays, score };
  }

  function confidenceModule(player, context, role, freshnessData, missing) {
    const expected = POSITION_METRICS[String(player.position || "").toUpperCase()] || [];
    const supplied = expected.filter((key) => finite(player[key]) !== null).length;
    const coverage = expected.length ? supplied / expected.length : 0;
    const sourceCount = finite(player.sourceCount) ?? 0;
    const sample = finite(player.adpSampleSize);
    const sampleScore = sample === null ? 38 : clamp(Math.log10(Math.max(1, sample)) * 28);
    const score = clamp(
      26
      + coverage * 38
      + Math.min(12, sourceCount * 3)
      + ROLE_CONFIDENCE_POINTS[role.confidence]
      + sampleScore * 0.10
      + freshnessData.score * 0.10
      - Math.min(18, missing.length * 2.2)
    );
    return {
      score,
      label: score >= 75 ? "High" : score >= 52 ? "Moderate" : "Low",
    };
  }

  function archetypeFor(player, module, price, league, role) {
    const position = String(player.position || "").toUpperCase();
    const experience = finite(player.yearsExperience);
    const movement = Math.max(finite(player.adp7DayChange) ?? 0, finite(player.adp30DayChange) ?? 0);
    const injuryDiscount = Boolean(player.injuryNote) && price.score >= 58;
    const ambiguous = (finite(player.roleCertainty) ?? (role.confidence === "Low" ? 35 : 60)) < 48 && module.ceiling >= 58;
    if (injuryDiscount) return "Injury discount";
    if (movement >= 4 && price.score >= 58) return "Market faller";
    if (position === "QB" && module.rushingUpside >= 62) return "Rushing QB";
    if (position === "RB" && module.standalone >= 65) return "Standalone-value RB";
    if (position === "RB" && module.contingent >= 68) return "Contingent lead-back";
    if (position === "RB" && module.receiving >= 62) return "Receiving-back specialist";
    if (position === "WR" && module.target >= 63) return "Target-earning WR";
    if (position === "WR" && (module.route ?? 0) >= 48 && (module.route ?? 0) < 75 && (experience === null || experience <= 2)) return "Route-growth WR";
    if (position === "TE" && (module.route ?? 0) >= 68) return "Full-route TE";
    if (position === "TE" && (module.redZone ?? 0) >= 62) return "Red-zone TE";
    if (experience === 0 && module.opportunity >= 52) return "Rookie role bet";
    if (experience !== null && experience >= 2 && experience <= 4 && module.talent >= 60 && price.score >= 55) return "Post-hype breakout";
    if (ambiguous) return "Ambiguous-depth-chart winner";
    if (league.score >= 68) return "League-specific scoring sleeper";
    return module.ceiling >= 55 ? "Post-hype breakout" : "Rookie role bet";
  }

  function catalystFor(player, module, price, archetype) {
    const mapping = {
      "Standalone-value RB": ["standalone workload", "Existing weekly role creates value before an injury or depth-chart change."],
      "Contingent lead-back": ["starter absence or role consolidation", "A depth-chart change could unlock a lead-back workload."],
      "Receiving-back specialist": ["passing-down expansion", "More routes and targets would raise the weekly floor and PPR ceiling."],
      "Target-earning WR": ["target consolidation", "Sustained target earning can turn current price into weekly starter value."],
      "Route-growth WR": ["route participation growth", "A larger route share would allow efficiency and target skill to translate into volume."],
      "Post-hype breakout": ["efficiency-to-volume conversion", "Demonstrated talent needs a clearer role or steadier volume."],
      "Rookie role bet": ["rookie role growth", "The player needs early-season trust, routes or touches to grow."],
      "Rushing QB": ["rushing volume", "Designed runs and scrambles can create a league-specific scoring floor."],
      "Full-route TE": ["full-time route role", "A sustained route share can separate the player from touchdown-only tight ends."],
      "Red-zone TE": ["red-zone usage", "High-value targets can create spike-week and touchdown upside."],
      "Ambiguous-depth-chart winner": ["depth-chart resolution", "The player must win an unresolved competition rather than merely remain cheap."],
      "Injury discount": ["health recovery", "The market discount becomes valuable only if health and role recover."],
      "Market faller": ["market correction", "The falling price creates value only if the underlying role remains intact."],
      "League-specific scoring sleeper": ["league scoring conversion", "This league rewards the player's specific production profile more than the base market."],
    };
    const selected = mapping[archetype] || ["role expansion", "Opportunity must grow enough for talent to matter." ];
    if (price.edgePicks !== null && price.edgePicks >= 8 && archetype !== "Market faller") {
      return { type: selected[0], description: `${selected[1]} The current market also offers about ${price.edgePicks.toFixed(1)} picks of Lab Rank value.` };
    }
    return { type: selected[0], description: selected[1] };
  }

  function roleDescriptions(player, module, provenance) {
    const explicit = player.manualRole || player.roleOverride || player.uploadedRole || player.depthChartRoleUploaded || player.sleeperRole || (provenance.source !== "ranking inference" ? player.depthChartRole : "");
    const currentRole = explicit ? String(explicit) : inferredRoleLabel(player, module.standalone, module.contingent);
    const position = String(player.position || "").toUpperCase();
    let ceilingRole = "Expanded fantasy role";
    if (position === "QB") ceilingRole = module.rushingUpside >= 62 ? "Stable starter with high-value rushing volume" : "Secure high-volume starter";
    if (position === "RB") ceilingRole = module.contingent >= module.standalone ? "Lead-back workload if the depth chart opens" : "Expanded standalone workload with high-value touches";
    if (position === "WR") ceilingRole = "Full-time route earner with weekly starter target volume";
    if (position === "TE") ceilingRole = "Full-route receiving TE with red-zone usage";
    return { currentRole, ceilingRole };
  }

  function primaryBlockerFor(player, module, league, role, evidence) {
    const blockers = blockerCount(player);
    if (league.redundancyPenalty >= 20) return "Severe roster redundancy at the position";
    if (String(player.position || "").toUpperCase() === "QB" && finite(player.passingJobSecurity) !== null && player.passingJobSecurity < 45) return "Uncertain starting job";
    if (blockers !== null && blockers >= 2) return `${blockers} meaningful depth-chart blockers`;
    if (role.source === "ranking inference") return "Role is inferred from ranking order, not verified depth-chart data";
    const negative = evidence.find((entry) => entry.direction === "negative" && ["blocker", "role", "roster", "price"].includes(entry.type));
    return negative ? negative.value || negative.label : "Opportunity must expand enough to convert the talent signal";
  }

  function failureReasonsFor(player, module, price, league, role, missing) {
    const reasons = [];
    if (price.score < 52) reasons.push("The market price does not provide a meaningful advantage over Lab Rank.");
    if (module.opportunity < 48) reasons.push("The current opportunity path is weak or blocked.");
    if (module.talent < 45) reasons.push("Available talent signals are below the sleeper threshold.");
    if (module.ceiling < 48) reasons.push("No strong ceiling catalyst is present in the supplied data.");
    if (league.redundancyPenalty >= 20) reasons.push("Drafting this player now would create severe roster redundancy.");
    if (role.source === "ranking inference") reasons.push("The role is inferred from ranking order and should not be treated as verified.");
    if (missing.length >= 6) reasons.push("Several advanced metrics are missing, which lowers confidence in the profile.");
    return [...new Set(reasons)].slice(0, 6);
  }

  function buildSleeperProfile(player, context = {}) {
    const safePlayer = player && typeof player === "object" ? player : {};
    const evidence = [];
    const missingData = [];
    const price = priceEdgeModule(safePlayer, evidence, missingData);
    const module = positionModule(safePlayer, evidence, missingData);
    const role = roleProvenance(safePlayer);
    const league = leagueFitModule(safePlayer, context, module, evidence);
    const timing = timingModule(safePlayer, context, price, evidence);
    const fresh = freshness(safePlayer, context, missingData);
    const confidence = confidenceModule(safePlayer, context, role, fresh, missingData);
    const archetype = archetypeFor(safePlayer, module, price, league, role);
    const catalyst = catalystFor(safePlayer, module, price, archetype);
    const roleText = roleDescriptions(safePlayer, module, role);
    const sleeperScore = clamp(
      price.score * SLEEPER_SCORE_WEIGHTS.priceEdge
      + module.opportunity * SLEEPER_SCORE_WEIGHTS.opportunityPath
      + module.talent * SLEEPER_SCORE_WEIGHTS.talentSignal
      + module.ceiling * SLEEPER_SCORE_WEIGHTS.ceilingCatalyst
      + league.score * SLEEPER_SCORE_WEIGHTS.leagueFit
      + timing.score * SLEEPER_SCORE_WEIGHTS.roomTiming
    );
    const nonPriceSignals = [module.opportunity, module.talent, module.ceiling, league.score].filter((score) => score >= 56).length;
    const teams = Math.max(2, finite(context.teams ?? context.league?.teams) ?? 12);
    const adp = finite(safePlayer.adp);
    const marketTier = finite(safePlayer.marketTier);
    const labTier = finite(safePlayer.tier ?? safePlayer.labTier);
    const twoRoundAdpEdge = price.edgePicks !== null && price.edgePicks >= teams * 2;
    const tierPromotion = marketTier !== null && labTier !== null && marketTier - labTier >= 1;
    const outsideFirstRound = adp === null || adp > teams;
    const valueBreakoutGate = twoRoundAdpEdge || tierPromotion;
    const isSleeper = sleeperScore >= 58
      && nonPriceSignals >= 2
      && valueBreakoutGate
      && outsideFirstRound
      && !["K", "DEF"].includes(String(safePlayer.position || "").toUpperCase());
    const failureReasons = failureReasonsFor(safePlayer, module, price, league, role, missingData);
    const primaryBlocker = primaryBlockerFor(safePlayer, module, league, role, evidence);
    const roomThreats = Array.isArray(context.roomThreats) ? context.roomThreats.map(String).slice(0, 5) : [];
    const survival = timing.survival;

    pushEvidence(evidence, twoRoundAdpEdge, { type: "qualification", label: "Two-round ADP edge", value: `${price.edgePicks === null ? "Unknown" : price.edgePicks.toFixed(1)} picks of Lab value in a ${teams}-team league`, direction: "positive", source: "Lab Rank vs ADP" });
    pushEvidence(evidence, tierPromotion, { type: "qualification", label: "Full-tier promotion", value: `Market Tier ${marketTier} to Lab Tier ${labTier}`, direction: "positive", source: "general market tier vs Lab projection tier" });
    pushEvidence(evidence, isSleeper, { type: "qualification", label: "Value breakout qualification", value: "At least a two-round ADP edge or one full tier of projection improvement, plus two non-price strengths", direction: "positive", source: "Fantasy Draft Labs rules" });
    pushEvidence(evidence, !outsideFirstRound, { type: "qualification", label: "Premium-player guardrail", value: "First-round players are excluded from the sleeper/value-breakout label", direction: "negative", source: "Fantasy Draft Labs rules" });
    pushEvidence(evidence, !valueBreakoutGate && adp !== null, { type: "qualification", label: "No material price or tier leap", value: "The player lacks both a two-round ADP edge and a full-tier promotion", direction: "negative", source: "Fantasy Draft Labs rules" });

    return Object.freeze({
      sleeperScore: round1(sleeperScore),
      priceEdgeScore: round1(price.score),
      opportunityPathScore: round1(module.opportunity),
      talentSignalScore: round1(module.talent),
      ceilingCatalystScore: round1(module.ceiling),
      leagueFitScore: round1(league.score),
      roomTimingScore: round1(timing.score),
      confidenceScore: round1(confidence.score),
      confidenceLabel: confidence.label,
      currentRole: roleText.currentRole,
      ceilingRole: roleText.ceilingRole,
      standaloneValueScore: round1(module.standalone),
      contingentValueScore: round1(module.contingent),
      catalystType: catalyst.type,
      catalystDescription: catalyst.description,
      primaryBlocker,
      failureReasons,
      archetype,
      targetRound: timing.targetRound,
      earliestReasonablePick: timing.earliestReasonablePick,
      latestSafePick: timing.latestSafePick,
      survivalToNextPick: survival === null ? null : Math.round(clamp(survival, 0, 1) * 1000) / 1000,
      roomThreats,
      evidence: evidence.slice(0, 14),
      missingData: [...new Set(missingData)],
      dataFreshness: Object.freeze({ label: fresh.label, asOf: fresh.asOf, ageDays: fresh.ageDays }),
      roleSource: role.source,
      roleConfidence: role.confidence,
      priceEdgePicks: price.edgePicks === null ? null : Math.round(price.edgePicks * 10) / 10,
      marketTier: marketTier === null ? null : Math.round(marketTier),
      labTier: labTier === null ? null : Math.round(labTier),
      twoRoundAdpEdge,
      tierPromotion,
      valueBreakoutGate,
      isSleeper,
      rosterRedundancyPenalty: league.redundancyPenalty,
      modelVersion: "value-breakout-v2",
      weights: SLEEPER_SCORE_WEIGHTS,
    });
  }

  function targetTypeMatches(profile, targetType) {
    const type = String(targetType || "all");
    if (type === "all") return true;
    if (type === "standalone") return profile.standaloneValueScore >= 62;
    if (type === "contingent") return profile.contingentValueScore >= 62;
    if (type === "breakout") return ["Target-earning WR", "Route-growth WR", "Post-hype breakout", "Rookie role bet", "Full-route TE", "Rushing QB", "Ambiguous-depth-chart winner"].includes(profile.archetype);
    if (type === "deep_stash") return profile.targetRound >= 10 && profile.ceilingCatalystScore >= 55;
    if (type === "market_faller") return profile.archetype === "Market faller";
    if (type === "league_specific") return profile.archetype === "League-specific scoring sleeper" || profile.leagueFitScore >= 68;
    return false;
  }

  const api = Object.freeze({ SLEEPER_SCORE_WEIGHTS, POSITION_METRICS, buildSleeperProfile, targetTypeMatches });
  globalScope.FDLSleeperModel = api;
  globalScope.buildSleeperProfile = buildSleeperProfile;
})(typeof globalThis !== "undefined" ? globalThis : window);
