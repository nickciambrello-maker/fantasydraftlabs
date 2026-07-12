const DEFAULT_LEAGUE = {
  id: "default",
  name: "Default League",
  teams: 12,
  scoring: "Half-PPR",
  rounds: 16,
  roster: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1, BENCH: 6 },
  keeper: "1 player, prior-round cost",
  ensureCompleteRoster: true,
};

let LEAGUE = loadSavedLeagueSettings();

const RAW_PLAYERS = `
1|Bijan Robinson|RB|ATL|1.5
2|Jahmyr Gibbs|RB|DET|2.0
3|Ja'Marr Chase|WR|CIN|2.5
4|Puka Nacua|WR|LAR|4.0
5|Jaxon Smith-Njigba|WR|SEA|5.0
6|Christian McCaffrey|RB|SF|6.5
7|Jonathan Taylor|RB|IND|7.0
8|CeeDee Lamb|WR|DAL|8.0
9|Amon-Ra St. Brown|WR|DET|8.5
10|Justin Jefferson|WR|MIN|10.5
11|James Cook|RB|BUF|11.0
12|Ashton Jeanty|RB|LV|11.5
13|De'Von Achane|RB|MIA|14.5
14|Saquon Barkley|RB|PHI|14.5
15|Chase Brown|RB|CIN|16.0
16|Omarion Hampton|RB|LAC|16.5
17|Drake London|WR|ATL|17.0
18|Kenneth Walker|RB|KC|17.5
19|Brock Bowers|TE|LV|19.5
20|Nico Collins|WR|HOU|19.5
21|Derrick Henry|RB|BAL|22.5
22|George Pickens|WR|DAL|22.5
23|Jeremiyah Love|RB|ARI|24.0
24|A.J. Brown|WR|NE|24.0
25|Trey McBride|TE|ARI|24.5
26|DeVonta Smith|WR|PHI|26.5
27|Chris Olave|WR|NO|27.5
28|Josh Allen|QB|BUF|28.5
29|Rashee Rice|WR|KC|28.5
30|Malik Nabers|WR|NYG|29.5
31|Breece Hall|RB|NYJ|33.5
32|Tee Higgins|WR|CIN|33.5
33|Kyren Williams|RB|LAR|34.5
34|Travis Etienne|RB|NO|34.5
35|Josh Jacobs|RB|GB|35.5
36|Tetairoa McMillan|WR|CAR|35.5
37|Zay Flowers|WR|BAL|36.0
38|Garrett Wilson|WR|NYJ|37.5
39|Ladd McConkey|WR|LAC|38.0
40|Javonte Williams|RB|DAL|39.0
41|Colston Loveland|TE|CHI|41.5
42|Luther Burden III|WR|CHI|44.0
43|Lamar Jackson|QB|BAL|44.5
44|Emeka Egbuka|WR|TB|44.5
45|Jaylen Waddle|WR|DEN|45.5
46|Cam Skattebo|RB|NYG|46.5
47|Terry McLaurin|WR|WAS|46.5
48|Davante Adams|WR|LAR|47.0
49|Bucky Irving|RB|TB|50.0
50|Jameson Williams|WR|DET|50.5
51|D'Andre Swift|RB|CHI|52.5
52|TreVeyon Henderson|RB|NE|54.0
53|Drake Maye|QB|NE|55.0
54|Mike Evans|WR|SF|55.0
55|D.J. Moore|WR|BUF|56.0
56|David Montgomery|RB|HOU|56.5
57|Quinshon Judkins|RB|CLE|57.0
58|Joe Burrow|QB|CIN|57.5
59|Christian Watson|WR|GB|58.5
60|Jayden Daniels|QB|WAS|59.0
61|Bhayshul Tuten|RB|JAC|59.0
62|Rome Odunze|WR|CHI|59.0
63|Tyler Warren|TE|IND|60.5
64|Carnell Tate|WR|TEN|63.0
65|Jadarian Price|RB|SEA|65.0
66|Jalen Hurts|QB|PHI|66.5
67|Chuba Hubbard|RB|CAR|67.5
68|Jordyn Tyson|WR|NO|68.0
69|Marvin Harrison Jr.|WR|ARI|70.0
70|Caleb Williams|QB|CHI|73.0
71|Jaylen Warren|RB|PIT|73.5
72|Tucker Kraft|TE|GB|73.5
73|Justin Herbert|QB|LAC|75.0
74|Makai Lemon|WR|PHI|75.0
75|Brian Thomas Jr.|WR|JAC|76.0
76|Alec Pierce|WR|IND|77.0
77|Rhamondre Stevenson|RB|NE|79.5
78|DK Metcalf|WR|PIT|79.5
79|Rico Dowdle|RB|PIT|80.5
80|Tony Pollard|RB|TEN|80.5
81|Parker Washington|WR|JAC|81.0
82|Courtland Sutton|WR|DEN|81.5
83|RJ Harvey|RB|DEN|82.5
84|Jaxson Dart|QB|NYG|84.5
85|Dak Prescott|QB|DAL|84.5
86|Trevor Lawrence|QB|JAC|85.5
87|Michael Wilson|WR|ARI|87.0
88|Chris Godwin|WR|TB|87.0
89|Sam LaPorta|TE|DET|90.0
90|Blake Corum|RB|LAR|91.0
91|Harold Fannin Jr.|TE|CLE|92.0
92|Kyle Monangai|RB|CHI|92.5
93|Jordan Addison|WR|MIN|95.0
94|Jayden Reed|WR|GB|95.5
95|Quentin Johnston|WR|LAC|95.5
96|J.K. Dobbins|RB|DEN|96.5
97|Kyle Pitts|TE|ATL|96.5
98|Ricky Pearsall|WR|SF|96.5
99|Patrick Mahomes|QB|KC|97.0
100|Brock Purdy|QB|SF|97.5
101|Jakobi Meyers|WR|JAC|100.5
102|Josh Downs|WR|IND|100.5
103|Bo Nix|QB|DEN|103.0
104|Michael Pittman Jr.|WR|PIT|103.0
105|Kyler Murray|QB|MIN|104.0
106|Xavier Worthy|WR|KC|104.5
107|Kenneth Gainwell|RB|TB|105.5
108|Jacory Croskey-Merritt|RB|WAS|109.0
109|Matthew Stafford|QB|LAR|110.5
110|Aaron Jones|RB|MIN|112.0
111|Wan'Dale Robinson|WR|TEN|113.0
112|Jonathon Brooks|RB|CAR|113.5
113|Dalton Kincaid|TE|BUF|114.0
114|Rachaad White|RB|WAS|114.5
115|Travis Kelce|TE|KC|114.5
116|George Kittle|TE|SF|117.0
117|Jared Goff|QB|DET|119.0
118|Jordan Mason|RB|MIN|120.5
119|Dallas Goedert|TE|PHI|121.0
120|Jake Ferguson|TE|DAL|121.0
121|Jordan Love|QB|GB|121.5
122|Jayden Higgins|WR|HOU|122.5
123|Romeo Doubs|WR|NE|122.5
124|Matthew Golden|WR|GB|124.0
125|Isaiah Likely|TE|NYG|124.5
126|KC Concepcion|WR|CLE|125.5
127|Malik Willis|QB|MIA|126.5
128|Chris Rodriguez Jr.|RB|JAC|126.5
129|Tyler Shough|QB|NO|127.5
130|Baker Mayfield|QB|TB|128.0
131|Tyrone Tracy Jr.|RB|NYG|128.0
132|Mark Andrews|TE|BAL|128.0
133|Jalen Coker|WR|CAR|128.5
134|Khalil Shakir|WR|BUF|131.0
135|Tyler Allgeier|RB|ARI|136.5
136|Stefon Diggs|WR|NE|138.5
137|Woody Marks|RB|HOU|139.0
138|Keaton Mitchell|RB|LAC|139.0
139|Oronde Gadsden|TE|LAC|140.0
140|Zach Charbonnet|RB|SEA|142.0
141|Brenton Strange|TE|JAC|145.0
142|Rashid Shaheed|WR|SEA|146.0
143|Jonah Coleman|RB|DEN|146.5
144|C.J. Stroud|QB|HOU|147.5
145|Isiah Pacheco|RB|DET|148.0
146|Omar Cooper Jr.|WR|NYJ|149.0
147|Tyjae Spears|RB|TEN|149.5
148|Hunter Henry|TE|NE|151.0
149|Sam Darnold|QB|SEA|152.0
150|Deebo Samuel|WR|FA|153.0
151|Travis Hunter|WR|JAC|153.0
152|Denzel Boston|WR|CLE|154.0
153|Houston Texans|DEF|HOU|155.0
154|Cam Ward|QB|TEN|156.0
155|Jauan Jennings|WR|MIN|157.0
156|Jalen McMillan|WR|TB|157.0
157|Brian Robinson Jr.|RB|ATL|157.5
158|Daniel Jones|QB|IND|158.0
159|Juwan Johnson|TE|NO|158.0
160|Bryce Young|QB|CAR|159.0
161|Dylan Sampson|RB|CLE|159.0
162|Tank Bigsby|RB|PHI|162.0
163|Chigoziem Okonkwo|TE|WAS|163.5
164|Denver Broncos|DEF|DEN|164.0
165|Alvin Kamara|RB|NO|165.0
166|Seattle Seahawks|DEF|SEA|168.0
167|Jalen Nailor|WR|LV|169.0
168|Kenyon Sadiq|TE|NYJ|170.0
169|Tre Tucker|WR|LV|170.5
170|Adonai Mitchell|WR|NYJ|173.0
171|Braelon Allen|RB|NYJ|173.5
172|Jerry Jeudy|WR|CLE|173.5
173|Brandon Aiyuk|WR|SF|174.5
174|Antonio Williams|WR|WAS|175.0
175|Philadelphia Eagles|DEF|PHI|176.0
176|Emmett Johnson|RB|KC|177.5
177|T.J. Hockenson|TE|MIN|178.5
178|Sean Tucker|RB|TB|179.5
179|Los Angeles Rams|DEF|LAR|180.0
180|Mike Washington Jr.|RB|LV|181.0
181|Minnesota Vikings|DEF|MIN|182.0
182|Ray Davis|RB|BUF|182.5
183|Dalton Schultz|TE|HOU|183.5
184|Brandon Aubrey|K|DAL|184.0
185|Nicholas Singleton|RB|TEN|185.5
186|Kaytron Allen|RB|WAS|189.0
187|New England Patriots|DEF|NE|190.0
188|Terrance Ferguson|TE|LAR|191.5
189|Ryan Flournoy|WR|DAL|192.0
190|Isaac TeSlaa|WR|DET|192.5
191|James Conner|RB|ARI|194.0
192|Calvin Ridley|WR|TEN|194.0
193|Tre Harris|WR|LAC|194.0
194|Jacksonville Jaguars|DEF|JAC|195.0
195|Jacoby Brissett|QB|ARI|195.5
196|Kayshon Boutte|WR|NE|195.5
197|Los Angeles Chargers|DEF|LAC|199.0
198|Pittsburgh Steelers|DEF|PIT|200.0
199|Emanuel Wilson|RB|SEA|200.5
200|Green Bay Packers|DEF|GB|202.0
201|Jaydon Blue|RB|DAL|202.0
202|Malik Washington|WR|MIA|203.0
203|Tyreek Hill|WR|FA|203.5
204|Jaylin Noel|WR|HOU|203.5
205|AJ Barner|TE|SEA|204.0
206|Fernando Mendoza|QB|LV|205.0
207|Ka'imi Fairbairn|K|HOU|206.0
208|Eli Stowers|TE|PHI|206.0
209|Kimani Vidal|RB|LAC|207.0
210|Demond Claiborne|RB|MIN|208.0
211|Jordan James|RB|SF|208.5
`.trim();

const BASE_PLAYERS = RAW_PLAYERS.split("\n").map((line) => {
  const [rank, name, position, team, adp] = line.split("|");
  return {
    id: playerKey(name),
    rank: Number(rank),
    consensusRank: Number(rank),
    name,
    position,
    team,
    adp: Number(adp),
    sourceCount: 1,
    sourceRanks: { "Built-in Public Seed": Number(rank) },
    tier: Math.ceil(Number(rank) / 12),
    keeperValue: 0,
  };
});

let PLAYERS = BASE_PLAYERS.map((player) => ({ ...player, sourceRanks: { ...player.sourceRanks } }));

const PERSONAS = [
  {
    id: "adp-grinder",
    name: "ADP Grinder",
    description: "Market-aware value drafter who rarely gets pulled into panic runs.",
    strategyStyle: "BPA",
    experienceLevel: "Expert",
    adpDiscipline: "High",
    upsidePreference: "Medium",
    teamNeedWeight: "Medium",
    rookieValue: "Medium",
    reachFrequency: "Low",
    positionalAggression: "Balanced",
    notes: "Rarely reaches, drafts value, avoids panic runs, builds balanced rosters.",
  },
  {
    id: "zero-rb-sharp",
    name: "Zero RB Sharp",
    description: "Sharp drafter who delays RB while building WR, TE, and QB strength.",
    strategyStyle: "Zero RB",
    experienceLevel: "Expert",
    adpDiscipline: "High",
    upsidePreference: "High",
    teamNeedWeight: "Medium",
    rookieValue: "Medium",
    reachFrequency: "Low-Medium",
    positionalAggression: "WR",
    notes: "Starts WR/TE/QB-heavy, waits on RB, targets pass-catching RBs and ambiguous backfields later.",
  },
  {
    id: "hero-rb-builder",
    name: "Hero RB Builder",
    description: "Wants one anchor RB before attacking pass-catcher value.",
    strategyStyle: "Hero RB",
    experienceLevel: "Expert/Intermediate",
    adpDiscipline: "Medium-High",
    upsidePreference: "Medium",
    teamNeedWeight: "High",
    rookieValue: "Medium",
    reachFrequency: "Medium",
    positionalAggression: "Balanced",
    notes: "Wants one early anchor RB, then prioritizes WR value before adding RB depth.",
  },
  {
    id: "robust-rb-drafter",
    name: "Robust RB Drafter",
    description: "Prioritizes early RB volume and positional scarcity.",
    strategyStyle: "Robust RB",
    experienceLevel: "Intermediate",
    adpDiscipline: "Medium",
    upsidePreference: "Medium",
    teamNeedWeight: "High",
    rookieValue: "Medium",
    reachFrequency: "Medium",
    positionalAggression: "RB",
    notes: "Prioritizes RB scarcity early and may pass on better WR values to secure RB volume.",
  },
  {
    id: "wr-volume-drafter",
    name: "WR Volume Drafter",
    description: "Leans into the 3-WR plus Flex format by stacking WR depth.",
    strategyStyle: "WR Heavy",
    experienceLevel: "Intermediate",
    adpDiscipline: "Medium-High",
    upsidePreference: "Medium",
    teamNeedWeight: "Medium",
    rookieValue: "Medium",
    reachFrequency: "Low-Medium",
    positionalAggression: "WR",
    notes: "Prioritizes WR depth because the league starts 3 WRs plus a Flex.",
  },
  {
    id: "elite-qb-hunter",
    name: "Elite QB Hunter",
    description: "Willing to pay for a top QB edge before the room settles in.",
    strategyStyle: "Elite QB",
    experienceLevel: "Intermediate",
    adpDiscipline: "Medium",
    upsidePreference: "Medium",
    teamNeedWeight: "Medium",
    rookieValue: "Low-Medium",
    reachFrequency: "Medium",
    positionalAggression: "QB",
    notes: "Takes top-tier QBs early to gain a weekly positional edge.",
  },
  {
    id: "elite-te-hunter",
    name: "Elite TE Hunter",
    description: "Targets elite TE leverage or pivots if the tier dries up.",
    strategyStyle: "Elite TE",
    experienceLevel: "Intermediate",
    adpDiscipline: "Medium",
    upsidePreference: "Medium",
    teamNeedWeight: "Medium",
    rookieValue: "Low-Medium",
    reachFrequency: "Medium",
    positionalAggression: "TE",
    notes: "Pays up for elite TE or waits if the top tier is gone.",
  },
  {
    id: "upside-gambler",
    name: "Upside Gambler",
    description: "Chases ceiling, uncertainty, and breakout profiles.",
    strategyStyle: "Upside",
    experienceLevel: "Intermediate",
    adpDiscipline: "Low-Medium",
    upsidePreference: "High",
    teamNeedWeight: "Low-Medium",
    rookieValue: "High",
    reachFrequency: "Medium-High",
    positionalAggression: "Balanced",
    notes: "Chases breakout profiles, youth, camp hype, rookies, and ceiling outcomes.",
  },
  {
    id: "safe-floor-drafter",
    name: "Safe Floor Drafter",
    description: "Prefers bankable roles and avoids uncertain profiles.",
    strategyStyle: "Balanced",
    experienceLevel: "Beginner/Intermediate",
    adpDiscipline: "Medium",
    upsidePreference: "Low",
    teamNeedWeight: "High",
    rookieValue: "Low",
    reachFrequency: "Medium",
    positionalAggression: "Balanced",
    notes: "Prefers veterans, stable roles, and known production over uncertain upside.",
  },
  {
    id: "rookie-chaser",
    name: "Rookie Chaser",
    description: "Overweights youth and second-year breakout stories.",
    strategyStyle: "Upside",
    experienceLevel: "Beginner/Intermediate",
    adpDiscipline: "Low-Medium",
    upsidePreference: "High",
    teamNeedWeight: "Medium",
    rookieValue: "High",
    reachFrequency: "High",
    positionalAggression: "Balanced",
    notes: "Overvalues rookies and second-year breakout candidates.",
  },
  {
    id: "homer-reacher",
    name: "Homer Reacher",
    description: "Bias-driven drafter who takes favorites and recognizable names.",
    strategyStyle: "Bias Driven",
    experienceLevel: "Beginner",
    adpDiscipline: "Low",
    upsidePreference: "Medium",
    teamNeedWeight: "Low-Medium",
    rookieValue: "Medium",
    reachFrequency: "High",
    positionalAggression: "Balanced",
    notes: "Reaches for favorite-team players, personal favorites, and recognizable names.",
  },
  {
    id: "need-based-beginner",
    name: "Need-Based Beginner",
    description: "Fills lineup holes aggressively, including onesie positions.",
    strategyStyle: "BPA",
    experienceLevel: "Beginner",
    adpDiscipline: "Low",
    upsidePreference: "Low-Medium",
    teamNeedWeight: "High",
    rookieValue: "Low-Medium",
    reachFrequency: "High",
    positionalAggression: "Balanced",
    notes: "Drafts to fill lineup holes, may take QB/TE/K/DEF earlier than optimal, and is more likely to make inefficient picks.",
  },
];

const strategyCopy = {
  balanced: "Best value with light pressure toward open starters.",
  heroRB: "Secure one reliable RB, then lean WR/TE value unless RB value falls.",
  zeroRB: "Delay RB unless value is extreme; build WR/TE strength early.",
  robustRB: "Attack RB depth early before the room squeezes the position.",
  eliteQBTE: "Give premium QB/TE options a real bump when the board cooperates.",
  wrHeavy: "Prioritize WR depth for 3-WR plus Flex formats.",
  upside: "Favor ceiling, youth, and breakout profiles when values are close.",
  safeFloor: "Favor stable veterans, clean roles, and balanced roster coverage.",
};

const BULK_STRATEGIES = [
  { id: "balanced", label: "Balanced" },
  { id: "heroRB", label: "Hero RB" },
  { id: "zeroRB", label: "Zero RB" },
  { id: "robustRB", label: "Robust RB" },
  { id: "wrHeavy", label: "WR Heavy" },
  { id: "eliteQBTE", label: "Elite QB/TE" },
  { id: "upside", label: "Upside" },
  { id: "safeFloor", label: "Safe Floor" },
];

const SEED_SOURCE = {
  name: "Built-in Public Seed",
  type: "public seed",
  rows: BASE_PLAYERS.length,
  status: "active",
  updatedAt: "Seeded from public 2026 half-PPR rankings/ADP",
};

const SLEEPER_API_BASE = "https://api.sleeper.app/v1";
const SLEEPER_DEFAULT_SEASON = String(new Date().getFullYear() - 1);

let state = {
  leagueProfiles: [],
  activeLeagueId: "default",
  leagueRestartPending: false,
  pendingLeagueProfile: null,
  userTeam: 6,
  teamNames: defaultTeamNames(),
  roundOrders: defaultSnakeOrders(),
  keeperSelections: [],
  teamPersonas: defaultTeamPersonas(),
  activeRound: 0,
  draftMode: "mock",
  strategy: "balanced",
  importedRankingRows: [],
  seedRankingsEnabled: true,
  rankingSources: [{ ...SEED_SOURCE }],
  currentPick: 1,
  mockSeed: Math.random() * 10000,
  picks: [],
  draftedIds: new Set(),
  completedDrafts: [],
  viewedDraftId: null,
  currentDraftSnapshot: null,
  analysisTeam: 1,
  roomRosterTeam: 1,
  activePanel: "draft",
  positionFilter: "ALL",
  search: "",
  assistantMessages: [],
  bulk: {
    count: 50,
    mode: "compare",
    strategy: "balanced",
    randomizeRoom: true,
    running: false,
    progress: 0,
    total: 0,
    results: null,
    selectedRunId: null,
  },
  trade: {
    teamA: 1,
    teamB: 2,
    picksA: [],
    picksB: [],
    keeperPlayerA: "",
    keeperRoundA: "",
    keeperPlayerB: "",
    keeperRoundB: "",
  },
  tradeFinder: {
    focusTeam: "all",
    threshold: 95,
    includeKeepers: true,
    requireEqualPicks: true,
    ideas: [],
    hasRun: false,
  },
  sleeper: {
    username: "",
    userId: "",
    displayName: "",
    season: SLEEPER_DEFAULT_SEASON,
    leagues: [],
    selectedLeagueId: "",
    importData: null,
    loading: false,
    status: "",
  },
};

const $ = (id) => document.getElementById(id);

function isLiveDraftMode() {
  return state.draftMode === "live";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadSavedLeagueSettings() {
  try {
    const profiles = loadLeagueProfiles();
    const activeId = localStorage.getItem("fantasyDraftLabActiveLeagueId") || profiles[0]?.id || "default";
    return normalizeLeagueSettings(profiles.find((profile) => profile.id === activeId) || profiles[0] || DEFAULT_LEAGUE);
  } catch {
    return structuredClone(DEFAULT_LEAGUE);
  }
}

function normalizeLeagueSettings(settings) {
  const roster = { ...DEFAULT_LEAGUE.roster, ...(settings.roster || {}) };
  return {
    id: settings.id || `league-${Date.now()}`,
    name: settings.name || "Default League",
    teams: Math.max(2, Math.min(20, Number(settings.teams) || DEFAULT_LEAGUE.teams)),
    scoring: settings.scoring || DEFAULT_LEAGUE.scoring,
    rounds: Math.max(1, Math.min(25, Number(settings.rounds) || DEFAULT_LEAGUE.rounds)),
    roster: Object.fromEntries(Object.entries(roster).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])),
    keeper: settings.keeper || DEFAULT_LEAGUE.keeper,
    ensureCompleteRoster: settings.ensureCompleteRoster !== false,
  };
}

function saveLeagueSettings() {
  try {
    saveActiveLeagueProfile();
  } catch {
    // League settings still work for the current session.
  }
}

function legacyLeagueProfile() {
  const league = normalizeLeagueSettings(JSON.parse(localStorage.getItem("fantasyDraftLabLeagueSettings") || "null") || DEFAULT_LEAGUE);
  const savedNames = JSON.parse(localStorage.getItem("fantasyDraftLabTeamNames") || "[]");
  const savedOrders = JSON.parse(localStorage.getItem("fantasyDraftLabRoundOrders") || "null");
  const savedKeepers = JSON.parse(localStorage.getItem("fantasyDraftLabKeeperSelections") || "[]");
  const savedPersonas = JSON.parse(localStorage.getItem("fantasyDraftLabTeamPersonas") || "[]");
  return {
    ...league,
    id: league.id || "default",
    name: league.name || "Default League",
    teamNames: Array.from({ length: league.teams }, (_, index) => savedNames[index] || `Team ${index + 1}`),
    userTeam: Math.min(6, league.teams),
    roundOrders: Array.isArray(savedOrders) ? savedOrders : null,
    keeperSelections: Array.isArray(savedKeepers) ? savedKeepers : [],
    teamPersonas: Array.isArray(savedPersonas) ? savedPersonas : [],
  };
}

function loadLeagueProfiles() {
  const saved = JSON.parse(localStorage.getItem("fantasyDraftLabLeagueProfiles") || "[]");
  if (Array.isArray(saved) && saved.length) return saved.map((profile) => normalizeLeagueProfile(profile));
  return [normalizeLeagueProfile(legacyLeagueProfile())];
}

function normalizeLeagueProfile(profile) {
  const league = normalizeLeagueSettings(profile || DEFAULT_LEAGUE);
  return {
    ...league,
    teamNames: Array.from({ length: league.teams }, (_, index) => profile?.teamNames?.[index] || `Team ${index + 1}`),
    userTeam: Math.max(1, Math.min(league.teams, Number(profile?.userTeam) || Math.min(6, league.teams))),
    roundOrders: profile?.roundOrders || null,
    keeperSelections: profile?.keeperSelections || [],
    teamPersonas: profile?.teamPersonas || [],
    sleeperImport: normalizeSleeperImport(profile?.sleeperImport || null, league.teams),
  };
}

function saveLeagueProfiles() {
  try {
    localStorage.setItem("fantasyDraftLabLeagueProfiles", JSON.stringify(state.leagueProfiles));
    localStorage.setItem("fantasyDraftLabActiveLeagueId", state.activeLeagueId);
  } catch {
    $("leagueSettingsStatus").textContent = "League profile updated, but this browser blocked local saving.";
  }
}

function activeLeagueProfile() {
  return state.leagueProfiles.find((profile) => profile.id === state.activeLeagueId) || state.leagueProfiles[0] || normalizeLeagueProfile(DEFAULT_LEAGUE);
}

function saveActiveLeagueProfile() {
  const profile = {
    ...normalizeLeagueSettings(LEAGUE),
    id: state.activeLeagueId || LEAGUE.id || "default",
    name: LEAGUE.name || "Default League",
    userTeam: state.userTeam,
    teamNames: [...state.teamNames],
    roundOrders: state.roundOrders.map((round) => [...round]),
    keeperSelections: state.keeperSelections.map((selection) => ({ ...selection })),
    teamPersonas: [...state.teamPersonas],
    sleeperImport: normalizeSleeperImport(state.sleeper.importData, LEAGUE.teams),
  };
  state.activeLeagueId = profile.id;
  const existingIndex = state.leagueProfiles.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) state.leagueProfiles[existingIndex] = profile;
  else state.leagueProfiles.push(profile);
  saveLeagueProfiles();
}

function applyLeagueProfile(profile) {
  const normalized = normalizeLeagueProfile(profile);
  LEAGUE = normalizeLeagueSettings(normalized);
  state.activeLeagueId = normalized.id;
  state.userTeam = Math.max(1, Math.min(LEAGUE.teams, Number(normalized.userTeam) || Math.min(6, LEAGUE.teams)));
  state.roomRosterTeam = state.userTeam;
  state.teamNames = Array.from({ length: LEAGUE.teams }, (_, index) => normalized.teamNames[index] || `Team ${index + 1}`);
  state.roundOrders = resizeRoundOrders(normalized.roundOrders || defaultSnakeOrders());
  state.keeperSelections = normalizeKeeperSelections(normalized.keeperSelections || []);
  state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => normalized.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id);
  state.sleeper.importData = normalizeSleeperImport(normalized.sleeperImport, LEAGUE.teams);
  syncRoomToLeague();
}

function initializeLeagueProfiles() {
  state.leagueProfiles = loadLeagueProfiles();
  const activeId = localStorage.getItem("fantasyDraftLabActiveLeagueId");
  const profile = state.leagueProfiles.find((item) => item.id === activeId) || state.leagueProfiles[0];
  applyLeagueProfile(profile);
  saveLeagueProfiles();
}

function defaultKeeperSelections() {
  return Array.from({ length: LEAGUE.teams }, () => ({ playerId: "", round: "" }));
}

function defaultTeamNames() {
  return Array.from({ length: LEAGUE.teams }, (_, index) => `Team ${index + 1}`);
}

function teamName(team) {
  return state.teamNames[team - 1] || `Team ${team}`;
}

function draftTeamName(draft, team) {
  return draft.teamNames?.[team - 1] || teamName(team);
}

function activeDraft() {
  return state.completedDrafts.find((draft) => draft.id === state.viewedDraftId) || null;
}

function activeLeague() {
  const draft = activeDraft();
  return draft?.league ? normalizeLeagueSettings(draft.league) : LEAGUE;
}

function activeTeamName(team) {
  const draft = activeDraft();
  return draft ? draftTeamName(draft, team) : teamName(team);
}

function loadTeamNames() {
  try {
    const profile = activeLeagueProfile();
    state.teamNames = Array.from({ length: LEAGUE.teams }, (_, index) => profile.teamNames?.[index] || `Team ${index + 1}`);
  } catch {
    state.teamNames = defaultTeamNames();
  }
}

function saveTeamNames() {
  saveActiveLeagueProfile();
}

function resizeRoundOrders(orders = state.roundOrders) {
  const fallback = defaultSnakeOrders();
  return Array.from({ length: LEAGUE.rounds }, (_, roundIndex) => {
    const existing = Array.isArray(orders[roundIndex]) ? orders[roundIndex] : [];
    return Array.from({ length: LEAGUE.teams }, (_, pickIndex) => {
      const team = Number(existing[pickIndex]);
      return team >= 1 && team <= LEAGUE.teams ? team : fallback[roundIndex][pickIndex];
    });
  });
}

function saveRoundOrders() {
  saveActiveLeagueProfile();
}

function clearTradeFinderIdeas() {
  state.tradeFinder.ideas = [];
  state.tradeFinder.hasRun = false;
}

function loadRoundOrders() {
  try {
    const profile = activeLeagueProfile();
    state.roundOrders = Array.isArray(profile.roundOrders) ? resizeRoundOrders(profile.roundOrders) : defaultSnakeOrders();
  } catch {
    state.roundOrders = defaultSnakeOrders();
  }
}

function normalizeKeeperSelections(selections = state.keeperSelections) {
  return Array.from({ length: LEAGUE.teams }, (_, index) => {
    const selection = selections[index] || {};
    const round = Number(selection.round);
    return {
      playerId: selection.playerId || "",
      round: round >= 1 && round <= LEAGUE.rounds ? round : "",
    };
  });
}

function normalizeSleeperImport(importData, teamCount = LEAGUE.teams) {
  if (!importData || !Array.isArray(importData.teams)) return null;
  return {
    source: "Sleeper",
    leagueId: String(importData.leagueId || ""),
    leagueName: importData.leagueName || "Sleeper league",
    season: String(importData.season || SLEEPER_DEFAULT_SEASON),
    keeperSourceLeagueId: String(importData.keeperSourceLeagueId || importData.leagueId || ""),
    keeperSourceSeason: String(importData.keeperSourceSeason || importData.season || SLEEPER_DEFAULT_SEASON),
    usedPreviousLeagueForKeepers: Boolean(importData.usedPreviousLeagueForKeepers),
    importedUserId: String(importData.importedUserId || ""),
    importedAt: importData.importedAt || new Date().toISOString(),
    teams: Array.from({ length: teamCount }, (_, index) => {
      const team = importData.teams[index] || {};
      const candidates = Array.isArray(team.keeperCandidates) ? team.keeperCandidates : [];
      return {
        team: index + 1,
        sleeperRosterId: team.sleeperRosterId || "",
        sleeperOwnerId: team.sleeperOwnerId || "",
        name: team.name || `Team ${index + 1}`,
        ownerName: team.ownerName || "",
        keeperCandidates: candidates
          .filter((candidate) => candidate && candidate.playerId && candidate.round)
          .map((candidate) => ({
            playerId: candidate.playerId,
            sleeperPlayerId: String(candidate.sleeperPlayerId || ""),
            name: candidate.name || "",
            position: candidate.position || "",
            team: candidate.team || "",
            round: Number(candidate.round),
            pickNo: Number(candidate.pickNo) || "",
            surplus: Number(candidate.surplus) || 0,
          }))
          .sort((a, b) => b.surplus - a.surplus),
      };
    }),
  };
}

function saveKeeperSelections() {
  saveActiveLeagueProfile();
}

function loadKeeperSelections() {
  try {
    const profile = activeLeagueProfile();
    state.keeperSelections = normalizeKeeperSelections(Array.isArray(profile.keeperSelections) ? profile.keeperSelections : []);
  } catch {
    state.keeperSelections = defaultKeeperSelections();
  }
}

function syncRoomToLeague() {
  state.userTeam = Math.min(state.userTeam, LEAGUE.teams);
  state.analysisTeam = Math.min(state.analysisTeam, LEAGUE.teams);
  state.roomRosterTeam = Math.min(state.roomRosterTeam, LEAGUE.teams);
  state.trade.teamA = Math.min(state.trade.teamA, LEAGUE.teams);
  state.trade.teamB = Math.min(state.trade.teamB, LEAGUE.teams);
  if (state.trade.teamA === state.trade.teamB) state.trade.teamB = state.trade.teamA === LEAGUE.teams ? 1 : state.trade.teamA + 1;
  state.roundOrders = resizeRoundOrders(state.roundOrders);
  state.keeperSelections = normalizeKeeperSelections(state.keeperSelections);
  state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id);
  state.teamNames = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamNames[index] || `Team ${index + 1}`);
}

function playerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function defaultTeamPersonas() {
  return Array.from({ length: LEAGUE.teams }, (_, index) => PERSONAS[index % PERSONAS.length].id);
}

function getPersonaForTeam(team) {
  const personaId = state.teamPersonas[team - 1] || PERSONAS[(team - 1) % PERSONAS.length].id;
  return PERSONAS.find((persona) => persona.id === personaId) || PERSONAS[0];
}

function intensity(value) {
  const normalized = String(value || "Medium").toLowerCase();
  if (normalized.includes("low") && normalized.includes("medium")) return 1.5;
  if (normalized.includes("medium") && normalized.includes("high")) return 2.5;
  if (normalized.includes("low")) return 1;
  if (normalized.includes("high")) return 3;
  return 2;
}

function isYoungUpsidePlayer(player) {
  return /III|Jr\.|Love|Warren|Tate|Lemon|Higgins|Golden|Blue|Claiborne|Hunter|Judkins|Henderson|Jeanty|Hampton|McMillan|Egbuka|Skattebo|Loveland|Burden|Tyson|Harvey|Dart|Fannin|Monangai|Brooks|Noel|Stowers|Sampson/.test(player.name);
}

function isRecognizableName(player) {
  return player.consensusRank <= 80 || /Mahomes|Kelce|McCaffrey|Henry|Barkley|Kamara|Hill|Evans|Adams|Kittle|Allen|Jackson|Hurts|Burrow|Jefferson|Chase|Lamb/.test(player.name);
}

function defaultSnakeOrders() {
  return Array.from({ length: LEAGUE.rounds }, (_, roundIndex) => {
    const order = Array.from({ length: LEAGUE.teams }, (_, teamIndex) => teamIndex + 1);
    return roundIndex % 2 === 0 ? order : order.reverse();
  });
}

function draftOrderFor(pickNumber) {
  const round = Math.ceil(pickNumber / LEAGUE.teams);
  const index = (pickNumber - 1) % LEAGUE.teams;
  const team = state.roundOrders[round - 1]?.[index] || index + 1;
  return { round, index, team, label: `${round}.${String(index + 1).padStart(2, "0")}` };
}

function allOwnedPickOptions(team) {
  const picks = [];
  for (let pick = 1; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    const order = draftOrderFor(pick);
    if (order.team === team) picks.push({ pick, ...order });
  }
  return picks;
}

function pickValueBase(pickNumber) {
  const league = LEAGUE;
  const totalPicks = league.teams * league.rounds;
  const starterSlots = ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF"].reduce((sum, pos) => sum + (league.roster[pos] || 0), 0);
  const expectedPlayer = PLAYERS[Math.max(0, Math.min(PLAYERS.length - 1, Math.round(pickNumber) - 1))];
  const earlyCurve = 1420 / Math.pow(pickNumber + 7, 0.74);
  const starterWindow = Math.max(league.teams, league.teams * starterSlots);
  const starterPremium = pickNumber <= starterWindow ? 1 + ((starterWindow - pickNumber) / starterWindow) * 0.18 : 1;
  const lateProgress = Math.max(0, (pickNumber - starterWindow) / Math.max(1, totalPicks - starterWindow));
  const lateRoundDiscount = 1 - lateProgress * 0.46;
  const depthPremium = 1 + Math.max(0, (league.roster.BENCH - 6) * 0.012);
  let positionPremium = 1;

  if (expectedPlayer?.position === "RB") positionPremium += Math.max(0, (league.roster.RB + league.roster.FLEX - 3) * 0.035);
  if (expectedPlayer?.position === "WR") positionPremium += Math.max(0, (league.roster.WR + league.roster.FLEX - 4) * 0.035);
  if (expectedPlayer?.position === "TE" && league.scoring === "TE Premium") positionPremium += 0.1;
  if (expectedPlayer?.position === "QB" && league.teams * (league.roster.QB || 1) > 12) positionPremium += 0.08;
  if (expectedPlayer && ["K", "DEF"].includes(expectedPlayer.position)) positionPremium -= 0.22;

  const lateFloor = Math.max(0.75, 4.2 * Math.pow(1 - pickNumber / (totalPicks + 10), 1.55));
  return Math.max(lateFloor, earlyCurve * starterPremium * depthPremium * positionPremium * lateRoundDiscount);
}

function teamPickInventoryValue(team, incomingPicks = [], outgoingPicks = []) {
  const outgoing = new Set(outgoingPicks.map(Number));
  const incoming = new Set(incomingPicks.map(Number));
  const picks = allOwnedPickOptions(team)
    .map((item) => item.pick)
    .filter((pick) => !outgoing.has(pick));
  incoming.forEach((pick) => picks.push(pick));
  return picks.reduce((sum, pick) => sum + pickValueBase(pick), 0);
}

function teamPickContextMultiplier(team, pickNumber) {
  const leagueAverage = Array.from({ length: LEAGUE.teams }, (_, index) => teamPickInventoryValue(index + 1))
    .reduce((sum, value) => sum + value, 0) / LEAGUE.teams;
  const currentValue = teamPickInventoryValue(team);
  const round = Math.ceil(pickNumber / LEAGUE.teams);
  const ownedPicks = allOwnedPickOptions(team).map((item) => item.pick).sort((a, b) => a - b);
  const roundOwned = ownedPicks.filter((pick) => Math.ceil(pick / LEAGUE.teams) === round).length;
  const previous = [...ownedPicks].reverse().find((pick) => pick < pickNumber);
  const next = ownedPicks.find((pick) => pick > pickNumber);
  const gap = Math.min(previous ? pickNumber - previous : 24, next ? next - pickNumber : 24);
  const starterSlots = ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF"].reduce((sum, pos) => sum + (LEAGUE.roster[pos] || 0), 0);
  const starterWindowRounds = Math.ceil(Math.max(LEAGUE.teams, LEAGUE.teams * starterSlots) / LEAGUE.teams);
  const lateRoundContext = round > starterWindowRounds ? 0.45 : round > 8 ? 0.7 : 1;
  let multiplier = 1;

  if (currentValue < leagueAverage) multiplier += Math.min(0.12, (leagueAverage - currentValue) / leagueAverage * 0.16) * lateRoundContext;
  if (roundOwned === 0) multiplier += 0.05 * lateRoundContext;
  if (roundOwned >= 2) multiplier -= 0.035;
  if (gap >= LEAGUE.teams * 1.5) multiplier += 0.04 * lateRoundContext;
  if (round <= 3) multiplier += 0.025;
  return Math.max(0.88, Math.min(1.18, multiplier));
}

function adjustedPickValueForTeam(team, pickNumber) {
  return pickValueBase(pickNumber) * teamPickContextMultiplier(team, pickNumber);
}

function playerFromName(name) {
  const key = playerKey(name);
  return PLAYERS.find((player) => player.id === key || playerKey(player.name) === key) || null;
}

function keeperCostPick(round) {
  const normalizedRound = Math.max(1, Math.min(LEAGUE.rounds, Number(round) || LEAGUE.rounds));
  return (normalizedRound - 0.5) * LEAGUE.teams;
}

function keeperAssetValue(player, round, receivingTeam) {
  if (!player || !round) return null;
  const marketPick = Math.max(1, Math.min(LEAGUE.teams * LEAGUE.rounds, Number.isFinite(player.adp) ? player.adp : player.consensusRank || player.rank || 999));
  const costPick = keeperCostPick(round);
  const marketValue = adjustedPickValueForTeam(receivingTeam, marketPick);
  const costValue = adjustedPickValueForTeam(receivingTeam, costPick);
  const surplus = marketValue - costValue;
  const scarcityBoost = scoringProjectionBonus(player) + (["RB", "WR"].includes(player.position) ? 2.5 : player.position === "TE" && LEAGUE.scoring === "TE Premium" ? 4 : 0);
  return {
    player,
    round: Number(round),
    marketPick,
    costPick,
    marketValue,
    costValue,
    tradeValue: marketValue,
    surplus: Math.max(-20, surplus + scarcityBoost),
  };
}

function keeperPickForTeam(team, selection) {
  if (!selection?.playerId || !selection.round) return null;
  const player = PLAYERS.find((candidate) => candidate.id === selection.playerId);
  const roundIndex = Number(selection.round) - 1;
  const slotIndex = state.roundOrders[roundIndex]?.findIndex((owner) => owner === team);
  if (!player || slotIndex < 0) return null;
  const pick = roundIndex * LEAGUE.teams + slotIndex + 1;
  return {
    pick,
    round: roundIndex + 1,
    index: slotIndex,
    team,
    label: `${roundIndex + 1}.${String(slotIndex + 1).padStart(2, "0")}`,
    player,
    keeper: true,
  };
}

function buildKeeperPicks() {
  const usedPlayers = new Set();
  return state.keeperSelections
    .map((selection, index) => keeperPickForTeam(index + 1, selection))
    .filter((pick) => {
      if (!pick || usedPlayers.has(pick.player.id)) return false;
      usedPlayers.add(pick.player.id);
      return true;
    })
    .sort((a, b) => a.pick - b.pick);
}

function pickAt(pickNumber) {
  return state.picks.find((pick) => pick.pick === pickNumber);
}

function skipLockedPicks() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  while (state.currentPick <= total && pickAt(state.currentPick)) {
    state.currentPick += 1;
  }
}

function refreshKeeperPicksInCurrentDraft() {
  const keeperPicks = buildKeeperPicks();
  const keeperPickNumbers = new Set(keeperPicks.map((pick) => pick.pick));
  const keeperPlayerIds = new Set(keeperPicks.map((pick) => pick.player.id));
  const existingPicks = state.picks.filter((pick) => {
    if (pick.keeper) return false;
    if (keeperPickNumbers.has(pick.pick)) return false;
    if (keeperPlayerIds.has(pick.player.id)) return false;
    return true;
  });
  state.picks = [...keeperPicks, ...existingPicks].sort((a, b) => a.pick - b.pick);
  state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
  skipLockedPicks();
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeImportedRow(row, fallbackSource) {
  const name = row.name || row.player || row.Player || row.Name || row.player_name || row.full_name;
  const position = row.position || row.pos || row.Pos || row.Position;
  const team = row.team || row.Team || row.nfl_team || row.NFLTeam;
  const source = row.source || row.Source || fallbackSource;
  const rank = Number(row.rank || row.Rank || row.ecr || row.ECR || row.overall || row.Overall || row.value_rank);
  const adp = Number(row.adp || row.ADP || row.avg_pick || row.AvgPick || row.average_pick);
  const projection = Number(row.projection || row.Projection || row.points || row.Points || row.fantasy_points);
  const tier = Number(row.tier || row.Tier);
  const keeperValue = Number(row.keeperValue || row.keeper_value || row.KeeperValue || 0);
  const summary = row.summary || row.Summary || row.player_summary || row.playerSummary || row.notes || row.Notes;
  const depthChartRole = row.depth_chart_role || row.depthChartRole || row.role || row.Role;
  const depthChartRank = Number(row.depth_chart_rank || row.depthChartRank || row.depth_rank || row.DepthRank);
  const competition = row.competition || row.Competition || row.depth_chart_competition || row.depthChartCompetition;
  const injuryNote = row.injury_note || row.injuryNote || row.injury || row.Injury;
  const teamContext = row.team_context || row.teamContext || row.context || row.Context;
  const upsideNote = row.upside_note || row.upsideNote || row.upside || row.Upside;
  const riskNote = row.risk_note || row.riskNote || row.risk || row.Risk;
  const hasRankingData = Number.isFinite(rank) || Number.isFinite(adp) || Number.isFinite(projection);
  const hasContextData = summary || depthChartRole || Number.isFinite(depthChartRank) || competition || injuryNote || teamContext || upsideNote || riskNote;
  if (!name || (!hasRankingData && !hasContextData)) return null;
  return {
    id: playerKey(name),
    name: String(name).trim(),
    position: position ? String(position).trim().toUpperCase() : "",
    team: team ? String(team).trim().toUpperCase() : "",
    source: String(source || fallbackSource || "Uploaded Source").trim(),
    rank: Number.isFinite(rank) ? rank : null,
    adp: Number.isFinite(adp) ? adp : null,
    projection: Number.isFinite(projection) ? projection : null,
    tier: Number.isFinite(tier) ? tier : null,
    keeperValue: Number.isFinite(keeperValue) ? keeperValue : 0,
    summary: summary ? String(summary).trim() : "",
    depthChartRole: depthChartRole ? String(depthChartRole).trim() : "",
    depthChartRank: Number.isFinite(depthChartRank) ? depthChartRank : null,
    competition: competition ? String(competition).trim() : "",
    injuryNote: injuryNote ? String(injuryNote).trim() : "",
    teamContext: teamContext ? String(teamContext).trim() : "",
    upsideNote: upsideNote ? String(upsideNote).trim() : "",
    riskNote: riskNote ? String(riskNote).trim() : "",
  };
}

function inferredDepthRole(player, depthRank) {
  if (player.position === "DEF") return "Team defense";
  if (player.position === "K") return depthRank <= 1 ? "Projected starting kicker" : "Kicker depth";
  if (player.position === "QB") return depthRank <= 1 ? "Projected starting QB" : "Backup or developmental QB";
  if (player.position === "TE") {
    if (depthRank <= 1) return "Primary receiving TE";
    if (depthRank <= 2) return "Secondary TE / matchup depth";
    return "Depth TE";
  }
  if (player.position === "RB") {
    if (depthRank <= 1) return "Lead back / primary fantasy option";
    if (depthRank <= 2) return "Committee back or high-value handcuff";
    if (depthRank <= 3) return "Depth back with injury-contingent upside";
    return "Backfield depth";
  }
  if (player.position === "WR") {
    if (depthRank <= 1) return "Primary WR option";
    if (depthRank <= 2) return "Top-two WR / weekly starter profile";
    if (depthRank <= 3) return "Starting WR / flex profile";
    return "Depth WR / spike-week profile";
  }
  return "Depth chart role";
}

function inferredSummary(player, depthRank, teammates) {
  const rank = Math.round(player.consensusRank || player.rank || 999);
  const competition = teammates.slice(0, 3).map((mate) => mate.name).join(", ");
  const role = inferredDepthRole(player, depthRank).toLowerCase();
  const teamText = player.team && player.team !== "FA" ? `for ${player.team}` : "with uncertain team context";
  const marketText = rank <= 36
    ? "market values him as an early core pick"
    : rank <= 96
      ? "market views him as a starter or high-leverage depth piece"
      : "market treats him as a later-round depth or upside option";
  const competitionText = competition ? ` Key same-position competition: ${competition}.` : "";
  return `${player.name} profiles as the ${role} ${teamText}; ${marketText}.${competitionText}`;
}

function enrichPlayerContext(players) {
  const grouped = new Map();
  players.forEach((player) => {
    const key = `${player.team}-${player.position}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(player);
  });
  grouped.forEach((group) => group.sort((a, b) => a.consensusRank - b.consensusRank));
  return players.map((player) => {
    const group = grouped.get(`${player.team}-${player.position}`) || [player];
    const inferredRank = group.findIndex((candidate) => candidate.id === player.id) + 1 || 1;
    const depthRank = player.depthChartRank || inferredRank;
    const teammates = group.filter((candidate) => candidate.id !== player.id);
    const aiAnalysis = inferredSummary(player, depthRank, teammates);
    return {
      ...player,
      depthChartRank: depthRank,
      depthChartRole: player.depthChartRole || inferredDepthRole(player, depthRank),
      competition: player.competition || teammates.slice(0, 3).map((mate) => mate.name).join(", "),
      aiAnalysis,
      summary: aiAnalysis,
      contextSource: "Derived from rankings",
    };
  });
}

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      current.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (field || current.length) rows.push([...current, field.trim()]);
      current = [];
      field = "";
      if (char === "\r" && next === "\n") i += 1;
    } else {
      field += char;
    }
  }
  if (field || current.length) rows.push([...current, field.trim()]);
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => headers.reduce((record, header, index) => {
      record[header] = row[index];
      return record;
    }, {}));
}

function parseRankingFile(text, fileName) {
  const sourceName = fileName.replace(/\.(csv|json)$/i, "").replace(/[-_]+/g, " ");
  if (/\.json$/i.test(fileName) || text.trim().startsWith("{") || text.trim().startsWith("[")) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.rankings || parsed.players || [];
    const source = parsed.source || parsed.name || sourceName;
    return rows.map((row) => normalizeImportedRow(row, source)).filter(Boolean);
  }
  return parseCsv(text).map((row) => normalizeImportedRow(row, sourceName)).filter(Boolean);
}

function rebuildConsensusPlayers(importedRows = []) {
  const byId = new Map();

  if (state.seedRankingsEnabled) {
    BASE_PLAYERS.forEach((player) => {
      byId.set(player.id, {
        ...player,
        sourceRanks: state.seedRankingsEnabled ? { "Built-in Public Seed": player.rank } : {},
        importedAdps: [player.adp],
        importedKeeperValues: [],
        importedSummaries: [],
        importedContext: {},
      });
    });
  }

  importedRows.forEach((row) => {
    const existing = byId.get(row.id) || {
      id: row.id,
      name: row.name,
      position: row.position || "WR",
      team: row.team || "FA",
      rank: row.rank || row.adp || 999,
      consensusRank: row.rank || row.adp || 999,
      adp: row.adp || 999,
      sourceRanks: {},
      importedAdps: [],
      importedKeeperValues: [],
      importedSummaries: [],
      importedContext: {},
    };
    existing.name = existing.name || row.name;
    existing.position = row.position || existing.position;
    existing.team = row.team || existing.team;
    if (Number.isFinite(row.rank)) existing.sourceRanks[row.source] = row.rank;
    if (Number.isFinite(row.adp)) existing.importedAdps.push(row.adp);
    if (!Number.isFinite(row.rank) && Number.isFinite(row.adp)) existing.sourceRanks[`${row.source} ADP`] = row.adp;
    if (Number.isFinite(row.projection) && !Number.isFinite(row.rank)) existing.sourceRanks[row.source] = Math.max(1, 350 - row.projection);
    if (Number.isFinite(row.keeperValue)) existing.importedKeeperValues.push(row.keeperValue);
    if (row.summary) existing.importedSummaries.push({ source: row.source, text: row.summary });
    ["depthChartRole", "competition", "injuryNote", "teamContext", "upsideNote", "riskNote"].forEach((key) => {
      if (row[key]) existing.importedContext[key] = row[key];
    });
    if (Number.isFinite(row.depthChartRank)) existing.importedContext.depthChartRank = row.depthChartRank;
    byId.set(row.id, existing);
  });

  PLAYERS = enrichPlayerContext([...byId.values()].map((player) => {
    const ranks = Object.values(player.sourceRanks);
    const sourceNames = Object.keys(player.sourceRanks);
    const consensusRank = median(ranks) || player.rank || player.adp || 999;
    const adp = median(player.importedAdps) || player.adp || consensusRank;
    const keeperValue = median(player.importedKeeperValues) || player.keeperValue || 0;
    const sourceSummary = player.importedSummaries?.[0] || null;
    return {
      ...player,
      ...player.importedContext,
      rank: consensusRank,
      consensusRank,
      adp,
      keeperValue,
      sourceSummary: sourceSummary?.text || "",
      sourceSummarySource: sourceSummary?.source || "",
      sourceCount: ranks.length,
      sourceNames,
      tier: Math.ceil(consensusRank / 12),
    };
  }).sort((a, b) => a.consensusRank - b.consensusRank));
}

function saveRankingState() {
  try {
    localStorage.setItem("fantasyDraftLabRankingRows", JSON.stringify(state.importedRankingRows));
    localStorage.setItem("fantasyDraftLabRankingSources", JSON.stringify(state.rankingSources.filter((source) => source.name !== SEED_SOURCE.name)));
    localStorage.setItem("fantasyDraftLabSeedRankingsEnabled", JSON.stringify(state.seedRankingsEnabled));
  } catch {
    $("importStatus").textContent = "Rankings imported, but this browser blocked local saving.";
  }
}

function loadRankingState() {
  try {
    const rows = JSON.parse(localStorage.getItem("fantasyDraftLabRankingRows") || "[]");
    const sources = JSON.parse(localStorage.getItem("fantasyDraftLabRankingSources") || "[]");
    const seedSaved = localStorage.getItem("fantasyDraftLabSeedRankingsEnabled");
    state.seedRankingsEnabled = seedSaved === null ? true : JSON.parse(seedSaved);
    state.importedRankingRows = Array.isArray(rows) ? rows : [];
    state.rankingSources = [
      ...(state.seedRankingsEnabled ? [{ ...SEED_SOURCE }] : []),
      ...(Array.isArray(sources) ? sources : []),
    ];
    rebuildConsensusPlayers(state.importedRankingRows);
  } catch {
    state.importedRankingRows = [];
    state.seedRankingsEnabled = true;
    state.rankingSources = [{ ...SEED_SOURCE }];
    rebuildConsensusPlayers([]);
  }
}

function savePersonaState() {
  saveActiveLeagueProfile();
}

function loadPersonaState() {
  try {
    const saved = activeLeagueProfile().teamPersonas || [];
    if (Array.isArray(saved) && saved.length === LEAGUE.teams) state.teamPersonas = saved;
  } catch {
    state.teamPersonas = defaultTeamPersonas();
  }
}

function compactPick(pick) {
  return {
    pick: pick.pick,
    round: pick.round,
    index: pick.index,
    team: pick.team,
    label: pick.label,
    player: {
      id: pick.player.id,
      name: pick.player.name,
      position: pick.player.position,
      team: pick.player.team,
      consensusRank: pick.player.consensusRank,
      adp: pick.player.adp,
      tier: pick.player.tier,
    },
    keeper: Boolean(pick.keeper),
  };
}

function draftFingerprint(picks) {
  return picks.map((pick) => `${pick.pick}:${pick.team}:${pick.player.id}`).join("|");
}

function saveDraftHistory() {
  try {
    localStorage.setItem("fantasyDraftLabCompletedDrafts", JSON.stringify(state.completedDrafts));
  } catch {
    // Completed drafts still remain available until the page is refreshed.
  }
}

function loadDraftHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("fantasyDraftLabCompletedDrafts") || "[]");
    if (Array.isArray(saved)) state.completedDrafts = saved;
  } catch {
    state.completedDrafts = [];
  }
}

function rosterSummaryForDraft(draft) {
  const roster = draft.picks.filter((pick) => pick.team === draft.userTeam).map((pick) => pick.player);
  const counts = positionCounts(roster);
  return ["QB", "RB", "WR", "TE", "K", "DEF"]
    .filter((pos) => counts[pos])
    .map((pos) => `${pos}${counts[pos]}`)
    .join(" ");
}

function saveCompletedDraft() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick <= total || state.picks.length !== total) return null;
  const fingerprint = draftFingerprint(state.picks);
  const draftNumber = state.completedDrafts.length + 1;
  const draft = {
    id: `draft-${Date.now()}`,
    name: `Mock Draft ${draftNumber}`,
    createdAt: new Date().toISOString(),
    league: structuredClone(LEAGUE),
    userTeam: state.userTeam,
    teamNames: [...state.teamNames],
    keeperSelections: state.keeperSelections.map((selection) => ({ ...selection })),
    strategy: state.strategy,
    draftMode: state.draftMode,
    roundOrders: state.roundOrders.map((round) => [...round]),
    teamPersonas: [...state.teamPersonas],
    rankingSources: state.rankingSources.map((source) => ({ name: source.name, rows: source.rows, status: source.status })),
    picks: state.picks.map(compactPick),
    notes: "",
    fingerprint,
  };
  state.completedDrafts = [draft, ...state.completedDrafts].slice(0, 30);
  saveDraftHistory();
  return draft;
}

function activePicks() {
  const viewed = activeDraft();
  return viewed ? viewed.picks : state.picks;
}

function activeUserTeam() {
  const viewed = activeDraft();
  return viewed ? viewed.userTeam : state.userTeam;
}

function activeRosterFor(team) {
  return activePicks().filter((pick) => pick.team === team).map((pick) => pick.player);
}

function projectionForPlayer(player) {
  const rank = Number.isFinite(player.consensusRank) ? player.consensusRank : player.rank || 220;
  const positionRank = PLAYERS
    .filter((candidate) => candidate.position === player.position)
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .findIndex((candidate) => candidate.id === player.id) + 1;
  const positionalIndex = positionRank > 0 ? positionRank : Math.max(1, Math.round(rank / 3));
  const base = { QB: 23, RB: 18, WR: 17, TE: 14, K: 8, DEF: 8 }[player.position] || 10;
  const decay = { QB: 0.34, RB: 0.28, WR: 0.24, TE: 0.22, K: 0.04, DEF: 0.04 }[player.position] || 0.15;
  return Math.max(4, base - positionalIndex * decay + scoringProjectionBonus(player));
}

function scoringProjectionBonus(player) {
  const league = activeLeague();
  if (league.scoring === "PPR" && ["WR", "TE", "RB"].includes(player.position)) return player.position === "WR" ? 1.2 : 0.8;
  if (league.scoring === "Half-PPR" && ["WR", "TE", "RB"].includes(player.position)) return player.position === "WR" ? 0.6 : 0.4;
  if (league.scoring === "TE Premium" && player.position === "TE") return 2.2;
  if (league.scoring === "Standard" && player.position === "RB") return 0.8;
  return 0;
}

function scoringRankBonus(player) {
  const league = activeLeague();
  if (league.scoring === "PPR" && player.position === "WR") return 6;
  if (league.scoring === "PPR" && player.position === "TE") return 4;
  if (league.scoring === "Half-PPR" && player.position === "WR") return 3;
  if (league.scoring === "TE Premium" && player.position === "TE") return 12;
  if (league.scoring === "Standard" && player.position === "RB") return 5;
  return 0;
}

function bestLineupForRoster(roster) {
  const league = activeLeague();
  const enriched = roster.map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) }));
  const byPosition = (pos) => enriched
    .filter((player) => player.position === pos)
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection);
  const lineup = [];
  lineup.push(...byPosition("QB").slice(0, league.roster.QB));
  lineup.push(...byPosition("RB").slice(0, league.roster.RB));
  lineup.push(...byPosition("WR").slice(0, league.roster.WR));
  lineup.push(...byPosition("TE").slice(0, league.roster.TE));
  const used = new Set(lineup.map((player) => player.id));
  const flex = enriched
    .filter((player) => ["RB", "WR", "TE"].includes(player.position) && !used.has(player.id))
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection)
    .slice(0, league.roster.FLEX);
  lineup.push(...flex);
  lineup.push(...byPosition("K").slice(0, league.roster.K));
  lineup.push(...byPosition("DEF").slice(0, league.roster.DEF));
  return lineup;
}

function fullRosterRows(roster, lineup) {
  const starterIds = new Set(lineup.map((player) => player.id));
  const enriched = roster.map((player) => ({
    ...player,
    weeklyProjection: projectionForPlayer(player),
    rosterSlot: starterIds.has(player.id) ? "Starter" : "Bench",
  }));
  const slotOrder = { Starter: 0, Bench: 1 };
  const positionOrder = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5 };
  return enriched.sort((a, b) => {
    if (slotOrder[a.rosterSlot] !== slotOrder[b.rosterSlot]) return slotOrder[a.rosterSlot] - slotOrder[b.rosterSlot];
    if ((positionOrder[a.position] ?? 9) !== (positionOrder[b.position] ?? 9)) return (positionOrder[a.position] ?? 9) - (positionOrder[b.position] ?? 9);
    return b.weeklyProjection - a.weeklyProjection;
  });
}

function positionProjection(roster, position, starters) {
  return roster
    .filter((player) => player.position === position)
    .map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) }))
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection)
    .slice(0, starters)
    .reduce((sum, player) => sum + player.weeklyProjection, 0);
}

function flexProjection(roster) {
  const eligible = roster
    .filter((player) => ["RB", "WR", "TE"].includes(player.position))
    .map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) }))
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection);
  return eligible.slice(0, 7).reduce((sum, player, index) => {
    const weight = index < 6 ? 0.45 : 1;
    return sum + player.weeklyProjection * weight;
  }, 0);
}

function positionalTeamScores(picks = activePicks()) {
  const league = activeLeague();
  const configs = [
    { key: "QB", label: "QB", starters: league.roster.QB },
    { key: "RB", label: "RB", starters: league.roster.RB },
    { key: "WR", label: "WR", starters: league.roster.WR },
    { key: "TE", label: "TE", starters: league.roster.TE },
    { key: "FLEX", label: "Flex Depth", starters: league.roster.FLEX },
    { key: "K", label: "K", starters: league.roster.K },
    { key: "DEF", label: "DEF", starters: league.roster.DEF },
  ];
  const scores = {};
  configs.forEach((config) => {
    const rows = Array.from({ length: league.teams }, (_, index) => {
      const team = index + 1;
      const roster = picks.filter((pick) => pick.team === team).map((pick) => pick.player);
      const score = config.key === "FLEX"
        ? flexProjection(roster)
        : positionProjection(roster, config.key, config.starters);
      const topPlayers = roster
        .filter((player) => config.key === "FLEX" ? ["RB", "WR", "TE"].includes(player.position) : player.position === config.key)
        .map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) }))
        .sort((a, b) => b.weeklyProjection - a.weeklyProjection)
        .slice(0, config.key === "FLEX" ? 4 : config.starters);
      return { team, score, topPlayers };
    }).sort((a, b) => b.score - a.score);
    scores[config.key] = rows.map((row, index) => ({ ...row, rank: index + 1, label: config.label }));
  });
  return scores;
}

function selectedPositionSummary(team, positionScores) {
  const rows = Object.entries(positionScores).map(([key, teams]) => {
    const teamRow = teams.find((row) => row.team === team);
    const leader = teams[0];
    return { key, ...teamRow, leader };
  });
  const best = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 2);
  const worst = [...rows].sort((a, b) => b.rank - a.rank).slice(0, 2);
  return { rows, best, worst };
}

function draftPickValueForTeam(team, picks = activePicks()) {
  const teamPicks = picks.filter((pick) => pick.team === team);
  if (!teamPicks.length) return 0;
  const total = teamPicks.reduce((sum, pick) => {
    const expected = pick.pick;
    const rank = pick.player.consensusRank || pick.player.rank || pick.player.adp || expected;
    return sum + Math.max(-20, Math.min(20, expected - rank));
  }, 0);
  return total / teamPicks.length;
}

function playerRankAtDraft(player) {
  return Number.isFinite(player.consensusRank) ? player.consensusRank : player.rank || player.adp || 999;
}

function availableAtPick(pickNumber, picks) {
  const draftedBefore = new Set(picks.filter((pick) => pick.pick < pickNumber).map((pick) => pick.player.id));
  const draftedPlayersById = new Map(picks.map((pick) => [pick.player.id, pick.player]));
  const allPlayers = new Map(PLAYERS.map((player) => [player.id, player]));
  draftedPlayersById.forEach((player, id) => {
    if (!allPlayers.has(id)) allPlayers.set(id, player);
  });
  return [...allPlayers.values()]
    .filter((player) => !draftedBefore.has(player.id))
    .sort((a, b) => playerRankAtDraft(a) - playerRankAtDraft(b));
}

function pickAnalysisForTeam(team, picks = activePicks()) {
  return picks
    .filter((pick) => pick.team === team)
    .map((pick) => {
      const available = availableAtPick(pick.pick, picks);
      const selectedRank = playerRankAtDraft(pick.player);
      const alternatives = available
        .filter((player) => player.id !== pick.player.id)
        .slice(0, 5);
      const bestAlternative = alternatives[0];
      const bestAlternativeRank = bestAlternative ? playerRankAtDraft(bestAlternative) : selectedRank;
      const pickValue = Math.max(-50, Math.min(50, pick.pick - selectedRank));
      const opportunityCost = Math.max(-50, Math.min(50, selectedRank - bestAlternativeRank));
      const samePositionAlternative = alternatives.find((player) => player.position === pick.player.position);
      let label = "Fair value";
      if (pickValue >= 12) label = "Strong value";
      if (pickValue <= -12 || opportunityCost >= 18) label = "Reach";
      if (pickValue >= 6 && opportunityCost <= 8) label = "Good pick";
      return {
        ...pick,
        selectedRank,
        pickValue,
        opportunityCost,
        bestAlternative,
        samePositionAlternative,
        alternatives,
        label,
      };
    });
}

function pickInsightText(pick) {
  const selected = `${pick.player.name} (${pick.player.position})`;
  if (pick.label === "Strong value") {
    return `${selected} was a strong value at pick ${pick.pick}; his board rank was about ${Math.round(pick.selectedRank)}, well ahead of the draft slot.`;
  }
  if (pick.label === "Reach") {
    const alt = pick.bestAlternative ? ` ${pick.bestAlternative.name} was still available and ranked higher.` : "";
    return `${selected} was aggressive for this slot versus consensus rank.${alt}`;
  }
  if (pick.samePositionAlternative && pick.samePositionAlternative.id !== pick.player.id) {
    return `${selected} fit the build, with ${pick.samePositionAlternative.name} as the nearest same-position alternative.`;
  }
  return `${selected} was a reasonable board pick at that point in the draft.`;
}

function rosterBalanceScore(roster) {
  const league = activeLeague();
  const counts = positionCounts(roster);
  let score = 0;
  if ((counts.QB || 0) >= league.roster.QB) score += 5;
  if ((counts.RB || 0) >= league.roster.RB + 2) score += 12;
  if ((counts.WR || 0) >= league.roster.WR + 2) score += 12;
  if ((counts.TE || 0) >= league.roster.TE) score += 5;
  if ((counts.RB || 0) < league.roster.RB + 1) score -= 10;
  if ((counts.WR || 0) < league.roster.WR + 1) score -= 10;
  if ((counts.QB || 0) > league.roster.QB + 1) score -= 4;
  if ((counts.TE || 0) > league.roster.TE + 1) score -= 3;
  if (league.ensureCompleteRoster !== false) {
    const missing = requiredRosterOpenCount(roster, league);
    if (missing) score -= missing * 8;
  }
  return score;
}

function gradeFromRank(rank) {
  if (rank === 1) return "A+";
  if (rank <= 2) return "A";
  if (rank <= 3) return "A-";
  if (rank <= 4) return "B+";
  if (rank <= 6) return "B";
  if (rank <= 8) return "C+";
  if (rank <= 10) return "C";
  if (rank <= 11) return "D";
  return "F";
}

function analyzeTeam(team, picks = activePicks()) {
  const roster = picks.filter((pick) => pick.team === team).map((pick) => pick.player);
  const pickBreakdown = pickAnalysisForTeam(team, picks);
  const lineup = bestLineupForRoster(roster);
  const weeklyProjection = lineup.reduce((sum, player) => sum + player.weeklyProjection, 0);
  const value = draftPickValueForTeam(team, picks);
  const balance = rosterBalanceScore(roster);
  const score = weeklyProjection + value * 0.45 + balance * 0.12;
  const counts = positionCounts(roster);
  const strengths = [];
  const weaknesses = [];
  if ((counts.WR || 0) >= 6) strengths.push("Deep WR room for a 3-WR format");
  if ((counts.RB || 0) >= 5) strengths.push("Strong RB depth and injury insulation");
  if (lineup.some((player) => player.position === "QB" && player.weeklyProjection >= 20)) strengths.push("High-end QB scoring profile");
  if (lineup.some((player) => player.position === "TE" && player.weeklyProjection >= 12)) strengths.push("TE advantage in weekly lineup");
  if (value > 3) strengths.push("Positive draft value versus market");
  if ((counts.RB || 0) < 3) weaknesses.push("Thin RB depth");
  if ((counts.WR || 0) < 4) weaknesses.push("Thin WR depth for this league format");
  if (!(counts.QB || 0)) weaknesses.push("No starting QB drafted");
  if (!(counts.TE || 0)) weaknesses.push("No starting TE drafted");
  if (value < -4) weaknesses.push("Paid above market on too many picks");
  const bestValues = [...pickBreakdown].sort((a, b) => b.pickValue - a.pickValue).slice(0, 3);
  const biggestReaches = [...pickBreakdown]
    .filter((pick) => pick.pickValue < -4 || pick.opportunityCost > 12)
    .sort((a, b) => (b.opportunityCost - b.pickValue) - (a.opportunityCost - a.pickValue))
    .slice(0, 3);
  const missedAlternatives = pickBreakdown
    .filter((pick) => pick.bestAlternative && pick.opportunityCost >= 10)
    .slice(0, 4);
  const gradeDrivers = [];
  if (bestValues[0]) gradeDrivers.push(`Best value: ${bestValues[0].player.name} at ${bestValues[0].label}.`);
  if (biggestReaches[0]) gradeDrivers.push(`Biggest cost: ${biggestReaches[0].player.name} came ahead of stronger available board options.`);
  if (weeklyProjection >= 118) gradeDrivers.push("Projected starting lineup is one of the room's strongest.");
  if (balance < 0) gradeDrivers.push("Roster construction pulled the grade down.");
  if (!strengths.length) strengths.push("Balanced roster without one glaring build flaw");
  if (!weaknesses.length) weaknesses.push("No major structural weakness");
  return {
    team,
    roster,
    lineup,
    weeklyProjection,
    value,
    balance,
    score,
    strengths,
    weaknesses,
    pickBreakdown,
    bestValues,
    biggestReaches,
    missedAlternatives,
    gradeDrivers,
  };
}

function allTeamAnalyses() {
  const picks = activePicks();
  const analyses = Array.from({ length: activeLeague().teams }, (_, index) => analyzeTeam(index + 1, picks))
    .sort((a, b) => b.score - a.score);
  const scores = analyses.map((team) => team.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return analyses.map((analysis, index) => {
    const spread = max - min || 1;
    const normalized = (analysis.score - min) / spread;
    return {
      ...analysis,
      rank: index + 1,
      grade: gradeFromRank(index + 1),
      playoffOdds: Math.round(18 + normalized * 64),
    };
  });
}

function availablePlayers() {
  return PLAYERS.filter((p) => !state.draftedIds.has(p.id));
}

function rosterFor(team) {
  return state.picks.filter((pick) => pick.team === team).map((pick) => pick.player);
}

function positionCounts(players) {
  return players.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {});
}

function requiredRosterOpenCount(roster, league = LEAGUE) {
  const counts = positionCounts(roster);
  const skillNeed = (league.roster.RB || 0) + (league.roster.WR || 0) + (league.roster.TE || 0) + (league.roster.FLEX || 0);
  const skillCount = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  const directSkillOpen = Math.max(0, (league.roster.RB || 0) - (counts.RB || 0))
    + Math.max(0, (league.roster.WR || 0) - (counts.WR || 0))
    + Math.max(0, (league.roster.TE || 0) - (counts.TE || 0));
  const skillOpen = Math.max(directSkillOpen, Math.max(0, skillNeed - skillCount));
  return Math.max(0, (league.roster.QB || 0) - (counts.QB || 0))
    + skillOpen
    + Math.max(0, (league.roster.K || 0) - (counts.K || 0))
    + Math.max(0, (league.roster.DEF || 0) - (counts.DEF || 0));
}

function fillsRequiredRosterSlot(player, roster, league = LEAGUE) {
  const counts = positionCounts(roster);
  if (["QB", "K", "DEF"].includes(player.position)) {
    return (counts[player.position] || 0) < (league.roster[player.position] || 0);
  }
  if (!["RB", "WR", "TE"].includes(player.position)) return false;
  if ((counts[player.position] || 0) < (league.roster[player.position] || 0)) return true;
  const skillNeed = (league.roster.RB || 0) + (league.roster.WR || 0) + (league.roster.TE || 0) + (league.roster.FLEX || 0);
  const skillCount = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  return skillCount < skillNeed;
}

function rosterCompletionAdjustment(player, team, pickNumber, roster = rosterFor(team)) {
  if (LEAGUE.ensureCompleteRoster === false) return 0;
  const openRequiredSlots = requiredRosterOpenCount(roster);
  if (!openRequiredSlots) return 0;
  const picksLeft = picksRemainingForTeam(team, pickNumber);
  const fillsNeed = fillsRequiredRosterSlot(player, roster);
  if (picksLeft <= openRequiredSlots) return fillsNeed ? -220 : 620;
  if (picksLeft === openRequiredSlots + 1) return fillsNeed ? -90 : 170;
  if (picksLeft === openRequiredSlots + 2) return fillsNeed ? -35 : 45;
  return 0;
}

function starterNeedScore(player, roster) {
  const counts = positionCounts(roster);
  if (player.position === "QB") return (counts.QB || 0) >= LEAGUE.roster.QB ? 6 : -7;
  if (player.position === "TE") return (counts.TE || 0) >= LEAGUE.roster.TE ? 2 : -5;
  if (player.position === "RB") return (counts.RB || 0) < LEAGUE.roster.RB ? -8 : (counts.RB || 0) < LEAGUE.roster.RB + LEAGUE.roster.FLEX + 1 ? -2 : 4;
  if (player.position === "WR") return (counts.WR || 0) < LEAGUE.roster.WR ? -8 : (counts.WR || 0) < LEAGUE.roster.WR + LEAGUE.roster.FLEX + 1 ? -3 : 3;
  if (player.position === "K" || player.position === "DEF") return roster.length < Math.max(1, LEAGUE.rounds - 3) ? 24 : 0;
  return 0;
}

function picksRemainingForTeam(team, fromPick = state.currentPick) {
  let count = 0;
  for (let pick = fromPick; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    if (draftOrderFor(pick).team === team) count += 1;
  }
  return count;
}

function picksUntilNextForTeam(team, fromPick = state.currentPick) {
  for (let pick = fromPick + 1; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    if (draftOrderFor(pick).team === team) return pick - fromPick;
  }
  return 999;
}

function positionalDropoffScore(player) {
  const positionPool = availablePlayers()
    .filter((candidate) => candidate.position === player.position)
    .sort((a, b) => a.consensusRank - b.consensusRank);
  const index = positionPool.findIndex((candidate) => candidate.id === player.id);
  if (index < 0) return 0;
  const nextSimilar = positionPool[index + 1];
  const nextTier = positionPool[index + 3];
  const immediateGap = nextSimilar ? nextSimilar.consensusRank - player.consensusRank : 10;
  const tierGap = nextTier ? nextTier.consensusRank - player.consensusRank : immediateGap;
  return -Math.min(12, Math.max(0, immediateGap * 0.7 + tierGap * 0.25));
}

function rosterPressureScore(player, team, pickNumber) {
  const roster = rosterFor(team);
  const counts = positionCounts(roster);
  const picksLeft = picksRemainingForTeam(team, pickNumber);
  const nextGap = picksUntilNextForTeam(team, pickNumber);
  let score = 0;
  const openStarters = Math.max(0, LEAGUE.roster.QB - (counts.QB || 0))
    + Math.max(0, LEAGUE.roster.RB - (counts.RB || 0))
    + Math.max(0, LEAGUE.roster.WR - (counts.WR || 0))
    + Math.max(0, LEAGUE.roster.TE - (counts.TE || 0));
  if (picksLeft <= openStarters + 2 && ["QB", "RB", "WR", "TE"].includes(player.position)) score -= 4;
  if (nextGap >= 18 && ["RB", "WR", "TE"].includes(player.position)) score += positionalDropoffScore(player);
  if ((player.position === "K" || player.position === "DEF") && picksLeft > 3) score += 14;
  return score;
}

function candidatePoolForTeam(team, pickNumber, limit) {
  const base = availablePlayers().slice(0, limit);
  if (LEAGUE.ensureCompleteRoster === false) return base;
  const roster = rosterFor(team);
  if (!requiredRosterOpenCount(roster)) return base;
  const needed = ["QB", "RB", "WR", "TE", "K", "DEF"]
      .filter((position) => fillsRequiredRosterSlot({ position }, roster))
    .flatMap((position) => availablePlayers().filter((player) => player.position === position).slice(0, 4));
  const merged = new Map();
  [...base, ...needed].forEach((player) => merged.set(player.id, player));
  return [...merged.values()];
}

function strategyScore(player, roster, pickNumber, strategy) {
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  let score = 0;

  if (strategy === "heroRB") {
    if (player.position === "RB" && !counts.RB) score -= 10;
    if (player.position === "RB" && counts.RB && round <= 5) score += 7;
    if (player.position === "WR" && round <= 6) score -= 3;
  }
  if (strategy === "zeroRB") {
    if (player.position === "RB" && round <= 5) score += 13;
    if ((player.position === "WR" || player.position === "TE") && round <= 5) score -= 5;
    if (player.position === "RB" && round >= 6) score -= 5;
  }
  if (strategy === "robustRB") {
    if (player.position === "RB" && round <= 5) score -= 9;
    if (player.position === "WR" && (counts.WR || 0) >= 2 && round <= 5) score += 3;
  }
  if (strategy === "eliteQBTE") {
    if ((player.position === "QB" || player.position === "TE") && round <= 5) score -= 12;
    if ((player.position === "QB" && counts.QB) || (player.position === "TE" && counts.TE)) score += 22;
  }
  if (strategy === "wrHeavy") {
    if (player.position === "WR" && round <= 7) score -= 8;
    if (player.position === "RB" && (counts.RB || 0) >= 1 && round <= 5) score += 4;
  }
  if (strategy === "upside") {
    if (isYoungUpsidePlayer(player)) score -= round <= 10 ? 7 : 4;
    if (player.consensusRank <= 60 && !isYoungUpsidePlayer(player)) score += 1;
  }
  if (strategy === "safeFloor") {
    if (isYoungUpsidePlayer(player) && round <= 8) score += 5;
    if (isRecognizableName(player) && round <= 10) score -= 3;
    if ((player.position === "RB" || player.position === "WR") && (counts[player.position] || 0) < (LEAGUE.roster[player.position] || 0)) score -= 3;
  }

  return score;
}

function personaStrategyScore(player, roster, pickNumber, persona) {
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  const style = persona.strategyStyle;
  let score = 0;
  if (style === "Zero RB") {
    if (player.position === "RB" && round <= 5) score += 18;
    if (["WR", "TE", "QB"].includes(player.position) && round <= 5) score -= 7;
    if (player.position === "RB" && round >= 6) score -= 6;
  }
  if (style === "Hero RB") {
    if (player.position === "RB" && !counts.RB && round <= 3) score -= 14;
    if (player.position === "RB" && counts.RB && round <= 6) score += 8;
    if (player.position === "WR" && counts.RB && round <= 7) score -= 5;
  }
  if (style === "Robust RB") {
    if (player.position === "RB" && round <= 6) score -= 12;
    if (player.position === "WR" && (counts.WR || 0) >= 2 && round <= 5) score += 4;
  }
  if (style === "WR Heavy") {
    if (player.position === "WR" && round <= 8) score -= 10;
    if (player.position === "RB" && round <= 5) score += 4;
  }
  if (style === "Elite QB") {
    if (player.position === "QB" && !counts.QB && round <= 5) score -= 18;
    if (player.position === "QB" && counts.QB) score += 30;
  }
  if (style === "Elite TE") {
    if (player.position === "TE" && !counts.TE && round <= 5) score -= 16;
    if (player.position === "TE" && counts.TE) score += 28;
  }
  if (style === "Upside") {
    if (isYoungUpsidePlayer(player)) score -= 8;
  }
  if (style === "Bias Driven") {
    if (isRecognizableName(player)) score -= 8;
  }
  return score;
}

function personaNeedMultiplier(persona, pickNumber) {
  const round = draftOrderFor(pickNumber).round;
  const base = intensity(persona.teamNeedWeight);
  const roundRamp = round <= 3 ? 0.45 : round <= 8 ? 0.85 : 1.15;
  return base * roundRamp;
}

function personaAdpGuard(player, pickNumber, persona) {
  const discipline = intensity(persona.adpDiscipline);
  if (!Number.isFinite(player.adp)) return 0;
  const valuePastAdp = pickNumber - player.adp;
  if (valuePastAdp > 0) return -Math.min(36, valuePastAdp * discipline * 1.15);
  return Math.min(42, Math.abs(valuePastAdp) * discipline * 1.05);
}

function personaUpsideScore(player, persona) {
  const upside = intensity(persona.upsidePreference);
  const rookie = intensity(persona.rookieValue);
  let score = 0;
  if (isYoungUpsidePlayer(player)) score -= upside * 3 + rookie * 2;
  if (persona.upsidePreference === "Low" && isYoungUpsidePlayer(player)) score += 8;
  if (isRecognizableName(player) && persona.experienceLevel.includes("Beginner")) score -= 4;
  return score;
}

function personaPositionScore(player, persona) {
  if (persona.positionalAggression === "Balanced") return 0;
  return player.position === persona.positionalAggression ? -10 : 2;
}

function personaOnesieScore(player, roster, pickNumber, persona) {
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  if (!["QB", "TE", "K", "DEF"].includes(player.position)) return 0;
  if (player.position === "QB" && counts.QB) return 26;
  if (player.position === "TE" && counts.TE) return 24;
  if (["K", "DEF"].includes(player.position)) {
    if (round < 12 && persona.experienceLevel.includes("Beginner") && persona.teamNeedWeight === "High") return 8;
    return round < 14 ? 34 : 4;
  }
  if (round <= 4 && persona.strategyStyle !== "Elite QB" && persona.strategyStyle !== "Elite TE") {
    return persona.experienceLevel === "Expert" ? 10 : 4;
  }
  return 0;
}

function rosterRealismScore(player, roster, pickNumber, persona) {
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  const count = counts[player.position] || 0;
  const starters = LEAGUE.roster[player.position] || 0;
  const style = persona.strategyStyle;
  let score = 0;

  if (player.position === "QB") {
    if (count >= starters + 1) return 180;
    if (count >= starters) {
      const eliteBias = style === "Elite QB" ? -12 : 0;
      score += (round <= 9 ? 95 : 48) + eliteBias;
    }
  }

  if (player.position === "TE") {
    if (count >= starters + 1) return 150;
    if (count >= starters) {
      const eliteBias = style === "Elite TE" ? -10 : 0;
      score += (round <= 9 ? 80 : 36) + eliteBias;
    }
  }

  if (player.position === "K" || player.position === "DEF") {
    if (count >= Math.max(1, starters)) return 160;
    if (round <= LEAGUE.rounds - 2) score += persona.experienceLevel === "Beginner" ? 34 : 62;
  }

  if (player.position === "RB") {
    const cap = Math.max(5, LEAGUE.roster.RB + LEAGUE.roster.FLEX + 3 + (style === "Robust RB" ? 1 : 0));
    if (count >= cap) score += 45 + (count - cap + 1) * 26;
  }

  if (player.position === "WR") {
    const cap = Math.max(6, LEAGUE.roster.WR + LEAGUE.roster.FLEX + 3 + (style === "WR Heavy" ? 1 : 0));
    if (count >= cap) score += 38 + (count - cap + 1) * 22;
  }

  return score;
}

function draftVarianceScore(player, team, pickNumber, persona) {
  const volatility = intensity(persona.reachFrequency);
  const seed = state.mockSeed || 1;
  const wave = Math.sin(seed + pickNumber * 12.9898 + team * 78.233 + player.consensusRank * 0.37);
  return wave * volatility * 2.4;
}

function marketValueFloorScore(player, pickNumber) {
  if (!Number.isFinite(player.adp)) return 0;
  const valuePastAdp = pickNumber - player.adp;
  if (player.adp <= 12 && valuePastAdp >= 6) return -28;
  if (player.adp <= 24 && valuePastAdp >= 10) return -18;
  return 0;
}

function personaCandidateLimit(persona) {
  const reach = intensity(persona.reachFrequency);
  const discipline = intensity(persona.adpDiscipline);
  const experienceCap = persona.experienceLevel === "Expert" ? -6 : persona.experienceLevel === "Beginner" ? 8 : 0;
  return Math.max(18, Math.min(48, Math.round(24 + reach * 6 - discipline * 2 + experienceCap)));
}

function personaDraftScore(player, team, pickNumber, persona) {
  const roster = rosterFor(team);
  const need = starterNeedScore(player, roster) * personaNeedMultiplier(persona, pickNumber);
  const scarcity = rosterPressureScore(player, team, pickNumber) * 0.7;
  const expertGuard = persona.experienceLevel === "Expert" && Number.isFinite(player.adp) && player.adp - pickNumber > 18 ? 18 : 0;
  return player.consensusRank
    + rosterCompletionAdjustment(player, team, pickNumber, roster)
    + personaAdpGuard(player, pickNumber, persona)
    + need
    + scarcity
    + personaStrategyScore(player, roster, pickNumber, persona)
    + personaUpsideScore(player, persona)
    + personaPositionScore(player, persona)
    + personaOnesieScore(player, roster, pickNumber, persona)
    + rosterRealismScore(player, roster, pickNumber, persona)
    + marketValueFloorScore(player, pickNumber)
    + expertGuard
    + draftVarianceScore(player, team, pickNumber, persona);
}

function recommendationRosterPenalty(player, roster, pickNumber, strategy) {
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  const count = counts[player.position] || 0;
  const starters = LEAGUE.roster[player.position] || 0;
  let penalty = 0;

  if (player.position === "QB") {
    if (count >= starters + 1) return 260;
    if (count >= starters) penalty += round <= 11 ? 130 : 70;
    if (strategy !== "eliteQBTE" && round <= 5) penalty += count ? 90 : 14;
  }

  if (player.position === "TE") {
    if (count >= starters + 1) return 220;
    if (count >= starters) penalty += round <= 11 ? 105 : 54;
    if (strategy !== "eliteQBTE" && round <= 5) penalty += count ? 75 : 8;
  }

  if (player.position === "K" || player.position === "DEF") {
    if (count >= Math.max(1, starters)) return 220;
    if (round <= LEAGUE.rounds - 2) penalty += 90;
  }

  if (player.position === "RB") {
    const cap = Math.max(5, LEAGUE.roster.RB + LEAGUE.roster.FLEX + 3 + (strategy === "robustRB" ? 1 : 0));
    if (count >= cap) penalty += 48 + (count - cap + 1) * 28;
  }

  if (player.position === "WR") {
    const cap = Math.max(6, LEAGUE.roster.WR + LEAGUE.roster.FLEX + 3 + (strategy === "zeroRB" || strategy === "wrHeavy" ? 1 : 0));
    if (count >= cap) penalty += 42 + (count - cap + 1) * 24;
  }

  return penalty;
}

function recommendationScore(player, team, pickNumber, strategy = state.strategy) {
  const roster = rosterFor(team);
  const adpValue = Number.isFinite(player.adp) ? pickNumber - player.adp : 0;
  const valueScore = 1000 - player.consensusRank + Math.min(24, Math.max(-24, adpValue * 0.9));
  const sourceConfidence = Math.min(5, player.sourceCount - 1);
  const keeperBump = Math.min(4, Math.max(0, player.keeperValue || 0));
  return valueScore
    + scoringRankBonus(player)
    - starterNeedScore(player, roster)
    - strategyScore(player, roster, pickNumber, strategy)
    - rosterPressureScore(player, team, pickNumber)
    - recommendationRosterPenalty(player, roster, pickNumber, strategy)
    - rosterCompletionAdjustment(player, team, pickNumber, roster)
    + keeperBump
    + sourceConfidence;
}

function recommendations(team = state.userTeam, pickNumber = state.currentPick, limit = 8) {
  return availablePlayers()
    .map((player) => ({ player, score: recommendationScore(player, team, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.player);
}

function lineupProjection(roster) {
  return bestLineupForRoster(roster).reduce((sum, player) => sum + projectionForPlayer(player), 0);
}

function nextPickNumbersForTeam(team = state.userTeam, fromPick = state.currentPick, count = 3) {
  const picks = [];
  for (let pick = fromPick + 1; pick <= LEAGUE.teams * LEAGUE.rounds && picks.length < count; pick += 1) {
    if (draftOrderFor(pick).team === team) picks.push(pick);
  }
  return picks;
}

function pickLabel(pickNumber) {
  if (!pickNumber) return "No pick";
  const order = draftOrderFor(pickNumber);
  return `${order.label} (pick ${pickNumber})`;
}

function scorePlayerForRoster(player, roster, pickNumber) {
  const adpValue = Number.isFinite(player.adp) ? pickNumber - player.adp : 0;
  const valueScore = 1000 - player.consensusRank + Math.min(24, Math.max(-24, adpValue * 0.9));
  const sourceConfidence = Math.min(5, player.sourceCount - 1);
  const keeperBump = Math.min(4, Math.max(0, player.keeperValue || 0));
  return valueScore
    + scoringRankBonus(player)
    - starterNeedScore(player, roster)
    - strategyScore(player, roster, pickNumber, state.strategy)
    - recommendationRosterPenalty(player, roster, pickNumber, state.strategy)
    + keeperBump
    + sourceConfidence;
}

function bestAvailableForPosition(position, roster, pickNumber, excludedIds = new Set()) {
  return availablePlayers()
    .filter((player) => player.position === position && !excludedIds.has(player.id))
    .map((player) => ({ player, score: scorePlayerForRoster(player, roster, pickNumber) }))
    .sort((a, b) => b.score - a.score)[0]?.player || null;
}

function rosterNeedLabel(roster) {
  const counts = positionCounts(roster);
  const missing = ["QB", "RB", "WR", "TE", "K", "DEF"]
    .map((pos) => {
      const open = Math.max(0, (LEAGUE.roster[pos] || 0) - (counts[pos] || 0));
      return open ? `${open} ${pos}` : "";
    })
    .filter(Boolean);
  return missing.length ? missing.join(", ") : "starters covered";
}

function positionPlanScore(position, roster, pickNumber, excludedIds) {
  const candidate = bestAvailableForPosition(position, roster, pickNumber, excludedIds);
  if (!candidate) return { position, candidate: null, score: -999 };
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  const starterCount = LEAGUE.roster[position] || 0;
  const currentProjection = lineupProjection(roster);
  const nextProjection = lineupProjection([...roster, candidate]);
  let score = scorePlayerForRoster(candidate, roster, pickNumber) + (nextProjection - currentProjection) * 18;

  if (position === "RB" && (counts.RB || 0) < LEAGUE.roster.RB + LEAGUE.roster.FLEX) score += 18;
  if (position === "WR" && (counts.WR || 0) < LEAGUE.roster.WR + LEAGUE.roster.FLEX) score += 18;
  if (position === "QB" && (counts.QB || 0) >= starterCount) score -= 80;
  if (position === "TE" && (counts.TE || 0) >= starterCount) score -= 58;
  if (["K", "DEF"].includes(position) && round < LEAGUE.rounds - 1) score -= 95;
  if (["RB", "WR", "TE"].includes(position)) score -= positionalDropoffScore(candidate);

  return { position, candidate, score };
}

function scenarioPlan(startPosition) {
  const position = startPosition.toUpperCase();
  const currentRoster = rosterFor(state.userTeam);
  const currentPick = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const firstPlayer = bestAvailableForPosition(position, currentRoster, currentPick);
  if (!firstPlayer) return `I do not see a usable ${position} option available right now.`;

  const excludedIds = new Set([firstPlayer.id]);
  const simulatedRoster = [...currentRoster, firstPlayer];
  const plan = [];
  nextPickNumbersForTeam(state.userTeam, currentPick, 3).forEach((pickNumber) => {
    const options = ["QB", "RB", "WR", "TE", "K", "DEF"]
      .map((pos) => positionPlanScore(pos, simulatedRoster, pickNumber, excludedIds))
      .sort((a, b) => b.score - a.score);
    const best = options[0];
    if (best?.candidate) {
      plan.push({ pickNumber, ...best });
      simulatedRoster.push(best.candidate);
      excludedIds.add(best.candidate.id);
    }
  });

  const path = plan.length
    ? plan.map((item, index) => `${index + 1}. ${pickLabel(item.pickNumber)}: ${item.position} - target ${item.candidate.name} (${item.candidate.position}, ${projectionForPlayer(item.candidate).toFixed(1)} avg pts)`).join("\n")
    : "No future picks found for your team.";
  const needs = rosterNeedLabel(simulatedRoster);
  return `If you go ${position} here, I would start with ${firstPlayer.name} (${projectionForPlayer(firstPlayer).toFixed(1)} avg pts).\n\nNext 3-pick position path:\n${path}\n\nWhy: this path is trying to maximize your projected starting lineup while keeping starters covered. After the path, your open starter needs would be: ${needs}.`;
}

function currentPickAdvice() {
  const recs = recommendations(state.userTeam, state.currentPick, 5);
  if (!recs.length) return "The draft is complete, so there is no live pick recommendation right now.";
  const roster = rosterFor(state.userTeam);
  const rows = recs.map((player, index) => `${index + 1}. ${player.name} - ${player.position}, ${projectionForPlayer(player).toFixed(1)} avg pts, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}`).join("\n");
  return `My top options at ${pickLabel(state.currentPick)}:\n${rows}\n\nBest lean: ${recs[0].name}. The recommendation is balancing player value, ADP, your roster need (${rosterNeedLabel(roster)}), scarcity, and your selected strategy.`;
}

function playerShortReason(player, pickNumber) {
  const notes = [];
  if (Number.isFinite(player.adp)) {
    const adpGap = pickNumber - player.adp;
    if (adpGap >= 8) notes.push(`ADP value by ${adpGap.toFixed(1)} picks`);
    if (adpGap <= -18) notes.push(`more of a watch-list name than a pick here`);
  }
  if (isYoungUpsidePlayer(player)) notes.push("rookie/youth upside");
  if (player.upsideNote) notes.push(player.upsideNote);
  if (player.depthChartRole) notes.push(player.depthChartRole);
  if (player.riskNote) notes.push(`risk: ${player.riskNote}`);
  return notes.slice(0, 2).join("; ") || pickTake(player, state.userTeam);
}

function targetedPlayerAdvice(kind, position = null) {
  const pickNumber = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const roster = rosterFor(state.userTeam);
  const lowerKind = kind.toLowerCase();
  let pool = availablePlayers();
  if (position) pool = pool.filter((player) => player.position === position.toUpperCase());

  if (lowerKind === "rookie") {
    pool = pool.filter((player) => isYoungUpsidePlayer(player) || /rookie|first-year|year 1/i.test(`${player.summary || ""} ${player.sourceSummary || ""} ${player.upsideNote || ""}`));
  }
  if (lowerKind === "sleeper") {
    pool = pool.filter((player) => {
      const laterMarket = Number.isFinite(player.adp) ? player.adp >= pickNumber + 24 || player.adp >= 85 : player.consensusRank >= 85;
      return laterMarket && (isYoungUpsidePlayer(player) || player.keeperValue > 0 || /upside|ambiguous|competition|breakout|role/i.test(`${player.aiAnalysis || ""} ${player.sourceSummary || ""} ${player.upsideNote || ""}`));
    });
  }
  if (lowerKind === "upside") {
    pool = pool.filter((player) => isYoungUpsidePlayer(player) || player.upsideNote || player.keeperValue > 0);
  }
  if (lowerKind === "value") {
    pool = pool.filter((player) => Number.isFinite(player.adp) && pickNumber - player.adp >= 6);
  }

  const scored = pool
    .map((player) => {
      let score = recommendationScore(player, state.userTeam, pickNumber);
      if (lowerKind === "sleeper") score += Math.min(35, Math.max(0, (player.adp || player.consensusRank || 120) - pickNumber) * 0.18);
      if ((lowerKind === "rookie" || lowerKind === "upside") && isYoungUpsidePlayer(player)) score += 18;
      return { player, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!scored.length) {
    return `I do not see five strong ${position ? `${position.toUpperCase()} ` : ""}${lowerKind} candidates in the current available pool. For this pick, the safer board answer is:\n\n${currentPickAdvice()}`;
  }

  const timing = lowerKind === "sleeper"
    ? "These are not necessarily pick-now recommendations; they are names to watch or queue as the board gets into their range."
    : "These are ranked within the current recommendation engine, but you should still compare them against the best overall values.";
  const rows = scored.map(({ player }, index) => `${index + 1}. ${player.name} - ${player.position}, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}, ${projectionForPlayer(player).toFixed(1)} avg pts. ${playerShortReason(player, pickNumber)}`).join("\n");
  return `${position ? `${position.toUpperCase()} ` : ""}${kind[0].toUpperCase()}${kind.slice(1)} candidates at ${pickLabel(pickNumber)}:\n${rows}\n\n${timing}\nRoster context: ${rosterNeedLabel(roster)}.`;
}

function needsAdvice() {
  const roster = rosterFor(state.userTeam);
  const counts = positionCounts(roster);
  const nextPicks = nextPickNumbersForTeam(state.userTeam, state.currentPick, 3).map(pickLabel).join(", ") || "no remaining picks";
  return `Roster snapshot for ${teamName(state.userTeam)}:\nQB ${counts.QB || 0}/${LEAGUE.roster.QB}, RB ${counts.RB || 0}/${LEAGUE.roster.RB}, WR ${counts.WR || 0}/${LEAGUE.roster.WR}, TE ${counts.TE || 0}/${LEAGUE.roster.TE}, K ${counts.K || 0}/${LEAGUE.roster.K}, DEF ${counts.DEF || 0}/${LEAGUE.roster.DEF}.\n\nBiggest needs: ${rosterNeedLabel(roster)}.\nYour next picks: ${nextPicks}.`;
}

function mentionedPlayerFromQuestion(question) {
  const key = playerKey(question);
  const fullNameMatch = [...PLAYERS]
    .sort((a, b) => b.name.length - a.name.length)
    .find((player) => key.includes(playerKey(player.name)));
  if (fullNameMatch) return fullNameMatch;

  const words = String(question || "").toLowerCase().match(/[a-z']+/g) || [];
  const uniqueLastNameMatches = PLAYERS.filter((player) => {
    const parts = player.name.toLowerCase().match(/[a-z']+/g) || [];
    const last = parts[parts.length - 1];
    return last && words.includes(last);
  });
  return uniqueLastNameMatches.length === 1 ? uniqueLastNameMatches[0] : null;
}

function playerSpecificAdvice(player) {
  const pickNumber = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const draftedPick = activePicks().find((pick) => pick.player.id === player.id);
  const isAvailable = !state.draftedIds.has(player.id) && !draftedPick;
  const recs = recommendations(state.userTeam, pickNumber, 24);
  const recIndex = recs.findIndex((candidate) => candidate.id === player.id);
  const adpText = Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A";
  const adpDelta = Number.isFinite(player.adp) ? pickNumber - player.adp : 0;
  const valueText = Number.isFinite(player.adp)
    ? adpDelta >= 6
      ? `He is a value versus ADP by about ${adpDelta.toFixed(1)} picks.`
      : adpDelta <= -10
        ? `This would be ahead of ADP by about ${Math.abs(adpDelta).toFixed(1)} picks, so you need a strong conviction or roster reason.`
        : "His price is close to market."
    : "No ADP signal is available for him yet.";
  const status = draftedPick
    ? `Already drafted by ${activeTeamName(draftedPick.team)} at ${draftedPick.label}.`
    : isAvailable
      ? "Available right now."
      : "Not currently available.";
  const rankText = recIndex >= 0
    ? `He is currently #${recIndex + 1} in your recommendation queue.`
    : isAvailable
      ? "He is outside the top recommendation tier right now."
      : "He is no longer in the live recommendation queue.";
  const context = [
    player.aiAnalysis ? `AI Analysis: ${player.aiAnalysis}` : "",
    player.sourceSummary ? `Source Summary${player.sourceSummarySource ? ` (${player.sourceSummarySource})` : ""}: ${player.sourceSummary}` : "",
    player.depthChartRole ? `Role: ${player.depthChartRole}` : "",
    player.teamContext ? `Team context: ${player.teamContext}` : "",
    player.upsideNote ? `Upside: ${player.upsideNote}` : "",
    player.riskNote ? `Risk: ${player.riskNote}` : "",
    player.competition ? `Competition: ${player.competition}` : "",
    player.injuryNote ? `Injury note: ${player.injuryNote}` : "",
  ].filter(Boolean).slice(0, 5);
  const roster = rosterFor(state.userTeam);
  const fit = fillsRequiredRosterSlot(player, roster)
    ? `Roster fit: fills an open ${player.position} starter/flex need.`
    : `Roster fit: more of a depth/value decision for your current roster. Current needs: ${rosterNeedLabel(roster)}.`;

  return `${player.name} (${player.position}, ${player.team})\nStatus: ${status}\nRank/market: consensus #${Math.round(player.consensusRank)}, ADP ${adpText}, tier ${player.tier}, projected ${projectionForPlayer(player).toFixed(1)} avg pts. ${rankText} ${valueText}\n${fit}\n\n${context.length ? context.join("\n") : "No extra uploaded player context is available yet."}`;
}

function assistantResponse(question) {
  const lower = question.toLowerCase();
  const positionMatch = lower.match(/\b(qb|rb|wr|te|k|def)\b/);
  const mentionedPlayer = mentionedPlayerFromQuestion(question);
  if (mentionedPlayer) return playerSpecificAdvice(mentionedPlayer);
  if (lower.includes("if i go") && positionMatch) return scenarioPlan(positionMatch[1]);
  if (lower.includes("next") && lower.includes("3") && positionMatch) return scenarioPlan(positionMatch[1]);
  if (lower.includes("rookie") || lower.includes("rookies")) return targetedPlayerAdvice("rookie", positionMatch?.[1] || null);
  if (lower.includes("sleeper") || lower.includes("sleepers")) return targetedPlayerAdvice("sleeper", positionMatch?.[1] || null);
  if (lower.includes("upside") || lower.includes("breakout") || lower.includes("ceiling")) return targetedPlayerAdvice("upside", positionMatch?.[1] || null);
  if (lower.includes("value") || lower.includes("falling") || lower.includes("discount")) return targetedPlayerAdvice("value", positionMatch?.[1] || null);
  if (lower.includes("need") || lower.includes("roster")) return needsAdvice();
  if (lower.includes("who") || lower.includes("pick") || lower.includes("best") || lower.includes("recommend")) return currentPickAdvice();
  return `${currentPickAdvice()}\n\nYou can also ask things like: "If I go RB here, show me my next 3 picks" or "What are my biggest roster needs?"`;
}

function addAssistantMessage(role, text) {
  state.assistantMessages.push({ role, text, createdAt: Date.now() });
  state.assistantMessages = state.assistantMessages.slice(-12);
  renderDraftAssistant();
}

function submitAssistantQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  addAssistantMessage("user", trimmed);
  addAssistantMessage("assistant", assistantResponse(trimmed));
  $("assistantInput").value = "";
}

function seededWave(seed, ...parts) {
  const value = parts.reduce((sum, part, index) => sum + Number(part || 0) * (index + 1) * 37.719, seed || 1);
  return Math.sin(value * 12.9898) * 0.5 + Math.cos(value * 4.1414) * 0.5;
}

function makePickSilent(player) {
  if (!player) return;
  skipLockedPicks();
  const order = draftOrderFor(state.currentPick);
  state.picks.push({ pick: state.currentPick, ...order, player });
  state.draftedIds.add(player.id);
  state.currentPick += 1;
  skipLockedPicks();
}

function bulkPersonaMix(runIndex, seed) {
  if (!state.bulk.randomizeRoom) return [...state.teamPersonas];
  return Array.from({ length: LEAGUE.teams }, (_, index) => {
    if (index + 1 === state.userTeam) return state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id;
    const baseIndex = PERSONAS.findIndex((persona) => persona.id === (state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id));
    const shift = Math.abs(Math.round(seededWave(seed, runIndex, index) * 4));
    return PERSONAS[(baseIndex + shift + PERSONAS.length) % PERSONAS.length].id;
  });
}

function bulkUserPickScore(player, team, pickNumber, strategy, runIndex) {
  const roster = rosterFor(team);
  const round = draftOrderFor(pickNumber).round;
  let score = recommendationScore(player, team, pickNumber, strategy);
  const wave = seededWave(state.mockSeed, runIndex, pickNumber, player.consensusRank, player.adp);
  score += wave * 9;

  if (strategy === "wrHeavy" && player.position === "WR" && round <= 7) score += 16;
  if (strategy === "upside" && isYoungUpsidePlayer(player)) score += 13;
  if (strategy === "safeFloor" && isYoungUpsidePlayer(player) && round <= 8) score -= 9;
  if (strategy === "safeFloor" && isRecognizableName(player)) score += 5;

  const counts = positionCounts(roster);
  score -= rosterCompletionAdjustment(player, team, pickNumber, roster);
  if (player.position === "QB" && (counts.QB || 0) >= LEAGUE.roster.QB) score -= 90;
  if (player.position === "TE" && (counts.TE || 0) >= LEAGUE.roster.TE) score -= 55;
  if ((player.position === "K" || player.position === "DEF") && round < LEAGUE.rounds - 1) score -= 120;
  return score;
}

function bulkUserPick(strategy, runIndex) {
  return candidatePoolForTeam(state.userTeam, state.currentPick, 44)
    .map((player) => ({ player, score: bulkUserPickScore(player, state.userTeam, state.currentPick, strategy, runIndex) }))
    .sort((a, b) => b.score - a.score)[0]?.player || null;
}

function restoreSimulationState(snapshot) {
  state.picks = snapshot.picks;
  state.draftedIds = snapshot.draftedIds;
  state.currentPick = snapshot.currentPick;
  state.strategy = snapshot.strategy;
  state.mockSeed = snapshot.mockSeed;
  state.teamPersonas = snapshot.teamPersonas;
  state.viewedDraftId = snapshot.viewedDraftId;
}

function simulateBulkDraft(strategy, runIndex) {
  const snapshot = {
    picks: state.picks,
    draftedIds: state.draftedIds,
    currentPick: state.currentPick,
    strategy: state.strategy,
    mockSeed: state.mockSeed,
    teamPersonas: state.teamPersonas,
    viewedDraftId: state.viewedDraftId,
  };
  const seed = Date.now() * 0.001 + runIndex * 101.37;
  const userPickSnapshots = [];

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
      if (order.team === state.userTeam) {
        const availableSnapshot = availablePlayers().slice(0, 10).map((player) => ({
          id: player.id,
          name: player.name,
          position: player.position,
          rank: player.consensusRank,
        }));
        const player = bulkUserPick(strategy, runIndex);
        if (!player) break;
        userPickSnapshots.push({ pick: state.currentPick, label: order.label, available: availableSnapshot, player });
        makePickSilent(player);
      } else {
        const player = personaPick(order.team, state.currentPick);
        if (!player) break;
        makePickSilent(player);
      }
    }

    const analyses = allTeamAnalyses();
    const userAnalysis = analyses.find((analysis) => analysis.team === state.userTeam) || analyzeTeam(state.userTeam, state.picks);
    const userPicks = state.picks.filter((pick) => pick.team === state.userTeam).sort((a, b) => a.pick - b.pick);
    const firstFive = userPicks.slice(0, 5);
    return {
      id: `bulk-${Date.now()}-${runIndex}`,
      runIndex: runIndex + 1,
      strategy,
      strategyLabel: BULK_STRATEGIES.find((item) => item.id === strategy)?.label || strategy,
      rank: userAnalysis.rank || analyses.findIndex((analysis) => analysis.team === state.userTeam) + 1,
      grade: userAnalysis.grade || gradeFromRank(userAnalysis.rank || 12),
      playoffOdds: userAnalysis.playoffOdds || 0,
      weeklyProjection: userAnalysis.weeklyProjection,
      score: userAnalysis.score,
      value: userAnalysis.value,
      balance: userAnalysis.balance,
      firstFiveBuild: firstFive.map((pick) => pick.player.position).join("-") || "None",
      firstFivePlayers: firstFive.map((pick) => `${pick.player.name} (${pick.player.position})`),
      userPicks: userPicks.map(compactPick),
      userRoster: userAnalysis.roster.map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) })),
      strengths: userAnalysis.strengths,
      weaknesses: userAnalysis.weaknesses,
      pickBreakdown: userAnalysis.pickBreakdown.slice(0, 8).map((pick) => ({
        pick: pick.pick,
        label: pick.label,
        player: pick.player,
        pickValue: pick.pickValue,
        alternatives: pick.alternatives.slice(0, 3),
      })),
      availability: userPickSnapshots,
    };
  } finally {
    restoreSimulationState(snapshot);
  }
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
}

function summarizeRunGroup(runs, label) {
  const sorted = [...runs].sort((a, b) => b.score - a.score);
  const median = sorted[Math.floor(sorted.length / 2)] || sorted[0];
  return {
    label,
    runs,
    count: runs.length,
    avgProjection: average(runs.map((run) => run.weeklyProjection)),
    avgScore: average(runs.map((run) => run.score)),
    avgPlayoffOdds: average(runs.map((run) => run.playoffOdds)),
    top3Rate: runs.length ? runs.filter((run) => run.rank <= 3).length / runs.length : 0,
    top6Rate: runs.length ? runs.filter((run) => run.rank <= Math.ceil(LEAGUE.teams / 2)).length / runs.length : 0,
    best: sorted[0],
    median,
    worst: sorted[sorted.length - 1],
  };
}

function summarizeBulkResults(runs) {
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
  return {
    createdAt: new Date().toISOString(),
    totalRuns: runs.length,
    strategies: byStrategy,
    builds,
    commonPlayers,
    examples: [bestOverall, medianOverall, worstOverall].filter(Boolean),
    bestStrategy: byStrategy[0] || null,
    bestBuild: builds[0] || null,
  };
}

function bulkStrategySchedule() {
  const count = Math.max(1, Math.min(100, Number(state.bulk.count) || 50));
  if (state.bulk.mode === "single") return Array.from({ length: count }, () => state.bulk.strategy);
  return Array.from({ length: count }, (_, index) => BULK_STRATEGIES[index % BULK_STRATEGIES.length].id);
}

function updateBulkProgress() {
  $("bulkProgress").hidden = !state.bulk.running;
  $("bulkProgressText").textContent = state.bulk.running
    ? `Running simulations ${state.bulk.progress}/${state.bulk.total}...`
    : "Ready";
  $("bulkProgressBar").style.width = state.bulk.total ? `${Math.round((state.bulk.progress / state.bulk.total) * 100)}%` : "0%";
  $("runBulkSimBtn").disabled = state.bulk.running;
}

function startBulkSimulations() {
  if (state.bulk.running) return;
  state.bulk.count = Math.max(1, Math.min(100, Number($("bulkCountInput").value) || 50));
  state.bulk.mode = $("bulkModeSelect").value;
  state.bulk.strategy = $("bulkStrategySelect").value;
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
}

function personaPick(team, pickNumber) {
  const persona = getPersonaForTeam(team);
  const candidates = candidatePoolForTeam(team, pickNumber, personaCandidateLimit(persona));
  if (!candidates.length) return null;
  return candidates
    .map((player) => ({ player, score: personaDraftScore(player, team, pickNumber, persona) }))
    .sort((a, b) => a.score - b.score)[0].player;
}

function makePick(player) {
  if (!player) return;
  skipLockedPicks();
  const order = draftOrderFor(state.currentPick);
  state.viewedDraftId = null;
  state.picks.push({ pick: state.currentPick, ...order, player });
  state.draftedIds.add(player.id);
  state.picks.sort((a, b) => a.pick - b.pick);
  state.currentPick += 1;
  skipLockedPicks();
  render();
}

function simUntilUserPick() {
  if (isLiveDraftMode()) {
    render();
    return;
  }
  skipLockedPicks();
  while (state.currentPick <= LEAGUE.teams * LEAGUE.rounds) {
    const order = draftOrderFor(state.currentPick);
    if (order.team === state.userTeam) break;
    const pick = personaPick(order.team, state.currentPick);
    if (!pick) break;
    makePick(pick);
    skipLockedPicks();
  }
  render();
}

function resetDraft() {
  state.viewedDraftId = null;
  state.mockSeed = Math.random() * 10000;
  state.picks = buildKeeperPicks();
  state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
  state.currentPick = 1;
  skipLockedPicks();
  if (isLiveDraftMode()) render();
  else simUntilUserPick();
}

function undoLastPick() {
  if (state.viewedDraftId) return;
  const manualPicks = state.picks.filter((pick) => !pick.keeper);
  const lastPick = manualPicks.sort((a, b) => b.pick - a.pick)[0];
  if (!lastPick) return;
  state.picks = state.picks.filter((pick) => pick !== lastPick);
  state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
  state.currentPick = lastPick.pick;
  skipLockedPicks();
  render();
}

function formatPlayer(player) {
  const adp = Number.isFinite(player.adp) ? ` - ADP ${Math.round(player.adp * 10) / 10}` : "";
  const sourceLabel = player.sourceNames?.length ? player.sourceNames.join(" + ") : "";
  const sources = player.sourceCount ? ` - ${player.sourceCount} source${player.sourceCount === 1 ? "" : "s"}${sourceLabel ? ` (${sourceLabel})` : ""}` : "";
  return `${player.position} - ${player.team}${adp}${sources}`;
}

function playerContext(player) {
  const details = [
    player.depthChartRole ? `Role: ${player.depthChartRole}` : "",
    player.depthChartRank ? `Depth: ${player.position}${player.depthChartRank}` : "",
    player.competition ? `Competition: ${player.competition}` : "",
  ].filter(Boolean);
  const sourceSummary = player.sourceSummary
    ? `
      <div class="context-block source-summary-block">
        <strong>Source Summary${player.sourceSummarySource ? ` - ${escapeHtml(player.sourceSummarySource)}` : ""}</strong>
        <p>${escapeHtml(player.sourceSummary)}</p>
      </div>
    `
    : `
      <div class="context-block source-summary-block muted-block">
        <strong>Source Summary</strong>
        <p>No uploaded player summary yet. Add a <code>summary</code>, <code>player_summary</code>, or <code>notes</code> column in your rankings file.</p>
      </div>
    `;
  return `
    <div class="player-context">
      <div class="context-block ai-analysis-block">
        <strong>AI Analysis</strong>
        <p>${escapeHtml(player.aiAnalysis || player.summary || "No AI analysis available yet.")}</p>
      </div>
      ${sourceSummary}
      <small>${escapeHtml(details.join(" - "))}</small>
    </div>
  `;
}

function pickTake(player, team = state.userTeam) {
  const roster = rosterFor(team);
  const counts = positionCounts(roster);
  const reason = player.position === "RB" && (counts.RB || 0) < 2
    ? "fills a scarce starter slot"
    : player.position === "WR" && (counts.WR || 0) < 3
      ? "keeps your 3-WR lineup strong"
      : player.position === "TE" && !counts.TE
        ? "captures a premium TE edge"
        : player.position === "QB" && !counts.QB
          ? "locks in weekly stability"
          : "is the strongest board value";
  return `${reason}; ${strategyCopy[state.strategy]}`;
}

function playerCard(player, includeButton = false, team = state.userTeam) {
  return `
    <div class="player-card">
      <div class="player-name">${player.name}</div>
      <span class="badge">${player.position} T${player.tier}</span>
      <div class="meta">${formatPlayer(player)}</div>
      ${includeButton ? `<button data-draft="${player.id}">Draft</button>` : ""}
      <div class="take">${pickTake(player, team)}</div>
      ${playerContext(player)}
    </div>
  `;
}

function tieredRecommendations(team = state.userTeam, pickNumber = state.currentPick, limit = 24) {
  const scored = availablePlayers()
    .map((player) => ({ player, score: recommendationScore(player, team, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const tiers = [];
  scored.forEach((item, index) => {
    const previous = scored[index - 1];
    const startsNewTier = !previous || previous.score - item.score >= 10 || tiers[tiers.length - 1].players.length >= 6;
    if (startsNewTier) tiers.push({ label: `Tier ${tiers.length + 1}`, players: [] });
    tiers[tiers.length - 1].players.push(item.player);
  });
  return tiers;
}

function renderTierList(team = state.userTeam) {
  const tiers = tieredRecommendations(team, state.currentPick, 24);
  if (!tiers.length) return `<p class="empty">Draft complete.</p>`;
  return tiers.map((tier) => `
    <div class="tier-group">
      <div class="tier-title">${tier.label}</div>
      ${tier.players.map((player) => `
        <div class="tier-player" data-draft="${player.id}">
          <span>${player.name}</span>
          <b>${player.position}</b>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function likelyNextPickOptions(team = state.userTeam, limit = 5) {
  const nextPick = nextPickForTeam(team, state.currentPick);
  if (!nextPick) return { nextPick: null, players: [] };
  const snapshot = {
    picks: state.picks,
    draftedIds: state.draftedIds,
    currentPick: state.currentPick,
  };

  try {
    state.picks = [...state.picks];
    state.draftedIds = new Set(state.draftedIds);
    const currentOrder = draftOrderFor(state.currentPick);
    if (currentOrder.team === team && !state.picks.some((pick) => pick.pick === state.currentPick)) {
      const assumedCurrentPick = recommendations(team, state.currentPick, 1)[0];
      if (assumedCurrentPick) {
        state.picks.push({ pick: state.currentPick, ...currentOrder, player: assumedCurrentPick, forecast: true });
        state.draftedIds.add(assumedCurrentPick.id);
      }
    }
    let simulatedPick = state.currentPick + 1;
    while (simulatedPick < nextPick) {
      const order = draftOrderFor(simulatedPick);
      if (!state.picks.some((pick) => pick.pick === simulatedPick)) {
        state.currentPick = simulatedPick;
        const player = personaPick(order.team, simulatedPick);
        if (player) {
          state.picks.push({ pick: simulatedPick, ...order, player, forecast: true });
          state.draftedIds.add(player.id);
        }
      }
      simulatedPick += 1;
    }
    state.currentPick = nextPick;
    return {
      nextPick,
      players: recommendations(team, nextPick, limit),
    };
  } finally {
    state.picks = snapshot.picks;
    state.draftedIds = snapshot.draftedIds;
    state.currentPick = snapshot.currentPick;
  }
}

function renderFuturePickList(team = state.userTeam) {
  const forecast = likelyNextPickOptions(team, 5);
  if (!forecast.nextPick) return `<p class="empty">No future pick remaining.</p>`;
  const label = draftOrderFor(forecast.nextPick).label;
  if (!forecast.players.length) return `<p class="empty">No forecast available for ${label}.</p>`;
  return `
    <div class="future-pick-summary">Projected options at ${label} / pick ${forecast.nextPick}. Assumes current top recommendation is gone.</div>
    ${forecast.players.map((player, index) => `
      <div class="future-player">
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(player.name)}</strong>
          <small>${player.position} ${player.team} - ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "n/a"} - Tier ${player.tier}</small>
        </div>
      </div>
    `).join("")}
  `;
}

function renderRecommendations() {
  const viewedDraft = state.completedDrafts.find((draft) => draft.id === state.viewedDraftId);
  if (viewedDraft) {
    const roster = viewedDraft.picks.filter((pick) => pick.team === viewedDraft.userTeam).map((pick) => pick.player);
    $("bestPick").innerHTML = `
      <div class="player-card">
        <div class="player-name">${viewedDraft.name}</div>
        <span class="badge">Saved</span>
        <div class="meta">${escapeHtml(draftTeamName(viewedDraft, viewedDraft.userTeam))} - ${viewedDraft.strategy} - ${new Date(viewedDraft.createdAt).toLocaleString()}</div>
        <div class="take">${viewedDraft.notes || "Add notes in the Completed Drafts panel to remember what you liked."}</div>
      </div>
    `;
    $("fallbackList").innerHTML = roster.slice(0, 8).map((player) => playerCard(player)).join("");
    $("futurePickList").innerHTML = `<p class="empty">Forecasts are disabled in saved-draft review.</p>`;
    $("nextTurnList").innerHTML = `<p class="empty">Review mode is read-only. Click Current draft to resume the live mock.</p>`;
    return;
  }
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick > total && state.picks.length === total) {
    $("bestPick").innerHTML = `
      <div class="player-card">
        <div class="player-name">Draft complete</div>
        <span class="badge">${LEAGUE.rounds}.${String(LEAGUE.teams).padStart(2, "0")}</span>
        <div class="meta">Save this board to Completed Drafts when you want to keep it.</div>
        <div class="take">Use Save completed & new draft in the setup panel to archive this mock and start another run.</div>
      </div>
    `;
    $("fallbackList").innerHTML = rosterFor(state.userTeam).slice(0, 8).map((player) => playerCard(player)).join("");
    $("futurePickList").innerHTML = `<p class="empty">No future pick remaining.</p>`;
    $("nextTurnList").innerHTML = `<p class="empty">No more picks remaining.</p>`;
    return;
  }
  const targetTeam = isLiveDraftMode() ? draftOrderFor(state.currentPick).team : state.userTeam;
  const recs = recommendations(targetTeam, state.currentPick, 10);
  $("bestPick").innerHTML = recs[0] ? playerCard(recs[0], true, targetTeam) : `<p class="empty">Draft complete.</p>`;
  $("fallbackList").innerHTML = recs.slice(1, 4).map((p) => playerCard(p, true, targetTeam)).join("") || `<p class="empty">No fallback needed.</p>`;
  $("futurePickList").innerHTML = renderFuturePickList(targetTeam);
  $("nextTurnList").innerHTML = renderTierList(targetTeam);
}

function nextUserPickNumber() {
  for (let pick = state.currentPick + 1; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    if (draftOrderFor(pick).team === state.userTeam) return pick;
  }
  return null;
}

function nextPickForTeam(team, fromPick = state.currentPick) {
  for (let pick = fromPick + 1; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    if (draftOrderFor(pick).team === team) return pick;
  }
  return null;
}

function renderBoard() {
  const league = activeLeague();
  const total = league.teams * league.rounds;
  const cells = [];
  const viewedDraft = activeDraft();
  const picks = activePicks();
  const userTeam = activeUserTeam();
  for (let pick = 1; pick <= total; pick += 1) {
    const order = viewedDraft
      ? { ...picks.find((item) => item.pick === pick), label: `${Math.ceil(pick / league.teams)}.${String(((pick - 1) % league.teams) + 1).padStart(2, "0")}` }
      : draftOrderFor(pick);
    const made = picks.find((item) => item.pick === pick);
    const positionClass = made ? `pos-${String(made.player.position || "").toLowerCase()}` : "empty";
    const ownerClass = `team-outline-${((order.team - 1) % 12) + 1}`;
    cells.push(`
      <div class="pick ${positionClass} ${ownerClass} ${order.team === userTeam ? "user" : ""} ${!viewedDraft && pick === state.currentPick ? "active" : ""}">
        <div class="pick-number">${order.label}</div>
        ${made ? `<div class="pick-player">${made.player.name}${made.keeper ? " (Keeper)" : ""}</div><div class="pick-meta">${made.player.position} ${made.player.team}</div>` : ""}
      </div>
    `);
  }
  $("draftBoard").innerHTML = cells.join("");
  $("draftBoard").style.gridTemplateColumns = `repeat(${league.teams}, minmax(0, 1fr))`;
  const ownerRow = Array.from({ length: league.teams }, (_, index) => {
    const team = viewedDraft
      ? picks.find((pick) => pick.round === 1 && pick.index === index)?.team || index + 1
      : state.roundOrders[0]?.[index] || index + 1;
    return `
      <button class="board-owner-cell team-outline-${((team - 1) % 12) + 1} ${team === userTeam ? "user" : ""}" data-room-roster-team="${team}" type="button">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(viewedDraft ? draftTeamName(viewedDraft, team) : teamName(team))}</strong>
      </button>
    `;
  }).join("");
  $("boardOwnerRow").innerHTML = ownerRow;
  $("boardOwnerRow").style.gridTemplateColumns = `repeat(${league.teams}, minmax(0, 1fr))`;
  $("draftProgress").textContent = viewedDraft
    ? `Viewing ${viewedDraft.name} - ${new Date(viewedDraft.createdAt).toLocaleDateString()}`
    : `${state.picks.length}/${total} picks`;
}

function rosterSlotRows(rosterPicks, league = activeLeague()) {
  const picksByPlayerId = new Map(rosterPicks.map((pick) => [pick.player.id, pick]));
  const roster = rosterPicks.map((pick) => pick.player);
  const byPosition = (position) => roster
    .filter((player) => player.position === position)
    .sort((a, b) => projectionForPlayer(b) - projectionForPlayer(a));
  const used = new Set();
  const rows = [];
  const addSlot = (slot, player = null) => {
    if (player) used.add(player.id);
    const pick = player ? picksByPlayerId.get(player.id) : null;
    rows.push({ slot, player, pick, starter: true });
  };

  ["QB", "RB", "WR", "TE"].forEach((position) => {
    const count = league.roster[position] || 0;
    const players = byPosition(position);
    for (let index = 0; index < count; index += 1) {
      addSlot(count > 1 ? `${position}${index + 1}` : position, players[index] || null);
    }
  });

  const flexEligible = roster
    .filter((player) => ["RB", "WR", "TE"].includes(player.position) && !used.has(player.id))
    .sort((a, b) => projectionForPlayer(b) - projectionForPlayer(a));
  for (let index = 0; index < (league.roster.FLEX || 0); index += 1) {
    addSlot((league.roster.FLEX || 0) > 1 ? `FLEX${index + 1}` : "FLEX", flexEligible[index] || null);
  }

  ["K", "DEF"].forEach((position) => {
    const count = league.roster[position] || 0;
    const players = byPosition(position);
    for (let index = 0; index < count; index += 1) {
      addSlot(count > 1 ? `${position}${index + 1}` : position, players[index] || null);
    }
  });

  rosterPicks
    .filter((pick) => !used.has(pick.player.id))
    .sort((a, b) => a.pick - b.pick)
    .forEach((pick, index) => rows.push({ slot: `BN${index + 1}`, player: pick.player, pick, starter: false }));

  const benchSlots = Math.max(0, (league.roster.BENCH || 0) - rows.filter((row) => !row.starter).length);
  for (let index = 0; index < benchSlots; index += 1) {
    rows.push({ slot: `BN${rows.filter((row) => !row.starter).length + 1}`, player: null, pick: null, starter: false });
  }
  return rows;
}

function renderRoster() {
  const league = activeLeague();
  const rosterPicks = activePicks().filter((pick) => pick.team === activeUserTeam());
  const roster = rosterPicks.map((pick) => pick.player);
  const counts = positionCounts(roster);
  $("rosterList").innerHTML = rosterSlotRows(rosterPicks, league).map((row) => `
    <div class="roster-row ${row.starter ? "starter" : "bench"} ${row.player ? "" : "open"}">
      <div class="pos">${row.slot}</div>
      <div>
        <strong>${row.player ? escapeHtml(row.player.name) : "Open"}</strong>
        <span>${row.player ? `${row.player.position} ${row.player.team}${row.pick?.keeper ? " - Keeper" : ""}` : row.starter ? "Starter slot" : "Bench slot"}</span>
      </div>
      <em>${row.player ? projectionForPlayer(row.player).toFixed(1) : "--"}</em>
    </div>
  `).join("");
  const needs = [];
  ["QB", "RB", "WR", "TE", "K", "DEF"].forEach((pos) => {
    const missing = Math.max(0, (league.roster[pos] || 0) - (counts[pos] || 0));
    if (missing) needs.push(`${missing} ${pos}`);
  });
  $("rosterNeeds").textContent = needs.length ? `Needs: ${needs.join(", ")}` : "Starters covered";
}

function starterNeedsForRoster(roster, league = activeLeague()) {
  const counts = positionCounts(roster);
  const needs = [];
  ["QB", "RB", "WR", "TE"].forEach((position) => {
    const missing = Math.max(0, (league.roster[position] || 0) - (counts[position] || 0));
    for (let index = 0; index < missing; index += 1) needs.push(position);
  });
  const skillNeed = (league.roster.RB || 0) + (league.roster.WR || 0) + (league.roster.TE || 0) + (league.roster.FLEX || 0);
  const skillCount = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0);
  const directSkillNeeds = needs.filter((position) => ["RB", "WR", "TE"].includes(position)).length;
  const flexNeeds = Math.max(0, skillNeed - skillCount - directSkillNeeds);
  for (let index = 0; index < flexNeeds; index += 1) needs.push("FLEX");
  ["K", "DEF"].forEach((position) => {
    const missing = Math.max(0, (league.roster[position] || 0) - (counts[position] || 0));
    for (let index = 0; index < missing; index += 1) needs.push(position);
  });
  return needs;
}

function needsSummaryForTeam(team, league = activeLeague()) {
  const roster = activeRosterFor(team);
  const needs = starterNeedsForRoster(roster, league);
  return needs.length ? needs : ["Done"];
}

function renderRoomRosters() {
  if (!$("roomRosterTeamSelect")) return;
  const league = activeLeague();
  const activeTeam = Math.max(1, Math.min(league.teams, Number(state.roomRosterTeam) || activeUserTeam()));
  state.roomRosterTeam = activeTeam;
  $("roomRosterTeamSelect").innerHTML = Array.from({ length: league.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}" ${team === activeTeam ? "selected" : ""}>${escapeHtml(activeTeamName(team))}</option>`;
  }).join("");
  $("roomNeedsGrid").innerHTML = Array.from({ length: league.teams }, (_, index) => {
    const team = index + 1;
    const needs = needsSummaryForTeam(team, league);
    const isDone = needs.length === 1 && needs[0] === "Done";
    return `
      <button class="room-need-row ${team === activeTeam ? "active" : ""} ${isDone ? "complete" : ""}" data-room-roster-team="${team}" type="button">
        <strong>${escapeHtml(activeTeamName(team))}</strong>
        <span>${needs.map((need) => `<b>${escapeHtml(need)}</b>`).join("")}</span>
      </button>
    `;
  }).join("");

  const rosterPicks = activePicks().filter((pick) => pick.team === activeTeam);
  $("roomRosterList").innerHTML = rosterSlotRows(rosterPicks, league).map((row) => `
    <div class="roster-row ${row.starter ? "starter" : "bench"} ${row.player ? "" : "open"}">
      <div class="pos">${row.slot}</div>
      <div>
        <strong>${row.player ? escapeHtml(row.player.name) : "Open"}</strong>
        <span>${row.player ? `${row.player.position} ${row.player.team}${row.pick?.keeper ? " - Keeper" : ""}` : row.starter ? "Starter slot" : "Bench slot"}</span>
      </div>
      <em>${row.player ? projectionForPlayer(row.player).toFixed(1) : "--"}</em>
    </div>
  `).join("");
}

function fitLabelForPlayer(player, team, pickNumber) {
  const roster = rosterFor(team);
  if (fillsRequiredRosterSlot(player, roster)) return "Need";
  if (Number.isFinite(player.adp) && pickNumber - player.adp >= 8) return "Value";
  if (player.keeperValue > 0) return "Keeper+";
  return player.position === "RB" || player.position === "WR" ? "Depth" : "Watch";
}

function renderAvailable() {
  const query = state.search.toLowerCase();
  const targetTeam = isLiveDraftMode() && state.currentPick <= LEAGUE.teams * LEAGUE.rounds
    ? draftOrderFor(state.currentPick).team
    : state.userTeam;
  const players = availablePlayers()
    .filter((p) => state.positionFilter === "ALL" || p.position === state.positionFilter)
    .filter((p) => !query || `${p.name} ${p.team} ${p.position}`.toLowerCase().includes(query))
    .slice(0, 100)
    .map((player) => ({ player, score: recommendationScore(player, targetTeam, state.currentPick) }))
    .sort((a, b) => b.score - a.score);
  $("availableList").innerHTML = `
    <div class="available-header">
      <span>Player</span>
      <span>Pos</span>
      <span>Rank</span>
      <span>ADP</span>
      <span>Proj</span>
      <span>Sources</span>
      <span>Fit</span>
    </div>
    ${players
    .map(({ player: p }) => `
      <div class="available-player" data-draft="${p.id}">
        <div>
          <div class="player-name">${p.name}</div>
          <div class="mini-context">${escapeHtml(p.depthChartRole || p.aiAnalysis || "Ranking profile")}</div>
        </div>
        <span class="position-pill ${p.position.toLowerCase()}">${p.position}</span>
        <span>#${Math.round(p.consensusRank)}</span>
        <span>${Number.isFinite(p.adp) ? p.adp.toFixed(1) : "-"}</span>
        <span>${projectionForPlayer(p).toFixed(1)}</span>
        <span>${p.sourceCount || 1}</span>
        <span class="fit-pill">${fitLabelForPlayer(p, targetTeam, state.currentPick)}</span>
      </div>
    `)
    .join("")}
  `;
}

function renderDraftAssistant() {
  if (!state.assistantMessages.length) {
    state.assistantMessages = [{
      role: "assistant",
      text: "Ask me who to pick, what your roster needs are, or try: \"If I go RB here, show me the next positions for my next 3 picks.\"",
      createdAt: Date.now(),
    }];
  }
  $("assistantMessages").innerHTML = state.assistantMessages.map((message) => `
    <div class="assistant-message ${message.role === "user" ? "user" : "assistant"}">
      <div class="assistant-role">${message.role === "user" ? "You" : "Assistant"}</div>
      <div class="assistant-text">${escapeHtml(message.text).replace(/\n/g, "<br>")}</div>
    </div>
  `).join("");
  $("assistantMessages").scrollTop = $("assistantMessages").scrollHeight;
}

function formatTradeValue(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function keeperTradeAssetValue(keeperAsset) {
  if (!keeperAsset) return 0;
  return Number.isFinite(keeperAsset.tradeValue)
    ? keeperAsset.tradeValue
    : Number.isFinite(keeperAsset.marketValue)
      ? keeperAsset.marketValue
      : keeperAsset.surplus || 0;
}

function selectedPickCards(team, selectedPicks, side) {
  const selected = new Set(selectedPicks.map(Number));
  const owned = allOwnedPickOptions(team);
  if (!owned.length) return `<p class="empty">No picks found for ${escapeHtml(teamName(team))}.</p>`;
  return owned.map((item) => {
    const value = adjustedPickValueForTeam(side === "A" ? state.trade.teamB : state.trade.teamA, item.pick);
    return `
      <label class="trade-pick-chip ${selected.has(item.pick) ? "selected" : ""}">
        <input data-trade-pick-${side}="${item.pick}" type="checkbox" ${selected.has(item.pick) ? "checked" : ""} />
        <span>${item.label}</span>
        <small>Pick ${item.pick} - ${formatTradeValue(value)}</small>
      </label>
    `;
  }).join("");
}

function tradeKeeperInput(side, receivingTeam) {
  const playerName = state.trade[`keeperPlayer${side}`];
  const round = state.trade[`keeperRound${side}`];
  const player = playerFromName(playerName);
  return keeperAssetValue(player, round, receivingTeam);
}

function tradePackageDetails(pickNumbers, receivingTeam, keeperAsset) {
  const picks = pickNumbers.map(Number).sort((a, b) => a - b).map((pick) => {
    const order = draftOrderFor(pick);
    return {
      pick,
      label: order.label,
      value: adjustedPickValueForTeam(receivingTeam, pick),
    };
  });
  const pickValue = picks.reduce((sum, item) => sum + item.value, 0);
  const keeperValue = keeperTradeAssetValue(keeperAsset);
  return {
    picks,
    pickValue,
    keeperAsset,
    total: pickValue + keeperValue,
  };
}

function tradeEvaluation() {
  const teamA = state.trade.teamA;
  const teamB = state.trade.teamB;
  const aKeeper = tradeKeeperInput("A", teamB);
  const bKeeper = tradeKeeperInput("B", teamA);
  const aSends = tradePackageDetails(state.trade.picksA, teamB, aKeeper);
  const bSends = tradePackageDetails(state.trade.picksB, teamA, bKeeper);
  const aBefore = teamPickInventoryValue(teamA);
  const bBefore = teamPickInventoryValue(teamB);
  const aAfterPicks = teamPickInventoryValue(teamA, state.trade.picksB, state.trade.picksA);
  const bAfterPicks = teamPickInventoryValue(teamB, state.trade.picksA, state.trade.picksB);
  const netForA = bSends.total - aSends.total;
  const netForB = aSends.total - bSends.total;
  const bigger = Math.max(aSends.total, bSends.total, 1);
  const smaller = Math.min(aSends.total, bSends.total);
  const fairness = Math.round((smaller / bigger) * 100);
  const verdict = fairness >= 92
    ? "Very balanced trade"
    : netForA > 0
      ? `${teamName(teamA)} gains more value`
      : `${teamName(teamB)} gains more value`;
  return { teamA, teamB, aSends, bSends, aBefore, bBefore, aAfterPicks, bAfterPicks, netForA, netForB, fairness, verdict };
}

function tradePackageRows(packageDetails) {
  const pickRows = packageDetails.picks.map((item) => `<li>${item.label} pick ${item.pick}: ${formatTradeValue(item.value)}</li>`).join("");
  const keeper = packageDetails.keeperAsset;
  const keeperRow = keeper
    ? `<li>${escapeHtml(keeper.player.name)} ${keeper.player.position} keeper in Round ${keeper.round}: ${formatTradeValue(keeperTradeAssetValue(keeper))} trade value <small>Current market pick ${Math.round(keeper.marketPick)}, keeper-cost pick around ${Math.round(keeper.costPick)}, ${formatTradeValue(keeper.surplus)} surplus</small></li>`
    : "";
  return pickRows || keeperRow ? `${pickRows}${keeperRow}` : "<li>No assets selected.</li>";
}

function keeperAssetLabel(keeperAsset) {
  return keeperAsset
    ? `${keeperAsset.player.name} keeper (Round ${keeperAsset.round})`
    : "";
}

function packageLabel(picks, keeperAsset = null) {
  const pickText = picks
    .map((pick) => {
      const order = draftOrderFor(pick);
      return `${order.label} (${pick})`;
    })
    .join(" + ");
  return [pickText, keeperAssetLabel(keeperAsset)].filter(Boolean).join(" + ") || "No assets";
}

function pickLabel(pick) {
  const order = draftOrderFor(pick);
  return `${order.label} / pick ${pick}`;
}

function pickPackageValue(picks, receivingTeam) {
  return picks.reduce((sum, pick) => sum + adjustedPickValueForTeam(receivingTeam, pick), 0);
}

function teamPicksAfterTrade(team, incomingPicks = [], outgoingPicks = []) {
  const outgoing = new Set(outgoingPicks.map(Number));
  const incoming = new Set(incomingPicks.map(Number));
  const picks = allOwnedPickOptions(team)
    .map((item) => item.pick)
    .filter((pick) => !outgoing.has(pick));
  incoming.forEach((pick) => picks.push(pick));
  return picks;
}

function canTeamKeepAssetAfterTrade(team, keeperAsset, incomingPicks = [], outgoingPicks = []) {
  if (!keeperAsset) return true;
  const keeperRound = Number(keeperAsset.round);
  if (!keeperRound) return false;
  return teamPicksAfterTrade(team, incomingPicks, outgoingPicks)
    .some((pick) => draftOrderFor(pick).round === keeperRound);
}

function keeperCostRoundLabel(team, keeperAsset, incomingPicks = [], outgoingPicks = []) {
  if (!keeperAsset) return "";
  const matchingPick = teamPicksAfterTrade(team, incomingPicks, outgoingPicks)
    .sort((a, b) => a - b)
    .find((pick) => draftOrderFor(pick).round === Number(keeperAsset.round));
  return matchingPick ? pickLabel(matchingPick) : `Round ${keeperAsset.round}`;
}

function designatedKeeperContext(team) {
  const selection = state.keeperSelections[team - 1];
  if (!selection?.playerId || !selection.round) return null;
  const player = PLAYERS.find((candidate) => candidate.id === selection.playerId);
  return keeperAssetValue(player, selection.round, team);
}

function importedKeeperCandidatesForTeam(team) {
  const importedTeam = state.sleeper.importData?.teams?.[team - 1];
  if (!importedTeam?.keeperCandidates?.length) return [];
  return importedTeam.keeperCandidates
    .map((candidate) => {
      const player = playerById(candidate.playerId);
      if (!player) return null;
      const value = keeperAssetValue(player, candidate.round, team);
      return {
        ...candidate,
        player,
        surplus: value?.surplus ?? candidate.surplus ?? 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.surplus - a.surplus);
}

function bestImportedKeeperCandidate(team) {
  return importedKeeperCandidatesForTeam(team)[0] || null;
}

function keeperCandidateAsset(candidate, receivingTeam) {
  if (!candidate?.player || !candidate.round) return null;
  return keeperAssetValue(candidate.player, candidate.round, receivingTeam);
}

function tradePackageCandidates(team, receivingTeam, includeKeepers = false) {
  const owned = allOwnedPickOptions(team).map((item) => item.pick).sort((a, b) => a - b);
  const candidates = owned.map((pick) => ({
    picks: [pick],
    keeper: null,
    value: adjustedPickValueForTeam(receivingTeam, pick),
  }));
  if (includeKeepers) {
    importedKeeperCandidatesForTeam(team)
      .slice(0, 5)
      .forEach((candidate) => {
        const keeper = keeperCandidateAsset(candidate, receivingTeam);
        if (!keeper || keeper.surplus <= 0) return;
        candidates.push({
          picks: [],
          keeper,
          value: keeperTradeAssetValue(keeper),
        });
        owned
          .filter((pick) => draftOrderFor(pick).round >= 7)
          .slice(0, 8)
          .forEach((pick) => {
            candidates.push({
              picks: [pick],
              keeper,
              value: adjustedPickValueForTeam(receivingTeam, pick) + keeperTradeAssetValue(keeper),
            });
          });
      });
  }

  for (let i = 0; i < owned.length; i += 1) {
    for (let j = i + 1; j < owned.length; j += 1) {
      const first = owned[i];
      const second = owned[j];
      const firstRound = draftOrderFor(first).round;
      const secondRound = draftOrderFor(second).round;
      const usefulPair =
        firstRound <= 6 ||
        secondRound - firstRound <= 4 ||
        (firstRound >= 8 && secondRound >= 8 && candidates.length < 90);
      if (!usefulPair) continue;
      const picks = [first, second];
      candidates.push({ picks, keeper: null, value: pickPackageValue(picks, receivingTeam) });
    }
  }

  return candidates
    .sort((a, b) => b.value - a.value)
    .slice(0, 95);
}

function teamTradeProfile(team) {
  const picks = allOwnedPickOptions(team).map((item) => item.pick).sort((a, b) => a - b);
  const rounds = new Set(picks.map((pick) => draftOrderFor(pick).round));
  const keeper = designatedKeeperContext(team);
  const importedKeeperCandidates = importedKeeperCandidatesForTeam(team);
  const importedBestKeeper = importedKeeperCandidates[0] || null;
  return {
    team,
    picks,
    pickCount: picks.length,
    value: teamPickInventoryValue(team),
    firstPick: picks[0] || 999,
    earlyPicks: picks.filter((pick) => draftOrderFor(pick).round <= 5).length,
    missingRounds: Array.from({ length: LEAGUE.rounds }, (_, index) => index + 1).filter((round) => !rounds.has(round)),
    keeper,
    keeperSurplus: keeper?.surplus || 0,
    importedKeeperCandidates,
    importedBestKeeper,
    importedKeeperSurplus: importedBestKeeper?.surplus || 0,
  };
}

function packageFitNotes(receivingTeam, receivedPicks, sentPicks, includeKeepers, profileOverride = null, receivedKeeper = null, sentKeeper = null) {
  const profile = profileOverride || teamTradeProfile(receivingTeam);
  const notes = [];
  const concerns = [];
  let score = 0;
  const receivedSorted = [...receivedPicks].sort((a, b) => a - b);
  const sentSorted = [...sentPicks].sort((a, b) => a - b);
  const receivedBest = receivedSorted[0];
  const sentBest = sentSorted[0] || 999;
  const receivedValue = pickPackageValue(receivedPicks, receivingTeam) + keeperTradeAssetValue(receivedKeeper);
  const sentValue = pickPackageValue(sentPicks, receivingTeam) + keeperTradeAssetValue(sentKeeper);
  const netValue = receivedValue - sentValue;
  const bestPickDelta = receivedBest ? sentBest - receivedBest : 0;
  const receivedRounds = receivedPicks.map((pick) => draftOrderFor(pick).round);
  const missingRoundHit = receivedRounds.find((round) => profile.missingRounds.includes(round));

  if (receivedKeeper) {
    const keeperText = `${receivedKeeper.player.name} in Round ${receivedKeeper.round}`;
    const keeperCostText = keeperCostRoundLabel(receivingTeam, receivedKeeper, receivedPicks, sentPicks);
    const marketRound = Math.max(1, Math.ceil(receivedKeeper.marketPick / LEAGUE.teams));
    const marketText = `current Round ${marketRound} market value`;
    if (receivedKeeper.surplus >= 15) {
      score += 4;
      notes.push(`${teamName(receivingTeam)} can trade for ${keeperText}, priced as ${marketText} with ${formatTradeValue(receivedKeeper.surplus)} keeper surplus; keeping him would consume ${keeperCostText}.`);
    } else if (receivedKeeper.surplus >= 6) {
      score += 2.5;
      notes.push(`${teamName(receivingTeam)} gets ${keeperText} as a keeper option, priced from ${marketText} rather than the keeper round alone; keeping him would consume ${keeperCostText}.`);
    } else {
      score += 1;
      notes.push(`${teamName(receivingTeam)} gets ${keeperText} as a keeper option with modest surplus, still priced from ${marketText}; keeping him would consume ${keeperCostText}.`);
    }
  }
  if (sentKeeper) {
    concerns.push(`${teamName(receivingTeam)} gives up ${sentKeeper.player.name}'s Round ${sentKeeper.round} keeper rights.`);
  }

  if (receivedBest && sentSorted.length && bestPickDelta >= 4) {
    const premiumText = netValue >= 0 ? `while gaining ${formatTradeValue(netValue)} value` : `while paying ${formatTradeValue(Math.abs(netValue))} value`;
    score += receivedBest <= LEAGUE.teams * 5 ? 4.5 : 2.5;
    notes.push(`${teamName(receivingTeam)} moves up ${bestPickDelta} slots from ${pickLabel(sentBest)} to ${pickLabel(receivedBest)} ${premiumText}.`);
  } else if (receivedBest && sentSorted.length && bestPickDelta <= -4) {
    const compensationPick = receivedSorted.find((pick, index) => pick < (sentSorted[index] || 999) && pick !== receivedBest);
    const valueText = netValue >= 0 ? `adds ${formatTradeValue(netValue)} value` : `gives up ${formatTradeValue(Math.abs(netValue))} value`;
    score += netValue >= -2 ? 2.5 : 0.5;
    notes.push(`${teamName(receivingTeam)} moves back ${Math.abs(bestPickDelta)} slots from ${pickLabel(sentBest)} to ${pickLabel(receivedBest)} and ${valueText}${compensationPick ? `, helped by improving another slot to ${pickLabel(compensationPick)}` : ""}.`);
    if (netValue < -4) concerns.push(`${teamName(receivingTeam)} is moving back without enough value compensation.`);
  } else if (receivedPicks.length || sentPicks.length) {
    score += Math.abs(netValue) <= 2 ? 0.5 : 0;
    if (!receivedKeeper) concerns.push(`${teamName(receivingTeam)} gets only a small best-pick movement, so this needs a specific room-read reason.`);
  }

  if (receivedPicks.length > sentPicks.length) {
    score += profile.pickCount < LEAGUE.rounds ? 4 : 1;
    notes.push(`${teamName(receivingTeam)} adds pick volume${profile.pickCount < LEAGUE.rounds ? " after sitting below the standard pick count" : ""}.`);
  }
  if (receivedPicks.length < sentPicks.length) {
    score += profile.pickCount > LEAGUE.rounds ? 4 : 1.5;
    notes.push(`${teamName(receivingTeam)} consolidates extra capital into a tighter pick package.`);
  }
  if (missingRoundHit) {
    score += 2.5;
    notes.push(`${teamName(receivingTeam)} fills a gap in Round ${missingRoundHit}.`);
  }
  if (receivedSorted.length > 1 && sentSorted.length > 1) {
    const secondaryGain = sentSorted.slice(1).reduce((best, pick, index) => {
      const receivedPick = receivedSorted[index + 1];
      if (!receivedPick) return best;
      return Math.max(best, pick - receivedPick);
    }, 0);
    if (secondaryGain >= 4) {
      score += 2;
      notes.push(`${teamName(receivingTeam)} also improves a secondary pick by ${secondaryGain} slots, so this is not just a headline-pick swap.`);
    }
  }
  if (includeKeepers && profile.keeper) {
    const keeperText = `${profile.keeper.player.name} in Round ${profile.keeper.round}`;
    if (profile.keeperSurplus >= 15 && receivedPicks.length <= sentPicks.length) {
      score += 3;
      notes.push(`${teamName(receivingTeam)} already has keeper surplus from ${keeperText}, so consolidating picks is easier to justify.`);
    } else if (profile.keeperSurplus < 8 && receivedPicks.length >= sentPicks.length) {
      score += 2;
      notes.push(`${teamName(receivingTeam)} does not have a major keeper discount from ${keeperText}, so extra draft capital matters more.`);
    } else {
      score += 1;
      notes.push(`${teamName(receivingTeam)}'s keeper value from ${keeperText} is included in the fit check.`);
    }
  }
  if (includeKeepers && !profile.keeper && profile.importedBestKeeper) {
    const candidate = profile.importedBestKeeper;
    const candidateText = `${candidate.player.name} in Round ${candidate.round}`;
    if (candidate.surplus >= 15 && receivedPicks.length <= sentPicks.length) {
      score += 2.5;
      notes.push(`${teamName(receivingTeam)} has a Sleeper-imported keeper candidate discount from ${candidateText}, so consolidating picks can make sense.`);
    } else if (candidate.surplus >= 8 && receivedPicks.length >= sentPicks.length) {
      score += 1.5;
      notes.push(`${teamName(receivingTeam)} has possible keeper value from ${candidateText}, but still benefits from preserving pick volume.`);
    } else {
      score += 0.75;
      notes.push(`${teamName(receivingTeam)}'s imported Sleeper roster shows ${candidateText} as a possible keeper, used only as keeper-candidate context.`);
    }
    if (profile.importedKeeperCandidates.length > 1) {
      notes.push(`${teamName(receivingTeam)} has ${profile.importedKeeperCandidates.length} imported keeper candidates; these are not treated as a projected roster.`);
    }
  }

  if (netValue < -6) {
    score -= 2.5;
    concerns.push(`${teamName(receivingTeam)} takes a meaningful value loss on its own team-adjusted board.`);
  }

  return { score, notes, concerns, netValue, bestPickDelta };
}

function generateTradeIdeas() {
  const threshold = Math.max(80, Math.min(100, Number(state.tradeFinder.threshold) || 95));
  const focusTeam = state.tradeFinder.focusTeam === "all" ? "all" : Number(state.tradeFinder.focusTeam);
  const includeKeepers = Boolean(state.tradeFinder.includeKeepers);
  const requireEqualPicks = Boolean(state.tradeFinder.requireEqualPicks);
  const ideas = [];
  const pairs = [];
  const profiles = new Map(Array.from({ length: LEAGUE.teams }, (_, index) => {
    const team = index + 1;
    return [team, teamTradeProfile(team)];
  }));

  for (let teamA = 1; teamA <= LEAGUE.teams; teamA += 1) {
    for (let teamB = teamA + 1; teamB <= LEAGUE.teams; teamB += 1) {
      if (focusTeam !== "all" && teamA !== focusTeam && teamB !== focusTeam) continue;
      pairs.push([teamA, teamB]);
    }
  }

  pairs.forEach(([teamA, teamB]) => {
    const packagesA = tradePackageCandidates(teamA, teamB, includeKeepers);
    const packagesB = tradePackageCandidates(teamB, teamA, includeKeepers);
    packagesA.forEach((aPackage) => {
      packagesB.forEach((bPackage) => {
        const hasKeeperAsset = Boolean(aPackage.keeper || bPackage.keeper);
        if (requireEqualPicks && !hasKeeperAsset && aPackage.picks.length !== bPackage.picks.length) return;
        if (!canTeamKeepAssetAfterTrade(teamA, bPackage.keeper, bPackage.picks, aPackage.picks)) return;
        if (!canTeamKeepAssetAfterTrade(teamB, aPackage.keeper, aPackage.picks, bPackage.picks)) return;
        const bigger = Math.max(aPackage.value, bPackage.value, 1);
        const smaller = Math.min(aPackage.value, bPackage.value);
        const valueMatch = Math.round((smaller / bigger) * 100);
        if (valueMatch < threshold) return;

        const aFit = packageFitNotes(teamA, bPackage.picks, aPackage.picks, includeKeepers, profiles.get(teamA), bPackage.keeper, aPackage.keeper);
        const bFit = packageFitNotes(teamB, aPackage.picks, bPackage.picks, includeKeepers, profiles.get(teamB), aPackage.keeper, bPackage.keeper);
        const strategicScore = aFit.score + bFit.score;
        const hasRealMovement = Math.max(Math.abs(aFit.bestPickDelta), Math.abs(bFit.bestPickDelta)) >= 5;
        const hasKeeperOrRoundReason =
          hasKeeperAsset ||
          (includeKeepers && (
            profiles.get(teamA)?.keeper ||
            profiles.get(teamB)?.keeper ||
            profiles.get(teamA)?.importedBestKeeper ||
            profiles.get(teamB)?.importedBestKeeper
          )) ||
          [...aFit.notes, ...bFit.notes].some((note) => /fills a gap|secondary pick|keeper surplus|pick volume|consolidates/.test(note));
        if (strategicScore < 5 || (!hasRealMovement && !hasKeeperOrRoundReason)) return;
        if (aFit.concerns.length && bFit.concerns.length && valueMatch < 98) return;

        const ideaScore = valueMatch + strategicScore - Math.abs(100 - valueMatch) * 0.2;
        ideas.push({
          id: `${teamA}-${teamB}-${aPackage.picks.join("_") || "nopicks"}-${aPackage.keeper?.player.id || "nokeep"}-${bPackage.picks.join("_") || "nopicks"}-${bPackage.keeper?.player.id || "nokeep"}`,
          teamA,
          teamB,
          picksA: aPackage.picks,
          picksB: bPackage.picks,
          keeperA: aPackage.keeper,
          keeperB: bPackage.keeper,
          valueA: aPackage.value,
          valueB: bPackage.value,
          valueMatch,
          score: ideaScore,
          rationaleA: aFit.notes.slice(0, 3),
          rationaleB: bFit.notes.slice(0, 3),
          concerns: [...aFit.concerns, ...bFit.concerns].slice(0, 2),
        });
      });
    });
  });

  state.tradeFinder.ideas = ideas
    .sort((a, b) => b.score - a.score || b.valueMatch - a.valueMatch)
    .slice(0, 12);
  state.tradeFinder.hasRun = true;
  renderTradeFinder();
}

function renderSleeperImport() {
  if (!$("sleeperImportSummary")) return;
  if ($("sleeperUsernameInput")) $("sleeperUsernameInput").value = state.sleeper.username || $("sleeperUsernameInput").value || "";
  if ($("sleeperSeasonInput")) $("sleeperSeasonInput").value = state.sleeper.season || SLEEPER_DEFAULT_SEASON;
  if ($("sleeperLeagueSelect")) {
    $("sleeperLeagueSelect").innerHTML = state.sleeper.leagues.length
      ? state.sleeper.leagues.map((league) => `
        <option value="${league.league_id}" ${String(league.league_id) === String(state.sleeper.selectedLeagueId) ? "selected" : ""}>
          ${escapeHtml(league.name || "Sleeper league")} (${escapeHtml(league.status || "league")})
        </option>
      `).join("")
      : `<option value="">Find leagues first</option>`;
    $("sleeperLeagueSelect").value = state.sleeper.selectedLeagueId || "";
  }
  if ($("sleeperLoadLeaguesBtn")) $("sleeperLoadLeaguesBtn").disabled = state.sleeper.loading;
  if ($("sleeperImportBtn")) $("sleeperImportBtn").disabled = state.sleeper.loading || !state.sleeper.selectedLeagueId;
  $("sleeperImportStatus").textContent = state.sleeper.status || "No Sleeper league imported yet.";

  const importData = state.sleeper.importData;
  if (!importData) {
    $("sleeperImportSummary").innerHTML = `<p class="empty">Importing a Sleeper league updates team names and saves roster-based keeper options for the trade idea finder.</p>`;
    return;
  }
  const candidateCount = importData.teams.reduce((sum, team) => sum + team.keeperCandidates.length, 0);
  const topTeams = importData.teams
    .map((team) => ({ team, best: bestImportedKeeperCandidate(team.team) }))
    .filter((item) => item.best)
    .sort((a, b) => b.best.surplus - a.best.surplus)
    .slice(0, 4);
  $("sleeperImportSummary").innerHTML = `
    <div class="sleeper-summary-head">
      <strong>${escapeHtml(importData.leagueName)}</strong>
      <span>${escapeHtml(importData.season)} league - ${importData.teams.length} teams - ${candidateCount} keeper candidates${importData.usedPreviousLeagueForKeepers ? ` from ${escapeHtml(importData.keeperSourceSeason)}` : ""}</span>
    </div>
    <p class="helper">Team names were assigned from the imported league, your team was matched from the Sleeper user, and traded picks were applied to Pick Order. ${importData.usedPreviousLeagueForKeepers ? `Because the imported ${escapeHtml(importData.season)} league did not have usable roster/draft history yet, keeper options came from the linked ${escapeHtml(importData.keeperSourceSeason)} league. ` : ""}Rostered players are saved only as keeper options; they do not create upcoming-season roster needs in the trade finder.</p>
    <div class="sleeper-candidate-grid">
      ${topTeams.length ? topTeams.map(({ team, best }) => `
        <div class="sleeper-candidate-card">
          <strong>${escapeHtml(teamName(team.team))}</strong>
          <span>${escapeHtml(best.player.name)} - Round ${best.round}</span>
          <small>${formatTradeValue(best.surplus)} keeper surplus</small>
        </div>
      `).join("") : `<p class="empty">No ranked roster players matched last year's draft rounds yet.</p>`}
    </div>
  `;
}

function renderTradeFinder() {
  if (!$("tradeFinderResults")) return;
  if ($("tradeFinderTeam")) {
    $("tradeFinderTeam").value = state.tradeFinder.focusTeam;
    $("tradeFinderThreshold").value = state.tradeFinder.threshold;
    $("tradeFinderKeepers").checked = state.tradeFinder.includeKeepers;
    $("tradeFinderEqualPicks").checked = state.tradeFinder.requireEqualPicks;
  }
  if (!state.tradeFinder.hasRun) {
    const keeperContext = state.sleeper.importData
      ? ` Sleeper keeper options from ${escapeHtml(state.sleeper.importData.leagueName)} are available when the checkbox is on.`
      : " Import a Sleeper league in the League tab to add roster-based keeper options.";
    $("tradeFinderResults").innerHTML = `<p class="empty">Run the finder to surface balanced trade ideas from the current pick board.${keeperContext}</p>`;
    return;
  }
  if (!state.tradeFinder.ideas.length) {
    const equalPickNote = state.tradeFinder.requireEqualPicks ? " The equal-pick-count rule only filters pick-only ideas; keeper-player ideas can still be player-for-picks." : "";
    $("tradeFinderResults").innerHTML = `<p class="empty">No trades met the ${state.tradeFinder.threshold}% value match. Try lowering the threshold or changing the focus team.${equalPickNote}</p>`;
    return;
  }
  $("tradeFinderResults").innerHTML = state.tradeFinder.ideas.map((idea, index) => `
    <article class="trade-idea-card">
      <div class="trade-idea-head">
        <div>
          <p class="eyebrow">Idea ${index + 1}</p>
          <h4>${escapeHtml(teamName(idea.teamA))} <> ${escapeHtml(teamName(idea.teamB))}</h4>
        </div>
        <span class="status-pill live">${idea.valueMatch}% value</span>
      </div>
      <div class="trade-idea-packages">
        <div>
          <strong>${escapeHtml(teamName(idea.teamA))} sends</strong>
          <span>${escapeHtml(packageLabel(idea.picksA, idea.keeperA))}</span>
          <small>${formatTradeValue(idea.valueA)} value to ${escapeHtml(teamName(idea.teamB))}</small>
        </div>
        <div>
          <strong>${escapeHtml(teamName(idea.teamB))} sends</strong>
          <span>${escapeHtml(packageLabel(idea.picksB, idea.keeperB))}</span>
          <small>${formatTradeValue(idea.valueB)} value to ${escapeHtml(teamName(idea.teamA))}</small>
        </div>
      </div>
      <div class="trade-idea-rationale">
        <div>
          <strong>Why ${escapeHtml(teamName(idea.teamA))} considers it</strong>
          <ul>${idea.rationaleA.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        </div>
        <div>
          <strong>Why ${escapeHtml(teamName(idea.teamB))} considers it</strong>
          <ul>${idea.rationaleB.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        </div>
      </div>
      ${idea.concerns.length ? `<p class="trade-idea-warning"><strong>Watch-out:</strong> ${escapeHtml(idea.concerns.join(" "))}</p>` : ""}
      <button data-load-trade-idea="${idea.id}" type="button">Load in calculator</button>
    </article>
  `).join("");
}

function renderTradeCalculator() {
  state.trade.teamA = Math.max(1, Math.min(LEAGUE.teams, Number(state.trade.teamA) || 1));
  state.trade.teamB = Math.max(1, Math.min(LEAGUE.teams, Number(state.trade.teamB) || Math.min(2, LEAGUE.teams)));
  if (state.trade.teamA === state.trade.teamB) state.trade.teamB = state.trade.teamA === LEAGUE.teams ? 1 : state.trade.teamA + 1;
  state.trade.picksA = state.trade.picksA.filter((pick) => draftOrderFor(Number(pick)).team === state.trade.teamA);
  state.trade.picksB = state.trade.picksB.filter((pick) => draftOrderFor(Number(pick)).team === state.trade.teamB);

  $("tradeTeamA").value = state.trade.teamA;
  $("tradeTeamB").value = state.trade.teamB;
  $("tradeKeeperPlayerA").value = state.trade.keeperPlayerA;
  $("tradeKeeperRoundA").value = state.trade.keeperRoundA;
  $("tradeKeeperPlayerB").value = state.trade.keeperPlayerB;
  $("tradeKeeperRoundB").value = state.trade.keeperRoundB;
  $("tradePicksA").innerHTML = selectedPickCards(state.trade.teamA, state.trade.picksA, "A");
  $("tradePicksB").innerHTML = selectedPickCards(state.trade.teamB, state.trade.picksB, "B");

  const result = tradeEvaluation();
  const aPickDelta = result.aAfterPicks - result.aBefore;
  const bPickDelta = result.bAfterPicks - result.bBefore;
  const contextNote = result.fairness >= 92
    ? "The value is close enough that team need, favorite keeper targets, and draft-room preferences should decide it."
    : "A gap under 92% usually needs another mid/late pick or a keeper-value adjustment to feel even.";
  $("tradeResults").innerHTML = `
    <div class="trade-verdict">
      <div>
        <p class="eyebrow">Verdict</p>
        <h3>${escapeHtml(result.verdict)}</h3>
        <p>${result.fairness}% value match. ${contextNote}</p>
      </div>
      <div class="trade-score">
        <strong>${formatTradeValue(result.aSends.total)}</strong>
        <span>${escapeHtml(teamName(result.teamA))} sends</span>
      </div>
      <div class="trade-score">
        <strong>${formatTradeValue(result.bSends.total)}</strong>
        <span>${escapeHtml(teamName(result.teamB))} sends</span>
      </div>
    </div>
    <div class="trade-results-grid">
      <section>
        <h3>${escapeHtml(teamName(result.teamA))} receives from ${escapeHtml(teamName(result.teamB))}</h3>
        <ul>${tradePackageRows(result.bSends)}</ul>
        <p><strong>Net total value:</strong> ${formatTradeValue(result.netForA)}</p>
        <p><strong>Pick capital change:</strong> ${formatTradeValue(aPickDelta)} (${formatTradeValue(result.aBefore)} to ${formatTradeValue(result.aAfterPicks)})</p>
      </section>
      <section>
        <h3>${escapeHtml(teamName(result.teamB))} receives from ${escapeHtml(teamName(result.teamA))}</h3>
        <ul>${tradePackageRows(result.aSends)}</ul>
        <p><strong>Net total value:</strong> ${formatTradeValue(result.netForB)}</p>
        <p><strong>Pick capital change:</strong> ${formatTradeValue(bPickDelta)} (${formatTradeValue(result.bBefore)} to ${formatTradeValue(result.bAfterPicks)})</p>
      </section>
      <section class="trade-method">
        <h3>Method</h3>
        <p>Pick values use a curved draft-capital model: early picks are worth disproportionately more, starter-window picks receive a league-settings premium, and late-round picks are discounted so volume cannot overwhelm premium slots.</p>
        <p>Team-specific value adjusts for whether a team is short on total draft capital, missing a pick in that round, has multiple picks in that round, or is filling a large gap between selections. Those context boosts shrink in late rounds.</p>
        <p>Keeper-player trade assets are priced from current market-pick value. The keeper round is treated as the future pick cost and eligibility requirement, while surplus shows the discount versus that cost.</p>
      </section>
    </div>
  `;
  renderTradeFinder();
}

function percent(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.0";
}

function runDetailCard(run, label) {
  if (!run) return "";
  const picks = run.userPicks.slice(0, 8).map((pick) => `<li>${pick.label}: ${escapeHtml(pick.player.name)} (${pick.player.position})</li>`).join("");
  const strengths = run.strengths.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const weaknesses = run.weaknesses.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <button class="bulk-example-card ${state.bulk.selectedRunId === run.id ? "active" : ""}" data-bulk-run="${run.id}" type="button">
      <span>${label}</span>
      <strong>${run.strategyLabel} - ${run.firstFiveBuild}</strong>
      <small>${formatNumber(run.weeklyProjection)} starter pts - rank #${run.rank} - ${run.playoffOdds}% playoffs</small>
    </button>
    ${state.bulk.selectedRunId === run.id ? `
      <div class="bulk-run-detail">
        <h3>${label}: ${run.strategyLabel}</h3>
        <p><strong>First five:</strong> ${run.firstFivePlayers.map(escapeHtml).join(", ")}</p>
        <div class="bulk-detail-grid">
          <section>
            <h4>Early Picks</h4>
            <ul>${picks}</ul>
          </section>
          <section>
            <h4>Strengths</h4>
            <ul>${strengths || "<li>No clear standout strength.</li>"}</ul>
          </section>
          <section>
            <h4>Risks</h4>
            <ul>${weaknesses || "<li>No major structural risk.</li>"}</ul>
          </section>
        </div>
      </div>
    ` : ""}
  `;
}

function renderBulkSimulator() {
  $("bulkCountInput").value = state.bulk.count;
  $("bulkModeSelect").value = state.bulk.mode;
  $("bulkStrategySelect").value = state.bulk.strategy;
  $("bulkRandomizeRoomInput").checked = state.bulk.randomizeRoom;
  updateBulkProgress();

  const data = state.bulk.results;
  if (!data?.summary) {
    $("bulkResults").innerHTML = `
      <div class="bulk-empty">
        <h3>Run a strategy batch to find your strongest paths.</h3>
        <p>The first run will compare strategies, rank first-five-round position builds, and show which players most often land on your roster.</p>
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

  $("bulkResults").innerHTML = `
    <div class="bulk-hero">
      <div>
        <p class="eyebrow">Best path</p>
        <h3>${escapeHtml(summary.bestStrategy?.label || "Run simulations")}: ${escapeHtml(summary.bestBuild?.label || "No build yet")}</h3>
        <p>${summary.totalRuns} simulations. Best build averaged ${formatNumber(summary.bestBuild?.avgProjection)} starter points with a ${percent(summary.bestBuild?.top3Rate)} top-3 rate.</p>
      </div>
      <div><strong>${formatNumber(summary.bestStrategy?.avgProjection)}</strong><span>Best strategy avg starter pts</span></div>
      <div><strong>${percent(summary.bestStrategy?.top3Rate)}</strong><span>Best strategy top-3 rate</span></div>
    </div>
    <div class="bulk-grid">
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
        <h3>Most Common Targets</h3>
        <div class="bulk-player-list">${playerRows || `<p class="empty">No target data yet.</p>`}</div>
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
}

function renderSourceStatus() {
  const sources = state.rankingSources.map((source) => {
    const isSeed = source.name === SEED_SOURCE.name;
    return `
    <div class="source-chip">
      <strong>${source.name}</strong>
      <span>${source.rows} players - ${source.status}</span>
      <small>${source.updatedAt}</small>
      <button data-remove-ranking-source="${escapeHtml(source.name)}" type="button">${isSeed ? "Disable seed" : "Remove"}</button>
    </div>
  `;
  }).join("");
  const restoreSeed = state.seedRankingsEnabled ? "" : `
    <div class="source-chip is-disabled">
      <strong>${SEED_SOURCE.name}</strong>
      <span>Disabled</span>
      <small>Upload-only rankings are active.</small>
      <button data-restore-seed-rankings="true" type="button">Restore seed</button>
    </div>
  `;
  const activeCount = PLAYERS.length;
  const sourceSummary = `
    <div class="source-chip source-summary">
      <strong>${activeCount} active players</strong>
      <span>${state.seedRankingsEnabled ? "Seed allowed" : "Seed disabled"}</span>
      <small>${state.importedRankingRows.length} uploaded ranking rows saved</small>
    </div>
  `;
  $("sourceStatus").innerHTML = sourceSummary + sources + restoreSeed;
}

function lineupSummary() {
  const r = LEAGUE.roster;
  return `${r.QB} QB, ${r.RB} RB, ${r.WR} WR, ${r.TE} TE, ${r.FLEX} Flex, ${r.K} K, ${r.DEF} DEF, ${r.BENCH} bench`;
}

function playerById(playerId) {
  return PLAYERS.find((player) => player.id === playerId) || null;
}

function playerByName(name) {
  const key = playerKey(name);
  return PLAYERS.find((player) => playerKey(player.name) === key) || null;
}

function keeperStatusForTeam(team, selection) {
  if (!selection?.playerId || !selection.round) return "No keeper selected.";
  const player = playerById(selection.playerId);
  if (!player) return "Player is no longer in the rankings database.";
  const keeperPick = keeperPickForTeam(team, selection);
  if (!keeperPick) return `${player.name} cannot be placed because this team owns no pick in Round ${selection.round}.`;
  return `${player.name} will fill pick ${keeperPick.label}.`;
}

function renderKeeperEditor(selections = state.keeperSelections, league = LEAGUE, names = state.teamNames) {
  $("keeperPlayerOptions").innerHTML = PLAYERS
    .map((player) => `<option value="${escapeHtml(player.name)}">${player.position} ${player.team}</option>`)
    .join("");
  $("keeperEditor").innerHTML = Array.from({ length: league.teams }, (_, index) => selections[index] || { playerId: "", round: "" }).map((selection, index) => {
    const team = index + 1;
    const player = playerById(selection.playerId);
    const roundOptions = [`<option value="">No keeper</option>`].concat(
      Array.from({ length: league.rounds }, (_, roundIndex) => {
        const round = roundIndex + 1;
        return `<option value="${round}" ${selection.round === round ? "selected" : ""}>Round ${round}</option>`;
      })
    ).join("");
    return `
      <div class="keeper-row">
        <strong>${escapeHtml(names[index] || `Team ${team}`)}</strong>
        <label>
          <span>Player</span>
          <input data-keeper-player="${index}" list="keeperPlayerOptions" value="${escapeHtml(player?.name || "")}" placeholder="No keeper" />
        </label>
        <label>
          <span>Round</span>
          <select data-keeper-round="${index}">${roundOptions}</select>
        </label>
        <p class="keeper-note">${escapeHtml(keeperStatusForTeam(team, selection))}</p>
      </div>
    `;
  }).join("");
}

function buildLeagueProfileFromForm() {
  const editedNames = [...document.querySelectorAll("[data-team-name]")]
    .map((input, index) => input.value.trim() || `Team ${index + 1}`);
  const roster = { ...LEAGUE.roster };
  document.querySelectorAll("[data-roster-setting]").forEach((input) => {
    roster[input.dataset.rosterSetting] = Math.max(0, Number(input.value) || 0);
  });
  const league = normalizeLeagueSettings({
    id: state.activeLeagueId || LEAGUE.id || "default",
    name: $("leagueNameInput").value.trim() || "Default League",
    teams: $("leagueTeamsInput").value,
    scoring: $("leagueScoringInput").value,
    rounds: $("leagueRoundsInput").value,
    roster,
    keeper: $("leagueKeeperInput").value,
    ensureCompleteRoster: $("leagueEnsureCompleteRosterInput").checked,
  });
  const selectedUserTeam = Math.max(1, Math.min(league.teams, Number($("leagueUserTeamSelect").value) || state.userTeam || 1));
  const fallbackOrders = resizeRoundOrders(state.roundOrders);
  return normalizeLeagueProfile({
    ...league,
    userTeam: selectedUserTeam,
    teamNames: Array.from({ length: league.teams }, (_, index) => editedNames[index] || state.teamNames[index] || `Team ${index + 1}`),
    roundOrders: fallbackOrders,
    keeperSelections: state.keeperSelections,
    teamPersonas: state.teamPersonas,
    sleeperImport: state.sleeper.importData,
  });
}

function saveLeagueProfileRecord(profile) {
  const existingIndex = state.leagueProfiles.findIndex((item) => item.id === profile.id);
  if (existingIndex >= 0) state.leagueProfiles[existingIndex] = normalizeLeagueProfile(profile);
  else state.leagueProfiles.push(normalizeLeagueProfile(profile));
  state.activeLeagueId = profile.id;
  saveLeagueProfiles();
}

function showRestartPrompt(message = "League profile saved. Restart now or keep drafting with the current board.") {
  state.leagueRestartPending = true;
  $("leagueRestartPrompt").hidden = false;
  $("leagueSettingsStatus").textContent = message;
}

function clearRestartPrompt() {
  state.leagueRestartPending = false;
  $("leagueRestartPrompt").hidden = true;
}

function applyPendingLeagueAndRestart() {
  if (state.pendingLeagueProfile) {
    applyLeagueProfile(state.pendingLeagueProfile);
    state.pendingLeagueProfile = null;
  }
  clearRestartPrompt();
  renderLeagueSettings();
  renderOrderEditor();
  setupTeamSelects();
  resetDraft();
}

function createLeagueProfile() {
  const id = `league-${Date.now()}`;
  const currentName = $("leagueNameInput").value.trim() || "League";
  const profile = buildLeagueProfileFromForm();
  const newProfile = normalizeLeagueProfile({
    ...profile,
    id,
    name: `${currentName}${state.leagueProfiles.some((item) => item.name === currentName) ? ` Copy ${state.leagueProfiles.length + 1}` : ""}`,
  });
  saveLeagueProfileRecord(newProfile);
  state.pendingLeagueProfile = newProfile;
  renderLeagueSettings();
  showRestartPrompt(`${newProfile.name} saved as a new league. Restart now to draft with it, or keep your current mock open.`);
}

function queueLeagueProfileSwitch(profileId) {
  const profile = state.leagueProfiles.find((item) => item.id === profileId);
  if (!profile) return;
  state.activeLeagueId = profile.id;
  state.pendingLeagueProfile = profile;
  saveLeagueProfiles();
  renderLeagueSettings();
  showRestartPrompt(`${profile.name} selected. Restart now to load it, or keep drafting with the current board.`);
}

function renderLeagueSettings() {
  const formProfile = state.pendingLeagueProfile || {
    ...LEAGUE,
    teamNames: state.teamNames,
    keeperSelections: state.keeperSelections,
  };
  const formLeague = normalizeLeagueSettings(formProfile);
  const formNames = Array.from({ length: formLeague.teams }, (_, index) => formProfile.teamNames?.[index] || `Team ${index + 1}`);
  const formUserTeam = Math.max(1, Math.min(formLeague.teams, Number(formProfile.userTeam) || state.userTeam || 1));
  const formKeepers = Array.from({ length: formLeague.teams }, (_, index) => {
    const selection = formProfile.keeperSelections?.[index] || {};
    const round = Number(selection.round);
    return {
      playerId: selection.playerId || "",
      round: round >= 1 && round <= formLeague.rounds ? round : "",
    };
  });
  $("leagueProfileSelect").innerHTML = state.leagueProfiles.map((profile) => `
    <option value="${profile.id}" ${profile.id === state.activeLeagueId ? "selected" : ""}>${escapeHtml(profile.name || "League")}</option>
  `).join("");
  $("leagueProfileList").innerHTML = state.leagueProfiles.map((profile) => {
    const league = normalizeLeagueSettings(profile);
    const isActive = profile.id === state.activeLeagueId;
    return `
      <div class="league-profile-card ${isActive ? "active" : ""}">
        <div>
          <strong>${escapeHtml(profile.name || "League")}</strong>
          <span>${league.teams} teams - ${league.scoring} - ${league.rounds} rounds</span>
        </div>
        <button data-load-league-profile="${profile.id}" type="button">${isActive ? "Selected" : "Use"}</button>
      </div>
    `;
  }).join("");
  $("leagueNameInput").value = formLeague.name || "Default League";
  $("leagueUserTeamSelect").innerHTML = Array.from({ length: formLeague.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}" ${team === formUserTeam ? "selected" : ""}>${escapeHtml(formNames[index])}</option>`;
  }).join("");
  $("leagueTeamsText").textContent = LEAGUE.teams;
  $("leagueScoringText").textContent = LEAGUE.scoring;
  $("leagueLineupText").textContent = lineupSummary();
  $("leagueDraftText").textContent = `${LEAGUE.rounds} rounds, ${LEAGUE.teams} picks/round`;
  $("leagueKeeperText").textContent = LEAGUE.keeper;
  $("leagueTeamsInput").value = formLeague.teams;
  $("leagueScoringInput").value = formLeague.scoring;
  $("leagueRoundsInput").value = formLeague.rounds;
  $("leagueKeeperInput").value = formLeague.keeper;
  $("leagueEnsureCompleteRosterInput").checked = formLeague.ensureCompleteRoster !== false;
  document.querySelectorAll("[data-roster-setting]").forEach((input) => {
    input.value = formLeague.roster[input.dataset.rosterSetting] ?? 0;
  });
  $("teamNameEditor").innerHTML = Array.from({ length: formLeague.teams }, (_, index) => `
    <label>
      <span>Team ${index + 1}</span>
      <input data-team-name="${index}" value="${escapeHtml(formNames[index])}" />
    </label>
  `).join("");
  renderKeeperEditor(formKeepers, formLeague, formNames);
}

function setupTeamSelects() {
  const options = Array.from({ length: LEAGUE.teams }, (_, i) => `<option value="${i + 1}">${escapeHtml(teamName(i + 1))}</option>`).join("");
  $("teamSelect").innerHTML = options;
  $("teamSelect").value = state.userTeam;
  $("analysisTeamSelect").innerHTML = options.replace(`value="${state.analysisTeam}"`, `value="${state.analysisTeam}" selected`);
  if ($("leagueUserTeamSelect")) {
    $("leagueUserTeamSelect").innerHTML = options;
    $("leagueUserTeamSelect").value = state.userTeam;
  }
  if ($("tradeTeamA") && $("tradeTeamB")) {
    $("tradeTeamA").innerHTML = options;
    $("tradeTeamB").innerHTML = options;
    $("tradeTeamA").value = state.trade.teamA;
    $("tradeTeamB").value = state.trade.teamB;
  }
  if ($("tradeFinderTeam")) {
    $("tradeFinderTeam").innerHTML = `<option value="all">All teams</option>${options}`;
    $("tradeFinderTeam").value = state.tradeFinder.focusTeam;
  }
}

function saveLeagueFromForm() {
  const profile = buildLeagueProfileFromForm();
  clearTradeFinderIdeas();
  saveLeagueProfileRecord(profile);
  state.pendingLeagueProfile = profile;
  renderLeagueSettings();
  showRestartPrompt();
}

function renderPersonaManager() {
  const options = PERSONAS.map((persona) => `<option value="${persona.id}">${persona.name}</option>`).join("");
  $("personaManager").innerHTML = state.teamPersonas.map((personaId, index) => {
    const team = index + 1;
    const persona = getPersonaForTeam(team);
    return `
      <div class="persona-card ${team === state.userTeam ? "is-user-team" : ""}">
        <label>
          <span>${escapeHtml(teamName(team))}${team === state.userTeam ? " (you)" : ""}</span>
          <select data-team-persona="${index}">
            ${options.replace(`value="${personaId}"`, `value="${personaId}" selected`)}
          </select>
        </label>
        <div class="persona-meta">
          <b>${persona.strategyStyle}</b>
          <span>${persona.experienceLevel}</span>
          <span>ADP ${persona.adpDiscipline}</span>
          <span>Reach ${persona.reachFrequency}</span>
        </div>
        <p>${persona.notes}</p>
      </div>
    `;
  }).join("");
}

function renderDraftHistory() {
  if (!state.completedDrafts.length) {
    $("draftHistory").innerHTML = `<p class="empty">Finish a mock, then press Save completed & new draft to add it here.</p>`;
    return;
  }
  $("draftHistory").innerHTML = state.completedDrafts.map((draft) => {
    const activeClass = draft.id === state.viewedDraftId ? "active" : "";
    const created = new Date(draft.createdAt).toLocaleString();
    const summary = rosterSummaryForDraft(draft) || "No user picks";
    const modeLabel = draft.draftMode === "live" ? "Live draft" : "Mock";
    return `
      <article class="history-card ${activeClass}">
        <div class="history-card-header">
          <div>
            <strong>${draft.name}</strong>
            <span>${created} - ${modeLabel} - ${escapeHtml(draftTeamName(draft, draft.userTeam))} - ${draft.strategy}</span>
          </div>
          <div class="history-actions">
            <button data-load-draft="${draft.id}" type="button">Load</button>
            <button data-delete-draft="${draft.id}" type="button">Delete</button>
          </div>
        </div>
        <div class="history-summary">${summary}</div>
        <label class="history-notes">
          Notes
          <textarea data-draft-notes="${draft.id}" rows="3" placeholder="What did you like about this build?">${draft.notes || ""}</textarea>
        </label>
      </article>
    `;
  }).join("");
}

function renderTeamAnalysis() {
  const league = activeLeague();
  const picks = activePicks();
  const total = league.teams * league.rounds;
  const selectedTeam = Math.min(state.analysisTeam, league.teams);
  $("analysisTeamSelect").innerHTML = Array.from({ length: league.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}" ${team === selectedTeam ? "selected" : ""}>${escapeHtml(activeTeamName(team))}</option>`;
  }).join("");
  if (picks.length < total) {
    $("teamAnalysis").innerHTML = `<p class="empty">Complete or load a full draft to see team grades and playoff odds.</p>`;
    return;
  }
  const analyses = allTeamAnalyses();
  const selected = analyses.find((analysis) => analysis.team === selectedTeam) || analyses[0];
  const positionScores = positionalTeamScores(picks);
  const positionSummary = selectedPositionSummary(selected.team, positionScores);
  const positionSummaryText = `
    <li>Best relative spots: ${positionSummary.best.map((row) => `${row.label} #${row.rank}`).join(", ")}.</li>
    <li>Needs attention: ${positionSummary.worst.map((row) => `${row.label} #${row.rank}`).join(", ")}.</li>
    <li>Compared to the room, ${escapeHtml(activeTeamName(selected.team))} is top-half at ${positionSummary.rows.filter((row) => row.rank <= Math.ceil(league.teams / 2)).length} of 7 position groups.</li>
  `;
  const positionRows = positionSummary.rows.map((row) => {
    const leaderNames = row.leader.topPlayers.map((player) => player.name).join(", ") || "None";
    const selectedNames = row.topPlayers.map((player) => player.name).join(", ") || "None";
    const rankClass = row.rank <= 3 ? "value" : row.rank >= Math.ceil(league.teams * 0.75) ? "reach" : "";
    return `
      <div class="position-breakdown-row ${rankClass}">
        <div>
          <strong>${row.label}</strong>
          <span>${escapeHtml(activeTeamName(selected.team))}: #${row.rank} of ${league.teams}, ${row.score.toFixed(1)} pts</span>
        </div>
        <p><b>Your group:</b> ${selectedNames}</p>
        <p><b>Room leader:</b> ${escapeHtml(activeTeamName(row.leader.team))} with ${leaderNames} (${row.leader.score.toFixed(1)} pts)</p>
      </div>
    `;
  }).join("");
  const lineupRows = selected.lineup
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection)
    .map((player) => `
      <div class="lineup-row">
        <span>${player.position}</span>
        <strong>${player.name}</strong>
        <b>${player.weeklyProjection.toFixed(1)}</b>
      </div>
    `).join("");
  const fullRoster = fullRosterRows(selected.roster, selected.lineup);
  const fullRosterRowsHtml = fullRoster.map((player) => `
    <div class="roster-analysis-row ${player.rosterSlot === "Starter" ? "starter" : "bench"}">
      <span>${player.rosterSlot}</span>
      <strong>${player.name}</strong>
      <b>${player.position}</b>
      <em>${player.weeklyProjection.toFixed(1)} pts/g</em>
    </div>
  `).join("");
  const comparisonRows = analyses.map((analysis) => `
    <button class="comparison-row ${analysis.team === selected.team ? "active" : ""}" data-analysis-team="${analysis.team}" type="button">
      <span>#${analysis.rank} ${escapeHtml(activeTeamName(analysis.team))}</span>
      <b>${analysis.grade}</b>
      <span>${analysis.weeklyProjection.toFixed(1)} pts/wk</span>
      <span>${analysis.playoffOdds}% playoffs</span>
    </button>
  `).join("");
  const gradeDrivers = selected.gradeDrivers.length
    ? selected.gradeDrivers.map((item) => `<li>${item}</li>`).join("")
    : `<li>Grade is driven by lineup projection, draft value, and roster balance.</li>`;
  const pickRows = selected.pickBreakdown.map((pick) => {
    const alternatives = pick.alternatives.slice(0, 3)
      .map((player) => `${player.name} (${player.position})`)
      .join(", ");
    const valueClass = pick.label === "Reach" ? "reach" : pick.label === "Strong value" || pick.label === "Good pick" ? "value" : "";
    return `
      <div class="pick-analysis-row ${valueClass}">
        <div>
          <strong>${pick.label}: ${pick.player.name}</strong>
          <span>Pick ${pick.round}.${String(pick.index + 1).padStart(2, "0")} - ${pick.player.position} - value ${pick.pickValue.toFixed(1)}</span>
        </div>
        <p>${pickInsightText(pick)}</p>
        <small>Best alternatives available: ${alternatives || "No clear alternatives"}</small>
      </div>
    `;
  }).join("");
  const valueRows = selected.bestValues.map((pick) => `
    <li>${pick.player.name} at ${pick.round}.${String(pick.index + 1).padStart(2, "0")} (${pick.pickValue.toFixed(1)} pick value)</li>
  `).join("");
  const reachRows = selected.biggestReaches.length
    ? selected.biggestReaches.map((pick) => `
        <li>${pick.player.name} at ${pick.round}.${String(pick.index + 1).padStart(2, "0")}; ${pick.bestAlternative ? `${pick.bestAlternative.name} was still available` : "board value was thinner"}</li>
      `).join("")
    : "<li>No major reaches versus the available board.</li>";

  $("teamAnalysis").innerHTML = `
    <div class="analysis-hero">
      <div>
        <p class="eyebrow">${escapeHtml(activeTeamName(selected.team))}</p>
        <h3>${selected.grade} Draft Grade</h3>
        <p>${selected.weeklyProjection.toFixed(1)} projected starter points per week - ${selected.playoffOdds}% playoff likelihood - rank #${selected.rank} of ${league.teams}.</p>
      </div>
      <div class="analysis-metrics">
        <div><strong>${selected.weeklyProjection.toFixed(1)}</strong><span>Starter avg</span></div>
        <div><strong>${selected.value.toFixed(1)}</strong><span>Pick value</span></div>
        <div><strong>${selected.playoffOdds}%</strong><span>Playoffs</span></div>
      </div>
    </div>
    <div class="analysis-grid position-grid">
      <section>
        <h3>Position Comparison Summary</h3>
        <ul>${positionSummaryText}</ul>
      </section>
      <section>
        <h3>Position-by-Position Detail</h3>
        <div class="position-breakdown-list">${positionRows}</div>
      </section>
    </div>
    <div class="analysis-grid detail-grid">
      <section>
        <h3>Why This Grade</h3>
        <ul>${gradeDrivers}</ul>
      </section>
      <section>
        <h3>Best Values</h3>
        <ul>${valueRows || "<li>No clear value spikes.</li>"}</ul>
      </section>
      <section>
        <h3>Costly Picks</h3>
        <ul>${reachRows}</ul>
      </section>
      <section>
        <h3>Pick-by-Pick Review</h3>
        <div class="pick-analysis-list">${pickRows}</div>
      </section>
    </div>
    <div class="analysis-grid">
      <section class="full-roster-section">
        <h3>Full Roster</h3>
        <div class="roster-analysis-list">
          <div class="roster-analysis-header">
            <span>Slot</span>
            <span>Player</span>
            <span>Pos</span>
            <span>Proj Avg</span>
          </div>
          ${fullRosterRowsHtml}
        </div>
      </section>
      <section>
        <h3>Best Starting Lineup</h3>
        <div class="lineup-list">${lineupRows}</div>
      </section>
      <section>
        <h3>Strengths</h3>
        <ul>${selected.strengths.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
      <section>
        <h3>Weaknesses</h3>
        <ul>${selected.weaknesses.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
      <section>
        <h3>Room Comparison</h3>
        <div class="comparison-list">${comparisonRows}</div>
      </section>
    </div>
  `;
}

function renderStatus() {
  const viewedDraft = state.completedDrafts.find((draft) => draft.id === state.viewedDraftId);
  if (viewedDraft) {
    $("currentPick").textContent = viewedDraft.name;
    $("turnStatus").textContent = "Viewing saved draft";
    $("turnStatus").className = "status-pill done";
    $("autoPickBtn").disabled = true;
    $("advanceBtn").disabled = true;
    $("undoPickBtn").disabled = true;
    $("saveCompletedBtn").hidden = true;
    return;
  }
  const total = LEAGUE.teams * LEAGUE.rounds;
  const order = draftOrderFor(Math.min(state.currentPick, total));
  const done = state.currentPick > total;
  const userTurn = !done && order.team === state.userTeam;
  $("currentPick").textContent = done ? "Draft complete" : `Pick ${order.label}`;
  $("turnStatus").textContent = done
    ? "Complete"
    : isLiveDraftMode()
      ? `${teamName(order.team)}${userTurn ? " (you)" : ""}`
      : userTurn ? "Your pick" : teamName(order.team);
  $("turnStatus").className = `status-pill ${done ? "done" : userTurn ? "" : "waiting"} ${isLiveDraftMode() ? "live" : ""}`;
  $("autoPickBtn").textContent = isLiveDraftMode() ? "Use recommendation" : "Auto pick for me";
  $("advanceBtn").textContent = isLiveDraftMode() ? "Live mode: manual entry" : "Sim to my next pick";
  $("autoPickBtn").disabled = done || (isLiveDraftMode() ? false : !userTurn);
  $("advanceBtn").disabled = done || isLiveDraftMode() || userTurn;
  $("undoPickBtn").disabled = state.viewedDraftId || !state.picks.some((pick) => !pick.keeper);
  $("saveCompletedBtn").hidden = !done;
  $("saveCompletedBtn").disabled = !done || state.picks.length !== total;
}

function renderWorkspacePanels() {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== state.activePanel;
  });
  document.querySelectorAll("[data-panel-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.panelTab === state.activePanel);
  });
}

function render() {
  renderStatus();
  renderRecommendations();
  renderBoard();
  renderRoster();
  renderRoomRosters();
  renderAvailable();
  renderDraftAssistant();
  renderTradeCalculator();
  renderSleeperImport();
  renderBulkSimulator();
  renderOrderSummary();
  renderSourceStatus();
  renderLeagueSettings();
  renderPersonaManager();
  renderDraftHistory();
  renderTeamAnalysis();
  renderWorkspacePanels();
}

function renderOrderEditor() {
  const activeOrder = state.roundOrders[state.activeRound];
  const roundTabs = state.roundOrders
    .map((order, index) => {
      const userPickCount = order.filter((team) => team === state.userTeam).length;
      const activeClass = index === state.activeRound ? "active" : "";
      const countLabel = userPickCount ? ` (${userPickCount})` : "";
      return `<button class="round-tab ${activeClass}" data-round-view="${index}" type="button">R${index + 1}${countLabel}</button>`;
    })
    .join("");
  const teamOptions = Array.from({ length: LEAGUE.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}">Owner: ${escapeHtml(teamName(team))}</option>`;
  }).join("");
  const slots = activeOrder
    .map((team, index) => `
      <label class="slot-owner ${team === state.userTeam ? "is-user-team" : ""}">
        <span>Draft slot ${state.activeRound + 1}.${String(index + 1).padStart(2, "0")}</span>
        <select data-slot-team="${index}">
          ${teamOptions.replace(`value="${team}"`, `value="${team}" selected`)}
        </select>
      </label>
    `)
    .join("");
  const roundCounts = Array.from({ length: LEAGUE.teams }, (_, index) => {
    const team = index + 1;
    const count = activeOrder.filter((owner) => owner === team).length;
    return `<span class="${team === state.userTeam ? "is-user-team" : ""}">T${team}: ${count}</span>`;
  }).join("");

  $("orderEditor").innerHTML = `
    <div class="round-tabs">${roundTabs}</div>
    <div class="slot-grid">${slots}</div>
    <div class="round-counts" aria-label="Round pick counts">${roundCounts}</div>
  `;
}

function renderOrderSummary() {
  if (state.viewedDraftId) return;
  const myPicks = state.roundOrders
    .flatMap((order, roundIndex) => {
      return order
        .map((team, pickIndex) => team === state.userTeam ? `${roundIndex + 1}.${String(pickIndex + 1).padStart(2, "0")}` : null)
        .filter(Boolean);
    })
  $("draftProgress").textContent = `${state.picks.length}/${LEAGUE.teams * LEAGUE.rounds} picks - Your picks: ${myPicks.length}`;
}

function updateSlotOwner(slotIndex, team) {
  if (!Number.isInteger(team) || team < 1 || team > LEAGUE.teams) {
    $("orderError").textContent = `Pick owners must be teams 1-${LEAGUE.teams}.`;
    return;
  }
  $("orderError").textContent = "";
  state.roundOrders[state.activeRound][slotIndex] = team;
  clearTradeFinderIdeas();
  saveRoundOrders();
  $("orderError").textContent = "Pick order saved for future drafts.";
  renderOrderEditor();
  resetDraft();
}

function updateKeeperPlayer(index, rawName) {
  const player = rawName.trim() ? playerByName(rawName) : null;
  if (rawName.trim() && !player) {
    $("leagueSettingsStatus").textContent = "Player not found. Choose a name from the rankings list.";
    renderLeagueSettings();
    return;
  }
  state.keeperSelections[index] = {
    ...state.keeperSelections[index],
    playerId: player ? player.id : "",
  };
  clearTradeFinderIdeas();
  saveKeeperSelections();
  refreshKeeperPicksInCurrentDraft();
  $("leagueSettingsStatus").textContent = "Keeper settings saved and added to the draft board.";
  renderLeagueSettings();
  render();
}

function updateKeeperRound(index, round) {
  state.keeperSelections[index] = {
    ...state.keeperSelections[index],
    round: round ? Number(round) : "",
  };
  clearTradeFinderIdeas();
  saveKeeperSelections();
  refreshKeeperPicksInCurrentDraft();
  $("leagueSettingsStatus").textContent = "Keeper settings saved and added to the draft board.";
  renderLeagueSettings();
  render();
}

async function importRankingsFile(file) {
  const text = await file.text();
  const rows = parseRankingFile(text, file.name);
  if (!rows.length) {
    $("importStatus").textContent = "No usable rankings found. Include columns like player/name plus rank, ADP, projection, or points.";
    return;
  }
  const sourceNames = [...new Set(rows.map((row) => row.source))];
  state.importedRankingRows = [
    ...state.importedRankingRows.filter((row) => !sourceNames.includes(row.source)),
    ...rows,
  ];
  sourceNames.forEach((name) => {
    state.rankingSources = state.rankingSources.filter((source) => source.name !== name);
    state.rankingSources.push({
      name,
      type: "uploaded",
      rows: rows.filter((row) => row.source === name).length,
      status: "active",
      updatedAt: new Date().toLocaleString(),
    });
  });
  rebuildConsensusPlayers(state.importedRankingRows);
  saveRankingState();
  $("importStatus").textContent = `Imported ${rows.length} rankings from ${sourceNames.join(", ")}.`;
  resetDraft();
}

async function sleeperFetch(path) {
  const response = await fetch(`${SLEEPER_API_BASE}${path}`);
  if (!response.ok) throw new Error(`Sleeper request failed (${response.status})`);
  return response.json();
}

async function sleeperFetchOptional(path, fallback = []) {
  try {
    return await sleeperFetch(path);
  } catch {
    return fallback;
  }
}

function sleeperUserName(user) {
  return user?.display_name || user?.username || "Unknown owner";
}

function sleeperRosterName(roster, user) {
  const ownerName = sleeperUserName(user);
  const rosterName = user?.metadata?.team_name;
  return rosterName && ownerName && rosterName !== ownerName
    ? `${rosterName} (${ownerName})`
    : rosterName || ownerName || `Roster ${roster.roster_id}`;
}

function sleeperPlayerName(player, metadata = {}) {
  if (metadata.first_name || metadata.last_name) return `${metadata.first_name || ""} ${metadata.last_name || ""}`.trim();
  return player?.full_name || `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || metadata.player_id || "";
}

function sleeperPlayerPosition(player, metadata = {}) {
  return metadata.position || player?.position || "";
}

function sleeperPlayerTeam(player, metadata = {}) {
  return metadata.team || player?.team || "";
}

function matchSleeperPlayer(sleeperPlayer, metadata = {}) {
  const name = sleeperPlayerName(sleeperPlayer, metadata);
  const position = sleeperPlayerPosition(sleeperPlayer, metadata);
  const key = playerKey(name);
  if (!key) return null;
  return PLAYERS.find((player) => playerKey(player.name) === key && (!position || player.position === position))
    || PLAYERS.find((player) => playerKey(player.name) === key)
    || null;
}

function sleeperLeagueSettingsToApp(league, draft) {
  const positions = Array.isArray(league.roster_positions) ? league.roster_positions : [];
  const countPosition = (position) => positions.filter((item) => item === position).length;
  const flexCount = positions.filter((item) => /FLEX/.test(item) && item !== "SUPER_FLEX").length;
  const bench = countPosition("BN") + countPosition("BE");
  const scoringSettings = league.scoring_settings || {};
  const rec = Number(scoringSettings.rec);
  const tePremium = Number(scoringSettings.bonus_rec_te || scoringSettings.te_bonus_rec || 0);
  const scoring = tePremium > 0 ? "TE Premium" : rec >= 1 ? "PPR" : rec > 0 ? "Half-PPR" : "Standard";
  const rounds = Number(draft?.settings?.rounds || league.settings?.draft_rounds || LEAGUE.rounds);

  return normalizeLeagueSettings({
    ...LEAGUE,
    name: league.name || LEAGUE.name,
    teams: Number(league.total_rosters || draft?.settings?.teams || LEAGUE.teams),
    scoring,
    rounds,
    roster: {
      QB: countPosition("QB") || LEAGUE.roster.QB,
      RB: countPosition("RB") || LEAGUE.roster.RB,
      WR: countPosition("WR") || LEAGUE.roster.WR,
      TE: countPosition("TE") || LEAGUE.roster.TE,
      FLEX: flexCount || LEAGUE.roster.FLEX,
      K: countPosition("K"),
      DEF: countPosition("DEF"),
      BENCH: bench || LEAGUE.roster.BENCH,
    },
  });
}

function bestDraftForLeague(league, drafts) {
  if (league.draft_id) {
    const linked = drafts.find((draft) => String(draft.draft_id) === String(league.draft_id));
    if (linked) return linked;
  }
  return [...drafts]
    .sort((a, b) => Number(b.start_time || b.created || 0) - Number(a.start_time || a.created || 0))[0] || null;
}

function buildSleeperDraftPickMap(picks) {
  const map = new Map();
  picks.forEach((pick) => {
    if (!pick.player_id) return;
    map.set(String(pick.player_id), {
      playerId: String(pick.player_id),
      round: Number(pick.round),
      pickNo: Number(pick.pick_no),
      draftSlot: Number(pick.draft_slot),
      rosterId: String(pick.roster_id || ""),
      isKeeper: Boolean(pick.is_keeper),
      metadata: pick.metadata || {},
    });
  });
  return map;
}

function sleeperRosterHasPlayers(roster) {
  return Array.isArray(roster?.players) && roster.players.length > 0;
}

function sleeperRosterPlayerCount(rosters) {
  return (rosters || []).reduce((sum, roster) => sum + (Array.isArray(roster.players) ? roster.players.length : 0), 0);
}

function sleeperDraftHasPicks(picks) {
  return Array.isArray(picks) && picks.some((pick) => pick.player_id && pick.round);
}

function matchKeeperSourceRoster(targetRoster, keeperRosters) {
  return keeperRosters.find((roster) => roster.owner_id && targetRoster.owner_id && String(roster.owner_id) === String(targetRoster.owner_id))
    || keeperRosters.find((roster) => String(roster.roster_id) === String(targetRoster.roster_id))
    || null;
}

async function sleeperKeeperSourceForLeague(league, currentRosters, currentDraft, currentPicks) {
  if (sleeperRosterPlayerCount(currentRosters) > 0 && sleeperDraftHasPicks(currentPicks)) {
    return {
      league,
      rosters: currentRosters,
      draft: currentDraft,
      picks: currentPicks,
      season: String(league.season || state.sleeper.season),
      usedPreviousLeague: false,
    };
  }
  if (!league.previous_league_id) {
    return {
      league,
      rosters: currentRosters,
      draft: currentDraft,
      picks: currentPicks,
      season: String(league.season || state.sleeper.season),
      usedPreviousLeague: false,
    };
  }
  const previousLeague = await sleeperFetch(`/league/${encodeURIComponent(league.previous_league_id)}`);
  const [previousRosters, previousDrafts] = await Promise.all([
    sleeperFetch(`/league/${encodeURIComponent(previousLeague.league_id)}/rosters`),
    sleeperFetch(`/league/${encodeURIComponent(previousLeague.league_id)}/drafts`),
  ]);
  const previousDraft = bestDraftForLeague(previousLeague, Array.isArray(previousDrafts) ? previousDrafts : []);
  const previousPicks = previousDraft?.draft_id
    ? await sleeperFetchOptional(`/draft/${encodeURIComponent(previousDraft.draft_id)}/picks`, [])
    : [];
  return {
    league: previousLeague,
    rosters: Array.isArray(previousRosters) ? previousRosters : [],
    draft: previousDraft,
    picks: Array.isArray(previousPicks) ? previousPicks : [],
    season: String(previousLeague.season || Number(league.season || state.sleeper.season) - 1),
    usedPreviousLeague: true,
  };
}

function buildSleeperImportData({ league, draft, rosters, users, keeperSource, sleeperPlayers, season, importedUserId }) {
  const usersById = new Map(users.map((user) => [String(user.user_id), user]));
  const draftPickBySleeperId = buildSleeperDraftPickMap(keeperSource.picks || []);
  const sortedRosters = [...rosters].sort((a, b) => Number(a.roster_id) - Number(b.roster_id));
  const keeperRosters = [...(keeperSource.rosters || [])].sort((a, b) => Number(a.roster_id) - Number(b.roster_id));
  const appLeague = sleeperLeagueSettingsToApp(league, draft);
  const teams = sortedRosters.slice(0, appLeague.teams).map((roster, index) => {
    const user = usersById.get(String(roster.owner_id));
    const keeperRoster = matchKeeperSourceRoster(roster, keeperRosters);
    const candidates = (keeperRoster?.players || [])
      .map((sleeperPlayerId) => {
        const draftPick = draftPickBySleeperId.get(String(sleeperPlayerId));
        if (!draftPick || draftPick.isKeeper || !draftPick.round) return null;
        const sleeperPlayer = sleeperPlayers[String(sleeperPlayerId)];
        const matched = matchSleeperPlayer(sleeperPlayer, draftPick.metadata);
        if (!matched) return null;
        const value = keeperAssetValue(matched, draftPick.round, index + 1);
        if (!value || value.surplus <= -5) return null;
        return {
          playerId: matched.id,
          sleeperPlayerId: String(sleeperPlayerId),
          name: matched.name,
          position: matched.position,
          team: matched.team,
          round: draftPick.round,
          pickNo: draftPick.pickNo,
          surplus: value.surplus,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.surplus - a.surplus);

    return {
      team: index + 1,
      sleeperRosterId: String(roster.roster_id || ""),
      sleeperOwnerId: String(roster.owner_id || ""),
      name: sleeperRosterName(roster, user),
      ownerName: sleeperUserName(user),
      keeperCandidates: candidates,
    };
  });

  return normalizeSleeperImport({
    leagueId: league.league_id,
    leagueName: league.name,
    season,
    keeperSourceLeagueId: keeperSource.league?.league_id || league.league_id,
    keeperSourceSeason: keeperSource.season || season,
    usedPreviousLeagueForKeepers: Boolean(keeperSource.usedPreviousLeague),
    importedUserId,
    importedAt: new Date().toISOString(),
    teams,
  }, appLeague.teams);
}

function appTeamForSleeperRosterId(rosters, rosterId) {
  const sortedRosters = [...rosters].sort((a, b) => Number(a.roster_id) - Number(b.roster_id));
  const index = sortedRosters.findIndex((roster) => String(roster.roster_id) === String(rosterId));
  return index >= 0 ? index + 1 : null;
}

function applySleeperTradedPicksToRoundOrders(tradedPicks, rosters, season) {
  const orders = defaultSnakeOrders();
  const targetSeason = Number(season);
  const acceptableSeasons = new Set([
    String(targetSeason),
    String(targetSeason + 1),
  ]);
  (tradedPicks || []).forEach((trade) => {
    const round = Number(trade.round);
    if (!round || round < 1 || round > LEAGUE.rounds) return;
    if (trade.season && !acceptableSeasons.has(String(trade.season))) return;
    const originalTeam = appTeamForSleeperRosterId(rosters, trade.roster_id);
    const currentOwnerTeam = appTeamForSleeperRosterId(rosters, trade.owner_id);
    if (!originalTeam || !currentOwnerTeam) return;
    const slotIndex = orders[round - 1].findIndex((team) => team === originalTeam);
    if (slotIndex >= 0) orders[round - 1][slotIndex] = currentOwnerTeam;
  });
  return orders;
}

async function loadSleeperLeagues() {
  const username = $("sleeperUsernameInput").value.trim();
  const season = String(Math.max(2017, Math.min(2030, Number($("sleeperSeasonInput").value) || Number(SLEEPER_DEFAULT_SEASON))));
  if (!username) {
    state.sleeper.status = "Enter a Sleeper username or user ID first.";
    renderSleeperImport();
    return;
  }
  state.sleeper.loading = true;
  state.sleeper.status = "Finding Sleeper user and leagues...";
  renderSleeperImport();
  try {
    const user = await sleeperFetch(`/user/${encodeURIComponent(username)}`);
    if (!user?.user_id) throw new Error("Sleeper user not found.");
    const leagues = await sleeperFetch(`/user/${encodeURIComponent(user.user_id)}/leagues/nfl/${season}`);
    state.sleeper.username = username;
    state.sleeper.userId = String(user.user_id);
    state.sleeper.displayName = sleeperUserName(user);
    state.sleeper.season = season;
    state.sleeper.leagues = Array.isArray(leagues) ? leagues : [];
    state.sleeper.selectedLeagueId = state.sleeper.leagues[0]?.league_id || "";
    state.sleeper.status = state.sleeper.leagues.length
      ? `Found ${state.sleeper.leagues.length} Sleeper league${state.sleeper.leagues.length === 1 ? "" : "s"} for ${season}.`
      : `No Sleeper NFL leagues found for ${season}.`;
  } catch (error) {
    state.sleeper.status = `Sleeper lookup failed: ${error.message}`;
  } finally {
    state.sleeper.loading = false;
    renderSleeperImport();
  }
}

async function importSelectedSleeperLeague() {
  const leagueId = state.sleeper.selectedLeagueId || $("sleeperLeagueSelect").value;
  const season = String($("sleeperSeasonInput").value || state.sleeper.season || SLEEPER_DEFAULT_SEASON);
  if (!leagueId) {
    state.sleeper.status = "Choose a Sleeper league to import.";
    renderSleeperImport();
    return;
  }
  state.sleeper.loading = true;
  state.sleeper.status = "Importing Sleeper rosters, teams, draft, and player IDs...";
  renderSleeperImport();
  try {
    const league = await sleeperFetch(`/league/${encodeURIComponent(leagueId)}`);
    const [rosters, users, drafts, sleeperPlayers, tradedPicks] = await Promise.all([
      sleeperFetch(`/league/${encodeURIComponent(leagueId)}/rosters`),
      sleeperFetch(`/league/${encodeURIComponent(leagueId)}/users`),
      sleeperFetch(`/league/${encodeURIComponent(leagueId)}/drafts`),
      sleeperFetch("/players/nfl"),
      sleeperFetchOptional(`/league/${encodeURIComponent(leagueId)}/traded_picks`, []),
    ]);
    const normalizedRosters = Array.isArray(rosters) ? rosters : [];
    const draft = bestDraftForLeague(league, Array.isArray(drafts) ? drafts : []);
    const picks = draft?.draft_id
      ? await sleeperFetchOptional(`/draft/${encodeURIComponent(draft.draft_id)}/picks`, [])
      : [];
    const appLeague = sleeperLeagueSettingsToApp(league, draft);
    LEAGUE = appLeague;
    const keeperSource = await sleeperKeeperSourceForLeague(league, normalizedRosters, draft, Array.isArray(picks) ? picks : []);
    const importData = buildSleeperImportData({
      league,
      draft,
      rosters: normalizedRosters,
      users: Array.isArray(users) ? users : [],
      keeperSource,
      sleeperPlayers: sleeperPlayers || {},
      season,
      importedUserId: state.sleeper.userId,
    });
    state.activeLeagueId = state.activeLeagueId || appLeague.id;
    state.teamNames = importData.teams.map((team) => team.name);
    const importedUserTeam = importData.teams.find((team) => team.sleeperOwnerId && team.sleeperOwnerId === state.sleeper.userId)?.team;
    state.userTeam = importedUserTeam || Math.min(state.userTeam, LEAGUE.teams);
    state.roomRosterTeam = state.userTeam;
    state.roundOrders = resizeRoundOrders(applySleeperTradedPicksToRoundOrders(
      Array.isArray(tradedPicks) ? tradedPicks : [],
      normalizedRosters,
      season
    ));
    state.keeperSelections = normalizeKeeperSelections(state.keeperSelections);
    state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id);
    state.sleeper.importData = importData;
    clearTradeFinderIdeas();
    saveActiveLeagueProfile();
    setupTeamSelects();
    renderLeagueSettings();
    renderOrderEditor();
    resetDraft();
    const candidateCount = importData.teams.reduce((sum, team) => sum + team.keeperCandidates.length, 0);
    const tradedPickCount = (Array.isArray(tradedPicks) ? tradedPicks : []).length;
    const sourceText = importData.usedPreviousLeagueForKeepers
      ? ` Keeper candidates came from ${importData.keeperSourceSeason} via Sleeper's previous league link.`
      : "";
    state.sleeper.status = `Imported ${importData.leagueName}: ${importData.teams.length} teams, ${candidateCount} keeper candidates, and ${tradedPickCount} Sleeper traded-pick records.${sourceText}`;
  } catch (error) {
    state.sleeper.status = `Sleeper import failed: ${error.message}`;
  } finally {
    state.sleeper.loading = false;
    renderSleeperImport();
  }
}

function refreshRankingsAfterSourceChange(message) {
  rebuildConsensusPlayers(state.importedRankingRows);
  saveRankingState();
  $("importStatus").textContent = message;
  renderSourceStatus();
  resetDraft();
}

function removeRankingSource(sourceName) {
  if (sourceName === SEED_SOURCE.name) {
    state.seedRankingsEnabled = false;
    state.rankingSources = state.rankingSources.filter((source) => source.name !== SEED_SOURCE.name);
    refreshRankingsAfterSourceChange("Built-in seed rankings disabled. Consensus now uses uploaded sources only.");
    return;
  }
  state.importedRankingRows = state.importedRankingRows.filter((row) => row.source !== sourceName);
  state.rankingSources = state.rankingSources.filter((source) => source.name !== sourceName);
  refreshRankingsAfterSourceChange(`Removed ${sourceName}.`);
}

function restoreSeedRankings() {
  state.seedRankingsEnabled = true;
  if (!state.rankingSources.some((source) => source.name === SEED_SOURCE.name)) {
    state.rankingSources = [{ ...SEED_SOURCE }, ...state.rankingSources];
  }
  refreshRankingsAfterSourceChange("Built-in seed rankings restored.");
}

function setupControls() {
  setupTeamSelects();
  $("draftModeSelect").value = state.draftMode;
  $("draftModeSelect").addEventListener("change", (event) => {
    state.draftMode = event.target.value;
    resetDraft();
  });
  $("teamSelect").addEventListener("change", (event) => {
    state.userTeam = Number(event.target.value);
    state.roomRosterTeam = state.userTeam;
    saveActiveLeagueProfile();
    renderLeagueSettings();
    renderOrderEditor();
    resetDraft();
  });

  $("strategySelect").value = state.strategy;
  $("strategySelect").addEventListener("change", (event) => {
    state.strategy = event.target.value;
    render();
  });

  $("analysisTeamSelect").addEventListener("change", (event) => {
    state.analysisTeam = Number(event.target.value);
    renderTeamAnalysis();
  });

  $("saveLeagueBtn").addEventListener("click", saveLeagueFromForm);
  $("newLeagueProfileBtn").addEventListener("click", createLeagueProfile);
  $("leagueProfileSelect").addEventListener("change", (event) => queueLeagueProfileSwitch(event.target.value));
  $("restartAfterLeagueSaveBtn").addEventListener("click", applyPendingLeagueAndRestart);
  $("keepCurrentDraftBtn").addEventListener("click", () => {
    clearRestartPrompt();
    $("leagueSettingsStatus").textContent = "Saved for future drafts. Current mock kept as-is.";
  });
  $("saveOrderBtn").addEventListener("click", () => {
    saveRoundOrders();
    clearTradeFinderIdeas();
    renderTradeFinder();
    $("orderError").textContent = "Pick order saved for future drafts.";
  });

  document.querySelectorAll("[data-panel-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePanel = button.dataset.panelTab;
      renderWorkspacePanels();
    });
  });

  $("newDraftBtn").addEventListener("click", () => {
    if (state.pendingLeagueProfile) applyPendingLeagueAndRestart();
    else resetDraft();
  });
  $("saveCompletedBtn").addEventListener("click", () => {
    const savedDraft = saveCompletedDraft();
    if (state.pendingLeagueProfile) applyPendingLeagueAndRestart();
    else resetDraft();
    if (savedDraft) state.viewedDraftId = null;
    renderDraftHistory();
  });
  $("resumeCurrentBtn").addEventListener("click", () => {
    state.viewedDraftId = null;
    state.activePanel = "draft";
    render();
  });
  $("resetPersonasBtn").addEventListener("click", () => {
    state.teamPersonas = defaultTeamPersonas();
    savePersonaState();
    renderPersonaManager();
    resetDraft();
  });
  $("resetTradeBtn").addEventListener("click", () => {
    state.trade = {
      teamA: 1,
      teamB: Math.min(2, LEAGUE.teams),
      picksA: [],
      picksB: [],
      keeperPlayerA: "",
      keeperRoundA: "",
      keeperPlayerB: "",
      keeperRoundB: "",
    };
    state.tradeFinder.ideas = [];
    state.tradeFinder.hasRun = false;
    setupTeamSelects();
    renderTradeCalculator();
  });
  $("sleeperSeasonInput").value = state.sleeper.season || SLEEPER_DEFAULT_SEASON;
  $("sleeperLoadLeaguesBtn").addEventListener("click", loadSleeperLeagues);
  $("sleeperImportBtn").addEventListener("click", importSelectedSleeperLeague);
  $("sleeperLeagueSelect").addEventListener("change", (event) => {
    state.sleeper.selectedLeagueId = event.target.value;
    renderSleeperImport();
  });
  $("generateTradeIdeasBtn").addEventListener("click", generateTradeIdeas);
  $("runBulkSimBtn").addEventListener("click", startBulkSimulations);
  $("bulkCountInput").addEventListener("change", (event) => {
    state.bulk.count = Math.max(1, Math.min(100, Number(event.target.value) || 50));
    event.target.value = state.bulk.count;
  });
  $("bulkModeSelect").addEventListener("change", (event) => {
    state.bulk.mode = event.target.value;
    renderBulkSimulator();
  });
  $("bulkStrategySelect").addEventListener("change", (event) => {
    state.bulk.strategy = event.target.value;
  });
  $("bulkRandomizeRoomInput").addEventListener("change", (event) => {
    state.bulk.randomizeRoom = event.target.checked;
  });
  $("snakeOrderBtn").addEventListener("click", () => {
    state.roundOrders = defaultSnakeOrders();
    state.activeRound = 0;
    clearTradeFinderIdeas();
    saveRoundOrders();
    $("orderError").textContent = "Snake order saved for future drafts.";
    renderOrderEditor();
    resetDraft();
  });
  $("advanceBtn").addEventListener("click", simUntilUserPick);
  $("autoPickBtn").addEventListener("click", () => {
    const order = draftOrderFor(Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds));
    const targetTeam = isLiveDraftMode() ? order.team : state.userTeam;
    const [best] = recommendations(targetTeam, state.currentPick, 1);
    if (best) makePick(best);
    if (!isLiveDraftMode()) simUntilUserPick();
  });
  $("undoPickBtn").addEventListener("click", undoLastPick);

  $("playerSearch").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAvailable();
  });

  $("assistantSendBtn").addEventListener("click", () => submitAssistantQuestion($("assistantInput").value));
  $("assistantInput").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitAssistantQuestion(event.currentTarget.value);
  });

  $("rankingsUpload").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      await importRankingsFile(file);
    } catch (error) {
      $("importStatus").textContent = `Import failed: ${error.message}`;
    } finally {
      event.target.value = "";
    }
  });

  $("positionFilters").innerHTML = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"]
    .map((pos) => `<button class="filter ${pos === "ALL" ? "active" : ""}" data-filter="${pos}">${pos}</button>`)
    .join("");

  document.addEventListener("click", (event) => {
    const draftId = event.target.closest("[data-draft]")?.dataset.draft;
    const filter = event.target.closest("[data-filter]")?.dataset.filter;
    const roundView = event.target.closest("[data-round-view]")?.dataset.roundView;
    const loadDraftId = event.target.closest("[data-load-draft]")?.dataset.loadDraft;
    const deleteDraftId = event.target.closest("[data-delete-draft]")?.dataset.deleteDraft;
    const analysisTeam = event.target.closest("[data-analysis-team]")?.dataset.analysisTeam;
    const loadLeagueProfileId = event.target.closest("[data-load-league-profile]")?.dataset.loadLeagueProfile;
    const removeRankingSourceName = event.target.closest("[data-remove-ranking-source]")?.dataset.removeRankingSource;
    const restoreSeedRankingsFlag = event.target.closest("[data-restore-seed-rankings]")?.dataset.restoreSeedRankings;
    const bulkRunId = event.target.closest("[data-bulk-run]")?.dataset.bulkRun;
    const loadTradeIdeaId = event.target.closest("[data-load-trade-idea]")?.dataset.loadTradeIdea;
    const roomRosterTeam = event.target.closest("[data-room-roster-team]")?.dataset.roomRosterTeam;
    if (draftId) {
      const order = draftOrderFor(state.currentPick);
      if (state.viewedDraftId || (!isLiveDraftMode() && order.team !== state.userTeam)) return;
      const player = availablePlayers().find((p) => p.id === draftId);
      if (player) {
        makePick(player);
        if (!isLiveDraftMode()) simUntilUserPick();
      }
    }
    if (filter) {
      state.positionFilter = filter;
      document.querySelectorAll(".filter").forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
      renderAvailable();
    }
    if (roundView !== undefined) {
      state.activeRound = Number(roundView);
      renderOrderEditor();
    }
    if (loadDraftId) {
      state.viewedDraftId = loadDraftId;
      state.activePanel = "analysis";
      render();
    }
    if (deleteDraftId) {
      state.completedDrafts = state.completedDrafts.filter((draft) => draft.id !== deleteDraftId);
      if (state.viewedDraftId === deleteDraftId) state.viewedDraftId = null;
      saveDraftHistory();
      render();
    }
    if (analysisTeam) {
      state.analysisTeam = Number(analysisTeam);
      renderTeamAnalysis();
    }
    if (loadLeagueProfileId) {
      queueLeagueProfileSwitch(loadLeagueProfileId);
    }
    if (removeRankingSourceName) {
      removeRankingSource(removeRankingSourceName);
    }
    if (restoreSeedRankingsFlag) {
      restoreSeedRankings();
    }
    if (bulkRunId) {
      state.bulk.selectedRunId = bulkRunId;
      renderBulkSimulator();
    }
    if (roomRosterTeam) {
      state.roomRosterTeam = Number(roomRosterTeam);
      renderRoomRosters();
    }
    if (loadTradeIdeaId) {
      const idea = state.tradeFinder.ideas.find((item) => item.id === loadTradeIdeaId);
      if (idea) {
        state.trade = {
          ...state.trade,
          teamA: idea.teamA,
          teamB: idea.teamB,
          picksA: [...idea.picksA],
          picksB: [...idea.picksB],
          keeperPlayerA: idea.keeperA?.player?.name || "",
          keeperRoundA: idea.keeperA?.round || "",
          keeperPlayerB: idea.keeperB?.player?.name || "",
          keeperRoundB: idea.keeperB?.round || "",
        };
        setupTeamSelects();
        renderTradeCalculator();
      }
    }
    const assistantPrompt = event.target.closest("[data-assistant-prompt]")?.dataset.assistantPrompt;
    if (assistantPrompt) submitAssistantQuestion(assistantPrompt);
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "roomRosterTeamSelect") {
      state.roomRosterTeam = Number(event.target.value);
      renderRoomRosters();
    }
    if (event.target.id === "leagueUserTeamSelect") {
      state.userTeam = Number(event.target.value);
      state.roomRosterTeam = state.userTeam;
      saveActiveLeagueProfile();
      setupTeamSelects();
      renderOrderEditor();
      resetDraft();
    }
    if (event.target.id === "tradeTeamA" || event.target.id === "tradeTeamB") {
      const side = event.target.id === "tradeTeamA" ? "teamA" : "teamB";
      state.trade[side] = Number(event.target.value);
      if (state.trade.teamA === state.trade.teamB) {
        const otherSide = side === "teamA" ? "teamB" : "teamA";
        state.trade[otherSide] = state.trade[side] === LEAGUE.teams ? 1 : state.trade[side] + 1;
      }
      state.trade.picksA = [];
      state.trade.picksB = [];
      setupTeamSelects();
      renderTradeCalculator();
    }
    if (event.target.id === "tradeFinderTeam") {
      state.tradeFinder.focusTeam = event.target.value;
      state.tradeFinder.hasRun = false;
      renderTradeFinder();
    }
    if (event.target.id === "tradeFinderKeepers") {
      state.tradeFinder.includeKeepers = event.target.checked;
      state.tradeFinder.hasRun = false;
      renderTradeFinder();
    }
    if (event.target.id === "tradeFinderEqualPicks") {
      state.tradeFinder.requireEqualPicks = event.target.checked;
      state.tradeFinder.hasRun = false;
      renderTradeFinder();
    }
    const tradePickA = event.target.dataset.tradePickA;
    if (tradePickA) {
      const pick = Number(tradePickA);
      state.trade.picksA = event.target.checked
        ? [...new Set([...state.trade.picksA, pick])]
        : state.trade.picksA.filter((item) => item !== pick);
      renderTradeCalculator();
    }
    const tradePickB = event.target.dataset.tradePickB;
    if (tradePickB) {
      const pick = Number(tradePickB);
      state.trade.picksB = event.target.checked
        ? [...new Set([...state.trade.picksB, pick])]
        : state.trade.picksB.filter((item) => item !== pick);
      renderTradeCalculator();
    }
    const slotIndex = event.target.dataset.slotTeam;
    if (slotIndex !== undefined) updateSlotOwner(Number(slotIndex), Number(event.target.value));
    const keeperPlayerIndex = event.target.dataset.keeperPlayer;
    if (keeperPlayerIndex !== undefined) updateKeeperPlayer(Number(keeperPlayerIndex), event.target.value);
    const keeperRoundIndex = event.target.dataset.keeperRound;
    if (keeperRoundIndex !== undefined) updateKeeperRound(Number(keeperRoundIndex), event.target.value);
    const teamPersonaIndex = event.target.dataset.teamPersona;
    if (teamPersonaIndex !== undefined) {
      state.teamPersonas[Number(teamPersonaIndex)] = event.target.value;
      savePersonaState();
      resetDraft();
    }
  });

  document.addEventListener("input", (event) => {
    const teamNameIndex = event.target.dataset.teamName;
    if (teamNameIndex !== undefined) {
      state.teamNames[Number(teamNameIndex)] = event.target.value.trim() || `Team ${Number(teamNameIndex) + 1}`;
      saveTeamNames();
      setupTeamSelects();
      return;
    }
    if (["tradeKeeperPlayerA", "tradeKeeperRoundA", "tradeKeeperPlayerB", "tradeKeeperRoundB"].includes(event.target.id)) {
      const fieldMap = {
        tradeKeeperPlayerA: "keeperPlayerA",
        tradeKeeperRoundA: "keeperRoundA",
        tradeKeeperPlayerB: "keeperPlayerB",
        tradeKeeperRoundB: "keeperRoundB",
      };
      state.trade[fieldMap[event.target.id]] = event.target.value;
      renderTradeCalculator();
      return;
    }
    if (event.target.id === "tradeFinderThreshold") {
      state.tradeFinder.threshold = Math.max(80, Math.min(100, Number(event.target.value) || 95));
      event.target.value = state.tradeFinder.threshold;
      state.tradeFinder.hasRun = false;
      renderTradeFinder();
      return;
    }
    if (event.target.id === "sleeperUsernameInput") {
      state.sleeper.username = event.target.value;
      return;
    }
    if (event.target.id === "sleeperSeasonInput") {
      state.sleeper.season = String(event.target.value || SLEEPER_DEFAULT_SEASON);
      return;
    }
    const notesDraftId = event.target.dataset.draftNotes;
    if (!notesDraftId) return;
    const draft = state.completedDrafts.find((item) => item.id === notesDraftId);
    if (!draft) return;
    draft.notes = event.target.value;
    saveDraftHistory();
  });
}

initializeLeagueProfiles();
loadRankingState();
loadDraftHistory();
setupControls();
renderOrderEditor();
renderPersonaManager();
resetDraft();
