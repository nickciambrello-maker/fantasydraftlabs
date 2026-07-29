const APP_VERSION = "1.2.3";
const SIMULATOR_SCHEMA_VERSION = 5;
const SIMULATOR_ENGINE_VERSION = "high-confidence-bulk-v4";
const SIMULATOR_STORAGE_KEY = "fantasyDraftLabSimulatorV4";
const PREDICTION_RETENTION_LIMIT = 750;
const BULK_DEPTH_PRESETS = { quick: 10, standard: 25, deep: 50 };
const BULK_SINGLE_DEFAULT = 50;
const BULK_WORKER_TIMEOUT_MS = 4000;
const PROJECTION_SEASON_WEEKS = 17;
const ASSISTANT_SESSION_VERSION = 2;
const ASSISTANT_STORAGE_KEY = "fantasyDraftLabAssistantSessionV2";
const ASSISTANT_ENDPOINT = "/api/draft-assistant";
const ASSISTANT_MAX_TOOL_ROUNDS = 4;
const ASSISTANT_MESSAGE_LIMIT = 28;
const HISTORICAL_ADP_DATA_VERSION = window.FDL_HISTORICAL_ADP?.dataVersion || "none";
const HISTORICAL_ADP_INDEX = new Map();
let BULK_SEASON_WORKER = null;
let BULK_SEASON_WORKER_SEQUENCE = 0;
let BULK_SEASON_WORKER_DISABLED_REASON = "";
const BULK_SEASON_WORKER_REQUESTS = new Map();

const DEFAULT_LEAGUE = {
  id: "default",
  name: "Default League",
  teams: 12,
  scoring: "Half-PPR",
  scoringSettings: { reception: 0.5, teReceptionBonus: 0, passTd: 4, rushRecTd: 6 },
  rounds: 16,
  playoffTeams: 6,
  roster: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DEF: 1, BENCH: 6 },
  keeper: "1 player, prior-round cost",
  ensureCompleteRoster: true,
};

const SCORING_PRESETS = {
  Standard: { reception: 0, teReceptionBonus: 0, passTd: 4, rushRecTd: 6 },
  "Half-PPR": { reception: 0.5, teReceptionBonus: 0, passTd: 4, rushRecTd: 6 },
  PPR: { reception: 1, teReceptionBonus: 0, passTd: 4, rushRecTd: 6 },
  "TE Premium": { reception: 1, teReceptionBonus: 0.5, passTd: 4, rushRecTd: 6 },
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
    sourceRanks: { "Sleeper ADP Baseline": Number(rank) },
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
  weeklyEdge: "Prioritize starters who create a weekly positional advantage over the rest of the room.",
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
  { id: "weeklyEdge", label: "Weekly Positional Edge" },
  { id: "upside", label: "Upside" },
  { id: "safeFloor", label: "Safe Floor" },
];

const SEED_SOURCE = {
  name: "Sleeper ADP Baseline",
  type: "market baseline",
  rows: BASE_PLAYERS.length,
  status: "active",
  updatedAt: "Bundled Sleeper ADP snapshot — not a live API feed; replace anytime with a newer upload",
};

const OVERLAY_PRESETS = {
  light: { base: 0.85, league: 0.10, guide: 0.05, label: "Light" },
  balanced: { base: 0.75, league: 0.20, guide: 0.05, label: "Balanced" },
  strong: { base: 0.65, league: 0.25, guide: 0.10, label: "Strong" },
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
  personaSources: Array.from({ length: LEAGUE.teams }, () => "default"),
  activeRound: 0,
  draftMode: "mock",
  strategy: "balanced",
  importedRankingRows: [],
  seedRankingsEnabled: true,
  rankingSources: [{ ...SEED_SOURCE }],
  rankingSourceWeights: { [SEED_SOURCE.name]: 3 },
  overlayStrength: "balanced",
  currentPick: 1,
  mockSeed: Math.random() * 10000,
  picks: [],
  draftedIds: new Set(),
  completedDrafts: [],
  viewedDraftId: null,
  currentDraftSnapshot: null,
  analysisTeam: 1,
  analysisView: "team",
  scoutingView: "overview",
  scoutingTeam: 1,
  behaviorFilters: { season: "all", manager: "league", position: "ALL", roundStart: 1, roundEnd: 10 },
  keeperRankingsTeam: "all",
  roomRosterTeam: 1,
  activePanel: "draft",
  positionFilter: "ALL",
  search: "",
  cheatSheetSearch: "",
  cheatSheetPosition: "ALL",
  cheatSheetSource: "ALL",
  cheatSheetSort: "rank",
  cheatSheetPlanFilter: "ALL",
  flaggedPlayerIds: new Set(),
  assistantMessages: [],
  assistantSession: {
    version: ASSISTANT_SESSION_VERSION,
    draftSessionId: null,
    previousResponseId: null,
    messages: [],
    lastContextKey: null,
    answerDetail: "concise",
    status: "ready",
    offlineMode: false,
    lastUserMessage: "",
    lastError: "",
    suggestedPrompts: [],
  },
  bigBoardMoreColumns: false,
  candidateOutcome: {
    status: "idle",
    key: "",
    results: [],
    error: "",
  },
  draftSimulation: {
    running: false,
    title: "",
    message: "",
    picks: [],
  },
  bulk: {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    count: 25,
    depth: "standard",
    mode: "compare",
    strategy: "balanced",
    randomizeRoom: true,
    running: false,
    phase: "idle",
    phaseDetail: "",
    cancelRequested: false,
    cancelled: false,
    progress: 0,
    total: 0,
    results: null,
    selectedRunId: null,
    exportStatus: "",
    error: "",
    staleReason: "",
    draftPlan: null,
    survival: [],
    priority: [],
    counterfactual: { status: "idle", key: "", results: [], error: "", progress: 0, total: 0 },
  },
  learning: {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    predictionLogs: [],
    calibrationSummary: null,
    managerProfiles: [],
    postDraftGrades: {},
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
    targetTeam: "all",
    targetPlayer: "",
    targetRound: "",
    threshold: 95,
    includeKeepers: true,
    requireEqualPicks: true,
    ideas: [],
    allIdeas: [],
    declinedIdeaIds: [],
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

let PLAYER_POSITION_RANKS = null;
let PROJECTION_CACHE = new Map();
let POSITIONAL_EDGE_CACHE = null;
let CANDIDATE_OUTCOME_CACHE = new Map();
let SEASON_OUTCOME_CACHE = new Map();
let BULK_SIMULATION_CACHE = new Map();
let COUNTERFACTUAL_PICK_CACHE = new Map();
let SURVIVAL_ANALYSIS_CACHE = new Map();
let DRAFT_PLAN_PRIORITY_CACHE = new Map();
let LIVE_ANALYSIS_REFRESH_TIMER = null;

function clearPositionalEdgeCache() {
  POSITIONAL_EDGE_CACHE = null;
}

function clearProjectionCaches() {
  PLAYER_POSITION_RANKS = null;
  PROJECTION_CACHE = new Map();
  clearPositionalEdgeCache();
  CANDIDATE_OUTCOME_CACHE = new Map();
  SEASON_OUTCOME_CACHE = new Map();
  BULK_SIMULATION_CACHE = new Map();
  COUNTERFACTUAL_PICK_CACHE = new Map();
  SURVIVAL_ANALYSIS_CACHE = new Map();
  DRAFT_PLAN_PRIORITY_CACHE = new Map();
}

function normalizeBulkState(saved = {}) {
  const mode = saved.mode === "single" ? "single" : "compare";
  const depth = Object.prototype.hasOwnProperty.call(BULK_DEPTH_PRESETS, saved.depth) ? saved.depth : "standard";
  const countDefault = mode === "compare" ? BULK_DEPTH_PRESETS[depth] : BULK_SINGLE_DEFAULT;
  const legacyPresets = { quick: 3, standard: 6, deep: 10 };
  const savedCount = Number(saved.count);
  const migratedCount = mode === "compare" && Number(saved.schemaVersion || 0) < SIMULATOR_SCHEMA_VERSION
    && (!savedCount || savedCount === legacyPresets[depth])
    ? countDefault
    : savedCount;
  const count = Math.max(1, Math.min(bulkSafeCountLimit(mode), migratedCount || countDefault));
  return {
    ...state.bulk,
    ...saved,
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    count,
    depth,
    mode,
    strategy: BULK_STRATEGIES.some((item) => item.id === saved.strategy) ? saved.strategy : "balanced",
    randomizeRoom: saved.randomizeRoom !== false,
    running: false,
    phase: "idle",
    phaseDetail: "",
    cancelRequested: false,
    cancelled: false,
    progress: 0,
    total: 0,
    error: "",
    results: saved.results?.summary ? { summary: rehydrateBulkSummary(saved.results.summary), runs: [] } : null,
    draftPlan: saved.draftPlan || saved.results?.summary?.draftPlan || null,
    survival: Array.isArray(saved.survival) && saved.survival.length ? saved.survival : (saved.results?.summary?.survival || []),
    priority: rehydratePriorityRows(Array.isArray(saved.priority) && saved.priority.length ? saved.priority : (saved.results?.summary?.priority || [])),
    counterfactual: {
      status: saved.counterfactual?.results?.length ? "ready" : "idle",
      key: saved.counterfactual?.key || "",
      results: rehydrateCounterfactualRows(Array.isArray(saved.counterfactual?.results) ? saved.counterfactual.results : []),
      error: "",
      progress: 0,
      total: 0,
    },
  };
}

function normalizeLearningState(saved = {}) {
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    predictionLogs: Array.isArray(saved.predictionLogs) ? saved.predictionLogs.slice(-PREDICTION_RETENTION_LIMIT) : [],
    calibrationSummary: saved.calibrationSummary || null,
    managerProfiles: Array.isArray(saved.managerProfiles) ? saved.managerProfiles : [],
    postDraftGrades: saved.postDraftGrades && typeof saved.postDraftGrades === "object" ? saved.postDraftGrades : {},
  };
}

function simulatorStorageEnvelope() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIMULATOR_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}


function compactPlayerReference(player) {
  if (!player) return null;
  return { id: player.id, name: player.name, position: player.position, team: player.team, tier: player.tier, consensusRank: player.consensusRank, adp: player.adp };
}

function compactSimulationPlayer(player) {
  if (!player) return null;
  const projection = projectionProfileForPlayer(player);
  return {
    ...compactPlayerReference(player),
    weeklyProjection: projection.weeklyValue,
    projectionType: projection.projectionType,
  };
}

function bulkPickTrace(picks = []) {
  return picks
    .slice()
    .sort((a, b) => a.pick - b.pick)
    .map((pick) => [pick.pick, pick.team, pick.player.id, pick.keeper ? 1 : 0]);
}

function bulkRunPicks(run) {
  if (Array.isArray(run?.allPicks) && run.allPicks.length) return run.allPicks;
  return (run?.pickTrace || []).map(([pickNumber, team, playerId, keeper]) => {
    const order = draftOrderFor(pickNumber);
    const player = playerById(playerId) || { id: playerId, name: "Unknown player", position: "", team: "", consensusRank: null, adp: null, tier: null };
    return {
      pick: pickNumber,
      round: order.round,
      index: order.index,
      team,
      label: order.label,
      player: compactPlayerReference(player),
      keeper: Boolean(keeper),
    };
  });
}

function bulkRunForExport(run) {
  if (!run) return null;
  return { ...run, allPicks: bulkRunPicks(run) };
}

function compactRunForStorage(run) {
  if (!run) return null;
  return {
    id: run.id, runIndex: run.runIndex, seed: run.seed, strategy: run.strategy, strategyLabel: run.strategyLabel,
    openingBuild: run.openingBuild, firstFiveBuild: run.firstFiveBuild, score: run.score, value: run.value,
    relativeStrength: run.relativeStrength, rank: run.rank, playoffRate: run.playoffRate,
    championshipRate: run.championshipRate, topThreeRate: run.topThreeRate, lastPlaceRate: run.lastPlaceRate,
    averageRoomFinish: run.averageRoomFinish, seasonSimulationCount: run.seasonSimulationCount, weeklyProjection: run.weeklyProjection,
    userRoster: (run.userRoster || []).map(compactPlayerReference), positionComposition: run.positionComposition || {},
    userPicks: (run.userPicks || []).slice(0, 8),
  };
}

function compactGroupForStorage(group) {
  if (!group) return null;
  const { runs, best, median, downsideExample, worst, ...rest } = group;
  return {
    ...rest,
    best: compactRunForStorage(best),
    median: compactRunForStorage(median),
    downsideExample: compactRunForStorage(downsideExample),
    worst: compactRunForStorage(worst),
  };
}

function compactPriorityForStorage(rows = []) {
  return rows.slice(0, 350).map((row) => ({
    playerId: row.playerId || row.player?.id,
    labRank: row.labRank,
    priorityRank: row.priorityRank,
    movement: row.movement,
    priorityScore: row.priorityScore,
    survivalRate: row.survivalRate,
    nextPickSurvival: row.nextPickSurvival,
    survivalObserved: row.survivalObserved,
    tierSurvival: row.tierSurvival,
    replacementCost: row.replacementCost,
    successfulRosterFrequency: row.successfulRosterFrequency,
    positionalNeed: row.positionalNeed,
    strategyPathValue: row.strategyPathValue,
    leagueMarketDiscount: row.leagueMarketDiscount,
    reachCostPenalty: row.reachCostPenalty,
    redundancyPenalty: row.redundancyPenalty,
    positionalPivot: row.positionalPivot,
    confidence: row.confidence,
    targetRound: row.targetRound,
    earliestReasonablePick: row.earliestReasonablePick,
    tags: (row.tags || []).slice(0, 6),
    explanation: row.explanation,
    snipeThreats: (row.snipeThreats || []).slice(0, 3),
  }));
}

function compactSurvivalForStorage(rows = []) {
  const currentRound = state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick).round : LEAGUE.rounds;
  return rows
    .filter((row) => row.type === "tier" || (row.round >= currentRound - 1 && row.round <= currentRound + 3))
    .slice(0, 650)
    .map((row) => ({ type: row.type, round: row.round, id: row.id, name: row.name, position: row.position, tier: row.tier, observed: row.observed, survived: row.survived, survivalRate: row.survivalRate, followingPickSurvivalRate: row.followingPickSurvivalRate, endRoundSurvivalRate: row.endRoundSurvivalRate, averagePlayersRemaining: row.averagePlayersRemaining, confidence: row.confidence, label: row.label }));
}

function compactCounterfactualForStorage(rows = []) {
  return rows.slice(0, 12).map(({ player, expectedNextRoundOptions, ...row }) => ({
    ...row,
    playerId: row.playerId || player?.id,
    expectedNextRoundOptions: (expectedNextRoundOptions || []).slice(0, 6),
  }));
}

function compactBulkSummaryForStorage(summary) {
  if (!summary) return null;
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    createdAt: summary.createdAt,
    totalRuns: summary.totalRuns,
    outcomeBasis: summary.outcomeBasis,
    seasonCount: summary.seasonCount,
    strategies: (summary.strategies || []).map(compactGroupForStorage),
    builds: (summary.builds || []).map(compactGroupForStorage),
    openingBuilds: (summary.openingBuilds || []).map(compactGroupForStorage),
    bestStrategy: compactGroupForStorage(summary.bestStrategy),
    bestBuild: compactGroupForStorage(summary.bestBuild),
    comparison: summary.comparison,
    confidence: summary.confidence,
    commonPlayers: summary.commonPlayers,
    successfulPlayerFrequency: summary.successfulPlayerFrequency,
    survival: compactSurvivalForStorage(summary.survival || []),
    priority: compactPriorityForStorage(summary.priority || []),
    finalizationWarnings: (summary.finalizationWarnings || []).slice(0, 6),
    draftPlan: summary.draftPlan,
    examples: (summary.examples || []).map(compactRunForStorage),
  };
}

function rehydratePriorityRows(rows = []) {
  return rows.map((row) => ({ ...row, player: playerById(row.playerId) || row.player || null })).filter((row) => row.playerId);
}

function rehydrateCounterfactualRows(rows = []) {
  return rows.map((row) => ({ ...row, player: playerById(row.playerId) || row.player || null })).filter((row) => row.player);
}

function rehydrateBulkSummary(summary) {
  if (!summary) return null;
  const hydrateRun = (run) => run ? { ...run, userRoster: (run.userRoster || []).map((player) => playerById(player.id) || player) } : null;
  const hydrateGroup = (group) => group ? { ...group, runs: [], best: hydrateRun(group.best), median: hydrateRun(group.median), downsideExample: hydrateRun(group.downsideExample), worst: hydrateRun(group.worst) } : null;
  return {
    ...summary,
    strategies: (summary.strategies || []).map(hydrateGroup),
    builds: (summary.builds || []).map(hydrateGroup),
    openingBuilds: (summary.openingBuilds || []).map(hydrateGroup),
    bestStrategy: hydrateGroup(summary.bestStrategy),
    bestBuild: hydrateGroup(summary.bestBuild),
    priority: rehydratePriorityRows(summary.priority || []),
    examples: (summary.examples || []).map(hydrateRun),
    runs: [],
  };
}

function persistedSimulatorSnapshot() {
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    bulk: {
      schemaVersion: SIMULATOR_SCHEMA_VERSION,
      count: state.bulk.count,
      depth: state.bulk.depth,
      mode: state.bulk.mode,
      strategy: state.bulk.strategy,
      randomizeRoom: state.bulk.randomizeRoom,
      staleReason: state.bulk.staleReason || "",
      counterfactual: {
        key: state.bulk.counterfactual?.key || "",
        results: compactCounterfactualForStorage(state.bulk.counterfactual?.results || []),
      },
      results: state.bulk.results?.summary ? { summary: compactBulkSummaryForStorage(state.bulk.results.summary) } : null,
    },
    learning: normalizeLearningState(state.learning),
    updatedAt: new Date().toISOString(),
  };
}

function saveSimulatorState() {
  try {
    const envelope = simulatorStorageEnvelope();
    const leagues = envelope.leagues && typeof envelope.leagues === "object" ? envelope.leagues : {};
    leagues[String(state.activeLeagueId || LEAGUE.id || "default")] = persistedSimulatorSnapshot();
    localStorage.setItem(SIMULATOR_STORAGE_KEY, JSON.stringify({ schemaVersion: SIMULATOR_SCHEMA_VERSION, leagues }));
  } catch {
    // Simulator results remain available for the current browser session.
  }
}

function loadSimulatorState() {
  const envelope = simulatorStorageEnvelope();
  const saved = envelope.leagues?.[String(state.activeLeagueId || LEAGUE.id || "default")] || {};
  state.bulk = normalizeBulkState(saved.bulk || {});
  state.learning = normalizeLearningState(saved.learning || {});
  state.learning.calibrationSummary = calculateCalibrationSummary(state.learning.predictionLogs);
}

function invalidateSimulatorDerived(reason = "Draft inputs changed.", options = {}) {
  const keepSummary = options.keepSummary !== false;
  state.bulk.staleReason = reason;
  state.bulk.draftPlan = keepSummary ? state.bulk.draftPlan : null;
  state.bulk.survival = keepSummary ? state.bulk.survival : [];
  state.bulk.priority = keepSummary ? state.bulk.priority : [];
  state.bulk.counterfactual = { status: "idle", key: "", results: [], error: "", progress: 0, total: 0 };
  COUNTERFACTUAL_PICK_CACHE = new Map();
  SURVIVAL_ANALYSIS_CACHE = new Map();
  DRAFT_PLAN_PRIORITY_CACHE = new Map();
  if (!keepSummary) {
    state.bulk.results = null;
    BULK_SIMULATION_CACHE = new Map();
  }
  saveSimulatorState();
}

function scheduleLightweightDecisionRefresh(reason = "Draft state changed.") {
  if (LIVE_ANALYSIS_REFRESH_TIMER) window.clearTimeout(LIVE_ANALYSIS_REFRESH_TIMER);
  LIVE_ANALYSIS_REFRESH_TIMER = window.setTimeout(() => {
    invalidateSimulatorDerived(reason, { keepSummary: true });
    renderRecommendations();
    renderAvailable();
    renderCheatSheet();
  }, 180);
}

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
  const scoringName = settings.scoring || DEFAULT_LEAGUE.scoring;
  const scoringPreset = SCORING_PRESETS[scoringName] || SCORING_PRESETS[DEFAULT_LEAGUE.scoring];
  const scoringSettings = { ...scoringPreset, ...(settings.scoringSettings || {}) };
  return {
    id: settings.id || `league-${Date.now()}`,
    name: settings.name || "Default League",
    teams: Math.max(2, Math.min(20, Number(settings.teams) || DEFAULT_LEAGUE.teams)),
    scoring: scoringName,
    scoringSettings: {
      reception: Math.max(0, Math.min(2, Number(scoringSettings.reception) || 0)),
      teReceptionBonus: Math.max(0, Math.min(2, Number(scoringSettings.teReceptionBonus) || 0)),
      passTd: Math.max(0, Math.min(10, Number(scoringSettings.passTd) || 0)),
      rushRecTd: Math.max(0, Math.min(10, Number(scoringSettings.rushRecTd) || 0)),
    },
    rounds: Math.max(1, Math.min(25, Number(settings.rounds) || DEFAULT_LEAGUE.rounds)),
    playoffTeams: Math.max(2, Math.min(Number(settings.teams) || DEFAULT_LEAGUE.teams, Number(settings.playoffTeams) || Math.min(6, Math.max(2, Math.ceil((Number(settings.teams) || DEFAULT_LEAGUE.teams) / 2))))),
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
  const sleeperImport = normalizeSleeperImport(profile?.sleeperImport || null, league.teams);
  const teamPersonas = Array.from({ length: league.teams }, (_, index) => profile?.teamPersonas?.[index] || PERSONAS[index % PERSONAS.length].id);
  const personaSources = Array.from({ length: league.teams }, (_, index) => {
    const savedSource = profile?.personaSources?.[index];
    if (["manual", "scouting", "default"].includes(savedSource)) return savedSource;
    const inferred = sleeperImport?.scoutingReport?.teams?.[index]?.personaId;
    if (inferred && inferred === teamPersonas[index]) return "scouting";
    return profile?.teamPersonas?.[index] ? "manual" : "default";
  });
  return {
    ...league,
    teamNames: Array.from({ length: league.teams }, (_, index) => profile?.teamNames?.[index] || `Team ${index + 1}`),
    userTeam: Math.max(1, Math.min(league.teams, Number(profile?.userTeam) || Math.min(6, league.teams))),
    roundOrders: profile?.roundOrders || null,
    keeperSelections: profile?.keeperSelections || [],
    teamPersonas,
    personaSources,
    sleeperImport,
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
    personaSources: [...(state.personaSources || [])],
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
  state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => normalized.personaSources?.[index] || "default");
  state.sleeper.importData = normalizeSleeperImport(normalized.sleeperImport, LEAGUE.teams);
  syncRoomToLeague();
  rebuildConsensusPlayers(state.importedRankingRows);
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
  state.tradeFinder.allIdeas = [];
  state.tradeFinder.declinedIdeaIds = [];
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

function emptyScoutingReport(teamCount = LEAGUE.teams) {
  return {
    schemaVersion: 3,
    generatedAt: "",
    seasons: [],
    league: {
      draftsAnalyzed: 0,
      picksAnalyzed: 0,
      summary: "Import a Sleeper league to build the League Behavior Lab from completed drafts.",
      patterns: [],
      positionRounds: {},
      positionRoundCounts: {},
      positionCounts: {},
      firstRoundPositions: {},
      reachByPosition: {},
      seasonStats: [],
      marketReference: { historicalCount: 0, pickMetadataCount: 0, baselineCount: 0, directionalCount: 0, unavailableCount: 0 },
    },
    teams: Array.from({ length: teamCount }, (_, index) => ({
      team: index + 1,
      personaId: PERSONAS[index % PERSONAS.length].id,
      personaName: PERSONAS[index % PERSONAS.length].name,
      tendencies: [],
      strategy: "Not enough historical draft data yet.",
      patterns: [],
      patternCards: [],
      currentDraftPlan: [],
      pickRecords: [],
      seasons: [],
      seasonStats: [],
      positionBias: {},
      positionRounds: {},
      roundPositionBias: { early: {}, middle: {}, late: {} },
      roundPositionCounts: {},
      positionMinRound: {},
      positionMaxRound: {},
      positionAvgRound: {},
      firstRoundPositions: {},
      firstThreeBuilds: {},
      reachByPosition: {},
      reachProfile: "Unknown",
      avgReach: 0,
      picksAnalyzed: 0,
      draftsAnalyzed: 0,
      runOpportunityCount: 0,
      runChaseCount: 0,
      runChaseRate: 0,
      runStartOpportunityCount: 0,
      runStartCount: 0,
      runStartRate: 0,
      needOpportunityCount: 0,
      needFillCount: 0,
      needFillRate: 0,
      recentWeightShare: 0,
      slotEffectShare: 0,
    })),
  };
}

function normalizeScoutingReport(report, teamCount = LEAGUE.teams) {
  if (!report || !Array.isArray(report.teams)) return emptyScoutingReport(teamCount);
  const fallback = emptyScoutingReport(teamCount);
  const sourceLeague = report.league || {};
  return {
    ...fallback,
    ...report,
    schemaVersion: Math.max(3, Number(report.schemaVersion) || 1),
    seasons: Array.isArray(report.seasons) ? report.seasons : [],
    league: {
      ...fallback.league,
      ...sourceLeague,
      positionRounds: { ...fallback.league.positionRounds, ...(sourceLeague.positionRounds || {}) },
      positionRoundCounts: { ...fallback.league.positionRoundCounts, ...(sourceLeague.positionRoundCounts || {}) },
      positionCounts: { ...fallback.league.positionCounts, ...(sourceLeague.positionCounts || {}) },
      firstRoundPositions: { ...fallback.league.firstRoundPositions, ...(sourceLeague.firstRoundPositions || {}) },
      reachByPosition: { ...fallback.league.reachByPosition, ...(sourceLeague.reachByPosition || {}) },
      seasonStats: Array.isArray(sourceLeague.seasonStats) ? sourceLeague.seasonStats : [],
      marketReference: { ...fallback.league.marketReference, ...(sourceLeague.marketReference || {}) },
    },
    teams: Array.from({ length: teamCount }, (_, index) => {
      const source = report.teams[index] || report.teams.find((team) => Number(team.team) === index + 1) || {};
      const base = fallback.teams[index];
      return {
        ...base,
        ...source,
        team: index + 1,
        pickRecords: Array.isArray(source.pickRecords) ? source.pickRecords : [],
        seasons: Array.isArray(source.seasons) ? source.seasons : [],
        seasonStats: Array.isArray(source.seasonStats) ? source.seasonStats : [],
        tendencies: Array.isArray(source.tendencies) ? source.tendencies : [],
        patterns: Array.isArray(source.patterns) ? source.patterns : [],
        positionBias: { ...base.positionBias, ...(source.positionBias || {}) },
        positionRounds: { ...base.positionRounds, ...(source.positionRounds || {}) },
        roundPositionBias: {
          early: { ...(source.roundPositionBias?.early || {}) },
          middle: { ...(source.roundPositionBias?.middle || {}) },
          late: { ...(source.roundPositionBias?.late || {}) },
        },
        roundPositionCounts: { ...base.roundPositionCounts, ...(source.roundPositionCounts || {}) },
        positionMinRound: { ...base.positionMinRound, ...(source.positionMinRound || {}) },
        positionMaxRound: { ...base.positionMaxRound, ...(source.positionMaxRound || {}) },
        positionAvgRound: { ...base.positionAvgRound, ...(source.positionAvgRound || {}) },
        firstRoundPositions: { ...base.firstRoundPositions, ...(source.firstRoundPositions || {}) },
        firstThreeBuilds: { ...base.firstThreeBuilds, ...(source.firstThreeBuilds || {}) },
        reachByPosition: { ...base.reachByPosition, ...(source.reachByPosition || {}) },
      };
    }),
  };
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
    scoutingReport: normalizeScoutingReport(importData.scoutingReport || null, teamCount),
    teams: Array.from({ length: teamCount }, (_, index) => {
      const team = importData.teams[index] || {};
      const candidates = Array.isArray(team.keeperCandidates) ? team.keeperCandidates : [];
      const rosterPlayers = Array.isArray(team.rosterPlayers) ? team.rosterPlayers : candidates;
      return {
        team: index + 1,
        sleeperRosterId: team.sleeperRosterId || "",
        sleeperOwnerId: team.sleeperOwnerId || "",
        name: team.name || `Team ${index + 1}`,
        ownerName: team.ownerName || "",
        rosterPlayers: rosterPlayers
          .filter((player) => player && player.playerId)
          .map((player) => ({
            playerId: player.playerId,
            sleeperPlayerId: String(player.sleeperPlayerId || ""),
            name: player.name || "",
            position: player.position || "",
            team: player.team || "",
            round: Number(player.round) || "",
            pickNo: Number(player.pickNo) || "",
          }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
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
  state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => state.personaSources?.[index] || "default");
  state.teamNames = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamNames[index] || `Team ${index + 1}`);
}

function playerKey(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function historicalAdpSeasonData(season) {
  return window.FDL_HISTORICAL_ADP?.seasons?.[String(season)] || null;
}

function historicalAdpIndexForSeason(season) {
  const seasonKey = String(season || "");
  if (HISTORICAL_ADP_INDEX.has(seasonKey)) return HISTORICAL_ADP_INDEX.get(seasonKey);
  const seasonData = historicalAdpSeasonData(seasonKey);
  if (!seasonData?.players?.length) {
    HISTORICAL_ADP_INDEX.set(seasonKey, null);
    return null;
  }
  const byNamePosition = new Map();
  const byName = new Map();
  seasonData.players.forEach((player) => {
    const normalizedPosition = normalizePosition(player.position);
    const normalizedName = playerKey(player.name);
    if (!normalizedName) return;
    const row = {
      ...player,
      position: normalizedPosition,
      season: seasonKey,
      source: seasonData.meta?.source || "Historical season baseline",
      scoring: seasonData.meta?.scoring || "Unspecified",
      teams: seasonData.meta?.teams || null,
      precision: seasonData.meta?.precision || "season_baseline",
      snapshotStart: seasonData.meta?.snapshotStart || "",
      snapshotEnd: seasonData.meta?.snapshotEnd || "",
      tierMethod: seasonData.meta?.tierMethod || "derived_from_adp_gaps",
    };
    byNamePosition.set(`${normalizedName}|${normalizedPosition}`, row);
    if (!byName.has(normalizedName)) byName.set(normalizedName, []);
    byName.get(normalizedName).push(row);
  });
  const index = { byNamePosition, byName, meta: seasonData.meta || {} };
  HISTORICAL_ADP_INDEX.set(seasonKey, index);
  return index;
}

function historicalAdpForPlayer(season, name, position = "") {
  const index = historicalAdpIndexForSeason(season);
  if (!index || !name) return null;
  const normalizedName = playerKey(name);
  const normalizedPosition = normalizePosition(position);
  if (normalizedPosition) {
    const exact = index.byNamePosition.get(`${normalizedName}|${normalizedPosition}`);
    if (exact) return exact;
  }
  const nameMatches = index.byName.get(normalizedName) || [];
  return nameMatches.length === 1 ? nameMatches[0] : null;
}

function historicalAdpCoverageSummary() {
  const coverage = window.FDL_HISTORICAL_ADP?.coverage;
  if (!coverage?.seasonCount) return "No bundled historical ADP baselines";
  return `${coverage.startSeason}–${coverage.endSeason} season baselines (${coverage.seasonCount} seasons)`;
}

function defaultTeamPersonas() {
  return Array.from({ length: LEAGUE.teams }, (_, index) => PERSONAS[index % PERSONAS.length].id);
}

function personaAssignmentSource(team) {
  const source = state.personaSources?.[Number(team) - 1] || "default";
  if (source === "manual") return "Manual Persona selection";
  if (source === "scouting") return "League Behavior Lab inference";
  return "Default room persona";
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

function personaBehaviorDefaults(persona) {
  const style = String(persona?.strategyStyle || "Balanced");
  const aggression = String(persona?.positionalAggression || "Balanced");
  const base = {
    adpDiscipline: intensity(persona?.adpDiscipline) / 3,
    reachFrequency: intensity(persona?.reachFrequency) / 3,
    rosterNeedSensitivity: intensity(persona?.teamNeedWeight) / 3,
    upsidePreference: intensity(persona?.upsidePreference) / 3,
    rookieAppetite: intensity(persona?.rookieValue) / 3,
    volatility: intensity(persona?.reachFrequency) / 3,
    earlyQB: style === "Elite QB" ? 0.9 : 0.25,
    earlyTE: style === "Elite TE" ? 0.9 : 0.25,
    rbInvestment: ["Hero RB", "Robust RB"].includes(style) || aggression === "RB" ? 0.78 : style === "Zero RB" ? 0.2 : 0.5,
    wrInvestment: ["WR Heavy", "Zero RB"].includes(style) || aggression === "WR" ? 0.8 : 0.5,
    runStarting: 0.38,
    runChasing: style === "Bias Driven" ? 0.58 : 0.42,
    runAvoidance: persona?.experienceLevel === "Expert" ? 0.58 : 0.34,
    starterFirst: persona?.teamNeedWeight === "High" ? 0.78 : 0.56,
    depthFirst: ["Robust RB", "WR Heavy"].includes(style) ? 0.72 : 0.48,
    strategyConsistency: persona?.experienceLevel === "Expert" ? 0.74 : 0.58,
    nflTeamBias: style === "Bias Driven" ? 0.8 : 0.08,
    repeatPlayerPreference: style === "Bias Driven" ? 0.66 : 0.18,
  };
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, clampNumber(value, 0, 1)]));
}

function calibrationRowsForTeam(team) {
  return (state.learning?.predictionLogs || []).filter((row) => row.resolved && Number(row.team) === Number(team));
}

function managerBehaviorProfile(team, seed = state.mockSeed || 1, runIndex = 0) {
  const persona = getPersonaForTeam(team);
  const fallback = personaBehaviorDefaults(persona);
  const history = scoutingProfileForTeam(team);
  const sample = Number(history?.picksAnalyzed || 0);
  const shrink = sample / (sample + 30);
  const earlyCounts = history?.roundPositionBias?.early || {};
  const earlyTotal = Object.values(earlyCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const historySignals = {
    adpDiscipline: clampNumber(0.5 + Number(history?.avgReach || 0) / 40, 0.05, 0.95),
    reachFrequency: clampNumber(0.5 - Number(history?.avgReach || 0) / 36, 0.05, 0.95),
    rosterNeedSensitivity: clampNumber(Number(history?.needFillRate || 0.5), 0.05, 0.95),
    earlyQB: earlyTotal ? clampNumber((earlyCounts.QB || 0) / earlyTotal * 2.2, 0.05, 0.95) : fallback.earlyQB,
    earlyTE: earlyTotal ? clampNumber((earlyCounts.TE || 0) / earlyTotal * 2.2, 0.05, 0.95) : fallback.earlyTE,
    rbInvestment: earlyTotal ? clampNumber((earlyCounts.RB || 0) / earlyTotal * 1.5, 0.05, 0.95) : fallback.rbInvestment,
    wrInvestment: earlyTotal ? clampNumber((earlyCounts.WR || 0) / earlyTotal * 1.5, 0.05, 0.95) : fallback.wrInvestment,
    runStarting: clampNumber(Number(history?.runStartRate || fallback.runStarting), 0.05, 0.95),
    runChasing: clampNumber(Number(history?.runChaseRate || fallback.runChasing), 0.05, 0.95),
    runAvoidance: clampNumber(1 - Number(history?.runChaseRate || 0.42), 0.05, 0.95),
    starterFirst: clampNumber(Number(history?.needFillRate || fallback.starterFirst), 0.05, 0.95),
    depthFirst: fallback.depthFirst,
    upsidePreference: fallback.upsidePreference,
    rookieAppetite: fallback.rookieAppetite,
    strategyConsistency: fallback.strategyConsistency,
    nflTeamBias: fallback.nflTeamBias,
    repeatPlayerPreference: fallback.repeatPlayerPreference,
    volatility: fallback.volatility,
  };
  const resolved = calibrationRowsForTeam(team);
  const accuracy = resolved.length ? resolved.filter((row) => row.actualPosition === row.predictedTopPosition).length / resolved.length : null;
  const calibrationWeight = resolved.length >= 8 ? Math.min(0.28, resolved.length / 100) : 0;
  const profile = {};
  Object.keys(fallback).forEach((key) => {
    const historical = Number.isFinite(historySignals[key]) ? historySignals[key] : fallback[key];
    profile[key] = fallback[key] * (1 - shrink) + historical * shrink;
  });
  if (calibrationWeight) {
    profile.volatility = clampNumber(profile.volatility + (0.55 - accuracy) * calibrationWeight, 0.08, 0.95);
    profile.strategyConsistency = clampNumber(profile.strategyConsistency - (0.55 - accuracy) * calibrationWeight, 0.15, 0.95);
  }
  const controlledVariation = state.bulk?.randomizeRoom ? seededWave(seed, team, runIndex, sample) * 0.10 : 0;
  profile.volatility = clampNumber(profile.volatility + controlledVariation, 0.05, 0.95);
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    team,
    personaId: persona.id,
    personaLabel: persona.name,
    personaSource: personaAssignmentSource(team),
    historicalSample: sample,
    shrinkageWeight: shrink,
    calibrationSample: resolved.length,
    predictionAccuracy: accuracy,
    confidence: sample >= 45 && (accuracy === null || resolved.length >= 15) ? "High" : sample >= 12 || resolved.length >= 8 ? "Moderate" : "Low",
    ...Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, clampNumber(value, 0, 1)])),
  };
}

function currentRunPressure(position, picks = state.picks) {
  const recent = [...picks].sort((a, b) => b.pick - a.pick).slice(0, 6);
  const same = recent.filter((pick) => pick.player?.position === position).length;
  return clampNumber(same / 4, 0, 1);
}

function behaviorProfileDraftScore(player, team, pickNumber, profile, seed = state.mockSeed || 1, runIndex = 0) {
  const roster = rosterFor(team);
  const counts = positionCounts(roster);
  const round = draftOrderFor(pickNumber).round;
  const market = Number.isFinite(player.adp) ? player.adp : player.consensusRank;
  const adpDelta = market - pickNumber;
  const openNeed = Math.max(0, Number(LEAGUE.roster[player.position] || 0) - Number(counts[player.position] || 0));
  const runPressure = currentRunPressure(player.position);
  const positionInvestment = player.position === "RB" ? profile.rbInvestment : player.position === "WR" ? profile.wrInvestment : player.position === "QB" ? profile.earlyQB : player.position === "TE" ? profile.earlyTE : 0.2;
  let score = player.consensusRank;
  score += adpDelta > 0 ? adpDelta * profile.adpDiscipline * 0.88 : adpDelta * profile.adpDiscipline * 0.52;
  score -= openNeed * profile.rosterNeedSensitivity * (round <= 3 ? 2.2 : 5.8);
  score -= positionInvestment * (round <= 6 ? 7.5 : 3.5);
  score -= scoutingTendencyScore(player, team, pickNumber) * 0.82;
  score -= runPressure * profile.runChasing * 9;
  score += runPressure * profile.runAvoidance * 4.5;
  if (isYoungUpsidePlayer(player)) score -= profile.upsidePreference * 4 + profile.rookieAppetite * 3;
  if (["QB", "TE"].includes(player.position) && (counts[player.position] || 0) >= Math.max(1, LEAGUE.roster[player.position] || 1)) score += 38 + (1 - profile.depthFirst) * 28;
  if (["K", "DEF"].includes(player.position) && round < Math.max(11, LEAGUE.rounds - 3)) score += 55 - profile.rosterNeedSensitivity * 12;
  score += rosterRealismScore(player, roster, pickNumber, getPersonaForTeam(team)) * 0.75;
  const variance = seededWave(seed, runIndex + 1, team, pickNumber, player.consensusRank) * (2 + profile.volatility * 8);
  return score + variance;
}

function isYoungUpsidePlayer(player) {
  const age = Number(player?.age);
  const experience = Number(player?.yearsExperience);
  const developmental = Number.isFinite(age) ? age <= 25 : Number.isFinite(experience) ? experience <= 2 : false;
  const prospect = Number(player?.prospectScore);
  const opportunity = Number(player?.projectedOpportunityShare);
  return developmental && ((Number.isFinite(prospect) && prospect >= 60) || (Number.isFinite(opportunity) && opportunity >= 0.5));
}

function isRecognizableName(player) {
  return Number(player?.consensusRank) <= 80 || Number(player?.sourceCount) >= 3 || Number(player?.weightedProjection) >= 14;
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

function lockedKeeperPickNumbers(team = null) {
  return new Set(
    buildKeeperPicks()
      .filter((pick) => !team || pick.team === team)
      .map((pick) => pick.pick)
  );
}

function allOwnedPickOptions(team, options = {}) {
  const lockedKeeperPicks = options.includeKeeperLocked ? new Set() : lockedKeeperPickNumbers(team);
  const picks = [];
  for (let pick = 1; pick <= LEAGUE.teams * LEAGUE.rounds; pick += 1) {
    const order = draftOrderFor(pick);
    if (order.team === team && !lockedKeeperPicks.has(pick)) picks.push({ pick, ...order });
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
  const keeperSurplus = Math.max(-20, surplus + scarcityBoost);
  const optionValue = Math.max(0, keeperSurplus);
  const tradeValue = Math.min(optionValue, marketValue * 0.72);
  return {
    player,
    round: Number(round),
    marketPick,
    costPick,
    marketValue,
    costValue,
    tradeValue,
    surplus: keeperSurplus,
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
  invalidateSimulatorDerived("Keeper or traded-pick context changed.", { keepSummary: true });
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizedImportKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function importedValue(row, aliases) {
  const normalizedAliases = aliases.map(normalizedImportKey);
  const directKey = Object.keys(row).find((key) => normalizedAliases.includes(normalizedImportKey(key)));
  if (directKey) return row[directKey];
  const fuzzyKey = Object.keys(row).find((key) => {
    const normalizedKey = normalizedImportKey(key);
    return normalizedAliases.some((alias) => alias.length >= 5 && normalizedKey.length >= 5 && (normalizedKey.includes(alias) || alias.includes(normalizedKey)));
  });
  return fuzzyKey ? row[fuzzyKey] : "";
}

function numberValue(value) {
  const cleaned = String(value ?? "").replace(/[$,%\s,]/g, "").trim();
  if (!cleaned || cleaned === "-" || /^n\/?a$/i.test(cleaned)) return NaN;
  const direct = Number(cleaned);
  if (Number.isFinite(direct)) return direct;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function parseFantasyProsPlayerCell(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s{2,}([A-Z]{2,4})\s*(?:\(\d+\))?$/);
  if (!match) {
    const parentheticalTeam = raw.match(/^(.*?)\s*\(([A-Z]{2,4})\)\s*(?:\(\d+\))?$/);
    if (parentheticalTeam) return { name: parentheticalTeam[1].trim(), team: parentheticalTeam[2].trim() };
    const trailingTeam = raw.match(/^(.*?)\s+([A-Z]{2,4})\s*(?:QB|RB|WR|TE|K|DST|DEF)?\s*(?:\(\d+\))?$/);
    if (trailingTeam && !/^(QB|RB|WR|TE|K|DST|DEF)$/i.test(trailingTeam[1].trim())) {
      return { name: trailingTeam[1].trim(), team: trailingTeam[2].trim() };
    }
    return { name: raw, team: "" };
  }
  return {
    name: match[1].trim(),
    team: match[2].trim(),
  };
}

function normalizePosition(value) {
  const cleaned = String(value || "").trim().toUpperCase();
  const match = cleaned.match(/^(QB|RB|WR|TE|K|DST|DEF)/);
  if (!match) return cleaned;
  return match[1] === "DST" ? "DEF" : match[1];
}

function normalizeArchetypeTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function parseArchetypeTags(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[|,;\/]+/);
  return [...new Set(raw.map(normalizeArchetypeTag).filter(Boolean))];
}
function archetypeTagLabel(tag) {
  return String(tag || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeImportedRow(row, fallbackSource) {
  const rawName = importedValue(row, [
    "name", "player", "player name", "player_name", "full name", "full_name", "nfl player",
    "player bye", "player team bye", "player (bye)", "player info",
  ]);
  const parsedName = parseFantasyProsPlayerCell(rawName);
  const name = parsedName.name;
  const position = importedValue(row, ["position", "pos", "position rank", "position-rank", "position_rank", "pos rank", "pos-rank", "pos_rank", "positionrank", "posrank", "player position", "fantasy position"]);
  const team = importedValue(row, ["team", "tm", "nfl team", "nfl_team", "nflteam", "club", "player team"]) || parsedName.team;
  const source = importedValue(row, ["source"]) || fallbackSource;
  const rank = numberValue(importedValue(row, ["rank", "rk", "ecr", "overall", "overall rank", "value rank", "value_rank", "ovr", "overall ranking", "draft rank", "my rank", "market rank", "consensus rank", "consensus"]));
  const adp = numberValue(importedValue(row, [
    "adp", "avg", "avg adp", "average", "average adp", "average pick", "avg pick", "avg_pick", "avgpick",
    "adp average", "adp_average", "adp (average)", "adp ( average )", "adp avg", "adp_avg", "adpaverage",
    "market adp", "current adp", "draft adp", "underdog adp", "espn adp", "sleeper adp",
  ]));
  const bye = numberValue(importedValue(row, ["bye", "bye week", "bye_week", "week off"]));
  const projection = numberValue(importedValue(row, [
    "projection", "projections", "projected points", "projected fantasy points", "points", "fantasy points", "fantasy_points",
    "fantasy pts", "fantasy_pts", "ff pts", "ff_pts", "ffpts", "fpts", "score", "fantasy score",
  ]));
  const projectionPeriodRaw = importedValue(row, ["projection period", "projection_period", "period", "projection timeframe", "timeframe"]);
  const normalizedPeriod = String(projectionPeriodRaw || "").trim().toLowerCase();
  const projectionPeriod = normalizedPeriod.includes("week") ? "weekly" : normalizedPeriod.includes("season") || normalizedPeriod.includes("year") ? "season" : "unknown";
  const tier = numberValue(importedValue(row, ["tier", "tiers", "rank tier", "draft tier", "market tier"]));
  const keeperValue = numberValue(importedValue(row, ["keeper value", "keeperValue", "keeper_value", "keepervalue"]));
  const summary = importedValue(row, ["summary", "player summary", "player_summary", "playerSummary", "notes"]);
  const depthChartRole = importedValue(row, ["depth chart role", "depth_chart_role", "depthChartRole", "role"]);
  const depthChartRank = numberValue(importedValue(row, ["depth chart rank", "depth_chart_rank", "depthChartRank", "depth rank", "depth_rank", "DepthRank"]));
  const competition = importedValue(row, ["competition", "depth chart competition", "depth_chart_competition", "depthChartCompetition"]);
  const injuryNote = importedValue(row, ["injury note", "injury_note", "injuryNote", "injury"]);
  const teamContext = importedValue(row, ["team context", "team_context", "teamContext", "context"]);
  const upsideNote = importedValue(row, ["upside note", "upside_note", "upsideNote", "upside"]);
  const riskNote = importedValue(row, ["risk note", "risk_note", "riskNote", "risk"]);
  const tags = parseArchetypeTags(importedValue(row, [
    "tags", "tag", "archetype tags", "archetype_tags", "archetypes", "player tags", "player_tags", "traits", "player traits",
  ]));
  const hasRankingData = Number.isFinite(rank) || Number.isFinite(adp) || Number.isFinite(projection);
  const hasContextData = summary || depthChartRole || Number.isFinite(depthChartRank) || competition || injuryNote || teamContext || upsideNote || riskNote || tags.length;
  if (!name || (!hasRankingData && !hasContextData)) return null;
  return {
    id: playerKey(name), name: String(name).trim(), position: position ? normalizePosition(position) : "",
    team: team ? String(team).trim().toUpperCase() : "", source: String(source || fallbackSource || "Uploaded Source").trim(),
    rank: Number.isFinite(rank) ? rank : null, adp: Number.isFinite(adp) ? adp : null, bye: Number.isFinite(bye) ? bye : null,
    projection: Number.isFinite(projection) ? projection : null, projectionPeriod, tier: Number.isFinite(tier) ? tier : null,
    keeperValue: Number.isFinite(keeperValue) ? keeperValue : 0, summary: summary ? String(summary).trim() : "",
    depthChartRole: depthChartRole ? String(depthChartRole).trim() : "", depthChartRank: Number.isFinite(depthChartRank) ? depthChartRank : null,
    competition: competition ? String(competition).trim() : "", injuryNote: injuryNote ? String(injuryNote).trim() : "",
    teamContext: teamContext ? String(teamContext).trim() : "", upsideNote: upsideNote ? String(upsideNote).trim() : "",
    riskNote: riskNote ? String(riskNote).trim() : "", tags,
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
    const derivedContext = inferredSummary(player, depthRank, teammates);
    return {
      ...player,
      depthChartRank: depthRank,
      depthChartRole: player.depthChartRole || inferredDepthRole(player, depthRank),
      competition: player.competition || teammates.slice(0, 3).map((mate) => mate.name).join(", "),
      derivedContext,
      aiAnalysis: player.labAnalysis?.summary || derivedContext,
      summary: player.summary || derivedContext,
      contextSource: player.labAnalysis ? "Fantasy Draft Labs overlay" : "Derived from rankings",
    };
  });
}

function detectCsvDelimiter(text) {
  const candidates = [",", "\t", ";"];
  const sampleLines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 12);
  const scores = candidates.map((delimiter) => sampleLines.reduce((total, line) => {
    let quoted = false;
    let count = 0;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && quoted && next === '"') {
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        count += 1;
      }
    }
    return total + count;
  }, 0));
  const bestIndex = scores.indexOf(Math.max(...scores));
  return candidates[bestIndex] || ",";
}

function parseCsvRows(text) {
  const delimiter = detectCsvDelimiter(text);
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
    } else if (char === delimiter && !quoted) {
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
  return rows;
}

function importHeaderScore(row) {
  const keys = row.map(normalizedImportKey);
  const hasPlayer = keys.some((key) => ["player", "playername", "name", "fullname", "nflplayer", "playerbye", "playerteambye", "playerinfo"].includes(key));
  const hasPosition = keys.some((key) => ["position", "pos", "positionrank", "posrank", "fantasyposition", "playerposition"].includes(key));
  const hasTeam = keys.some((key) => ["team", "tm", "nflteam", "club", "playerteam"].includes(key));
  const hasRank = keys.some((key) => ["rank", "rk", "ecr", "overall", "overallrank", "ovr", "draftrank", "myrank", "marketrank", "consensusrank", "adp", "avg", "average", "avgadp", "averageadp", "projection", "points", "fpts", "ffpts", "score", "marketscore", "valuescore"].includes(key));
  const hasTier = keys.some((key) => ["tier", "tiers", "ranktier", "drafttier", "markettier"].includes(key));
  return Number(hasPlayer) * 2 + Number(hasRank) + Number(hasPosition) + Number(hasTeam) + Number(hasTier);
}

function uniqueHeaders(headers) {
  const counts = {};
  return headers.map((header, index) => {
    const base = String(header || "").trim() || `Column ${index + 1}`;
    const key = normalizedImportKey(base) || `column${index + 1}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts[key] > 1 ? `${base} ${counts[key]}` : base;
  });
}

function positionFromSectionText(value) {
  const text = normalizedImportKey(value);
  if (!text) return "";
  if (text.includes("quarterback") || text === "qb") return "QB";
  if (text.includes("runningback") || text === "rb") return "RB";
  if (text.includes("widereceiver") || text === "wr") return "WR";
  if (text.includes("tightend") || text === "te") return "TE";
  if (text.includes("kicker") || text === "k") return "K";
  if (text.includes("defense") || text.includes("dst") || text === "def") return "DEF";
  return "";
}

function isPlayerHeader(value) {
  return ["player", "playername", "name", "fullname", "nflplayer"].includes(normalizedImportKey(value));
}

function recordsFromSideBySideBlocks(rows, fallbackSource) {
  const records = [];
  rows.forEach((headerRow, headerIndex) => {
    const playerColumns = headerRow
      .map((cell, index) => (isPlayerHeader(cell) ? index : -1))
      .filter((index) => index >= 0);
    if (playerColumns.length < 2 || importHeaderScore(headerRow) < 3) return;

    playerColumns.forEach((playerColumn, blockIndex) => {
      const nextPlayerColumn = playerColumns[blockIndex + 1] ?? headerRow.length + 1;
      let start = playerColumn;
      for (let index = playerColumn - 1; index >= 0; index -= 1) {
        if (!headerRow[index] && index < playerColumn - 1) break;
        start = index;
        if (["rank", "rk", "overall", "overallrank"].includes(normalizedImportKey(headerRow[index]))) break;
      }
      let end = Math.min(nextPlayerColumn - 1, headerRow.length);
      while (end > start && !headerRow[end - 1]) end -= 1;
      const headers = uniqueHeaders(headerRow.slice(start, end));
      const sectionTitle = [rows[headerIndex - 2], rows[headerIndex - 1]]
        .filter(Boolean)
        .flatMap((row) => row.slice(start, end))
        .find((cell) => positionFromSectionText(cell)) || "";
      const inferredPosition = positionFromSectionText(sectionTitle);

      for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        if (importHeaderScore(row) >= 3 && row.some(isPlayerHeader)) break;
        const playerName = row[playerColumn];
        if (!playerName) continue;
        const record = headers.reduce((item, header, offset) => {
          item[header] = row[start + offset] || "";
          return item;
        }, {});
        if (inferredPosition && !importedValue(record, ["position", "pos", "position rank", "pos rank"])) {
          record.Position = inferredPosition;
        }
        record.source = record.source || (sectionTitle ? `${fallbackSource} - ${sectionTitle}` : fallbackSource);
        records.push(record);
      }
    });
  });
  return records;
}

function recordsFromTableRows(rows, fallbackSource) {
  const cleanedRows = rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
  const sideBySideRecords = recordsFromSideBySideBlocks(cleanedRows, fallbackSource);
  if (sideBySideRecords.length) return sideBySideRecords;
  const records = [];
  let headers = null;
  let source = fallbackSource;

  cleanedRows.forEach((row) => {
    const score = importHeaderScore(row);
    if (score >= 3) {
      headers = uniqueHeaders(row);
      return;
    }
    if (!headers) {
      const title = row.filter(Boolean).join(" ");
      if (title && row.filter(Boolean).length <= 3) source = `${fallbackSource} - ${title}`.slice(0, 90);
      return;
    }
    const record = headers.reduce((item, header, index) => {
      item[header] = row[index] || "";
      return item;
    }, {});
    record.source = record.source || source;
    records.push(record);
  });
  return records;
}

function parseCsv(text, fallbackSource = "CSV Upload") {
  const rows = parseCsvRows(text).filter((row) => row.some(Boolean));
  const records = recordsFromTableRows(rows, fallbackSource);
  if (records.length) return records;
  const headerIndex = rows.findIndex((row) => importHeaderScore(row) >= 2);
  const headers = uniqueHeaders((headerIndex >= 0 ? rows[headerIndex] : rows[0] || []).map((header) => header.trim()));
  return rows
    .slice(headerIndex >= 0 ? headerIndex + 1 : 1)
    .filter((row) => row.some(Boolean))
    .map((row) => headers.reduce((record, header, index) => {
      record[header] = row[index];
      return record;
    }, {}));
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

async function inflateZipEntry(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot unzip XLSX files. Export this source as CSV, or use a current Chrome, Edge, or Samsung Browser build.");
  }
  const formats = ["deflate-raw", "deflate"];
  let lastError = null;
  for (const format of formats) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Could not decompress XLSX sheet data.");
}

async function unzipXlsxEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  let eocdOffset = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 66000); index -= 1) {
    if (readUint32(bytes, index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Could not read XLSX zip directory.");
  const entryCount = readUint16(bytes, eocdOffset + 10);
  let directoryOffset = readUint32(bytes, eocdOffset + 16);
  const entries = new Map();

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (readUint32(bytes, directoryOffset) !== 0x02014b50) break;
    const method = readUint16(bytes, directoryOffset + 10);
    const compressedSize = readUint32(bytes, directoryOffset + 20);
    const fileNameLength = readUint16(bytes, directoryOffset + 28);
    const extraLength = readUint16(bytes, directoryOffset + 30);
    const commentLength = readUint16(bytes, directoryOffset + 32);
    const localHeaderOffset = readUint32(bytes, directoryOffset + 42);
    const fileName = new TextDecoder().decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + fileNameLength));
    const localNameLength = readUint16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUint16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const contentBytes = method === 0 ? compressed : method === 8 ? await inflateZipEntry(compressed) : null;
    if (contentBytes) entries.set(fileName.replace(/^\/+/, ""), new TextDecoder().decode(contentBytes));
    directoryOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function xmlDoc(text) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function xmlElements(parent, localName) {
  return Array.from(parent.getElementsByTagName("*")).filter((node) => node.localName === localName);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = xmlDoc(xml);
  return xmlElements(doc, "si").map((item) => xmlElements(item, "t").map((node) => node.textContent || "").join(""));
}

function columnIndexFromCellRef(ref) {
  const letters = String(ref || "").match(/[A-Z]+/i)?.[0] || "A";
  return letters.toUpperCase().split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function cellText(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return xmlElements(cell, "t").map((node) => node.textContent || "").join("");
  const value = xmlElements(cell, "v")[0]?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(value)] || "";
  if (type === "b") return value === "1" ? "TRUE" : "FALSE";
  return value;
}

function parseWorksheetRows(xml, sharedStrings) {
  const doc = xmlDoc(xml);
  return xmlElements(doc, "row").map((row) => {
    const cells = [];
    xmlElements(row, "c").forEach((cell) => {
      cells[columnIndexFromCellRef(cell.getAttribute("r"))] = cellText(cell, sharedStrings);
    });
    return cells.map((cell) => cell ?? "");
  });
}

function normalizeXlsxPath(path) {
  const parts = [];
  path.split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });
  return parts.join("/");
}

function parseWorkbookSheets(entries) {
  const workbookXml = entries.get("xl/workbook.xml");
  const relsXml = entries.get("xl/_rels/workbook.xml.rels");
  const defaultSheets = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .map((path, index) => ({ name: `Sheet ${index + 1}`, path }));
  if (!workbookXml || !relsXml) return defaultSheets;
  const relDoc = xmlDoc(relsXml);
  const rels = new Map(xmlElements(relDoc, "Relationship").map((rel) => {
    const target = rel.getAttribute("Target") || "";
    return [
      rel.getAttribute("Id"),
      target.startsWith("/") ? normalizeXlsxPath(target.slice(1)) : normalizeXlsxPath(`xl/${target}`),
    ];
  }));
  const workbookDoc = xmlDoc(workbookXml);
  const sheets = xmlElements(workbookDoc, "sheet")
    .map((sheet, index) => {
      const rid = sheet.getAttribute("r:id") || sheet.getAttribute("id");
      return {
        name: sheet.getAttribute("name") || `Sheet ${index + 1}`,
        path: rels.get(rid),
      };
    })
    .filter((sheet) => sheet.path && entries.has(sheet.path));
  return sheets.length ? sheets : defaultSheets;
}

async function parseXlsxRankingFile(buffer, fileName) {
  const sourceName = fileName.replace(/\.(xlsx|xlsm)$/i, "").replace(/[-_]+/g, " ");
  const entries = await unzipXlsxEntries(buffer);
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml"));
  return parseWorkbookSheets(entries).flatMap((sheet) => {
    const rows = parseWorksheetRows(entries.get(sheet.path), sharedStrings);
    return recordsFromTableRows(rows, `${sourceName} - ${sheet.name}`)
      .map((row) => normalizeImportedRow(row, `${sourceName} - ${sheet.name}`))
      .filter(Boolean);
  });
}

function parseRankingFile(text, fileName) {
  const sourceName = fileName.replace(/\.(csv|tsv|json)$/i, "").replace(/[-_]+/g, " ");
  if (/\.json$/i.test(fileName) || text.trim().startsWith("{") || text.trim().startsWith("[")) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.rankings || parsed.players || [];
    const source = parsed.source || parsed.name || sourceName;
    return rows.map((row) => normalizeImportedRow(row, source)).filter(Boolean);
  }
  return parseCsv(text, sourceName).map((row) => normalizeImportedRow(row, sourceName)).filter(Boolean);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function sourceRankPercentile(rank, listSize) {
  if (!Number.isFinite(rank)) return null;
  const size = Math.max(2, Number(listSize) || 2);
  return clampNumber(1 - ((rank - 1) / (size - 1)), 0, 1);
}

function rankingSourceWeight(sourceName) {
  const saved = Number(state.rankingSourceWeights?.[sourceName]);
  if (Number.isFinite(saved)) return clampNumber(saved, 0, 5);
  return 3;
}

function leagueDemandByPosition(league = activeLeague()) {
  const roster = league.roster || DEFAULT_LEAGUE.roster;
  const flex = Number(roster.FLEX) || 0;
  return {
    QB: Number(roster.QB) || 0,
    RB: (Number(roster.RB) || 0) + flex * 0.45,
    WR: (Number(roster.WR) || 0) + flex * 0.45,
    TE: (Number(roster.TE) || 0) + flex * 0.10,
    K: Number(roster.K) || 0,
    DEF: Number(roster.DEF) || 0,
  };
}

function estimatedReceptionProfile(position, positionRank) {
  const rank = Math.max(1, Number(positionRank) || 1);
  if (position === "RB") return Math.max(1.2, 4.5 - rank * 0.055);
  if (position === "WR") return Math.max(2.2, 7.0 - rank * 0.070);
  if (position === "TE") return Math.max(1.7, 5.9 - rank * 0.115);
  return 0;
}

function leagueFitAnalysisForPlayer(player, positionRank) {
  const league = activeLeague();
  const settings = scoringSettingsForLeague(league);
  const demand = leagueDemandByPosition(league);
  const defaultDemand = leagueDemandByPosition(DEFAULT_LEAGUE);
  const position = player.position;
  const teams = Math.max(2, Number(league.teams) || 12);
  const defaultTeams = Math.max(2, Number(DEFAULT_LEAGUE.teams) || 12);
  const replacement = Math.max(1, Math.round(teams * (demand[position] || 1)));
  const defaultReplacement = Math.max(1, Math.round(defaultTeams * (defaultDemand[position] || 1)));
  const scarcity = clampNumber((replacement - positionRank + 1) / replacement, -0.5, 1);
  const defaultScarcity = clampNumber((defaultReplacement - positionRank + 1) / defaultReplacement, -0.5, 1);
  const demandRatio = (demand[position] || 1) / Math.max(0.25, defaultDemand[position] || 1);
  const reasons = [];
  const neutralReasons = [];
  let scoringAdjustment = 0;

  if (["RB", "WR", "TE"].includes(position)) {
    const receptions = estimatedReceptionProfile(position, positionRank);
    const pprDelta = settings.reception - DEFAULT_LEAGUE.scoringSettings.reception;
    const teDelta = position === "TE" ? settings.teReceptionBonus - DEFAULT_LEAGUE.scoringSettings.teReceptionBonus : 0;
    const receptionImpact = receptions * (pprDelta + teDelta) * 3.2;
    scoringAdjustment += receptionImpact;
    if (Math.abs(pprDelta) >= 0.01) {
      const receptionText = settings.reception.toFixed(2).replace(/\.00$/, "");
      reasons.push(`${receptionText} ${Math.abs(settings.reception - 1) < 0.001 ? "point" : "points"} per reception versus the 0.5-point baseline ${pprDelta > 0 ? "raises" : "lowers"} ${position} reception value.`);
    }
    if (position === "TE" && Math.abs(teDelta) >= 0.01) {
      const teBonusText = settings.teReceptionBonus.toFixed(2).replace(/\.00$/, "");
      reasons.push(`The ${teBonusText}-point TE reception bonus specifically improves tight-end scoring.`);
    }
  }
  if (position === "QB") {
    const passDelta = settings.passTd - DEFAULT_LEAGUE.scoringSettings.passTd;
    scoringAdjustment += passDelta * 4.2;
    if (Math.abs(passDelta) >= 0.01) {
      reasons.push(`${settings.passTd}-point passing touchdowns versus the 4-point baseline ${passDelta > 0 ? "increase" : "reduce"} quarterback value.`);
    }
  }
  if (["QB", "RB", "WR", "TE"].includes(position)) {
    const tdDelta = settings.rushRecTd - DEFAULT_LEAGUE.scoringSettings.rushRecTd;
    scoringAdjustment += tdDelta * 1.8;
    if (Math.abs(tdDelta) >= 0.01) {
      reasons.push(`${settings.rushRecTd}-point rushing/receiving touchdowns versus the 6-point baseline ${tdDelta > 0 ? "increase" : "reduce"} touchdown value.`);
    }
  }

  const rosterAdjustment = (demandRatio - 1) * 18;
  const scarcityAdjustment = (scarcity - defaultScarcity) * 10;
  if (demandRatio >= 1.05) {
    const roster = league.roster || DEFAULT_LEAGUE.roster;
    reasons.push(`${roster[position] || 0} starting ${position}${(roster[position] || 0) === 1 ? " slot" : " slots"}${["RB", "WR", "TE"].includes(position) && roster.FLEX ? ` plus ${roster.FLEX} flex` : ""} create more ${position} demand than the default league.`);
  } else if (demandRatio <= 0.95) {
    reasons.push(`Your lineup requires less ${position} demand than the default league, reducing positional scarcity.`);
  }
  if (Math.abs(scarcityAdjustment) >= 0.35) {
    reasons.push(`At base ${position}${positionRank}, the estimated starter/flex replacement boundary is ${position}${replacement} in this league versus ${position}${defaultReplacement} in the default format.`);
  }

  const adjustment = scoringAdjustment + rosterAdjustment + scarcityAdjustment;
  if (Math.abs(adjustment) < 0.75) {
    neutralReasons.push(`Your ${league.scoring || "custom"} scoring and starter requirements are close to the default Half-PPR baseline for ${position}, so no meaningful league adjustment was applied.`);
  }

  return {
    score: clampNumber(50 + adjustment, 0, 100),
    adjustment,
    reasons,
    neutralReasons,
    replacement,
    defaultReplacement,
    scoringAdjustment,
    rosterAdjustment,
    scarcityAdjustment,
  };
}


function leagueFitScoreForPlayer(player, positionRank) {
  return leagueFitAnalysisForPlayer(player, positionRank).score;
}

function draftGuideSignalForPlayer(player) {
  const positiveSignals = [
    { id: "three_down", label: "three-down role", terms: ["three-down", "three down"], weight: 3.2 },
    { id: "receiving_role", label: "receiving role", terms: ["pass-catching", "pass catching", "receiving back", "targets per route"], weight: 2.8 },
    { id: "target_volume", label: "target volume", terms: ["target share", "target hog", "first read", "primary target"], weight: 3.0 },
    { id: "routes", label: "route participation", terms: ["routes", "route participation", "route-heavy", "route heavy"], weight: 2.5 },
    { id: "scoring_role", label: "goal-line/red-zone role", terms: ["goal line", "red zone", "red-zone"], weight: 2.4 },
    { id: "rushing_upside", label: "rushing upside", terms: ["rushing upside", "mobile quarterback", "rushing qb"], weight: 2.8 },
    { id: "clear_role", label: "clear role", terms: ["featured", "lead back", "primary", "clear role", "elite usage"], weight: 2.8 },
    { id: "explosive", label: "explosive upside", terms: ["explosive", "breakout", "upside", "ceiling", "yac"], weight: 2.0 },
    { id: "slot", label: "slot usage", terms: ["slot"], weight: 1.6 },
    { id: "downfield", label: "downfield role", terms: ["deep threat", "downfield", "air yards"], weight: 1.6 },
    { id: "youth", label: "rookie/young breakout profile", terms: ["rookie", "second-year", "second year"], weight: 1.2 },
  ];
  const negativeSignals = [
    { id: "injury", label: "injury/recovery risk", terms: ["injury", "surgery", "recovery", "rehab", "limited practice", "questionable"], weight: 3.2 },
    { id: "availability", label: "availability risk", terms: ["suspension", "holdout"], weight: 3.0 },
    { id: "committee", label: "committee/timeshare risk", terms: ["committee", "timeshare"], weight: 3.0 },
    { id: "competition", label: "target or backfield competition", terms: ["competition", "crowded", "target competition"], weight: 2.6 },
    { id: "uncertain_role", label: "uncertain role", terms: ["uncertain", "role concern", "role risk"], weight: 2.8 },
    { id: "backup", label: "backup/depth role", terms: ["backup", "buried", "depth option"], weight: 2.6 },
    { id: "decline", label: "decline risk", terms: ["decline", "age risk"], weight: 2.2 },
    { id: "blocking", label: "blocking-heavy role", terms: ["blocking role", "blocking-heavy", "blocking heavy"], weight: 2.0 },
    { id: "supporting_cast", label: "weak supporting cast", terms: ["weak supporting cast", "poor offense", "quarterback uncertainty"], weight: 1.8 },
  ];
  const tagAliases = {
    three_down: "three_down",
    pass_catching: "receiving_role",
    receiving_back: "receiving_role",
    target_hog: "target_volume",
    first_read: "target_volume",
    route_heavy: "routes",
    red_zone: "scoring_role",
    goal_line: "scoring_role",
    rushing_qb: "rushing_upside",
    elite_usage: "clear_role",
    clear_role: "clear_role",
    explosive: "explosive",
    breakout: "explosive",
    yac: "explosive",
    slot: "slot",
    deep_threat: "downfield",
    high_volume: "target_volume",
    rookie: "youth",
    committee: "committee",
    crowded_room: "competition",
    target_competition: "competition",
    uncertain_role: "uncertain_role",
    injury_risk: "injury",
    blocking_role: "blocking",
    backup: "backup",
    weak_supporting_cast: "supporting_cast",
  };
  const summaryFields = (player.sourceSummaries || [])
    .filter((item) => item?.text)
    .map((item) => [`Summary${item.source ? ` (${item.source})` : ""}`, item.text]);
  if (!summaryFields.length && (player.sourceSummary || player.summary)) summaryFields.push(["Summary", player.sourceSummary || player.summary]);
  const contextFields = [
    ...summaryFields,
    ["Role", player.depthChartRole],
    ["Competition", player.competition],
    ["Injury note", player.injuryNote],
    ["Team context", player.teamContext],
    ["Upside note", player.upsideNote],
    ["Risk note", player.riskNote],
  ].filter(([, value]) => value);
  const text = contextFields.map(([, value]) => value).join(" ").toLowerCase();
  const positiveById = new Map(positiveSignals.map((signal) => [signal.id, signal]));
  const negativeById = new Map(negativeSignals.map((signal) => [signal.id, signal]));
  const positiveMatches = new Map();
  const negativeMatches = new Map();

  positiveSignals.forEach((signal) => {
    const term = signal.terms.find((candidate) => text.includes(candidate));
    if (term) positiveMatches.set(signal.id, { ...signal, evidence: `Matched “${term}” in uploaded context` });
  });
  negativeSignals.forEach((signal) => {
    const term = signal.terms.find((candidate) => text.includes(candidate));
    if (term) negativeMatches.set(signal.id, { ...signal, evidence: `Matched “${term}” in uploaded context` });
  });
  (player.tags || []).forEach((tag) => {
    const id = tagAliases[tag] || tag;
    if (positiveById.has(id)) positiveMatches.set(id, { ...positiveById.get(id), evidence: `Archetype tag: ${archetypeTagLabel(tag)}` });
    if (negativeById.has(id)) negativeMatches.set(id, { ...negativeById.get(id), evidence: `Archetype tag: ${archetypeTagLabel(tag)}` });
  });

  let adjustment = [...positiveMatches.values()].reduce((sum, signal) => sum + signal.weight, 0)
    - [...negativeMatches.values()].reduce((sum, signal) => sum + signal.weight, 0);
  const structuralEvidence = [];
  if (Number.isFinite(player.depthChartRank)) {
    if (player.depthChartRank === 1) {
      adjustment += 6;
      structuralEvidence.push("Uploaded depth-chart rank: 1");
    } else if (player.depthChartRank === 2) {
      adjustment += 2;
      structuralEvidence.push("Uploaded depth-chart rank: 2");
    } else if (player.depthChartRank >= 4) {
      adjustment -= 5;
      structuralEvidence.push(`Uploaded depth-chart rank: ${player.depthChartRank}`);
      negativeMatches.set("buried_depth", { id: "buried_depth", label: "buried depth-chart role", evidence: `Depth-chart rank ${player.depthChartRank}`, weight: 5 });
    }
  }
  if (Number.isFinite(player.keeperValue) && player.keeperValue > 0) {
    adjustment += Math.min(5, player.keeperValue * 0.5);
    structuralEvidence.push(`Keeper value: ${player.keeperValue}`);
  }

  return {
    score: clampNumber(50 + adjustment, 0, 100),
    adjustment,
    positive: [...positiveMatches.values()],
    risks: [...negativeMatches.values()],
    evidence: contextFields.map(([label, value]) => ({ label, text: String(value) })),
    structuralEvidence,
    tags: player.tags || [],
    hasContext: Boolean(contextFields.length || (player.tags || []).length || Number.isFinite(player.depthChartRank) || player.keeperValue > 0),
  };
}


function sourceAgreementAnalysis(sourceParts = []) {
  const parts = sourceParts.filter((part) => Number.isFinite(part.rank));
  const ranks = parts.map((part) => part.rank);
  const percentiles = parts.map((part) => part.percentile).filter(Number.isFinite);
  const minRank = ranks.length ? Math.min(...ranks) : null;
  const maxRank = ranks.length ? Math.max(...ranks) : null;
  const rankRange = ranks.length > 1 ? maxRank - minRank : 0;
  const percentileSpread = percentiles.length > 1 ? (Math.max(...percentiles) - Math.min(...percentiles)) * 100 : null;
  const agreementScore = parts.length <= 1 ? 35 : clampNumber(100 - percentileSpread * 1.8, 0, 100);
  const agreementLabel = parts.length <= 1 ? "Not measurable" : agreementScore >= 75 ? "Strong" : agreementScore >= 50 ? "Moderate" : "Low";
  return { parts, minRank, maxRank, rankRange, percentileSpread, agreementScore, agreementLabel };
}

function playerContextCompleteness(player) {
  const fields = [
    player.sourceSummary,
    player.depthChartRole,
    player.competition,
    player.injuryNote,
    player.teamContext,
    player.upsideNote,
    player.riskNote,
    (player.tags || []).length ? player.tags.join("|") : "",
  ];
  const count = fields.filter(Boolean).length + (Number.isFinite(player.depthChartRank) ? 1 : 0);
  return { count, score: clampNumber((count / 5) * 100, 0, 100) };
}


function leagueBehaviorCoverageScore() {
  const teams = activeLeagueProfile()?.sleeperImport?.scoutingReport?.teams || [];
  const covered = teams.filter((team) => Number(team?.picksAnalyzed) > 0).length;
  return teams.length ? clampNumber((covered / teams.length) * 100, 0, 100) : 0;
}

function projectionAgreementAnalysis(player) {
  const values = (player.importedProjections || []).map((item) => Number(item.weeklyValue)).filter(Number.isFinite);
  const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
  const center = median(values) || 0;
  const disagreement = center > 0 ? spread / center : values.length > 1 ? 1 : 0;
  return { values, spread, disagreement, score: values.length <= 1 ? 45 : clampNumber(100 - disagreement * 180, 0, 100) };
}

function rankingConfidenceAnalysis(player, simulation = null) {
  const source = sourceAgreementAnalysis(player.sourceParts || []);
  const context = playerContextCompleteness(player);
  const projection = projectionAgreementAnalysis(player);
  const sourceCount = source.parts.length;
  const sourceCountScore = sourceCount <= 1 ? 20 : sourceCount === 2 ? 58 : sourceCount === 3 ? 80 : 100;
  const projectionAvailability = projection.values.length ? 100 : 25;
  const injuryUncertainty = player.injuryNote || /injur|questionable|uncertain|committee|competition/i.test(`${player.riskNote || ""} ${player.competition || ""}`) ? 35 : 90;
  const behaviorCoverage = leagueBehaviorCoverageScore();
  const simulationCountScore = simulation ? clampNumber((Number(simulation.simulationCount) || 0) / 8 * 100, 0, 100) : 50;
  const stabilityScore = simulation ? clampNumber(100 - (Number(simulation.stability) || 0) * 900, 0, 100) : 50;
  const score = sourceCountScore * 0.20 + source.agreementScore * 0.16 + projectionAvailability * 0.13
    + projection.score * 0.12 + context.score * 0.12 + injuryUncertainty * 0.09 + behaviorCoverage * 0.07
    + simulationCountScore * 0.06 + stabilityScore * 0.05;
  const label = score >= 74 ? "High" : score >= 48 ? "Medium" : "Low";
  const weaknesses = [];
  if (sourceCount <= 1) weaknesses.push("only one independent ranking source");
  if (source.parts.length > 1 && source.agreementScore < 50) weaknesses.push(`rankings disagree by ${Math.round(source.rankRange)} spots`);
  if (!projection.values.length) weaknesses.push("no imported projection");
  if (projection.disagreement > 0.18) weaknesses.push("projection sources disagree");
  if (context.count === 0) weaknesses.push("limited player context");
  if (injuryUncertainty < 50) weaknesses.push("injury or role uncertainty");
  if (behaviorCoverage < 30) weaknesses.push("limited League Behavior history");
  if (simulation && simulationCountScore < 75) weaknesses.push("limited candidate simulations");
  if (simulation && stabilityScore < 55) weaknesses.push("simulation results were unstable");
  const reasons = [];
  reasons.push(sourceCount > 1 ? `${sourceCount} independent ranking sources` : "one ranking source");
  reasons.push(projection.values.length ? `${projection.values.length} projection source${projection.values.length === 1 ? "" : "s"}` : "model projection only");
  if (context.count) reasons.push(`${context.count} player-context field${context.count === 1 ? "" : "s"}`);
  return { score, label, reasons, confidenceReason: label === "Low" ? (weaknesses[0] || "limited evidence") : "", weaknesses, source, context, projection, behaviorCoverage };
}

function joinNatural(items, limit = 3) {
  const clean = items.filter(Boolean).slice(0, limit);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
}

function buildRankAnalysis(player) {
  const movement = Number(player.modelEdge) || 0;
  const movementText = movement > 0 ? `up ${movement} from Base #${player.baseConsensusRank}` : movement < 0 ? `down ${Math.abs(movement)} from Base #${player.baseConsensusRank}` : `unchanged from Base #${player.baseConsensusRank}`;
  const source = player.confidenceAnalysis?.source || sourceAgreementAnalysis(player.sourceParts || []);
  const onlySleeper = source.parts.length === 1 && source.parts[0].source === SEED_SOURCE.name;
  const league = player.leagueAnalysis || { reasons: [], neutralReasons: [] };
  const guide = player.guideAnalysis || { positive: [], risks: [], hasContext: false };
  const confidence = player.confidenceAnalysis || rankingConfidenceAnalysis(player);
  const sourceSummary = source.parts.length <= 1
    ? `${onlySleeper ? "Only the Sleeper ADP baseline" : "Only one weighted source"} is available, so independent source agreement cannot be measured.`
    : `${source.parts.length} weighted sources span raw ranks #${Math.round(source.minRank)}–#${Math.round(source.maxRank)}; normalized agreement is ${source.agreementLabel.toLowerCase()}.`;
  const leagueSummary = league.reasons[0] || league.neutralReasons[0] || "No material league-setting adjustment was identified.";
  const positiveLabels = guide.positive.map((signal) => signal.label);
  const riskLabels = guide.risks.map((signal) => signal.label);
  let guideSummary = "No player-specific guide notes or archetype tags were imported.";
  if (positiveLabels.length && riskLabels.length) guideSummary = `${joinNatural(positiveLabels)} ${positiveLabels.length === 1 ? "supports" : "support"} the profile, while ${joinNatural(riskLabels)} ${riskLabels.length === 1 ? "adds" : "add"} caution.`;
  else if (positiveLabels.length) guideSummary = `${joinNatural(positiveLabels)} ${positiveLabels.length === 1 ? "supports" : "support"} the profile.`;
  else if (riskLabels.length) guideSummary = `${joinNatural(riskLabels)} ${riskLabels.length === 1 ? "adds" : "add"} caution.`;

  const warnings = [];
  if (onlySleeper) warnings.push("Upload at least one independent ranking source to measure consensus and disagreement.");
  if (!guide.hasContext) warnings.push("Add summary, role, risk/upside notes, or archetype tags for player-specific Draft Guide analysis.");
  const finalReason = movement > 0
    ? "League or guide evidence was strong enough to move the player above the weighted source baseline."
    : movement < 0
      ? "League or risk evidence lowered the player below the weighted source baseline."
      : "The overlay found no evidence strong enough to change the weighted source order.";
  const leagueCompact = Math.abs(player.leagueAnalysis?.adjustment || 0) < 0.75
    ? "league settings neutral"
    : (player.leagueAnalysis?.adjustment || 0) > 0 ? "league settings boost" : "league settings lower value";
  const sourceCompact = source.parts.length <= 1
    ? `${onlySleeper ? "Sleeper ADP only" : "one source only"}`
    : `${source.parts.length} sources with ${source.agreementLabel.toLowerCase()} agreement`;
  const guideCompact = !guide.hasContext
    ? "no guide context"
    : positiveLabels.length && riskLabels.length
      ? `${joinNatural(positiveLabels, 2)} support; ${joinNatural(riskLabels, 1)} risk`
      : positiveLabels.length
        ? `${joinNatural(positiveLabels, 2)} support`
        : `${joinNatural(riskLabels, 2)}`;
  const compactMovement = movement > 0 ? `Up ${movement}` : movement < 0 ? `Down ${Math.abs(movement)}` : "Unchanged";
  const compactSummary = `${compactMovement}: ${leagueCompact}. ${sourceCompact}; ${guideCompact}. ${confidence.label} confidence.`;
  const summary = `Lab #${player.customRank}, ${movementText}. ${leagueSummary} ${sourceSummary} ${guideSummary} Confidence: ${confidence.label}.`;
  return {
    headline: `Lab #${player.customRank} · ${movementText}`,
    compactSummary,
    summary,
    sourceSummary,
    sourceLines: source.parts.map((part) => `${part.source}: #${Number(part.rank).toFixed(Number(part.rank) % 1 ? 1 : 0)} (weight ${part.weight}/5)`),
    sourceRange: source.parts.length > 1 ? `#${Math.round(source.minRank)}–#${Math.round(source.maxRank)} (${source.rankRange.toFixed(1)}-pick spread)` : "One source",
    agreementLabel: source.agreementLabel,
    leagueReasons: [...league.reasons, ...league.neutralReasons],
    guidePositive: guide.positive.map((signal) => `${signal.label}: ${signal.evidence}`),
    guideRisks: guide.risks.map((signal) => `${signal.label}: ${signal.evidence}`),
    guideEvidence: guide.evidence || [],
    tags: guide.tags || player.tags || [],
    confidenceLabel: confidence.label,
    confidenceScore: confidence.score,
    confidenceReasons: confidence.reasons,
    warnings,
    finalReason,
  };
}

function dynamicLabTiers(players) {
  if (!players.length) return players;
  const gaps = players.slice(0, -1).map((player, index) => Math.max(0, player.labScore - players[index + 1].labScore));
  const typicalGap = median(gaps) || 0;
  const deviations = gaps.map((gap) => Math.abs(gap - typicalGap));
  const threshold = Math.max(1.2, typicalGap + (median(deviations) || 0) * 2.2);
  let tier = 1;
  return players.map((player, index) => {
    const ranked = { ...player, tier };
    const gap = gaps[index] || 0;
    if (gap >= threshold || (index + 1) % 18 === 0) tier += 1;
    return ranked;
  });
}

function rebuildConsensusPlayers(importedRows = []) {
  const byId = new Map();
  const createBase = (player) => ({
    ...player,
    sourceRanks: player.sourceRanks || {}, importedAdps: player.importedAdps || [], importedByes: player.importedByes || [],
    importedKeeperValues: player.importedKeeperValues || [], importedSummaries: player.importedSummaries || [],
    importedTags: player.importedTags || [...(player.tags || [])], importedContext: player.importedContext || {},
    importedProjections: player.importedProjections || [],
  });

  if (state.seedRankingsEnabled) {
    BASE_PLAYERS.forEach((player) => byId.set(player.id, createBase({
      ...player, sourceRanks: { [SEED_SOURCE.name]: player.adp || player.rank }, importedAdps: [player.adp],
    })));
  }

  importedRows.forEach((row) => {
    const existing = createBase(byId.get(row.id) || {
      id: row.id, name: row.name, position: row.position || "WR", team: row.team || "FA",
      rank: row.rank || row.adp || 999, consensusRank: row.rank || row.adp || 999, adp: row.adp || 999,
    });
    existing.name = existing.name || row.name;
    existing.position = row.position || existing.position;
    existing.team = row.team || existing.team;
    if (Number.isFinite(row.rank)) existing.sourceRanks[row.source] = row.rank;
    else if (Number.isFinite(row.adp)) existing.sourceRanks[row.source] = row.adp;
    if (Number.isFinite(row.adp)) existing.importedAdps.push(row.adp);
    if (Number.isFinite(row.bye)) existing.importedByes.push(row.bye);
    if (Number.isFinite(row.projection)) {
      const explicitPeriod = ["weekly", "season"].includes(row.projectionPeriod) ? row.projectionPeriod : "unknown";
      const inferredPeriod = explicitPeriod === "unknown" ? (row.projection >= 45 ? "season" : "weekly") : explicitPeriod;
      const weeklyValue = inferredPeriod === "season" ? row.projection / PROJECTION_SEASON_WEEKS : row.projection;
      existing.importedProjections.push({ source: row.source, value: row.projection, period: explicitPeriod, normalizedPeriod: inferredPeriod, weeklyValue });
    }
    if (Number.isFinite(row.keeperValue)) existing.importedKeeperValues.push(row.keeperValue);
    if (row.summary) existing.importedSummaries.push({ source: row.source, text: row.summary });
    if (Array.isArray(row.tags)) existing.importedTags.push(...row.tags);
    ["depthChartRole", "competition", "injuryNote", "teamContext", "upsideNote", "riskNote"].forEach((key) => {
      if (row[key]) existing.importedContext[key] = row[key];
    });
    if (Number.isFinite(row.depthChartRank)) existing.importedContext.depthChartRank = row.depthChartRank;
    byId.set(row.id, existing);
  });

  const sourceListSizes = new Map();
  byId.forEach((player) => Object.entries(player.sourceRanks || {}).forEach(([source, rank]) => {
    if (Number.isFinite(rank)) sourceListSizes.set(source, Math.max(sourceListSizes.get(source) || 0, Math.ceil(rank)));
  }));

  const prepared = [...byId.values()].map((player) => {
    const sourceParts = Object.keys(player.sourceRanks || {}).map((source) => {
      const rank = Number(player.sourceRanks[source]);
      return { source, rank, percentile: sourceRankPercentile(rank, sourceListSizes.get(source)), weight: rankingSourceWeight(source) };
    }).filter((part) => part.percentile !== null && part.weight > 0);
    const weightedTotal = sourceParts.reduce((sum, part) => sum + part.percentile * part.weight, 0);
    const totalWeight = sourceParts.reduce((sum, part) => sum + part.weight, 0);
    const fallbackRank = median(Object.values(player.sourceRanks || {})) || player.rank || player.adp || 999;
    const fallbackPercentile = sourceRankPercentile(fallbackRank, Math.max(2, byId.size)) || 0;
    const baseScore = (totalWeight ? weightedTotal / totalWeight : fallbackPercentile) * 100;
    const sourceSummary = player.importedSummaries?.[0] || null;
    const projections = (player.importedProjections || []).filter((item) => Number.isFinite(item.weeklyValue));
    const projectionWeightedTotal = projections.reduce((sum, item) => sum + item.weeklyValue * Math.max(1, rankingSourceWeight(item.source)), 0);
    const projectionWeight = projections.reduce((sum, item) => sum + Math.max(1, rankingSourceWeight(item.source)), 0);
    const weightedProjection = projectionWeight ? projectionWeightedTotal / projectionWeight : null;
    const projectionSpread = projections.length > 1 ? Math.max(...projections.map((item) => item.weeklyValue)) - Math.min(...projections.map((item) => item.weeklyValue)) : 0;
    const projectionConfidence = !projections.length ? "Low" : projections.length >= 2 && projectionSpread <= 2 ? "High" : "Medium";
    return {
      ...player, ...player.importedContext,
      tags: [...new Set((player.importedTags || []).map(normalizeArchetypeTag).filter(Boolean))],
      adp: median(player.importedAdps) || player.adp || fallbackRank, bye: median(player.importedByes) || player.bye || null,
      keeperValue: median(player.importedKeeperValues) || player.keeperValue || 0,
      sourceSummary: sourceSummary?.text || "", sourceSummarySource: sourceSummary?.source || "", sourceSummaries: [...(player.importedSummaries || [])],
      sourceCount: sourceParts.length, sourceNames: sourceParts.map((part) => part.source), sourceParts, baseScore,
      importedProjections: projections, projectionSources: [...new Set(projections.map((item) => item.source))],
      weightedProjection, medianProjection: projections.length ? median(projections.map((item) => item.weeklyValue)) : null,
      projectionPeriod: projections.length && new Set(projections.map((item) => item.period)).size === 1 ? projections[0].period : "unknown",
      projectionType: projections.length ? "imported" : "model", projectionConfidence,
    };
  }).sort((a, b) => b.baseScore - a.baseScore || a.adp - b.adp);

  prepared.forEach((player, index) => { player.baseConsensusRank = index + 1; });
  const positionCounters = {};
  prepared.forEach((player) => { positionCounters[player.position] = (positionCounters[player.position] || 0) + 1; player.basePositionRank = positionCounters[player.position]; });
  const preset = OVERLAY_PRESETS[state.overlayStrength] || OVERLAY_PRESETS.balanced;
  const scored = prepared.map((player) => {
    const leagueAnalysis = leagueFitAnalysisForPlayer(player, player.basePositionRank);
    const guideAnalysis = draftGuideSignalForPlayer(player);
    const confidenceAnalysis = rankingConfidenceAnalysis(player);
    const labScore = (player.baseScore * preset.base) + (leagueAnalysis.score * preset.league) + (guideAnalysis.score * preset.guide);
    return { ...player, leagueFitScore: leagueAnalysis.score, leagueAnalysis, guideSignalScore: guideAnalysis.score, guideAnalysis,
      confidenceAnalysis, labScore, overlayPreset: preset.label,
      labReasons: [...guideAnalysis.positive.map((item) => item.label), ...guideAnalysis.risks.map((item) => item.label)] };
  }).sort((a, b) => b.labScore - a.labScore || a.baseConsensusRank - b.baseConsensusRank);
  const ranked = scored.map((player, index) => ({ ...player, rank: index + 1, consensusRank: index + 1, customRank: index + 1,
    modelEdge: player.baseConsensusRank - (index + 1), leagueAdjustment: player.leagueFitScore - 50, guideAdjustment: player.guideSignalScore - 50 }));
  const tiered = dynamicLabTiers(ranked);
  const enriched = enrichPlayerContext(tiered);
  PLAYERS = enriched.map((player) => {
    const labAnalysis = buildRankAnalysis(player);
    return { ...player, labAnalysis, labExplanation: labAnalysis.summary, aiAnalysis: labAnalysis.summary };
  });
  clearProjectionCaches();
}

function saveRankingState() {
  try {
    localStorage.setItem("fantasyDraftLabRankingRows", JSON.stringify(state.importedRankingRows));
    localStorage.setItem("fantasyDraftLabRankingSources", JSON.stringify(state.rankingSources.filter((source) => source.name !== SEED_SOURCE.name)));
    localStorage.setItem("fantasyDraftLabSeedRankingsEnabled", JSON.stringify(state.seedRankingsEnabled));
    localStorage.setItem("fantasyDraftLabRankingSourceWeights", JSON.stringify(state.rankingSourceWeights || {}));
    localStorage.setItem("fantasyDraftLabOverlayStrength", state.overlayStrength || "balanced");
  } catch {
    const status = $("importStatus");
    if (status) status.textContent = "Rankings imported, but this browser blocked local saving.";
  }
}

function loadRankingState() {
  try {
    const rows = JSON.parse(localStorage.getItem("fantasyDraftLabRankingRows") || "[]");
    const sources = JSON.parse(localStorage.getItem("fantasyDraftLabRankingSources") || "[]");
    const weights = JSON.parse(localStorage.getItem("fantasyDraftLabRankingSourceWeights") || "{}");
    const seedSaved = localStorage.getItem("fantasyDraftLabSeedRankingsEnabled");
    state.seedRankingsEnabled = seedSaved === null ? true : JSON.parse(seedSaved);
    state.importedRankingRows = Array.isArray(rows) ? rows : [];
    state.rankingSources = [
      ...(state.seedRankingsEnabled ? [{ ...SEED_SOURCE }] : []),
      ...(Array.isArray(sources) ? sources : []),
    ];
    state.rankingSourceWeights = weights && typeof weights === "object" ? weights : {};
    state.rankingSources.forEach((source) => {
      if (!Number.isFinite(Number(state.rankingSourceWeights[source.name]))) state.rankingSourceWeights[source.name] = 3;
    });
    state.overlayStrength = OVERLAY_PRESETS[localStorage.getItem("fantasyDraftLabOverlayStrength")]
      ? localStorage.getItem("fantasyDraftLabOverlayStrength")
      : "balanced";
    rebuildConsensusPlayers(state.importedRankingRows);
  } catch {
    state.importedRankingRows = [];
    state.seedRankingsEnabled = true;
    state.rankingSources = [{ ...SEED_SOURCE }];
    state.rankingSourceWeights = { [SEED_SOURCE.name]: 3 };
    state.overlayStrength = "balanced";
    rebuildConsensusPlayers([]);
  }
}

function saveFlaggedPlayers() {
  try {
    localStorage.setItem("fantasyDraftLabFlaggedPlayerIds", JSON.stringify([...state.flaggedPlayerIds]));
  } catch {
    // Flagged players still work for the current session.
  }
}

function loadFlaggedPlayers() {
  try {
    const saved = JSON.parse(localStorage.getItem("fantasyDraftLabFlaggedPlayerIds") || "[]");
    state.flaggedPlayerIds = new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    state.flaggedPlayerIds = new Set();
  }
}

function savePersonaState() {
  saveActiveLeagueProfile();
}

function loadPersonaState() {
  try {
    const profile = activeLeagueProfile();
    const saved = profile.teamPersonas || [];
    if (Array.isArray(saved) && saved.length === LEAGUE.teams) state.teamPersonas = saved;
    state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => profile.personaSources?.[index] || "default");
  } catch {
    state.teamPersonas = defaultTeamPersonas();
    state.personaSources = Array.from({ length: LEAGUE.teams }, () => "default");
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
  const draftTypeLabel = isLiveDraftMode() ? "Live Draft" : "Mock Draft";
  const draft = {
    id: `draft-${Date.now()}`,
    name: `${draftTypeLabel} ${draftNumber}`,
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

function projectionProfileForPlayer(player) {
  const settings = scoringSettingsForLeague();
  const cacheKey = [player.id, player.consensusRank ?? player.rank ?? "", player.weightedProjection ?? "", settings.reception, settings.teReceptionBonus, settings.passTd, settings.rushRecTd].join("|");
  if (PROJECTION_CACHE.has(cacheKey)) return PROJECTION_CACHE.get(cacheKey);
  if (Number.isFinite(player.weightedProjection)) {
    const profile = {
      value: Math.max(0, Number(player.weightedProjection)), weeklyValue: Math.max(0, Number(player.weightedProjection)),
      projectionType: "imported", label: "Imported projection", period: "weekly", importedPeriod: player.projectionPeriod || "unknown",
      source: (player.projectionSources || []).join(" + ") || "Uploaded source", confidence: player.projectionConfidence || "Medium",
      sourceCount: (player.projectionSources || []).length, seasonWeeks: PROJECTION_SEASON_WEEKS,
    };
    PROJECTION_CACHE.set(cacheKey, profile);
    return profile;
  }
  const rank = Number.isFinite(player.consensusRank) ? player.consensusRank : player.rank || 220;
  const positionRank = playerPositionRank(player);
  const positionalIndex = positionRank > 0 ? positionRank : Math.max(1, Math.round(rank / 3));
  const base = { QB: 23, RB: 18, WR: 17, TE: 14, K: 8, DEF: 8 }[player.position] || 10;
  const decay = { QB: 0.34, RB: 0.28, WR: 0.24, TE: 0.22, K: 0.04, DEF: 0.04 }[player.position] || 0.15;
  const weeklyValue = Math.max(4, base - positionalIndex * decay + scoringProjectionBonus(player));
  const profile = { value: weeklyValue, weeklyValue, projectionType: "model", label: "Model estimate", period: "weekly", importedPeriod: "unknown", source: "Positional-rank heuristic", confidence: "Low", sourceCount: 0, seasonWeeks: PROJECTION_SEASON_WEEKS };
  PROJECTION_CACHE.set(cacheKey, profile);
  return profile;
}

function projectionForPlayer(player) {
  return projectionProfileForPlayer(player).weeklyValue;
}

function playerPositionRank(player) {
  if (!PLAYER_POSITION_RANKS) {
    PLAYER_POSITION_RANKS = new Map();
    ["QB", "RB", "WR", "TE", "K", "DEF"].forEach((position) => {
      PLAYERS
        .filter((candidate) => candidate.position === position)
        .sort((a, b) => a.consensusRank - b.consensusRank)
        .forEach((candidate, index) => {
          PLAYER_POSITION_RANKS.set(candidate.id, index + 1);
        });
    });
  }
  return PLAYER_POSITION_RANKS.get(player.id) || 0;
}

function scoringSettingsForLeague(league = activeLeague()) {
  const preset = SCORING_PRESETS[league.scoring] || SCORING_PRESETS[DEFAULT_LEAGUE.scoring];
  return normalizeLeagueSettings({ ...league, scoringSettings: { ...preset, ...(league.scoringSettings || {}) } }).scoringSettings;
}

function estimatedPlayerUsage(player) {
  const positionRank = playerPositionRank(player);
  const index = Math.max(1, positionRank || Math.round((player.consensusRank || player.rank || 180) / 3));
  if (player.position === "QB") {
    return { receptions: 0, passTds: Math.max(0.8, 1.72 - index * 0.035), rushRecTds: Math.max(0.08, 0.28 - index * 0.008) };
  }
  if (player.position === "RB") {
    return { receptions: Math.max(1.2, 4.4 - index * 0.055), passTds: 0, rushRecTds: Math.max(0.18, 0.72 - index * 0.014) };
  }
  if (player.position === "WR") {
    return { receptions: Math.max(2, 6.9 - index * 0.07), passTds: 0, rushRecTds: Math.max(0.16, 0.58 - index * 0.01) };
  }
  if (player.position === "TE") {
    return { receptions: Math.max(1.6, 5.8 - index * 0.12), passTds: 0, rushRecTds: Math.max(0.1, 0.42 - index * 0.012) };
  }
  return { receptions: 0, passTds: 0, rushRecTds: 0 };
}

function scoringProjectionBonus(player) {
  const settings = scoringSettingsForLeague();
  const usage = estimatedPlayerUsage(player);
  const receptionDelta = settings.reception - DEFAULT_LEAGUE.scoringSettings.reception;
  const teBonusDelta = player.position === "TE" ? settings.teReceptionBonus - DEFAULT_LEAGUE.scoringSettings.teReceptionBonus : 0;
  const passTdDelta = player.position === "QB" ? settings.passTd - DEFAULT_LEAGUE.scoringSettings.passTd : 0;
  const rushRecTdDelta = ["QB", "RB", "WR", "TE"].includes(player.position)
    ? settings.rushRecTd - DEFAULT_LEAGUE.scoringSettings.rushRecTd
    : 0;
  return (usage.receptions * (receptionDelta + teBonusDelta))
    + (usage.passTds * passTdDelta)
    + (usage.rushRecTds * rushRecTdDelta);
}

function scoringRankBonus(player) {
  const adjustment = scoringProjectionBonus(player);
  const positionMultiplier = player.position === "QB" ? 3.1 : player.position === "TE" ? 3.8 : 3.4;
  return Math.max(-18, Math.min(18, adjustment * positionMultiplier));
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

function pickAwardScore(pick) {
  const value = pick.pickValue ?? Math.max(-50, Math.min(50, pick.pick - playerRankAtDraft(pick.player)));
  const opportunity = pick.opportunityCost || 0;
  return value - Math.max(0, opportunity) * 0.35;
}

function isLateRequiredSpecialTeamsPick(pick) {
  return ["K", "DEF"].includes(pick.player?.position) && Number(pick.round) >= Math.max(14, LEAGUE.rounds - 2);
}

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

function draftAwardSeed(picks) {
  return picks.reduce((seed, pick) => {
    const playerSeed = String(pick.player?.id || pick.player?.name || "")
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return seed + pick.pick * 17 + pick.team * 31 + playerSeed;
  }, 97);
}

function simulatedSeasonAwards(analyses, picks, seasonCount = 500, seedOverride = null) {
  const random = seededAwardRandom(Number.isFinite(seedOverride) ? seedOverride : draftAwardSeed(picks));
  const league = activeLeague();
  const playoffTeams = Math.max(2, Math.min(league.teams, Number(league.playoffTeams) || Math.min(6, Math.max(2, Math.ceil(league.teams / 2)))));
  const roomWeeklyMean = analyses.reduce((sum, analysis) => sum + (Number.isFinite(analysis.weeklyProjection) ? analysis.weeklyProjection : 100), 0) / Math.max(1, analyses.length);
  const teams = analyses.map((analysis) => {
    const rawProjection = Number.isFinite(analysis.weeklyProjection) ? analysis.weeklyProjection : roomWeeklyMean;
    const valueImpact = Math.max(-12, Math.min(12, analysis.value || 0));
    const balanceImpact = Math.max(-12, Math.min(12, analysis.balance || 0));
    return {
      team: analysis.team,
      weeklyMean: roomWeeklyMean + (rawProjection - roomWeeklyMean) * 0.38 + valueImpact * 0.05 + balanceImpact * 0.02,
      playoffMean: roomWeeklyMean + (rawProjection - roomWeeklyMean) * 0.50 + valueImpact * 0.04 + balanceImpact * 0.02,
      weekStdDev: 22 + Math.max(0, 6 - (analysis.balance || 0)) * 0.40,
      playoffAppearances: 0, championships: 0, championshipAppearances: 0, topThreeFinishes: 0, lastPlaces: 0, finishSum: 0,
    };
  });
  const teamScore = (team, playoff = false) => (playoff ? team.playoffMean : team.weeklyMean) + seededNormal(random) * team.weekStdDev * (playoff ? 1.25 : 1) + (random() - 0.5) * 4;
  for (let season = 0; season < seasonCount; season += 1) {
    const rows = teams.map((team) => ({ ...team, wins: 0, points: 0 }));
    for (let week = 0; week < 14; week += 1) {
      const shuffled = rows.map((team) => ({ team, sort: random() })).sort((a, b) => a.sort - b.sort).map((item) => item.team);
      for (let index = 0; index < shuffled.length; index += 2) {
        const a = shuffled[index], b = shuffled[index + 1] || shuffled[0];
        if (a === b) continue;
        const aScore = teamScore(a), bScore = teamScore(b); a.points += aScore; b.points += bScore;
        if (aScore >= bScore) a.wins += 1; else b.wins += 1;
      }
    }
    const standings = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points);
    standings.forEach((row, index) => { const target = teams.find((team) => team.team === row.team); if (target) target.finishSum += index + 1; });
    standings.slice(0, 3).forEach((row) => { const target = teams.find((team) => team.team === row.team); if (target) target.topThreeFinishes += 1; });
    let bracket = standings.slice(0, playoffTeams);
    bracket.forEach((row) => { const target = teams.find((team) => team.team === row.team); if (target) target.playoffAppearances += 1; });
    while (bracket.length > 1) {
      const winners = [];
      if (bracket.length === 2) bracket.forEach((row) => { const target = teams.find((team) => team.team === row.team); if (target) target.championshipAppearances += 1; });
      for (let index = 0; index < Math.ceil(bracket.length / 2); index += 1) {
        const favorite = bracket[index], underdog = bracket[bracket.length - 1 - index];
        if (!underdog || favorite.team === underdog.team) { winners.push(favorite); continue; }
        winners.push(teamScore(favorite, true) >= teamScore(underdog, true) ? favorite : underdog);
      }
      bracket = winners;
    }
    const champion = bracket[0] || standings[0], last = standings[standings.length - 1];
    teams.find((team) => team.team === champion.team).championships += 1;
    teams.find((team) => team.team === last.team).lastPlaces += 1;
  }
  return teams.map((team) => ({
    team: team.team, playoffRate: team.playoffAppearances / seasonCount, topThreeRate: team.topThreeFinishes / seasonCount,
    championshipRate: team.championships / seasonCount, championshipAppearanceRate: team.championshipAppearances / seasonCount,
    lastPlaceRate: team.lastPlaces / seasonCount, championshipOdds: team.championships / seasonCount, lastPlaceOdds: team.lastPlaces / seasonCount,
    playoffAppearances: team.playoffAppearances, averageFinish: team.finishSum / seasonCount, simulationCount: seasonCount,
  }));
}

function draftAwardData() {
  const league = activeLeague();
  const picks = activePicks();
  const total = league.teams * league.rounds;
  if (picks.length < total) return null;
  const analyses = allTeamAnalyses();
  const seasonOdds = simulatedSeasonAwards(analyses, picks);
  const oddsByTeam = new Map(seasonOdds.map((row) => [row.team, row]));
  const teamAwards = analyses.map((analysis) => {
    const pickValue = analysis.value || 0;
    const awardScore = analysis.score + pickValue * 1.15;
    const odds = oddsByTeam.get(analysis.team) || {};
    return {
      ...analysis,
      awardScore,
      championshipOdds: odds.championshipOdds || 0,
      lastPlaceOdds: odds.lastPlaceOdds || 0,
    };
  });
  const allPickAwards = analyses
    .flatMap((analysis) => analysis.pickBreakdown.map((pick) => ({
      ...pick,
      teamName: activeTeamName(analysis.team),
      awardScore: pickAwardScore(pick),
    })))
    .filter((pick) => !pick.keeper);

  return {
    bestDraft: [...teamAwards].sort((a, b) => b.awardScore - a.awardScore),
    bestPick: [...allPickAwards].sort((a, b) => b.awardScore - a.awardScore),
    worstPick: [...allPickAwards].filter((pick) => !isLateRequiredSpecialTeamsPick(pick)).sort((a, b) => a.awardScore - b.awardScore),
    championship: [...teamAwards].sort((a, b) => b.championshipOdds - a.championshipOdds || b.score - a.score),
    lastPlace: [...teamAwards].sort((a, b) => b.lastPlaceOdds - a.lastPlaceOdds || a.score - b.score),
  };
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

function outcomeEvaluationModel(team, picks) {
  const roster = picks.filter((pick) => pick.team === team).map((pick) => pick.player);
  const lineup = bestLineupForRoster(roster);
  const lineupIds = new Set(lineup.map((player) => player.id));
  const bench = roster
    .filter((player) => !lineupIds.has(player.id))
    .map((player) => ({ ...player, weeklyProjection: projectionForPlayer(player) }))
    .sort((a, b) => b.weeklyProjection - a.weeklyProjection);
  const weeklyProjection = lineup.reduce((sum, player) => sum + Number(player.weeklyProjection || 0), 0);
  const benchDepth = bench.slice(0, Math.max(3, Number(LEAGUE.roster.BENCH || 0))).reduce((sum, player, index) => sum + player.weeklyProjection * Math.max(0.15, 0.55 - index * 0.06), 0);
  const value = draftPickValueForTeam(team, picks);
  const balance = rosterBalanceScore(roster);
  const missingStarters = requiredRosterOpenCount(roster, LEAGUE);
  const riskConcentration = lineup.reduce((sum, player) => sum + (/injur|uncertain|committee|suspend|holdout|risk/i.test(`${player.riskNote || ""} ${player.injuryNote || ""} ${player.roleNote || ""}`) ? 1 : 0), 0);
  const positionBest = {};
  lineup.forEach((player) => { positionBest[player.position] = Math.max(positionBest[player.position] || 0, Number(player.weeklyProjection || 0)); });
  const replacementValue = Object.entries(positionBest).reduce((sum, [position, valueAtPosition]) => {
    const baseline = { QB: 17, RB: 9.5, WR: 9.2, TE: 7.5, K: 6, DEF: 6 }[position] || 8;
    return sum + Math.max(0, valueAtPosition - baseline);
  }, 0);
  const score = weeklyProjection
    + replacementValue * 0.28
    + benchDepth * 0.10
    + balance * 0.16
    + value * 0.08
    - missingStarters * 8
    - riskConcentration * 1.35;
  return { team, roster, lineup, weeklyProjection, benchDepth, value, balance, missingStarters, riskConcentration, replacementValue, score };
}

function analyzeTeamForBulkRank(team, picks) {
  return outcomeEvaluationModel(team, picks);
}

function rankTeamAnalysisRows(analyses, league = activeLeague()) {
  const sorted = [...analyses].sort((a, b) => b.score - a.score);
  const scores = sorted.map((team) => team.score), min = Math.min(...scores), max = Math.max(...scores), spread = max - min || 1;
  return sorted.map((analysis, index) => ({ ...analysis, rank: index + 1, grade: gradeFromRank(index + 1),
    relativeStrength: Math.round(18 + ((analysis.score - min) / spread) * 64), playoffOdds: null }));
}

function allTeamAnalysesForBulk(picks) {
  const ranked = rankTeamAnalysisRows(
    Array.from({ length: LEAGUE.teams }, (_, index) => analyzeTeamForBulkRank(index + 1, picks)),
    LEAGUE
  );
  if (picks.length < LEAGUE.teams * LEAGUE.rounds) return ranked;
  const outcomes = simulatedSeasonAwards(ranked, picks, 80, stableStringHash(`bulk|${draftAwardSeed(picks)}`));
  const byTeam = new Map(outcomes.map((row) => [row.team, row]));
  return ranked.map((row) => {
    const outcome = byTeam.get(row.team) || {};
    return { ...row, ...outcome, playoffOdds: Math.round((outcome.playoffRate || 0) * 100) };
  });
}

function allTeamAnalyses() {
  const picks = activePicks();
  const league = activeLeague();
  const ranked = rankTeamAnalysisRows(Array.from({ length: league.teams }, (_, index) => analyzeTeam(index + 1, picks)), league);
  if (picks.length < league.teams * league.rounds) return ranked;
  const key = `${league.id}|${picks.map((pick) => `${pick.pick}:${pick.player.id}`).join(",")}`;
  let outcomes = SEASON_OUTCOME_CACHE.get(key);
  if (!outcomes) {
    outcomes = simulatedSeasonAwards(ranked, picks, 500);
    SEASON_OUTCOME_CACHE.set(key, outcomes);
  }
  const byTeam = new Map(outcomes.map((row) => [row.team, row]));
  return ranked.map((row) => {
    const outcome = byTeam.get(row.team) || {};
    return { ...row, ...outcome, playoffOdds: Math.round((outcome.playoffRate || 0) * 100) };
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

function isPremiumOnesieStrategy(strategy) {
  return strategy === "eliteQBTE" || strategy === "weeklyEdge";
}

function positionalStarterDemand(position) {
  const flex = LEAGUE.roster.FLEX || 0;
  if (position === "QB") return LEAGUE.teams * (LEAGUE.roster.QB || 1);
  if (position === "TE") return LEAGUE.teams * ((LEAGUE.roster.TE || 1) + flex * 0.12);
  if (position === "RB") return LEAGUE.teams * ((LEAGUE.roster.RB || 0) + flex * 0.45);
  if (position === "WR") return LEAGUE.teams * ((LEAGUE.roster.WR || 0) + flex * 0.43);
  return LEAGUE.teams;
}

function positionalEdgeMapForCurrentPick() {
  const cacheKey = `${state.currentPick}|${state.draftedIds.size}`;
  if (POSITIONAL_EDGE_CACHE?.key === cacheKey) return POSITIONAL_EDGE_CACHE.edges;
  const edges = new Map();
  ["QB", "RB", "WR", "TE"].forEach((position) => {
    const pool = availablePlayers()
      .filter((candidate) => candidate.position === position)
      .map((candidate) => ({ player: candidate, projection: projectionForPlayer(candidate) }))
      .sort((a, b) => b.projection - a.projection);
    if (!pool.length) return;
    const baselineIndex = Math.max(0, Math.min(pool.length - 1, Math.round(positionalStarterDemand(position)) - 1));
    const baseline = pool[baselineIndex].projection;
    pool.forEach(({ player, projection }) => {
      edges.set(player.id, projection - baseline);
    });
  });
  POSITIONAL_EDGE_CACHE = { key: cacheKey, edges };
  return edges;
}

function positionalEdgeValue(player) {
  if (!["QB", "RB", "WR", "TE"].includes(player.position)) return 0;
  return positionalEdgeMapForCurrentPick().get(player.id) || 0;
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
  if (strategy === "weeklyEdge") {
    const edge = positionalEdgeValue(player);
    const hasStarter = (counts[player.position] || 0) >= (LEAGUE.roster[player.position] || 0);
    if (player.position === "QB" || player.position === "TE") {
      if (hasStarter) score += 34;
      else if (round <= 6 && edge >= 1.2) score -= Math.min(34, 14 + edge * 6.5);
      else if (round <= 9 && edge >= 0.8) score -= Math.min(22, 7 + edge * 4.2);
      else if (round <= 5) score += 5;
    }
    if (player.position === "RB" || player.position === "WR") {
      const starterWindow = (counts[player.position] || 0) < (LEAGUE.roster[player.position] || 0) + 1;
      if (starterWindow && edge >= 1.8) score -= Math.min(9, 2 + edge * 1.4);
      if (!starterWindow && round <= 6) score += 3;
    }
    if (player.position === "K" || player.position === "DEF") score += 42;
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
    + scoutingTendencyScore(player, team, pickNumber)
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
    if (!isPremiumOnesieStrategy(strategy) && round <= 5) penalty += count ? 90 : 14;
  }

  if (player.position === "TE") {
    if (count >= starters + 1) return 220;
    if (count >= starters) penalty += round <= 11 ? 105 : 54;
    if (!isPremiumOnesieStrategy(strategy) && round <= 5) penalty += count ? 75 : 8;
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

function personaRecommendationEvidence(player, team, pickNumber, roster = rosterFor(team)) {
  const persona = getPersonaForTeam(team);
  const source = personaAssignmentSource(team);
  const round = draftOrderFor(pickNumber).round;
  const counts = positionCounts(roster);
  const adpGap = Number.isFinite(player.adp) ? pickNumber - player.adp : null;
  const positiveGuide = (player.guideAnalysis?.positive || []).map((item) => item.id);
  const riskGuide = (player.guideAnalysis?.risks || []).map((item) => item.id);
  const tags = new Set(player.tags || []);
  let fit = "neutral";
  let reason = `${persona.name} keeps this decision centered on board value and roster construction.`;

  if (persona.strategyStyle === "Zero RB") {
    if (["WR", "TE", "QB"].includes(player.position) && round <= 8) {
      fit = "positive";
      reason = `${persona.name} supports building pass-catcher or onesie strength before forcing running back volume.`;
    } else if (player.position === "RB") {
      const receivingFit = tags.has("receiving_back") || tags.has("pass_catching") || positiveGuide.includes("receiving_role");
      fit = receivingFit || (adpGap !== null && adpGap >= 8) ? "conditional" : "negative";
      reason = receivingFit
        ? `${persona.name} can make an exception for a receiving-oriented running back with a pass-catching path.`
        : `${persona.name} normally delays running back, so this pick needs a clear ADP discount or roster emergency.`;
    }
  } else if (persona.strategyStyle === "Hero RB") {
    const hasAnchor = (counts.RB || 0) >= 1;
    if (player.position === "RB" && !hasAnchor) {
      fit = "positive";
      reason = `${persona.name} wants one anchor running back before shifting toward pass catchers.`;
    } else if (hasAnchor && player.position === "WR") {
      fit = "positive";
      reason = `${persona.name} already has the anchor-RB condition satisfied and now favors wide-receiver value.`;
    }
  } else if (persona.strategyStyle === "Robust RB" && player.position === "RB") {
    fit = "positive";
    reason = `${persona.name} prioritizes early running-back volume and scarcity.`;
  } else if (persona.strategyStyle === "WR Heavy" && player.position === "WR") {
    fit = "positive";
    reason = `${persona.name} explicitly favors wide-receiver depth for a three-WR plus flex build.`;
  } else if (persona.strategyStyle === "Elite QB" && player.position === "QB") {
    fit = "positive";
    reason = `${persona.name} is willing to pay for an elite quarterback edge before the room settles.`;
  } else if (persona.strategyStyle === "Elite TE" && player.position === "TE") {
    fit = "positive";
    reason = `${persona.name} supports paying for tight-end leverage before the premium tier disappears.`;
  } else if (persona.strategyStyle === "Upside") {
    const upsideFit = positiveGuide.some((id) => ["explosive", "youth", "rushing_upside"].includes(id)) || tags.has("rookie") || tags.has("explosive");
    fit = upsideFit ? "positive" : "neutral";
    reason = upsideFit
      ? `${persona.name} favors the uploaded breakout, youth, or ceiling signals attached to this player.`
      : `${persona.name} prefers ceiling, but this player does not yet have an uploaded upside tag or note.`;
  } else if (persona.strategyStyle === "Balanced" || persona.name === "Safe Floor Drafter") {
    if (!riskGuide.length && (positiveGuide.includes("clear_role") || Number(player.depthChartRank) === 1)) {
      fit = "positive";
      reason = `${persona.name} favors the player's stable role and limited uploaded risk flags.`;
    } else if (riskGuide.length) {
      fit = "negative";
      reason = `${persona.name} is cautious because the uploaded profile includes ${joinNatural((player.guideAnalysis?.risks || []).map((item) => item.label))}.`;
    }
  } else if (persona.name === "ADP Grinder" && adpGap !== null) {
    fit = adpGap >= 5 ? "positive" : adpGap <= -10 ? "negative" : "neutral";
    reason = adpGap >= 5
      ? `${persona.name} likes that the player has fallen ${adpGap.toFixed(1)} picks past ADP.`
      : adpGap <= -10
        ? `${persona.name} resists paying ${Math.abs(adpGap).toFixed(1)} picks ahead of ADP.`
        : `${persona.name} sees a market-consistent price with no major ADP edge.`;
  }

  return { persona, source, fit, reason, text: `${reason} Persona source: ${source}.` };
}

function scoutingSnipeEvidence(player, team, pickNumber) {
  const nextPick = nextPickForTeam(team, pickNumber);
  if (!nextPick || nextPick <= pickNumber + 1) {
    return { level: "Low", score: 0, text: "You pick again immediately, so there is little room-based snipe risk." };
  }
  const seenTeams = new Set();
  const threats = [];
  let historicalProfiles = 0;
  for (let pick = pickNumber + 1; pick < nextPick; pick += 1) {
    const order = draftOrderFor(pick);
    if (order.team === team || seenTeams.has(order.team)) continue;
    seenTeams.add(order.team);
    const profile = scoutingProfileForTeam(order.team);
    const persona = getPersonaForTeam(order.team);
    const reasons = [];
    let score = 0;
    if (profile?.picksAnalyzed) {
      historicalProfiles += 1;
      const band = order.round <= 3 ? "early" : order.round <= 8 ? "middle" : "late";
      const counts = profile.roundPositionBias?.[band] || {};
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      const rate = total ? (counts[player.position] || 0) / total : 0;
      const likelyPosition = scoutingTopPositionForPick(profile, order.round);
      if (likelyPosition === player.position) {
        score += 2.4;
        reasons.push(`historically leans ${player.position} in this round range${total ? ` (${Math.round(rate * 100)}%)` : ""}`);
      } else if (rate >= 0.35) {
        score += 1.6;
        reasons.push(`${Math.round(rate * 100)}% ${player.position} rate in this round band`);
      }
      if (profile.reachProfile === "Aggressive/reach-friendly") {
        score += 0.8;
        reasons.push("has an aggressive reach profile");
      }
    }
    if (persona.positionalAggression === player.position) {
      score += 1.5;
      reasons.push(`${persona.name} is ${player.position}-aggressive`);
    }
    if ((persona.strategyStyle === "Zero RB" && player.position === "WR")
      || (persona.strategyStyle === "Robust RB" && player.position === "RB")
      || (persona.strategyStyle === "Elite QB" && player.position === "QB")
      || (persona.strategyStyle === "Elite TE" && player.position === "TE")) {
      score += 1.2;
      reasons.push(`${persona.name} targets this position`);
    }
    if (score > 0) threats.push({ team: order.team, score, reasons });
  }
  threats.sort((a, b) => b.score - a.score);
  const totalScore = threats.reduce((sum, threat) => sum + threat.score, 0);
  const level = totalScore >= 8 ? "High" : totalScore >= 4 ? "Moderate" : "Low";
  const teamCount = seenTeams.size;
  const threatText = threats.slice(0, 3).map((threat) => `${activeTeamName(threat.team)} ${threat.reasons[0]}`).join("; ");
  const dataNote = historicalProfiles
    ? `${historicalProfiles} of ${teamCount} intervening team${teamCount === 1 ? "" : "s"} ${historicalProfiles === 1 ? "has" : "have"} historical Scouting Report data.`
    : "No historical Scouting Report data is loaded for the intervening teams, so this read uses assigned personas only.";
  const text = threats.length
    ? `${level} snipe risk before ${pickLabel(nextPick)}: ${threatText}. ${dataNote}`
    : `${level} snipe risk before ${pickLabel(nextPick)}: none of the ${teamCount} intervening teams show a strong ${player.position} tendency. ${dataNote}`;
  return { level, score: totalScore, text, threats, teamCount, historicalProfiles };
}

function personaRecommendationAdjustment(player, team, pickNumber, roster) {
  const persona = getPersonaForTeam(team);
  const raw = personaAdpGuard(player, pickNumber, persona)
    + personaStrategyScore(player, roster, pickNumber, persona)
    + personaUpsideScore(player, persona)
    + personaPositionScore(player, persona)
    + personaOnesieScore(player, roster, pickNumber, persona);
  return -raw * 0.35;
}

function recommendationScore(player, team, pickNumber, strategy = state.strategy) {
  const roster = rosterFor(team);
  const adpValue = Number.isFinite(player.adp) ? pickNumber - player.adp : 0;
  const valueScore = 1000 - player.consensusRank + Math.min(24, Math.max(-24, adpValue * 0.9));
  const keeperBump = Math.min(4, Math.max(0, player.keeperValue || 0));
  const roomUrgency = liveScoutingUrgencyScore(player, team, pickNumber);
  const strategyTieBreaker = clampNumber(-strategyScore(player, roster, pickNumber, strategy), -3, 3);
  return valueScore + scoringRankBonus(player) - starterNeedScore(player, roster)
    - rosterPressureScore(player, team, pickNumber) - recommendationRosterPenalty(player, roster, pickNumber, "balanced")
    - rosterCompletionAdjustment(player, team, pickNumber, roster) + keeperBump + strategyTieBreaker + roomUrgency;
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
  const keeperBump = Math.min(4, Math.max(0, player.keeperValue || 0));
  const strategyTieBreaker = clampNumber(-strategyScore(player, roster, pickNumber, state.strategy), -3, 3);
  return valueScore + scoringRankBonus(player) - starterNeedScore(player, roster)
    - recommendationRosterPenalty(player, roster, pickNumber, "balanced") + keeperBump + strategyTieBreaker;
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
  const results = currentOutcomeResults();
  if (results.length) {
    const leader = results[0], second = results[1];
    const rows = results.slice(0, 3).map((item, index) => `${index + 1}. ${item.player.name} — ${item.player.position}, ${percentRate(item.estimatedPlayoffRate)} estimated playoff rate, ${starterImpactLabel(item)}, ${survivalDisplay(item.survival)}`).join("\n");
    return `Decision Center at ${pickLabel(state.currentPick)}:\n${rows}\n\nRecommendation: ${leader.player.name}${second ? `, ${ppDifference(leader.estimatedPlayoffRate, second.estimatedPlayoffRate).toFixed(1)} percentage points ahead of ${second.player.name}` : ""}. Confidence: ${leader.confidence}${leader.confidenceReason ? ` (${leader.confidenceReason})` : ""}.\nRoster context: ${rosterNeedLabel(rosterFor(state.userTeam))}.`;
  }
  const recs = recommendations(state.userTeam, state.currentPick, 5);
  if (!recs.length) return "The draft is complete, so there is no live pick recommendation right now.";
  return `Board-based recommendation — outcome simulation unavailable. Best current screen: ${recs[0].name} (${recs[0].position}), Lab #${Math.round(recs[0].consensusRank)}. Roster context: ${rosterNeedLabel(rosterFor(state.userTeam))}.`;
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

function topRecommendationOptions(team, pickNumber, limit = 12) {
  return availablePlayers()
    .map((player) => ({ player, score: recommendationScore(player, team, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function likelyPlayerTiming(player, team, pickNumber) {
  const nextPick = nextPickForTeam(team, pickNumber);
  if (!nextPick) return "there is no later pick to bank on";
  const gap = nextPick - pickNumber;
  const likelyAvailable = likelyAvailableAtPick(player, nextPick);
  if (!likelyAvailable) return `he is unlikely to make it back through ${gap} picks to ${pickLabel(nextPick)}`;
  if (gap >= 18) return `the long ${gap}-pick wait makes this tier risky to pass`;
  return `he could make it back, but the current slot is where the value is cleanest`;
}

function positionNeedText(player, roster) {
  const counts = positionCounts(roster);
  if (fillsRequiredRosterSlot(player, roster)) {
    if (player.position === "QB" || player.position === "TE") return `fills your open ${player.position} starter spot`;
    if (player.position === "RB" || player.position === "WR") return `fills an open ${player.position}/flex path`;
    return `fills a required ${player.position} slot`;
  }
  if (player.position === "RB" || player.position === "WR") {
    return `adds usable ${player.position} depth after ${counts[player.position] || 0} already rostered`;
  }
  if ((player.position === "QB" || player.position === "TE") && (counts[player.position] || 0)) {
    return `is a luxury ${player.position} because that starter slot is already covered`;
  }
  return `does not solve a primary roster hole, so the case has to come from value`;
}

function bestPositionAlternatives(team, pickNumber, roster) {
  return ["QB", "RB", "WR", "TE", "K", "DEF"]
    .map((position) => {
      const player = bestAvailableForPosition(position, roster, pickNumber);
      return player ? { position, player, score: recommendationScore(player, team, pickNumber) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function playerDecisionAnalysis(player, team = state.userTeam, pickNumber = state.currentPick) {
  const roster = rosterFor(team);
  const options = topRecommendationOptions(team, pickNumber, 14);
  const selected = options.find((item) => item.player.id === player.id) || { player, score: recommendationScore(player, team, pickNumber) };
  const alternatives = options.filter((item) => item.player.id !== player.id);
  const bestAlternative = alternatives[0]?.player || null;
  const samePositionAlternative = alternatives.find((item) => item.player.position === player.position)?.player || null;
  const otherPositionAlternative = alternatives.find((item) => item.player.position !== player.position)?.player || null;
  const positionOptions = bestPositionAlternatives(team, pickNumber, roster);
  const bestOtherPosition = positionOptions.find((item) => item.position !== player.position);
  const adpGap = Number.isFinite(player.adp) ? pickNumber - player.adp : 0;
  const dropoff = Math.abs(positionalDropoffScore(player));
  const projectionText = `${projectionForPlayer(player).toFixed(1)} projected avg pts`;
  const confidence = player.labAnalysis?.confidenceLabel || player.confidenceAnalysis?.label || "Low";
  const valueText = Number.isFinite(player.adp)
    ? adpGap >= 8
      ? `he is ${adpGap.toFixed(1)} picks past ADP`
      : adpGap <= -12
        ? `this is ${Math.abs(adpGap).toFixed(1)} picks before ADP`
        : "the price is close to market"
    : "there is no reliable ADP anchor";
  const altScoreGap = bestAlternative ? Math.max(0, selected.score - recommendationScore(bestAlternative, team, pickNumber)) : 0;
  const otherPositionText = bestOtherPosition
    ? `${bestOtherPosition.player.name} (${bestOtherPosition.position}) is the best other-position option, but ${positionNeedText(player, roster)} and ${player.position} carries ${dropoff >= 4 ? "a sharper tier drop" : "the better total recommendation profile"} here.`
    : `${player.position} is the cleanest remaining positional fit because there is no strong other-position challenger in range.`;
  const personaEvidence = personaRecommendationEvidence(player, team, pickNumber, roster);
  const scoutingEvidence = scoutingSnipeEvidence(player, team, pickNumber);

  return [
    {
      label: "Why this player",
      text: `${player.name} is Lab #${Math.round(player.consensusRank || 999)} with ${confidence.toLowerCase()} ranking confidence and ${projectionText}; ${valueText}. ${player.labAnalysis?.finalReason || "The Lab board treats him as the best available value in this range."}`
    },
    {
      label: "Why now",
      text: `${pickLabel(pickNumber)} is the right timing because ${likelyPlayerTiming(player, team, pickNumber)}${dropoff >= 4 ? `, and the same-position tier drops by about ${dropoff.toFixed(1)} points after this range` : ""}.`
    },
    {
      label: "Why over alternatives",
      text: bestAlternative
        ? `He grades ${altScoreGap.toFixed(1)} recommendation points ahead of ${bestAlternative.name}. ${samePositionAlternative ? `The nearest ${player.position} fallback is ${samePositionAlternative.name}.` : ""}`
        : "He is the clear top option left in this recommendation set."
    },
    {
      label: "Why this position",
      text: otherPositionAlternative ? otherPositionText : `${positionNeedText(player, roster)}, and the board does not show a better cross-position tradeoff at this slot.`
    },
    {
      label: "Persona fit",
      text: personaEvidence.text,
    },
    {
      label: "Room and Scouting Report",
      text: scoutingEvidence.text,
    },
  ];
}

function playerDecisionAnalysisHtml(player, team = state.userTeam, pickNumber = state.currentPick) {
  return `
    <div class="decision-analysis">
      ${playerDecisionAnalysis(player, team, pickNumber).map((item) => `
        <div class="decision-row">
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.text)}</p>
        </div>
      `).join("")}
    </div>
  `;
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
      return isSleeperCandidate(player, pickNumber);
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
      if (lowerKind === "sleeper") score = sleeperCandidateScore(player, state.userTeam, pickNumber);
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

function sleeperCandidateScore(player, team = state.userTeam, pickNumber = state.currentPick) {
  if (player?.sleeperProfile) return Number(player.sleeperProfile.sleeperScore) || 0;
  const adp = Number(player?.adp);
  const rank = Number(player?.consensusRank);
  const priceEdge = Number.isFinite(adp) && Number.isFinite(rank) ? clampNumber(50 + (adp - rank) * 3, 0, 100) : 35;
  const leagueFit = Number.isFinite(Number(player?.leagueFitScore)) ? Number(player.leagueFitScore) : 50;
  const guideSignal = Number.isFinite(Number(player?.guideSignalScore)) ? Number(player.guideSignalScore) : 45;
  return priceEdge * 0.45 + guideSignal * 0.35 + leagueFit * 0.20;
}

function isSleeperCandidate(player) {
  if (player?.sleeperProfile) return Boolean(player.sleeperProfile.isSleeper);
  const adp = Number(player?.adp);
  const rank = Number(player?.consensusRank);
  const priceEdge = Number.isFinite(adp) && Number.isFinite(rank) ? adp - rank : null;
  const hasStructuredTalent = Number(player?.prospectScore) >= 60 || Number(player?.targetsPerRoute) >= 0.18 || Number(player?.yardsPerRoute) >= 1.5;
  const hasStructuredOpportunity = Number(player?.projectedOpportunityShare) >= 0.45 || Number(player?.standaloneRoleScore) >= 60 || Number(player?.contingentRoleScore) >= 60;
  return priceEdge !== null && priceEdge >= 3 && hasStructuredTalent && hasStructuredOpportunity;
}

function flaggedSleeperAdvice() {
  const pickNumber = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const flagged = availablePlayers().filter((player) => state.flaggedPlayerIds.has(player.id));
  if (!flagged.length) return "You do not have any available flagged players yet. Flag a few names on the Big Board, then I can rank the sleeper angles inside that list.";

  const sleepers = flagged
    .filter((player) => isSleeperCandidate(player, pickNumber))
    .map((player) => ({ player, score: sleeperCandidateScore(player, state.userTeam, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!sleepers.length) {
    return `None of your available flagged players currently meet the sleeper filter at ${pickLabel(pickNumber)}. The closest flagged names by overall recommendation score are:\n\n${flagged
      .map((player) => ({ player, score: recommendationScore(player, state.userTeam, pickNumber) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ player }, index) => `${index + 1}. ${player.name} - ${player.position}, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}. ${playerShortReason(player, pickNumber)}`)
      .join("\n")}`;
  }

  const rows = sleepers
    .map(({ player }, index) => `${index + 1}. ${player.name} - ${player.position}, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}, ${projectionForPlayer(player).toFixed(1)} avg pts. ${playerShortReason(player, pickNumber)}`)
    .join("\n");
  return `Flagged sleeper recommendations at ${pickLabel(pickNumber)}:\n${rows}\n\nThese are ranked only from your flagged, still-available players. Treat them as queue/watch-list targets unless the board has reached their ADP range.`;
}

function sleeperFlagReason(player, pickNumber) {
  const profile = player?.sleeperProfile;
  if (profile) {
    const evidence = (profile.evidence || []).filter((item) => item.direction === "positive").slice(0, 2).map((item) => `${item.label}: ${item.value}`);
    return [...evidence, `target Round ${profile.targetRound}`, `main blocker: ${profile.primaryBlocker}`].slice(0, 3).join("; ");
  }
  return isSleeperCandidate(player) ? `structured price, talent and opportunity signals; target near pick ${Math.round(player.adp || player.consensusRank)}` : playerShortReason(player, pickNumber);
}

function sleeperFlagSuggestionsAdvice() {
  const pickNumber = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const suggestions = availablePlayers()
    .filter((player) => !state.flaggedPlayerIds.has(player.id))
    .filter((player) => isSleeperCandidate(player, pickNumber))
    .map((player) => ({ player, score: sleeperCandidateScore(player, state.userTeam, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!suggestions.length) return "I do not see strong unflagged sleeper candidates right now. Your current flags may already be covering the best watch-list names.";

  const rows = suggestions
    .map(({ player }, index) => `${index + 1}. ${player.name} - ${player.position}, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}, rank #${Math.round(player.consensusRank)}. Why flag: ${sleeperFlagReason(player, pickNumber)}`)
    .join("\n");
  return `Potential sleepers I would consider flagging at ${pickLabel(pickNumber)}:\n${rows}\n\nThese are watch-list suggestions, not automatic pick-now recommendations. Qualification requires a meaningful price edge plus structured talent and opportunity evidence; late ADP by itself is not enough.`;
}

function playerSurvivalEstimate(player, team = state.userTeam, fromPick = state.currentPick) {
  const cacheKey = `${currentDraftStateIdentifier(fromPick)}|${player.id}|${team}|${fromPick}|${state.bulk.results?.summary?.createdAt || "none"}`;
  if (SURVIVAL_ANALYSIS_CACHE.has(cacheKey)) return SURVIVAL_ANALYSIS_CACHE.get(cacheKey);
  const nextPick = nextPickForTeam(team, fromPick);
  if (!nextPick) {
    const result = { survivalProbability: 0, confidence: "High", label: "No future selection", explanation: "This team has no later pick.", nextPick: null, picksUntil: 0, sampleSize: 0 };
    SURVIVAL_ANALYSIS_CACHE.set(cacheKey, result);
    return result;
  }
  const marketPick = Number.isFinite(player.adp) ? player.adp : Number.isFinite(player.consensusRank) ? player.consensusRank : nextPick;
  const picksUntil = Math.max(0, nextPick - fromPick - 1);
  let pressure = (nextPick - marketPick) / 7.5;
  const sourceSpread = player.confidenceAnalysis?.source?.rankRange || 0;
  pressure += Math.min(0.65, sourceSpread / 80);
  const interveningTeams = new Set();
  let needPressure = 0, personaPressure = 0, behaviorCoverage = 0;
  for (let pick = fromPick + 1; pick < nextPick; pick += 1) {
    const order = draftOrderFor(pick);
    if (order.team === team || interveningTeams.has(order.team)) continue;
    interveningTeams.add(order.team);
    const needs = starterNeedsForRoster(rosterFor(order.team));
    if (needs.includes(player.position) || (["RB", "WR", "TE"].includes(player.position) && needs.includes("FLEX"))) needPressure += 0.28;
    const persona = getPersonaForTeam(order.team);
    if (persona.positionalAggression === player.position) personaPressure += 0.22;
    const profile = scoutingProfileForTeam(order.team);
    if (profile?.picksAnalyzed) behaviorCoverage += 1;
  }
  const recent = state.picks.slice(-6).filter((pick) => pick.player.position === player.position).length;
  const runPressure = Math.max(0, recent - 1) * 0.16;
  const sameTier = availablePlayers().filter((candidate) => candidate.position === player.position && candidate.tier === player.tier).length;
  const depthRelief = Math.min(0.45, Math.max(0, sameTier - 1) * 0.08);
  pressure += needPressure + personaPressure + runPressure - depthRelief;
  const survivalProbability = clampNumber(1 / (1 + Math.exp(pressure)), 0.03, 0.97);
  const calibration = state.learning.calibrationSummary || {};
  const calibrationPenalty = Number(calibration.evaluated || 0) >= 10 && Number(calibration.positionAccuracy || 0) < 0.45 ? 18 : 0;
  const evidenceScore = (Number.isFinite(player.adp) ? 35 : 10) + Math.min(25, (player.sourceCount || 0) * 8) + Math.min(25, behaviorCoverage * 8) + (interveningTeams.size ? 10 : 0) - calibrationPenalty;
  const confidence = evidenceScore >= 70 ? "High" : evidenceScore >= 42 ? "Medium" : "Low";
  const label = survivalProbability >= 0.66 ? "Likely to survive" : survivalProbability >= 0.52 ? "Slightly favored to survive" : survivalProbability >= 0.34 ? "At risk" : "Unlikely to survive";
  const explanation = `${picksUntil} selections before ${pickLabel(nextPick)}; ${interveningTeams.size} intervening teams, ${Math.round(needPressure / 0.28)} with an open ${player.position} path${recent >= 2 ? `, plus a ${recent}-pick ${player.position} run` : ""}.${calibrationPenalty ? " Prediction history has been noisy, so confidence is reduced." : ""}`;
  const result = { survivalProbability, confidence, label, explanation, nextPick, picksUntil, sampleSize: Math.max(0, Number(calibration.evaluated || 0)), behaviorCoverage };
  SURVIVAL_ANALYSIS_CACHE.set(cacheKey, result);
  return result;
}

function likelyAvailableAtPick(player, pickNumber) {
  if (!pickNumber) return false;
  const estimate = playerSurvivalEstimate(player, state.userTeam, state.currentPick);
  return estimate.nextPick === pickNumber ? estimate.survivalProbability >= 0.5 : (Number.isFinite(player.adp) ? player.adp >= pickNumber - 8 : player.consensusRank >= pickNumber - 8);
}

function futureFlagCandidateReason(player, simulatedRoster, nextPick) {
  const reasons = [];
  const needs = starterNeedsForRoster(simulatedRoster);
  if (needs.includes(player.position) || (player.position !== "QB" && player.position !== "K" && player.position !== "DEF" && needs.includes("FLEX"))) {
    reasons.push("fits the post-pick roster build");
  }
  if (likelyAvailableAtPick(player, nextPick)) reasons.push("has a realistic chance to reach that pick");
  if (isSleeperCandidate(player, nextPick)) reasons.push("sleeper/watch-list profile");
  if (Number.isFinite(player.adp)) {
    const gap = nextPick - player.adp;
    if (gap >= 6) reasons.push(`could be ADP value by ${gap.toFixed(1)} picks`);
    if (gap < -12) reasons.push("would require the room to let him slide");
  }
  if (player.upsideNote) reasons.push(player.upsideNote);
  if (player.depthChartRole) reasons.push(player.depthChartRole);
  return reasons.slice(0, 3).join("; ") || playerShortReason(player, nextPick);
}

function scenarioNextPickFlagAdvice(question, positionMatch = null) {
  const currentPick = Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds);
  const mentionedPlayer = mentionedPlayerFromQuestion(question);
  const position = positionMatch?.[1]?.toUpperCase() || mentionedPlayer?.position || null;
  const currentRoster = rosterFor(state.userTeam);
  const firstPlayer = mentionedPlayer && availablePlayers().some((player) => player.id === mentionedPlayer.id)
    ? mentionedPlayer
    : position
      ? bestAvailableForPosition(position, currentRoster, currentPick)
      : recommendations(state.userTeam, currentPick, 1)[0];
  if (!firstPlayer) return currentPickAdvice();

  const [nextPick] = nextPickNumbersForTeam(state.userTeam, currentPick, 1);
  if (!nextPick) return `If you take ${firstPlayer.name} here, this is your final pick, so there is no next-pick flag list to build.`;

  const simulatedRoster = [...currentRoster, firstPlayer];
  const excluded = new Set([firstPlayer.id]);
  const candidates = availablePlayers()
    .filter((player) => !excluded.has(player.id))
    .filter((player) => likelyAvailableAtPick(player, nextPick) || isSleeperCandidate(player, nextPick))
    .map((player) => {
      let score = recommendationScore(player, state.userTeam, nextPick);
      if (isSleeperCandidate(player, nextPick)) score += 18;
      if (state.flaggedPlayerIds.has(player.id)) score += 6;
      if (likelyAvailableAtPick(player, nextPick)) score += 5;
      return { player, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const needs = starterNeedsForRoster(simulatedRoster);
  const rosterContext = needs.length ? needs.join(", ") : "starters covered";
  const rows = candidates.map(({ player }, index) => `${index + 1}. ${player.name} - ${player.position}, ADP ${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "N/A"}, rank #${Math.round(player.consensusRank)}. Why flag: ${futureFlagCandidateReason(player, simulatedRoster, nextPick)}`).join("\n");
  const premise = mentionedPlayer
    ? `If you take ${firstPlayer.name} here`
    : `If you go ${firstPlayer.position} here with ${firstPlayer.name}`;
  return `${premise}, your next pick is ${pickLabel(nextPick)}.\n\nPlayers I would flag for that next pick:\n${rows || "No realistic next-pick flag candidates found from the current board."}\n\nCritical read: after ${firstPlayer.name}, your remaining starter/flex needs are ${rosterContext}. I am prioritizing players who can plausibly survive to your next pick, fit the post-pick roster shape, and have enough upside/value to be worth tracking before the room gets there.`;
}

function needsAdvice() {
  const roster = rosterFor(state.userTeam);
  const counts = positionCounts(roster);
  const nextPicks = nextPickNumbersForTeam(state.userTeam, state.currentPick, 3).map(pickLabel).join(", ") || "no remaining picks";
  return `Roster snapshot for ${teamName(state.userTeam)}:\nQB ${counts.QB || 0}/${LEAGUE.roster.QB}, RB ${counts.RB || 0}/${LEAGUE.roster.RB}, WR ${counts.WR || 0}/${LEAGUE.roster.WR}, TE ${counts.TE || 0}/${LEAGUE.roster.TE}, K ${counts.K || 0}/${LEAGUE.roster.K}, DEF ${counts.DEF || 0}/${LEAGUE.roster.DEF}.\n\nBiggest needs: ${rosterNeedLabel(roster)}.\nYour next picks: ${nextPicks}.`;
}

function mentionedPlayerFromQuestion(question) {
  const lowerQuestion = String(question || "").toLowerCase();
  const aliases = {
    cmc: "Christian McCaffrey",
  };
  const aliasName = Object.entries(aliases).find(([alias]) => new RegExp(`\\b${alias}\\b`, "i").test(lowerQuestion))?.[1];
  if (aliasName) {
    const aliasPlayer = PLAYERS.find((player) => playerKey(player.name) === playerKey(aliasName));
    if (aliasPlayer) return aliasPlayer;
  }
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
    player.labAnalysis?.summary ? `Lab Analysis: ${player.labAnalysis.summary}` : "",
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

function localAssistantResponse(question) {
  const lower = question.toLowerCase();
  const positionMatch = lower.match(/\b(qb|rb|wr|te|k|def)\b/);
  const scenarioQuestion = /if i (go|take|pick|draft)|if we (go|take|pick|draft)|after i (go|take|pick|draft)/.test(lower);
  const nextFlagQuestion = scenarioQuestion && lower.includes("next") && (lower.includes("flag") || lower.includes("watch") || lower.includes("queue"));
  if (nextFlagQuestion) return scenarioNextPickFlagAdvice(question, positionMatch);
  if (scenarioQuestion && positionMatch) return scenarioPlan(positionMatch[1]);
  if (lower.includes("next") && lower.includes("3") && positionMatch) return scenarioPlan(positionMatch[1]);
  const mentionedPlayer = mentionedPlayerFromQuestion(question);
  if (mentionedPlayer) return playerSpecificAdvice(mentionedPlayer);
  if (lower.includes("rookie") || lower.includes("rookies")) return targetedPlayerAdvice("rookie", positionMatch?.[1] || null);
  if (lower.includes("sleeper") || lower.includes("sleepers")) return targetedPlayerAdvice("sleeper", positionMatch?.[1] || null);
  if (lower.includes("upside") || lower.includes("breakout") || lower.includes("ceiling")) return targetedPlayerAdvice("upside", positionMatch?.[1] || null);
  if (lower.includes("value") || lower.includes("falling") || lower.includes("discount")) return targetedPlayerAdvice("value", positionMatch?.[1] || null);
  if (lower.includes("need") || lower.includes("roster")) return needsAdvice();
  if (lower.includes("who") || lower.includes("pick") || lower.includes("best") || lower.includes("recommend")) return currentPickAdvice();
  return `${currentPickAdvice()}\n\nLocal analysis can also answer roster needs, player details, value questions, and simple position-path scenarios.`;
}

let ASSISTANT_ACTIVE_ABORT = null;

function defaultAssistantSession() {
  return {
    version: ASSISTANT_SESSION_VERSION,
    draftSessionId: null,
    previousResponseId: null,
    messages: [],
    lastContextKey: null,
    answerDetail: "concise",
    status: "ready",
    offlineMode: false,
    lastUserMessage: "",
    lastError: "",
    suggestedPrompts: [],
  };
}

function assistantDraftSessionId() {
  const viewed = activeDraft();
  if (viewed) return `archive:${state.activeLeagueId}:${viewed.id}`;
  return `active:${state.activeLeagueId}:${state.draftMode}:${String(state.mockSeed || 0)}`;
}

function assistantContextKey() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  const pick = Math.min(state.currentPick, total + 1);
  return `${assistantDraftSessionId()}|${currentDraftStateIdentifier(pick)}|${state.bulk.results?.summary?.createdAt || "no-plan"}|${state.bulk.staleReason || "fresh"}`;
}

function normalizeAssistantSession(raw = {}) {
  const base = defaultAssistantSession();
  const messages = Array.isArray(raw.messages)
    ? raw.messages.slice(-ASSISTANT_MESSAGE_LIMIT).map((message) => ({
        id: String(message?.id || `assistant-${Date.now()}-${Math.random()}`),
        role: message?.role === "user" ? "user" : "assistant",
        text: String(message?.text || "").slice(0, 6000),
        createdAt: Number(message?.createdAt) || Date.now(),
        mode: ["llm", "local", "system"].includes(message?.mode) ? message.mode : "local",
        contextKey: message?.contextKey ? String(message.contextKey) : null,
        structured: message?.structured && typeof message.structured === "object" ? message.structured : null,
        streaming: false,
      })).filter((message) => message.text)
    : [];
  return {
    ...base,
    version: ASSISTANT_SESSION_VERSION,
    draftSessionId: raw.draftSessionId ? String(raw.draftSessionId) : null,
    previousResponseId: raw.previousResponseId ? String(raw.previousResponseId) : null,
    messages,
    lastContextKey: raw.lastContextKey ? String(raw.lastContextKey) : null,
    answerDetail: raw.answerDetail === "detailed" ? "detailed" : "concise",
    status: "ready",
    offlineMode: Boolean(raw.offlineMode),
    lastUserMessage: String(raw.lastUserMessage || "").slice(0, 2500),
    lastError: "",
    suggestedPrompts: Array.isArray(raw.suggestedPrompts) ? raw.suggestedPrompts.slice(0, 6).map(String) : [],
  };
}

function saveAssistantSession() {
  try {
    const session = normalizeAssistantSession(state.assistantSession || {});
    session.status = "ready";
    localStorage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Conversation remains available for the current browser session.
  }
}

function loadAssistantSession() {
  try {
    state.assistantSession = normalizeAssistantSession(JSON.parse(localStorage.getItem(ASSISTANT_STORAGE_KEY) || "{}"));
  } catch {
    state.assistantSession = defaultAssistantSession();
  }
  state.assistantMessages = state.assistantSession.messages;
}

function assistantGreeting() {
  return {
    id: `assistant-${Date.now()}-greeting`,
    role: "assistant",
    text: "Bounce an idea off your Draft Assistant. Challenge the recommendation, compare players, test a scenario, or ask what could change the call.",
    createdAt: Date.now(),
    mode: "system",
    contextKey: assistantContextKey(),
    structured: null,
    streaming: false,
  };
}

function resetAssistantSession(reason = "Conversation cleared.", options = {}) {
  if (ASSISTANT_ACTIVE_ABORT) ASSISTANT_ACTIVE_ABORT.abort();
  const prior = state.assistantSession || defaultAssistantSession();
  state.assistantSession = {
    ...defaultAssistantSession(),
    draftSessionId: assistantDraftSessionId(),
    answerDetail: options.keepPreferences === false ? "concise" : prior.answerDetail || "concise",
    offlineMode: options.keepPreferences === false ? false : Boolean(prior.offlineMode),
    messages: [assistantGreeting()],
    lastContextKey: assistantContextKey(),
    status: "ready",
  };
  if (reason && reason !== "Conversation cleared.") state.assistantSession.lastError = "";
  state.assistantMessages = state.assistantSession.messages;
  saveAssistantSession();
  renderDraftAssistant();
}

function synchronizeAssistantSession() {
  if (!state.assistantSession || state.assistantSession.version !== ASSISTANT_SESSION_VERSION) state.assistantSession = defaultAssistantSession();
  const currentSessionId = assistantDraftSessionId();
  if (state.assistantSession.draftSessionId !== currentSessionId) {
    const preferences = { answerDetail: state.assistantSession.answerDetail, offlineMode: state.assistantSession.offlineMode };
    state.assistantSession = { ...defaultAssistantSession(), ...preferences, draftSessionId: currentSessionId, messages: [] };
  }
  if (!state.assistantSession.messages.length) state.assistantSession.messages = [assistantGreeting()];
  state.assistantMessages = state.assistantSession.messages;
}

function assistantSafeClone(value) {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (typeof current === "number" && !Number.isFinite(current)) return null;
    if (current instanceof Set) return [...current];
    if (current instanceof Map) return Object.fromEntries(current.entries());
    if (current === undefined) return null;
    return current;
  }));
}

function assistantProjection(player) {
  const profile = projectionProfileForPlayer(player);
  return {
    weeklyValue: Number(profile.weeklyValue.toFixed(2)),
    type: profile.projectionType,
    label: profile.label,
    source: profile.source,
    confidence: profile.confidence,
    period: profile.period,
  };
}

function assistantPlayerRecord(player, outcome = null) {
  const priority = currentDraftPlanPriority(player.id);
  const survival = outcome?.survival || playerSurvivalEstimate(player, state.userTeam, state.currentPick);
  const confidence = player.confidenceAnalysis || rankingConfidenceAnalysis(player, outcome ? { simulationCount: outcome.simulationCount, stability: outcome.stability } : null);
  return assistantSafeClone({
    playerId: player.id,
    name: player.name,
    position: player.position,
    nflTeam: player.team,
    labRank: Number(player.consensusRank),
    draftPlanPriority: priority?.priorityRank ?? null,
    priorityMovement: priority?.movement ?? null,
    priorityExplanation: priority?.explanation || null,
    adp: Number.isFinite(player.adp) ? Number(player.adp) : null,
    tier: player.tier ?? null,
    projection: assistantProjection(player),
    rankingConfidence: confidence.label,
    rankingConfidenceReason: confidence.confidenceReason || null,
    rosterFit: fillsRequiredRosterSlot(player, rosterFor(state.userTeam)) ? "Open starter or flex path" : "Depth or value path",
    survival: {
      label: survival.label,
      probability: survival.confidence === "Low" ? null : Number(survival.survivalProbability),
      confidence: survival.confidence,
      explanation: survival.explanation,
    },
    outcome: outcome ? {
      estimatedPlayoffRate: Number(outcome.estimatedPlayoffRate),
      medianRosterOutcome: Number(outcome.medianRosterOutcome),
      downsideOutcome: Number(outcome.downsideOutcome),
      averageRoomFinish: Number(outcome.averageRoomFinish),
      championshipRate: Number(outcome.championshipRate),
      topThreeRate: Number(outcome.topThreeRate),
      starterImpact: Number(outcome.starterImpact),
      simulationCount: Number(outcome.simulationCount),
      confidence: outcome.confidence,
      mainRisk: outcome.mainRisk,
    } : null,
  });
}

function assistantCompactContextSummary() {
  const league = activeLeague();
  const total = league.teams * league.rounds;
  const draftComplete = state.currentPick > total;
  const order = draftComplete ? null : draftOrderFor(state.currentPick);
  const nextPick = draftComplete ? null : nextPickForTeam(state.userTeam, state.currentPick);
  const outcomes = currentOutcomeResults();
  const outcomeMap = new Map(outcomes.map((row) => [row.playerId, row]));
  const top = (outcomes.length ? outcomes.map((row) => row.player) : recommendations(state.userTeam, state.currentPick, 5)).slice(0, 5);
  const recent = activePicks().slice(-6).map((pick) => ({
    pick: pick.pick,
    label: pick.label,
    team: pick.team,
    teamName: activeTeamName(pick.team),
    playerId: pick.player.id,
    player: pick.player.name,
    position: pick.player.position,
    tier: pick.player.tier ?? null,
  }));
  const roster = rosterFor(state.userTeam);
  const planStatus = currentPlanStatus();
  const importedProjectionCount = top.filter((player) => projectionProfileForPlayer(player).projectionType === "imported").length;
  return assistantSafeClone({
    contextVersion: 2,
    draftIdentifier: assistantDraftSessionId(),
    draftStateIdentifier: currentDraftStateIdentifier(state.currentPick),
    readOnly: Boolean(state.viewedDraftId),
    draftComplete,
    currentPick: draftComplete ? null : state.currentPick,
    currentRound: order?.round ?? null,
    currentPickLabel: order?.label ?? null,
    currentTeam: order ? { team: order.team, name: activeTeamName(order.team) } : null,
    userTeam: { team: state.userTeam, name: activeTeamName(state.userTeam) },
    userNextPick: nextPick,
    picksUntilNextUserSelection: nextPick ? Math.max(0, nextPick - state.currentPick - 1) : null,
    userRoster: roster.map((player) => ({ playerId: player.id, name: player.name, position: player.position, nflTeam: player.team, projection: assistantProjection(player) })),
    recentPicks: recent,
    currentRecommendation: top[0] ? assistantPlayerRecord(top[0], outcomeMap.get(top[0].id) || null) : null,
    topCandidates: top.map((player) => assistantPlayerRecord(player, outcomeMap.get(player.id) || null)),
    draftPlan: {
      status: planStatus.label,
      reason: planStatus.reason,
      strategy: state.bulk.draftPlan?.bestStrategy || state.bulk.results?.summary?.bestStrategy?.label || state.strategy,
      stale: Boolean(state.bulk.staleReason),
    },
    outcomeAnalysisAvailability: outcomes.length ? "available" : state.candidateOutcome.status,
    survivalAnalysisAvailability: state.bulk.survival?.length ? "bulk evidence available" : "lightweight model only",
    recommendationStatus: state.candidateOutcome.status,
    league: {
      id: league.id,
      name: league.name,
      teams: league.teams,
      rounds: league.rounds,
      scoring: league.scoring,
      scoringSettings: scoringSettingsForLeague(league),
      roster: league.roster,
      playoffTeams: league.playoffTeams,
      keeper: league.keeper,
    },
    dataConfidence: {
      topCandidateImportedProjections: importedProjectionCount,
      topCandidateCount: top.length,
      leagueBehaviorHistoryAvailable: leagueBehaviorCoverageScore() > 0,
      calibrationPredictionsEvaluated: state.learning.calibrationSummary?.evaluated || 0,
      draftPlanAvailable: Boolean(state.bulk.draftPlan),
    },
  });
}

function assistantRequireObject(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("Invalid assistant tool arguments.");
  return args;
}

function assistantAssertAllowedKeys(args, allowedKeys = []) {
  const allowed = new Set(allowedKeys);
  const extra = Object.keys(args).find((key) => !allowed.has(key));
  if (extra) throw new Error(`Unsupported argument: ${extra}`);
}

function assistantRequirePlayer(playerId, availableOnly = false) {
  const id = String(playerId || "");
  const player = playerById(id);
  if (!player) throw new Error("Unknown player ID.");
  if (availableOnly && state.draftedIds.has(player.id)) throw new Error("That player is no longer available.");
  return player;
}

function assistantValidatePositions(positions) {
  if (positions == null) return null;
  if (!Array.isArray(positions)) throw new Error("Positions must be an array.");
  const allowed = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);
  const clean = positions.map((position) => String(position).toUpperCase()).filter((position) => allowed.has(position));
  if (!clean.length && positions.length) throw new Error("No valid positions were supplied.");
  return clean;
}

function assistantOutcomeRow(playerId) {
  return currentOutcomeResults().find((row) => row.playerId === playerId)
    || state.bulk.counterfactual?.results?.find((row) => row.playerId === playerId)
    || null;
}

function getDraftContextTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, []);
  const context = assistantCompactContextSummary();
  return { ...context, sampleSize: activePicks().length, confidence: context.dataConfidence?.draftPlanAvailable || context.dataConfidence?.leagueBehaviorHistoryAvailable ? "Moderate" : "Low" };
}

function getAvailableCandidatesTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["limit", "positions", "maximumRankRange", "targetStyle"]);
  const limit = Math.max(1, Math.min(20, Number(args.limit) || 8));
  const positions = assistantValidatePositions(args.positions);
  const maximumRankRange = args.maximumRankRange == null ? null : Math.max(1, Math.min(250, Number(args.maximumRankRange)));
  const targetStyle = ["balanced", "floor", "ceiling", "roster_fit", "market_value", "strategy_fit"].includes(args.targetStyle) ? args.targetStyle : "balanced";
  const outcomes = new Map(currentOutcomeResults().map((row) => [row.playerId, row]));
  const roster = rosterFor(state.userTeam);
  const scored = availablePlayers().filter((player) => !positions || positions.includes(player.position))
    .filter((player) => maximumRankRange == null || player.consensusRank <= maximumRankRange)
    .filter((player) => validOutcomeCandidate(player, state.userTeam, state.currentPick))
    .map((player) => {
      const outcome = outcomes.get(player.id);
      const priority = currentDraftPlanPriority(player.id);
      let score = recommendationScore(player, state.userTeam, state.currentPick);
      if (targetStyle === "floor") score += projectionForPlayer(player) * 5 - (player.riskNote || player.injuryNote ? 18 : 0);
      if (targetStyle === "ceiling") score += (player.upsideNote || (player.tags || []).includes("upside") ? 18 : 0) + Number(outcome?.firstPlaceDraftRate || 0) * 100;
      if (targetStyle === "roster_fit") score += fillsRequiredRosterSlot(player, roster) ? 30 : -10;
      if (targetStyle === "market_value") score += Number.isFinite(player.adp) ? Math.max(-25, Math.min(25, state.currentPick - player.adp)) : 0;
      if (targetStyle === "strategy_fit") score += Number(priority?.strategyPathValue || 0) * 25;
      if (outcome) score += outcome.estimatedPlayoffRate * 200;
      return { player, outcome, score };
    })
    .sort((a, b) => b.score - a.score || a.player.consensusRank - b.player.consensusRank)
    .slice(0, limit);
  return assistantSafeClone({
    sampleSize: scored.length,
    targetStyle,
    recommendationStatus: state.candidateOutcome.status,
    confidence: scored.some(({ outcome }) => outcome) ? "Moderate" : "Low",
    candidates: scored.map(({ player, outcome }) => assistantPlayerRecord(player, outcome)),
    unavailableReason: scored.length ? null : "No reasonable available candidates matched the requested filters.",
  });
}

function comparePlayersTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["playerIds", "comparisonGoal"]);
  const ids = Array.isArray(args.playerIds) ? [...new Set(args.playerIds.map(String))].slice(0, 5) : [];
  if (ids.length < 2) throw new Error("Compare players requires two to five player IDs.");
  const goal = ["balanced", "floor", "ceiling", "roster_fit", "market_value", "strategy_fit"].includes(args.comparisonGoal) ? args.comparisonGoal : "balanced";
  const players = ids.map((id) => assistantRequirePlayer(id));
  const records = players.map((player) => {
    const outcome = assistantOutcomeRow(player.id);
    const priority = currentDraftPlanPriority(player.id);
    const record = assistantPlayerRecord(player, outcome);
    const mainAdvantage = outcome?.starterImpact >= 1.5
      ? `Adds ${outcome.starterImpact.toFixed(1)} projected starter points per week.`
      : priority?.movement > 4
        ? `Dynamic priority rises ${priority.movement} spots because of draft-path evidence.`
        : fillsRequiredRosterSlot(player, rosterFor(state.userTeam))
          ? "Fills an open starter or flex path."
          : `Carries the strongest static value near Lab Rank ${Math.round(player.consensusRank)}.`;
    const mainConcern = player.injuryNote || player.riskNote || outcome?.mainRisk || (record.survival.confidence === "Low" ? "Availability evidence is limited." : "No dominant risk is identified in current data.");
    return { ...record, mainAdvantage, mainConcern, strategyCompatibility: priority?.strategyPathValue ?? null, replacementCost: playerReplacementCost(player) };
  });
  const completed = records.filter((row) => row.outcome);
  const confidence = completed.length === records.length && completed.every((row) => row.outcome.simulationCount >= 4)
    ? "Moderate"
    : completed.length ? "Low" : "Unavailable";
  return assistantSafeClone({
    comparisonGoal: goal,
    candidates: records,
    sampleSize: completed.reduce((sum, row) => sum + (row.outcome?.simulationCount || 0), 0),
    confidence,
    limitations: completed.length === records.length ? [] : ["One or more players do not have completed candidate rollouts; static and market evidence is shown instead."],
  });
}

async function evaluatePickScenarioTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["playerId", "futureUserPicks", "analysisDepth"]);
  const player = assistantRequirePlayer(args.playerId, true);
  const depth = ["quick", "standard", "deep"].includes(args.analysisDepth) ? args.analysisDepth : "quick";
  const order = state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick) : null;
  if (!order || order.team !== state.userTeam || state.viewedDraftId) throw new Error("Counterfactual analysis requires an active user pick in the current draft.");
  if (!validOutcomeCandidate(player, state.userTeam, state.currentPick)) throw new Error("That player is not a reasonable candidate for this pick under current roster rules.");
  const settings = depth === "deep" ? { rollouts: 8, seasons: 48 } : depth === "standard" ? { rollouts: 4, seasons: 30 } : { rollouts: 2, seasons: 18 };
  const futureUserPicks = args.futureUserPicks == null ? 3 : Math.max(1, Math.min(5, Number(args.futureUserPicks)));
  const snapshot = snapshotCandidateDraftState();
  const contextKey = `${candidateOutcomeModelKey()}|assistant|${player.id}|${depth}|${futureUserPicks}`;
  const trials = [];
  try {
    for (let index = 0; index < settings.rollouts; index += 1) {
      if (ASSISTANT_ACTIVE_ABORT?.signal.aborted) throw new DOMException("Assistant analysis stopped.", "AbortError");
      trials.push(simulateCandidateTrial(player, index, contextKey, settings.seasons));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    const outcome = aggregateCandidateOutcome(player, trials);
    return assistantSafeClone({
      candidate: assistantPlayerRecord(player, outcome),
      postPickRosterState: {
        positionComposition: outcome.positionComposition,
        projectedStarterImpact: outcome.starterImpact,
      },
      medianOutcome: outcome.medianRosterOutcome,
      interquartileRange: [outcome.outcomeP25, outcome.outcomeP75],
      downsideOutcome: outcome.downsideOutcome,
      playoffRate: outcome.estimatedPlayoffRate,
      championshipRate: outcome.championshipRate,
      topThreeRate: outcome.topThreeRate,
      averageRoomFinish: outcome.averageRoomFinish,
      expectedNextPickOptions: outcome.expectedNextRoundOptions.slice(0, Math.max(3, futureUserPicks * 2)),
      likelyTierLosses: state.bulk.survival?.filter((row) => row.type === "tier" && row.survivalRate < 0.4).slice(0, 5) || [],
      strategyImpact: outcome.strategyCompatibility,
      draftPlanStatus: currentPlanStatus(),
      mainFailureCondition: outcome.mainRisk,
      confidence: outcome.confidence,
      confidenceReason: outcome.confidenceReason || null,
      completedRollouts: outcome.simulationCount,
      sampleSize: outcome.simulationCount,
      simulatedSeasonsPerRollout: settings.seasons,
      deterministicKey: contextKey,
    });
  } finally {
    restoreSimulationState(snapshot);
  }
}

function getSurvivalOutlookTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["playerIds", "tierIds", "horizon"]);
  const playerIds = Array.isArray(args.playerIds) ? [...new Set(args.playerIds.map(String))].slice(0, 10) : [];
  const tierIds = Array.isArray(args.tierIds) ? [...new Set(args.tierIds.map(String))].slice(0, 10) : [];
  if (!playerIds.length && !tierIds.length) throw new Error("Provide at least one player or tier ID.");
  const horizon = ["next_user_pick", "following_user_pick", "end_of_round"].includes(args.horizon) ? args.horizon : "next_user_pick";
  const field = horizon === "following_user_pick" ? "followingPickSurvivalRate" : horizon === "end_of_round" ? "endRoundSurvivalRate" : "survivalRate";
  const playerRows = playerIds.map((id) => {
    const player = assistantRequirePlayer(id);
    const lightweight = playerSurvivalEstimate(player, state.userTeam, state.currentPick);
    const bulk = (state.bulk.survival || []).find((row) => row.type === "player" && row.id === player.id);
    const probability = Number.isFinite(bulk?.[field]) ? bulk[field] : horizon === "next_user_pick" ? lightweight.survivalProbability : null;
    const confidence = bulk?.confidence || lightweight.confidence;
    const pressure = scoutingSnipeEvidence(player, state.userTeam, state.currentPick);
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      horizon,
      survivalProbability: confidence === "Low" ? null : probability,
      qualitativeLabel: probability == null ? "Insufficient evidence" : probability >= 0.7 ? "Likely to survive" : probability >= 0.52 ? "Slightly favored to survive" : probability >= 0.3 ? "At risk" : "Unlikely to survive",
      completedRollouts: bulk?.observed || state.bulk.results?.summary?.totalRuns || 0,
      confidence,
      interveningTeamPressure: pressure.level,
      mainSnipeThreats: pressure.threats?.slice(0, 3).map((threat) => activeTeamName(threat.team)) || [],
      limitations: bulk ? [] : ["Following-pick and end-of-round estimates require a completed Draft Simulator batch."],
    };
  });
  const tierRows = tierIds.map((tierId) => {
    const row = (state.bulk.survival || []).find((item) => item.type === "tier" && (String(item.id) === tierId || `${item.position}-T${item.tier}` === tierId));
    if (!row) return { tierId, unavailable: true, reason: "No completed tier-survival evidence matches this ID." };
    const probability = Number.isFinite(row[field]) ? row[field] : row.survivalRate;
    return {
      tierId,
      position: row.position,
      tier: row.tier,
      horizon,
      survivalProbability: row.confidence === "Low" ? null : probability,
      qualitativeLabel: probability >= 0.7 ? "Likely to survive" : probability >= 0.52 ? "Slightly favored to survive" : probability >= 0.3 ? "At risk" : "Unlikely to survive",
      playersRemaining: row.averagePlayersRemaining ?? null,
      completedRollouts: row.observed || state.bulk.results?.summary?.totalRuns || 0,
      confidence: row.confidence,
    };
  });
  return assistantSafeClone({ horizon, players: playerRows, tiers: tierRows, sampleSize: state.bulk.results?.summary?.totalRuns || 0 });
}

function getRosterNeedsTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, []);
  const league = activeLeague();
  const roster = rosterFor(state.userTeam);
  const counts = positionCounts(roster);
  const openStarterPositions = starterNeedsForRoster(roster).filter((position) => !["K", "DEF"].includes(position));
  const positionRows = ["QB", "RB", "WR", "TE"].map((position) => {
    const projected = roster.filter((player) => player.position === position).sort((a, b) => projectionForPlayer(b) - projectionForPlayer(a));
    const required = Number(league.roster[position] || 0);
    return {
      position,
      rostered: counts[position] || 0,
      requiredStarters: required,
      bestWeeklyProjection: projected[0] ? projectionForPlayer(projected[0]) : null,
      strength: projected.length >= required + 2 ? "deep" : projected.length >= required && required > 0 ? "covered" : "weak",
    };
  });
  const riskPlayers = roster.filter((player) => player.injuryNote || player.riskNote);
  const redundancy = ["QB", "TE"].filter((position) => (counts[position] || 0) > (league.roster[position] || 0) + 1);
  const positionsThatCanWait = positionRows.filter((row) => row.strength === "deep" || row.strength === "covered").map((row) => row.position).slice(0, 3);
  return assistantSafeClone({
    openStarterPositions,
    positionStrength: positionRows.filter((row) => row.strength !== "weak"),
    positionWeakness: positionRows.filter((row) => row.strength === "weak"),
    benchDepth: Math.max(0, roster.length - bestLineupForRoster(roster).length),
    redundancy,
    riskConcentration: { count: riskPlayers.length, players: riskPlayers.slice(0, 5).map((player) => player.name) },
    highestImpactRosterNeed: openStarterPositions[0] || rosterNeedLabel(roster),
    positionsThatCanWait,
    confidence: "High",
    sampleSize: roster.length,
  });
}

function getRoomPressureTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["position", "horizonPicks"]);
  const position = args.position == null ? null : assistantValidatePositions([args.position])?.[0] || null;
  const nextPick = nextPickForTeam(state.userTeam, state.currentPick);
  const horizonPicks = args.horizonPicks == null ? Math.max(1, (nextPick || state.currentPick + 12) - state.currentPick) : Math.max(1, Math.min(50, Number(args.horizonPicks)));
  const endPick = Math.min(LEAGUE.teams * LEAGUE.rounds, state.currentPick + horizonPicks);
  const teams = [];
  for (let pick = state.currentPick; pick <= endPick; pick += 1) {
    const order = draftOrderFor(pick);
    if (order.team !== state.userTeam && !teams.includes(order.team)) teams.push(order.team);
  }
  const recent = activePicks().slice(-8);
  const recentPositionSelections = recent.reduce((counts, pick) => {
    counts[pick.player.position] = (counts[pick.player.position] || 0) + 1;
    return counts;
  }, {});
  const managers = teams.map((team) => {
    const persona = getPersonaForTeam(team);
    const profile = scoutingProfileForTeam(team);
    const needs = needsSummaryForTeam(team).slice(0, 3);
    const historicalPosition = profile ? scoutingTopPositionForPick(profile, draftOrderFor(Math.min(endPick, LEAGUE.teams * LEAGUE.rounds)).round) : null;
    const likelyDemand = position
      ? needs.includes(position) || persona.positionalAggression === position || historicalPosition === position
      : true;
    return {
      team,
      teamName: activeTeamName(team),
      rosterNeeds: needs,
      persona: persona.name,
      personaSource: personaAssignmentSource(team),
      historicalSampleSize: profile?.picksAnalyzed || 0,
      historicalPositionSignal: historicalPosition,
      likelyDemand,
    };
  });
  const demandCount = managers.filter((manager) => manager.likelyDemand).length;
  const topRecent = Object.entries(recentPositionSelections).sort((a, b) => b[1] - a[1])[0];
  return assistantSafeClone({
    position,
    horizonPicks,
    recentPositionSelections,
    runPressure: topRecent ? { position: topRecent[0], selections: topRecent[1], label: topRecent[1] >= 4 ? "High" : topRecent[1] >= 2 ? "Moderate" : "Low" } : { position: null, selections: 0, label: "Low" },
    managersBeforeUser: managers,
    predictionConfidence: managers.some((manager) => manager.historicalSampleSize >= 8) ? "Moderate" : "Low",
    likelyPositionDemand: position ? { position, managersCreatingPressure: demandCount } : recentPositionSelections,
    sampleSize: managers.reduce((sum, manager) => sum + manager.historicalSampleSize, 0),
  });
}

function getDraftPlanTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, []);
  const plan = state.bulk.draftPlan;
  const status = currentPlanStatus();
  if (!plan) return { available: false, status: status.label, reason: status.reason, confidence: "Unavailable", sampleSize: 0 };
  const round = draftOrderFor(Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds)).round;
  const objective = plan.objectives?.find((item) => Number(item.round) === Number(round)) || null;
  return assistantSafeClone({
    available: true,
    recommendedOpening: plan.recommendedOpening,
    bestAlternative: plan.bestAlternative,
    currentPlanStatus: status,
    currentRound: round,
    roundObjective: objective?.primary || null,
    acceptableFallback: objective?.fallback || null,
    pivotTrigger: objective?.trigger || plan.pivotRules?.[0] || null,
    atRiskTiers: plan.atRiskTiers || [],
    safeToWaitPositions: plan.waitPositions || [],
    planLimitations: plan.limitations || [],
    confidence: plan.confidence?.label || state.bulk.results?.summary?.confidence?.label || "Low",
    sampleSize: state.bulk.results?.summary?.totalRuns || 0,
  });
}

function getPlayerDetailsTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["playerId"]);
  const player = assistantRequirePlayer(args.playerId);
  const draftedPick = activePicks().find((pick) => pick.player.id === player.id);
  const outcome = assistantOutcomeRow(player.id);
  return assistantSafeClone({
    ...assistantPlayerRecord(player, outcome),
    availability: draftedPick ? { available: false, draftedAt: draftedPick.label, draftedBy: activeTeamName(draftedPick.team) } : { available: !state.draftedIds.has(player.id), draftedAt: null, draftedBy: null },
    bye: player.bye || null,
    flags: {
      userFlagged: state.flaggedPlayerIds.has(player.id),
      tags: player.tags || [],
    },
    context: {
      summary: player.labAnalysis?.summary || player.sourceSummary || null,
      depthChartRole: player.depthChartRole || null,
      teamContext: player.teamContext || null,
      upside: player.upsideNote || null,
      risk: player.riskNote || null,
      injury: player.injuryNote || null,
      competition: player.competition || null,
    },
    sampleSize: outcome?.simulationCount || 0,
    confidence: outcome?.confidence || player.confidenceAnalysis?.label || "Low",
  });
}

function getRecentDraftEventsTool(args = {}) {
  assistantRequireObject(args);
  assistantAssertAllowedKeys(args, ["eventCount"]);
  const count = Math.max(1, Math.min(30, Number(args.eventCount) || 8));
  const picks = activePicks().slice(-count);
  const positionCountsRecent = picks.reduce((counts, pick) => {
    counts[pick.player.position] = (counts[pick.player.position] || 0) + 1;
    return counts;
  }, {});
  const top = Object.entries(positionCountsRecent).sort((a, b) => b[1] - a[1])[0];
  return assistantSafeClone({
    events: picks.map((pick) => ({
      pick: pick.pick,
      label: pick.label,
      team: pick.team,
      teamName: activeTeamName(pick.team),
      playerId: pick.player.id,
      player: pick.player.name,
      position: pick.player.position,
      tier: pick.player.tier || null,
      keeper: Boolean(pick.keeper),
    })),
    meaningfulRoomChanges: top ? [`${top[0]} accounted for ${top[1]} of the last ${picks.length} picks.`] : [],
    sampleSize: picks.length,
    confidence: picks.length >= 6 ? "High" : picks.length >= 3 ? "Moderate" : "Low",
  });
}

async function runDraftAssistantTool(name, args) {
  switch (name) {
    case "get_draft_context":
      return getDraftContextTool(args);
    case "get_available_candidates":
      return getAvailableCandidatesTool(args);
    case "compare_players":
      return comparePlayersTool(args);
    case "evaluate_pick_scenario":
      return evaluatePickScenarioTool(args);
    case "get_survival_outlook":
      return getSurvivalOutlookTool(args);
    case "get_roster_needs":
      return getRosterNeedsTool(args);
    case "get_room_pressure":
      return getRoomPressureTool(args);
    case "get_draft_plan":
      return getDraftPlanTool(args);
    case "get_player_details":
      return getPlayerDetailsTool(args);
    case "get_recent_draft_events":
      return getRecentDraftEventsTool(args);
    default:
      throw new Error("Unsupported assistant tool");
  }
}

function assistantStatusCopy(status, detail = "") {
  const labels = {
    ready: "Ready",
    connecting: "Connecting",
    analyzing_board: "Analyzing the board",
    running_tool: detail ? `Running ${detail}` : "Running a requested tool",
    forming_answer: "Forming the answer",
    complete: "Complete",
    failed: "Failed",
    offline: "Local analysis mode",
    stopped: "Stopped",
  };
  return labels[status] || "Ready";
}

function setAssistantStatus(status, detail = "") {
  synchronizeAssistantSession();
  state.assistantSession.status = status;
  const label = assistantStatusCopy(status, detail);
  if ($("assistantConnectionState")) {
    $("assistantConnectionState").textContent = label;
    $("assistantConnectionState").dataset.status = status;
  }
  if ($("assistantSummaryStatus")) $("assistantSummaryStatus").textContent = label;
  const working = ["connecting", "analyzing_board", "running_tool", "forming_answer"].includes(status);
  if ($("assistantMessages")) $("assistantMessages").setAttribute("aria-busy", working ? "true" : "false");
  if ($("assistantStopBtn")) $("assistantStopBtn").hidden = !working;
  if ($("assistantSendBtn")) $("assistantSendBtn").disabled = working;
}

function addAssistantMessage(role, text, options = {}) {
  synchronizeAssistantSession();
  const message = {
    id: options.id || `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: role === "user" ? "user" : "assistant",
    text: String(text || ""),
    createdAt: Date.now(),
    mode: options.mode || (role === "user" ? "system" : "local"),
    contextKey: options.contextKey || assistantContextKey(),
    structured: options.structured || null,
    streaming: Boolean(options.streaming),
  };
  state.assistantSession.messages.push(message);
  state.assistantSession.messages = state.assistantSession.messages.slice(-ASSISTANT_MESSAGE_LIMIT);
  state.assistantMessages = state.assistantSession.messages;
  saveAssistantSession();
  renderDraftAssistant();
  return message;
}

function updateAssistantMessage(id, patch = {}) {
  synchronizeAssistantSession();
  const message = state.assistantSession.messages.find((item) => item.id === id);
  if (!message) return null;
  Object.assign(message, patch);
  state.assistantMessages = state.assistantSession.messages;
  renderDraftAssistant();
  return message;
}

function localAssistantStructured(question, reason = "") {
  const text = localAssistantResponse(question);
  const mentioned = mentionedPlayerFromQuestion(question);
  return {
    message: `Local analysis mode\n\n${text}`,
    stance: "insufficient_evidence",
    confidence: "low",
    evidence: [],
    counterargument: "The local fallback uses deterministic board rules but cannot hold a fully open-ended model conversation.",
    whatChangesTheCall: ["Reconnect the server-backed Draft Assistant for deeper conversational comparison."],
    referencedPlayerIds: mentioned ? [mentioned.id] : [],
    suggestedPrompts: ["Who should I pick right now?", "What are my biggest roster needs?", "Can I wait at this position?"],
    actions: mentioned ? [{ type: "view_player", playerId: mentioned.id, label: "View Player" }] : [],
    limitations: [reason || "The LLM endpoint was not used."],
    toolsUsed: [],
  };
}

function parseAssistantSseBlock(block) {
  let event = "message";
  const data = [];
  block.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trim());
  });
  if (!data.length) return null;
  try {
    return { event, data: JSON.parse(data.join("\n")) };
  } catch {
    return { event, data: { message: data.join("\n") } };
  }
}

async function assistantServerExchange(payload, onDelta = () => {}) {
  ASSISTANT_ACTIVE_ABORT = new AbortController();
  const timeout = window.setTimeout(() => ASSISTANT_ACTIVE_ABORT?.abort(), 35_000);
  try {
    const response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
      body: JSON.stringify({ ...payload, stream: true }),
      signal: ASSISTANT_ACTIVE_ABORT.signal,
      credentials: "same-origin",
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok && !contentType.includes("text/event-stream")) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error?.message || `Draft Assistant request failed (${response.status}).`);
    }
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data?.error) throw new Error(data.error.message || "Draft Assistant request failed.");
      return data;
    }
    if (!response.body) throw new Error("Streaming response is unavailable in this browser.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseAssistantSseBlock(block);
        if (!parsed) continue;
        if (parsed.event === "status") setAssistantStatus(parsed.data.status);
        if (parsed.event === "text_delta") onDelta(String(parsed.data.delta || ""));
        if (parsed.event === "tool_calls") result = parsed.data;
        if (parsed.event === "final") result = parsed.data;
        if (parsed.event === "error") throw new Error(parsed.data.message || "Draft Assistant request failed.");
      }
    }
    if (!result) throw new Error("Draft Assistant returned no usable result.");
    return result;
  } finally {
    window.clearTimeout(timeout);
    ASSISTANT_ACTIVE_ABORT = null;
  }
}

async function runAssistantConversation(question, options = {}) {
  synchronizeAssistantSession();
  const session = state.assistantSession;
  const trimmed = String(question || "").trim();
  if (!trimmed) return;
  session.lastUserMessage = trimmed;
  session.lastError = "";
  if (!options.reuseUserMessage) addAssistantMessage("user", trimmed, { mode: "system" });
  if ($("assistantInput")) $("assistantInput").value = "";

  const placeholder = addAssistantMessage("assistant", "", { mode: "llm", streaming: true, contextKey: assistantContextKey() });
  if (session.offlineMode) {
    const structured = localAssistantStructured(trimmed, "Offline Mode is selected.");
    updateAssistantMessage(placeholder.id, { text: structured.message, structured, mode: "local", streaming: false });
    session.suggestedPrompts = structured.suggestedPrompts;
    setAssistantStatus("offline");
    saveAssistantSession();
    return;
  }

  let mode = "message";
  let previousResponseId = session.previousResponseId;
  let toolOutputs = [];
  let toolRound = 0;
  let streamedText = "";
  try {
    while (toolRound <= ASSISTANT_MAX_TOOL_ROUNDS) {
      setAssistantStatus(toolRound ? "forming_answer" : "connecting");
      const result = await assistantServerExchange({
        mode,
        message: mode === "message" ? trimmed : undefined,
        previousResponseId,
        draftSessionId: assistantDraftSessionId(),
        contextSummary: assistantCompactContextSummary(),
        answerDetail: session.answerDetail,
        toolOutputs: mode === "tool_outputs" ? toolOutputs : undefined,
        toolRound,
      }, (delta) => {
        streamedText += delta;
        updateAssistantMessage(placeholder.id, { text: streamedText, streaming: true });
      });

      if (result.type === "tool_calls") {
        if (toolRound >= ASSISTANT_MAX_TOOL_ROUNDS) throw new Error("The assistant reached the maximum tool-call depth.");
        previousResponseId = result.responseId;
        toolOutputs = [];
        for (const call of result.toolCalls || []) {
          setAssistantStatus("running_tool", String(call.name || "analysis").replace(/_/g, " "));
          try {
            const output = await runDraftAssistantTool(call.name, call.arguments || {});
            toolOutputs.push({ callId: call.callId, output: assistantSafeClone(output) });
          } catch (error) {
            toolOutputs.push({ callId: call.callId, output: { unavailable: true, error: String(error?.message || "Tool failed."), confidence: "Unavailable", sampleSize: 0 } });
          }
        }
        mode = "tool_outputs";
        toolRound += 1;
        streamedText = "";
        updateAssistantMessage(placeholder.id, { text: "", streaming: true });
        continue;
      }

      if (result.type !== "final" || !result.result) throw new Error("The assistant returned an invalid final response.");
      const structured = assistantSafeClone(result.result);
      session.previousResponseId = result.responseId || previousResponseId || null;
      session.lastContextKey = assistantContextKey();
      session.suggestedPrompts = Array.isArray(structured.suggestedPrompts) ? structured.suggestedPrompts.slice(0, 6) : [];
      updateAssistantMessage(placeholder.id, { text: structured.message, structured, mode: "llm", streaming: false, contextKey: session.lastContextKey });
      setAssistantStatus("complete");
      saveAssistantSession();
      return;
    }
    throw new Error("The assistant reached the tool-call limit.");
  } catch (error) {
    const stopped = error?.name === "AbortError" || /stopped|abort/i.test(String(error?.message || ""));
    if (stopped) {
      updateAssistantMessage(placeholder.id, { text: "Generation stopped. No draft action was taken.", mode: "system", streaming: false });
      setAssistantStatus("stopped");
      return;
    }
    const reason = String(error?.message || "The model service was unavailable.");
    session.lastError = reason;
    const structured = localAssistantStructured(trimmed, reason);
    session.suggestedPrompts = structured.suggestedPrompts;
    updateAssistantMessage(placeholder.id, { text: structured.message, structured, mode: "local", streaming: false, contextKey: assistantContextKey() });
    setAssistantStatus("offline");
    if ($("assistantRetryBtn")) $("assistantRetryBtn").hidden = false;
    saveAssistantSession();
  }
}

function submitAssistantQuestion(question, options = {}) {
  return runAssistantConversation(question, options);
}

function stopAssistantGeneration() {
  if (ASSISTANT_ACTIVE_ABORT) ASSISTANT_ACTIVE_ABORT.abort();
}

function retryAssistantQuestion() {
  const message = state.assistantSession?.lastUserMessage;
  if (!message) return;
  if ($("assistantRetryBtn")) $("assistantRetryBtn").hidden = true;
  submitAssistantQuestion(message, { reuseUserMessage: true });
}

function handleDraftAssistantAction(type, playerId) {
  const player = playerId ? playerById(playerId) : null;
  if (type === "view_player" && player) {
    openPlayerDetail(player.id);
    return;
  }
  if (type === "compare_player" && player) {
    submitAssistantQuestion(`Compare ${player.name} with the best current alternative.`);
    return;
  }
  if (type === "flag_player" && player) {
    state.flaggedPlayerIds.add(player.id);
    saveFlaggedPlayers();
    renderAvailable();
    return;
  }
  if (type === "draft_player" && player) {
    const total = LEAGUE.teams * LEAGUE.rounds;
    const order = state.currentPick <= total ? draftOrderFor(state.currentPick) : null;
    const canDraft = !state.viewedDraftId && order && order.team === state.userTeam && !state.draftedIds.has(player.id);
    if (!canDraft) {
      state.assistantSession.lastError = "Draft action unavailable: it is not your active turn, the draft is read-only, or the player is gone.";
      setAssistantStatus("failed");
      renderDraftAssistant();
      return;
    }
    makeUserPickAndContinue(player);
  }
}

function renderSimulationOverlay() {
  const overlay = $("simulationOverlay");
  if (!overlay) return;
  const sim = state.draftSimulation;
  overlay.hidden = !sim.running;
  if (!sim.running) {
    overlay.innerHTML = "";
    return;
  }
  const rows = sim.picks.slice(-10).reverse().map((pick) => `
    <div class="simulation-pick-row">
      <span>${escapeHtml(pick.label)}</span>
      <strong>${escapeHtml(pick.player.name)}</strong>
      <em>${escapeHtml(teamName(pick.team))} - ${escapeHtml(pick.player.position)} ${escapeHtml(pick.player.team || "")}</em>
    </div>
  `).join("");
  overlay.innerHTML = `
    <div class="simulation-card">
      <div class="simulation-spinner" aria-hidden="true"></div>
      <div>
        <p class="eyebrow">Draft simulation</p>
        <h3>${escapeHtml(sim.title || "Simulating draft")}</h3>
        <p>${escapeHtml(sim.message || "Working through the board...")}</p>
      </div>
      <div class="simulation-pick-list">
        ${rows || `<p class="empty">Loading picks...</p>`}
      </div>
    </div>
  `;
}

function playerForDetail(playerId) {
  return playerById(playerId)
    || activePicks().find((pick) => pick.player.id === playerId)?.player
    || state.picks.find((pick) => pick.player.id === playerId)?.player
    || null;
}

function playerDetailNewsItems(player) {
  const items = [
    player.injuryNote ? { label: "Injury", text: player.injuryNote } : null,
    player.sourceSummary ? { label: player.sourceSummarySource || "Source summary", text: player.sourceSummary } : null,
    player.teamContext ? { label: "Team context", text: player.teamContext } : null,
    player.upsideNote ? { label: "Upside", text: player.upsideNote } : null,
    player.riskNote ? { label: "Risk", text: player.riskNote } : null,
  ].filter(Boolean);
  return items.length ? items : [{ label: "No imported news", text: "No recent-news feed has been imported for this player yet. Upload a rankings/news source with summary, injury, role, upside, or risk columns to populate this section." }];
}

function playerDepthChartRows(player) {
  return PLAYERS
    .filter((candidate) => candidate.team === player.team && candidate.position === player.position)
    .sort((a, b) => (a.depthChartRank || 99) - (b.depthChartRank || 99) || a.consensusRank - b.consensusRank)
    .slice(0, 6);
}

function playerScheduleRows(player) {
  const rows = [];
  if (Number.isFinite(player.bye)) {
    rows.push({ label: "Bye week", text: `Week ${player.bye}` });
  }
  if (Number.isFinite(player.adp)) {
    rows.push({ label: "Market range", text: `ADP ${player.adp.toFixed(1)}, typically a Round ${Math.max(1, Math.ceil(player.adp / LEAGUE.teams))} target in this league size.` });
  }
  const nextPick = nextPickForTeam(state.userTeam, state.currentPick);
  if (nextPick && !state.draftedIds.has(player.id)) {
    const survival = playerSurvivalEstimate(player, nextPick);
    const percentage = survival.confidence === "Low" ? "" : ` (${Math.round(survival.survivalProbability * 100)}%)`;
    rows.push({ label: "Draft room timing", text: `${survival.label}${percentage} through ${pickLabel(nextPick)}. ${survival.explanation}` });
  }
  if (!rows.length) {
    rows.push({ label: "Schedule", text: "No team schedule or bye-week import is available yet. Add a source with BYE or schedule columns to enrich this section." });
  }
  return rows;
}

function openPlayerDetail(playerId) {
  const player = playerForDetail(playerId);
  const modal = $("playerDetailModal");
  if (!player || !modal) return;
  const draftedPick = activePicks().find((pick) => pick.player.id === player.id);
  const isAvailable = !state.draftedIds.has(player.id);
  const targetTeam = isLiveDraftMode() && state.currentPick <= LEAGUE.teams * LEAGUE.rounds
    ? draftOrderFor(state.currentPick).team
    : state.userTeam;
  const newsRows = playerDetailNewsItems(player).map((item) => `
    <div class="player-detail-row">
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </div>
  `).join("");
  const depthRows = playerDepthChartRows(player).map((candidate) => `
    <div class="depth-chart-row ${candidate.id === player.id ? "active" : ""}">
      <span>${candidate.depthChartRank || "-"}</span>
      <strong>${escapeHtml(candidate.name)}</strong>
      <em>${escapeHtml(candidate.depthChartRole || `${candidate.position} depth`)}</em>
      <b>#${Math.round(candidate.consensusRank)}</b>
    </div>
  `).join("");
  const scheduleRows = playerScheduleRows(player).map((item) => `
    <div class="player-detail-row">
      <strong>${escapeHtml(item.label)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </div>
  `).join("");
  const canDraft = isAvailable && !state.viewedDraftId && state.currentPick <= LEAGUE.teams * LEAGUE.rounds && (isLiveDraftMode() || draftOrderFor(state.currentPick).team === state.userTeam);
  const projection = projectionProfileForPlayer(player);
  modal.hidden = false;
  modal.innerHTML = `
    <div class="player-detail-backdrop" data-close-player-detail></div>
    <section class="player-detail-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(player.name)} overview">
      <div class="player-detail-heading">
        <div>
          <p class="eyebrow">${escapeHtml(player.position)} ${escapeHtml(player.team || "")}</p>
          <h3>${escapeHtml(player.name)}</h3>
          <p>${escapeHtml(player.aiAnalysis || player.summary || "Ranking profile generated from current sources.")}</p>
        </div>
        <button type="button" data-close-player-detail aria-label="Close player details">Close</button>
      </div>
      <div class="player-detail-metrics">
        <div><strong>#${Math.round(player.consensusRank || 999)}</strong><span>Rank</span></div>
        <div><strong>${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "-"}</strong><span>ADP</span></div>
        <div><strong>${projection.weeklyValue.toFixed(1)}</strong><span>${escapeHtml(projection.label)}</span></div>
        <div><strong>${Number.isFinite(player.bye) ? player.bye : "-"}</strong><span>Bye</span></div>
      </div>
      <div class="player-detail-grid">
        <section>
          <h4>Overview</h4>
          <p>${escapeHtml(playerShortReason(player, Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds)))}</p>
          <p>${escapeHtml(fitLabelForPlayer(player, targetTeam, state.currentPick))}${draftedPick ? ` - Drafted at ${escapeHtml(draftedPick.label)} by ${escapeHtml(teamName(draftedPick.team))}.` : ""}</p>
          <p><b>${escapeHtml(projection.label)}:</b> ${projection.weeklyValue.toFixed(1)} points per week from ${escapeHtml(projection.source)}. Projection confidence: ${escapeHtml(projection.confidence)}.</p>
        </section>
        <section>
          <h4>Recent News</h4>
          ${newsRows}
        </section>
        <section>
          <h4>Depth Chart</h4>
          <div class="depth-chart-list">${depthRows || `<p class="empty">No same-team position group found.</p>`}</div>
        </section>
        <section>
          <h4>Schedule</h4>
          ${scheduleRows}
        </section>
      </div>
      <div class="player-detail-actions">
        ${canDraft ? `<button class="primary" type="button" data-draft="${player.id}">Draft ${escapeHtml(player.name)}</button>` : ""}
        <button type="button" data-close-player-detail>Close</button>
      </div>
    </section>
  `;
}

function closePlayerDetail() {
  const modal = $("playerDetailModal");
  if (!modal) return;
  modal.hidden = true;
  modal.innerHTML = "";
}

function startDraftSimulation(title, message) {
  state.draftSimulation = { running: true, title, message, picks: [] };
  renderSimulationOverlay();
  renderStatus();
}

function finishDraftSimulation(message = "") {
  state.draftSimulation = { ...state.draftSimulation, running: false, message };
  render();
  renderSimulationOverlay();
}

function recordSimulationPick(pick) {
  if (!pick || !state.draftSimulation.running) return;
  state.draftSimulation.picks = [...state.draftSimulation.picks, pick].slice(-24);
  renderSimulationOverlay();
}

function autoPlayerForSimulation(team, pickNumber) {
  if (team === state.userTeam) return recommendations(team, pickNumber, 1)[0] || null;
  return personaPick(team, pickNumber);
}

function runDraftSimulation({ title, message, userPick = null, untilNextUserPick = true, includeUserTurns = false } = {}) {
  if (state.draftSimulation.running || isLiveDraftMode()) return;
  startDraftSimulation(title, message);
  window.setTimeout(() => {
    if (userPick) recordSimulationPick(makePickSilent(userPick));
    const total = LEAGUE.teams * LEAGUE.rounds;
    const step = () => {
      skipLockedPicks();
      if (state.currentPick > total || (untilNextUserPick && draftOrderFor(state.currentPick).team === state.userTeam)) {
        finishDraftSimulation(state.currentPick > total ? "Draft complete." : "Back to your pick.");
        return;
      }
      const order = draftOrderFor(state.currentPick);
      const player = includeUserTurns ? autoPlayerForSimulation(order.team, state.currentPick) : personaPick(order.team, state.currentPick);
      if (!player) {
        finishDraftSimulation("Simulation stopped because no valid player was available.");
        return;
      }
      recordSimulationPick(makePickSilent(player));
      window.setTimeout(step, 18);
    };
    step();
  }, 40);
}

function seededWave(seed, ...parts) {
  const value = parts.reduce((sum, part, index) => sum + Number(part || 0) * (index + 1) * 37.719, seed || 1);
  return Math.sin(value * 12.9898) * 0.5 + Math.cos(value * 4.1414) * 0.5;
}

function makePickSilent(player) {
  if (!player) return null;
  skipLockedPicks();
  const order = draftOrderFor(state.currentPick);
  const pick = { pick: state.currentPick, ...order, player };
  state.picks.push(pick);
  state.draftedIds.add(player.id);
  state.currentPick += 1;
  skipLockedPicks();
  clearPositionalEdgeCache();
  return pick;
}

function bulkPersonaMix() {
  // Persona labels remain authoritative. Run-to-run variation now occurs inside
  // continuous behavior dimensions instead of randomly changing Persona IDs.
  return [...state.teamPersonas];
}

function bulkUserPickScore(player, team, pickNumber, strategy, runIndex) {
  const roster = rosterFor(team);
  const round = draftOrderFor(pickNumber).round;
  let score = recommendationScore(player, team, pickNumber, strategy);
  const wave = seededWave(state.mockSeed, runIndex, pickNumber, player.consensusRank, player.adp);
  score += wave * 9;

  if (strategy === "wrHeavy" && player.position === "WR" && round <= 7) score += 16;
  if (strategy === "weeklyEdge" && ["QB", "RB", "WR", "TE"].includes(player.position)) {
    const edge = positionalEdgeValue(player);
    const counts = positionCounts(roster);
    const hasStarter = (counts[player.position] || 0) >= (LEAGUE.roster[player.position] || 0);
    if (!hasStarter && (player.position === "QB" || player.position === "TE") && edge >= 1) score += Math.min(28, 6 + edge * 5);
    if (!hasStarter && (player.position === "RB" || player.position === "WR") && edge >= 2) score += Math.min(8, edge * 1.3);
    if ((player.position === "QB" || player.position === "TE") && hasStarter) score -= 18;
  }
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


function stableStringHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function candidateOutcomeModelKey() {
  const profile = activeLeagueProfile();
  const rankingRowsHash = stableStringHash(JSON.stringify(state.importedRankingRows.map((row) => [
    row.id, row.source, row.rank, row.adp, row.projection, row.projectionPeriod, row.position, row.team,
  ])));
  const behaviorRows = (profile?.sleeperImport?.scoutingReport?.teams || []).map((team) => [
    team.team, team.picksAnalyzed, team.personaId, team.reachProfile, team.positionCounts, team.roundPositionBias, team.firstThreeBuilds,
  ]);
  return JSON.stringify({
    version: APP_VERSION, pick: state.currentPick, drafted: state.picks.map((pick) => `${pick.pick}:${pick.player.id}`), league: activeLeague(),
    strategy: state.strategy, rankingWeights: state.rankingSourceWeights, rankingRowsHash, rankingSources: state.rankingSources,
    seedRankingsEnabled: state.seedRankingsEnabled, personas: state.teamPersonas, behaviorHash: stableStringHash(JSON.stringify(behaviorRows)),
  });
}

function validOutcomeCandidate(player, team, pickNumber) {
  const roster = rosterFor(team), counts = positionCounts(roster), round = draftOrderFor(pickNumber).round;
  if (["K", "DEF"].includes(player.position) && round < Math.max(12, LEAGUE.rounds - 2)) return false;
  if (player.position === "QB" && (counts.QB || 0) >= (LEAGUE.roster.QB || 0) + 1 && round <= 11) return false;
  if (player.position === "TE" && (counts.TE || 0) >= (LEAGUE.roster.TE || 0) + 1 && round <= 11) return false;
  return true;
}

function candidateOutcomePool(team = state.userTeam, pickNumber = state.currentPick) {
  return candidatePoolForTeam(team, pickNumber, 30)
    .filter((player) => validOutcomeCandidate(player, team, pickNumber))
    .map((player) => ({ player, score: recommendationScore(player, team, pickNumber) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.player);
}

function snapshotCandidateDraftState() {
  return { picks: state.picks, draftedIds: state.draftedIds, currentPick: state.currentPick, strategy: state.strategy, mockSeed: state.mockSeed,
    teamPersonas: state.teamPersonas, viewedDraftId: state.viewedDraftId };
}

function optimizedUserOutcomePick(team, pickNumber) {
  const roster = rosterFor(team), before = lineupProjection(roster);
  return candidatePoolForTeam(team, pickNumber, 18)
    .filter((player) => validOutcomeCandidate(player, team, pickNumber))
    .map((player) => ({ player, score: recommendationScore(player, team, pickNumber, "balanced") + (lineupProjection([...roster, player]) - before) * 24 }))
    .sort((a, b) => b.score - a.score)[0]?.player || availablePlayers()[0] || null;
}

function fastOpponentOutcomePick(team, pickNumber, seed) {
  return marketOpponentPick(team, pickNumber, seed, pickNumber);
}

function simulateCandidateTrial(candidate, trialIndex, modelKey, seasonCount = 28) {
  const snapshot = snapshotCandidateDraftState();
  const seed = stableStringHash(`${modelKey}|${candidate.id}|${trialIndex}`);
  const initialPick = state.currentPick;
  let nextRoundOptions = [];
  try {
    state.picks = state.picks.map((pick) => ({ ...pick }));
    state.draftedIds = new Set(state.draftedIds);
    state.teamPersonas = [...state.teamPersonas];
    state.mockSeed = seed / 1000;
    state.viewedDraftId = null;
    makePickSilent(candidate);
    const total = LEAGUE.teams * LEAGUE.rounds;
    while (state.currentPick <= total) {
      const order = draftOrderFor(state.currentPick);
      if (order.team === state.userTeam && state.currentPick > initialPick && !nextRoundOptions.length) {
        nextRoundOptions = candidatePoolForTeam(order.team, state.currentPick, 18)
          .filter((player) => validOutcomeCandidate(player, order.team, state.currentPick))
          .slice(0, 10)
          .map((player) => ({ id: player.id, name: player.name, position: player.position, tier: player.tier, labRank: player.consensusRank, adp: player.adp }));
      }
      const player = order.team === state.userTeam
        ? optimizedUserOutcomePick(order.team, state.currentPick)
        : fastOpponentOutcomePick(order.team, state.currentPick, seed + trialIndex * 97);
      if (!player) break;
      makePickSilent(player);
    }
    if (state.picks.length < total) throw new Error("Draft simulation did not complete every roster.");
    const analyses = rankTeamAnalysisRows(Array.from({ length: LEAGUE.teams }, (_, index) => outcomeEvaluationModel(index + 1, state.picks)), LEAGUE);
    const seasonRows = simulatedSeasonAwards(analyses, state.picks, seasonCount, seed + 991);
    const userAnalysis = analyses.find((row) => row.team === state.userTeam);
    const userOutcome = seasonRows.find((row) => row.team === state.userTeam);
    return {
      playoffRate: userOutcome?.playoffRate || 0,
      roomFinish: userOutcome?.averageFinish || userAnalysis?.rank || LEAGUE.teams,
      draftRank: userAnalysis?.rank || LEAGUE.teams,
      firstPlaceDraft: userAnalysis?.rank === 1 ? 1 : 0,
      topThreeDraft: (userAnalysis?.rank || LEAGUE.teams) <= 3 ? 1 : 0,
      topThreeRate: userOutcome?.topThreeRate || 0,
      championshipRate: userOutcome?.championshipRate || 0,
      starterProjection: userAnalysis?.weeklyProjection || 0,
      rosterScore: userAnalysis?.score || 0,
      downsideRate: userOutcome?.lastPlaceRate || 0,
      positionComposition: positionCounts(userAnalysis?.roster || []),
      nextRoundOptions,
      seasonCount,
    };
  } finally {
    state.picks = snapshot.picks;
    state.draftedIds = snapshot.draftedIds;
    state.currentPick = snapshot.currentPick;
    state.strategy = snapshot.strategy;
    state.mockSeed = snapshot.mockSeed;
    state.teamPersonas = snapshot.teamPersonas;
    state.viewedDraftId = snapshot.viewedDraftId;
    clearPositionalEdgeCache();
  }
}

function aggregateCandidateOutcome(candidate, trials) {
  const avg = (key) => average(trials.map((row) => Number(row[key])).filter(Number.isFinite));
  const playoffRates = trials.map((row) => row.playoffRate);
  const medianRosterOutcome = percentile(playoffRates, 0.5);
  const p25 = percentile(playoffRates, 0.25), p75 = percentile(playoffRates, 0.75), downside = percentile(playoffRates, 0.10);
  const stability = standardDeviation(playoffRates);
  const starterImpact = lineupProjection([...rosterFor(state.userTeam), candidate]) - lineupProjection(rosterFor(state.userTeam));
  const base = { simulationCount: trials.length, stability };
  const confidence = rankingConfidenceAnalysis(candidate, base);
  const nextOptionCounts = new Map();
  trials.forEach((trial) => (trial.nextRoundOptions || []).slice(0, 6).forEach((player) => {
    const key = `${player.id}|${player.name}|${player.position}|${player.tier || ""}`;
    nextOptionCounts.set(key, (nextOptionCounts.get(key) || 0) + 1);
  }));
  const expectedNextRoundOptions = [...nextOptionCounts.entries()].map(([key, count]) => {
    const [id, name, position, tier] = key.split("|");
    return { id, name, position, tier: tier || null, rate: count / Math.max(1, trials.length), count };
  }).sort((a, b) => b.rate - a.rate).slice(0, 6);
  const priority = currentDraftPlanPriority(candidate.id);
  const risk = candidate.riskNote || candidate.injuryNote || (stability > 0.12 ? "Outcome range was volatile across room variations." : "No single material risk dominated the rollouts.");
  return {
    playerId: candidate.id,
    player: candidate,
    estimatedPlayoffRate: avg("playoffRate"),
    medianRosterOutcome,
    outcomeP25: p25,
    outcomeP75: p75,
    downsideOutcome: downside,
    averageRoomFinish: avg("roomFinish"),
    firstPlaceDraftRate: avg("firstPlaceDraft"),
    topThreeDraftRate: avg("topThreeDraft"),
    topThreeRate: avg("topThreeRate"),
    championshipRate: avg("championshipRate"),
    averageStarterProjection: avg("starterProjection"),
    averageRosterScore: avg("rosterScore"),
    downsideRate: avg("downsideRate"),
    starterImpact,
    simulationCount: trials.length,
    rollouts: trials.length,
    stability,
    stabilityLabel: strategyStabilityLabel((p75 - p25), stability),
    confidence: confidence.label,
    confidenceReason: confidence.label === "Low" ? confidence.confidenceReason : "",
    survival: playerSurvivalEstimate(candidate),
    positionComposition: trials[0]?.positionComposition || {},
    expectedNextRoundOptions,
    opportunityCost: Math.max(0, Number(candidate.adp || candidate.consensusRank) - state.currentPick),
    replacementValueAfterPassing: playerReplacementCost(candidate),
    strategyCompatibility: priority?.strategyPathValue ?? clampNumber((-strategyScore(candidate, rosterFor(state.userTeam), state.currentPick, state.bulk.results?.summary?.bestStrategy?.id || state.strategy) + 18) / 36, 0, 1),
    mainRisk: risk,
  };
}

function startCandidateOutcomeRecommendations() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  const order = state.currentPick <= total ? draftOrderFor(state.currentPick) : null;
  if (state.viewedDraftId || state.currentPick > total || !order || order.team !== state.userTeam) return;
  const modelKey = candidateOutcomeModelKey();
  if (state.candidateOutcome.key === modelKey && ["calculating", "ready", "fallback"].includes(state.candidateOutcome.status)) return;
  if (CANDIDATE_OUTCOME_CACHE.has(modelKey)) { state.candidateOutcome = { status: "ready", key: modelKey, results: CANDIDATE_OUTCOME_CACHE.get(modelKey), error: "" }; return; }
  const candidates = candidateOutcomePool();
  if (candidates.length < 2) { state.candidateOutcome = { status: "fallback", key: modelKey, results: [], error: "Insufficient candidate data." }; return; }
  state.candidateOutcome = { status: "calculating", key: modelKey, results: [], error: "", progress: 0, total: candidates.length * 4 };
  const trialsByCandidate = new Map(candidates.map((candidate) => [candidate.id, []]));
  const queue = candidates.flatMap((candidate) => Array.from({ length: 4 }, (_, trial) => ({ candidate, trial })));
  let queueIndex = 0;
  const runTrial = () => {
    if (candidateOutcomeModelKey() !== modelKey) return;
    try {
      const item = queue[queueIndex];
      trialsByCandidate.get(item.candidate.id).push(simulateCandidateTrial(item.candidate, item.trial, modelKey));
      queueIndex += 1;
      state.candidateOutcome.progress = queueIndex;
      const progressElement = $("candidateProgress");
      if (progressElement) progressElement.textContent = `${queueIndex}/${queue.length} trials`;
      if (queueIndex < queue.length) { window.setTimeout(runTrial, 0); return; }
      const completed = candidates.map((candidate) => aggregateCandidateOutcome(candidate, trialsByCandidate.get(candidate.id)))
        .sort((a, b) => b.estimatedPlayoffRate - a.estimatedPlayoffRate || a.averageRoomFinish - b.averageRoomFinish || b.starterImpact - a.starterImpact || a.downsideRate - b.downsideRate || a.survival.survivalProbability - b.survival.survivalProbability);
      CANDIDATE_OUTCOME_CACHE.set(modelKey, completed);
      state.candidateOutcome = { status: "ready", key: modelKey, results: completed, error: "", progress: queue.length, total: queue.length };
      renderRecommendations(); renderAvailable();
    } catch (error) {
      state.candidateOutcome = { status: "fallback", key: modelKey, results: [], error: error?.message || "Outcome simulation failed." };
      renderRecommendations(); renderAvailable();
    }
  };
  window.setTimeout(runTrial, 0);
}

function currentOutcomeResults() {
  return state.candidateOutcome.status === "ready" && state.candidateOutcome.key === candidateOutcomeModelKey() ? state.candidateOutcome.results : [];
}

function bulkCounterfactualModelKey() {
  return `${candidateOutcomeModelKey()}|bulk-pick-lab|${state.bulk.depth}|${state.bulk.results?.summary?.createdAt || "no-batch"}`;
}

function startBulkCounterfactualAnalysis() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  const order = state.currentPick <= total ? draftOrderFor(state.currentPick) : null;
  if (!order || order.team !== state.userTeam || state.currentPick > total || state.viewedDraftId) {
    state.bulk.counterfactual = { status: "unavailable", key: "", results: [], error: state.viewedDraftId ? "Saved drafts are read-only." : "Counterfactual analysis requires an active user pick.", progress: 0, total: 0 };
    renderBulkSimulator();
    return;
  }
  const key = bulkCounterfactualModelKey();
  if (COUNTERFACTUAL_PICK_CACHE.has(key)) {
    state.bulk.counterfactual = { status: "ready", key, results: COUNTERFACTUAL_PICK_CACHE.get(key), error: "", progress: 0, total: 0 };
    saveSimulatorState();
    renderBulkSimulator();
    return;
  }
  const candidates = candidateOutcomePool().slice(0, 8);
  if (candidates.length < 2) {
    state.bulk.counterfactual = { status: "unavailable", key, results: [], error: "No reasonable counterfactual candidates are available.", progress: 0, total: 0 };
    renderBulkSimulator();
    return;
  }
  const rolloutCount = state.bulk.depth === "deep" ? 12 : state.bulk.depth === "quick" ? 4 : 8;
  const seasonCount = state.bulk.depth === "deep" ? 48 : state.bulk.depth === "quick" ? 20 : 32;
  const trialsByCandidate = new Map(candidates.map((candidate) => [candidate.id, []]));
  const queue = candidates.flatMap((candidate) => Array.from({ length: rolloutCount }, (_, trial) => ({ candidate, trial })));
  state.bulk.counterfactual = { status: "calculating", key, results: [], error: "", progress: 0, total: queue.length };
  renderBulkSimulator();
  let index = 0;
  const step = () => {
    if (bulkCounterfactualModelKey() !== key) {
      state.bulk.counterfactual = { status: "stale", key, results: [], error: "Draft inputs changed before the Pick Lab completed.", progress: index, total: queue.length };
      renderBulkSimulator();
      return;
    }
    try {
      const item = queue[index];
      trialsByCandidate.get(item.candidate.id).push(simulateCandidateTrial(item.candidate, item.trial, key, seasonCount));
      index += 1;
      state.bulk.counterfactual.progress = index;
      const progress = $("counterfactualProgress");
      if (progress) progress.textContent = `${index}/${queue.length} rollouts`;
      if (index < queue.length) {
        window.setTimeout(step, 0);
        return;
      }
      const results = candidates.map((candidate) => aggregateCandidateOutcome(candidate, trialsByCandidate.get(candidate.id)))
        .sort((a, b) => b.medianRosterOutcome - a.medianRosterOutcome || b.downsideOutcome - a.downsideOutcome || b.estimatedPlayoffRate - a.estimatedPlayoffRate || a.averageRoomFinish - b.averageRoomFinish);
      COUNTERFACTUAL_PICK_CACHE.set(key, results);
      state.bulk.counterfactual = { status: "ready", key, results, error: "", progress: queue.length, total: queue.length };
      state.candidateOutcome = { status: "ready", key: candidateOutcomeModelKey(), results, error: "", progress: queue.length, total: queue.length };
      saveSimulatorState();
      render();
    } catch (error) {
      state.bulk.counterfactual = { status: "failed", key, results: [], error: error?.message || "Counterfactual analysis failed. The real draft state was restored.", progress: index, total: queue.length };
      renderBulkSimulator();
    }
  };
  window.setTimeout(step, 0);
}

function restoreSimulationState(snapshot) {
  state.picks = snapshot.picks;
  state.draftedIds = snapshot.draftedIds;
  state.currentPick = snapshot.currentPick;
  state.strategy = snapshot.strategy;
  state.mockSeed = snapshot.mockSeed;
  state.teamPersonas = snapshot.teamPersonas;
  state.viewedDraftId = snapshot.viewedDraftId;
  clearPositionalEdgeCache();
}

function bulkSimulationModelKey() {
  const report = scoutingReport();
  return JSON.stringify({
    version: APP_VERSION,
    schema: SIMULATOR_SCHEMA_VERSION,
    league: activeLeague(),
    userTeam: state.userTeam,
    rankings: stableStringHash(JSON.stringify(PLAYERS.slice(0, 240).map((player) => [player.id, player.consensusRank, player.adp, player.tier, player.weightedProjection]))),
    rankingWeights: state.rankingSourceWeights,
    strategy: state.bulk.strategy,
    mode: state.bulk.mode,
    depth: state.bulk.depth,
    count: state.bulk.count,
    randomizeRoom: state.bulk.randomizeRoom,
    historicalAdpVersion: HISTORICAL_ADP_DATA_VERSION,
    engineVersion: SIMULATOR_ENGINE_VERSION,
    personas: state.teamPersonas,
    personaSources: state.personaSources,
    keepers: state.keeperSelections,
    order: state.roundOrders,
    behavior: stableStringHash(JSON.stringify(report?.teams?.map((team) => [team.team, team.picksAnalyzed, team.avgReach, team.runChaseRate, team.runStartRate]))),
  });
}

function bulkHardwareProfile() {
  const cores = Math.max(1, Number(navigator.hardwareConcurrency) || 4);
  const memory = Math.max(0, Number(navigator.deviceMemory) || 0);
  const localFile = window.location.protocol === "file:";
  const constrained = localFile || cores <= 4 || (memory > 0 && memory <= 4);
  const highCapacity = !localFile && cores >= 8 && (memory === 0 || memory >= 8);
  return {
    cores,
    memory,
    localFile,
    constrained,
    maxScheduledRuns: constrained ? 225 : highCapacity ? 720 : 450,
    label: constrained ? "constrained device" : highCapacity ? "high-capacity device" : "standard device",
  };
}

function bulkSafeCountLimit(mode = state.bulk.mode) {
  const profile = bulkHardwareProfile();
  return mode === "compare"
    ? Math.max(1, Math.floor(profile.maxScheduledRuns / BULK_STRATEGIES.length))
    : Math.max(BULK_SINGLE_DEFAULT, Math.min(500, profile.maxScheduledRuns));
}

function bulkAvailabilitySampleSize() {
  if (state.bulk.depth === "quick") return 12;
  if (state.bulk.depth === "deep") return 20;
  return 16;
}

function bulkSeasonSimulationCount() {
  const cores = Math.max(1, Number(navigator.hardwareConcurrency) || 4);
  if (state.bulk.depth === "deep") return cores <= 4 ? 10 : 12;
  if (state.bulk.depth === "quick") return 4;
  return cores <= 4 ? 6 : 8;
}

function disableBulkSeasonWorker(reason = "Season worker unavailable") {
  BULK_SEASON_WORKER_DISABLED_REASON = reason;
  BULK_SEASON_WORKER_REQUESTS.forEach((pending) => pending.reject(new Error(reason)));
  BULK_SEASON_WORKER_REQUESTS.clear();
  BULK_SEASON_WORKER?.terminate();
  BULK_SEASON_WORKER = null;
}

function bulkSeasonWorkerLabel() {
  if (window.location.protocol === "file:") return "local main-thread season fallback";
  if (BULK_SEASON_WORKER_DISABLED_REASON) return "main-thread season fallback";
  if (typeof Worker === "undefined") return "main-thread season fallback";
  return "background season worker";
}

function seasonSimulationWorker() {
  if (BULK_SEASON_WORKER) return BULK_SEASON_WORKER;
  if (BULK_SEASON_WORKER_DISABLED_REASON || typeof Worker === "undefined" || window.location.protocol === "file:") return null;
  try {
    BULK_SEASON_WORKER = new Worker("./simulation-worker.js?v=123");
    BULK_SEASON_WORKER.addEventListener("message", (event) => {
      const response = event.data || {};
      const pending = BULK_SEASON_WORKER_REQUESTS.get(response.requestId);
      if (!pending) return;
      BULK_SEASON_WORKER_REQUESTS.delete(response.requestId);
      if (response.type === "SIMULATE_SEASONS_RESULT") pending.resolve(Array.isArray(response.rows) ? response.rows : []);
      else pending.reject(new Error(response.error || "Season simulation worker failed."));
    });
    BULK_SEASON_WORKER.addEventListener("error", () => disableBulkSeasonWorker("Season simulation worker failed to load."));
    return BULK_SEASON_WORKER;
  } catch {
    disableBulkSeasonWorker("Season simulation worker could not start.");
    return null;
  }
}

function runSeasonSimulationForBulk(analyses, seasonCount, seed) {
  const worker = seasonSimulationWorker();
  if (!worker) return Promise.resolve(simulatedSeasonAwards(analyses, [], seasonCount, seed));
  const requestId = `bulk-season-${Date.now()}-${BULK_SEASON_WORKER_SEQUENCE += 1}`;
  return new Promise((resolve) => {
    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      resolve(simulatedSeasonAwards(analyses, [], seasonCount, seed));
    };
    const timeout = window.setTimeout(() => {
      if (!BULK_SEASON_WORKER_REQUESTS.has(requestId)) return;
      BULK_SEASON_WORKER_REQUESTS.delete(requestId);
      disableBulkSeasonWorker("Season simulation worker timed out and was disabled for this session.");
      fallback();
    }, BULK_WORKER_TIMEOUT_MS);
    BULK_SEASON_WORKER_REQUESTS.set(requestId, {
      resolve: (rows) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(rows);
      },
      reject: () => {
        window.clearTimeout(timeout);
        fallback();
      },
    });
    try {
      worker.postMessage({
        type: "SIMULATE_SEASONS",
        requestId,
        analyses: analyses.map((row) => ({
          team: row.team,
          weeklyProjection: row.weeklyProjection,
          value: row.value,
          balance: row.balance,
        })),
        league: { teams: LEAGUE.teams, playoffTeams: LEAGUE.playoffTeams },
        seasonCount,
        seed,
      });
    } catch {
      BULK_SEASON_WORKER_REQUESTS.delete(requestId);
      window.clearTimeout(timeout);
      disableBulkSeasonWorker("Season simulation worker messaging failed.");
      fallback();
    }
  });
}

function draftDecisionModelScore(player, team, pickNumber, strategy, runIndex) {
  return bulkUserPickScore(player, team, pickNumber, strategy, runIndex);
}

function simulateBulkDraft(strategy, runIndex, modelKey = bulkSimulationModelKey()) {
  const snapshot = {
    picks: state.picks,
    draftedIds: state.draftedIds,
    currentPick: state.currentPick,
    strategy: state.strategy,
    mockSeed: state.mockSeed,
    teamPersonas: state.teamPersonas,
    viewedDraftId: state.viewedDraftId,
  };
  const seedValue = stableStringHash(`${modelKey}|${strategy}|${runIndex}`);
  const userPickSnapshots = [];
  const behaviorProfiles = [];

  try {
    clearPositionalEdgeCache();
    state.viewedDraftId = null;
    state.strategy = strategy;
    state.mockSeed = seedValue / 1000;
    state.teamPersonas = bulkPersonaMix();
    state.picks = buildKeeperPicks();
    state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
    state.currentPick = 1;
    skipLockedPicks();
    for (let team = 1; team <= LEAGUE.teams; team += 1) {
      if (team !== state.userTeam) behaviorProfiles.push(managerBehaviorProfile(team, seedValue, runIndex));
    }

    const total = LEAGUE.teams * LEAGUE.rounds;
    while (state.currentPick <= total) {
      const order = draftOrderFor(state.currentPick);
      if (order.team === state.userTeam) {
        const topAvailable = availablePlayers().slice(0, bulkAvailabilitySampleSize());
        const availableSnapshot = topAvailable.map((player) => ({
          id: player.id,
          name: player.name,
          position: player.position,
          rank: player.consensusRank,
          adp: player.adp,
          tier: player.tier,
          projection: projectionForPlayer(player),
        }));
        const tierCounts = topAvailable.reduce((counts, player) => {
          const key = `${player.position}-${player.tier || "unknown"}`;
          counts[key] = (counts[key] || 0) + 1;
          return counts;
        }, {});
        const player = bulkUserPick(strategy, runIndex);
        if (!player) break;
        userPickSnapshots.push({
          pick: state.currentPick,
          round: order.round,
          label: order.label,
          available: availableSnapshot,
          tierCounts,
          player: compactPlayerReference(player),
        });
        makePickSilent(player);
      } else {
        const player = marketOpponentPick(order.team, state.currentPick, seedValue, runIndex);
        if (!player) break;
        makePickSilent(player);
      }
    }

    if (state.picks.length < total) throw new Error("Simulation could not complete every roster.");
    const ranked = rankTeamAnalysisRows(
      Array.from({ length: LEAGUE.teams }, (_, index) => outcomeEvaluationModel(index + 1, state.picks)),
      LEAGUE
    );
    const seasonCount = bulkSeasonSimulationCount();
    const rankedUserAnalysis = ranked.find((analysis) => analysis.team === state.userTeam) || outcomeEvaluationModel(state.userTeam, state.picks);
    const detailedUserAnalysis = analyzeTeam(state.userTeam, state.picks);
    const userPicks = state.picks.filter((pick) => pick.team === state.userTeam).sort((a, b) => a.pick - b.pick);
    const firstFive = userPicks.slice(0, 5);
    const playoffRate = 0;
    const topThreeRate = 0;
    const championshipRate = 0;
    const lastPlaceRate = 0;
    return {
      id: `bulk-${seedValue}-${runIndex}`,
      runIndex: runIndex + 1,
      seed: seedValue,
      strategy,
      strategyLabel: BULK_STRATEGIES.find((item) => item.id === strategy)?.label || strategy,
      rank: rankedUserAnalysis.rank || ranked.findIndex((analysis) => analysis.team === state.userTeam) + 1,
      averageRoomFinish: rankedUserAnalysis.averageFinish || rankedUserAnalysis.rank || LEAGUE.teams,
      grade: gradeFromRank(rankedUserAnalysis.rank || 12),
      relativeStrength: rankedUserAnalysis.relativeStrength || 0,
      playoffRate,
      playoffOdds: Math.round(playoffRate * 100),
      topThreeRate,
      championshipRate,
      lastPlaceRate,
      seasonSimulationCount: 0,
      seasonSimulationTarget: seasonCount,
      weeklyProjection: rankedUserAnalysis.weeklyProjection,
      benchDepth: rankedUserAnalysis.benchDepth,
      replacementValue: rankedUserAnalysis.replacementValue,
      riskConcentration: rankedUserAnalysis.riskConcentration,
      score: rankedUserAnalysis.score,
      value: rankedUserAnalysis.value,
      balance: rankedUserAnalysis.balance,
      firstFiveBuild: firstFive.map((pick) => pick.player.position).join("-") || "None",
      openingBuild: firstFive.slice(0, 3).map((pick) => pick.player.position).join("-") || "None",
      firstFivePlayers: firstFive.map((pick) => `${pick.player.name} (${pick.player.position})`),
      pickTrace: bulkPickTrace(state.picks),
      userPicks: userPicks.map(compactPick),
      userRoster: detailedUserAnalysis.roster.map(compactSimulationPlayer),
      positionComposition: positionCounts(detailedUserAnalysis.roster),
      strengths: detailedUserAnalysis.strengths,
      weaknesses: detailedUserAnalysis.weaknesses,
      pickBreakdown: detailedUserAnalysis.pickBreakdown.slice(0, 8).map((pick) => ({
        pick: pick.pick,
        label: pick.label,
        player: compactPlayerReference(pick.player),
        pickValue: pick.pickValue,
        alternatives: pick.alternatives.slice(0, 3).map(compactPlayerReference),
      })),
      availability: userPickSnapshots,
      behaviorProfiles: behaviorProfiles.map((profile) => ({
        team: profile.team,
        personaId: profile.personaId,
        personaSource: profile.personaSource,
        historicalSample: profile.historicalSample,
        confidence: profile.confidence,
        volatility: profile.volatility,
        adpDiscipline: profile.adpDiscipline,
        runChasing: profile.runChasing,
      })),
      _seasonSimulationInput: {
        analyses: ranked.map((row) => ({
          team: row.team,
          weeklyProjection: row.weeklyProjection,
          value: row.value,
          balance: row.balance,
        })),
        seed: seedValue + 991,
        userTeam: state.userTeam,
      },
    };
  } finally {
    restoreSimulationState(snapshot);
  }
}

async function enrichBulkRunWithSeasonSimulation(run) {
  const input = run?._seasonSimulationInput;
  if (!input?.analyses?.length || !run.seasonSimulationTarget) {
    if (run) delete run._seasonSimulationInput;
    return run;
  }
  const rows = await runSeasonSimulationForBulk(input.analyses, run.seasonSimulationTarget, input.seed);
  const userRow = rows.find((row) => row.team === input.userTeam);
  if (userRow) {
    run.playoffRate = Number(userRow.playoffRate || 0);
    run.playoffOdds = Math.round(run.playoffRate * 100);
    run.topThreeRate = Number(userRow.topThreeRate || 0);
    run.championshipRate = Number(userRow.championshipRate || 0);
    run.lastPlaceRate = Number(userRow.lastPlaceRate || 0);
    run.averageRoomFinish = Number(userRow.averageFinish || run.averageRoomFinish || run.rank || LEAGUE.teams);
    run.seasonSimulationCount = Number(userRow.simulationCount || run.seasonSimulationTarget || 0);
  }
  delete run._seasonSimulationInput;
  return run;
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
}

function percentile(values, percentileValue) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index), upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function standardDeviation(values) {
  const numeric = values.filter(Number.isFinite);
  if (!numeric.length) return 0;
  const mean = average(numeric);
  return Math.sqrt(average(numeric.map((value) => (value - mean) ** 2)));
}

function runOutcomeValue(run) {
  if (Number.isFinite(run.playoffRate) && Number(run.seasonSimulationCount || 0) > 0) return run.playoffRate * 100;
  return Number(run.relativeStrength || 0);
}

function projectionCoverageForRuns(runs) {
  const players = runs.flatMap((run) => run.userRoster || []);
  if (!players.length) return 0;
  return players.filter((player) => player.projectionType === "imported" || projectionProfileForPlayer(playerById(player.id) || player).projectionType === "imported").length / players.length;
}

function strategyStabilityLabel(iqr, stdDev) {
  if (iqr <= 5 && stdDev <= 5) return "Stable";
  if (iqr <= 10 && stdDev <= 9) return "Moderate variance";
  return "High variance";
}

function summarizeRunGroup(runs, label, id = "") {
  const outcomeValues = runs.map(runOutcomeValue);
  const scoreValues = runs.map((run) => Number(run.score || 0));
  const sortedByOutcome = [...runs].sort((a, b) => runOutcomeValue(b) - runOutcomeValue(a) || b.score - a.score);
  const medianOutcome = percentile(outcomeValues, 0.5);
  const p25 = percentile(outcomeValues, 0.25), p75 = percentile(outcomeValues, 0.75), downside = percentile(outcomeValues, 0.10);
  const iqr = p75 - p25, stdDev = standardDeviation(outcomeValues);
  const medianRun = [...runs].sort((a, b) => Math.abs(runOutcomeValue(a) - medianOutcome) - Math.abs(runOutcomeValue(b) - medianOutcome))[0] || null;
  return {
    id,
    label,
    runs,
    count: runs.length,
    meanOutcome: average(outcomeValues),
    medianOutcome,
    p25,
    p75,
    downside,
    bestOutcome: Math.max(0, ...outcomeValues),
    worstOutcome: outcomeValues.length ? Math.min(...outcomeValues) : 0,
    outcomeSpread: iqr,
    standardDeviation: stdDev,
    stability: strategyStabilityLabel(iqr, stdDev),
    avgProjection: average(runs.map((run) => run.weeklyProjection)),
    avgScore: average(scoreValues),
    medianScore: percentile(scoreValues, 0.5),
    avgPlayoffOdds: average(runs.map((run) => Number(run.playoffRate || 0))) * 100,
    actualPlayoffRate: average(runs.map((run) => Number(run.playoffRate || 0))),
    championshipRate: average(runs.map((run) => Number(run.championshipRate || 0))),
    avgRank: average(runs.map((run) => Number(run.averageRoomFinish || run.rank || LEAGUE.teams))),
    firstPlaceRate: runs.length ? runs.filter((run) => run.rank === 1).length / runs.length : 0,
    winRate: runs.length ? runs.filter((run) => run.rank === 1).length / runs.length : 0,
    top3Rate: runs.length ? runs.filter((run) => run.rank <= 3).length / runs.length : 0,
    top6Rate: runs.length ? runs.filter((run) => run.rank <= Math.ceil(LEAGUE.teams / 2)).length / runs.length : 0,
    projectionCoverage: projectionCoverageForRuns(runs),
    best: sortedByOutcome[0] || null,
    median: medianRun,
    downsideExample: [...runs].sort((a, b) => Math.abs(runOutcomeValue(a) - downside) - Math.abs(runOutcomeValue(b) - downside))[0] || null,
    worst: sortedByOutcome[sortedByOutcome.length - 1] || null,
  };
}

function strategyComparisonAssessment(groups) {
  const leader = groups[0], second = groups[1];
  if (!leader) return { label: "Insufficient sample", detail: "No completed strategy simulations are available.", gap: 0, tied: false };
  if (!second || leader.count < 5) return { label: "Insufficient sample", detail: "Run at least five simulations per strategy before treating the result as directional.", gap: 0, tied: false };
  const gap = leader.medianOutcome - second.medianOutcome;
  const overlap = Math.min(leader.p75, second.p75) - Math.max(leader.p25, second.p25);
  const tied = Math.abs(gap) < 1.5 && overlap >= 0;
  if (tied) return {
    label: "Strategies are effectively tied",
    detail: `${leader.label} and ${second.label} produced overlapping outcome ranges. ${leader.downside >= second.downside ? leader.label : second.label} had the stronger downside result, while ${leader.firstPlaceRate >= second.firstPlaceRate ? leader.label : second.label} produced more first-place drafts.`,
    gap,
    tied: true,
  };
  if (leader.count < 10 || second.count < 10) return { label: "Insufficient sample", detail: "The current ordering is provisional because the strategy samples are small.", gap, tied: false };
  if (gap >= 4 && overlap < 0) return { label: "Clear modeled leader", detail: `${leader.label} led the median outcome by ${gap.toFixed(1)} points with little interquartile overlap.`, gap, tied: false };
  if (gap >= 1.5) return { label: "Slight modeled advantage", detail: `${leader.label} led by ${gap.toFixed(1)} points, but the outcome ranges still overlap.`, gap, tied: false };
  return { label: "Close decision", detail: `The top strategies are separated by only ${Math.abs(gap).toFixed(1)} points and should be treated as interchangeable paths.`, gap, tied: true };
}

function simulationConclusionConfidence(groups, comparison, runs) {
  const leader = groups[0];
  if (!leader || leader.count < 5) return { label: "Insufficient evidence", reason: "Fewer than five completed runs per leading strategy." };
  const behaviorSamples = Array.from({ length: LEAGUE.teams }, (_, index) => scoutingProfileForTeam(index + 1)?.picksAnalyzed || 0).filter((_, index) => index + 1 !== state.userTeam);
  const behaviorCoverage = behaviorSamples.filter((sample) => sample >= 12).length / Math.max(1, behaviorSamples.length);
  const projectionCoverage = projectionCoverageForRuns(runs);
  if (leader.count >= 25 && leader.outcomeSpread <= 7 && Math.abs(comparison.gap) >= 2.5 && projectionCoverage >= 0.55 && behaviorCoverage >= 0.5) {
    return { label: "High confidence", reason: "Adequate sample, stable outcomes, useful projection coverage, and meaningful separation from the next strategy." };
  }
  if (leader.count >= 10 && leader.outcomeSpread <= 12 && projectionCoverage >= 0.25) {
    const reason = comparison.tied ? "The leading strategies overlap, so confidence applies to the shared plan rather than a single winner." : "The result is directional, but projection or league-history coverage is incomplete.";
    return { label: "Moderate confidence", reason };
  }
  const reasonParts = [];
  if (leader.count < 10) reasonParts.push("small run sample");
  if (leader.outcomeSpread > 12) reasonParts.push("wide outcome spread");
  if (projectionCoverage < 0.25) reasonParts.push("mostly model-estimated projections");
  if (behaviorCoverage < 0.35) reasonParts.push("limited League Behavior history");
  return { label: "Low confidence", reason: `Limited by ${reasonParts.join(", ") || "uncertain inputs"}.` };
}

function accumulateSimulationSurvivalRun(run, playerRows, tierRows) {
  const snapshots = Array.isArray(run?.availability) ? run.availability : [];
  const draftedAt = new Map((run?.pickTrace || []).map((row) => [row[2], row[0]]));
  if (!draftedAt.size) bulkRunPicks(run).forEach((pick) => draftedAt.set(pick.player.id, pick.pick));
  snapshots.forEach((snapshot, index) => {
    const next = snapshots[index + 1];
    if (!next) return;
    const following = snapshots[index + 2];
    const nextIds = new Set((next.available || []).map((player) => player.id));
    const followingIds = new Set((following?.available || []).map((player) => player.id));
    const nextTiers = new Set(Object.keys(next.tierCounts || {}).filter((key) => Number(next.tierCounts[key]) > 0));
    const followingTiers = new Set(Object.keys(following?.tierCounts || {}).filter((key) => Number(following.tierCounts[key]) > 0));
    const endRoundPick = Number(snapshot.round || 0) * LEAGUE.teams;
    const availableByTier = new Map();
    (snapshot.available || []).forEach((player) => {
      const tierId = `${player.position}-${player.tier || "unknown"}`;
      if (!availableByTier.has(tierId)) availableByTier.set(tierId, []);
      availableByTier.get(tierId).push(player);
    });
    (snapshot.available || []).slice(0, 28).forEach((player) => {
      const key = `${snapshot.round}|${player.id}`;
      const row = playerRows.get(key) || { type: "player", round: snapshot.round, id: player.id, name: player.name, position: player.position, tier: player.tier, observed: 0, survived: 0, followingObserved: 0, followingSurvived: 0, endRoundSurvived: 0 };
      row.observed += 1;
      if (nextIds.has(player.id)) row.survived += 1;
      if (following) {
        row.followingObserved += 1;
        if (followingIds.has(player.id)) row.followingSurvived += 1;
      }
      const selectedAt = draftedAt.get(player.id);
      if (!selectedAt || selectedAt > endRoundPick) row.endRoundSurvived += 1;
      playerRows.set(key, row);

      const tierId = `${player.position}-${player.tier || "unknown"}`;
      const tierKey = `${snapshot.round}|${tierId}`;
      if (!tierRows.has(tierKey)) tierRows.set(tierKey, { type: "tier", round: snapshot.round, id: tierId, name: `${player.position} Tier ${player.tier || "—"}`, position: player.position, tier: player.tier, observed: 0, survived: 0, followingObserved: 0, followingSurvived: 0, endRoundSurvived: 0, playersRemainingTotal: 0 });
    });
    availableByTier.forEach((players, tierId) => {
      const tierKey = `${snapshot.round}|${tierId}`;
      const tier = tierRows.get(tierKey);
      if (!tier) return;
      tier.observed += 1;
      tier.playersRemainingTotal += players.length;
      if (nextTiers.has(tier.id)) tier.survived += 1;
      if (following) {
        tier.followingObserved += 1;
        if (followingTiers.has(tier.id)) tier.followingSurvived += 1;
      }
      if (players.some((player) => !draftedAt.get(player.id) || draftedAt.get(player.id) > endRoundPick)) tier.endRoundSurvived += 1;
    });
  });
}

function finalizeSimulationSurvivalRows(playerRows, tierRows) {
  const finalize = (row) => {
    const rate = row.observed ? row.survived / row.observed : 0;
    const followingRate = row.followingObserved ? row.followingSurvived / row.followingObserved : null;
    const endRoundRate = row.observed ? row.endRoundSurvived / row.observed : 0;
    const confidence = row.observed >= 25 ? "High" : row.observed >= 10 ? "Moderate" : "Low";
    const label = rate >= 0.7 ? "Likely to survive" : rate >= 0.52 ? "Slightly favored to survive" : rate >= 0.3 ? "At risk" : "Unlikely to survive";
    return { ...row, survivalRate: rate, followingPickSurvivalRate: followingRate, endRoundSurvivalRate: endRoundRate, averagePlayersRemaining: row.type === "tier" && row.observed ? row.playersRemainingTotal / row.observed : null, confidence, label };
  };
  return [...playerRows.values(), ...tierRows.values()].map(finalize).sort((a, b) => a.round - b.round || a.survivalRate - b.survivalRate || b.observed - a.observed);
}

function deriveSimulationSurvival(runs) {
  const playerRows = new Map(), tierRows = new Map();
  runs.forEach((run) => accumulateSimulationSurvivalRun(run, playerRows, tierRows));
  return finalizeSimulationSurvivalRows(playerRows, tierRows);
}

async function deriveSimulationSurvivalAsync(runs) {
  const playerRows = new Map(), tierRows = new Map();
  for (let index = 0; index < runs.length; index += 1) {
    accumulateSimulationSurvivalRun(runs[index], playerRows, tierRows);
    if ((index + 1) % 3 === 0) await yieldBulkWork();
  }
  return finalizeSimulationSurvivalRows(playerRows, tierRows);
}

function successfulRosterPlayerFrequency(runs) {
  if (!runs.length) return {};
  const threshold = percentile(runs.map(runOutcomeValue), 0.75);
  const successful = runs.filter((run) => runOutcomeValue(run) >= threshold || run.rank <= 3);
  const counts = {};
  successful.forEach((run) => {
    new Set((run.userPicks || []).map((pick) => pick.player.id)).forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  });
  return Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, successful.length ? count / successful.length : 0]));
}

function playerReplacementCost(player) {
  const same = availablePlayers().filter((candidate) => candidate.position === player.position && candidate.id !== player.id).sort((a, b) => a.consensusRank - b.consensusRank);
  const next = same.find((candidate) => candidate.consensusRank > player.consensusRank) || same[0];
  if (!next) return 1;
  const projectionGap = projectionForPlayer(player) - projectionForPlayer(next);
  const rankGap = Math.max(0, (next.consensusRank || player.consensusRank) - player.consensusRank);
  return clampNumber(projectionGap / 5 * 0.65 + rankGap / 24 * 0.35, 0, 1);
}

function playerPlanTags(priorityRow) {
  if (!priorityRow) return [];
  const tags = [];
  if (priorityRow.priorityRank <= 24 && priorityRow.movement >= 4) tags.push("Priority Target");
  if (priorityRow.survivalRate >= 0.68) tags.push("Safe to Wait");
  if (priorityRow.tierSurvival < 0.42) tags.push("Fragile Tier");
  if (priorityRow.successfulRosterFrequency >= 0.35) tags.push("Common Successful-Roster Player");
  if (priorityRow.strategyPathValue >= 0.65) tags.push("Strategy Dependent");
  if (priorityRow.reachCostPenalty >= 8) tags.push("Expensive at Current Cost");
  if (priorityRow.positionalPivot >= 0.6) tags.push("Strong Pivot");
  if (priorityRow.replacementCost >= 0.65) tags.push("High Replacement Cost");
  if (priorityRow.leagueMarketDiscount >= 0.55) tags.push("League-Market Discount");
  return tags;
}

function draftPlanSurvivalIndexes(survivalRows = [], currentRound = 1) {
  const players = new Map(), tiers = new Map();
  survivalRows.forEach((row) => {
    if (row.round !== currentRound) return;
    if (row.type === "player") players.set(row.id, row);
    else if (row.type === "tier") tiers.set(row.id, row);
  });
  return { players, tiers };
}

function availablePlayersByPositionForPriority() {
  const byPosition = new Map();
  availablePlayers().forEach((player) => {
    if (!byPosition.has(player.position)) byPosition.set(player.position, []);
    byPosition.get(player.position).push(player);
  });
  byPosition.forEach((players) => players.sort((a, b) => Number(a.consensusRank || 9999) - Number(b.consensusRank || 9999)));
  return byPosition;
}

function playerReplacementCostFromPriorityPool(player, availableByPosition) {
  const same = availableByPosition.get(player.position) || [];
  let next = null;
  for (const candidate of same) {
    if (candidate.id === player.id) continue;
    if (Number(candidate.consensusRank || 9999) > Number(player.consensusRank || 9999)) { next = candidate; break; }
  }
  if (!next) next = same.find((candidate) => candidate.id !== player.id) || null;
  if (!next) return 1;
  const projectionGap = projectionForPlayer(player) - projectionForPlayer(next);
  const rankGap = Math.max(0, Number(next.consensusRank || player.consensusRank) - Number(player.consensusRank || 0));
  return clampNumber(projectionGap / 5 * 0.65 + rankGap / 24 * 0.35, 0, 1);
}

function basicDraftPlanPriorityRow(player, index = 0) {
  const labRank = Number(player.consensusRank || index + 1);
  const survival = Number.isFinite(player.adp)
    ? clampNumber(0.5 + (Number(player.adp) - state.currentPick) / Math.max(24, LEAGUE.teams * 4), 0.08, 0.92)
    : 0.5;
  return {
    playerId: player.id,
    player,
    labRank,
    priorityRank: index + 1,
    movement: Math.round(labRank - (index + 1)),
    priorityScore: clampNumber(101 - labRank / Math.max(1, PLAYERS.length) * 100, 0, 100),
    survivalRate: survival,
    nextPickSurvival: survival,
    followingPickSurvival: null,
    endRoundSurvival: null,
    survivalObserved: 0,
    tierSurvival: survival,
    survivalConfidence: "Low",
    confidence: "Low",
    snipeThreats: [],
    replacementCost: 0.5,
    successfulRosterFrequency: 0,
    positionalNeed: 0.5,
    strategyPathValue: 0.5,
    leagueMarketDiscount: 0.3,
    reachCostPenalty: 0,
    redundancyPenalty: 0,
    positionalPivot: 0.25,
    explanation: "Fallback priority preserves Lab Rank because deeper Draft Plan evidence could not be completed.",
    targetRound: Math.max(1, Math.ceil(Number(player.adp || labRank) / LEAGUE.teams)),
    earliestReasonablePick: Math.max(1, Math.round(Math.min(Number(player.adp || labRank), labRank) - 8)),
    tags: [],
  };
}

function draftPlanPriorityContext(summary, survivalRows) {
  const currentRound = state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick).round : LEAGUE.rounds;
  return {
    currentRound,
    indexes: draftPlanSurvivalIndexes(survivalRows, currentRound),
    successFrequency: summary.successfulPlayerFrequency || {},
    bestStrategyId: summary.bestStrategy?.id || state.strategy,
    roster: rosterFor(state.userTeam),
    availableByPosition: availablePlayersByPositionForPriority(),
  };
}

function calculateDraftPlanPriorityRow(player, context, index = 0) {
  try {
    const { indexes, successFrequency, bestStrategyId, roster, availableByPosition } = context;
    const counts = context.counts || (context.counts = positionCounts(roster));
    const labValue = clampNumber(1 - ((player.consensusRank || PLAYERS.length) - 1) / Math.max(1, PLAYERS.length - 1), 0, 1);
    const evidence = indexes.players.get(player.id);
    const tierEvidence = indexes.tiers.get(`${player.position}-${player.tier || "unknown"}`);
    const fallbackSurvival = playerSurvivalEstimate(player);
    const survivalRate = evidence ? evidence.survivalRate : fallbackSurvival.survivalProbability;
    const tierSurvival = tierEvidence ? tierEvidence.survivalRate : survivalRate;
    const tierLossRisk = clampNumber(1 - tierSurvival, 0, 1);
    const replacementCost = playerReplacementCostFromPriorityPool(player, availableByPosition);
    const successfulRosterFrequency = Number(successFrequency[player.id] || 0);
    const starterTarget = Number(LEAGUE.roster[player.position] || 0) + (["RB", "WR", "TE"].includes(player.position) ? Number(LEAGUE.roster.FLEX || 0) * 0.35 : 0);
    const positionalNeed = clampNumber((starterTarget - Number(counts[player.position] || 0)) / Math.max(1, starterTarget), 0, 1);
    const strategyPathValue = clampNumber((-strategyScore(player, roster, state.currentPick, bestStrategyId) + 18) / 36, 0, 1);
    const leagueMarketDiscount = Number.isFinite(player.adp) ? clampNumber((player.adp - player.consensusRank + 12) / 36, 0, 1) : 0.3;
    const reachCostPenalty = Number.isFinite(player.adp) ? Math.max(0, player.adp - state.currentPick - 8) * 0.55 : 0;
    const rawRosterPenalty = recommendationRosterPenalty(player, roster, state.currentPick, bestStrategyId);
    const redundancyPenalty = rawRosterPenalty >= 100 ? 20 : rawRosterPenalty >= 45 ? 9 : 0;
    const positionalPivot = positionalNeed * replacementCost;
    const priorityScore = 100 * (0.45 * labValue + 0.15 * tierLossRisk + 0.12 * replacementCost + 0.10 * successfulRosterFrequency + 0.08 * positionalNeed + 0.05 * strategyPathValue + 0.05 * leagueMarketDiscount) - reachCostPenalty - redundancyPenalty;
    let threats = [];
    try { threats = scoutingSnipeEvidence(player, state.userTeam, state.currentPick).threats.slice(0, 3).map((threat) => activeTeamName(threat.team)); } catch { threats = []; }
    return {
      playerId: player.id, player, labRank: player.consensusRank, priorityScore: clampNumber(priorityScore, 0, 100),
      survivalRate, nextPickSurvival: survivalRate, followingPickSurvival: evidence?.followingPickSurvivalRate ?? null,
      endRoundSurvival: evidence?.endRoundSurvivalRate ?? null, survivalObserved: evidence?.observed || 0,
      tierSurvival, survivalConfidence: evidence?.confidence || fallbackSurvival.confidence,
      confidence: evidence?.confidence || fallbackSurvival.confidence, snipeThreats: threats, replacementCost,
      successfulRosterFrequency, positionalNeed, strategyPathValue, leagueMarketDiscount, reachCostPenalty,
      redundancyPenalty, positionalPivot,
    };
  } catch {
    return basicDraftPlanPriorityRow(player, index);
  }
}

function finalizeDraftPlanPriorityRows(rows, cacheKey) {
  rows.sort((a, b) => b.priorityScore - a.priorityScore || a.labRank - b.labRank);
  rows.forEach((row, index) => {
    row.priorityRank = index + 1;
    row.movement = Math.round(row.labRank - row.priorityRank);
    const reason = row.movement >= 4
      ? `Up ${row.movement} spots because ${row.tierSurvival < 0.45 ? `the tier survived only ${Math.round(row.tierSurvival * 100)}% of observed paths` : row.successfulRosterFrequency >= 0.3 ? `he appeared in ${Math.round(row.successfulRosterFrequency * 100)}% of the strongest roster paths` : "current roster need and replacement cost increase acquisition urgency"}.`
      : row.movement <= -4
        ? `Down ${Math.abs(row.movement)} spots because ${row.survivalRate >= 0.65 ? "comparable value is likely to remain available" : row.redundancyPenalty ? "the pick creates redundant roster depth" : "current market cost exceeds the modeled urgency"}.`
        : row.explanation || "No meaningful movement because Lab value and current acquisition urgency are aligned.";
    row.explanation = reason;
    row.targetRound = Math.max(1, Math.ceil(Number(row.player.adp || row.labRank) / LEAGUE.teams));
    row.earliestReasonablePick = Math.max(1, Math.round(Math.min(Number(row.player.adp || row.labRank), row.labRank) - 8));
    row.tags = playerPlanTags(row);
  });
  DRAFT_PLAN_PRIORITY_CACHE.set(cacheKey, rows);
  return rows;
}

function buildDraftPlanPriority(summary, survivalRows) {
  const cacheKey = `${summary.createdAt}|${currentDraftStateIdentifier()}|${state.strategy}`;
  if (DRAFT_PLAN_PRIORITY_CACHE.has(cacheKey)) return DRAFT_PLAN_PRIORITY_CACHE.get(cacheKey);
  const context = draftPlanPriorityContext(summary, survivalRows);
  const rows = PLAYERS.map((player, index) => calculateDraftPlanPriorityRow(player, context, index));
  return finalizeDraftPlanPriorityRows(rows, cacheKey);
}

async function buildDraftPlanPriorityAsync(summary, survivalRows) {
  const cacheKey = `${summary.createdAt}|${currentDraftStateIdentifier()}|${state.strategy}`;
  if (DRAFT_PLAN_PRIORITY_CACHE.has(cacheKey)) return DRAFT_PLAN_PRIORITY_CACHE.get(cacheKey);
  const context = draftPlanPriorityContext(summary, survivalRows);
  const rows = [];
  for (let index = 0; index < PLAYERS.length; index += 1) {
    rows.push(calculateDraftPlanPriorityRow(PLAYERS[index], context, index));
    if ((index + 1) % 20 === 0) await yieldBulkWork();
  }
  return finalizeDraftPlanPriorityRows(rows, cacheKey);
}

function currentDraftPlanPriority(playerId) {
  const rows = state.bulk.priority?.length ? state.bulk.priority : state.bulk.results?.summary?.priority || [];
  return rows.find((row) => row.playerId === playerId) || null;
}

function currentPlanStatus() {
  if (!state.bulk.draftPlan) return { label: "Analysis unavailable", reason: "Run the Draft Simulator to create a Draft Plan." };
  if (state.bulk.staleReason) return { label: "Limited evidence", reason: `The saved plan is stale: ${state.bulk.staleReason}` };
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick > total) return { label: "Plan complete", reason: "The draft is complete; review process grading in post-draft analysis." };
  const userPicks = state.picks.filter((pick) => pick.team === state.userTeam && !pick.keeper).sort((a, b) => a.pick - b.pick);
  const planned = String(state.bulk.draftPlan.recommendedOpening || "").split("-").filter(Boolean);
  const actual = userPicks.slice(0, planned.length).map((pick) => pick.player.position);
  const mismatches = actual.filter((position, index) => planned[index] && planned[index] !== position).length;
  const atRisk = (state.bulk.survival || []).find((row) => row.type === "tier" && row.round === draftOrderFor(Math.min(state.currentPick, total)).round && row.survivalRate < 0.35);
  if (atRisk) return { label: "Pivot recommended", reason: `${atRisk.name} is depleting faster than the original plan assumed.` };
  if (mismatches >= 2) return { label: "Plan invalidated", reason: "The opening build has diverged in multiple rounds; rerun the simulator from the current state." };
  if (mismatches === 1) return { label: "Acceptable deviation", reason: "One pick differs from the opening, but the roster remains within a modeled alternative path." };
  return { label: "On plan", reason: "The current opening and tier availability remain aligned with the saved Draft Plan." };
}

function roundPositionDistribution(runs, roundNumber) {
  const counts = {};
  runs.forEach((run) => {
    const pick = (run.userPicks || [])[roundNumber - 1];
    if (pick?.player?.position) counts[pick.player.position] = (counts[pick.player.position] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function createDraftPlan(summary) {
  const leader = summary.bestStrategy, alternative = summary.strategies[1] || null;
  const leaderRuns = leader?.runs || [];
  const successfulThreshold = percentile(leaderRuns.map(runOutcomeValue), 0.5);
  const successfulRuns = leaderRuns.filter((run) => runOutcomeValue(run) >= successfulThreshold);
  const openingGroups = summary.openingBuilds.filter((group) => !leader?.id || group.runs.some((run) => run.strategy === leader.id));
  const opening = openingGroups[0] || summary.openingBuilds[0] || null;
  const alternativeOpening = openingGroups[1] || summary.openingBuilds[1] || null;
  const positionFrequency = {};
  successfulRuns.forEach((run) => (run.userPicks || []).slice(0, 8).forEach((pick) => { positionFrequency[pick.player.position] = (positionFrequency[pick.player.position] || 0) + 1; }));
  const prioritize = Object.entries(positionFrequency).filter(([position]) => ["QB", "RB", "WR", "TE"].includes(position)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([position]) => position);
  const currentRound = Math.max(1, state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick).round : 1);
  const tierRisks = summary.survival.filter((row) => row.type === "tier" && row.round >= currentRound && row.round <= 8 && row.observed >= 5).sort((a, b) => a.survivalRate - b.survivalRate).slice(0, 4);
  const canWait = ["QB", "RB", "WR", "TE"].filter((position) => !prioritize.includes(position)).slice(0, 3);
  const objectives = Array.from({ length: Math.min(8, LEAGUE.rounds) }, (_, index) => {
    const round = index + 1;
    const distribution = roundPositionDistribution(successfulRuns.length ? successfulRuns : leaderRuns, round);
    const primary = distribution[0]?.[0] || "Best available value";
    const fallback = distribution[1]?.[0] || "the strongest remaining tier";
    const risk = tierRisks.find((row) => row.round === round || row.round === round - 1);
    return {
      round,
      primaryObjective: primary === "Best available value" ? primary : `Prioritize ${primary} when the planned tier is available.`,
      acceptableFallback: `Pivot to ${fallback} if ${primary} value is exhausted.`,
      avoidForcing: `Do not force ${canWait[0] || "a onesie position"} above its market range.`,
      trigger: risk ? `Change the plan if ${risk.name} falls below ${Math.max(1, Math.round(risk.survivalRate * 100))}% modeled survival before the next pick.` : `Change the plan when the target tier loses two players earlier than expected.`,
    };
  });
  const pivotRules = [
    tierRisks[0] ? `If ${tierRisks[0].name} starts depleting before Round ${tierRisks[0].round}, take the final acceptable option rather than forcing the original position sequence.` : "If a target tier loses two players before your next selection, compare its replacement cost with the best available pivot.",
    `If an elite QB or TE falls at least eight picks beyond market cost, compare the weekly positional edge with the remaining ${prioritize[0] || "RB/WR"} replacement value.`,
    `Do not chase the first positional-run pick; pivot only when the modeled tier survival drops below 45% or a second player leaves the tier.`,
    `Treat ${alternative?.label || "the closest strategy"} as an acceptable deviation when its median outcome remains within two points of the leader.`,
  ];
  const projectionCoverage = projectionCoverageForRuns(summary.runs);
  const limitations = [];
  if (leader?.count < 10) limitations.push("Small simulation sample");
  if (projectionCoverage < 0.25) limitations.push("Most player projections are model estimates rather than imports");
  const report = scoutingReport();
  if (!report?.league?.draftsAnalyzed) limitations.push("No League Behavior history");
  else if (report.league.draftsAnalyzed === 1) limitations.push("Only one historical draft is available");
  if (!state.keeperSelections.some((selection) => selection.playerId)) limitations.push("Keeper context is limited to the configured board");
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    createdAt: summary.createdAt,
    recommendedOpening: opening?.label || leader?.best?.openingBuild || "No opening available",
    recommendedStrategy: leader?.label || "No strategy available",
    bestAlternative: alternativeOpening?.label || alternative?.label || "No clear alternative",
    alternativeReason: alternative ? `${alternative.label} finished ${Math.abs((leader?.medianOutcome || 0) - alternative.medianOutcome).toFixed(1)} median points from the leader and may offer a different risk profile.` : "No second strategy has enough evidence.",
    confidence: summary.confidence,
    comparison: summary.comparison,
    sampleSize: summary.totalRuns,
    runsPerStrategy: state.bulk.mode === "compare" ? state.bulk.count : summary.totalRuns,
    projectionBasis: projectionCoverage >= 0.6 ? "Mostly imported projections" : projectionCoverage >= 0.25 ? "Mixed imported and model-estimated projections" : "Mostly model-estimated projections",
    whyItWorks: [
      opening ? `${opening.label} produced a ${opening.medianOutcome.toFixed(1)} median modeled outcome with a ${opening.downside.toFixed(1)} downside result.` : "The opening is based on the strongest completed strategy paths.",
      prioritize[0] ? `${prioritize[0]} appeared most often in the first eight rounds of successful ${leader?.label || "modeled"} drafts.` : "The plan preserves flexible early-round value.",
      tierRisks[0] ? `${tierRisks[0].name} survived to the next relevant pick in only ${Math.round(tierRisks[0].survivalRate * 100)}% of ${tierRisks[0].observed} observations.` : "No single tier showed a repeatable depletion warning.",
    ],
    prioritize,
    canWait,
    tiersAtRisk: tierRisks,
    objectives,
    pivotRules,
    limitations: limitations.length ? limitations : ["Simulation results remain estimates and do not guarantee league outcomes."],
  };
}

function buildBulkSummaryBase(runs) {
  const safeRuns = Array.isArray(runs) ? runs.filter(Boolean) : [];
  const byStrategy = BULK_STRATEGIES
    .map((strategy) => summarizeRunGroup(safeRuns.filter((run) => run.strategy === strategy.id), strategy.label, strategy.id))
    .filter((group) => group.count)
    .sort((a, b) => b.medianOutcome - a.medianOutcome || b.downside - a.downside || a.outcomeSpread - b.outcomeSpread);
  const buildMap = new Map(), openingMap = new Map();
  safeRuns.forEach((run) => {
    const firstFiveBuild = run.firstFiveBuild || "Unknown";
    const openingBuild = run.openingBuild || "Unknown";
    if (!buildMap.has(firstFiveBuild)) buildMap.set(firstFiveBuild, []);
    buildMap.get(firstFiveBuild).push(run);
    if (!openingMap.has(openingBuild)) openingMap.set(openingBuild, []);
    openingMap.get(openingBuild).push(run);
  });
  const builds = [...buildMap.entries()].map(([build, buildRuns]) => summarizeRunGroup(buildRuns, build, build)).sort((a, b) => b.medianOutcome - a.medianOutcome || b.downside - a.downside).slice(0, 8);
  const openingBuilds = [...openingMap.entries()].map(([build, buildRuns]) => summarizeRunGroup(buildRuns, build, build)).sort((a, b) => b.medianOutcome - a.medianOutcome || b.downside - a.downside).slice(0, 8);
  const successfulPlayerFrequency = successfulRosterPlayerFrequency(safeRuns);
  const playerMap = new Map();
  safeRuns.forEach((run) => {
    (run.userPicks || []).slice(0, 8).forEach((pick, index) => {
      if (!pick?.player?.id) return;
      const key = `${index + 1}:${pick.player.name}:${pick.player.position}:${pick.player.id}`;
      playerMap.set(key, (playerMap.get(key) || 0) + 1);
    });
  });
  const commonPlayers = [...playerMap.entries()].map(([key, count]) => {
    const [round, name, position, id] = key.split(":");
    return { round: Number(round), name, position, id, count, rate: count / Math.max(1, safeRuns.length), successfulRate: successfulPlayerFrequency[id] || 0 };
  }).sort((a, b) => b.successfulRate - a.successfulRate || b.count - a.count).slice(0, 16);
  const sortedOverall = [...safeRuns].sort((a, b) => runOutcomeValue(b) - runOutcomeValue(a));
  const comparison = strategyComparisonAssessment(byStrategy);
  const confidence = simulationConclusionConfidence(byStrategy, comparison, safeRuns);
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    totalRuns: safeRuns.length,
    runs: safeRuns,
    strategies: byStrategy,
    builds,
    openingBuilds,
    commonPlayers,
    successfulPlayerFrequency,
    survival: [],
    priority: [],
    finalizationWarnings: [],
    examples: [sortedOverall[0], sortedOverall[Math.floor(sortedOverall.length / 2)], sortedOverall[Math.max(0, Math.floor(sortedOverall.length * 0.1))], sortedOverall[sortedOverall.length - 1]].filter(Boolean),
    bestLeagueRuns: [...safeRuns].sort((a, b) => a.rank - b.rank || runOutcomeValue(b) - runOutcomeValue(a)).slice(0, 6),
    winRate: safeRuns.length ? safeRuns.filter((run) => run.rank === 1).length / safeRuns.length : 0,
    avgRank: average(safeRuns.map((run) => run.averageRoomFinish || run.rank)),
    bestStrategy: byStrategy[0] || null,
    bestBuild: builds[0] || null,
    comparison,
    confidence,
    outcomeBasis: safeRuns.some((run) => run.seasonSimulationCount) ? "Actual playoff qualification counts from simulated seasons" : "Relative Draft Strength fallback",
    seasonSimulationCount: safeRuns.reduce((sum, run) => sum + Number(run.seasonSimulationCount || 0), 0),
  };
}

function fallbackDraftPlan(summary, reason = "Detailed finalization was unavailable.") {
  const leader = summary.bestStrategy;
  const opening = summary.openingBuilds?.[0] || summary.bestBuild;
  const positions = String(opening?.label || leader?.best?.openingBuild || "RB-WR-WR").split("-").filter((position) => ["QB", "RB", "WR", "TE"].includes(position));
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    createdAt: summary.createdAt,
    recommendedOpening: opening?.label || leader?.best?.openingBuild || "Best available value",
    recommendedStrategy: leader?.label || "Balanced value",
    bestAlternative: summary.strategies?.[1]?.label || "Best available value",
    alternativeReason: "Use the closest modeled strategy when the preferred opening is unavailable.",
    confidence: summary.confidence,
    comparison: summary.comparison,
    sampleSize: summary.totalRuns,
    runsPerStrategy: state.bulk.mode === "compare" ? state.bulk.count : summary.totalRuns,
    projectionBasis: "Completed simulation outcomes",
    whyItWorks: [leader ? `${leader.label} produced the strongest median completed-roster outcome.` : "The plan uses the strongest completed drafts.", reason],
    prioritize: [...new Set(positions)].slice(0, 3),
    canWait: ["QB", "RB", "WR", "TE"].filter((position) => !positions.includes(position)).slice(0, 3),
    tiersAtRisk: [],
    objectives: Array.from({ length: Math.min(8, LEAGUE.rounds) }, (_, index) => ({
      round: index + 1,
      primaryObjective: positions[index] ? `Prioritize ${positions[index]} when value is available.` : "Take the strongest available value.",
      acceptableFallback: "Pivot to the strongest remaining tier.",
      avoidForcing: "Do not force a position well above market cost.",
      trigger: "Change the plan when the target tier loses two players earlier than expected.",
    })),
    pivotRules: ["Use the strongest remaining tier when the planned position is exhausted.", "Avoid chasing the first pick of a positional run."],
    limitations: [reason],
  };
}

function summarizeBulkResults(runs) {
  const summary = buildBulkSummaryBase(runs);
  summary.survival = deriveSimulationSurvival(summary.runs);
  summary.priority = buildDraftPlanPriority(summary, summary.survival);
  summary.draftPlan = createDraftPlan(summary);
  return summary;
}

async function summarizeBulkResultsAsync(runs, onStage = () => {}) {
  onStage("Comparing strategy and opening-build distributions…");
  await yieldBulkWork();
  const summary = buildBulkSummaryBase(runs);

  onStage("Measuring player and tier survival…");
  await yieldBulkWork();
  try {
    summary.survival = await deriveSimulationSurvivalAsync(summary.runs);
  } catch (error) {
    summary.survival = [];
    summary.finalizationWarnings.push(`Survival analysis used a lightweight fallback: ${error?.message || "unknown error"}`);
  }

  onStage("Calculating Draft Plan Priority…");
  await yieldBulkWork();
  try {
    summary.priority = await buildDraftPlanPriorityAsync(summary, summary.survival);
  } catch (error) {
    summary.priority = PLAYERS.map((player, index) => basicDraftPlanPriorityRow(player, index));
    summary.finalizationWarnings.push(`Draft Plan Priority preserved static Lab order: ${error?.message || "unknown error"}`);
  }

  onStage("Writing round objectives and pivot rules…");
  await yieldBulkWork();
  try {
    summary.draftPlan = createDraftPlan(summary);
  } catch (error) {
    const reason = `Detailed round-plan generation used a fallback: ${error?.message || "unknown error"}`;
    summary.finalizationWarnings.push(reason);
    summary.draftPlan = fallbackDraftPlan(summary, reason);
  }
  return summary;
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvFromRows(headers, rows) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function playerExportFields(player = {}) {
  return {
    playerId: player.id || "",
    playerName: player.name || "",
    position: player.position || "",
    nflTeam: player.team || "",
    consensusRank: player.consensusRank ?? player.rank ?? "",
    adp: player.adp ?? "",
    tier: player.tier ?? "",
  };
}

function bulkExportManifest(results) {
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    exportType: "fantasy-draft-labs-phase-1-3",
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    totalRuns: results.runs.length,
    controls: {
      runsPerStrategy: state.bulk.count,
      depth: state.bulk.depth,
      mode: state.bulk.mode,
      singleStrategy: state.bulk.strategy,
      randomizeRoom: state.bulk.randomizeRoom,
      userTeam: state.userTeam,
      activeLeagueId: state.activeLeagueId,
    },
    league: structuredClone(LEAGUE),
    teamNames: [...state.teamNames],
    roundOrders: state.roundOrders.map((round) => [...round]),
    teamPersonas: [...state.teamPersonas],
    personaSources: [...state.personaSources],
    keeperSelections: state.keeperSelections.map((selection) => ({ ...selection })),
    rankingSources: state.rankingSources.map((source) => ({ ...source })),
    outcomeBasis: results.summary?.outcomeBasis,
    files: [
      "manifest.json", "metadata/formulas-and-versions.json", "summary/summary.json", "summary/draft-plan.json",
      "summary/strategy-distributions.csv", "summary/opening-build-distributions.csv", "decision/counterfactual-results.json",
      "availability/player-and-tier-survival.csv", "priority/draft-plan-priority.csv", "learning/prediction-log.json",
      "learning/prediction-versus-actual.json", "learning/calibration-summary.json", "learning/manager-behavior-profiles.json",
      "analysis/post-draft-process-grades.json", "runs/run-index.csv", "runs/run-001.json and one JSON file per run",
      "picks/all-picks.csv", "availability/user-pick-availability.csv", "training/training-runs.jsonl",
    ],
  };
}

function bulkStrategySummaryCsv(summary) {
  const rows = (summary.strategies || []).map((group) => ({
    strategyId: group.id, strategy: group.label, runs: group.count,
    meanOutcome: formatNumber(group.meanOutcome), medianOutcome: formatNumber(group.medianOutcome),
    p25: formatNumber(group.p25), p75: formatNumber(group.p75), downsideP10: formatNumber(group.downside),
    best: formatNumber(group.bestOutcome), worst: formatNumber(group.worstOutcome), outcomeSpread: formatNumber(group.outcomeSpread),
    stability: group.stability, averageRoomRank: formatNumber(group.avgRank), firstPlaceDraftRate: percent(group.firstPlaceRate),
    topThreeDraftRate: percent(group.top3Rate), actualPlayoffRate: percent(group.actualPlayoffRate), championshipRate: percent(group.championshipRate),
    projectionCoverage: percent(group.projectionCoverage), conclusion: summary.comparison?.label || "", confidence: summary.confidence?.label || "",
  }));
  return csvFromRows(["strategyId", "strategy", "runs", "meanOutcome", "medianOutcome", "p25", "p75", "downsideP10", "best", "worst", "outcomeSpread", "stability", "averageRoomRank", "firstPlaceDraftRate", "topThreeDraftRate", "actualPlayoffRate", "championshipRate", "projectionCoverage", "conclusion", "confidence"], rows);
}

function bulkBuildSummaryCsv(summary) {
  const rows = (summary.openingBuilds || summary.builds || []).map((group) => ({
    openingBuild: group.label, runs: group.count, meanOutcome: formatNumber(group.meanOutcome), medianOutcome: formatNumber(group.medianOutcome),
    p25: formatNumber(group.p25), p75: formatNumber(group.p75), downsideP10: formatNumber(group.downside),
    best: formatNumber(group.bestOutcome), worst: formatNumber(group.worstOutcome), averageRoomRank: formatNumber(group.avgRank),
    firstPlaceDraftRate: percent(group.firstPlaceRate), topThreeDraftRate: percent(group.top3Rate), actualPlayoffRate: percent(group.actualPlayoffRate), stability: group.stability,
  }));
  return csvFromRows(["openingBuild", "runs", "meanOutcome", "medianOutcome", "p25", "p75", "downsideP10", "best", "worst", "averageRoomRank", "firstPlaceDraftRate", "topThreeDraftRate", "actualPlayoffRate", "stability"], rows);
}

function bulkRunIndexCsv(runs) {
  const rows = runs.map((run) => ({
    runIndex: run.runIndex, runId: run.id, seed: run.seed, strategy: run.strategy, strategyLabel: run.strategyLabel,
    draftRoomRank: run.rank, averageSeasonFinish: formatNumber(run.averageRoomFinish), grade: run.grade,
    relativeDraftStrength: formatNumber(run.relativeStrength), playoffRate: percent(run.playoffRate), championshipRate: percent(run.championshipRate),
    topThreeRate: percent(run.topThreeRate), lastPlaceRate: percent(run.lastPlaceRate), simulatedSeasons: run.seasonSimulationCount,
    weeklyProjection: formatNumber(run.weeklyProjection), outcomeScore: formatNumber(run.score), draftValue: formatNumber(run.value),
    openingBuild: run.openingBuild, firstFiveBuild: run.firstFiveBuild, firstFivePlayers: (run.firstFivePlayers || []).join(" | "),
    userPicks: (run.userPicks || []).map((pick) => `${pick.label} ${pick.player.name}`).join(" | "),
  }));
  return csvFromRows(["runIndex", "runId", "seed", "strategy", "strategyLabel", "draftRoomRank", "averageSeasonFinish", "grade", "relativeDraftStrength", "playoffRate", "championshipRate", "topThreeRate", "lastPlaceRate", "simulatedSeasons", "weeklyProjection", "outcomeScore", "draftValue", "openingBuild", "firstFiveBuild", "firstFivePlayers", "userPicks"], rows);
}

function bulkAllPicksCsv(runs) {
  const rows = runs.flatMap((run) => bulkRunPicks(run).map((pick) => ({
    runIndex: run.runIndex,
    runId: run.id,
    seed: run.seed,
    strategy: run.strategy,
    strategyLabel: run.strategyLabel,
    pick: pick.pick,
    label: pick.label,
    round: pick.round,
    roundIndex: pick.index + 1,
    fantasyTeam: pick.team,
    fantasyTeamName: teamName(pick.team),
    isUserTeam: pick.team === state.userTeam,
    isKeeper: Boolean(pick.keeper),
    ...playerExportFields(pick.player),
  })));
  return csvFromRows(["runIndex", "runId", "seed", "strategy", "strategyLabel", "pick", "label", "round", "roundIndex", "fantasyTeam", "fantasyTeamName", "isUserTeam", "isKeeper", "playerId", "playerName", "position", "nflTeam", "consensusRank", "adp", "tier"], rows);
}

function bulkAvailabilityCsv(runs) {
  const rows = runs.flatMap((run) => run.availability.flatMap((snapshot) => {
    const selected = playerExportFields(snapshot.player);
    return snapshot.available.map((player, index) => ({
      runIndex: run.runIndex,
      runId: run.id,
      seed: run.seed,
      strategy: run.strategy,
      pick: snapshot.pick,
      label: snapshot.label,
      selectedPlayerId: selected.playerId,
      selectedPlayerName: selected.playerName,
      selectedPosition: selected.position,
      optionRank: index + 1,
      optionPlayerId: player.id,
      optionPlayerName: player.name,
      optionPosition: player.position,
      optionConsensusRank: player.rank,
    }));
  }));
  return csvFromRows(["runIndex", "runId", "seed", "strategy", "pick", "label", "selectedPlayerId", "selectedPlayerName", "selectedPosition", "optionRank", "optionPlayerId", "optionPlayerName", "optionPosition", "optionConsensusRank"], rows);
}

function bulkTrainingJsonl(results, manifest) {
  return results.runs.map((run) => JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    runId: run.id,
    runIndex: run.runIndex,
    seed: run.seed,
    controls: {
      league: manifest.league,
      userTeam: manifest.controls.userTeam,
      strategy: run.strategy,
      randomizeRoom: manifest.controls.randomizeRoom,
      teamPersonas: manifest.teamPersonas,
      keeperSelections: manifest.keeperSelections,
      rankingSources: manifest.rankingSources,
    },
    outcomes: {
      draftRoomRank: run.rank,
      averageSeasonFinish: run.averageRoomFinish,
      grade: run.grade,
      relativeDraftStrength: run.relativeStrength,
      playoffRate: run.playoffRate,
      championshipRate: run.championshipRate,
      topThreeRate: run.topThreeRate,
      lastPlaceRate: run.lastPlaceRate,
      seasonSimulationCount: run.seasonSimulationCount,
      weeklyProjection: run.weeklyProjection,
      outcomeScore: run.score,
      draftValue: run.value,
      openingBuild: run.openingBuild,
      firstFiveBuild: run.firstFiveBuild,
      strengths: run.strengths,
      weaknesses: run.weaknesses,
    },
    userPicks: run.userPicks,
    availability: run.availability,
    allPicks: bulkRunPicks(run),
  })).join("\n");
}


function bulkSurvivalCsv(rows = []) {
  return csvFromRows(["type", "round", "id", "name", "position", "tier", "observed", "survived", "survivalRate", "label", "confidence"], rows.map((row) => ({ ...row, survivalRate: percent(row.survivalRate) })));
}

function bulkPriorityCsv(rows = []) {
  return csvFromRows(["playerId", "player", "position", "labRank", "draftPlanPriority", "movement", "targetRound", "earliestReasonablePick", "nextPickSurvival", "tierSurvival", "replacementCost", "successfulRosterFrequency", "strategyPathValue", "confidence", "tags", "explanation"], rows.map((row) => ({
    playerId: row.playerId, player: row.player?.name || playerById(row.playerId)?.name || "", position: row.player?.position || playerById(row.playerId)?.position || "",
    labRank: row.labRank, draftPlanPriority: row.priorityRank, movement: row.movement, targetRound: row.targetRound, earliestReasonablePick: row.earliestReasonablePick,
    nextPickSurvival: percent(row.survivalRate), tierSurvival: percent(row.tierSurvival), replacementCost: formatNumber(row.replacementCost),
    successfulRosterFrequency: percent(row.successfulRosterFrequency), strategyPathValue: formatNumber(row.strategyPathValue), confidence: row.confidence,
    tags: (row.tags || []).join(" | "), explanation: row.explanation,
  })));
}

function simulatorFormulaMetadata() {
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    engines: {
      draftDecisionModel: "Lab rank + ADP + tier + roster need + selected strategy + opponent behavior + run pressure + seeded variation",
      outcomeEvaluationModel: "Best legal lineup + imported/model projection + room-relative position strength + replacement value + completeness + depth - risk concentration",
      marketAvailabilityModel: "ADP + Lab rank + disagreement + intervening needs + continuous manager behavior + run pressure + tier depth + calibrated confidence",
    },
    draftPlanPriority: { labValue: 0.45, tierLossRisk: 0.15, replacementCost: 0.12, successfulRosterFrequency: 0.10, positionalNeed: 0.08, strategyPathValue: 0.05, leagueMarketDiscount: 0.05, penalties: ["reach cost", "redundancy"] },
    comparison: "Median is primary; IQR overlap, downside, variance, run count, and second-place gap determine tie language.",
    confidence: "Run count + outcome spread + leader separation + projection coverage + League Behavior coverage. Confidence never changes player quality.",
    seasonRates: "Event counts divided by simulated seasons; no normalized-score stretching.",
    predictionRetention: `Most recent ${PREDICTION_RETENTION_LIMIT} records per league`,
  };
}

const ZIP_CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = ZIP_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pushU16(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushU32(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function zipDateParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function createZipBlob(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const { dosTime, dosDate } = zipDateParts();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const localHeader = [];
    pushU32(localHeader, 0x04034b50);
    pushU16(localHeader, 20);
    pushU16(localHeader, 0x0800);
    pushU16(localHeader, 0);
    pushU16(localHeader, dosTime);
    pushU16(localHeader, dosDate);
    pushU32(localHeader, checksum);
    pushU32(localHeader, dataBytes.length);
    pushU32(localHeader, dataBytes.length);
    pushU16(localHeader, nameBytes.length);
    pushU16(localHeader, 0);
    chunks.push(new Uint8Array(localHeader), nameBytes, dataBytes);

    const centralHeader = [];
    pushU32(centralHeader, 0x02014b50);
    pushU16(centralHeader, 20);
    pushU16(centralHeader, 20);
    pushU16(centralHeader, 0x0800);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, dosTime);
    pushU16(centralHeader, dosDate);
    pushU32(centralHeader, checksum);
    pushU32(centralHeader, dataBytes.length);
    pushU32(centralHeader, dataBytes.length);
    pushU16(centralHeader, nameBytes.length);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU16(centralHeader, 0);
    pushU32(centralHeader, 0);
    pushU32(centralHeader, offset);
    centralDirectory.push(new Uint8Array(centralHeader), nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = [];
  pushU32(endRecord, 0x06054b50);
  pushU16(endRecord, 0);
  pushU16(endRecord, 0);
  pushU16(endRecord, files.length);
  pushU16(endRecord, files.length);
  pushU32(endRecord, centralSize);
  pushU32(endRecord, centralOffset);
  pushU16(endRecord, 0);

  return new Blob([...chunks, ...centralDirectory, new Uint8Array(endRecord)], { type: "application/zip" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBulkSimulationsZip() {
  const results = state.bulk.results;
  if (!results?.runs?.length) {
    state.bulk.exportStatus = "Run simulations first, then export the batch.";
    renderBulkSimulator();
    return;
  }

  const manifest = bulkExportManifest(results);
  const predictionLogs = state.learning.predictionLogs || [];
  const resolvedPredictions = predictionLogs.filter((row) => row.resolved);
  const behaviorProfiles = Array.from({ length: LEAGUE.teams }, (_, index) => managerBehaviorProfile(index + 1, state.mockSeed || 1, state.currentPick));
  const files = [
    { path: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { path: "metadata/formulas-and-versions.json", content: JSON.stringify(simulatorFormulaMetadata(), null, 2) },
    { path: "summary/summary.json", content: JSON.stringify(compactBulkSummaryForStorage(results.summary), null, 2) },
    { path: "summary/draft-plan.json", content: JSON.stringify(results.summary.draftPlan || null, null, 2) },
    { path: "summary/strategy-distributions.csv", content: bulkStrategySummaryCsv(results.summary) },
    { path: "summary/opening-build-distributions.csv", content: bulkBuildSummaryCsv(results.summary) },
    { path: "decision/counterfactual-results.json", content: JSON.stringify(compactCounterfactualForStorage(state.bulk.counterfactual?.results || []), null, 2) },
    { path: "availability/player-and-tier-survival.csv", content: bulkSurvivalCsv(results.summary.survival || []) },
    { path: "availability/player-survival.json", content: JSON.stringify((results.summary.survival || []).filter((row) => row.type === "player"), null, 2) },
    { path: "availability/tier-survival.json", content: JSON.stringify((results.summary.survival || []).filter((row) => row.type === "tier"), null, 2) },
    { path: "priority/draft-plan-priority.csv", content: bulkPriorityCsv(results.summary.priority || []) },
    { path: "priority/draft-plan-priority.json", content: JSON.stringify(compactPriorityForStorage(results.summary.priority || []), null, 2) },
    { path: "learning/prediction-log.json", content: JSON.stringify(predictionLogs, null, 2) },
    { path: "learning/prediction-versus-actual.json", content: JSON.stringify(resolvedPredictions, null, 2) },
    { path: "learning/calibration-summary.json", content: JSON.stringify(state.learning.calibrationSummary || calculateCalibrationSummary(predictionLogs), null, 2) },
    { path: "learning/manager-behavior-profiles.json", content: JSON.stringify(behaviorProfiles, null, 2) },
    { path: "analysis/post-draft-process-grades.json", content: JSON.stringify(state.learning.postDraftGrades || {}, null, 2) },
    { path: "runs/run-index.csv", content: bulkRunIndexCsv(results.runs) },
    { path: "picks/all-picks.csv", content: bulkAllPicksCsv(results.runs) },
    { path: "availability/user-pick-availability.csv", content: bulkAvailabilityCsv(results.runs) },
    { path: "training/training-runs.jsonl", content: bulkTrainingJsonl(results, manifest) },
    ...results.runs.map((run) => ({ path: `runs/run-${String(run.runIndex).padStart(3, "0")}.json`, content: JSON.stringify(bulkRunForExport(run), null, 2) })),
  ];
  const filenameDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const blob = createZipBlob(files);
  downloadBlob(blob, `fantasy-draft-lab-simulations-${filenameDate}.zip`);
  state.bulk.exportStatus = `Exported ${results.runs.length} runs with ${files.length} files for Google Drive or formula training.`;
  renderBulkSimulator();
}

function bulkStrategySchedule() {
  const fallback = state.bulk.mode === "compare" ? BULK_DEPTH_PRESETS[state.bulk.depth] : BULK_SINGLE_DEFAULT;
  const count = Math.max(1, Math.min(bulkSafeCountLimit(state.bulk.mode), Number(state.bulk.count) || fallback));
  if (state.bulk.mode === "single") return Array.from({ length: count }, () => state.bulk.strategy);
  return BULK_STRATEGIES.flatMap((strategy) => Array.from({ length: count }, () => strategy.id));
}

function scheduleBulkWork(callback) {
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => window.setTimeout(callback, 0));
    return;
  }
  window.setTimeout(callback, 0);
}

function yieldBulkWork() {
  return new Promise((resolve) => scheduleBulkWork(resolve));
}

function setBulkFinalizationStage(detail) {
  state.bulk.phase = "finalizing";
  state.bulk.phaseDetail = detail;
  updateBulkProgress();
  if ($("bulkResults") && !state.bulk.results?.summary) {
    $("bulkResults").innerHTML = `<div class="bulk-empty sim-running"><h3>Building the Draft Plan</h3><p>${escapeHtml(detail)}</p><div class="sim-skeleton"></div></div>`;
  }
}

function updateBulkProgress() {
  if (!$("bulkProgress")) return;
  const finalizing = state.bulk.running && state.bulk.phase === "finalizing";
  $("bulkProgress").hidden = !state.bulk.running && !state.bulk.cancelled;
  const percentComplete = finalizing ? 100 : state.bulk.total ? Math.round((state.bulk.progress / state.bulk.total) * 100) : 0;
  $("bulkProgressText").textContent = state.bulk.running
    ? finalizing
      ? state.bulk.phaseDetail || "Building the Draft Plan from completed simulations…"
      : `Running ${state.bulk.progress}/${state.bulk.total} scheduled simulations (${percentComplete}%).`
    : state.bulk.cancelled ? `Cancelled after ${state.bulk.progress}/${state.bulk.total} simulations.` : "Ready";
  $("bulkProgressBar").style.width = `${percentComplete}%`;
  $("runBulkSimBtn").disabled = state.bulk.running;
  if ($("cancelBulkSimBtn")) $("cancelBulkSimBtn").hidden = !state.bulk.running || finalizing;
  if ($("bulkScheduledSummary")) {
    const strategies = state.bulk.mode === "compare" ? BULK_STRATEGIES.length : 1;
    const safeLimit = bulkSafeCountLimit(state.bulk.mode);
    const effectiveCount = Math.min(state.bulk.count, safeLimit);
    const total = effectiveCount * strategies;
    const profile = bulkHardwareProfile();
    $("bulkScheduledSummary").textContent = `${effectiveCount} run${effectiveCount === 1 ? "" : "s"} per ${state.bulk.mode === "compare" ? "strategy" : "selected strategy"} · ${strategies} strateg${strategies === 1 ? "y" : "ies"} · ${total} total · ${bulkSeasonSimulationCount()} season samples/run · ${bulkSeasonWorkerLabel()} · ${profile.label}`;
  }
  if ($("bulkCountInput")) $("bulkCountInput").max = String(bulkSafeCountLimit(state.bulk.mode));
  if ($("exportBulkSimBtn")) $("exportBulkSimBtn").disabled = state.bulk.running || !state.bulk.results?.runs?.length;
  if ($("bulkExportStatus")) {
    $("bulkExportStatus").textContent = state.bulk.error || state.bulk.exportStatus || (
      state.bulk.results?.summary
        ? "Export includes Draft Plan, distributions, priority, survival, calibration, manager profiles, replay data, and training files."
        : ""
    );
  }
}

function cancelBulkSimulations() {
  if (!state.bulk.running) return;
  state.bulk.cancelRequested = true;
  state.bulk.exportStatus = "Cancellation requested. The current simulation will finish before stopping.";
  updateBulkProgress();
}

async function finishBulkSimulationBatch(runs, modelKey, { cancelled = false, warning = "" } = {}) {
  state.bulk.running = true;
  state.bulk.phase = "finalizing";
  state.bulk.cancelRequested = false;
  state.bulk.cancelled = cancelled;
  if (!runs.length) {
    state.bulk.running = false;
    state.bulk.phase = "idle";
    state.bulk.phaseDetail = "";
    state.bulk.results = null;
    state.bulk.error = cancelled ? "Simulation cancelled before any run completed." : "No simulations completed.";
    renderBulkSimulator();
    return;
  }

  try {
    const summary = await summarizeBulkResultsAsync(runs, setBulkFinalizationStage);
    if (warning) summary.finalizationWarnings.push(warning);
    state.bulk.results = { runs, summary, modelKey };
    state.bulk.draftPlan = summary.draftPlan;
    state.bulk.survival = summary.survival;
    state.bulk.priority = summary.priority;
    state.bulk.staleReason = "";
    state.bulk.selectedRunId = summary.examples[0]?.id || runs[0]?.id || null;
    state.bulk.exportStatus = cancelled
      ? `Simulation stopped after ${runs.length} completed runs. A partial Draft Plan was still built and is labeled with its sample size.`
      : summary.finalizationWarnings.length
        ? `Draft Plan ready with ${summary.finalizationWarnings.length} fallback warning${summary.finalizationWarnings.length === 1 ? "" : "s"}.`
        : "Simulation batch and Draft Plan ready. Export zip is available.";
    state.bulk.error = "";
    BULK_SIMULATION_CACHE.set(modelKey, state.bulk.results);
  } catch (error) {
    const summary = buildBulkSummaryBase(runs);
    const reason = `Detailed Draft Plan finalization failed, so a lightweight plan was created: ${error?.message || "unknown error"}`;
    summary.finalizationWarnings = [reason];
    summary.survival = [];
    summary.priority = PLAYERS.map((player, index) => basicDraftPlanPriorityRow(player, index));
    summary.draftPlan = fallbackDraftPlan(summary, reason);
    state.bulk.results = { runs, summary, modelKey };
    state.bulk.draftPlan = summary.draftPlan;
    state.bulk.survival = [];
    state.bulk.priority = summary.priority;
    state.bulk.selectedRunId = summary.examples[0]?.id || runs[0]?.id || null;
    state.bulk.exportStatus = "A lightweight Draft Plan was created from the completed simulations.";
    state.bulk.error = "";
    BULK_SIMULATION_CACHE.set(modelKey, state.bulk.results);
  }

  state.bulk.running = false;
  state.bulk.phase = "ready";
  state.bulk.phaseDetail = "";
  renderBulkSimulator();
  await yieldBulkWork();
  try { render(); } catch (error) {
    state.bulk.exportStatus = `Draft Plan is ready, but another workspace panel could not refresh: ${error?.message || "unknown render error"}`;
    renderBulkSimulator();
  }
  await yieldBulkWork();
  saveSimulatorState();
}

function startBulkSimulations() {
  if (state.bulk.running) return;
  state.bulk.mode = $("bulkModeSelect").value;
  state.bulk.depth = $("bulkDepthSelect")?.value || state.bulk.depth || "standard";
  const defaultCount = state.bulk.mode === "compare" ? BULK_DEPTH_PRESETS[state.bulk.depth] || BULK_DEPTH_PRESETS.standard : BULK_SINGLE_DEFAULT;
  const requestedCount = Math.max(1, Number($("bulkCountInput").value) || defaultCount);
  const safeLimit = bulkSafeCountLimit(state.bulk.mode);
  state.bulk.count = Math.min(requestedCount, safeLimit);
  $("bulkCountInput").value = state.bulk.count;
  const safetyMessage = requestedCount > safeLimit
    ? `The requested workload was reduced to ${safeLimit} run${safeLimit === 1 ? "" : "s"} per ${state.bulk.mode === "compare" ? "strategy" : "selected strategy"} to prevent browser timeouts on this device.`
    : "";
  state.bulk.strategy = $("bulkStrategySelect").value;
  state.bulk.randomizeRoom = $("bulkRandomizeRoomInput").checked;
  const schedule = bulkStrategySchedule();
  const modelKey = bulkSimulationModelKey();
  const cached = BULK_SIMULATION_CACHE.get(modelKey);
  if (cached?.runs?.length === schedule.length) {
    state.bulk.results = cached;
    state.bulk.draftPlan = cached.summary?.draftPlan || null;
    state.bulk.survival = cached.summary?.survival || [];
    state.bulk.priority = cached.summary?.priority || [];
    state.bulk.exportStatus = "Loaded deterministic results from the current input cache.";
    state.bulk.staleReason = "";
    state.bulk.phase = "ready";
    render();
    return;
  }
  const runs = [];
  state.bulk.running = true;
  state.bulk.phase = "simulating";
  state.bulk.phaseDetail = "";
  state.bulk.cancelRequested = false;
  state.bulk.cancelled = false;
  state.bulk.error = "";
  state.bulk.progress = 0;
  state.bulk.total = schedule.length;
  state.bulk.results = null;
  state.bulk.draftPlan = null;
  state.bulk.survival = [];
  state.bulk.priority = [];
  state.bulk.selectedRunId = null;
  state.bulk.exportStatus = safetyMessage;
  renderBulkSimulator();

  const runBatch = async () => {
    if (state.bulk.cancelRequested) {
      await finishBulkSimulationBatch(runs, modelKey, { cancelled: true });
      return;
    }
    try {
      const batchSize = 1;
      const start = state.bulk.progress;
      const end = Math.min(schedule.length, start + batchSize);
      for (let index = start; index < end; index += 1) {
        if (state.bulk.cancelRequested) break;
        const run = simulateBulkDraft(schedule[index], index, modelKey);
        runs.push(await enrichBulkRunWithSeasonSimulation(run));
        state.bulk.progress = index + 1;
      }
      updateBulkProgress();
      if (state.bulk.cancelRequested) {
        await finishBulkSimulationBatch(runs, modelKey, { cancelled: true });
        return;
      }
      if (state.bulk.progress < schedule.length) {
        scheduleBulkWork(runBatch);
        return;
      }
      await finishBulkSimulationBatch(runs, modelKey);
    } catch (error) {
      if (runs.length) {
        await finishBulkSimulationBatch(runs, modelKey, {
          cancelled: true,
          warning: `The simulation batch stopped early: ${error?.message || "unknown simulation error"}`,
        });
      } else {
        state.bulk.running = false;
        state.bulk.phase = "idle";
        state.bulk.error = `Simulation failed: ${error?.message || "Unknown error"}. Draft state was restored.`;
        state.bulk.cancelRequested = false;
        renderBulkSimulator();
      }
    }
  };

  scheduleBulkWork(runBatch);
}

function marketOpponentPick(team, pickNumber, seed = state.mockSeed || 1, runIndex = 0) {
  const profile = managerBehaviorProfile(team, seed, runIndex);
  const candidates = candidatePoolForTeam(team, pickNumber, Math.max(22, Math.round(30 + profile.reachFrequency * 16)));
  if (!candidates.length) return null;
  return candidates
    .map((player) => ({ player, score: behaviorProfileDraftScore(player, team, pickNumber, profile, seed, runIndex) }))
    .sort((a, b) => a.score - b.score || a.player.consensusRank - b.player.consensusRank)[0].player;
}

function personaPick(team, pickNumber) {
  return marketOpponentPick(team, pickNumber, state.mockSeed || 1, state.picks.length);
}

function predictionDraftId() {
  return state.viewedDraftId || `active-${String(state.activeLeagueId || LEAGUE.id || "default")}`;
}

function currentDraftStateIdentifier(pickNumber = state.currentPick) {
  return `${APP_VERSION}|${state.activeLeagueId}|${pickNumber}|${state.picks.map((pick) => `${pick.pick}:${pick.player.id}`).join(",")}`;
}

function predictionConfidenceForProfile(profile, candidateCount) {
  const history = Number(profile?.historicalSample || 0);
  const calibration = Number(profile?.calibrationSample || 0);
  if (candidateCount < 3) return "Low";
  if (history >= 45 && (calibration === 0 || calibration >= 15)) return "High";
  if (history >= 12 || calibration >= 8) return "Moderate";
  return "Low";
}

function predictionForPick(team, pickNumber) {
  const profile = managerBehaviorProfile(team, state.mockSeed || 1, pickNumber);
  const candidates = candidatePoolForTeam(team, pickNumber, Math.max(18, Math.round(24 + profile.reachFrequency * 18)))
    .map((player) => ({ player, score: behaviorProfileDraftScore(player, team, pickNumber, profile, state.mockSeed || 1, pickNumber) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 12);
  if (!candidates.length) return null;
  const minimum = candidates[0].score;
  const weighted = candidates.map((row) => ({ ...row, weight: Math.exp(-(row.score - minimum) / 8) }));
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0) || 1;
  const positionProbabilities = {};
  weighted.forEach((row) => {
    positionProbabilities[row.player.position] = (positionProbabilities[row.player.position] || 0) + row.weight / totalWeight;
  });
  const sortedPositions = Object.entries(positionProbabilities).sort((a, b) => b[1] - a[1]);
  const top = weighted[0];
  const market = Number.isFinite(top.player.adp) ? top.player.adp : top.player.consensusRank;
  const previous = [...state.picks].sort((a, b) => b.pick - a.pick).slice(0, 2);
  const continuedRun = previous.length === 2 && previous[0].player.position === previous[1].player.position;
  const survival = playerSurvivalEstimate(top.player, nextPickForTeam(state.userTeam, pickNumber));
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    id: `prediction-${stableStringHash(`${currentDraftStateIdentifier(pickNumber)}|${team}`)}`,
    leagueId: String(state.activeLeagueId || LEAGUE.id || "default"),
    draftId: predictionDraftId(),
    timestamp: new Date().toISOString(),
    draftStateIdentifier: currentDraftStateIdentifier(pickNumber),
    pickNumber,
    round: draftOrderFor(pickNumber).round,
    team,
    manager: teamName(team),
    personaSource: personaAssignmentSource(team),
    personaId: profile.personaId,
    historicalSampleSize: profile.historicalSample,
    predictedPositionProbabilities: Object.fromEntries(sortedPositions),
    predictedTopPosition: sortedPositions[0]?.[0] || "",
    predictedTopTwoPositions: sortedPositions.slice(0, 2).map(([position]) => position),
    predictedTopCandidates: weighted.slice(0, 5).map((row) => ({
      playerId: row.player.id,
      playerName: row.player.name,
      position: row.player.position,
      tier: row.player.tier,
      probability: row.weight / totalWeight,
    })),
    predictedTopPlayerId: top.player.id,
    predictedTopTier: `${top.player.position}-${top.player.tier || "unknown"}`,
    predictedReachLikelihood: clampNumber(profile.reachFrequency * 0.65 + Math.max(0, market - pickNumber) / 40, 0, 1),
    predictedRunBehavior: continuedRun ? (profile.runChasing >= profile.runAvoidance ? "chase" : "avoid") : profile.runStarting >= 0.55 ? "start" : "neutral",
    predictedSurvival: { playerId: top.player.id, tier: `${top.player.position}-${top.player.tier || "unknown"}`, probability: survival.survivalProbability, targetPick: nextPickForTeam(state.userTeam, pickNumber) },
    confidence: predictionConfidenceForProfile(profile, candidates.length),
    resolved: false,
  };
}

function ensurePredictionForPick(team, pickNumber) {
  if (!isLiveDraftMode() || Number(team) === Number(state.userTeam) || state.viewedDraftId) return null;
  const stateId = currentDraftStateIdentifier(pickNumber);
  const existing = (state.learning.predictionLogs || []).find((row) => !row.resolved && row.draftStateIdentifier === stateId && Number(row.team) === Number(team));
  if (existing) return existing;
  const prediction = predictionForPick(team, pickNumber);
  if (!prediction) return null;
  state.learning.predictionLogs = [...(state.learning.predictionLogs || []), prediction].slice(-PREDICTION_RETENTION_LIMIT);
  saveSimulatorState();
  return prediction;
}

function resolvePredictionForActualPick(pick) {
  if (!pick || !isLiveDraftMode() || Number(pick.team) === Number(state.userTeam)) return;
  const prediction = [...(state.learning.predictionLogs || [])].reverse().find((row) => !row.resolved && Number(row.pickNumber) === Number(pick.pick) && Number(row.team) === Number(pick.team));
  if (!prediction) return;
  const market = Number.isFinite(pick.player.adp) ? pick.player.adp : pick.player.consensusRank;
  const previous = state.picks.filter((row) => row.pick < pick.pick).sort((a, b) => b.pick - a.pick).slice(0, 2);
  const continuedRun = previous.length === 2 && previous[0].player.position === previous[1].player.position && pick.player.position === previous[0].player.position;
  const startedRun = previous.length < 2 || previous[0]?.player.position !== pick.player.position;
  Object.assign(prediction, {
    resolved: true,
    resolvedAt: new Date().toISOString(),
    actualPick: pick.pick,
    actualPosition: pick.player.position,
    actualPlayerId: pick.player.id,
    actualPlayerName: pick.player.name,
    actualPlayerTier: `${pick.player.position}-${pick.player.tier || "unknown"}`,
    actualAdpDifference: Number.isFinite(market) ? market - pick.pick : null,
    actualRunStarted: null,
    actualRunContinued: continuedRun,
    predictedPositionCorrect: prediction.predictedTopPosition === pick.player.position,
    predictedTopTwoCorrect: prediction.predictedTopTwoPositions?.includes(pick.player.position) || false,
    predictedPlayerCorrect: prediction.predictedTopPlayerId === pick.player.id,
    predictedTierCorrect: prediction.predictedTopTier === `${pick.player.position}-${pick.player.tier || "unknown"}`,
    reachDirectionCorrect: prediction.predictedReachLikelihood >= 0.5 ? market - pick.pick >= 4 : market - pick.pick < 4,
  });
  const positionProbability = Number(prediction.predictedPositionProbabilities?.[pick.player.position] || 0);
  prediction.positionBrier = Object.entries(prediction.predictedPositionProbabilities || {}).reduce((sum, [position, probability]) => {
    const outcome = position === pick.player.position ? 1 : 0;
    return sum + (Number(probability) - outcome) ** 2;
  }, 0);
  prediction.actualPositionProbability = positionProbability;
  state.learning.calibrationSummary = calculateCalibrationSummary(state.learning.predictionLogs);
  saveSimulatorState();
}


function resolveRunPredictions(completedPick) {
  const logs = state.learning.predictionLogs || [];
  logs.forEach((prediction) => {
    if (!prediction.resolved || prediction.runResolved || completedPick.pick < Number(prediction.pickNumber || 0) + 2) return;
    const sequence = state.picks.filter((pick) => pick.pick >= prediction.pickNumber && pick.pick <= prediction.pickNumber + 2).sort((a, b) => a.pick - b.pick);
    if (sequence.length < 3) return;
    const position = sequence[0].player?.position;
    const nextSame = sequence.slice(1).filter((pick) => pick.player?.position === position).length;
    const previous = state.picks.filter((pick) => pick.pick < prediction.pickNumber).sort((a, b) => b.pick - a.pick).slice(0, 2);
    const wasAlreadyRunning = previous.filter((pick) => pick.player?.position === position).length >= 2;
    prediction.runResolved = true;
    prediction.actualRunStarted = !wasAlreadyRunning && nextSame >= 2;
    prediction.actualRunContinued = wasAlreadyRunning && nextSame >= 1;
    prediction.runStartCorrect = prediction.predictedRunBehavior === "start" ? prediction.actualRunStarted : !prediction.actualRunStarted;
    prediction.runChaseCorrect = prediction.predictedRunBehavior === "chase" ? prediction.actualRunContinued : !prediction.actualRunContinued;
  });
}

function resolveOutstandingSurvivalPredictions(completedPick) {
  const logs = state.learning.predictionLogs || [];
  logs.forEach((prediction) => {
    const forecast = prediction.predictedSurvival;
    if (!forecast || prediction.survivalResolved) return;
    const targetPick = Number(forecast.targetPick || 0);
    if (completedPick.player?.id === forecast.playerId && completedPick.pick < targetPick) {
      prediction.survivalResolved = true;
      prediction.survivalActual = false;
      prediction.survivalCorrect = Number(forecast.probability) < 0.5;
      prediction.snipeOccurred = true;
      prediction.snipeCorrect = Number(forecast.probability) < 0.5;
      return;
    }
    if (targetPick && completedPick.pick >= targetPick) {
      const draftedBeforeTarget = state.picks.some((pick) => pick.player?.id === forecast.playerId && pick.pick < targetPick);
      prediction.survivalResolved = true;
      prediction.survivalActual = !draftedBeforeTarget;
      prediction.survivalCorrect = (Number(forecast.probability) >= 0.5) === !draftedBeforeTarget;
      prediction.snipeOccurred = draftedBeforeTarget;
      prediction.snipeCorrect = (Number(forecast.probability) < 0.5) === draftedBeforeTarget;
    }
  });
  state.learning.calibrationSummary = calculateCalibrationSummary(logs);
}

function calibrationGroup(rows, keyFn) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.entries()].map(([label, items]) => ({
    label,
    count: items.length,
    positionAccuracy: average(items.map((row) => row.predictedPositionCorrect ? 1 : 0)),
    topTwoAccuracy: average(items.map((row) => row.predictedTopTwoCorrect ? 1 : 0)),
    tierAccuracy: average(items.map((row) => row.predictedTierCorrect ? 1 : 0)),
    brierScore: average(items.map((row) => Number(row.positionBrier)).filter(Number.isFinite)),
  })).sort((a, b) => b.count - a.count);
}

function calculateCalibrationSummary(logs = []) {
  const resolved = (Array.isArray(logs) ? logs : []).filter((row) => row.resolved);
  if (!resolved.length) return { schemaVersion: SIMULATOR_SCHEMA_VERSION, evaluated: 0, conclusion: "No predictions have been evaluated yet." };
  const positionAccuracy = average(resolved.map((row) => row.predictedPositionCorrect ? 1 : 0));
  const topTwoAccuracy = average(resolved.map((row) => row.predictedTopTwoCorrect ? 1 : 0));
  const tierAccuracy = average(resolved.map((row) => row.predictedTierCorrect ? 1 : 0));
  const brierScore = average(resolved.map((row) => Number(row.positionBrier)).filter(Number.isFinite));
  const byManager = calibrationGroup(resolved, (row) => row.manager || `Team ${row.team}`);
  const byRound = calibrationGroup(resolved, (row) => `Round ${row.round}`);
  const byPosition = calibrationGroup(resolved, (row) => row.actualPosition || "Unknown");
  const byConfidence = calibrationGroup(resolved, (row) => row.confidence || "Low");
  const conclusion = positionAccuracy >= 0.55
    ? `Position forecasts are directionally useful across ${resolved.length} evaluated picks; continue to treat player-level calls as less certain.`
    : `Position forecasts remain noisy across ${resolved.length} evaluated picks; survival and snipe confidence is automatically reduced.`;
  return {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    evaluated: resolved.length,
    positionAccuracy,
    topTwoAccuracy,
    tierAccuracy,
    survivalAccuracy: average(resolved.filter((row) => typeof row.survivalCorrect === "boolean").map((row) => row.survivalCorrect ? 1 : 0)),
    snipeAccuracy: average(resolved.filter((row) => typeof row.snipeCorrect === "boolean").map((row) => row.snipeCorrect ? 1 : 0)),
    reachDirectionAccuracy: average(resolved.map((row) => row.reachDirectionCorrect ? 1 : 0)),
    runStartPrecision: average(resolved.filter((row) => typeof row.runStartCorrect === "boolean").map((row) => row.runStartCorrect ? 1 : 0)),
    runChasePrecision: average(resolved.filter((row) => typeof row.runChaseCorrect === "boolean").map((row) => row.runChaseCorrect ? 1 : 0)),
    brierScore,
    byManager,
    byRound,
    byPosition,
    byConfidence,
    conclusion,
  };
}

function makePick(player) {
  if (!player) return;
  state.candidateOutcome = { status: "idle", key: "", results: [], error: "" };
  skipLockedPicks();
  const order = draftOrderFor(state.currentPick);
  ensurePredictionForPick(order.team, state.currentPick);
  state.viewedDraftId = null;
  const completedPick = { pick: state.currentPick, ...order, player };
  state.picks.push(completedPick);
  state.draftedIds.add(player.id);
  state.picks.sort((a, b) => a.pick - b.pick);
  resolvePredictionForActualPick(completedPick);
  resolveOutstandingSurvivalPredictions(completedPick);
  resolveRunPredictions(completedPick);
  state.currentPick += 1;
  skipLockedPicks();
  clearPositionalEdgeCache();
  scheduleLightweightDecisionRefresh("The draft board changed after a pick.");
  render();
}

function simulateRoomUntilUserPickSilent() {
  skipLockedPicks();
  while (state.currentPick <= LEAGUE.teams * LEAGUE.rounds) {
    const order = draftOrderFor(state.currentPick);
    if (order.team === state.userTeam) break;
    const pick = personaPick(order.team, state.currentPick);
    if (!pick) break;
    makePickSilent(pick);
    skipLockedPicks();
  }
}

function simUntilUserPick() {
  if (isLiveDraftMode()) {
    render();
    return;
  }
  runDraftSimulation({
    title: "Simulating to your next pick",
    message: "The room is drafting. Recent picks will appear here.",
    untilNextUserPick: true,
    includeUserTurns: false,
  });
}

function simRestOfDraft() {
  if (isLiveDraftMode()) return;
  runDraftSimulation({
    title: "Simulating the rest of the draft",
    message: "The room and your future picks are being auto-selected.",
    untilNextUserPick: false,
    includeUserTurns: true,
  });
}

function makeUserPickAndContinue(player) {
  if (!player) return;
  if (isLiveDraftMode()) {
    makePick(player);
    return;
  }
  runDraftSimulation({
    title: "Auto-picking and simulating the room",
    message: "Your pick is locked in, then the room drafts back to you.",
    userPick: player,
    untilNextUserPick: true,
    includeUserTurns: false,
  });
}

function autoPickForCurrentTurn() {
  const order = draftOrderFor(Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds));
  const targetTeam = isLiveDraftMode() ? order.team : state.userTeam;
  const [best] = recommendations(targetTeam, state.currentPick, 1);
  if (!best) return;
  makeUserPickAndContinue(best);
}

function simUntilUserPickOnReset() {
  if (isLiveDraftMode()) {
    render();
    return;
  }
  simulateRoomUntilUserPickSilent();
  render();
}

function resetDraft(options = {}) {
  clearPositionalEdgeCache();
  state.candidateOutcome = { status: "idle", key: "", results: [], error: "" };
  state.viewedDraftId = null;
  state.mockSeed = stableStringHash(`${state.activeLeagueId}|${Date.now()}|reset`) / 1000;
  state.picks = buildKeeperPicks();
  state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
  state.currentPick = 1;
  skipLockedPicks();
  if (!options.preserveSimulator) invalidateSimulatorDerived("Draft, keeper, ranking, or league inputs changed.", { keepSummary: true });
  simUntilUserPickOnReset();
  if (!options.preserveAssistant) resetAssistantSession("New draft started.");
}

function undoLastPick() {
  if (state.viewedDraftId) return;
  state.candidateOutcome = { status: "idle", key: "", results: [], error: "" };
  const manualPicks = state.picks.filter((pick) => !pick.keeper);
  const lastPick = manualPicks.sort((a, b) => b.pick - a.pick)[0];
  if (!lastPick) return;
  state.picks = state.picks.filter((pick) => pick !== lastPick);
  state.draftedIds = new Set(state.picks.map((pick) => pick.player.id));
  state.currentPick = lastPick.pick;
  skipLockedPicks();
  clearPositionalEdgeCache();
  invalidateSimulatorDerived("A pick was undone.", { keepSummary: true });
  render();
}

function formatPlayer(player) {
  const adp = Number.isFinite(player.adp) ? ` - ADP ${Math.round(player.adp * 10) / 10}` : "";
  const sourceLabel = player.sourceNames?.length ? player.sourceNames.join(" + ") : "";
  const sources = player.sourceCount ? ` - ${player.sourceCount} source${player.sourceCount === 1 ? "" : "s"}${sourceLabel ? ` (${sourceLabel})` : ""}` : "";
  return `${player.position} - ${player.team}${adp}${sources}`;
}

function listItemsHtml(items, emptyText = "None") {
  const values = (items || []).filter(Boolean);
  if (!values.length) return `<p class="analysis-empty">${escapeHtml(emptyText)}</p>`;
  return `<ul>${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function rankAnalysisDetailHtml(player, options = {}) {
  const analysis = player.labAnalysis || buildRankAnalysis(player);
  const compact = Boolean(options.compact);
  const sourceRanks = analysis.sourceLines?.length ? analysis.sourceLines : ["No weighted source ranks available."];
  const guideEvidence = (analysis.guideEvidence || []).map((item) => `${item.label}: ${item.text}`);
  const tagText = (analysis.tags || []).map(archetypeTagLabel);
  return `
    <div class="rank-analysis-panel ${compact ? "compact" : ""}">
      <div class="rank-analysis-metrics">
        <span><strong>${escapeHtml(analysis.confidenceLabel)}</strong> confidence</span>
        <span><strong>${escapeHtml(analysis.agreementLabel)}</strong> agreement</span>
        <span><strong>${escapeHtml(analysis.sourceRange)}</strong> ${analysis.sourceLines?.length > 1 ? "rank range" : "coverage"}</span>
      </div>
      <div class="rank-analysis-grid">
        <section>
          <h4>Source evidence</h4>
          ${listItemsHtml(sourceRanks)}
        </section>
        <section>
          <h4>League fit</h4>
          ${listItemsHtml(analysis.leagueReasons, "No material league adjustment.")}
        </section>
        <section>
          <h4>Draft Guide evidence</h4>
          ${listItemsHtml([...(analysis.guidePositive || []), ...(analysis.guideRisks || [])], "No player-specific guide evidence imported.")}
          ${guideEvidence.length ? `<div class="analysis-note-list">${listItemsHtml(guideEvidence)}</div>` : ""}
          ${tagText.length ? `<p class="analysis-tags"><strong>Tags:</strong> ${escapeHtml(tagText.join(" · "))}</p>` : ""}
        </section>
        <section>
          <h4>Draft Plan evidence</h4>
          ${currentDraftPlanPriority(player.id) ? listItemsHtml([currentDraftPlanPriority(player.id).explanation, ...(currentDraftPlanPriority(player.id).tags || [])]) : `<p class="analysis-empty">Run the Draft Simulator to calculate dynamic acquisition priority. Lab Rank remains unchanged.</p>`}
        </section>
        <section>
          <h4>Confidence and limitations</h4>
          ${listItemsHtml(analysis.confidenceReasons || [])}
          ${(analysis.warnings || []).length ? `<div class="analysis-warning">${listItemsHtml(analysis.warnings)}</div>` : ""}
        </section>
      </div>
      <p class="rank-analysis-final"><strong>Final read:</strong> ${escapeHtml(analysis.finalReason)}</p>
    </div>
  `;
}

function playerContext(player) {
  const details = [
    player.depthChartRole ? `Role: ${player.depthChartRole}` : "",
    player.depthChartRank ? `Depth: ${player.position}${player.depthChartRank}` : "",
    player.competition ? `Competition: ${player.competition}` : "",
    (player.tags || []).length ? `Tags: ${player.tags.map(archetypeTagLabel).join(", ")}` : "",
  ].filter(Boolean);
  const sourceSummary = player.sourceSummary
    ? `
      <div class="context-block source-summary-block">
        <strong>Uploaded Source Summary${player.sourceSummarySource ? ` - ${escapeHtml(player.sourceSummarySource)}` : ""}</strong>
        <p>${escapeHtml(player.sourceSummary)}</p>
      </div>
    `
    : `
      <div class="context-block source-summary-block muted-block">
        <strong>Uploaded Source Summary</strong>
        <p>No player-specific summary is loaded. Add <code>summary</code>, <code>upside_note</code>, <code>risk_note</code>, or <code>tags</code> columns to improve the Lab Analysis.</p>
      </div>
    `;
  return `
    <div class="player-context">
      <div class="context-block ai-analysis-block">
        <strong>Lab Analysis — Why This Rank</strong>
        <p>${escapeHtml(player.labAnalysis?.summary || player.labExplanation || "No Lab Analysis available yet.")}</p>
        ${rankAnalysisDetailHtml(player, { compact: true })}
      </div>
      ${sourceSummary}
      <small>${escapeHtml(details.join(" - "))}</small>
    </div>
  `;
}

function pickTake(player, team = state.userTeam) {
  const roster = rosterFor(team);
  const counts = positionCounts(roster);
  const reason = player.position === "RB" && (counts.RB || 0) < LEAGUE.roster.RB
    ? "fills a scarce RB starter slot"
    : player.position === "WR" && (counts.WR || 0) < LEAGUE.roster.WR
      ? "fills an open WR starter and protects flex depth"
      : player.position === "TE" && !counts.TE
        ? "captures an open TE starter and possible tier edge"
        : player.position === "QB" && !counts.QB
          ? "fills your starting QB slot"
          : "is the strongest customized-board value";
  const personaEvidence = personaRecommendationEvidence(player, team, state.currentPick, roster);
  const scoutingEvidence = scoutingSnipeEvidence(player, team, state.currentPick);
  return `Why This Pick: ${player.name} ${reason}. Lab #${Math.round(player.consensusRank)}, Base #${Math.round(player.baseConsensusRank || player.consensusRank)}. ${personaEvidence.reason} ${scoutingEvidence.text}`;
}

function playerCard(player, includeButton = false, team = state.userTeam) {
  return `
    <div class="player-card">
      <button class="player-name player-name-button" type="button" data-player-detail="${player.id}">${escapeHtml(player.name)}</button>
      <span class="badge">${player.position} T${player.tier}</span>
      <div class="meta">${formatPlayer(player)}</div>
      ${includeButton ? `<button data-draft="${player.id}">Draft</button>` : ""}
      <div class="take">${escapeHtml(pickTake(player, team))}</div>
      ${includeButton ? playerDecisionAnalysisHtml(player, team, state.currentPick) : ""}
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
        <div class="tier-player">
          <button class="player-name-button" type="button" data-player-detail="${player.id}">
            <span>${escapeHtml(player.name)}</span>
          </button>
          <b>${player.position}</b>
          <button class="draft-mini-button" type="button" data-draft="${player.id}">Draft</button>
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

function percentRate(value) { return Number.isFinite(value) ? `${Math.round(value * 100)}%` : "—"; }
function ppDifference(leader, other) { return Number.isFinite(leader) && Number.isFinite(other) ? Math.max(0, (leader - other) * 100) : 0; }
function riskLabelForOutcome(result) { return result.downsideRate >= 0.16 || result.player.injuryNote ? "High" : result.downsideRate >= 0.08 || result.player.riskNote ? "Medium" : "Low"; }
function starterImpactLabel(result) { return result.starterImpact >= 1.5 ? `+${result.starterImpact.toFixed(1)} pts/wk` : result.starterImpact > 0.15 ? `+${result.starterImpact.toFixed(1)} pts/wk` : "Depth impact"; }
function survivalDisplay(estimate) { return estimate.confidence === "Low" ? estimate.label : `${estimate.label} (${Math.round(estimate.survivalProbability * 100)}%)`; }

function renderCurrentPickHeader(statusLabel) {
  const total = LEAGUE.teams * LEAGUE.rounds, done = state.currentPick > total;
  const order = done ? null : draftOrderFor(state.currentPick), next = nextPickForTeam(state.userTeam, state.currentPick);
  const roster = rosterFor(state.userTeam), paths = starterNeedsForRoster(roster).filter((item) => !["K", "DEF"].includes(item));
  $("draftPickNumber").textContent = done ? "Complete" : `${order.label} · Pick ${state.currentPick}`;
  $("draftRoundNumber").textContent = done ? "—" : `Round ${order.round}`;
  $("draftingTeamName").textContent = done ? "Draft complete" : activeTeamName(order.team);
  $("picksUntilNext").textContent = next ? String(Math.max(0, next - state.currentPick - 1)) : "None";
  $("openStarterPaths").textContent = paths.length ? [...new Set(paths)].join(" / ") : "Starters covered";
  $("recommendationStatus").textContent = statusLabel;
}

function recommendationExplanation(result, alternative) {
  const survival = result.survival || playerSurvivalEstimate(result.player);
  const altText = alternative ? `${alternative.player.name} was ${ppDifference(result.estimatedPlayoffRate, alternative.estimatedPlayoffRate).toFixed(1)} percentage points lower in the candidate model.` : "No comparable alternative completed the model.";
  const risk = result.player.injuryNote || result.player.riskNote || (result.stability > 0.055 ? "Simulation results varied across draft completions." : `The downside model placed this roster last in ${percentRate(result.downsideRate)} of seasons.`);
  return `<details class="recommendation-explain"><summary>Explain Recommendation</summary><div class="explanation-grid">
    <p><strong>Why this player</strong><span>${result.player.name} improves the best starting lineup by ${result.starterImpact.toFixed(1)} projected points per week.</span></p>
    <p><strong>Why now</strong><span>${survival.explanation} ${survival.label}.</span></p>
    <p><strong>Why over the closest alternative</strong><span>${altText}</span></p>
    <p><strong>Main risk</strong><span>${escapeHtml(risk)}</span></p>
  </div></details>`;
}

function decisionCandidateCard(result, leaderRate, label) {
  return `<article class="decision-candidate ${label === "Recommended" ? "leader" : ""}">
    <div><span class="decision-label">${label}</span><button class="player-name-button" type="button" data-player-detail="${result.player.id}"><strong>${escapeHtml(result.player.name)}</strong></button><small>${result.player.position} · ${result.player.team}</small></div>
    <dl><div><dt>Playoff rate</dt><dd>${percentRate(result.estimatedPlayoffRate)}</dd></div><div><dt>From leader</dt><dd>${label === "Recommended" ? "Leader" : `-${ppDifference(leaderRate, result.estimatedPlayoffRate).toFixed(1)} pp`}</dd></div>
    <div><dt>Starter impact</dt><dd>${starterImpactLabel(result)}</dd></div><div><dt>Survival</dt><dd>${survivalDisplay(result.survival)}</dd></div><div><dt>Risk</dt><dd>${riskLabelForOutcome(result)}</dd></div></dl>
    <button type="button" data-draft="${result.player.id}">Draft</button>
  </article>`;
}

function renderPickWindow(primary = null) {
  const last = activePicks().slice(-6), next = nextPickForTeam(state.userTeam, state.currentPick);
  const teams = [];
  if (next) for (let pick = state.currentPick + 1; pick < next; pick += 1) { const team = draftOrderFor(pick).team; if (team !== state.userTeam && !teams.includes(team)) teams.push(team); }
  const teamRows = teams.slice(0, 6).map((team) => `<li><strong>${escapeHtml(activeTeamName(team))}</strong><span>${needsSummaryForTeam(team).slice(0, 2).join(" / ")}</span></li>`).join("");
  const recentPositions = last.reduce((counts, pick) => { counts[pick.player.position] = (counts[pick.player.position] || 0) + 1; return counts; }, {});
  const run = Object.entries(recentPositions).sort((a, b) => b[1] - a[1])[0];
  const survival = primary?.survival;
  $("pickWindow").innerHTML = `<div class="pick-window-heading"><div><p class="eyebrow">Pick Window</p><h3>What happens before your next turn</h3></div><strong>${next ? pickLabel(next) : "No future selection"}</strong></div>
    <div class="pick-window-grid"><section><h4>Last six selections</h4><p>${last.length ? last.map((pick) => `${pick.player.name} (${pick.player.position})`).join(" · ") : "No selections yet."}</p></section>
    <section><h4>Teams in the window</h4><ul>${teamRows || "<li>No intervening teams.</li>"}</ul></section>
    <section><h4>Pressure and plan</h4><p>${run ? `${run[0]} leads the last-six run with ${run[1]} selections.` : "No positional run yet."} ${survival ? `${primary.player.name}: ${survivalDisplay(survival)}.` : ""}</p><p><strong>Next-turn plan:</strong> ${next ? `Recheck ${rosterNeedLabel(rosterFor(state.userTeam))} and target the deepest surviving tier.` : "Finish the current roster."}</p></section></div>`;
}


function draftRoomPlanStrip() {
  const status = currentPlanStatus();
  const plan = state.bulk.draftPlan;
  const objective = plan?.objectives?.find((row) => Number(row.round) === Number(draftOrderFor(Math.min(state.currentPick, LEAGUE.teams * LEAGUE.rounds)).round));
  const threats = (state.bulk.priority || []).filter((row) => row.snipeThreats?.length).slice(0, 3).flatMap((row) => row.snipeThreats).slice(0, 3);
  return `<section class="draft-room-plan-strip" aria-label="Current Draft Plan status">
    <div><span class="plan-status-label">${escapeHtml(status.label)}</span><strong>${escapeHtml(objective?.primary || plan?.recommendedOpening || "No active Draft Plan")}</strong><p>${escapeHtml(status.reason)}</p></div>
    <div><span>Current objective</span><b>${escapeHtml(objective?.primary || "Use current outcome analysis")}</b></div>
    <div><span>Pivot rule</span><b>${escapeHtml(objective?.trigger || plan?.pivotRules?.[0] || "Refresh if a target tier depletes")}</b></div>
    <div><span>Main snipe threats</span><b>${escapeHtml(threats.join(", ") || "No calibrated threat identified")}</b></div>
    <button type="button" data-refresh-counterfactual>Refresh decision analysis</button>
  </section>`;
}

function renderRecommendations() {
  const viewedDraft = state.completedDrafts.find((draft) => draft.id === state.viewedDraftId);
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (viewedDraft) {
    renderCurrentPickHeader("Read-only review");
    $("decisionCenter").innerHTML = `<div class="decision-empty"><p class="eyebrow">Saved draft</p><h2>${escapeHtml(viewedDraft.name)}</h2><p>Recommendations are disabled in read-only review. Return to Current draft to resume live modeling.</p></div>`;
    renderPickWindow(); return;
  }
  if (state.currentPick > total) {
    renderCurrentPickHeader("Draft complete");
    $("decisionCenter").innerHTML = `<div class="decision-empty"><p class="eyebrow">Decision Center</p><h2>Draft complete</h2><p>Save this board to the archive or open Post-draft Analysis for simulated qualification results.</p></div>`;
    renderPickWindow(); return;
  }
  const order = draftOrderFor(state.currentPick);
  if (order.team !== state.userTeam) {
    renderCurrentPickHeader("Limited data");
    $("decisionCenter").innerHTML = `<div class="decision-empty"><p class="eyebrow">Decision Center</p><h2>Waiting for your selection</h2><p>The outcome model runs at user picks. Current drafting team: ${escapeHtml(activeTeamName(order.team))}.</p></div>`;
    renderPickWindow(); return;
  }
  startCandidateOutcomeRecommendations();
  if (state.candidateOutcome.status === "calculating") {
    renderCurrentPickHeader("Calculating");
    $("decisionCenter").innerHTML = `<div class="decision-calculating"><span class="calculation-spinner" aria-hidden="true"></span><div><p class="eyebrow">Decision Center</p><h2>Calculating candidate outcomes</h2><p>Completing deterministic draft and season simulations for the strongest 8–12 candidates. The board remains usable. <span id="candidateProgress">${state.candidateOutcome.progress || 0}/${state.candidateOutcome.total || "—"} trials</span></p></div></div>`;
    renderPickWindow(); return;
  }
  const results = currentOutcomeResults();
  if (!results.length) {
    const recs = recommendations(state.userTeam, state.currentPick, 3), best = recs[0];
    renderCurrentPickHeader("Fallback");
    $("decisionCenter").innerHTML = best ? `<div class="decision-empty"><p class="eyebrow">Board-based recommendation — outcome simulation unavailable.</p><h2>${escapeHtml(best.name)}</h2><p>${escapeHtml(state.candidateOutcome.error || "Insufficient projection or simulation data.")}</p><div class="button-row"><button class="primary" data-draft="${best.id}">Draft ${escapeHtml(best.name)}</button><button data-player-detail="${best.id}">View Player</button></div></div>` : `<p class="empty">No recommendation available.</p>`;
    renderPickWindow(); return;
  }
  const leader = results[0], second = results[1];
  const pivot = results.find((item, index) => index > 0 && item.player.position !== leader.player.position) || results[2];
  const comparison = [leader, second, pivot].filter((item, index, array) => item && array.findIndex((other) => other.playerId === item.playerId) === index).slice(0, 3);
  const delta = second ? ppDifference(leader.estimatedPlayoffRate, second.estimatedPlayoffRate) : 0;
  renderCurrentPickHeader(leader.confidence === "Low" ? "Limited data" : "Ready");
  const sentence = `${leader.player.name} produced a ${percentRate(leader.estimatedPlayoffRate)} estimated playoff rate${second ? `, ${delta.toFixed(1)} percentage points ahead of ${second.player.name}` : ""}. ${starterImpactLabel(leader)} starter impact; ${survivalDisplay(leader.survival).toLowerCase()} next-turn outlook.`;
  $("decisionCenter").innerHTML = `<div class="decision-hero"><div class="decision-hero-copy"><p class="eyebrow">Primary recommendation</p><div class="decision-title-row"><div><h2>${escapeHtml(leader.player.name)}</h2><p>${leader.player.position} · ${leader.player.team} · Lab #${Math.round(leader.player.consensusRank)} · ADP ${Number.isFinite(leader.player.adp) ? leader.player.adp.toFixed(1) : "—"} · Tier ${leader.player.tier}</p></div><div class="playoff-rate"><strong>${percentRate(leader.estimatedPlayoffRate)}</strong><span>Estimated playoff rate</span></div></div>
    <p class="recommendation-sentence">${escapeHtml(sentence)}</p><div class="decision-evidence"><span>${delta.toFixed(1)} pp over #2</span><span>${starterImpactLabel(leader)} starter impact</span><span>${survivalDisplay(leader.survival)}</span><span>${leader.confidence} confidence</span></div>
    <div class="decision-actions"><button class="primary decision-draft" data-draft="${leader.player.id}">Draft ${escapeHtml(leader.player.name)}</button><button data-player-detail="${leader.player.id}">View Player</button><button data-assistant-prompt="Ask about this pick">Ask about this pick</button></div>
    ${delta < 2 ? '<p class="close-decision">Close decision — no candidate has a decisive modeled advantage.</p>' : ""}${recommendationExplanation(leader, second)}</div></div>
    ${draftRoomPlanStrip()}
    <div class="candidate-comparison">${comparison.map((item, index) => decisionCandidateCard(item, leader.estimatedPlayoffRate, index === 0 ? "Recommended" : index === 1 ? "Closest alternative" : "Best positional pivot")).join("")}</div>`;
  renderPickWindow(leader);
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
    const round = Math.ceil(pick / league.teams);
    const indexInRound = (pick - 1) % league.teams;
    const visualColumn = round % 2 === 1 ? indexInRound + 1 : league.teams - indexInRound;
    const direction = round % 2 === 1 ? "left to right" : "right to left";
    cells.push(`
      <div class="pick ${positionClass} ${ownerClass} ${order.team === userTeam ? "user" : ""} ${!viewedDraft && pick === state.currentPick ? "active" : ""}" style="grid-row:${round};grid-column:${visualColumn}" aria-label="Round ${round}, ${direction}, ${order.label}, ${escapeHtml(order.team ? (viewedDraft ? draftTeamName(viewedDraft, order.team) : teamName(order.team)) : "Unknown team")}${made ? `, ${escapeHtml(made.player.name)}, ${made.player.position}` : ", empty"}">
        <div class="pick-number">${order.label}</div>
        ${made ? `<button class="pick-player pick-player-button" type="button" data-player-detail="${made.player.id}">${escapeHtml(made.player.name)}${made.keeper ? " (Keeper)" : ""}</button><div class="pick-meta">${made.player.position} ${made.player.team}</div>` : ""}
      </div>
    `);
  }
  $("draftBoard").innerHTML = cells.join("");
  const directionSummary = Array.from({ length: league.rounds }, (_, index) => `Round ${index + 1} — ${(index + 1) % 2 === 1 ? "left to right" : "right to left"}.`).join(" ");
  if ($("draftBoardRoundDirections")) $("draftBoardRoundDirections").textContent = directionSummary;
  $("draftBoard").style.setProperty("--board-teams", league.teams);
  $("draftBoard").style.setProperty("--board-rounds", league.rounds);
  $("draftBoard").style.setProperty("--board-min-width", `${league.teams * 96}px`);
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
  $("boardOwnerRow").style.setProperty("--board-teams", league.teams);
  $("boardOwnerRow").style.setProperty("--board-min-width", `${league.teams * 96}px`);
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
  const league = activeLeague(), rosterPicks = activePicks().filter((pick) => pick.team === activeUserTeam()), roster = rosterPicks.map((pick) => pick.player), counts = positionCounts(roster);
  $("rosterList").innerHTML = rosterSlotRows(rosterPicks, league).map((row) => `<div class="roster-row ${row.starter ? "starter" : "bench"} ${row.player ? "" : "open"}"><div class="pos">${row.slot}</div><div><strong>${row.player ? escapeHtml(row.player.name) : "Open"}</strong><span>${row.player ? `${row.player.position} ${row.player.team}${row.pick?.keeper ? " - Keeper" : ""}` : row.starter ? "Starter slot" : "Bench slot"}</span></div><em>${row.player ? projectionForPlayer(row.player).toFixed(1) : "--"}</em></div>`).join("");
  const needs = [];
  ["QB", "RB", "WR", "TE", "K", "DEF"].forEach((pos) => { const missing = Math.max(0, (league.roster[pos] || 0) - (counts[pos] || 0)); if (missing) needs.push(`${missing} ${pos}`); });
  $("rosterNeeds").textContent = needs.length ? `Needs: ${needs.join(", ")}` : "Starters covered";
  const lineup = bestLineupForRoster(roster), flex = lineup.filter((player) => ["RB", "WR", "TE"].includes(player.position)).sort((a, b) => a.weeklyProjection - b.weeklyProjection)[0];
  const observations = [];
  const open = starterNeedsForRoster(roster).filter((item) => !["K", "DEF"].includes(item));
  if (open.length) observations.push(`Open starter paths: ${[...new Set(open)].join(" / ")}.`);
  if (flex) observations.push(`Current flex floor: ${flex.name} at ${flex.weeklyProjection.toFixed(1)} projected points.`);
  const riskCount = roster.filter((player) => player.injuryNote || player.riskNote).length;
  observations.push(riskCount >= 3 ? `${riskCount} rostered players carry injury or role notes.` : "Overall roster risk is controlled so far.");
  if ($("rosterObservations")) $("rosterObservations").innerHTML = observations.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
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

function renderPositionFilters() {
  const flaggedAvailableCount = availablePlayers().filter((player) => state.flaggedPlayerIds.has(player.id)).length;
  $("positionFilters").innerHTML = ["ALL", "FLAGGED", "QB", "RB", "WR", "TE", "K", "DEF"]
    .map((pos) => {
      const label = pos === "FLAGGED" ? `Flagged${flaggedAvailableCount ? ` (${flaggedAvailableCount})` : ""}` : pos;
      return `<button class="filter ${pos === state.positionFilter ? "active" : ""}" data-filter="${pos}">${label}</button>`;
    })
    .join("");
}

function renderAvailable() {
  const query = state.search.toLowerCase();
  const targetTeam = isLiveDraftMode() && state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick).team : state.userTeam;
  renderPositionFilters();
  const outcomeMap = new Map(currentOutcomeResults().map((item) => [item.playerId, item]));
  const decisionIds = new Set(currentOutcomeResults().slice(0, 3).map((item) => item.playerId));
  const players = availablePlayers().filter((p) => state.positionFilter === "ALL" ? true : state.positionFilter === "FLAGGED" ? state.flaggedPlayerIds.has(p.id) : p.position === state.positionFilter)
    .filter((p) => !query || `${p.name} ${p.team} ${p.position}`.toLowerCase().includes(query)).slice(0, 100)
    .map((player) => ({ player, score: recommendationScore(player, targetTeam, state.currentPick), outcome: outcomeMap.get(player.id), survival: playerSurvivalEstimate(player, state.userTeam, state.currentPick) }))
    .sort((a, b) => (b.outcome?.estimatedPlayoffRate || -1) - (a.outcome?.estimatedPlayoffRate || -1) || b.score - a.score);
  if ($("moreColumnsBtn")) { $("moreColumnsBtn").textContent = state.bigBoardMoreColumns ? "Fewer Columns" : "More Columns"; $("availableList").classList.toggle("show-more-columns", state.bigBoardMoreColumns); }
  const moreHeaders = `<span class="more-col">Projection</span><span class="more-col">Projection type</span><span class="more-col">Projection source</span><span class="more-col">Ranking confidence</span><span class="more-col">Risk</span><span class="more-col">Bye</span><span class="more-col">League fit</span><span class="more-col">Sources</span>`;
  $("availableList").innerHTML = `<div class="available-header"><span>Rank</span><span>Player</span><span>Pos</span><span>ADP</span><span>Tier</span><span>Playoff impact</span><span>Survival outlook</span><span>Draft</span>${moreHeaders}</div>${players.map(({ player:p, outcome, survival }) => { const profile=projectionProfileForPlayer(p); return `<div class="available-player ${decisionIds.has(p.id) ? "decision-highlight" : ""}"><span>#${Math.round(p.consensusRank)}</span><div><button class="player-name player-name-button" type="button" data-player-detail="${p.id}">${escapeHtml(p.name)}</button><button class="flag-player ${state.flaggedPlayerIds.has(p.id) ? "active" : ""}" data-flag-player="${p.id}" type="button">${state.flaggedPlayerIds.has(p.id) ? "Flagged" : "Flag"}</button></div><span class="position-pill ${p.position.toLowerCase()}">${p.position}</span><span>${Number.isFinite(p.adp) ? p.adp.toFixed(1) : "—"}</span><span>T${p.tier}</span><span>${outcome ? percentRate(outcome.estimatedPlayoffRate) : state.candidateOutcome.status === "calculating" ? "Calculating" : "Screened"}</span><span>${survivalDisplay(survival)}</span><button class="draft-player-button" type="button" data-draft="${p.id}">Draft</button><span class="more-col">${profile.weeklyValue.toFixed(1)}</span><span class="more-col">${profile.label}</span><span class="more-col">${escapeHtml(profile.source)}</span><span class="more-col">${p.confidenceAnalysis?.label || "Low"}</span><span class="more-col">${escapeHtml(p.riskNote || p.injuryNote || "Low")}</span><span class="more-col">${p.bye || "—"}</span><span class="more-col">${Math.round(p.leagueFitScore || 50)}</span><span class="more-col">${p.sourceCount || 0}</span></div>`; }).join("") || `<p class="available-empty">No players match this view.</p>`}`;
  $("availableList").classList.toggle("show-more-columns", state.bigBoardMoreColumns);
}

function assistantStructuredDetails(structured) {
  if (!structured) return "";
  const evidence = (structured.evidence || []).map((item) => `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span><p>${escapeHtml(item.interpretation)}</p></li>`).join("");
  const changes = (structured.whatChangesTheCall || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const limitations = (structured.limitations || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const actions = (structured.actions || []).map((action) => `<button type="button" data-assistant-action="${escapeHtml(action.type)}" data-assistant-player-id="${escapeHtml(action.playerId || "")}">${escapeHtml(action.label)}</button>`).join("");
  const hasDetails = evidence || structured.counterargument || changes || limitations;
  return `<div class="assistant-response-meta"><span class="assistant-stance ${escapeHtml(structured.stance || "insufficient_evidence")}">${escapeHtml(String(structured.stance || "insufficient evidence").replace(/_/g, " "))}</span><span class="assistant-confidence ${escapeHtml(structured.confidence || "unavailable")}">${escapeHtml(structured.confidence || "unavailable")} confidence</span></div>
    ${actions ? `<div class="assistant-actions">${actions}</div>` : ""}
    ${hasDetails ? `<details class="assistant-support"><summary>Evidence and tradeoffs</summary>${evidence ? `<section><h4>Evidence</h4><ul class="assistant-evidence-list">${evidence}</ul></section>` : ""}${structured.counterargument ? `<section><h4>Best counterargument</h4><p>${escapeHtml(structured.counterargument)}</p></section>` : ""}${changes ? `<section><h4>What changes the call</h4><ul>${changes}</ul></section>` : ""}${limitations ? `<section><h4>Limitations</h4><ul>${limitations}</ul></section>` : ""}</details>` : ""}`;
}

function renderDraftAssistant() {
  synchronizeAssistantSession();
  const session = state.assistantSession;
  const currentKey = assistantContextKey();
  const working = ["connecting", "analyzing_board", "running_tool", "forming_answer"].includes(session.status);
  const staleAdvice = session.messages.some((message) => message.role === "assistant" && message.contextKey && message.contextKey !== currentKey && message.mode !== "system");
  if ($("assistantDetailToggle")) $("assistantDetailToggle").checked = session.answerDetail === "detailed";
  if ($("assistantOfflineToggle")) $("assistantOfflineToggle").checked = session.offlineMode;
  if ($("assistantBoardMarker")) $("assistantBoardMarker").hidden = !staleAdvice;
  if ($("assistantRetryBtn")) $("assistantRetryBtn").hidden = !session.lastError || working;
  if ($("assistantStopBtn")) $("assistantStopBtn").hidden = !working;
  if ($("assistantSendBtn")) $("assistantSendBtn").disabled = working;
  if ($("assistantMessages")) $("assistantMessages").setAttribute("aria-busy", working ? "true" : "false");
  const statusLabel = assistantStatusCopy(session.status);
  if ($("assistantConnectionState")) {
    $("assistantConnectionState").textContent = statusLabel;
    $("assistantConnectionState").dataset.status = session.status;
  }
  if ($("assistantSummaryStatus")) $("assistantSummaryStatus").textContent = statusLabel;

  $("assistantMessages").innerHTML = session.messages.map((message) => {
    const stale = message.role === "assistant" && message.contextKey && message.contextKey !== currentKey && message.mode !== "system";
    const roleLabel = message.role === "user" ? "You" : message.mode === "local" ? "Local analysis mode" : message.mode === "llm" ? "Draft Assistant" : "Assistant";
    const body = message.text ? escapeHtml(message.text).replace(/\n/g, "<br>") : message.streaming ? '<span class="assistant-typing">Analyzing…</span>' : "";
    return `<article class="assistant-message ${message.role === "user" ? "user" : "assistant"} ${message.mode || "local"} ${stale ? "stale" : ""}" data-assistant-message-id="${escapeHtml(message.id)}">
      <div class="assistant-role-row"><span class="assistant-role">${escapeHtml(roleLabel)}</span>${stale ? '<span class="assistant-stale-label">Board changed</span>' : ""}</div>
      <div class="assistant-text">${body}</div>
      ${message.role === "assistant" ? assistantStructuredDetails(message.structured) : ""}
    </article>`;
  }).join("");

  const suggestions = session.suggestedPrompts || [];
  if ($("assistantSuggestedPrompts")) {
    $("assistantSuggestedPrompts").innerHTML = suggestions.length
      ? `<span>Continue:</span>${suggestions.map((prompt) => `<button type="button" data-assistant-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}`
      : "";
  }
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
  const teamACanUseReceivedKeeper = canTeamKeepAssetAfterTrade(teamA, bKeeper, state.trade.picksB, state.trade.picksA);
  const teamBCanUseReceivedKeeper = canTeamKeepAssetAfterTrade(teamB, aKeeper, state.trade.picksA, state.trade.picksB);
  const aBefore = teamPickInventoryValue(teamA);
  const bBefore = teamPickInventoryValue(teamB);
  const aAfterPicks = teamPickInventoryValue(teamA, state.trade.picksB, state.trade.picksA);
  const bAfterPicks = teamPickInventoryValue(teamB, state.trade.picksA, state.trade.picksB);
  const netForA = bSends.total - aSends.total;
  const netForB = aSends.total - bSends.total;
  const bigger = Math.max(aSends.total, bSends.total, 1);
  const smaller = Math.min(aSends.total, bSends.total);
  const fairness = Math.round((smaller / bigger) * 100);
  const invalidKeeperTrade = !teamACanUseReceivedKeeper || !teamBCanUseReceivedKeeper;
  const verdict = invalidKeeperTrade
    ? "Keeper cost pick missing"
    : (fairness >= 92
      ? "Very balanced trade"
      : netForA > 0
        ? `${teamName(teamA)} gains more value`
        : `${teamName(teamB)} gains more value`);
  return {
    teamA,
    teamB,
    aSends,
    bSends,
    aBefore,
    bBefore,
    aAfterPicks,
    bAfterPicks,
    netForA,
    netForB,
    fairness,
    verdict,
    invalidKeeperTrade,
    teamACanUseReceivedKeeper,
    teamBCanUseReceivedKeeper,
  };
}

function tradePackageRows(packageDetails) {
  const pickRows = packageDetails.picks.map((item) => `<li>${item.label} pick ${item.pick}: ${formatTradeValue(item.value)}</li>`).join("");
  const keeper = packageDetails.keeperAsset;
  const keeperRow = keeper
    ? `<li>${escapeHtml(keeper.player.name)} ${keeper.player.position} keeper in Round ${keeper.round}: ${formatTradeValue(keeperTradeAssetValue(keeper))} surplus trade value <small>Current market pick ${Math.round(keeper.marketPick)}, keeper-cost pick around ${Math.round(keeper.costPick)}, ${formatTradeValue(keeper.surplus)} keeper surplus</small></li>`
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

function currentMarketPickForPlayer(player) {
  return Math.max(1, Math.min(LEAGUE.teams * LEAGUE.rounds, Number.isFinite(player.adp) ? player.adp : player.consensusRank || player.rank || 999));
}

function keeperCostPickForCandidate(candidate) {
  if (Number(candidate.pickNo)) return Number(candidate.pickNo);
  return keeperCostPick(candidate.round);
}

function ownedKeeperPickInRound(team, round) {
  const roundIndex = Number(round) - 1;
  const slotIndex = state.roundOrders[roundIndex]?.findIndex((owner) => owner === team);
  return slotIndex >= 0 ? roundIndex * LEAGUE.teams + slotIndex + 1 : null;
}

function keeperValueBand(score, edge) {
  if (score >= 90 || edge >= 48) return "Elite value";
  if (score >= 62 || edge >= 28) return "Strong value";
  if (score >= 38 || edge >= 12) return "Useful discount";
  if (edge >= 0) return "Small edge";
  return "Below market";
}

function keeperRankingReason(item) {
  if (!item.hasOwnedPick) {
    return `${teamName(item.team)} does not currently own a Round ${item.round} pick, so this keeper needs a pick-order fix before it can lock in.`;
  }
  if (item.edge >= 36) return `Current ADP is about ${item.edge.toFixed(1)} picks earlier than the imported keeper cost, creating a major draft-capital edge.`;
  if (item.edge >= 12) return `Current ADP is meaningfully earlier than the imported keeper cost, so this is a clean discount if the player fits the build.`;
  if (item.edge >= 0) return `Current ADP is slightly earlier than the keeper cost, so this is a modest but usable edge.`;
  return `Current ADP is later than the imported keeper cost, so the pick is probably more valuable than the keeper.`;
}

function keeperRankingCandidatesForTeam(team) {
  const importedTeam = state.sleeper.importData?.teams?.[team - 1];
  if (!importedTeam) return [];
  const candidatesById = new Map();
  [...(importedTeam.rosterPlayers || []), ...(importedTeam.keeperCandidates || [])].forEach((candidate) => {
    if (!candidate?.playerId || !candidate.round) return;
    const player = playerById(candidate.playerId);
    if (!player) return;
    const costPick = keeperCostPickForCandidate(candidate);
    const marketPick = currentMarketPickForPlayer(player);
    const edge = costPick - marketPick;
    const marketValue = pickValueBase(marketPick);
    const costValue = pickValueBase(costPick);
    const valueEdge = marketValue - costValue;
    const scarcityBoost = scoringProjectionBonus(player)
      + (["RB", "WR"].includes(player.position) ? 4 : player.position === "TE" && LEAGUE.scoring === "TE Premium" ? 6 : 0);
    const projectionImpact = Math.max(0, projectionForPlayer(player) - ({ QB: 18, RB: 11, WR: 10, TE: 8, K: 6, DEF: 6 }[player.position] || 8));
    const hasOwnedPick = Boolean(ownedKeeperPickInRound(team, candidate.round));
    const score = Math.max(0, edge * 1.28 + Math.max(0, valueEdge) * 1.8 + projectionImpact * 1.4 + scarcityBoost - (hasOwnedPick ? 0 : 18));
    const item = {
      team,
      player,
      round: Number(candidate.round),
      pickNo: Number(candidate.pickNo) || "",
      costPick,
      marketPick,
      edge,
      valueEdge,
      projectionImpact,
      score,
      band: keeperValueBand(score, edge),
      hasOwnedPick,
    };
    const existing = candidatesById.get(player.id);
    if (!existing || item.score > existing.score) candidatesById.set(player.id, item);
  });
  return [...candidatesById.values()].sort((a, b) => b.score - a.score || b.edge - a.edge);
}

function allKeeperRankingCandidates() {
  return Array.from({ length: LEAGUE.teams }, (_, index) => keeperRankingCandidatesForTeam(index + 1)).flat();
}

function formatKeeperPickCost(item) {
  const roundPick = item.pickNo ? `${Math.floor((item.pickNo - 1) / LEAGUE.teams) + 1}.${String(((item.pickNo - 1) % LEAGUE.teams) + 1).padStart(2, "0")}` : `R${item.round}`;
  return `${roundPick}${item.pickNo ? ` / pick ${item.pickNo}` : ""}`;
}

function targetablePlayersForTeam(team) {
  const players = new Map();
  const selection = state.keeperSelections[team - 1];
  if (selection?.playerId) {
    const player = playerById(selection.playerId);
    if (player) players.set(player.id, { player, round: selection.round || "" });
  }
  const importedTeam = state.sleeper.importData?.teams?.[team - 1];
  (importedTeam?.rosterPlayers || []).forEach((rosterPlayer) => {
    const player = playerById(rosterPlayer.playerId);
    if (player) players.set(player.id, { player, round: rosterPlayer.round || "" });
  });
  importedKeeperCandidatesForTeam(team).forEach((candidate) => {
    if (candidate.player) players.set(candidate.player.id, { player: candidate.player, round: candidate.round || "" });
  });
  return [...players.values()].sort((a, b) => a.player.name.localeCompare(b.player.name));
}

function targetablePlayerEntryForTeam(team, name) {
  const key = playerKey(name);
  if (!key || team === "all") return null;
  return targetablePlayersForTeam(Number(team))
    .find(({ player }) => player.id === key || playerKey(player.name) === key) || null;
}

function renderTradeFinderTargetPlayerOptions() {
  const datalist = $("tradeFinderTargetPlayerOptions");
  if (!datalist) return;
  if (state.tradeFinder.targetTeam === "all") {
    datalist.innerHTML = "";
    if ($("tradeFinderTargetPlayer")) $("tradeFinderTargetPlayer").placeholder = "Pick a target team first";
    return;
  }
  const options = targetablePlayersForTeam(Number(state.tradeFinder.targetTeam));
  datalist.innerHTML = options
    .map(({ player, round }) => `<option value="${escapeHtml(player.name)}">${escapeHtml(player.position)} ${escapeHtml(player.team)}${round ? ` - Round ${round}` : ""}</option>`)
    .join("");
  if ($("tradeFinderTargetPlayer")) {
    $("tradeFinderTargetPlayer").placeholder = options.length ? "Player from target roster" : "No Sleeper/keeper roster loaded";
  }
}

function keeperCandidateAsset(candidate, receivingTeam) {
  if (!candidate?.player || !candidate.round) return null;
  return keeperAssetValue(candidate.player, candidate.round, receivingTeam);
}

function tradeableKeeperAssetsForTeam(team, receivingTeam) {
  const keepers = new Map();
  const designated = designatedKeeperContext(team);
  if (designated?.player && designated.round) {
    keepers.set(designated.player.id, designated);
  }
  importedKeeperCandidatesForTeam(team)
    .slice(0, 6)
    .forEach((candidate) => {
      const keeper = keeperCandidateAsset(candidate, receivingTeam);
      if (!keeper?.player || keeper.surplus <= 0) return;
      const existing = keepers.get(keeper.player.id);
      if (!existing || keeperTradeAssetValue(keeper) > keeperTradeAssetValue(existing)) {
        keepers.set(keeper.player.id, keeper);
      }
    });
  return [...keepers.values()].sort((a, b) => keeperTradeAssetValue(b) - keeperTradeAssetValue(a));
}

function forcedTargetKeeperForTeam(team, receivingTeam, target) {
  if (!target?.targetPlayer || !target.targetRound) return null;
  if (target.targetTeam !== "all" && Number(target.targetTeam) !== team) return null;
  return keeperAssetValue(target.targetPlayer, target.targetRound, receivingTeam);
}

function tradePackageCandidates(team, receivingTeam, includeKeepers = false, target = null) {
  const owned = allOwnedPickOptions(team).map((item) => item.pick).sort((a, b) => a - b);
  const candidates = owned.map((pick) => ({
    picks: [pick],
    keeper: null,
    value: adjustedPickValueForTeam(receivingTeam, pick),
  }));
  const forcedKeeper = forcedTargetKeeperForTeam(team, receivingTeam, target);
  if (forcedKeeper) {
    owned
      .filter((pick) => draftOrderFor(pick).round >= 7)
      .slice(0, 10)
      .forEach((pick) => {
        candidates.push({
          picks: [pick],
          keeper: forcedKeeper,
          value: adjustedPickValueForTeam(receivingTeam, pick) + keeperTradeAssetValue(forcedKeeper),
        });
      });
  }
  if (includeKeepers) {
    tradeableKeeperAssetsForTeam(team, receivingTeam)
      .slice(0, 6)
      .forEach((keeper) => {
        owned
          .filter((pick) => draftOrderFor(pick).round >= Math.min(7, Math.max(1, Number(keeper.round) + 1)))
          .slice(0, 10)
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

function tradeFinderTargetContext() {
  const focusTeam = state.tradeFinder.focusTeam === "all" ? "all" : Number(state.tradeFinder.focusTeam);
  const targetTeam = state.tradeFinder.targetTeam === "all" ? "all" : Number(state.tradeFinder.targetTeam);
  const targetName = state.tradeFinder.targetPlayer.trim();
  const targetEntry = targetTeam === "all" ? null : targetablePlayerEntryForTeam(targetTeam, targetName);
  const targetPlayer = targetEntry?.player || null;
  const targetRound = Number(state.tradeFinder.targetRound) || Number(targetEntry?.round) || "";
  return { focusTeam, targetTeam, targetPlayer, targetName, targetRound };
}

function ideaHasKeeperPlayer(idea, player) {
  if (!player) return false;
  return idea.keeperA?.player?.id === player.id || idea.keeperB?.player?.id === player.id;
}

function ideaReceiverForKeeper(idea, player) {
  if (!player) return null;
  if (idea.keeperA?.player?.id === player.id) return idea.teamB;
  if (idea.keeperB?.player?.id === player.id) return idea.teamA;
  return null;
}

function tradeIdeaTargetScore(idea, target) {
  let score = 0;
  const notes = [];
  if (target.focusTeam !== "all" && (idea.teamA === target.focusTeam || idea.teamB === target.focusTeam)) score += 4;
  if (target.targetTeam !== "all" && (idea.teamA === target.targetTeam || idea.teamB === target.targetTeam)) score += 6;
  if (target.targetPlayer && ideaHasKeeperPlayer(idea, target.targetPlayer)) {
    score += 18;
    const receiver = ideaReceiverForKeeper(idea, target.targetPlayer);
    if (target.focusTeam !== "all" && receiver === target.focusTeam) {
      score += 16;
      notes.push(`${teamName(target.focusTeam)} receives ${target.targetPlayer.name} as the targeted keeper/player.`);
    } else if (receiver) {
      notes.push(`${teamName(receiver)} receives ${target.targetPlayer.name}, matching the player target.`);
    }
  }
  return { score, notes };
}

function visibleTradeIdeas() {
  const declined = new Set(state.tradeFinder.declinedIdeaIds);
  return state.tradeFinder.allIdeas
    .filter((idea) => !declined.has(idea.id))
    .slice(0, 12);
}

function refreshVisibleTradeIdeas() {
  state.tradeFinder.ideas = visibleTradeIdeas();
}

function generateTradeIdeas() {
  const threshold = Math.max(80, Math.min(100, Number(state.tradeFinder.threshold) || 95));
  const target = tradeFinderTargetContext();
  const focusTeam = target.focusTeam;
  const targetTeam = target.targetTeam;
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
      if (targetTeam !== "all" && teamA !== targetTeam && teamB !== targetTeam) continue;
      pairs.push([teamA, teamB]);
    }
  }

  pairs.forEach(([teamA, teamB]) => {
    const packagesA = tradePackageCandidates(teamA, teamB, includeKeepers, target);
    const packagesB = tradePackageCandidates(teamB, teamA, includeKeepers, target);
    packagesA.forEach((aPackage) => {
      packagesB.forEach((bPackage) => {
        const hasKeeperAsset = Boolean(aPackage.keeper || bPackage.keeper);
        if (aPackage.keeper && bPackage.keeper) return;
        if (target.targetPlayer && !ideaHasKeeperPlayer({ keeperA: aPackage.keeper, keeperB: bPackage.keeper }, target.targetPlayer)) return;
        if (requireEqualPicks && aPackage.picks.length !== bPackage.picks.length) return;
        if (!canTeamKeepAssetAfterTrade(teamA, bPackage.keeper, bPackage.picks, aPackage.picks)) return;
        if (!canTeamKeepAssetAfterTrade(teamB, aPackage.keeper, aPackage.picks, bPackage.picks)) return;
        const bigger = Math.max(aPackage.value, bPackage.value, 1);
        const smaller = Math.min(aPackage.value, bPackage.value);
        const valueMatch = Math.round((smaller / bigger) * 100);
        if (valueMatch < threshold) return;

        const aFit = packageFitNotes(teamA, bPackage.picks, aPackage.picks, includeKeepers, profiles.get(teamA), bPackage.keeper, aPackage.keeper);
        const bFit = packageFitNotes(teamB, aPackage.picks, bPackage.picks, includeKeepers, profiles.get(teamB), aPackage.keeper, bPackage.keeper);
        const keeperSellerFit = aPackage.keeper ? aFit : bPackage.keeper ? bFit : null;
        if (keeperSellerFit && keeperSellerFit.bestPickDelta < 3) return;
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

        const targetFit = tradeIdeaTargetScore({
          teamA,
          teamB,
          keeperA: aPackage.keeper,
          keeperB: bPackage.keeper,
        }, target);
        const ideaScore = valueMatch + strategicScore + targetFit.score + (hasKeeperAsset ? 12 : 0) - Math.abs(100 - valueMatch) * 0.2;
        ideas.push({
          id: `${teamA}-${teamB}-${aPackage.picks.join("_") || "nopicks"}-${aPackage.keeper ? `${aPackage.keeper.player.id}-r${aPackage.keeper.round}` : "nokeep"}-${bPackage.picks.join("_") || "nopicks"}-${bPackage.keeper ? `${bPackage.keeper.player.id}-r${bPackage.keeper.round}` : "nokeep"}`,
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
          rationaleA: [...targetFit.notes.filter((note) => note.includes(teamName(teamA))), ...aFit.notes].slice(0, 3),
          rationaleB: [...targetFit.notes.filter((note) => note.includes(teamName(teamB))), ...bFit.notes].slice(0, 3),
          concerns: [...aFit.concerns, ...bFit.concerns].slice(0, 2),
          targetScore: targetFit.score,
        });
      });
    });
  });

  let sortedIdeas = ideas
    .sort((a, b) => b.score - a.score || b.valueMatch - a.valueMatch)
    .slice(0, 60);
  if (includeKeepers) {
    const keeperIdeas = sortedIdeas.filter((idea) => idea.keeperA || idea.keeperB);
    if (keeperIdeas.length) {
      const pickOnlyIdeas = sortedIdeas.filter((idea) => !idea.keeperA && !idea.keeperB);
      sortedIdeas = [
        ...keeperIdeas.slice(0, 10),
        ...pickOnlyIdeas.slice(0, 2),
        ...keeperIdeas.slice(10),
        ...pickOnlyIdeas.slice(2),
      ].slice(0, 60);
    }
  }
  state.tradeFinder.allIdeas = sortedIdeas;
  state.tradeFinder.declinedIdeaIds = [];
  refreshVisibleTradeIdeas();
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

function keeperRankingCard(item, rank) {
  const ownedPick = ownedKeeperPickInRound(item.team, item.round);
  const keepRoundText = `R${item.round}`;
  return `
    <article class="keeper-ranking-row">
      <div class="keeper-rank-number">${rank}</div>
      <div class="keeper-rank-player">
        <strong>${escapeHtml(item.player.name)}</strong>
        <span>${escapeHtml(item.player.position)} - ${escapeHtml(item.player.team)} - ${escapeHtml(item.band)}</span>
        <p>${escapeHtml(keeperRankingReason(item))}</p>
      </div>
      <div class="keeper-rank-stat">
        <span>Keep</span>
        <b>${keepRoundText}</b>
      </div>
      <div class="keeper-rank-stat">
        <span>Cost slot</span>
        <b class="${item.hasOwnedPick ? "" : "warning"}">${item.hasOwnedPick ? formatKeeperPickCost(item) : `Round ${item.round} missing`}</b>
      </div>
      <div class="keeper-rank-stat">
        <span>Current ADP</span>
        <b>${item.marketPick.toFixed(1)}</b>
      </div>
      <div class="keeper-rank-stat">
        <span>ADP edge</span>
        <b>${item.edge.toFixed(1)} picks</b>
      </div>
      <div class="keeper-rank-stat">
        <span>Score</span>
        <b>${item.score.toFixed(1)}</b>
      </div>
      <div class="keeper-rank-actions">
        <span class="keeper-value-pill">${escapeHtml(item.band)}</span>
        <button data-use-ranked-keeper-team="${item.team}" data-use-ranked-keeper-player="${item.player.id}" data-use-ranked-keeper-round="${item.round}" type="button" ${ownedPick ? "" : "disabled"}>Use keeper</button>
      </div>
    </article>
  `;
}

function renderKeeperRankings() {
  if (!$("keeperRankingsList")) return;
  renderKeeperEditor(state.keeperSelections, LEAGUE, state.teamNames);
  const hasImport = Boolean(state.sleeper.importData);
  const selectedTeam = state.keeperRankingsTeam === "all" ? "all" : Number(state.keeperRankingsTeam);
  if ($("keeperRankingsTeamSelect")) {
    $("keeperRankingsTeamSelect").value = state.keeperRankingsTeam;
  }

  if (!hasImport) {
    $("keeperRankingsSummary").innerHTML = `
      <div class="keeper-summary-card">
        <p class="eyebrow">Sleeper import needed</p>
        <h3>No roster/draft history loaded</h3>
        <p>Import a Sleeper league in the League tab so this tool can compare last year's draft slot to this year's ADP.</p>
      </div>
    `;
    $("keeperRankingsList").innerHTML = "";
    return;
  }

  const allCandidates = allKeeperRankingCandidates();
  const best = allCandidates[0];
  $("keeperRankingsSummary").innerHTML = `
    <div class="keeper-summary-card">
      <p class="eyebrow">Best option</p>
      <h3>${best ? escapeHtml(best.player.name) : "No ranked keepers"}</h3>
      <p>${best ? `${escapeHtml(teamName(best.team))} can keep him in Round ${best.round}, about ${best.edge.toFixed(1)} picks after his current ADP.` : "No Sleeper roster players had both a matched ranking and imported draft round."}</p>
    </div>
    <div class="keeper-summary-card">
      <p class="eyebrow">Formula</p>
      <h3>ADP edge plus value</h3>
      <p>Score weights current ADP discount against the imported draft slot, adds draft-capital surplus and small position/scoring context, then penalizes missing owned picks.</p>
    </div>
    <div class="keeper-summary-card">
      <p class="eyebrow">Ranked pool</p>
      <h3>${allCandidates.length}</h3>
      <p>${state.sleeper.importData.leagueName} roster players matched to rankings with an imported draft round.</p>
    </div>
  `;

  const teams = Array.from({ length: LEAGUE.teams }, (_, index) => index + 1)
    .filter((team) => selectedTeam === "all" || team === selectedTeam);
  $("keeperRankingsList").innerHTML = teams.map((team) => {
    const importedTeam = state.sleeper.importData?.teams?.[team - 1];
    const candidates = keeperRankingCandidatesForTeam(team).slice(0, 5);
    return `
      <section class="keeper-team-card" id="keeper-team-${team}">
        <div class="keeper-team-heading">
          <div>
            <p class="eyebrow">Top 5 keeper options</p>
            <h3>${escapeHtml(teamName(team))}</h3>
          </div>
          <span>${importedTeam?.sleeperRosterId ? `Original slot ${escapeHtml(importedTeam.sleeperRosterId)}` : ""}</span>
        </div>
        ${candidates.length ? candidates.map((item, index) => keeperRankingCard(item, index + 1)).join("") : `<p class="empty">No ranked keeper candidates found for this team. Re-import Sleeper if roster/draft history is missing.</p>`}
      </section>
    `;
  }).join("");
}

function renderTradeFinder() {
  if (!$("tradeFinderResults")) return;
  if ($("tradeFinderTeam")) {
    $("tradeFinderTeam").value = state.tradeFinder.focusTeam;
    $("tradeFinderTargetTeam").value = state.tradeFinder.targetTeam;
    $("tradeFinderTargetPlayer").value = state.tradeFinder.targetPlayer;
    $("tradeFinderTargetRound").value = state.tradeFinder.targetRound;
    $("tradeFinderThreshold").value = state.tradeFinder.threshold;
    $("tradeFinderKeepers").checked = state.tradeFinder.includeKeepers;
    $("tradeFinderEqualPicks").checked = state.tradeFinder.requireEqualPicks;
    renderTradeFinderTargetPlayerOptions();
  }
  if (!state.tradeFinder.hasRun) {
    const keeperContext = state.sleeper.importData
      ? ` Sleeper keeper options from ${escapeHtml(state.sleeper.importData.leagueName)} are available when the checkbox is on.`
      : " Import a Sleeper league in the League tab to add roster-based keeper options.";
    $("tradeFinderResults").innerHTML = `<p class="empty">Run the finder to surface balanced trade ideas from the current pick board.${keeperContext}</p>`;
    return;
  }
  if (!state.tradeFinder.ideas.length) {
    if (state.tradeFinder.allIdeas.length && state.tradeFinder.declinedIdeaIds.length >= state.tradeFinder.allIdeas.length) {
      $("tradeFinderResults").innerHTML = `<p class="empty">You declined every idea from this run. Change the target directions or lower the match threshold to generate a fresh pool.</p>`;
      return;
    }
    const equalPickNote = state.tradeFinder.requireEqualPicks ? " Equal-pick-count is enforced even when a keeper-player asset is included, so each team stays at the league's standard pick count." : "";
    $("tradeFinderResults").innerHTML = `<p class="empty">No trades met the ${state.tradeFinder.threshold}% value match. Try lowering the threshold or changing the focus team.${equalPickNote}</p>`;
    return;
  }
  const hiddenCount = Math.max(0, state.tradeFinder.allIdeas.length - state.tradeFinder.declinedIdeaIds.length - state.tradeFinder.ideas.length);
  const declinedCount = state.tradeFinder.declinedIdeaIds.length;
  const target = tradeFinderTargetContext();
  const targetWarning = target.targetName && target.targetTeam === "all"
    ? `<p class="trade-idea-warning"><strong>Choose a target team:</strong> player targets are filtered to the selected target team's Sleeper roster and saved keeper context.</p>`
    : target.targetName && !target.targetPlayer
      ? `<p class="trade-idea-warning"><strong>Target not on selected team:</strong> ${escapeHtml(target.targetName)} is not in ${escapeHtml(teamName(target.targetTeam))}'s Sleeper/keeper roster list. Choose a listed player or re-import the Sleeper league to refresh rosters.</p>`
      : "";
  const targetHint = target.targetPlayer && !target.targetRound
    ? `<p class="trade-finder-summary">Targeting ${escapeHtml(target.targetPlayer.name)}. Add a keeper cost round to price him even if he was not imported from Sleeper.</p>`
    : "";
  $("tradeFinderResults").innerHTML = `
    <div class="trade-finder-summary">
      Showing ${state.tradeFinder.ideas.length} of ${state.tradeFinder.allIdeas.length} found ideas${declinedCount ? ` after declining ${declinedCount}` : ""}.${hiddenCount ? ` ${hiddenCount} more can appear as you decline ideas.` : ""}
    </div>
    ${targetWarning}
    ${targetHint}
    ${state.tradeFinder.ideas.map((idea, index) => `
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
      <div class="trade-idea-actions">
        <button data-load-trade-idea="${idea.id}" type="button">Load in calculator</button>
        <button data-decline-trade-idea="${idea.id}" type="button">Decline idea</button>
      </div>
    </article>
  `).join("")}
  `;
}

function renderTradeCalculator() {
  state.trade.teamA = Math.max(1, Math.min(LEAGUE.teams, Number(state.trade.teamA) || 1));
  state.trade.teamB = Math.max(1, Math.min(LEAGUE.teams, Number(state.trade.teamB) || Math.min(2, LEAGUE.teams)));
  if (state.trade.teamA === state.trade.teamB) state.trade.teamB = state.trade.teamA === LEAGUE.teams ? 1 : state.trade.teamA + 1;
  const tradablePicksA = new Set(allOwnedPickOptions(state.trade.teamA).map((item) => item.pick));
  const tradablePicksB = new Set(allOwnedPickOptions(state.trade.teamB).map((item) => item.pick));
  state.trade.picksA = state.trade.picksA.filter((pick) => tradablePicksA.has(Number(pick)));
  state.trade.picksB = state.trade.picksB.filter((pick) => tradablePicksB.has(Number(pick)));

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
  const keeperInvalidNote = result.invalidKeeperTrade
    ? `<p class="trade-idea-warning"><strong>Invalid keeper setup:</strong> ${!result.teamACanUseReceivedKeeper ? `${escapeHtml(teamName(result.teamA))} would not own the required keeper-cost round after this trade. ` : ""}${!result.teamBCanUseReceivedKeeper ? `${escapeHtml(teamName(result.teamB))} would not own the required keeper-cost round after this trade.` : ""}</p>`
    : "";
  const contextNote = result.invalidKeeperTrade
    ? "A keeper trade only works if the receiving team still owns a pick in the keeper-cost round after the trade."
    : result.fairness >= 92
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
    ${keeperInvalidNote}
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
        <p>Keeper-player trade assets are priced from keeper surplus, not full player value. The receiving team must still own the keeper-cost round after the trade, and already locked keeper picks are removed from the tradable pick list.</p>
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
      <small>Seed ${run.seed ?? "N/A"} - ${formatNumber(run.weeklyProjection)} starter pts - rank #${run.rank} - ${run.playoffOdds}% playoffs</small>
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

function bulkRunExplorer(runs, selectedId) {
  return runs
    .slice()
    .sort((a, b) => a.runIndex - b.runIndex)
    .map((run) => `
      <button class="bulk-run-chip ${run.id === selectedId ? "active" : ""}" data-bulk-run="${run.id}" type="button">
        <strong>#${run.runIndex} ${escapeHtml(run.strategyLabel)}</strong>
        <span>Seed ${run.seed ?? "N/A"} - ${escapeHtml(run.firstFiveBuild)}</span>
      </button>
    `).join("");
}

function replayPickCard(pick) {
  const isUser = pick.team === state.userTeam;
  const posClass = pick.player?.position ? `pos-${pick.player.position.toLowerCase()}` : "empty";
  return `
    <div class="bulk-replay-pick ${posClass} ${isUser ? "user" : ""}">
      <span>${escapeHtml(pick.label)} - ${escapeHtml(teamName(pick.team))}</span>
      <strong>${escapeHtml(pick.player?.name || "Open")}</strong>
      <em>${escapeHtml(pick.player ? `${pick.player.position} ${pick.player.team}${pick.keeper ? " - Keeper" : ""}` : "")}</em>
    </div>
  `;
}

function bulkReplayBoard(run) {
  const replayPicks = bulkRunPicks(run);
  if (!replayPicks.length) {
    return `<p class="empty">No replay board is stored for this run. Run a new simulation batch to capture replay data.</p>`;
  }
  const ownerCells = Array.from({ length: LEAGUE.teams }, (_, index) => `
    <div class="bulk-replay-owner ${index + 1 === state.userTeam ? "user" : ""}">
      <span>Slot ${index + 1}</span>
      <strong>${escapeHtml(teamName(index + 1))}</strong>
    </div>
  `).join("");
  const picks = replayPicks
    .slice()
    .sort((a, b) => a.pick - b.pick)
    .map(replayPickCard)
    .join("");
  return `
    <div class="bulk-replay-meta">
      <div><span>Run</span><strong>#${run.runIndex}</strong></div>
      <div><span>Seed</span><strong>${run.seed ?? "N/A"}</strong></div>
      <div><span>Strategy</span><strong>${escapeHtml(run.strategyLabel)}</strong></div>
      <div><span>Picks</span><strong>${replayPicks.length}</strong></div>
    </div>
    <div class="bulk-replay-shell" style="--replay-teams: ${LEAGUE.teams}">
      <div class="bulk-replay-owners">${ownerCells}</div>
      <div class="bulk-replay-board">${picks}</div>
    </div>
  `;
}

function rangePlotHtml(group) {
  const left = clampNumber(group.p25, 0, 100);
  const width = clampNumber(group.p75 - group.p25, 1, 100 - left);
  const median = clampNumber(group.medianOutcome, 0, 100);
  const downside = clampNumber(group.downside, 0, 100);
  return `
    <div class="distribution-plot" role="img" aria-label="${escapeHtml(group.label)} median ${group.medianOutcome.toFixed(1)}, middle range ${group.p25.toFixed(1)} to ${group.p75.toFixed(1)}, downside ${group.downside.toFixed(1)}">
      <span class="distribution-range" style="left:${left}%;width:${width}%"></span>
      <i class="distribution-downside" style="left:${downside}%" title="10th-percentile downside ${group.downside.toFixed(1)}"></i>
      <b class="distribution-median" style="left:${median}%" title="Median ${group.medianOutcome.toFixed(1)}"></b>
    </div>
  `;
}

function confidencePill(confidence) {
  const label = typeof confidence === "string" ? confidence : confidence?.label || "Low confidence";
  const reason = typeof confidence === "object" ? confidence.reason || "" : "";
  return `<span class="sim-confidence ${escapeHtml(label.toLowerCase().replace(/\s+/g, "-"))}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
}

function renderDraftPlanResult(summary) {
  const plan = summary.draftPlan;
  if (!plan) return `<section class="sim-section sim-empty"><h3>Draft Plan unavailable</h3><p>Complete a simulation batch to create an actionable plan.</p></section>`;
  const status = currentPlanStatus();
  const why = plan.whyItWorks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const priority = plan.prioritize.length ? plan.prioritize.map((position) => `<span class="position-pill ${position.toLowerCase()}">${position}</span>`).join("") : `<span>Best available value</span>`;
  const wait = plan.canWait.length ? plan.canWait.map((position) => `<span class="position-pill ${position.toLowerCase()}">${position}</span>`).join("") : `<span>No safe wait identified</span>`;
  return `
    <section class="draft-plan-primary sim-section">
      <div class="draft-plan-heading">
        <div>
          <p class="eyebrow">Draft Plan</p>
          <h3>${escapeHtml(plan.recommendedOpening)} is the strongest modeled opening from ${pickLabel(allOwnedPickOptions(state.userTeam, { includeKeeperLocked: true })[0]?.pick || 1)}</h3>
          <p>${escapeHtml(summary.comparison.detail)}</p>
        </div>
        <div class="draft-plan-status">
          <span>${escapeHtml(status.label)}</span>
          <small>${escapeHtml(status.reason)}</small>
        </div>
      </div>
      <div class="draft-plan-summary-grid">
        <div><span>Strategy</span><strong>${escapeHtml(plan.recommendedStrategy)}</strong></div>
        <div><span>Best alternative</span><strong>${escapeHtml(plan.bestAlternative)}</strong><small>${escapeHtml(plan.alternativeReason)}</small></div>
        <div><span>Confidence</span><strong>${escapeHtml(plan.confidence.label)}</strong><small>${escapeHtml(plan.confidence.reason)}</small></div>
        <div><span>Evidence</span><strong>${plan.sampleSize} drafts</strong><small>${escapeHtml(plan.projectionBasis)}</small></div>
      </div>
      <div class="draft-plan-actions">
        <div><h4>Positions to prioritize</h4><p class="position-tag-row">${priority}</p></div>
        <div><h4>Positions that can wait</h4><p class="position-tag-row">${wait}</p></div>
      </div>
      <div class="draft-plan-evidence"><h4>Why this plan works</h4><ul>${why}</ul></div>
      ${state.bulk.staleReason ? `<p class="sim-warning"><strong>Draft Plan stale:</strong> ${escapeHtml(state.bulk.staleReason)} Run a new batch before treating exact survival reads as current.</p>` : ""}
    </section>
  `;
}

function renderRoundObjectives(plan) {
  if (!plan?.objectives?.length) return "";
  const rows = plan.objectives.map((objective) => `
    <div class="objective-row">
      <strong>Round ${objective.round}</strong>
      <span><b>Primary:</b> ${escapeHtml(objective.primaryObjective)}</span>
      <span><b>Fallback:</b> ${escapeHtml(objective.acceptableFallback)}</span>
      <span><b>Avoid:</b> ${escapeHtml(objective.avoidForcing)}</span>
      <span><b>Pivot trigger:</b> ${escapeHtml(objective.trigger)}</span>
    </div>
  `).join("");
  return `
    <section class="sim-section">
      <div class="sim-section-heading"><div><p class="eyebrow">Rounds 1–8</p><h3>Round-by-round objectives</h3></div></div>
      <div class="objective-list">${rows}</div>
      <details class="sim-details"><summary>Pivot rules and limitations</summary>
        <div class="sim-detail-grid"><div><h4>Pivot rules</h4><ul>${plan.pivotRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul></div><div><h4>Main limitations</h4><ul>${plan.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>
      </details>
    </section>
  `;
}

function renderSurvivalResults(summary) {
  const currentRound = state.currentPick <= LEAGUE.teams * LEAGUE.rounds ? draftOrderFor(state.currentPick).round : 1;
  const tiers = (summary.survival || []).filter((row) => row.type === "tier" && row.round >= currentRound && row.round <= Math.min(8, currentRound + 4) && row.observed >= 4).sort((a, b) => a.survivalRate - b.survivalRate).slice(0, 8);
  if (!tiers.length) return `<section class="sim-section"><h3>Tier and player availability risks</h3><p class="empty">Insufficient completed rollouts to estimate tier survival. Run a Standard or Deep batch.</p></section>`;
  const rows = tiers.map((row) => `
    <div class="survival-row">
      <div><strong>${escapeHtml(row.name)}</strong><small>Observed from Round ${row.round} to the next user pick</small></div>
      <div class="tier-survival-bar"><i style="width:${Math.round(row.survivalRate * 100)}%"></i></div>
      <span>${escapeHtml(row.label)}</span>
      <b>${Math.round(row.survivalRate * 100)}%</b>
      <small>${row.observed} rollouts · ${row.confidence} confidence · ${Number.isFinite(row.followingPickSurvivalRate) ? `${Math.round(row.followingPickSurvivalRate * 100)}% at following pick` : "following pick unavailable"} · ${Math.round((row.endRoundSurvivalRate || 0) * 100)}% at round end${Number.isFinite(row.averagePlayersRemaining) ? ` · ${row.averagePlayersRemaining.toFixed(1)} players remain` : ""}</small>
    </div>
  `).join("");
  return `<section class="sim-section"><div class="sim-section-heading"><div><p class="eyebrow">Acquisition urgency</p><h3>Tier and player availability risks</h3></div></div><p class="sim-conclusion">The lowest survival tiers should influence when you act; they do not change static Lab Rank.</p><div class="survival-list">${rows}</div></section>`;
}

function renderStrategyComparison(summary) {
  const rows = summary.strategies.map((group, index) => `
    <div class="strategy-distribution-row ${index === 0 ? "leader" : ""}">
      <div><strong>${escapeHtml(group.label)}</strong><small>${group.count} runs · ${group.stability}</small></div>
      ${rangePlotHtml(group)}
      <span><b>${group.medianOutcome.toFixed(1)}</b> median</span>
      <span>${group.downside.toFixed(1)} downside</span>
      <span>#${group.avgRank.toFixed(1)} avg finish</span>
      <span>${percent(group.firstPlaceRate)} first</span>
      <span>${percent(group.top3Rate)} top-3</span>
      <span>${percent(group.actualPlayoffRate)} playoffs</span>
    </div>
  `).join("");
  return `
    <section class="sim-section">
      <div class="sim-section-heading"><div><p class="eyebrow">Distributions, not averages</p><h3>Strategy comparison</h3></div>${confidencePill(summary.confidence)}</div>
      <p class="sim-conclusion"><strong>${escapeHtml(summary.comparison.label)}.</strong> ${escapeHtml(summary.comparison.detail)}</p>
      <div class="strategy-distribution-table">${rows}</div>
      <p class="helper">Range bars show the middle 50% of outcomes. The line is the median and the small marker is the 10th-percentile downside. Outcome basis: ${escapeHtml(summary.outcomeBasis)}.</p>
    </section>
  `;
}

function renderOpeningBuilds(summary) {
  const rows = summary.openingBuilds.slice(0, 6).map((group, index) => `
    <div class="opening-build-row ${index === 0 ? "leader" : ""}">
      <div><strong>${escapeHtml(group.label)}</strong><small>${group.count} runs</small></div>
      ${rangePlotHtml(group)}
      <span>${group.medianOutcome.toFixed(1)} median</span>
      <span>${group.downside.toFixed(1)} downside</span>
      <span>${group.stability}</span>
    </div>
  `).join("");
  return `<section class="sim-section"><div class="sim-section-heading"><div><p class="eyebrow">Opening paths</p><h3>Opening-build comparison</h3></div></div><p class="sim-conclusion">The best opening is selected by median outcome, then downside protection and stability.</p><div class="opening-build-list">${rows}</div></section>`;
}

function renderCounterfactualPickLab() {
  const data = state.bulk.counterfactual || { status: "idle", results: [] };
  const total = LEAGUE.teams * LEAGUE.rounds;
  const order = state.currentPick <= total ? draftOrderFor(state.currentPick) : null;
  const available = order && order.team === state.userTeam && !state.viewedDraftId;
  if (!available) return `<section class="sim-section"><h3>Counterfactual Pick Lab</h3><p class="empty">${state.viewedDraftId ? "Saved drafts are read-only." : state.currentPick > total ? "The current draft is complete." : "The Pick Lab becomes available at your next active selection."}</p></section>`;
  if (data.status === "calculating") return `<section class="sim-section counterfactual-lab"><div class="sim-section-heading"><div><p class="eyebrow">Current pick</p><h3>Counterfactual Pick Lab</h3></div><span id="counterfactualProgress">${data.progress}/${data.total} rollouts</span></div><p>Forcing each reasonable candidate, completing the room, evaluating legal lineups, and running season outcomes. The real draft state is restored after every rollout.</p></section>`;
  if (["failed", "unavailable", "stale"].includes(data.status)) return `<section class="sim-section"><h3>Counterfactual Pick Lab</h3><p class="sim-warning">${escapeHtml(data.error || "Counterfactual analysis unavailable.")}</p><button id="refreshCounterfactualBtn" type="button">Retry decision analysis</button></section>`;
  if (data.status !== "ready" || !data.results?.length) return `<section class="sim-section counterfactual-lab"><div class="sim-section-heading"><div><p class="eyebrow">Current pick</p><h3>Counterfactual Pick Lab</h3></div><button id="refreshCounterfactualBtn" class="primary" type="button">Refresh decision analysis</button></div><p>Compare six to eight reasonable choices by forcing each player, simulating the rest of the draft, and evaluating the completed roster with the independent outcome model.</p></section>`;
  const leader = data.results[0];
  const closest = data.results[1];
  const pivot = data.results.find((row, index) => index > 0 && row.player.position !== leader.player.position) || data.results[2];
  const selected = [leader, closest, pivot].filter(Boolean).filter((row, index, array) => array.findIndex((item) => item.playerId === row.playerId) === index);
  const gap = closest ? (leader.medianRosterOutcome - closest.medianRosterOutcome) * 100 : 0;
  const close = closest && Math.abs(gap) < 2;
  const cards = selected.map((row, index) => `
    <article class="counterfactual-card ${index === 0 ? "leader" : ""}">
      <p class="eyebrow">${index === 0 ? "Strongest modeled choice" : row.player.position !== leader.player.position ? "Best positional pivot" : "Closest alternative"}</p>
      <h4>${escapeHtml(row.player.name)}</h4>
      <p>${row.player.position} · ${escapeHtml(row.player.team)} · Lab #${Math.round(row.player.consensusRank)} · ADP ${Number.isFinite(row.player.adp) ? row.player.adp.toFixed(1) : "—"} · Tier ${row.player.tier || "—"}</p>
      <div class="counterfactual-metrics"><div><strong>${percent(row.medianRosterOutcome)}</strong><span>Median playoff rate</span></div><div><strong>${percent(row.outcomeP25)}–${percent(row.outcomeP75)}</strong><span>Middle range</span></div><div><strong>${percent(row.downsideOutcome)}</strong><span>Downside</span></div></div>
      <p>${index === 0 ? "Leader" : `${Math.abs((leader.medianRosterOutcome - row.medianRosterOutcome) * 100).toFixed(1)} percentage points behind`} · ${row.rollouts} rollouts · ${escapeHtml(row.stabilityLabel)} · ${escapeHtml(row.confidence)} confidence</p>
      <p><strong>Draft outcomes:</strong> ${percent(row.firstPlaceDraftRate)} first-place grade · ${percent(row.topThreeDraftRate)} top-three grade · ${percent(row.championshipRate)} championships. <strong>Strategy compatibility:</strong> ${Math.round(row.strategyCompatibility * 100)}/100.</p>
      <p><strong>Opportunity cost:</strong> ${Math.round(row.replacementValueAfterPassing * 100)} replacement-cost index. <strong>Next options:</strong> ${escapeHtml(row.expectedNextRoundOptions.slice(0, 3).map((player) => `${player.name} ${Math.round(player.rate * 100)}%`).join(", ") || "limited")}</p>
      <p><strong>Main risk:</strong> ${escapeHtml(row.mainRisk)}</p>
      <div class="button-row"><button data-draft="${row.player.id}" class="${index === 0 ? "primary" : ""}" type="button">Draft ${escapeHtml(row.player.name)}</button><button data-player-detail="${row.player.id}" type="button">View player</button></div>
    </article>
  `).join("");
  return `<section class="sim-section counterfactual-lab"><div class="sim-section-heading"><div><p class="eyebrow">Current pick</p><h3>Counterfactual Pick Lab</h3></div><button id="refreshCounterfactualBtn" type="button">Refresh decision analysis</button></div>${close ? `<p class="close-decision"><strong>Close decision — no candidate has a decisive modeled advantage.</strong> The top two are separated by ${Math.abs(gap).toFixed(1)} percentage points.</p>` : `<p class="sim-conclusion">${escapeHtml(leader.player.name)} produced the strongest median completed-roster outcome across ${leader.rollouts} rollouts.</p>`}<div class="counterfactual-grid">${cards}</div></section>`;
}

function renderCommonTargets(summary) {
  const rows = summary.commonPlayers.slice(0, 12).map((item) => `<div class="bulk-player-row"><strong>R${item.round} ${escapeHtml(item.name)}</strong><span>${item.position}</span><span>${item.count}/${summary.totalRuns} all runs</span><span>${Math.round(item.successfulRate * 100)}% of strongest paths</span></div>`).join("");
  return `<section class="sim-section"><div class="sim-section-heading"><div><p class="eyebrow">Repeated evidence</p><h3>Common player targets</h3></div></div><p class="sim-conclusion">Frequency supports acquisition planning; it does not make a player intrinsically better than his Lab Rank.</p><div class="bulk-player-list">${rows || `<p class="empty">No repeated target pattern yet.</p>`}</div></section>`;
}

function renderBulkSimulator() {
  if ($("bulkCountInput")) $("bulkCountInput").value = state.bulk.count;
  if ($("bulkDepthSelect")) $("bulkDepthSelect").value = state.bulk.depth;
  if ($("bulkModeSelect")) $("bulkModeSelect").value = state.bulk.mode;
  if ($("bulkStrategySelect")) $("bulkStrategySelect").value = state.bulk.strategy;
  if ($("bulkRandomizeRoomInput")) $("bulkRandomizeRoomInput").checked = state.bulk.randomizeRoom;
  updateBulkProgress();

  const data = state.bulk.results;
  if (state.bulk.running && !data?.summary) {
    const detail = state.bulk.phase === "finalizing"
      ? state.bulk.phaseDetail || "Turning completed simulations into strategy, survival, and round-plan evidence…"
      : "Running completed drafts in browser-safe batches. Progress is shown above and cancellation is available between simulations.";
    $("bulkResults").innerHTML = `<div class="bulk-empty sim-running"><h3>Building the Draft Plan</h3><p>${escapeHtml(detail)}</p><div class="sim-skeleton"></div></div>`;
    return;
  }
  if (!data?.summary) {
    const message = state.bulk.error || (state.bulk.cancelled ? "The previous batch was cancelled before enough runs completed." : "Run a Standard comparison to generate a Draft Plan, strategy distributions, tier survival, and dynamic Draft Plan Priority.");
    $("bulkResults").innerHTML = `<div class="bulk-empty"><h3>No simulations completed</h3><p>${escapeHtml(message)}</p><p class="helper">Compare mode treats the count as runs per strategy. Standard schedules ${BULK_DEPTH_PRESETS.standard} runs for each of ${BULK_STRATEGIES.length} strategies.</p></div>`;
    return;
  }

  const { summary, runs = [] } = data;
  const selected = runs.find((run) => run.id === state.bulk.selectedRunId) || summary.examples?.[0] || null;
  if (selected && state.bulk.selectedRunId !== selected.id) state.bulk.selectedRunId = selected.id;
  const examples = [
    { label: "Best result", run: summary.examples?.[0] },
    { label: "Median result", run: summary.examples?.[1] },
    { label: "Downside result", run: summary.examples?.[2] },
    { label: "Highest-variance / worst result", run: summary.examples?.[3] },
  ].map((item) => runDetailCard(item.run, item.label)).join("");
  const runExplorer = runs.length ? bulkRunExplorer(runs, selected?.id) : `<p class="empty">Detailed per-run data is not retained after a browser reload. Run a new batch or use the previous export.</p>`;
  const replayBoard = selected ? bulkReplayBoard(selected) : `<p class="empty">Select a newly completed run to replay its board.</p>`;
  const selectedPickAnalysis = selected?.pickBreakdown?.slice(0, 5).map((pick) => `<li><strong>${escapeHtml(pick.label)}:</strong> ${escapeHtml(pick.player.name)} at pick ${pick.pick}. Alternatives: ${escapeHtml(pick.alternatives.map((player) => `${player.name} (${player.position})`).join(", ") || "None")}</li>`).join("") || "";

  const finalizationWarning = (summary.finalizationWarnings || []).length
    ? `<section class="sim-section"><p class="sim-warning"><strong>Finalization note:</strong> ${escapeHtml(summary.finalizationWarnings.join(" "))}</p></section>`
    : "";

  $("bulkResults").innerHTML = `
    ${finalizationWarning}
    ${renderDraftPlanResult(summary)}
    ${renderRoundObjectives(summary.draftPlan)}
    ${renderSurvivalResults(summary)}
    ${renderStrategyComparison(summary)}
    ${renderOpeningBuilds(summary)}
    ${renderCounterfactualPickLab()}
    ${renderCommonTargets(summary)}
    <section class="sim-section"><div class="sim-section-heading"><div><p class="eyebrow">Outcome examples</p><h3>Best, median, downside, and high-variance drafts</h3></div></div><div class="bulk-example-list">${examples}</div></section>
    <details class="sim-section sim-details"><summary>Run Explorer</summary><div class="bulk-run-explorer">${runExplorer}</div></details>
    <details class="sim-section sim-details"><summary>Replay Draft</summary>${replayBoard}</details>
    <details class="sim-section sim-details"><summary>Raw pick calculations and export notes</summary><p>${escapeHtml(summary.outcomeBasis)} across ${summary.seasonSimulationCount.toLocaleString()} simulated team-seasons. Static Lab Rank remains separate from dynamic Draft Plan Priority.</p><ul>${selectedPickAnalysis || "<li>Select a fresh run to review pick-level alternatives.</li>"}</ul></details>
  `;
}

function renderOverlayFormulaSummary() {
  const preset = OVERLAY_PRESETS[state.overlayStrength] || OVERLAY_PRESETS.balanced;
  const summary = $("overlayFormulaSummary");
  if (summary) {
    summary.textContent = `${Math.round(preset.base * 100)}% weighted source baseline + ${Math.round(preset.league * 100)}% league fit + ${Math.round(preset.guide * 100)}% draft-guide signal. Persona and scouting tendencies are applied in live recommendations, not forced into the static board.`;
  }
  const select = $("overlayStrengthSelect");
  if (select) select.value = state.overlayStrength;
}

function renderSourceWeightControls() {
  const container = $("sourceWeightControls");
  if (!container) return;
  if (!state.rankingSources.length) {
    container.innerHTML = `<p class="empty">No active ranking sources. Restore Sleeper ADP or upload a ranking file.</p>`;
    return;
  }
  container.innerHTML = state.rankingSources.map((source) => {
    const weight = rankingSourceWeight(source.name);
    return `
      <label class="source-weight-row">
        <span>
          <strong>${escapeHtml(source.name)}</strong>
          <small>${source.name === SEED_SOURCE.name ? "Default market anchor" : `${source.rows} uploaded players`}</small>
        </span>
        <input type="range" min="0" max="5" step="1" value="${weight}" data-ranking-source-weight="${escapeHtml(source.name)}" />
        <b>${weight}</b>
      </label>
    `;
  }).join("");
}

function renderSourceStatus() {
  renderOverlayFormulaSummary();
  renderSourceWeightControls();
  const sources = state.rankingSources.map((source) => {
    const isSeed = source.name === SEED_SOURCE.name;
    return `
    <div class="source-chip">
      <strong>${escapeHtml(source.name)}</strong>
      <span>${source.rows} players · weight ${rankingSourceWeight(source.name)}/5</span>
      <small>${escapeHtml(source.updatedAt)}</small>
      <button data-remove-ranking-source="${escapeHtml(source.name)}" type="button">${isSeed ? "Disable baseline" : "Remove"}</button>
    </div>
  `;
  }).join("");
  const restoreSeed = state.seedRankingsEnabled ? "" : `
    <div class="source-chip is-disabled">
      <strong>${SEED_SOURCE.name}</strong>
      <span>Disabled</span>
      <small>Uploaded rankings are currently the only baseline.</small>
      <button data-restore-seed-rankings="true" type="button">Restore Sleeper ADP</button>
    </div>
  `;
  const moved = PLAYERS.filter((player) => player.modelEdge).length;
  const sourceSummary = `
    <div class="source-chip source-summary">
      <strong>${PLAYERS.length} players in custom board</strong>
      <span>${state.rankingSources.length} active source${state.rankingSources.length === 1 ? "" : "s"} · ${moved} players adjusted</span>
      <small>${state.importedRankingRows.length} uploaded rows saved in this browser</small>
    </div>
  `;
  const status = $("sourceStatus");
  if (status) status.innerHTML = sourceSummary + sources + restoreSeed;
}

function playerMatchesCheatSheetSource(player) {
  if (state.cheatSheetSource === "ALL") return true;
  if (state.cheatSheetSource === "UPLOADED") return player.sourceNames?.some((name) => name !== SEED_SOURCE.name && !name.endsWith(" ADP"));
  if (state.cheatSheetSource === "SEED") return player.sourceNames?.includes(SEED_SOURCE.name);
  return player.sourceNames?.some((name) => name === state.cheatSheetSource || name.startsWith(`${state.cheatSheetSource} `));
}


function playerMatchesDraftPlanFilter(player) {
  const filter = state.cheatSheetPlanFilter || "ALL";
  if (filter === "ALL") return true;
  const priority = currentDraftPlanPriority(player.id);
  if (!priority) return false;
  const tags = new Set(priority.tags || []);
  const map = {
    core: ["Priority Target"],
    wait: ["Safe to Wait"],
    risk: ["Fragile Tier"],
    avoid: ["Expensive at Current Cost"],
    replacement: ["High Replacement Cost"],
    successful: ["Common Successful-Roster Player"],
    pivot: ["Strong Pivot"],
    discount: ["League-Market Discount"],
  };
  return (map[filter] || []).some((tag) => tags.has(tag));
}

function cheatSheetPlayers() {
  const query = state.cheatSheetSearch.toLowerCase().trim();
  const players = PLAYERS
    .filter((player) => state.cheatSheetPosition === "ALL" || player.position === state.cheatSheetPosition)
    .filter(playerMatchesCheatSheetSource)
    .filter(playerMatchesDraftPlanFilter)
    .filter((player) => {
      if (!query) return true;
      return [
        player.name,
        player.position,
        player.team,
        player.depthChartRole,
        player.competition,
        player.sourceSummary,
        player.aiAnalysis,
        player.sourceNames?.join(" "),
        player.tags?.join(" "),
        player.labAnalysis?.guidePositive?.join(" "),
        player.labAnalysis?.guideRisks?.join(" "),
      ].filter(Boolean).join(" ").toLowerCase().includes(query);
    });

  return players.sort((a, b) => {
    if (state.cheatSheetSort === "name") return a.name.localeCompare(b.name);
    if (state.cheatSheetSort === "priority") return (currentDraftPlanPriority(a.id)?.priorityRank || 9999) - (currentDraftPlanPriority(b.id)?.priorityRank || 9999);
    if (state.cheatSheetSort === "adp") return (a.adp || 9999) - (b.adp || 9999);
    if (state.cheatSheetSort === "baseRank") return (a.baseConsensusRank || 9999) - (b.baseConsensusRank || 9999);
    if (state.cheatSheetSort === "leagueFit") return (b.leagueFitScore || 0) - (a.leagueFitScore || 0);
    if (state.cheatSheetSort === "guideSignal") return (b.guideSignalScore || 0) - (a.guideSignalScore || 0);
    if (state.cheatSheetSort === "projection") return projectionForPlayer(b) - projectionForPlayer(a);
    if (state.cheatSheetSort === "tier") return (a.tier || 99) - (b.tier || 99) || (a.consensusRank || 9999) - (b.consensusRank || 9999);
    if (state.cheatSheetSort === "sourceCount") return (b.sourceCount || 0) - (a.sourceCount || 0) || (a.consensusRank || 9999) - (b.consensusRank || 9999);
    if (state.cheatSheetSort === "confidence") return (b.labAnalysis?.confidenceScore || 0) - (a.labAnalysis?.confidenceScore || 0) || (a.consensusRank || 9999) - (b.consensusRank || 9999);
    return (a.consensusRank || 9999) - (b.consensusRank || 9999);
  });
}

function renderCheatSheetSources() {
  const select = $("cheatSheetSource");
  if (!select) return;
  const sourceNames = [...new Set(state.rankingSources.map((source) => source.name))];
  const options = [
    `<option value="ALL">All sources</option>`,
    `<option value="UPLOADED">Uploaded only</option>`,
    `<option value="SEED">Sleeper ADP baseline</option>`,
    ...sourceNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`),
  ].join("");
  select.innerHTML = options;
  const allowed = new Set(["ALL", "UPLOADED", "SEED", ...sourceNames]);
  if (!allowed.has(state.cheatSheetSource)) state.cheatSheetSource = "ALL";
  select.value = state.cheatSheetSource;
}

function signedNumber(value, digits = 0) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
}

function renderCheatSheet() {
  if (!$("cheatSheetList")) return;
  renderCheatSheetSources();
  $("cheatSheetSearch").value = state.cheatSheetSearch;
  $("cheatSheetPosition").value = state.cheatSheetPosition;
  $("cheatSheetSort").value = state.cheatSheetSort;
  if ($("cheatSheetPlanFilter")) $("cheatSheetPlanFilter").value = state.cheatSheetPlanFilter || "ALL";
  const players = cheatSheetPlayers();
  const shown = players.slice(0, 300);
  const availableCount = players.filter((player) => !state.draftedIds.has(player.id)).length;
  const planReady = Boolean(state.bulk.priority?.length || state.bulk.results?.summary?.priority?.length);
  $("cheatSheetSummary").textContent = `${players.length} players${players.length > shown.length ? `, showing top ${shown.length}` : ""} · ${availableCount} available${planReady ? " · Draft Plan Priority active" : " · Static rankings only"}`;
  const planNotice = planReady
    ? `<p class="dynamic-rank-note"><strong>Static Lab Rank and dynamic Draft Plan Priority are separate.</strong> Priority reflects this draft's tier-loss risk, replacement cost, roster path, and market pressure; it never rewrites Lab Rank.</p>`
    : `<p class="dynamic-rank-note is-limited"><strong>Draft Plan Priority unavailable.</strong> Run the Draft Simulator to add dynamic acquisition urgency, survival, target-round, and plan-tag evidence.</p>`;
  const empty = `<p class="available-empty">No players match this custom board view.</p>`;
  $("cheatSheetList").innerHTML = `${planNotice}
    <div class="cheat-sheet-header lab-cheat-grid">
      <span>Lab</span><span>Plan</span><span>Player</span><span>Pos</span><span>Tier</span><span>ADP</span><span>Move</span><span>Next pick</span><span>Replacement</span><span>Confidence</span><span>Plan evidence</span><span>Why This Rank</span>
    </div>
    ${shown.length ? shown.map((player) => {
      const drafted = state.draftedIds.has(player.id);
      const analysis = player.labAnalysis || buildRankAnalysis(player);
      const priority = currentDraftPlanPriority(player.id);
      const movement = Number(priority?.movement || 0);
      const moveClass = movement > 0 ? "lab-up" : movement < 0 ? "lab-down" : "lab-flat";
      const confidenceClass = `confidence-${String(priority?.confidence || analysis.confidenceLabel || "low").toLowerCase()}`;
      const survival = priority?.nextPickSurvival;
      const survivalText = Number.isFinite(survival) ? `${Math.round(survival * 100)}% · ${priority?.survivalObserved || 0} runs` : "—";
      return `<div class="cheat-sheet-row lab-cheat-grid ${drafted ? "drafted" : ""}">
        <strong>#${Math.round(player.consensusRank || 999)}</strong>
        <strong>${priority ? `#${priority.priorityRank}` : "—"}</strong>
        <div><button class="player-name player-name-button" type="button" data-player-detail="${player.id}">${escapeHtml(player.name)}</button><small>${drafted ? "Drafted" : "Available"} · ${escapeHtml(player.team || "FA")}</small></div>
        <span class="position-pill ${player.position.toLowerCase()}">${player.position}</span>
        <span>${Number.isFinite(player.tier) ? player.tier : "—"}</span>
        <span>${Number.isFinite(player.adp) ? player.adp.toFixed(1) : "—"}</span>
        <strong class="${moveClass}" title="Priority movement versus static Lab Rank">${priority ? signedNumber(movement) : "—"}</strong>
        <span title="Estimated availability at the user's next selection">${survivalText}</span>
        <span>${priority ? Number(priority.replacementCost || 0).toFixed(1) : "—"}</span>
        <span class="confidence-badge ${confidenceClass}">${escapeHtml(priority?.confidence || analysis.confidenceLabel || "Low")}</span>
        <details class="rank-analysis-details"><summary>${priority ? escapeHtml((priority.tags || []).slice(0, 2).join(" · ") || "Plan aligned") : "No plan evidence"}</summary>${priority ? `<p>${escapeHtml(priority.explanation || "Market and value are aligned.")}</p><p><strong>Target:</strong> ${escapeHtml(priority.targetRound || "Current range")} · <strong>Threats:</strong> ${escapeHtml((priority.snipeThreats || []).join(", ") || "No specific manager")}</p>` : `<p>Run a simulation batch to calculate this evidence.</p>`}</details>
        <details class="rank-analysis-details"><summary>${escapeHtml(analysis.compactSummary || analysis.summary)}</summary>${rankAnalysisDetailHtml(player)}</details>
      </div>`;
    }).join("") : empty}`;
}

function scoutingReport() {
  return normalizeScoutingReport(state.sleeper.importData?.scoutingReport || null, LEAGUE.teams);
}

const BEHAVIOR_POSITIONS = ["QB", "RB", "WR", "TE"];

function behaviorClamp(value, min = 0, max = 100) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}

function behaviorPercent(value) {
  return `${Math.round(behaviorClamp(value, 0, 100))}%`;
}

function behaviorLevel(score, type = "confidence") {
  const value = behaviorClamp(score);
  if (type === "impact") {
    if (value >= 72) return "High impact";
    if (value >= 48) return "Moderate impact";
    return "Low impact";
  }
  if (type === "actionability") {
    if (value >= 72) return "Highly actionable";
    if (value >= 48) return "Actionable";
    return "Watch only";
  }
  if (type === "predictability") {
    if (value >= 72) return "Highly predictable";
    if (value >= 48) return "Moderately predictable";
    return "Unpredictable";
  }
  if (value >= 72) return "High confidence";
  if (value >= 48) return "Moderate confidence";
  return "Low confidence";
}

function behaviorConfidence({ drafts = 0, picks = 0, consistency = 0.5, recency = 0.65, slotPenalty = 0, fallback = false } = {}) {
  const draftScore = Math.min(1, drafts / 4);
  const pickTarget = drafts > 1 ? 36 : 18;
  const pickScore = Math.min(1, picks / pickTarget);
  const consistencyScore = behaviorClamp(consistency, 0, 1);
  const recencyScore = behaviorClamp(recency, 0, 1);
  let score = (draftScore * 30) + (pickScore * 25) + (consistencyScore * 28) + (recencyScore * 17);
  score *= 1 - behaviorClamp(slotPenalty, 0, 0.35);
  if (fallback) score *= 0.58;
  if (drafts === 1) score = Math.min(score, 47);
  if (!drafts || !picks) score = fallback ? Math.min(score, 28) : 0;
  score = Math.round(behaviorClamp(score));
  return {
    score,
    label: behaviorLevel(score),
    explanation: fallback
      ? "This read uses Persona fallback because qualifying manager history is unavailable."
      : drafts === 1
        ? "One completed draft provides an early signal, not a reliable long-term tendency."
        : `${drafts} completed draft${drafts === 1 ? "" : "s"} and ${picks} qualifying pick${picks === 1 ? "" : "s"} support this read.`,
  };
}

function behaviorImpact({ round = 8, affectedManagers = 1, inPickWindow = false, scarcity = 0.45, canAct = true } = {}) {
  const roundValue = Math.max(0.12, 1 - ((Math.max(1, round) - 1) / Math.max(10, LEAGUE.rounds)));
  const managerValue = Math.min(1, affectedManagers / Math.max(2, Math.ceil(LEAGUE.teams / 3)));
  const score = Math.round(behaviorClamp(
    (roundValue * 34)
    + (managerValue * 22)
    + (behaviorClamp(scarcity, 0, 1) * 24)
    + (inPickWindow ? 15 : 0)
    + (canAct ? 5 : 0)
  ));
  return { score, label: behaviorLevel(score, "impact") };
}

function behaviorConsistencyFromCounts(counts = {}) {
  const values = Object.values(counts).map(Number).filter(Number.isFinite);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total || !values.length) return 0;
  return Math.max(...values) / total;
}

function behaviorPersonaSource(teamNumber) {
  const source = state.personaSources?.[teamNumber - 1] || "default";
  if (source === "manual") return "Manual Persona selection";
  if (source === "scouting") return "League Behavior Lab inference";
  return "Default room mix";
}

function behaviorMarketReferenceLabel(report = scoutingReport()) {
  const pickMetadata = Number(report.league.marketReference?.pickMetadataCount || 0);
  const baselines = Number(report.league.marketReference?.baselineCount || 0);
  const directional = Number(report.league.marketReference?.directionalCount || 0);
  if (pickMetadata && pickMetadata >= baselines + directional) return "Pick-time market references where supplied";
  if (baselines && baselines >= directional) return `${historicalAdpCoverageSummary()} used as historical market evidence`;
  return "Directional comparison to the currently available ranking/ADP reference where no historical baseline matched";
}

function behaviorPositionRate(counts, position) {
  const total = Object.values(counts || {}).reduce((sum, count) => sum + Number(count || 0), 0);
  return total ? Number(counts?.[position] || 0) / total : 0;
}

function behaviorRecencySummary(profile) {
  const stats = Array.isArray(profile?.seasonStats) ? profile.seasonStats : [];
  if (stats.length < 2) return stats.length ? "Early signal from one season" : "No historical trend available";
  const primary = topCountLabel(profile.roundPositionBias?.early, "");
  if (!primary) return "Stable tendency";
  const ordered = [...stats].sort((a, b) => Number(b.season) - Number(a.season));
  const recent = behaviorPositionRate(ordered[0]?.roundPositionBias?.early, primary);
  const olderRates = ordered.slice(1).map((item) => behaviorPositionRate(item.roundPositionBias?.early, primary));
  const older = olderRates.length ? average(olderRates) : recent;
  if (recent >= older + 0.14) return "Strengthening trend";
  if (recent <= older - 0.14) return "Weakening trend";
  return "Stable tendency";
}

function behaviorProfileConfidence(profile, fallback = false) {
  const consistency = Math.max(
    behaviorConsistencyFromCounts(profile?.firstThreeBuilds),
    behaviorConsistencyFromCounts(profile?.roundPositionBias?.early)
  );
  const slotPenalty = Number(profile?.slotEffectShare || 0) >= 0.75 ? 0.12 : 0;
  return behaviorConfidence({
    drafts: Number(profile?.draftsAnalyzed || 0),
    picks: Number(profile?.picksAnalyzed || 0),
    consistency,
    recency: Number(profile?.recentWeightShare || 0.65),
    slotPenalty,
    fallback,
  });
}

function behaviorLeagueConfidence(report) {
  const profiled = report.teams.filter((team) => team.picksAnalyzed);
  const consistency = profiled.length
    ? average(profiled.map((team) => Math.max(
      behaviorConsistencyFromCounts(team.roundPositionBias?.early),
      behaviorConsistencyFromCounts(team.firstThreeBuilds)
    )))
    : 0;
  return behaviorConfidence({
    drafts: report.league.draftsAnalyzed,
    picks: report.league.picksAnalyzed,
    consistency,
    recency: 0.72,
  });
}

function behaviorCurrentRound() {
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick > total) return LEAGUE.rounds;
  return draftOrderFor(Math.max(1, state.currentPick)).round;
}

function behaviorPositionNeedWeight(team, position) {
  const roster = rosterFor(team);
  const counts = positionCounts(roster);
  const required = Number(LEAGUE.roster[position] || 0);
  const flexDemand = ["RB", "WR", "TE"].includes(position) ? Number(LEAGUE.roster.FLEX || 0) * 0.4 : 0;
  const target = required + flexDemand;
  if (!target) return 0.05;
  const gap = Math.max(0, target - Number(counts[position] || 0));
  return Math.min(0.32, gap / Math.max(1, target) * 0.32);
}

function behaviorPersonaPositionWeight(persona, position, round) {
  let weight = 0.12;
  if (persona.positionalAggression === position) weight += 0.22;
  if (persona.strategyStyle === "Zero RB" && position === "WR" && round <= 6) weight += 0.18;
  if (persona.strategyStyle === "Hero RB" && position === "RB" && round <= 3) weight += 0.16;
  if (persona.strategyStyle === "Robust RB" && position === "RB" && round <= 6) weight += 0.24;
  if (persona.strategyStyle === "WR Heavy" && position === "WR" && round <= 8) weight += 0.22;
  if (persona.strategyStyle === "Elite QB" && position === "QB" && round <= 6) weight += 0.25;
  if (persona.strategyStyle === "Elite TE" && position === "TE" && round <= 6) weight += 0.25;
  if (position === "QB" && round <= 4 && persona.strategyStyle !== "Elite QB") weight -= 0.05;
  if (position === "TE" && round <= 4 && persona.strategyStyle !== "Elite TE") weight -= 0.04;
  return Math.max(0.03, weight);
}

function behaviorManagerPositionProbabilities(teamNumber, round, report = scoutingReport()) {
  const profile = report.teams[teamNumber - 1];
  const persona = getPersonaForTeam(teamNumber);
  const exactCounts = profile?.roundPositionCounts?.[round] || {};
  const band = round <= 3 ? "early" : round <= 8 ? "middle" : "late";
  const bandCounts = profile?.roundPositionBias?.[band] || {};
  const exactTotal = Object.values(exactCounts).reduce((sum, count) => sum + Number(count || 0), 0);
  const bandTotal = Object.values(bandCounts).reduce((sum, count) => sum + Number(count || 0), 0);
  const historyAvailable = Boolean(profile?.picksAnalyzed && (exactTotal || bandTotal));
  const raw = {};
  BEHAVIOR_POSITIONS.forEach((position) => {
    const exactRate = exactTotal ? Number(exactCounts[position] || 0) / exactTotal : 0;
    const bandRate = bandTotal ? Number(bandCounts[position] || 0) / bandTotal : 0;
    const historyWeight = exactTotal >= 2 ? 0.62 : bandTotal ? 0.48 : 0;
    const historical = (exactRate * historyWeight) + (bandRate * Math.max(0, 0.64 - historyWeight));
    const personaSignal = behaviorPersonaPositionWeight(persona, position, round);
    const needSignal = behaviorPositionNeedWeight(teamNumber, position);
    raw[position] = Math.max(0.01, historical + personaSignal + needSignal);
  });
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  const probabilities = Object.fromEntries(BEHAVIOR_POSITIONS.map((position) => [position, raw[position] / total]));
  return {
    probabilities,
    source: historyAvailable ? "history + Persona + roster need" : "Persona + roster need fallback",
    fallback: !historyAvailable,
    evidencePicks: Number(profile?.picksAnalyzed || 0),
  };
}

function behaviorNextUserPick(fromPick = state.currentPick) {
  const total = LEAGUE.teams * LEAGUE.rounds;
  const start = Math.max(1, Number(fromPick) || 1);
  for (let pick = start; pick <= total; pick += 1) {
    if (draftOrderFor(pick).team === state.userTeam && !state.picks.some((item) => item.pick === pick)) return pick;
  }
  return null;
}

function behaviorPickWindowForecast(report = scoutingReport()) {
  const total = LEAGUE.teams * LEAGUE.rounds;
  if (state.currentPick > total) {
    return {
      active: false,
      positions: {},
      managers: [],
      picks: [],
      nextUserPick: null,
      basis: "Draft complete",
      horizons: {},
    };
  }

  const currentOrder = draftOrderFor(Math.max(1, state.currentPick));
  const start = currentOrder.team === state.userTeam ? state.currentPick + 1 : state.currentPick;
  const nextUserPick = behaviorNextUserPick(start);
  const currentRound = currentOrder.round;
  let currentRoundEnd = start;
  for (let pick = start; pick <= total; pick += 1) {
    if (draftOrderFor(pick).round !== currentRound) break;
    currentRoundEnd = pick;
  }

  const scanUntil = Math.min(total, Math.max(
    currentRoundEnd,
    nextUserPick ? nextUserPick - 1 : start,
    start + 7
  ));
  const futureOpponentPicks = [];
  for (let pick = start; pick <= scanUntil; pick += 1) {
    if (state.picks.some((item) => item.pick === pick)) continue;
    const order = draftOrderFor(pick);
    if (order.team === state.userTeam) continue;
    const model = behaviorManagerPositionProbabilities(order.team, order.round, report);
    const likely = [...BEHAVIOR_POSITIONS].sort((a, b) => model.probabilities[b] - model.probabilities[a])[0];
    futureOpponentPicks.push({
      pick,
      label: order.label,
      round: order.round,
      team: order.team,
      teamName: activeTeamName(order.team),
      likelyPosition: likely,
      probability: model.probabilities[likely],
      probabilities: model.probabilities,
      source: model.source,
      fallback: model.fallback,
      evidencePicks: model.evidencePicks,
    });
  }

  const summarize = (rows, emptyBasis) => {
    const positionDemand = Object.fromEntries(BEHAVIOR_POSITIONS.map((position) => [position, 0]));
    const managerMap = new Map();
    let fallbackCount = 0;
    rows.forEach((row) => {
      if (row.fallback) fallbackCount += 1;
      BEHAVIOR_POSITIONS.forEach((position) => {
        positionDemand[position] += Number(row.probabilities?.[position] || 0);
      });
      if (!managerMap.has(row.team)) managerMap.set(row.team, { team: row.team, teamName: row.teamName, picks: [], pressure: 0 });
      managerMap.get(row.team).picks.push(row);
      managerMap.get(row.team).pressure += Number(row.probability || 0);
    });
    const managers = [...managerMap.values()].sort((a, b) => b.pressure - a.pressure);
    const maxDemand = Math.max(...Object.values(positionDemand), 0.01);
    const positions = Object.fromEntries(BEHAVIOR_POSITIONS.map((position) => {
      const expected = Number(positionDemand[position] || 0);
      const relative = expected / maxDemand;
      const label = expected >= 1.65 || relative >= 0.82
        ? "High pressure"
        : expected >= 0.85 || relative >= 0.58
          ? "Moderate pressure"
          : "Low pressure";
      return [position, { expected, relative, label }];
    }));
    return {
      active: Boolean(rows.length),
      positions,
      managers,
      picks: rows,
      fallbackCount,
      basis: !rows.length
        ? emptyBasis
        : fallbackCount === rows.length
          ? "Persona and roster-need fallback"
          : fallbackCount
            ? "Historical tendencies blended with Persona and roster need"
            : "Historical tendencies, Persona, and roster need",
    };
  };

  const beforeNextRows = nextUserPick
    ? futureOpponentPicks.filter((row) => row.pick < nextUserPick)
    : [];
  const currentRoundRows = futureOpponentPicks.filter((row) => row.round === currentRound && row.pick <= currentRoundEnd);
  const nextThreeRows = futureOpponentPicks.slice(0, 3);
  const beforeNext = summarize(beforeNextRows, "No intervening opponent picks");
  const nextThree = summarize(nextThreeRows, "No upcoming opponent picks");
  const beforeRoundEnd = summarize(currentRoundRows, "No remaining opponent picks this round");

  return {
    ...beforeNext,
    nextUserPick,
    currentRound,
    currentRoundEnd,
    horizons: {
      nextThree,
      beforeNext,
      beforeRoundEnd,
    },
  };
}

function behaviorTierSupply(player) {
  if (!player) return 0;
  return availablePlayers().filter((candidate) => candidate.position === player.position && candidate.tier === player.tier).length;
}

function behaviorPlayerSurvival(player, forecast = behaviorPickWindowForecast()) {
  if (!forecast.active || !player || !forecast.positions[player.position]) {
    return { label: "Unknown", detail: "No active pick-window forecast is available." };
  }
  const pressure = forecast.positions[player.position].expected;
  const tierSupply = behaviorTierSupply(player);
  if (tierSupply <= 1 && pressure >= 0.75) {
    return { label: "Unlikely to survive", detail: `Only ${tierSupply} ${player.position} remains in this tier while the window projects ${pressure.toFixed(1)} ${player.position} selections.` };
  }
  if (pressure >= Math.max(1, tierSupply * 0.72)) {
    return { label: "At risk", detail: `${tierSupply} players remain in this ${player.position} tier and projected demand is ${pressure.toFixed(1)} before ${pickLabel(forecast.nextUserPick)}.` };
  }
  return { label: "Likely to survive", detail: `${tierSupply} players remain in the tier and projected ${player.position} demand is ${pressure.toFixed(1)} before your next selection.` };
}

function liveScoutingUrgencyScore(player, team = state.userTeam, pickNumber = state.currentPick) {
  if (team !== state.userTeam || pickNumber !== state.currentPick || !player) return 0;
  const forecast = behaviorPickWindowForecast();
  const position = forecast.positions?.[player.position];
  if (!forecast.active || !position) return 0;
  const tierSupply = Math.max(1, behaviorTierSupply(player));
  const pressureRatio = position.expected / tierSupply;
  const survival = behaviorPlayerSurvival(player, forecast).label;
  let score = Math.min(14, position.expected * 4.2 + pressureRatio * 7);
  if (survival === "Unlikely to survive") score += 6;
  else if (survival === "At risk") score += 3;
  return Math.round(Math.min(20, score) * 10) / 10;
}

function behaviorInsight({
  id,
  theme,
  headline,
  conclusion,
  evidence = [],
  interpretation,
  draftImpact,
  recommendation,
  watchFor,
  limitations = [],
  confidence,
  impact,
  predictability = 55,
  actionability = 65,
  evidenceCount = 0,
  seasons = [],
  relevantPicks = [],
  baseline = "League history",
  visual = null,
}) {
  const confidenceResult = confidence?.score !== undefined ? confidence : behaviorConfidence(confidence || {});
  const impactResult = impact?.score !== undefined ? impact : behaviorImpact(impact || {});
  const priority = (confidenceResult.score * 0.33) + (impactResult.score * 0.34) + (behaviorClamp(actionability) * 0.23) + (behaviorClamp(predictability) * 0.10);
  return {
    id: id || `edge-${theme}-${headline}`,
    theme,
    headline,
    conclusion,
    evidence,
    interpretation,
    draftImpact,
    recommendation,
    watchFor,
    limitations,
    confidence: confidenceResult,
    impact: impactResult,
    predictability: Math.round(behaviorClamp(predictability)),
    actionability: Math.round(behaviorClamp(actionability)),
    evidenceCount,
    seasons,
    relevantPicks,
    baseline,
    visual,
    priority,
  };
}

function behaviorMarketByPosition(report) {
  const league = report.league;
  return BEHAVIOR_POSITIONS.map((position) => {
    const row = league.reachByPosition?.[position] || {};
    const count = Number(row.count || 0);
    const avgDelta = count ? Number(row.sum || 0) / count : Number(row.avg || 0);
    return {
      position,
      count,
      avgDelta: Number.isFinite(avgDelta) ? avgDelta : 0,
      ahead: Number(row.ahead || 0),
      near: Number(row.near || 0),
      after: Number(row.after || 0),
    };
  });
}

function behaviorRunWindow(report) {
  const roundCounts = report.league.positionRoundCounts || {};
  const candidates = [];
  Object.entries(roundCounts).forEach(([roundKey, counts]) => {
    const round = Number(roundKey);
    if (!round || round > Math.min(10, LEAGUE.rounds)) return;
    const total = BEHAVIOR_POSITIONS.reduce((sum, position) => sum + Number(counts?.[position] || 0), 0);
    if (!total) return;
    BEHAVIOR_POSITIONS.forEach((position) => {
      const count = Number(counts?.[position] || 0);
      const share = count / total;
      if (count >= Math.max(3, report.league.draftsAnalyzed) && share >= 0.30) {
        candidates.push({ round, position, count, total, share });
      }
    });
  });
  return candidates.sort((a, b) => (b.share * b.count) - (a.share * a.count))[0] || null;
}

function behaviorMarketInsights(report) {
  const insights = [];
  const marketRows = behaviorMarketByPosition(report).filter((row) => row.count >= Math.max(5, report.league.draftsAnalyzed * 2));
  const leagueConfidence = behaviorLeagueConfidence(report);
  const over = [...marketRows].sort((a, b) => a.avgDelta - b.avgDelta)[0];
  const fall = [...marketRows].sort((a, b) => b.avgDelta - a.avgDelta)[0];
  const seasons = report.seasons.map((item) => item.season);
  if (over && over.avgDelta <= -3.5) {
    insights.push(behaviorInsight({
      id: `market-over-${over.position}`,
      theme: `market-${over.position}`,
      headline: `${over.position} is routinely pushed ahead of market`,
      conclusion: `The league selected ${over.position}s an average of ${Math.abs(over.avgDelta).toFixed(1)} picks before the available market reference.`,
      evidence: [
        `${over.count} qualifying ${over.position} selections were compared with market.`,
        `${over.ahead} were ahead of market, ${over.near} were near market, and ${over.after} came after market.`,
        `Comparison is ${behaviorMarketReferenceLabel(report).toLowerCase()}.`,
      ],
      interpretation: `Managers are more willing than the market to pay for ${over.position}, so consensus ADP may understate the room's actual cost.`,
      draftImpact: `The strongest ${over.position} tier can disappear earlier than a neutral draft board suggests.`,
      recommendation: `Do not chase every ${over.position} reach. Take the final player in a meaningful tier when the alternative is a clear drop; otherwise use the inflation to buy value elsewhere.`,
      watchFor: `If the first two ${over.position}s in the current tier go at or after market, downgrade this pressure signal.`,
      limitations: ["Historical season baselines are used for 2018–2025 where players match; unmatched seasons or players remain directional where noted."],
      confidence: leagueConfidence,
      impact: behaviorImpact({ round: Math.max(2, report.league.positionRounds?.[over.position] || 6), affectedManagers: report.teams.filter((team) => Number(team.reachByPosition?.[over.position]?.count || 0)).length, scarcity: 0.72 }),
      predictability: Math.min(88, 45 + (over.ahead / Math.max(1, over.count)) * 45),
      actionability: 78,
      evidenceCount: over.count,
      seasons,
      baseline: behaviorMarketReferenceLabel(report),
      visual: { type: "market", position: over.position, value: over.avgDelta },
    }));
  }
  if (fall && fall.avgDelta >= 3.5 && (!over || fall.position !== over.position)) {
    insights.push(behaviorInsight({
      id: `market-fall-${fall.position}`,
      theme: `market-${fall.position}`,
      headline: `${fall.position} value is more likely to fall`,
      conclusion: `The league selected ${fall.position}s an average of ${fall.avgDelta.toFixed(1)} picks after the available market reference.`,
      evidence: [
        `${fall.count} qualifying ${fall.position} selections were compared with market.`,
        `${fall.after} fell past market, while ${fall.ahead} were taken early.`,
      ],
      interpretation: `The room has historically been patient at ${fall.position}, creating more time than consensus ADP alone implies.`,
      draftImpact: `Paying full market price for a non-elite ${fall.position} can create avoidable opportunity cost.`,
      recommendation: `Wait when several comparable ${fall.position}s remain in the same tier. Move early only for a true tier break or an urgent roster need.`,
      watchFor: `If two ${fall.position}s leave within three picks, reassess; a new run can override the historical discount.`,
      limitations: ["The comparison uses a season baseline where available and current ADP only when no historical match exists."],
      confidence: leagueConfidence,
      impact: behaviorImpact({ round: Math.max(2, report.league.positionRounds?.[fall.position] || 7), affectedManagers: report.teams.filter((team) => Number(team.reachByPosition?.[fall.position]?.count || 0)).length, scarcity: 0.5 }),
      predictability: Math.min(85, 42 + (fall.after / Math.max(1, fall.count)) * 42),
      actionability: 76,
      evidenceCount: fall.count,
      seasons,
      baseline: behaviorMarketReferenceLabel(report),
      visual: { type: "market", position: fall.position, value: fall.avgDelta },
    }));
  }
  const run = behaviorRunWindow(report);
  if (run) {
    const teamsInWindow = report.teams.filter((team) => Number(team.roundPositionCounts?.[run.round]?.[run.position] || 0) > 0).length;
    insights.push(behaviorInsight({
      id: `run-${run.position}-${run.round}`,
      theme: `run-${run.position}`,
      headline: `${run.position} pressure most often spikes in Round ${run.round}`,
      conclusion: `${run.position} accounted for ${Math.round(run.share * 100)}% of qualifying skill-position picks in this round.`,
      evidence: [
        `${run.count} of ${run.total} qualifying QB/RB/WR/TE picks in Round ${run.round} were ${run.position}.`,
        `${teamsInWindow} manager${teamsInWindow === 1 ? "" : "s"} contributed to the pattern.`,
      ],
      interpretation: `This is the clearest historical run window, but it may include both managers starting a run and managers reacting to it.`,
      draftImpact: `A player tier at ${run.position} is more vulnerable near this round than in the rounds immediately around it.`,
      recommendation: `Enter Round ${run.round} with a clear ${run.position} tier boundary. Take the last acceptable option before the drop, but do not follow the run when equivalent value is available elsewhere.`,
      watchFor: `If the room reaches Round ${run.round} with unusually deep ${run.position} inventory, the run may start later than history suggests.`,
      limitations: ["Keeper effects and draft-slot context can shift the exact start of a run."],
      confidence: behaviorConfidence({ drafts: report.league.draftsAnalyzed, picks: run.total, consistency: run.share, recency: 0.7 }),
      impact: behaviorImpact({ round: run.round, affectedManagers: teamsInWindow, scarcity: Math.min(1, run.share + 0.25) }),
      predictability: Math.round(run.share * 100),
      actionability: 82,
      evidenceCount: run.count,
      seasons,
      baseline: `All qualifying Round ${run.round} QB/RB/WR/TE picks`,
      visual: { type: "share", position: run.position, value: run.share * 100 },
    }));
  }
  return insights;
}

function behaviorPickWindowInsight(report) {
  const forecast = behaviorPickWindowForecast(report);
  if (!forecast.active) return null;
  const top = [...BEHAVIOR_POSITIONS].sort((a, b) => forecast.positions[b].expected - forecast.positions[a].expected)[0];
  const position = forecast.positions[top];
  const topManagers = forecast.picks.filter((pick) => pick.likelyPosition === top).slice(0, 4);
  const historicalPicks = topManagers.reduce((sum, pick) => sum + Number(report.teams[pick.team - 1]?.picksAnalyzed || 0), 0);
  const fallback = forecast.fallbackCount === forecast.picks.length;
  const confidence = behaviorConfidence({
    drafts: report.league.draftsAnalyzed,
    picks: historicalPicks,
    consistency: position.relative,
    recency: 0.78,
    fallback,
  });
  return behaviorInsight({
    id: `live-window-${top}-${forecast.nextUserPick}`,
    theme: `live-window-${top}`,
    headline: `${top} pressure builds before your next turn`,
    conclusion: `${forecast.picks.length} intervening pick${forecast.picks.length === 1 ? "" : "s"} project ${position.expected.toFixed(1)} ${top} selections before ${pickLabel(forecast.nextUserPick)}.`,
    evidence: [
      `${topManagers.length || forecast.picks.length} manager pick${(topManagers.length || forecast.picks.length) === 1 ? "" : "s"} carry the strongest ${top} lean in the window.`,
      topManagers.length ? `Primary pressure: ${topManagers.map((pick) => `${pick.teamName} at ${pick.label}`).join("; ")}.` : "Pressure is distributed rather than tied to one manager.",
      `Forecast basis: ${forecast.basis}.`,
    ],
    interpretation: `${top} is the most likely position to lose depth before your next selection, but the forecast is a timing input rather than a change to static player value.`,
    draftImpact: `The current ${top} tier has elevated depletion risk before your next pick.`,
    recommendation: `Take a ${top} now only when the player is the final acceptable option in a tier. Otherwise allow the room to create value at another position.`,
    watchFor: `A non-${top} pick by either of the next two managers should reduce the pressure estimate immediately.`,
    limitations: fallback
      ? ["No qualifying historical behavior was available for the managers in this window; the estimate relies on Personas and roster needs."]
      : ["Current roster needs can override a manager's historical position preference."],
    confidence,
    impact: behaviorImpact({ round: behaviorCurrentRound(), affectedManagers: forecast.managers.length, inPickWindow: true, scarcity: position.relative }),
    predictability: Math.round(position.relative * 100),
    actionability: 92,
    evidenceCount: forecast.picks.length,
    seasons: report.seasons.map((item) => item.season),
    relevantPicks: forecast.picks.map((pick) => pick.label),
    baseline: "Managers selecting before the user's next pick",
    visual: { type: "pressure", position: top, value: position.relative * 100 },
  });
}

function behaviorSelfContradictionInsight(report) {
  const profile = report.teams[state.userTeam - 1];
  if (!profile?.picksAnalyzed) return null;
  const actual = topCountLabel(profile.roundPositionBias?.early, "Balanced");
  const expectedMap = {
    zeroRB: "WR",
    robustRB: "RB",
    heroRB: "RB",
    wrHeavy: "WR",
    eliteQBTE: "QB/TE",
    safeFloor: "market discipline",
    upside: "upside",
    weeklyEdge: "balanced starters",
    balanced: "balanced",
  };
  const expected = expectedMap[state.strategy] || "balanced";
  let conflict = false;
  if (expected === "WR" && actual !== "WR") conflict = true;
  if (expected === "RB" && actual !== "RB") conflict = true;
  if (expected === "QB/TE" && !["QB", "TE"].includes(actual)) conflict = true;
  if (state.strategy === "safeFloor" && profile.avgReach <= -6) conflict = true;
  if (!conflict) return null;
  const confidence = behaviorProfileConfidence(profile);
  return behaviorInsight({
    id: "self-strategy-gap",
    theme: "self-scout",
    headline: "Your stated strategy and actual openings diverge",
    conclusion: `Your selected ${BULK_STRATEGIES.find((item) => item.id === state.strategy)?.label || state.strategy} approach points toward ${expected}, while your historical early-round lean is ${actual}.`,
    evidence: [
      `Most common opening build: ${topCountLabel(profile.firstThreeBuilds, "No repeated build")}.`,
      `Early position mix: ${sortedCountEntries(profile.roundPositionBias?.early).slice(0, 3).map(([position, count]) => `${position} ${count}`).join(", ") || "no qualifying picks"}.`,
    ],
    interpretation: "The mismatch may reflect intentional flexibility, but it can also reveal a run-chasing or comfort-pick habit.",
    draftImpact: "A predictable pivot away from your plan can cause you to pay for a position after the room creates urgency.",
    recommendation: `Before the draft, define the exact condition that would justify moving away from ${expected}.`,
    watchFor: "If your board presents a genuine tier fall, flexibility is a strength rather than a contradiction.",
    limitations: ["Selected strategy may have changed since the historical drafts were completed."],
    confidence,
    impact: behaviorImpact({ round: 3, affectedManagers: 1, scarcity: 0.48 }),
    predictability: Math.round(behaviorConsistencyFromCounts(profile.firstThreeBuilds) * 100),
    actionability: 84,
    evidenceCount: profile.picksAnalyzed,
    seasons: profile.seasons || [],
    baseline: `Selected strategy: ${state.strategy}`,
    visual: { type: "share", position: actual, value: behaviorPositionRate(profile.roundPositionBias?.early, actual) * 100 },
  });
}

function behaviorDraftDayEdges(report) {
  const candidates = [
    behaviorPickWindowInsight(report),
    ...behaviorMarketInsights(report),
    behaviorSelfContradictionInsight(report),
  ].filter(Boolean);
  const deduped = new Map();
  candidates.forEach((insight) => {
    const existing = deduped.get(insight.theme);
    if (!existing || insight.priority > existing.priority) deduped.set(insight.theme, insight);
  });
  return [...deduped.values()]
    .filter((insight) => insight.confidence.score >= 24 && insight.impact.score >= 30)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

function behaviorConsolidatedTendencies(report) {
  const reliableProfiles = report.teams.filter((team) => team.picksAnalyzed && behaviorProfileConfidence(team).score >= 60);
  const tendencies = [];
  const add = (key, evidenceCount) => {
    if (evidenceCount > 0 && !tendencies.some((item) => item.key === key)) tendencies.push({ key, evidenceCount });
  };
  BEHAVIOR_POSITIONS.forEach((position) => {
    const earlyCount = reliableProfiles.filter((team) => topCountLabel(team.roundPositionBias?.early, "") === position).length;
    if (earlyCount >= 2) add(`early-${position}`, earlyCount);
  });
  add("aggressive-market", reliableProfiles.filter((team) => Number(team.avgReach || 0) <= -6).length >= 2 ? reliableProfiles.filter((team) => Number(team.avgReach || 0) <= -6).length : 0);
  add("patient-market", reliableProfiles.filter((team) => Number(team.avgReach || 0) >= 6).length >= 2 ? reliableProfiles.filter((team) => Number(team.avgReach || 0) >= 6).length : 0);
  add("run-chasing", reliableProfiles.filter((team) => Number(team.runOpportunityCount || 0) >= 4 && Number(team.runChaseRate || 0) >= 0.5).length >= 2 ? reliableProfiles.filter((team) => Number(team.runOpportunityCount || 0) >= 4 && Number(team.runChaseRate || 0) >= 0.5).length : 0);
  add("run-starting", reliableProfiles.filter((team) => Number(team.runStartOpportunityCount || 0) >= 6 && Number(team.runStartRate || 0) >= 0.2).length >= 2 ? reliableProfiles.filter((team) => Number(team.runStartOpportunityCount || 0) >= 6 && Number(team.runStartRate || 0) >= 0.2).length : 0);
  add("roster-need", reliableProfiles.filter((team) => Number(team.needOpportunityCount || 0) >= 8 && Number(team.needFillRate || 0) >= 0.68).length >= 3 ? reliableProfiles.filter((team) => Number(team.needOpportunityCount || 0) >= 8 && Number(team.needFillRate || 0) >= 0.68).length : 0);
  add("early-qb", reliableProfiles.filter((team) => Number(team.positionMinRound?.QB || 99) <= 6).length >= 2 ? reliableProfiles.filter((team) => Number(team.positionMinRound?.QB || 99) <= 6).length : 0);
  add("early-te", reliableProfiles.filter((team) => Number(team.positionMinRound?.TE || 99) <= 6).length >= 2 ? reliableProfiles.filter((team) => Number(team.positionMinRound?.TE || 99) <= 6).length : 0);
  const repeatBuilders = reliableProfiles.filter((team) => behaviorConsistencyFromCounts(team.firstThreeBuilds) >= 0.6).length;
  if (repeatBuilders >= 2) add("repeat-builds", repeatBuilders);
  behaviorMarketInsights(report).forEach((insight) => {
    if (insight.confidence.score >= 60) add(insight.theme, insight.evidenceCount || 1);
  });
  return tendencies.sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 6);
}

function behaviorReliableTendencyCount(report) {
  return behaviorConsolidatedTendencies(report).length;
}

function behaviorWatchItems(report) {
  const items = [];
  if (report.league.draftsAnalyzed === 1) items.push("One-draft early signal");
  const historical = Number(report.league.marketReference?.historicalCount || 0);
  const directional = Number(report.league.marketReference?.directionalCount || 0);
  if (directional > historical) items.push("Directional ADP comparison");
  if (report.teams.some((team) => team.picksAnalyzed && Number(team.slotEffectShare || 0) >= 0.75)) items.push("Draft-slot effect");
  if (report.teams.some((team) => team.picksAnalyzed && behaviorProfileConfidence(team).score < 48)) items.push("Low-confidence manager read");
  if (report.teams.some((team) => team.picksAnalyzed && Number(team.recentWeightShare || 0) < 0.45 && Number(team.draftsAnalyzed || 0) > 1)) items.push("Older-history dependence");
  return [...new Set(items)].slice(0, 5);
}

function behaviorWatchCount(report) {
  return behaviorWatchItems(report).length;
}

function behaviorInsightVisual(insight) {
  if (!insight.visual) return "";
  const value = behaviorClamp(insight.visual.value);
  const label = insight.visual.type === "market"
    ? `${Math.abs(Number(insight.visual.value || 0)).toFixed(1)} picks ${Number(insight.visual.value) < 0 ? "ahead" : "after"}`
    : `${Math.round(value)}% signal`;
  return `
    <div class="behavior-mini-visual" aria-label="${escapeHtml(label)}">
      <span>${escapeHtml(insight.visual.position || "Signal")}</span>
      <div><i style="width:${value}%"></i></div>
      <strong>${escapeHtml(label)}</strong>
    </div>
  `;
}

function renderBehaviorInsightCard(insight) {
  return `
    <details class="behavior-edge-card">
      <summary>
        <div class="behavior-edge-heading">
          <div class="behavior-edge-badges">
            <span class="impact-${insight.impact.score >= 72 ? "high" : insight.impact.score >= 48 ? "medium" : "low"}">${escapeHtml(insight.impact.label)}</span>
            <span>${escapeHtml(insight.confidence.label)} · ${insight.confidence.score}%</span>
          </div>
          <h3>${escapeHtml(insight.headline)}</h3>
          <p>${escapeHtml(insight.conclusion)}</p>
          ${behaviorInsightVisual(insight)}
        </div>
        <span class="behavior-expand-label">View evidence</span>
      </summary>
      <div class="behavior-edge-details">
        <section>
          <h4>Observation</h4>
          <p>${escapeHtml(insight.conclusion)}</p>
        </section>
        <section>
          <h4>Evidence</h4>
          <ul>${insight.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section>
          <h4>Interpretation</h4>
          <p>${escapeHtml(insight.interpretation)}</p>
        </section>
        <section>
          <h4>Draft impact</h4>
          <p>${escapeHtml(insight.draftImpact)}</p>
        </section>
        <section class="behavior-response">
          <h4>Recommended response</h4>
          <p>${escapeHtml(insight.recommendation)}</p>
        </section>
        <section>
          <h4>Watch for</h4>
          <p>${escapeHtml(insight.watchFor)}</p>
        </section>
        ${insight.limitations.length ? `<section><h4>What could change the read</h4><ul>${insight.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
        <details class="behavior-calculation">
          <summary>How this was calculated</summary>
          <div>
            <p><strong>Evidence count:</strong> ${insight.evidenceCount || 0}</p>
            <p><strong>Seasons:</strong> ${escapeHtml(insight.seasons?.join(", ") || "Not available")}</p>
            <p><strong>Baseline:</strong> ${escapeHtml(insight.baseline || "League history")}</p>
            <p><strong>Predictability:</strong> ${insight.predictability}% · ${escapeHtml(behaviorLevel(insight.predictability, "predictability"))}</p>
            <p><strong>Actionability:</strong> ${insight.actionability}% · ${escapeHtml(behaviorLevel(insight.actionability, "actionability"))}</p>
          </div>
        </details>
      </div>
    </details>
  `;
}

function behaviorHeatmapSource(report, { manager = "league", season = "all" } = {}) {
  if (manager !== "league") {
    const team = report.teams[Number(manager) - 1];
    if (season !== "all") {
      return team?.seasonStats?.find((item) => String(item.season) === String(season))?.roundPositionCounts || {};
    }
    return team?.roundPositionCounts || {};
  }
  if (season !== "all") {
    return report.league.seasonStats?.find((item) => String(item.season) === String(season))?.positionRoundCounts || {};
  }
  return report.league.positionRoundCounts || {};
}

function renderBehaviorHeatmap(report, options = {}) {
  const countsByRound = behaviorHeatmapSource(report, options);
  const maxRound = Math.min(Number(options.roundEnd || 10), LEAGUE.rounds);
  const minRound = Math.max(1, Number(options.roundStart || 1));
  const positions = options.position && options.position !== "ALL" ? [options.position] : BEHAVIOR_POSITIONS;
  const rounds = Array.from({ length: Math.max(0, maxRound - minRound + 1) }, (_, index) => minRound + index);
  const maxCell = Math.max(1, ...rounds.flatMap((round) => positions.map((position) => Number(countsByRound?.[round]?.[position] || 0))));
  const cells = positions.map((position) => `
    <div class="behavior-heatmap-row">
      <strong>${position}</strong>
      ${rounds.map((round) => {
        const count = Number(countsByRound?.[round]?.[position] || 0);
        const intensity = count ? Math.max(0.12, count / maxCell) : 0;
        return `<span style="--heat:${intensity}" title="${escapeHtml(`${position}: ${count} pick${count === 1 ? "" : "s"} in Round ${round}`)}">${count || ""}</span>`;
      }).join("")}
    </div>
  `).join("");
  const totals = rounds.map((round) => BEHAVIOR_POSITIONS.reduce((sum, position) => sum + Number(countsByRound?.[round]?.[position] || 0), 0));
  const strongestRoundIndex = totals.indexOf(Math.max(...totals, 0));
  const conclusion = strongestRoundIndex >= 0 && totals[strongestRoundIndex]
    ? `Round ${rounds[strongestRoundIndex]} contains the densest qualifying position activity in this view.`
    : "There are not enough qualifying picks for a position-by-round conclusion in this view.";
  return `
    <section class="behavior-visual-card">
      <div class="behavior-section-heading"><div><p class="eyebrow">Position-by-round heatmap</p><h3>Where position demand clusters</h3></div></div>
      <div class="behavior-heatmap" style="--round-columns:${Math.max(1, rounds.length)}">
        <div class="behavior-heatmap-header"><span>Pos</span>${rounds.map((round) => `<strong>R${round}</strong>`).join("")}</div>
        ${cells}
      </div>
      <p class="behavior-conclusion">${escapeHtml(conclusion)}</p>
    </section>
  `;
}

function renderBehaviorAdpVisual(report, manager = "league") {
  const source = manager === "league" ? report.league : report.teams[Number(manager) - 1];
  const rows = BEHAVIOR_POSITIONS.map((position) => {
    const record = source?.reachByPosition?.[position] || {};
    const count = Number(record.count || 0);
    const avgDelta = count ? Number(record.sum || 0) / count : 0;
    const clamped = Math.max(-20, Math.min(20, avgDelta));
    const width = Math.abs(clamped) / 20 * 50;
    const left = clamped < 0 ? 50 - width : 50;
    const label = !count ? "No sample" : avgDelta <= -4 ? "Ahead of market" : avgDelta >= 4 ? "After market" : "Near market";
    return `
      <div class="behavior-adp-row">
        <strong>${position}</strong>
        <div class="behavior-adp-track"><i style="left:${left}%;width:${width}%"></i></div>
        <span>${count ? `${avgDelta >= 0 ? "+" : ""}${avgDelta.toFixed(1)}` : "—"}</span>
        <small>${escapeHtml(label)} · ${count} picks</small>
      </div>
    `;
  }).join("");
  const marketRows = BEHAVIOR_POSITIONS.map((position) => {
    const record = source?.reachByPosition?.[position] || {};
    const count = Number(record.count || 0);
    return { position, count, avg: count ? Number(record.sum || 0) / count : 0 };
  }).filter((row) => row.count);
  const strongest = marketRows.sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))[0];
  const conclusion = strongest
    ? `${strongest.position} shows the largest directional market difference at ${Math.abs(strongest.avg).toFixed(1)} picks ${strongest.avg < 0 ? "ahead of" : "after"} the reference.`
    : "No reliable ADP comparison is available in this view.";
  return `
    <section class="behavior-visual-card">
      <div class="behavior-section-heading"><div><p class="eyebrow">ADP behavior</p><h3>Ahead, near, or after market</h3></div></div>
      <div class="behavior-adp-chart">${rows}</div>
      <p class="behavior-conclusion">${escapeHtml(conclusion)} ${escapeHtml(behaviorMarketReferenceLabel(report))}.</p>
    </section>
  `;
}

function renderBehaviorPressureVisual(report) {
  const forecast = behaviorPickWindowForecast(report);
  const horizonRows = [
    { key: "nextThree", label: "Next three opponent picks", data: forecast.horizons?.nextThree },
    { key: "beforeNext", label: forecast.nextUserPick ? `Before ${pickLabel(forecast.nextUserPick)}` : "Before your next pick", data: forecast.horizons?.beforeNext },
    { key: "beforeRoundEnd", label: forecast.currentRound ? `Before the end of Round ${forecast.currentRound}` : "Before round end", data: forecast.horizons?.beforeRoundEnd },
  ];
  const activeHorizons = horizonRows.filter((item) => item.data?.active);
  if (!activeHorizons.length) {
    return `
      <section class="behavior-visual-card">
        <div class="behavior-section-heading"><div><p class="eyebrow">Pick-window pressure</p><h3>No active window to forecast</h3></div></div>
        <p class="behavior-conclusion">Start or resume a draft to compare the managers selecting in the next three picks, before your next turn, and before the end of the round.</p>
      </section>
    `;
  }

  const cells = BEHAVIOR_POSITIONS.map((position) => `
    <div class="behavior-pressure-horizon-row">
      <strong>${position}</strong>
      ${horizonRows.map((horizon) => {
        const item = horizon.data?.positions?.[position];
        return `<span class="${item?.label === "High pressure" ? "is-high" : item?.label === "Moderate pressure" ? "is-medium" : "is-low"}"><b>${item ? item.expected.toFixed(1) : "—"}</b><small>${escapeHtml(item?.label || "No window")}</small></span>`;
      }).join("")}
    </div>
  `).join("");
  const strongestHorizon = forecast.horizons?.beforeNext?.active
    ? forecast.horizons.beforeNext
    : activeHorizons[0].data;
  const top = [...BEHAVIOR_POSITIONS].sort((a, b) => Number(strongestHorizon.positions?.[b]?.expected || 0) - Number(strongestHorizon.positions?.[a]?.expected || 0))[0];
  const tierReads = BEHAVIOR_POSITIONS.map((position) => {
    const player = availablePlayers().find((candidate) => candidate.position === position);
    if (!player) return null;
    const survival = behaviorPlayerSurvival(player, forecast);
    return `<li><strong>${position} · Tier ${escapeHtml(player.tier || "—")}</strong><span>${escapeHtml(survival.label)}</span><small>${escapeHtml(survival.detail)}</small></li>`;
  }).filter(Boolean).join("");
  const basis = activeHorizons.map((item) => item.data.basis).find((item) => item && !item.includes("fallback")) || activeHorizons[0].data.basis;

  return `
    <section class="behavior-visual-card behavior-pressure-card">
      <div class="behavior-section-heading"><div><p class="eyebrow">Position demand and run pressure</p><h3>Three draft horizons</h3></div></div>
      <div class="behavior-pressure-horizon" role="table" aria-label="Estimated positional demand by pick horizon">
        <div class="behavior-pressure-horizon-header"><span>Pos</span>${horizonRows.map((item) => `<strong>${escapeHtml(item.label)}</strong>`).join("")}</div>
        ${cells}
      </div>
      <p class="behavior-conclusion">${top} carries the strongest pressure in the most decision-relevant active window. Basis: ${escapeHtml(basis)}.</p>
      ${tierReads ? `<div class="behavior-tier-risk"><h4>Current tier survival read</h4><ul>${tierReads}</ul></div>` : ""}
      <details class="behavior-calculation"><summary>Managers before your next selection</summary><div>${(forecast.picks || []).length ? forecast.picks.map((pick) => `<p><strong>${escapeHtml(pick.teamName)} · ${escapeHtml(pick.label)}</strong><br>${escapeHtml(pick.likelyPosition)} lean · ${escapeHtml(pick.source)}</p>`).join("") : `<p>No opponent picks occur before your next selection.</p>`}</div></details>
    </section>
  `;
}

function behaviorManagerTraits(profile, report) {
  const early = profile.roundPositionBias?.early || {};
  const allPicks = profile.pickRecords || [];
  const rookieCount = allPicks.filter((pick) => pick.isRookie).length;
  const reachAggression = behaviorClamp(50 - Number(profile.avgReach || 0) * 2.2);
  const minQb = Number(profile.positionMinRound?.QB || LEAGUE.rounds + 1);
  const minTe = Number(profile.positionMinRound?.TE || LEAGUE.rounds + 1);
  const consistency = behaviorConsistencyFromCounts(profile.firstThreeBuilds) * 100;
  const runChase = Number(profile.runOpportunityCount || 0) ? Number(profile.runChaseCount || 0) / profile.runOpportunityCount * 100 : 0;
  const needSensitivity = Number(profile.needOpportunityCount || 0) ? Number(profile.needFillCount || 0) / profile.needOpportunityCount * 100 : 50;
  return [
    { key: "adp", label: "ADP aggression", value: reachAggression },
    { key: "qb", label: "Early-QB tendency", value: behaviorClamp(110 - minQb * 13) },
    { key: "te", label: "Early-TE tendency", value: behaviorClamp(110 - minTe * 13) },
    { key: "rb", label: "RB investment", value: behaviorPositionRate(early, "RB") * 100 },
    { key: "wr", label: "WR investment", value: behaviorPositionRate(early, "WR") * 100 },
    { key: "rookie", label: "Rookie/upside preference", value: allPicks.length ? rookieCount / allPicks.length * 100 : 0, directional: true },
    { key: "run", label: "Run chasing", value: runChase },
    { key: "consistency", label: "Strategy consistency", value: consistency },
    { key: "need", label: "Roster-need sensitivity", value: needSensitivity },
    { key: "risk", label: "Risk tolerance", value: behaviorClamp((reachAggression * 0.62) + ((allPicks.length ? rookieCount / allPicks.length * 100 : 35) * 0.38)), directional: true },
  ];
}

function behaviorLeagueTraitAverages(report) {
  const profiles = report.teams.filter((team) => team.picksAnalyzed);
  const map = {};
  profiles.forEach((profile) => {
    behaviorManagerTraits(profile, report).forEach((trait) => {
      if (!map[trait.key]) map[trait.key] = [];
      map[trait.key].push(trait.value);
    });
  });
  return Object.fromEntries(Object.entries(map).map(([key, values]) => [key, average(values)]));
}

function renderBehaviorFingerprint(profile, report) {
  const traits = behaviorManagerTraits(profile, report);
  const leagueAverage = behaviorLeagueTraitAverages(report);
  const rows = traits.map((trait) => {
    const averageValue = Number(leagueAverage[trait.key] || 0);
    return `
      <div class="behavior-fingerprint-row">
        <strong>${escapeHtml(trait.label)}</strong>
        <div class="behavior-fingerprint-track">
          <i style="width:${behaviorClamp(trait.value)}%"></i>
          <b style="left:${behaviorClamp(averageValue)}%" title="League average ${Math.round(averageValue)}"></b>
        </div>
        <span>${Math.round(trait.value)}</span>
        ${trait.directional ? `<small>Directional</small>` : ""}
      </div>
    `;
  }).join("");
  const mostDistinct = [...traits].sort((a, b) => Math.abs(b.value - Number(leagueAverage[b.key] || 0)) - Math.abs(a.value - Number(leagueAverage[a.key] || 0)))[0];
  const conclusion = mostDistinct
    ? `${mostDistinct.label} is the clearest difference from the league average.`
    : "Not enough data exists for a manager fingerprint.";
  return `
    <section class="behavior-visual-card behavior-fingerprint-card">
      <div class="behavior-section-heading"><div><p class="eyebrow">Manager fingerprint</p><h3>Relative to the league average</h3></div><span class="behavior-legend">Bar = manager · Marker = league</span></div>
      <div class="behavior-fingerprint">${rows}</div>
      <p class="behavior-conclusion">${escapeHtml(conclusion)}</p>
    </section>
  `;
}

function behaviorManagerRecommendations(profile) {
  const recommendations = [];
  const earlyTop = topCountLabel(profile.roundPositionBias?.early, "Balanced");
  const confidence = behaviorProfileConfidence(profile);
  if (earlyTop !== "Balanced" && behaviorPositionRate(profile.roundPositionBias?.early, earlyTop) >= 0.42) {
    recommendations.push(`Treat ${earlyTop} as this manager's default early-round lane, but only move ahead of them when your target is also the final player in a tier.`);
  }
  if (profile.avgReach <= -6) recommendations.push("Protect priority sleepers before this manager's picks; their history shows a willingness to move ahead of market.");
  else if (profile.avgReach >= 6) recommendations.push("You can often stay patient around this manager when multiple comparable players remain; they usually wait for market value.");
  if (Number(profile.runChaseRate || 0) >= 0.55) recommendations.push("Do not start a positional run solely because this manager is next. Reassess after the second player at that position leaves the board.");
  else if (Number(profile.runStartRate || 0) >= 0.22) recommendations.push("This manager is more likely to initiate than chase a run, so their pick can be an early warning for the next tier.");
  if (confidence.score < 48) recommendations.push("Use their active Persona and current roster need as the primary forecast until another completed draft expands the sample.");
  return recommendations.slice(0, 4);
}

function behaviorManagerLimitations(profile, report) {
  const limitations = [];
  if (profile.draftsAnalyzed < 2) limitations.push("Small sample: only one completed draft is available.");
  if (profile.slotEffectShare >= 0.75) limitations.push("Draft-slot effects may explain much of the early-round position mix.");
  if (report.league.marketReference?.directionalCount > report.league.marketReference?.historicalCount) limitations.push("Some ADP comparisons still use the current market because no same-season baseline matched.");
  else if (report.league.marketReference?.baselineCount) limitations.push("Historical ADP is a season baseline, not an exact draft-day snapshot.");
  if (LEAGUE.keeper && !/none/i.test(LEAGUE.keeper)) limitations.push("Keeper costs and protected players can change normal draft timing.");
  if (profile.recentWeightShare < 0.45 && profile.draftsAnalyzed > 1) limitations.push("The tendency is driven mainly by older drafts.");
  limitations.push("Current roster needs can override history during a live draft.");
  limitations.push("Sleeper history does not reliably identify auto-drafted picks.");
  return limitations;
}

function behaviorManagerSummary(profile) {
  if (!profile?.picksAnalyzed) return "No qualifying historical picks are available for this manager. The live forecast will use the active Persona and roster needs until more history is imported.";
  const early = topCountLabel(profile.roundPositionBias?.early, "a balanced opening");
  const build = topCountLabel(profile.firstThreeBuilds, "no repeated build");
  const market = profile.avgReach <= -6 ? "moves ahead of market" : profile.avgReach >= 6 ? "waits for market value" : "generally stays near market";
  const run = Number(profile.runChaseRate || 0) >= 0.55 ? "often reacts to position runs" : Number(profile.runStartRate || 0) >= 0.22 ? "sometimes initiates position runs" : "shows no strong run reaction";
  return `${activeTeamName(profile.team)} most often opens through ${early}, with ${build} as the most repeated first-three-round build. The manager ${market} and ${run}. Use those tendencies as timing evidence, not as a guarantee that current roster needs will be ignored.`;
}

function renderBehaviorManagerDossier(report) {
  const profile = report.teams[state.scoutingTeam - 1] || report.teams[0];
  const persona = getPersonaForTeam(profile.team);
  const confidence = behaviorProfileConfidence(profile, !profile.picksAnalyzed);
  const recommendations = behaviorManagerRecommendations(profile);
  const limitations = behaviorManagerLimitations(profile, report);
  const priorities = [
    `Early position investment: ${topCountLabel(profile.roundPositionBias?.early, "No reliable sample")}.`,
    `Typical first-three build: ${topCountLabel(profile.firstThreeBuilds, "No repeated build")}.`,
    `Middle-round priority: ${topCountLabel(profile.roundPositionBias?.middle, "No reliable sample")}.`,
    `Starter need filled on ${Math.round(Number(profile.needFillRate || 0) * 100)}% of measured need opportunities.`,
  ];
  const market = [
    `${profile.reachProfile || "Unknown market style"}; average directional ADP delta ${Number(profile.avgReach || 0).toFixed(1)} picks.`,
    `QB first appeared in Round ${profile.positionMinRound?.QB || "—"}; TE first appeared in Round ${profile.positionMinRound?.TE || "—"}.`,
    `${behaviorRecencySummary(profile)}.`,
  ];
  const room = [
    `Run chasing: ${profile.runOpportunityCount ? `${Math.round(profile.runChaseRate * 100)}% of ${profile.runOpportunityCount} qualifying opportunities` : "no qualifying sample"}.`,
    `Run initiating: ${profile.runStartOpportunityCount ? `${Math.round(profile.runStartRate * 100)}% of ${profile.runStartOpportunityCount} qualifying opportunities` : "no qualifying sample"}.`,
    `Active pick-window role: ${behaviorPickWindowForecast(report).managers.some((item) => item.team === profile.team) ? "picks before your next selection" : "does not currently pick before your next selection"}.`,
  ];
  return `
    <div class="behavior-manager-dossier">
      <section class="behavior-manager-hero">
        <div>
          <p class="eyebrow">Manager scouting</p>
          <h3>${escapeHtml(activeTeamName(profile.team))}</h3>
          <p>${escapeHtml(behaviorManagerSummary(profile))}</p>
        </div>
        <dl class="behavior-manager-meta">
          <div><dt>Persona</dt><dd>${escapeHtml(persona.name)}</dd></div>
          <div><dt>Persona source</dt><dd>${escapeHtml(behaviorPersonaSource(profile.team))}</dd></div>
          <div><dt>Drafts / picks</dt><dd>${profile.draftsAnalyzed || 0} / ${profile.picksAnalyzed || 0}</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(confidence.label)} · ${confidence.score}%</dd></div>
        </dl>
      </section>
      ${renderBehaviorFingerprint(profile, report)}
      <div class="behavior-dossier-grid">
        <section><p class="eyebrow">What they prioritize</p><ul>${priorities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
        <section><p class="eyebrow">Against the market</p><ul>${market.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
        <section><p class="eyebrow">Reaction to the room</p><ul>${room.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      </div>
      <section class="behavior-recommendation-panel">
        <p class="eyebrow">How to draft against them</p>
        ${recommendations.length ? `<ol>${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : `<p>No direct recommendation is reliable yet. Use the active Persona and live roster needs.</p>`}
      </section>
      <details class="behavior-limitations"><summary>What could change the read</summary><ul>${limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>
      <div class="behavior-visual-grid">
        ${renderBehaviorHeatmap(report, { manager: String(profile.team), season: "all", roundStart: 1, roundEnd: Math.min(10, LEAGUE.rounds) })}
        ${renderBehaviorAdpVisual(report, String(profile.team))}
      </div>
    </div>
  `;
}

function behaviorSelfScoutData(report) {
  const profile = report.teams[state.userTeam - 1];
  if (!profile?.picksAnalyzed) return null;
  const earlyTop = topCountLabel(profile.roundPositionBias?.early, "Balanced");
  const avoided = BEHAVIOR_POSITIONS
    .map((position) => ({ position, min: Number(profile.positionMinRound?.[position] || LEAGUE.rounds + 1) }))
    .sort((a, b) => b.min - a.min)[0];
  const preserve = profile.avgReach >= -4
    ? "Preserve your market discipline when several players remain in the same tier."
    : `Preserve your conviction only when the ${earlyTop} target is the last player in a meaningful tier.`;
  const monitor = Number(profile.runChaseRate || 0) >= 0.45
    ? "Monitor whether a positional run is changing your plan without improving the player value."
    : `Monitor repeated delays at ${avoided.position}; waiting is useful until it forces a weak tier.`;
  const experiment = profile.avgReach <= -5
    ? "For one mock, require every reach of 8+ picks to satisfy both an open starter need and a tier-drop condition."
    : `For one mock, test waiting one additional turn at ${earlyTop} whenever at least three comparable players remain.`;
  return { profile, earlyTop, avoided, preserve, monitor, experiment };
}

function renderBehaviorSelfScout(report) {
  const data = behaviorSelfScoutData(report);
  if (!data) {
    return `
      <div class="behavior-empty-state">
        <p class="eyebrow">Self-Scout</p>
        <h3>Your history is not available yet</h3>
        <p>Import a Sleeper league that includes your current owner ID. The Lab will evaluate your tendencies with the same standards used for opponents.</p>
      </div>
    `;
  }
  const { profile } = data;
  const confidence = behaviorProfileConfidence(profile);
  const selectedStrategy = BULK_STRATEGIES.find((item) => item.id === state.strategy)?.label || state.strategy;
  const expectedMap = { zeroRB: "WR-heavy opening", robustRB: "early RB depth", heroRB: "one early RB before WR value", wrHeavy: "WR depth", eliteQBTE: "an early premium QB or TE", balanced: "board value", weeklyEdge: "positional starter advantage", upside: "ceiling and youth", safeFloor: "stable roles and market discipline" };
  const expected = expectedMap[state.strategy] || "board value";
  const contradiction = behaviorSelfContradictionInsight(report);
  return `
    <div class="behavior-self-scout">
      <section class="behavior-manager-hero">
        <div>
          <p class="eyebrow">Self-Scout</p>
          <h3>${escapeHtml(activeTeamName(state.userTeam))}</h3>
          <p>${escapeHtml(behaviorManagerSummary(profile))}</p>
        </div>
        <dl class="behavior-manager-meta">
          <div><dt>Drafts / picks</dt><dd>${profile.draftsAnalyzed} / ${profile.picksAnalyzed}</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(confidence.label)} · ${confidence.score}%</dd></div>
          <div><dt>Run chasing</dt><dd>${profile.runOpportunityCount ? `${Math.round(profile.runChaseRate * 100)}%` : "No sample"}</dd></div>
          <div><dt>ADP delta</dt><dd>${Number(profile.avgReach || 0).toFixed(1)}</dd></div>
        </dl>
      </section>
      ${renderBehaviorFingerprint(profile, report)}
      <section class="behavior-strategy-compare">
        <p class="eyebrow">Stated strategy vs. actual behavior</p>
        <div class="behavior-compare-grid">
          <div><span>Selected strategy</span><strong>${escapeHtml(selectedStrategy)}</strong><p>Intent: ${escapeHtml(expected)}.</p></div>
          <div><span>Historical behavior</span><strong>${escapeHtml(data.earlyTop)} early lean</strong><p>Most common opening build: ${escapeHtml(topCountLabel(profile.firstThreeBuilds, "No repeated build"))}.</p></div>
        </div>
        <p>${escapeHtml(contradiction ? contradiction.conclusion : "Your selected strategy and historical opening pattern are broadly aligned. Continue to use tier value as the permission to deviate.")}</p>
      </section>
      <div class="behavior-self-actions">
        <article><span>Preserve</span><p>${escapeHtml(data.preserve)}</p></article>
        <article><span>Monitor</span><p>${escapeHtml(data.monitor)}</p></article>
        <article><span>Experiment</span><p>${escapeHtml(data.experiment)}</p></article>
      </div>
      <details class="behavior-limitations"><summary>What could change this read</summary><ul>${behaviorManagerLimitations(profile, report).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></details>
    </div>
  `;
}

function behaviorExplorerFilteredPicks(report) {
  const filters = state.behaviorFilters || {};
  const season = filters.season || "all";
  const manager = filters.manager || "league";
  const position = filters.position || "ALL";
  const start = Math.max(1, Number(filters.roundStart || 1));
  const end = Math.min(LEAGUE.rounds, Math.max(start, Number(filters.roundEnd || LEAGUE.rounds)));
  const all = manager === "league"
    ? report.teams.flatMap((team) => (team.pickRecords || []).map((pick) => ({ ...pick, team: team.team })))
    : (report.teams[Number(manager) - 1]?.pickRecords || []).map((pick) => ({ ...pick, team: Number(manager) }));
  return all
    .filter((pick) => season === "all" || String(pick.season) === String(season))
    .filter((pick) => position === "ALL" || pick.position === position)
    .filter((pick) => Number(pick.round) >= start && Number(pick.round) <= end)
    .sort((a, b) => Number(b.season) - Number(a.season) || a.pickNo - b.pickNo);
}

function renderBehaviorExplorer(report) {
  const filters = state.behaviorFilters;
  const picks = behaviorExplorerFilteredPicks(report);
  const manager = filters.manager || "league";
  const seasonOptions = [`<option value="all">All seasons</option>`, ...report.seasons.map((item) => `<option value="${escapeHtml(item.season)}" ${String(filters.season) === String(item.season) ? "selected" : ""}>${escapeHtml(item.season)}</option>`)].join("");
  const managerOptions = [`<option value="league">League aggregate</option>`, ...report.teams.map((team) => `<option value="${team.team}" ${String(manager) === String(team.team) ? "selected" : ""}>${escapeHtml(activeTeamName(team.team))}</option>`)].join("");
  const tableRows = picks.slice(0, 250).map((pick) => `
    <tr>
      <td>${escapeHtml(pick.season)}</td>
      <td>${escapeHtml(activeTeamName(pick.team))}</td>
      <td>${escapeHtml(pick.round)}</td>
      <td>${escapeHtml(pick.pickNo)}</td>
      <td>${escapeHtml(pick.name || "Unknown player")}</td>
      <td>${escapeHtml(pick.position)}</td>
      <td>${Number.isFinite(pick.reach) ? `${pick.reach >= 0 ? "+" : ""}${pick.reach.toFixed(1)}` : "—"}</td>
      <td>${escapeHtml(pick.marketReferenceType === "pick_metadata" ? "Pick-time" : pick.marketReferenceType === "season_baseline" ? "Season baseline" : pick.marketReferenceType === "current_directional" ? "Current directional" : "Unavailable")}</td>
    </tr>
  `).join("");
  return `
    <div class="behavior-explorer">
      <section class="behavior-explorer-controls" aria-label="Data Explorer filters">
        <label>Season<select id="behaviorSeasonFilter">${seasonOptions}</select></label>
        <label>Manager<select id="behaviorManagerFilter">${managerOptions}</select></label>
        <label>Position<select id="behaviorPositionFilter"><option value="ALL">All positions</option>${BEHAVIOR_POSITIONS.map((position) => `<option value="${position}" ${filters.position === position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
        <label>Round from<input id="behaviorRoundStart" type="number" min="1" max="${LEAGUE.rounds}" value="${filters.roundStart}" /></label>
        <label>Round to<input id="behaviorRoundEnd" type="number" min="1" max="${LEAGUE.rounds}" value="${filters.roundEnd}" /></label>
      </section>
      <div class="behavior-visual-grid">
        ${renderBehaviorHeatmap(report, { manager, season: filters.season, position: filters.position, roundStart: filters.roundStart, roundEnd: filters.roundEnd })}
        ${renderBehaviorAdpVisual(report, manager)}
      </div>
      ${renderBehaviorPressureVisual(report)}
      <section class="behavior-data-table-card">
        <div class="behavior-section-heading"><div><p class="eyebrow">Supporting data</p><h3>${picks.length} qualifying pick record${picks.length === 1 ? "" : "s"}</h3></div><span>Showing up to 250</span></div>
        ${picks.length ? `<div class="behavior-table-wrap"><table><thead><tr><th>Season</th><th>Manager</th><th>Round</th><th>Pick</th><th>Player</th><th>Pos</th><th>ADP delta</th><th>Reference</th></tr></thead><tbody>${tableRows}</tbody></table></div>` : `<p class="behavior-conclusion">No records match the current filters. Expand the round range or select all seasons.</p>`}
      </section>
    </div>
  `;
}


function historicalBacktestSummary(report) {
  let evaluated = 0, correct = 0;
  let marketEvaluated = 0, marketBandCorrect = 0, marketAbsoluteError = 0;
  let baselineReferences = 0, pickMetadataReferences = 0, directionalReferences = 0;
  const rows = [];
  (report.teams || []).forEach((profile) => {
    const seasons = [...(profile.seasonStats || [])].sort((a, b) => Number(a.season) - Number(b.season));
    const pickRecords = [...(profile.pickRecords || [])].sort((a, b) => Number(a.season) - Number(b.season) || a.pickNo - b.pickNo);
    const recordsBySeason = new Map();
    pickRecords.forEach((pick) => {
      const key = String(pick.season);
      if (!recordsBySeason.has(key)) recordsBySeason.set(key, []);
      recordsBySeason.get(key).push(pick);
      if (pick.marketReferenceType === "season_baseline") baselineReferences += 1;
      else if (pick.marketReferenceType === "pick_metadata") pickMetadataReferences += 1;
      else if (pick.marketReferenceType === "current_directional") directionalReferences += 1;
    });
    for (let index = 1; index < seasons.length; index += 1) {
      const training = seasons.slice(0, index);
      const aggregate = {};
      training.forEach((season) => Object.entries(season.roundPositionBias?.early || {}).forEach(([position, count]) => {
        aggregate[position] = (aggregate[position] || 0) + Number(count || 0);
      }));
      const predicted = topCountLabel(aggregate, "");
      const actual = topCountLabel(seasons[index].roundPositionBias?.early || {}, "");
      if (predicted && actual) {
        evaluated += 1;
        if (predicted === actual) correct += 1;
        rows.push({ team: profile.team, season: seasons[index].season, predicted, actual, correct: predicted === actual });
      }
      const trainingSeasonKeys = new Set(training.map((season) => String(season.season)));
      const trainingMarketRows = pickRecords.filter((pick) => trainingSeasonKeys.has(String(pick.season)) && Number.isFinite(pick.reach) && ["pick_metadata", "season_baseline"].includes(pick.marketReferenceType));
      const expectedReach = trainingMarketRows.length ? average(trainingMarketRows.map((pick) => Number(pick.reach))) : null;
      if (!Number.isFinite(expectedReach)) continue;
      (recordsBySeason.get(String(seasons[index].season)) || []).forEach((pick) => {
        if (!Number.isFinite(pick.marketReference) || !["pick_metadata", "season_baseline"].includes(pick.marketReferenceType)) return;
        const predictedPick = Number(pick.marketReference) + expectedReach;
        const error = Math.abs(Number(pick.pickNo) - predictedPick);
        marketEvaluated += 1;
        marketAbsoluteError += error;
        if (error <= Math.max(8, LEAGUE.teams)) marketBandCorrect += 1;
      });
    }
  });
  const historicalReferences = baselineReferences + pickMetadataReferences;
  return {
    evaluated,
    accuracy: evaluated ? correct / evaluated : 0,
    rows,
    marketEvaluated,
    marketBandAccuracy: marketEvaluated ? marketBandCorrect / marketEvaluated : 0,
    marketMeanAbsoluteError: marketEvaluated ? marketAbsoluteError / marketEvaluated : null,
    historicalReferences,
    baselineReferences,
    pickMetadataReferences,
    directionalReferences,
    limitation: historicalReferences
      ? `Backtesting uses prior seasons only. Player-level market timing uses same-season ADP baselines; exact player identity prediction is not claimed. ${historicalAdpCoverageSummary()}.`
      : "Backtesting uses prior seasons only and currently has no matched historical ADP baselines.",
  };
}

function renderModelAccuracySection(report) {
  const calibration = state.learning.calibrationSummary || calculateCalibrationSummary(state.learning.predictionLogs || []);
  const backtest = historicalBacktestSummary(report);
  const managerRows = calibration.byManager || [];
  const most = managerRows.filter((row) => row.count >= 3).sort((a, b) => b.positionAccuracy - a.positionAccuracy)[0];
  const least = managerRows.filter((row) => row.count >= 3).sort((a, b) => a.positionAccuracy - b.positionAccuracy)[0];
  const evaluated = Number(calibration.evaluated || 0);
  const confidence = evaluated >= 40 ? "High" : evaluated >= 15 ? "Moderate" : evaluated ? "Low" : "Insufficient evidence";
  const recent = (state.learning.predictionLogs || []).filter((row) => row.resolved).slice(-25);
  const recentAccuracy = recent.length ? average(recent.map((row) => row.predictedPositionCorrect ? 1 : 0)) : 0;
  const conclusion = evaluated
    ? calibration.conclusion
    : backtest.evaluated
      ? `No live predictions have been resolved yet. No-lookahead historical testing was correct on ${Math.round(backtest.accuracy * 100)}% of ${backtest.evaluated} manager-season position-timing tests${backtest.marketEvaluated ? `, while ${Math.round(backtest.marketBandAccuracy * 100)}% of ${backtest.marketEvaluated} player selections landed within one round of the prior-history market expectation` : ""}.`
      : "No predictions have been evaluated yet. Complete a live draft or import multiple historical seasons to begin calibration.";
  const groupRows = (calibration.byRound || []).slice(0, 6).map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.count}</td><td>${Math.round(row.positionAccuracy * 100)}%</td><td>${Number(row.brierScore || 0).toFixed(3)}</td></tr>`).join("");
  return `<section class="behavior-primary-section model-accuracy-section">
    <div class="behavior-section-heading"><div><p class="eyebrow">Model Accuracy</p><h3>Prediction calibration and no-lookahead testing</h3></div><span>${escapeHtml(confidence)} · ${evaluated} live predictions evaluated</span></div>
    <div class="accuracy-metric-grid">
      <div><strong>${evaluated ? `${Math.round((calibration.positionAccuracy || 0) * 100)}%` : "—"}</strong><span>Top-position accuracy</span></div>
      <div><strong>${evaluated ? `${Math.round((calibration.topTwoAccuracy || 0) * 100)}%` : "—"}</strong><span>Top-two position accuracy</span></div>
      <div><strong>${Number.isFinite(calibration.survivalAccuracy) ? `${Math.round(calibration.survivalAccuracy * 100)}%` : "—"}</strong><span>Tier/player survival accuracy</span></div>
      <div><strong>${evaluated ? Number(calibration.brierScore || 0).toFixed(3) : "—"}</strong><span>Brier score · lower is better</span></div>
      <div><strong>${recent.length ? `${Math.round(recentAccuracy * 100)}%` : "—"}</strong><span>Recent 25 predictions</span></div>
      <div><strong>${backtest.evaluated ? `${Math.round(backtest.accuracy * 100)}%` : "—"}</strong><span>Historical position accuracy</span></div>
      <div><strong>${backtest.marketEvaluated ? `${Math.round(backtest.marketBandAccuracy * 100)}%` : "—"}</strong><span>Historical market-band accuracy</span></div>
      <div><strong>${Number.isFinite(backtest.marketMeanAbsoluteError) ? backtest.marketMeanAbsoluteError.toFixed(1) : "—"}</strong><span>Average historical ADP error</span></div>
    </div>
    <p class="behavior-conclusion"><strong>Plain-language conclusion:</strong> ${escapeHtml(conclusion)}</p>
    <div class="accuracy-manager-grid"><p><strong>Most predictable:</strong> ${escapeHtml(most ? `${most.label} (${Math.round(most.positionAccuracy * 100)}% across ${most.count})` : "Insufficient manager sample")}</p><p><strong>Least predictable:</strong> ${escapeHtml(least ? `${least.label} (${Math.round(least.positionAccuracy * 100)}% across ${least.count})` : "Insufficient manager sample")}</p></div>
    ${groupRows ? `<details><summary>Accuracy by round</summary><div class="behavior-table-wrap"><table><thead><tr><th>Round</th><th>Predictions</th><th>Position accuracy</th><th>Brier</th></tr></thead><tbody>${groupRows}</tbody></table></div></details>` : ""}
    <p class="helper"><strong>Brier score:</strong> the squared distance between forecast probabilities and the actual position; lower scores mean probabilities better matched reality. ${escapeHtml(backtest.limitation)}</p>
  </section>`;
}

function renderBehaviorOverview(report) {
  const edges = behaviorDraftDayEdges(report);
  const reliable = behaviorReliableTendencyCount(report);
  const watchItems = behaviorWatchCount(report);
  const oneDraft = report.league.draftsAnalyzed === 1;
  const profiled = report.teams.filter((team) => team.picksAnalyzed);
  const topManagers = profiled
    .sort((a, b) => behaviorProfileConfidence(b).score - behaviorProfileConfidence(a).score)
    .slice(0, 3);
  return `
    <div class="behavior-overview">
      <section class="behavior-overview-hero">
        <div>
          <p class="eyebrow">League Behavior Lab</p>
          <h3>${edges.length} draft-day edge${edges.length === 1 ? "" : "s"} · ${reliable} reliable tendenc${reliable === 1 ? "y" : "ies"} · ${watchItems} watch item${watchItems === 1 ? "" : "s"}</h3>
          <p>Based on ${report.league.draftsAnalyzed} completed draft${report.league.draftsAnalyzed === 1 ? "" : "s"} and ${report.league.picksAnalyzed} qualifying pick${report.league.picksAnalyzed === 1 ? "" : "s"}.${oneDraft ? " These are early signals, not reliable long-term tendencies." : ""}</p>
        </div>
        <span class="behavior-confidence-pill">${escapeHtml(behaviorLeagueConfidence(report).label)}</span>
      </section>
      <section class="behavior-primary-section">
        <div class="behavior-section-heading"><div><p class="eyebrow">1 · Draft Day Edges</p><h3>The findings most likely to change a decision</h3></div><span>Prioritized by impact, confidence, and actionability</span></div>
        ${edges.length ? `<div class="behavior-edge-list">${edges.map(renderBehaviorInsightCard).join("")}</div>` : `<div class="behavior-no-edge"><h3>No reliable draft-day edge was found from the available history.</h3><p>Add another completed draft or broader manager history to improve the report; 2018–2025 season ADP baselines are already bundled.</p></div>`}
      </section>
      <section class="behavior-primary-section">
        <div class="behavior-section-heading"><div><p class="eyebrow">2 · League Market</p><h3>Where this room differs from a neutral market</h3></div></div>
        <div class="behavior-visual-grid">
          ${renderBehaviorHeatmap(report, { manager: "league", season: "all", roundStart: 1, roundEnd: Math.min(10, LEAGUE.rounds) })}
          ${renderBehaviorAdpVisual(report, "league")}
        </div>
        ${renderBehaviorPressureVisual(report)}
      </section>
      <section class="behavior-primary-section">
        <div class="behavior-section-heading"><div><p class="eyebrow">3 · Manager Scouting</p><h3>The most reliable opponent reads</h3></div><button type="button" data-scouting-view="managers">Open all managers</button></div>
        <div class="behavior-manager-preview-grid">
          ${topManagers.length ? topManagers.map((profile) => {
            const confidence = behaviorProfileConfidence(profile);
            return `<button type="button" data-scouting-team-card="${profile.team}"><span>${escapeHtml(confidence.label)} · ${confidence.score}%</span><strong>${escapeHtml(activeTeamName(profile.team))}</strong><p>${escapeHtml(behaviorManagerSummary(profile))}</p></button>`;
          }).join("") : `<p class="behavior-conclusion">No manager has enough history for a reliable preview.</p>`}
        </div>
      </section>
      ${renderModelAccuracySection(report)}
      <section class="behavior-primary-section behavior-overview-footer-grid">
        <article>
          <p class="eyebrow">4 · Self-Scout</p>
          <h3>Test your plan against your history</h3>
          <p>${escapeHtml(behaviorSelfScoutData(report)?.monitor || "Import your own Sleeper history to identify contradictions and blind spots.")}</p>
          <button type="button" data-scouting-view="self">Open Self-Scout</button>
        </article>
        <article>
          <p class="eyebrow">5 · Supporting Data</p>
          <h3>Inspect the evidence</h3>
          <p>Filter seasons, managers, positions, rounds, ADP deviations, and pick records without crowding the decision-first Overview.</p>
          <button type="button" data-scouting-view="data">Open Data Explorer</button>
        </article>
      </section>
    </div>
  `;
}

function renderBehaviorEmptyState() {
  return `
    <div class="behavior-empty-state">
      <p class="eyebrow">League Behavior Lab</p>
      <h3>Understand the room before draft day</h3>
      <p>The Lab converts completed Sleeper drafts into actionable market, manager, Self-Scout, and pick-window reads. It does not invent tendencies before history is available.</p>
      <ol>
        <li>Open <strong>League</strong> and enter your Sleeper username or user ID.</li>
        <li>Choose the league and season, then import it.</li>
        <li>Return here to review the highest-impact edges first.</li>
      </ol>
      <div class="behavior-empty-features">
        <span>Position run windows</span><span>ADP behavior</span><span>Manager fingerprints</span><span>Self-Scout</span><span>Live pick pressure</span>
      </div>
    </div>
  `;
}

function renderScoutingReport() {
  if (!$("scoutingReportContent")) return;
  const report = scoutingReport();
  const viewMap = { league: "overview", team: "managers", deep: "data" };
  state.scoutingView = viewMap[state.scoutingView] || state.scoutingView || "overview";
  if (!["overview", "managers", "self", "data"].includes(state.scoutingView)) state.scoutingView = "overview";
  state.scoutingTeam = Math.max(1, Math.min(LEAGUE.teams, Number(state.scoutingTeam) || state.userTeam || 1));
  $("scoutingTeamSelect").innerHTML = Array.from({ length: LEAGUE.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}" ${team === state.scoutingTeam ? "selected" : ""}>${escapeHtml(activeTeamName(team))}</option>`;
  }).join("");
  $("scoutingTeamSelect").hidden = state.scoutingView !== "managers";
  document.querySelectorAll("[data-scouting-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scoutingView === state.scoutingView);
  });

  if (!report.league.draftsAnalyzed) {
    $("scoutingReportContent").innerHTML = `${renderBehaviorEmptyState()}${renderModelAccuracySection(report)}`;
    return;
  }

  if (state.scoutingView === "managers") {
    $("scoutingReportContent").innerHTML = renderBehaviorManagerDossier(report);
    return;
  }
  if (state.scoutingView === "self") {
    $("scoutingReportContent").innerHTML = renderBehaviorSelfScout(report);
    return;
  }
  if (state.scoutingView === "data") {
    $("scoutingReportContent").innerHTML = `${renderBehaviorExplorer(report)}${renderModelAccuracySection(report)}`;
    return;
  }
  $("scoutingReportContent").innerHTML = renderBehaviorOverview(report);
}


function lineupSummary() {
  const r = LEAGUE.roster;
  return `${r.QB} QB, ${r.RB} RB, ${r.WR} WR, ${r.TE} TE, ${r.FLEX} Flex, ${r.K} K, ${r.DEF} DEF, ${r.BENCH} bench`;
}

function scoringSummary(league = LEAGUE) {
  const settings = scoringSettingsForLeague(league);
  return `${league.scoring}: ${settings.reception} rec, ${settings.passTd} pass TD, ${settings.rushRecTd} rush/rec TD${settings.teReceptionBonus ? `, +${settings.teReceptionBonus} TE rec` : ""}`;
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
  if (!$("keeperPlayerOptions") || !$("keeperEditor")) return;
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

function setKeeperStatus(message) {
  if ($("keeperSettingsStatus")) $("keeperSettingsStatus").textContent = message || "";
  if ($("leagueSettingsStatus") && message) $("leagueSettingsStatus").textContent = message;
}

function buildLeagueProfileFromForm() {
  const editedNames = [...document.querySelectorAll("[data-team-name]")]
    .map((input, index) => input.value.trim() || `Team ${index + 1}`);
  const roster = { ...LEAGUE.roster };
  document.querySelectorAll("[data-roster-setting]").forEach((input) => {
    roster[input.dataset.rosterSetting] = Math.max(0, Number(input.value) || 0);
  });
  const scoringSettings = { ...(SCORING_PRESETS[$("leagueScoringInput").value] || SCORING_PRESETS[DEFAULT_LEAGUE.scoring]) };
  document.querySelectorAll("[data-scoring-setting]").forEach((input) => {
    scoringSettings[input.dataset.scoringSetting] = Number(input.value) || 0;
  });
  const league = normalizeLeagueSettings({
    id: state.activeLeagueId || LEAGUE.id || "default",
    name: $("leagueNameInput").value.trim() || "Default League",
    teams: $("leagueTeamsInput").value,
    scoring: $("leagueScoringInput").value,
    scoringSettings,
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
          <span>${league.teams} teams - ${scoringSummary(league)} - ${league.rounds} rounds</span>
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
  $("leagueScoringText").textContent = scoringSummary(LEAGUE);
  $("leagueLineupText").textContent = lineupSummary();
  $("leagueDraftText").textContent = `${LEAGUE.rounds} rounds, ${LEAGUE.teams} picks/round`;
  $("leagueKeeperText").textContent = LEAGUE.keeper;
  $("leagueTeamsInput").value = formLeague.teams;
  $("leagueScoringInput").value = formLeague.scoring;
  document.querySelectorAll("[data-scoring-setting]").forEach((input) => {
    input.value = formLeague.scoringSettings?.[input.dataset.scoringSetting] ?? 0;
  });
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
}

function applyScoringPresetToForm(scoringName) {
  const preset = SCORING_PRESETS[scoringName] || SCORING_PRESETS[DEFAULT_LEAGUE.scoring];
  document.querySelectorAll("[data-scoring-setting]").forEach((input) => {
    input.value = preset[input.dataset.scoringSetting] ?? 0;
  });
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
  if ($("keeperRankingsTeamSelect")) {
    $("keeperRankingsTeamSelect").innerHTML = `<option value="all">All teams</option>${options}`;
    $("keeperRankingsTeamSelect").value = state.keeperRankingsTeam;
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
  if ($("tradeFinderTargetTeam")) {
    $("tradeFinderTargetTeam").innerHTML = `<option value="all">Any team</option>${options}`;
    $("tradeFinderTargetTeam").value = state.tradeFinder.targetTeam;
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

function factorScore(value) {
  return Math.round((intensity(value) / 3) * 100);
}

function experienceScore(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("expert")) return normalized.includes("intermediate") ? 78 : 95;
  if (normalized.includes("intermediate")) return normalized.includes("beginner") ? 52 : 68;
  if (normalized.includes("beginner")) return 32;
  return 55;
}

function positionalAggressionScore(value) {
  return value && value !== "Balanced" ? 82 : 36;
}

function strategyConvictionScore(value) {
  if (!value || value === "BPA" || value === "Balanced") return 42;
  if (value === "Bias Driven") return 72;
  return 84;
}

function personaFactorMatrix(persona) {
  return [
    { key: "strategy", label: "Strategy conviction", value: strategyConvictionScore(persona.strategyStyle), text: persona.strategyStyle },
    { key: "experience", label: "Draft experience", value: experienceScore(persona.experienceLevel), text: persona.experienceLevel },
    { key: "adp", label: "ADP discipline", value: factorScore(persona.adpDiscipline), text: persona.adpDiscipline },
    { key: "upside", label: "Upside appetite", value: factorScore(persona.upsidePreference), text: persona.upsidePreference },
    { key: "need", label: "Team-need pressure", value: factorScore(persona.teamNeedWeight), text: persona.teamNeedWeight },
    { key: "rookie", label: "Rookie/youth value", value: factorScore(persona.rookieValue), text: persona.rookieValue },
    { key: "reach", label: "Reach comfort", value: factorScore(persona.reachFrequency), text: persona.reachFrequency },
    { key: "position", label: "Position bias", value: positionalAggressionScore(persona.positionalAggression), text: persona.positionalAggression },
  ];
}

function personaRadarSvg(factors) {
  const axes = factors.filter((factor) => ["adp", "upside", "need", "rookie", "reach", "position"].includes(factor.key));
  const center = 54;
  const radius = 42;
  const rings = [0.33, 0.66, 1].map((scale) => {
    const points = axes.map((_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
      return `${(center + Math.cos(angle) * radius * scale).toFixed(1)},${(center + Math.sin(angle) * radius * scale).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${points}" class="persona-radar-ring"></polygon>`;
  }).join("");
  const spokeLines = axes.map((_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    const x = (center + Math.cos(angle) * radius).toFixed(1);
    const y = (center + Math.sin(angle) * radius).toFixed(1);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="persona-radar-spoke"></line>`;
  }).join("");
  const valuePoints = axes.map((factor, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    const scaled = radius * Math.max(0.12, factor.value / 100);
    return `${(center + Math.cos(angle) * scaled).toFixed(1)},${(center + Math.sin(angle) * scaled).toFixed(1)}`;
  }).join(" ");
  const labels = axes.map((factor, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axes.length;
    const x = (center + Math.cos(angle) * (radius + 11)).toFixed(1);
    const y = (center + Math.sin(angle) * (radius + 11)).toFixed(1);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(factor.label.split(" ")[0])}</text>`;
  }).join("");
  return `
    <svg class="persona-radar" viewBox="0 0 108 108" role="img" aria-label="Persona factor web">
      ${rings}
      ${spokeLines}
      <polygon points="${valuePoints}" class="persona-radar-shape"></polygon>
      ${labels}
    </svg>
  `;
}

function personaFactorMarkup(persona) {
  const factors = personaFactorMatrix(persona);
  return `
    <div class="persona-factor-web">
      ${personaRadarSvg(factors)}
      <div class="persona-factor-bars">
        ${factors.map((factor) => `
          <div class="persona-factor-row">
            <span>${escapeHtml(factor.label)}</span>
            <div class="persona-factor-track"><i style="--factor-value: ${factor.value}%"></i></div>
            <b>${factor.value}</b>
            <small>${escapeHtml(factor.text)}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
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
        ${personaFactorMarkup(persona)}
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

function awardRunnerRows(items, type) {
  return items.slice(1, 4).map((item, index) => {
    if (type === "pick") {
      return `
        <div class="award-runner-row">
          <span>${index + 2}</span>
          <strong>${escapeHtml(item.player.name)}</strong>
          <em>${escapeHtml(item.teamName)} - ${escapeHtml(item.label)} - value ${item.awardScore.toFixed(1)}</em>
        </div>
      `;
    }
    const metric = type === "championship"
      ? `${percent(item.championshipOdds)} title odds`
      : type === "last"
        ? `${percent(item.lastPlaceOdds)} last-place odds`
        : `${item.weeklyProjection.toFixed(1)} pts/wk, ${item.value.toFixed(1)} value`;
    return `
      <div class="award-runner-row">
        <span>${index + 2}</span>
        <strong>${escapeHtml(activeTeamName(item.team))}</strong>
        <em>${metric}</em>
      </div>
    `;
  }).join("");
}

function awardAnalysisText(title, winner, type) {
  if (!winner) return "";
  if (title === "Best Draft Overall") {
    return `${activeTeamName(winner.team)} wins because the formula combines overall team score, projected weekly starter output, draft value, and roster balance. This roster posted ${winner.weeklyProjection.toFixed(1)} projected starter points, ${winner.value.toFixed(1)} average pick value, ${winner.balance.toFixed(1)} roster-balance impact, and finished #${winner.rank} in the room while also getting credit for players who fell instead of paying reach prices.`;
  }
  if (title === "Best Pick") {
    const rank = Math.round(winner.selectedRank || playerRankAtDraft(winner.player));
    return `${winner.player.name} wins because the pick-value formula looks only at expected value for that draft slot. ${winner.teamName} landed him at Round ${winner.round}.${String(winner.index + 1).padStart(2, "0")} with a board rank around ${rank}, creating ${winner.pickValue.toFixed(1)} slot value while keeping opportunity cost to ${winner.opportunityCost.toFixed(1)} against the best alternatives still available.`;
  }
  if (title === "Worst Pick") {
    const alt = winner.bestAlternative ? `${winner.bestAlternative.name} (${winner.bestAlternative.position})` : "the stronger available board options";
    return `${winner.player.name} is flagged because the reach formula compares the selected player's expected value to the draft slot and to alternatives still on the board. The pick carried ${winner.pickValue.toFixed(1)} slot value with ${winner.opportunityCost.toFixed(1)} opportunity cost, and ${alt} was still available. Required K/DEF picks in rounds 14-16 are excluded from this award.`;
  }
  if (title === "Most Likely Champion") {
    return `${activeTeamName(winner.team)} leads the title projection because the season model simulates 500 regular seasons plus a playoff bracket with week-to-week variance. This team produced ${winner.weeklyProjection.toFixed(1)} starter points, ${winner.value.toFixed(1)} draft value, ${winner.balance.toFixed(1)} roster balance, and won ${percent(winner.championshipOdds)} of the simulated playoffs.`;
  }
  if (title === "Most Likely Last Place") {
    return `${activeTeamName(winner.team)} lands here because the same 500-season model ranked this roster lowest most often after accounting for weekly starter projection, draft value, roster balance, schedule variance, and weekly scoring swings. The roster sits at ${winner.weeklyProjection.toFixed(1)} starter points, ${winner.value.toFixed(1)} draft value, ${winner.balance.toFixed(1)} balance, and ${percent(winner.lastPlaceOdds)} last-place odds.`;
  }
  return type === "pick"
    ? `${winner.player.name} is evaluated from pick value, expected range, and alternatives available at that slot.`
    : `${activeTeamName(winner.team)} is evaluated from projection, pick value, roster balance, and season simulation outcomes.`;
}

function awardCard(title, subtitle, items, type, winnerDetail) {
  const winner = items[0];
  if (!winner) {
    return `
      <section class="award-card">
        <p class="eyebrow">${escapeHtml(subtitle)}</p>
        <h3>${escapeHtml(title)}</h3>
        <p class="empty">No qualifying result yet.</p>
      </section>
    `;
  }
  const winnerName = type === "pick" ? winner.player.name : activeTeamName(winner.team);
  const winnerMeta = type === "pick"
    ? `${winner.teamName} - ${winner.label} - Round ${winner.round}.${String(winner.index + 1).padStart(2, "0")}`
    : winnerDetail(winner);
  return `
    <section class="award-card">
      <p class="eyebrow">${escapeHtml(subtitle)}</p>
      <h3>${escapeHtml(title)}</h3>
      <div class="award-winner">
        <span>Winner</span>
        <strong>${escapeHtml(winnerName)}</strong>
        <em>${escapeHtml(winnerMeta)}</em>
      </div>
      <p class="award-analysis">${escapeHtml(awardAnalysisText(title, winner, type))}</p>
      <div class="award-next-three">
        <h4>Next 3</h4>
        ${awardRunnerRows(items, type) || `<p class="empty">No other teams or picks qualified.</p>`}
      </div>
    </section>
  `;
}

function renderDraftAwards() {
  const league = activeLeague();
  const picks = activePicks();
  const total = league.teams * league.rounds;
  if (picks.length < total) {
    $("teamAnalysis").innerHTML = `<p class="empty">Complete or load a full mock/live draft to see draft awards.</p>`;
    return;
  }
  const awards = draftAwardData();
  $("teamAnalysis").innerHTML = `
    <div class="analysis-hero awards-hero">
      <div>
        <p class="eyebrow">Draft awards</p>
        <h3>${escapeHtml(activeDraft()?.name || (isLiveDraftMode() ? "Current Live Draft" : "Current Draft"))}</h3>
        <p>Awards use the completed board, pick value against expected draft slot, projected starter scoring, roster balance, and 500 simulated seasons with playoff variance.</p>
      </div>
      <div><strong>${league.teams}</strong><span>Teams scored</span></div>
      <div><strong>${picks.filter((pick) => !pick.keeper).length}</strong><span>Drafted picks reviewed</span></div>
      <div><strong>500</strong><span>Season sims</span></div>
    </div>
    <div class="awards-grid">
      ${awardCard(
        "Best Draft Overall",
        "Score + value",
        awards.bestDraft,
        "team",
        (winner) => `${winner.weeklyProjection.toFixed(1)} pts/wk, ${winner.value.toFixed(1)} draft value, #${winner.rank} room rank`
      )}
      ${awardCard(
        "Best Pick",
        "Biggest value",
        awards.bestPick,
        "pick",
        (winner) => `Value ${winner.awardScore.toFixed(1)} at ${pickLabel(winner.pick)}`
      )}
      ${awardCard(
        "Worst Pick",
        "Biggest reach",
        awards.worstPick,
        "pick",
        (winner) => `Value ${winner.awardScore.toFixed(1)} at ${pickLabel(winner.pick)}`
      )}
      ${awardCard(
        "Most Likely Champion",
        "Season simulation",
        awards.championship,
        "championship",
        (winner) => `${percent(winner.championshipOdds)} title odds, ${winner.weeklyProjection.toFixed(1)} pts/wk`
      )}
      ${awardCard(
        "Most Likely Last Place",
        "Season simulation",
        awards.lastPlace,
        "last",
        (winner) => `${percent(winner.lastPlaceOdds)} last-place odds, ${winner.weeklyProjection.toFixed(1)} pts/wk`
      )}
    </div>
  `;
}


function postDraftProcessGrade(selected, picks) {
  const draftId = state.viewedDraftId || `active-${String(state.activeLeagueId || LEAGUE.id || "default")}-${picks.length}`;
  const userPicks = picks.filter((pick) => Number(pick.team) === Number(selected.team) && !pick.keeper).sort((a, b) => a.pick - b.pick);
  const plan = state.bulk.draftPlan;
  const plannedOpening = String(plan?.recommendedOpening || "").split("-").filter(Boolean);
  const actualOpening = userPicks.slice(0, plannedOpening.length || 3).map((pick) => pick.player.position);
  const mismatches = actualOpening.filter((position, index) => plannedOpening[index] && plannedOpening[index] !== position).length;
  const adherenceRate = plannedOpening.length ? Math.max(0, 1 - mismatches / plannedOpening.length) : null;
  const priorityRows = state.bulk.priority?.length ? state.bulk.priority : state.bulk.results?.summary?.priority || [];
  const reaches = userPicks.filter((pick) => Number(pick.player.consensusRank || pick.pick) - pick.pick >= 10);
  const justifiedReaches = reaches.filter((pick) => {
    const row = priorityRows.find((item) => item.playerId === pick.player.id);
    return row && (row.tierSurvival < 0.42 || row.replacementCost >= 0.65 || row.movement >= 5);
  });
  const unjustifiedReaches = reaches.filter((pick) => !justifiedReaches.includes(pick));
  const deviations = userPicks.slice(0, Math.max(8, plannedOpening.length)).filter((pick, index) => plannedOpening[index] && plannedOpening[index] !== pick.player.position);
  const goodDeviations = deviations.filter((pick) => {
    const row = priorityRows.find((item) => item.playerId === pick.player.id);
    return row?.tags?.includes("Strong Pivot") || row?.tags?.includes("Fragile Tier") || row?.movement >= 4;
  });
  const avoidableDeviations = deviations.filter((pick) => !goodDeviations.includes(pick));
  const safeWaitPlayers = priorityRows.filter((row) => row.tags?.includes("Safe to Wait"));
  const safeWaitWorked = safeWaitPlayers.filter((row) => {
    const drafted = userPicks.find((pick) => pick.player.id === row.playerId);
    return drafted && drafted.pick > (row.earliestReasonablePick || 0);
  });
  const safeWaitFailed = safeWaitPlayers.filter((row) => !userPicks.some((pick) => pick.player.id === row.playerId) && picks.some((pick) => pick.player.id === row.playerId));
  const runChases = userPicks.filter((pick) => {
    const previous = picks.filter((row) => row.pick < pick.pick).sort((a, b) => b.pick - a.pick).slice(0, 3);
    return previous.filter((row) => row.player.position === pick.player.position).length >= 2;
  });
  const falseRunChases = runChases.filter((pick) => {
    const next = picks.filter((row) => row.pick > pick.pick).sort((a, b) => a.pick - b.pick).slice(0, 4);
    return next.filter((row) => row.player.position === pick.player.position).length <= 1;
  });
  const predictionRows = (state.learning.predictionLogs || []).filter((row) => row.draftId === predictionDraftId() && row.resolved);
  const predictionAccuracy = predictionRows.length ? average(predictionRows.map((row) => row.predictedPositionCorrect ? 1 : 0)) : null;
  const planQuality = plan ? (state.bulk.results?.summary?.confidence?.label || "Limited evidence") : "Unavailable";
  const executionScore = clampNumber(82 - mismatches * 8 - unjustifiedReaches.length * 6 - falseRunChases.length * 4 + justifiedReaches.length * 3 + goodDeviations.length * 4, 0, 100);
  const label = executionScore >= 84 ? "Strong process" : executionScore >= 70 ? "Sound process" : executionScore >= 55 ? "Mixed process" : "Needs review";
  const result = {
    schemaVersion: SIMULATOR_SCHEMA_VERSION,
    draftId,
    generatedAt: new Date().toISOString(),
    team: selected.team,
    finalRosterOutcome: { grade: selected.grade, roomRank: selected.rank, playoffRate: Number(selected.playoffOdds || 0) / 100, weeklyProjection: selected.weeklyProjection },
    planAvailable: Boolean(plan),
    plannedOpening: plannedOpening.join("-") || "Unavailable",
    actualOpening: actualOpening.join("-") || "Unavailable",
    adherenceRate,
    label,
    executionScore,
    planQuality,
    correctPivots: goodDeviations.map((pick) => pick.player.name),
    missedPivotOpportunities: avoidableDeviations.map((pick) => pick.player.name),
    justifiedReaches: justifiedReaches.map((pick) => pick.player.name),
    unjustifiedReaches: unjustifiedReaches.map((pick) => pick.player.name),
    safeWaitWorked: safeWaitWorked.map((row) => row.player?.name || playerById(row.playerId)?.name).filter(Boolean),
    safeWaitFailed: safeWaitFailed.map((row) => row.player?.name || playerById(row.playerId)?.name).filter(Boolean),
    falseRunChases: falseRunChases.map((pick) => pick.player.name),
    predictionAccuracy,
    predictionSample: predictionRows.length,
    classification: goodDeviations.length ? "Good deviation caused by the room" : mismatches ? "Neutral or avoidable deviation" : plan ? "Plan followed" : "Plan assumption unavailable",
  };
  state.learning.postDraftGrades[draftId] = result;
  saveSimulatorState();
  return result;
}

function renderPostDraftProcessGrade(grade) {
  const itemList = (items, empty) => `<ul>${items.length ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : `<li>${escapeHtml(empty)}</li>`}</ul>`;
  return `<section class="process-grade-section">
    <div class="section-heading"><div><p class="eyebrow">Draft process</p><h3>${escapeHtml(grade.label)} · ${Math.round(grade.executionScore)}/100</h3></div><span>${escapeHtml(grade.classification)}</span></div>
    <p><strong>Plan quality:</strong> ${escapeHtml(grade.planQuality)}. <strong>Opening:</strong> ${escapeHtml(grade.plannedOpening)} planned versus ${escapeHtml(grade.actualOpening)} actual. ${grade.adherenceRate === null ? "No Draft Plan existed, so deviations are not penalized." : `${Math.round(grade.adherenceRate * 100)}% opening adherence.`}</p>
    <div class="process-grade-grid">
      <article><h4>Correct pivots and justified reaches</h4>${itemList([...grade.correctPivots, ...grade.justifiedReaches], "No evidence-backed pivot or reach was required.")}</article>
      <article><h4>Missed or avoidable decisions</h4>${itemList([...grade.missedPivotOpportunities, ...grade.unjustifiedReaches], "No clearly avoidable deviation was identified.")}</article>
      <article><h4>Safe-to-wait outcomes</h4>${itemList(grade.safeWaitWorked, "No tracked safe-to-wait target was acquired later.")}${grade.safeWaitFailed.length ? `<p><strong>Failed waits:</strong> ${escapeHtml(grade.safeWaitFailed.join(", "))}</p>` : ""}</article>
      <article><h4>Runs and prediction accuracy</h4><p>${grade.falseRunChases.length ? `Possible false-run chases: ${escapeHtml(grade.falseRunChases.join(", "))}.` : "No clear false run chase was detected."}</p><p>${grade.predictionSample ? `${Math.round(grade.predictionAccuracy * 100)}% top-position accuracy across ${grade.predictionSample} resolved forecasts.` : "No live predictions were evaluated for this draft."}</p></article>
    </div>
    <p class="helper">A room-driven deviation can be good. This grade separates plan assumptions, execution decisions, and actual roster outcome instead of punishing every change from the opening plan.</p>
  </section>`;
}

function renderTeamAnalysis() {
  document.querySelectorAll("[data-analysis-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.analysisView === state.analysisView);
  });
  if (state.analysisView === "awards") {
    renderDraftAwards();
    return;
  }
  const league = activeLeague();
  const picks = activePicks();
  const total = league.teams * league.rounds;
  const selectedTeam = Math.min(state.analysisTeam, league.teams);
  $("analysisTeamSelect").innerHTML = Array.from({ length: league.teams }, (_, index) => {
    const team = index + 1;
    return `<option value="${team}" ${team === selectedTeam ? "selected" : ""}>${escapeHtml(activeTeamName(team))}</option>`;
  }).join("");
  if (picks.length < total) {
    $("teamAnalysis").innerHTML = `<p class="empty">Complete or load a full draft to see team grades and simulated playoff qualification rates.</p>`;
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
  const processGrade = postDraftProcessGrade(selected, picks);

  $("teamAnalysis").innerHTML = `
    <div class="analysis-hero">
      <div>
        <p class="eyebrow">${escapeHtml(activeTeamName(selected.team))}</p>
        <h3>${selected.grade} Draft Grade</h3>
        <p>${selected.weeklyProjection.toFixed(1)} projected starter points per week - ${selected.playoffOdds}% simulated playoff qualification rate - rank #${selected.rank} of ${league.teams}.</p>
      </div>
      <div class="analysis-metrics">
        <div><strong>${selected.weeklyProjection.toFixed(1)}</strong><span>Starter avg</span></div>
        <div><strong>${selected.value.toFixed(1)}</strong><span>Pick value</span></div>
        <div><strong>${selected.playoffOdds}%</strong><span>Sim playoffs</span></div>
      </div>
    </div>
    ${renderPostDraftProcessGrade(processGrade)}
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
    $("simRestBtn").disabled = true;
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
  $("simRestBtn").disabled = done || isLiveDraftMode() || state.draftSimulation.running;
  $("autoPickBtn").disabled = state.draftSimulation.running || done || (isLiveDraftMode() ? false : !userTurn);
  $("advanceBtn").disabled = state.draftSimulation.running || done || isLiveDraftMode() || userTurn;
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
  renderKeeperRankings();
  renderBulkSimulator();
  renderOrderSummary();
  renderSourceStatus();
  renderCheatSheet();
  renderLeagueSettings();
  renderPersonaManager();
  renderDraftHistory();
  renderTeamAnalysis();
  renderScoutingReport();
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
    setKeeperStatus("Player not found. Choose a name from the rankings list.");
    renderKeeperRankings();
    return;
  }
  state.keeperSelections[index] = {
    ...state.keeperSelections[index],
    playerId: player ? player.id : "",
  };
  clearTradeFinderIdeas();
  saveKeeperSelections();
  refreshKeeperPicksInCurrentDraft();
  setKeeperStatus("Keeper settings saved and added to the draft board.");
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
  setKeeperStatus("Keeper settings saved and added to the draft board.");
  render();
}

async function importRankingsFile(file) {
  const isXlsx = /\.(xlsx|xlsm)$/i.test(file.name);
  const rows = isXlsx
    ? await parseXlsxRankingFile(await file.arrayBuffer(), file.name)
    : parseRankingFile(await file.text(), file.name);
  if (!rows.length) {
    return {
      ok: false,
      message: `${file.name}: no usable rankings found. Try columns such as Player/Name, Position/POS, Team/TM, Rank/RK/ECR, Tier, ADP/AVG, projection/points, or Market Score. XLSX files can have title rows or multiple sheets as long as one table has player-style headers.`,
    };
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
    if (!Number.isFinite(Number(state.rankingSourceWeights?.[name]))) {
      state.rankingSourceWeights[name] = 3;
    }
  });
  rebuildConsensusPlayers(state.importedRankingRows);
  saveRankingState();
  resetDraft();
  return {
    ok: true,
    rows: rows.length,
    sourceNames,
    message: `${file.name}: imported ${rows.length} rankings from ${sourceNames.join(", ")}.`,
  };
}

async function importRankingFiles(files) {
  const results = [];
  for (const file of files) {
    try {
      results.push(await importRankingsFile(file));
    } catch (error) {
      results.push({
        ok: false,
        message: `${file.name}: import failed - ${error.message}`,
      });
    }
  }
  const successes = results.filter((result) => result.ok);
  if (successes.length) {
    const totalRows = successes.reduce((sum, result) => sum + result.rows, 0);
    const sourceNames = [...new Set(successes.flatMap((result) => result.sourceNames))];
    const failed = results.filter((result) => !result.ok);
    $("importStatus").textContent = [
      `Imported ${totalRows} rankings from ${sourceNames.join(", ")}.`,
      failed.length ? `Skipped ${failed.length} file(s): ${failed.map((result) => result.message).join(" ")}` : "",
    ].filter(Boolean).join(" ");
    return;
  }
  $("importStatus").textContent = results.map((result) => result.message).join(" ");
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
  const passTd = Number(scoringSettings.pass_td);
  const rushTd = Number(scoringSettings.rush_td);
  const recTd = Number(scoringSettings.rec_td);
  const scoring = tePremium > 0 ? "TE Premium" : rec >= 1 ? "PPR" : rec > 0 ? "Half-PPR" : "Standard";
  const rounds = Number(draft?.settings?.rounds || league.settings?.draft_rounds || LEAGUE.rounds);

  return normalizeLeagueSettings({
    ...LEAGUE,
    name: league.name || LEAGUE.name,
    teams: Number(league.total_rosters || draft?.settings?.teams || LEAGUE.teams),
    scoring,
    scoringSettings: {
      reception: Number.isFinite(rec) ? rec : (SCORING_PRESETS[scoring]?.reception ?? DEFAULT_LEAGUE.scoringSettings.reception),
      teReceptionBonus: Number.isFinite(tePremium) ? tePremium : (SCORING_PRESETS[scoring]?.teReceptionBonus ?? 0),
      passTd: Number.isFinite(passTd) ? passTd : DEFAULT_LEAGUE.scoringSettings.passTd,
      rushRecTd: Number.isFinite(rushTd) && Number.isFinite(recTd)
        ? (rushTd + recTd) / 2
        : Number.isFinite(rushTd)
          ? rushTd
          : Number.isFinite(recTd)
            ? recTd
            : DEFAULT_LEAGUE.scoringSettings.rushRecTd,
    },
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
    const rosterPlayers = (keeperRoster?.players || [])
      .map((sleeperPlayerId) => {
        const sleeperPlayer = sleeperPlayers[String(sleeperPlayerId)];
        const draftPick = draftPickBySleeperId.get(String(sleeperPlayerId));
        const matched = matchSleeperPlayer(sleeperPlayer, draftPick?.metadata);
        if (!matched) return null;
        return {
          playerId: matched.id,
          sleeperPlayerId: String(sleeperPlayerId),
          name: matched.name,
          position: matched.position,
          team: matched.team,
          round: draftPick?.round || "",
          pickNo: draftPick?.pickNo || "",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
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
      rosterPlayers,
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

function sleeperPickPlayerName(pick) {
  const metadata = pick?.metadata || {};
  return [metadata.first_name, metadata.last_name].filter(Boolean).join(" ").trim()
    || metadata.player_name
    || metadata.name
    || "";
}

function sleeperPickPosition(pick, matchedPlayer = null) {
  const metadata = pick?.metadata || {};
  return normalizePosition(metadata.position || metadata.pos || matchedPlayer?.position || "");
}

function currentTeamForHistoricalPick(pick, currentRosters, historicalRosters) {
  const ownerId = String(pick?.picked_by || pick?.roster_id || "");
  const historicalRoster = historicalRosters.find((roster) => String(roster.owner_id) === ownerId || String(roster.roster_id) === ownerId);
  const currentRoster = historicalRoster
    ? currentRosters.find((roster) => roster.owner_id && historicalRoster.owner_id && String(roster.owner_id) === String(historicalRoster.owner_id))
    : currentRosters.find((roster) => String(roster.owner_id) === ownerId || String(roster.roster_id) === ownerId);
  return currentRoster ? appTeamForSleeperRosterId(currentRosters, currentRoster.roster_id) : null;
}

async function sleeperLeagueHistory(league, currentRosters, currentDraft, currentPicks) {
  const history = [];
  let cursor = league;
  let draft = currentDraft;
  let picks = currentPicks;
  let rosters = currentRosters;
  const seen = new Set();

  for (let depth = 0; cursor?.league_id && depth < 12 && !seen.has(String(cursor.league_id)); depth += 1) {
    seen.add(String(cursor.league_id));
    history.push({
      leagueId: String(cursor.league_id),
      name: cursor.name || `Season ${cursor.season || depth + 1}`,
      season: String(cursor.season || state.sleeper.season || ""),
      rosters: Array.isArray(rosters) ? rosters : [],
      draft,
      picks: Array.isArray(picks) ? picks : [],
    });
    if (!cursor.previous_league_id) break;
    cursor = await sleeperFetch(`/league/${encodeURIComponent(cursor.previous_league_id)}`);
    const [previousRosters, previousDrafts] = await Promise.all([
      sleeperFetch(`/league/${encodeURIComponent(cursor.league_id)}/rosters`),
      sleeperFetch(`/league/${encodeURIComponent(cursor.league_id)}/drafts`),
    ]);
    rosters = Array.isArray(previousRosters) ? previousRosters : [];
    draft = bestDraftForLeague(cursor, Array.isArray(previousDrafts) ? previousDrafts : []);
    picks = draft?.draft_id
      ? await sleeperFetchOptional(`/draft/${encodeURIComponent(draft.draft_id)}/picks`, [])
      : [];
  }
  return history;
}

function incrementCount(target, key, amount = 1) {
  if (!key) return;
  target[key] = (target[key] || 0) + amount;
}

function sortedCountEntries(counts) {
  return Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
}

function topCountLabel(counts, fallback = "Balanced") {
  const top = sortedCountEntries(counts)[0];
  return top ? top[0] : fallback;
}

function personaIdFromScouting(profile) {
  const early = profile.roundPositionBias?.early || {};
  const topEarly = topCountLabel(early, "");
  const avgQb = profile.positionAvgRound?.QB || 99;
  const avgTe = profile.positionAvgRound?.TE || 99;
  if (avgQb <= 5) return "elite-qb-hunter";
  if (avgTe <= 5) return "elite-te-hunter";
  if (topEarly === "WR" && (early.RB || 0) <= 1) return "zero-rb-sharp";
  if (topEarly === "RB" && (early.RB || 0) >= 4) return "robust-rb-drafter";
  if (topEarly === "RB") return "hero-rb-builder";
  if (topEarly === "WR") return "wr-volume-drafter";
  if (profile.avgReach <= -10) return "upside-gambler";
  if (profile.avgReach >= 8) return "adp-grinder";
  return "adp-grinder";
}

function scoutingStrategyText(profile) {
  const topEarly = topCountLabel(profile.roundPositionBias?.early, "balanced");
  const avgQb = profile.positionAvgRound?.QB || 99;
  const avgTe = profile.positionAvgRound?.TE || 99;
  const reachText = profile.avgReach <= -8
    ? "is comfortable pushing players ahead of market"
    : profile.avgReach >= 8
      ? "usually lets value fall to them"
      : "tends to stay near market";
  if (avgQb <= 5) return `Expect an early QB window if the tier is there; this manager ${reachText}.`;
  if (avgTe <= 5) return `Expect a possible early TE bet and a focus on positional advantage; this manager ${reachText}.`;
  if (topEarly === "RB") return `Expect RB pressure early, especially if the room leaves volume backs available; this manager ${reachText}.`;
  if (topEarly === "WR") return `Expect a WR-heavy opening and patience at RB unless value falls; this manager ${reachText}.`;
  return `Expect a flexible board-value approach with roster needs deciding close calls; this manager ${reachText}.`;
}

function buildScoutingReport(history, currentRosters) {
  const teamProfiles = Array.from({ length: LEAGUE.teams }, (_, index) => ({
    team: index + 1,
    pickRecords: [],
    positionBias: {},
    roundPositionBias: { early: {}, middle: {}, late: {} },
    roundPositionCounts: {},
    positionRounds: {},
    positionAvgRound: {},
    positionMinRound: {},
    positionMaxRound: {},
    reaches: [],
    reachByPosition: {},
    firstRoundPositions: {},
    firstThreeBuilds: {},
    seasons: [],
    seasonStats: [],
    runOpportunityCount: 0,
    runChaseCount: 0,
    runStartOpportunityCount: 0,
    runStartCount: 0,
    needOpportunityCount: 0,
    needFillCount: 0,
    recentWeightedPicks: 0,
    totalWeightedPicks: 0,
    primaryRoundOneSlotCount: 0,
    primaryRoundOnePickCount: 0,
  }));
  const league = {
    draftsAnalyzed: 0,
    picksAnalyzed: 0,
    positionRounds: {},
    positionRoundCounts: {},
    positionCounts: {},
    firstRoundPositions: {},
    reachByPosition: {},
    seasonStats: [],
    marketReference: { historicalCount: 0, pickMetadataCount: 0, baselineCount: 0, directionalCount: 0, unavailableCount: 0 },
    patterns: [],
  };

  const validHistory = (Array.isArray(history) ? history : []).filter((season) => Array.isArray(season.picks) && season.picks.length);
  const seasonOrder = [...validHistory].sort((a, b) => Number(b.season || 0) - Number(a.season || 0));
  const recencyWeightBySeason = new Map(seasonOrder.map((season, index) => [String(season.season), Math.max(0.42, 1 - index * 0.16)]));

  validHistory.forEach((season) => {
    league.draftsAnalyzed += 1;
    const seasonKey = String(season.season || "Unknown");
    const recencyWeight = recencyWeightBySeason.get(seasonKey) || 0.55;
    const seasonTeamPicks = new Map();
    const seasonLeagueStats = {
      season: seasonKey,
      name: season.name || `Season ${seasonKey}`,
      picks: 0,
      positionCounts: {},
      positionRoundCounts: {},
      reachByPosition: {},
      recencyWeight,
    };
    const normalizedRows = [];

    [...season.picks]
      .sort((a, b) => Number(a.pick_no || a.pick || 0) - Number(b.pick_no || b.pick || 0))
      .forEach((pick) => {
        const name = sleeperPickPlayerName(pick);
        const matched = name ? playerByName(name) : null;
        const position = sleeperPickPosition(pick, matched);
        const round = Number(pick.round);
        const pickNo = Number(pick.pick_no || pick.pick);
        const team = currentTeamForHistoricalPick(pick, currentRosters, season.rosters || []);
        if (!team || !round || !pickNo || !position) return;
        const profile = teamProfiles[team - 1];
        const metadata = pick.metadata || {};
        const pickTimeAdp = Number(metadata.adp || metadata.player_adp || metadata.rank || metadata.overall_rank || pick.adp);
        const historicalBaseline = historicalAdpForPlayer(seasonKey, name, position);
        const baselineAdp = Number(historicalBaseline?.adp);
        const currentAdp = Number(matched?.adp);
        const hasPickTimeReference = Number.isFinite(pickTimeAdp) && pickTimeAdp > 0;
        const hasSeasonBaseline = Number.isFinite(baselineAdp) && baselineAdp > 0;
        const reference = hasPickTimeReference ? pickTimeAdp : hasSeasonBaseline ? baselineAdp : currentAdp;
        const marketReferenceType = hasPickTimeReference
          ? "pick_metadata"
          : hasSeasonBaseline
            ? "season_baseline"
            : Number.isFinite(currentAdp)
              ? "current_directional"
              : "unavailable";
        const reach = Number.isFinite(reference) ? pickNo - reference : null;
        const band = round <= 3 ? "early" : round <= 8 ? "middle" : "late";
        const draftSlot = ((pickNo - 1) % Math.max(1, LEAGUE.teams)) + 1;
        const yearsExp = Number(metadata.years_exp ?? metadata.yearsExperience);
        const isRookie = yearsExp === 0 || /rookie|year 1|first-year/i.test(`${metadata.status || ""} ${metadata.news || ""}`) || Boolean(matched && isYoungUpsidePlayer(matched));
        const row = {
          season: seasonKey,
          round,
          pickNo,
          draftSlot,
          team,
          name,
          position,
          reach: Number.isFinite(reach) ? reach : null,
          marketReference: Number.isFinite(reference) ? reference : null,
          marketReferenceType,
          historicalTier: historicalBaseline?.positionTier || null,
          historicalOverallTier: historicalBaseline?.overallTier || null,
          historicalTierMethod: historicalBaseline?.tierMethod || null,
          historicalSource: historicalBaseline?.source || null,
          historicalSnapshot: historicalBaseline?.snapshotEnd || historicalBaseline?.snapshotStart || null,
          recencyWeight,
          isRookie,
          filledStarterNeed: false,
          chasedRun: false,
          startedRun: false,
        };
        normalizedRows.push(row);
        profile.pickRecords.push(row);
        profile.reaches.push(row.reach);
        profile.totalWeightedPicks += recencyWeight;
        if (recencyWeight >= 0.9) profile.recentWeightedPicks += recencyWeight;
        if (!seasonTeamPicks.has(team)) seasonTeamPicks.set(team, []);
        seasonTeamPicks.get(team).push(row);
        incrementCount(profile.positionBias, position);
        incrementCount(profile.roundPositionBias[band], position);
        if (!profile.roundPositionCounts[round]) profile.roundPositionCounts[round] = {};
        incrementCount(profile.roundPositionCounts[round], position);
        if (!profile.positionRounds[position]) profile.positionRounds[position] = [];
        profile.positionRounds[position].push(round);
        if (round === 1) incrementCount(profile.firstRoundPositions, position);
        if (!profile.reachByPosition[position]) profile.reachByPosition[position] = { count: 0, sum: 0, ahead: 0, near: 0, after: 0 };
        if (Number.isFinite(row.reach)) {
          const marketRow = profile.reachByPosition[position];
          marketRow.count += 1;
          marketRow.sum += row.reach;
          if (row.reach <= -4) marketRow.ahead += 1;
          else if (row.reach >= 4) marketRow.after += 1;
          else marketRow.near += 1;
        }
        league.picksAnalyzed += 1;
        seasonLeagueStats.picks += 1;
        incrementCount(league.positionCounts, position);
        incrementCount(seasonLeagueStats.positionCounts, position);
        if (!league.positionRoundCounts[round]) league.positionRoundCounts[round] = {};
        if (!seasonLeagueStats.positionRoundCounts[round]) seasonLeagueStats.positionRoundCounts[round] = {};
        incrementCount(league.positionRoundCounts[round], position);
        incrementCount(seasonLeagueStats.positionRoundCounts[round], position);
        if (round === 1) incrementCount(league.firstRoundPositions, position);
        if (!league.positionRounds[position]) league.positionRounds[position] = [];
        league.positionRounds[position].push(round);
        if (!league.reachByPosition[position]) league.reachByPosition[position] = { count: 0, sum: 0, ahead: 0, near: 0, after: 0 };
        if (Number.isFinite(row.reach)) {
          const marketRow = league.reachByPosition[position];
          marketRow.count += 1;
          marketRow.sum += row.reach;
          if (row.reach <= -4) marketRow.ahead += 1;
          else if (row.reach >= 4) marketRow.after += 1;
          else marketRow.near += 1;
          if (!seasonLeagueStats.reachByPosition[position]) seasonLeagueStats.reachByPosition[position] = { count: 0, sum: 0, ahead: 0, near: 0, after: 0 };
          const seasonMarket = seasonLeagueStats.reachByPosition[position];
          seasonMarket.count += 1;
          seasonMarket.sum += row.reach;
          if (row.reach <= -4) seasonMarket.ahead += 1;
          else if (row.reach >= 4) seasonMarket.after += 1;
          else seasonMarket.near += 1;
        }
        if (hasPickTimeReference) {
          league.marketReference.historicalCount += 1;
          league.marketReference.pickMetadataCount += 1;
        } else if (hasSeasonBaseline) {
          league.marketReference.historicalCount += 1;
          league.marketReference.baselineCount += 1;
        } else if (Number.isFinite(currentAdp)) {
          league.marketReference.directionalCount += 1;
        } else {
          league.marketReference.unavailableCount += 1;
        }
      });

    normalizedRows.forEach((row, index) => {
      const previousOne = normalizedRows[index - 1];
      const previousTwo = normalizedRows[index - 2];
      const nextOne = normalizedRows[index + 1];
      const nextTwo = normalizedRows[index + 2];
      const profile = teamProfiles[row.team - 1];
      if (previousOne && previousTwo && previousOne.position === previousTwo.position && BEHAVIOR_POSITIONS.includes(previousOne.position)) {
        profile.runOpportunityCount += 1;
        if (row.position === previousOne.position) {
          profile.runChaseCount += 1;
          row.chasedRun = true;
        }
      }
      if (nextOne && nextTwo && BEHAVIOR_POSITIONS.includes(row.position)) {
        profile.runStartOpportunityCount += 1;
        if (nextOne.position === row.position && nextTwo.position === row.position && (!previousOne || previousOne.position !== row.position)) {
          profile.runStartCount += 1;
          row.startedRun = true;
        }
      }
    });

    seasonTeamPicks.forEach((picks, team) => {
      const profile = teamProfiles[team - 1];
      const sortedPicks = [...picks].sort((a, b) => a.pickNo - b.pickNo);
      const build = sortedPicks
        .filter((pick) => pick.round <= 3)
        .sort((a, b) => a.round - b.round || a.pickNo - b.pickNo)
        .map((pick) => pick.position)
        .join("-");
      if (build) incrementCount(profile.firstThreeBuilds, build);
      const seasonStat = {
        season: seasonKey,
        picks: picks.length,
        recencyWeight,
        positionBias: {},
        roundPositionBias: { early: {}, middle: {}, late: {} },
        roundPositionCounts: {},
        firstThreeBuild: build,
        avgReach: average(picks.map((pick) => pick.reach).filter(Number.isFinite)),
      };
      const rosterCounts = {};
      sortedPicks.forEach((pick) => {
        const band = pick.round <= 3 ? "early" : pick.round <= 8 ? "middle" : "late";
        incrementCount(seasonStat.positionBias, pick.position);
        incrementCount(seasonStat.roundPositionBias[band], pick.position);
        if (!seasonStat.roundPositionCounts[pick.round]) seasonStat.roundPositionCounts[pick.round] = {};
        incrementCount(seasonStat.roundPositionCounts[pick.round], pick.position);
        if (BEHAVIOR_POSITIONS.includes(pick.position)) {
          profile.needOpportunityCount += 1;
          const starterTarget = Number(LEAGUE.roster[pick.position] || 0) + (["RB", "WR", "TE"].includes(pick.position) ? Number(LEAGUE.roster.FLEX || 0) * 0.35 : 0);
          const before = Number(rosterCounts[pick.position] || 0);
          if (before < starterTarget) {
            profile.needFillCount += 1;
            pick.filledStarterNeed = true;
          }
          rosterCounts[pick.position] = before + 1;
        }
      });
      profile.seasonStats.push(seasonStat);
    });
    league.seasonStats.push(seasonLeagueStats);
  });

  const teams = teamProfiles.map((profile) => {
    Object.entries(profile.positionRounds).forEach(([position, rounds]) => {
      profile.positionAvgRound[position] = average(rounds);
      profile.positionMinRound[position] = Math.min(...rounds);
      profile.positionMaxRound[position] = Math.max(...rounds);
    });
    profile.avgReach = average(profile.reaches.filter(Number.isFinite));
    profile.picksAnalyzed = profile.pickRecords.length;
    profile.seasons = [...new Set(profile.pickRecords.map((pick) => String(pick.season)))];
    profile.draftsAnalyzed = profile.seasons.length;
    profile.recentWeightShare = profile.totalWeightedPicks ? profile.recentWeightedPicks / profile.totalWeightedPicks : 0;
    profile.runChaseRate = profile.runOpportunityCount ? profile.runChaseCount / profile.runOpportunityCount : 0;
    profile.runStartRate = profile.runStartOpportunityCount ? profile.runStartCount / profile.runStartOpportunityCount : 0;
    profile.needFillRate = profile.needOpportunityCount ? profile.needFillCount / profile.needOpportunityCount : 0;
    profile.reachProfile = profile.avgReach <= -8 ? "Aggressive/reach-friendly" : profile.avgReach >= 8 ? "Value patient" : "Market-aware";
    profile.personaId = personaIdFromScouting(profile);
    profile.personaName = PERSONAS.find((persona) => persona.id === profile.personaId)?.name || "ADP Grinder";
    profile.strategy = scoutingStrategyText(profile);
    const primaryEarly = topCountLabel(profile.roundPositionBias?.early, "");
    const primaryRoundOnePicks = profile.pickRecords.filter((pick) => pick.round === 1 && pick.position === primaryEarly);
    profile.primaryRoundOnePickCount = primaryRoundOnePicks.length;
    profile.primaryRoundOneSlotCount = primaryRoundOnePicks.filter((pick) => pick.draftSlot <= 4 || pick.draftSlot >= Math.max(1, LEAGUE.teams - 3)).length;
    profile.slotEffectShare = profile.primaryRoundOnePickCount ? profile.primaryRoundOneSlotCount / profile.primaryRoundOnePickCount : 0;
    profile.tendencies = [
      `Early bias: ${topCountLabel(profile.roundPositionBias.early)} (${sortedCountEntries(profile.roundPositionBias.early).slice(0, 3).map(([pos, count]) => `${pos} ${count}`).join(", ") || "no sample"}).`,
      `Most common opening build: ${topCountLabel(profile.firstThreeBuilds, "No repeated build")}.`,
      `QB timing: ${profile.positionAvgRound.QB ? `Round ${profile.positionAvgRound.QB.toFixed(1)} on average` : "no clear sample"}.`,
      `TE timing: ${profile.positionAvgRound.TE ? `Round ${profile.positionAvgRound.TE.toFixed(1)} on average` : "no clear sample"}.`,
      `Market behavior: ${profile.reachProfile} (${profile.avgReach.toFixed(1)} pick ADP delta).`,
    ];
    profile.patterns = [
      ...sortedCountEntries(profile.positionBias).slice(0, 4).map(([pos, count]) => `${pos}: ${count} total picks`),
      ...sortedCountEntries(profile.firstRoundPositions).slice(0, 2).map(([pos, count]) => `Round 1 ${pos}: ${count} time${count === 1 ? "" : "s"}`),
    ];
    delete profile.reaches;
    delete profile.totalWeightedPicks;
    delete profile.recentWeightedPicks;
    return profile;
  });

  Object.entries(league.positionRounds).forEach(([position, rounds]) => {
    league.positionRounds[position] = average(rounds);
  });
  Object.values(league.reachByPosition).forEach((row) => {
    row.avg = row.count ? row.sum / row.count : 0;
  });
  teams.forEach((team) => {
    Object.values(team.reachByPosition || {}).forEach((row) => {
      row.avg = row.count ? row.sum / row.count : 0;
    });
  });
  league.patterns = [
    `Most common Round 1 position: ${topCountLabel(league.firstRoundPositions)}.`,
    `Average QB draft round: ${league.positionRounds.QB ? league.positionRounds.QB.toFixed(1) : "N/A"}.`,
    `Average TE draft round: ${league.positionRounds.TE ? league.positionRounds.TE.toFixed(1) : "N/A"}.`,
    `Average RB draft round: ${league.positionRounds.RB ? league.positionRounds.RB.toFixed(1) : "N/A"}.`,
    `Average WR draft round: ${league.positionRounds.WR ? league.positionRounds.WR.toFixed(1) : "N/A"}.`,
  ];
  league.summary = league.draftsAnalyzed
    ? `${league.draftsAnalyzed} historical draft${league.draftsAnalyzed === 1 ? "" : "s"} and ${league.picksAnalyzed} qualifying picks analyzed.`
    : "No completed historical Sleeper draft picks were found yet.";

  return normalizeScoutingReport({
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    seasons: validHistory.map((season) => ({ season: String(season.season || "Unknown"), name: season.name || `Season ${season.season}`, picks: season.picks.length })),
    league,
    teams,
  }, LEAGUE.teams);
}


function applyScoutingPersonasToTeams(report = state.sleeper.importData?.scoutingReport) {
  const normalized = normalizeScoutingReport(report, LEAGUE.teams);
  state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => state.personaSources?.[index] || "default");
  state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => {
    if (state.personaSources[index] === "manual") {
      return state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id;
    }
    const profile = normalized.teams[index];
    const personaId = profile?.personaId;
    if (profile?.picksAnalyzed && PERSONAS.some((persona) => persona.id === personaId)) {
      state.personaSources[index] = "scouting";
      return personaId;
    }
    state.personaSources[index] = "default";
    return state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id;
  });
}

function scoutingProfileForTeam(team) {
  return state.sleeper.importData?.scoutingReport?.teams?.find((profile) => Number(profile.team) === Number(team)) || null;
}

function scoutingTendencyScore(player, team, pickNumber) {
  const profile = scoutingProfileForTeam(team);
  if (!profile || !profile.picksAnalyzed) return 0;
  const round = draftOrderFor(pickNumber).round;
  const band = round <= 3 ? "early" : round <= 8 ? "middle" : "late";
  const positionCountsForBand = profile.roundPositionBias?.[band] || {};
  const totalBand = Object.values(positionCountsForBand).reduce((sum, count) => sum + count, 0);
  const positionRate = totalBand ? (positionCountsForBand[player.position] || 0) / totalBand : 0;
  let score = 0;
  if (positionRate >= 0.45) score -= Math.min(14, 4 + positionRate * 14);
  if (positionRate <= 0.08 && totalBand >= 5) score += 5;
  const avgRound = profile.positionAvgRound?.[player.position];
  if (Number.isFinite(avgRound)) {
    if (round <= avgRound + 1 && round >= avgRound - 1) score -= 4;
    if (round < avgRound - 2) score += profile.reachProfile === "Aggressive/reach-friendly" ? -3 : 6;
  }
  if (profile.reachProfile === "Aggressive/reach-friendly" && Number.isFinite(player.adp) && player.adp - pickNumber >= 10) score -= 6;
  if (profile.reachProfile === "Value patient" && Number.isFinite(player.adp) && pickNumber - player.adp >= 8) score -= 7;
  if (profile.reachProfile === "Value patient" && Number.isFinite(player.adp) && player.adp - pickNumber >= 14) score += 8;
  return score;
}

function appTeamForSleeperRosterId(rosters, rosterId) {
  const sortedRosters = [...rosters].sort((a, b) => Number(a.roster_id) - Number(b.roster_id));
  const index = sortedRosters.findIndex((roster) => String(roster.roster_id) === String(rosterId));
  return index >= 0 ? index + 1 : null;
}

function sleeperDraftSlotTeams(rosters, draft) {
  const sortedRosters = [...rosters].sort((a, b) => Number(a.roster_id) - Number(b.roster_id));
  const teamByRosterId = new Map(sortedRosters.map((roster, index) => [String(roster.roster_id), index + 1]));
  const rosterByOwnerId = new Map(sortedRosters.map((roster) => [String(roster.owner_id), roster]));
  const slotTeams = new Map();

  Object.entries(draft?.slot_to_roster_id || {}).forEach(([slot, rosterId]) => {
    const team = teamByRosterId.get(String(rosterId));
    if (team) slotTeams.set(Number(slot), team);
  });

  if (!slotTeams.size) {
    Object.entries(draft?.draft_order || {}).forEach(([ownerId, slot]) => {
      const roster = rosterByOwnerId.get(String(ownerId));
      const team = roster ? teamByRosterId.get(String(roster.roster_id)) : null;
      if (team) slotTeams.set(Number(slot), team);
    });
  }

  return Array.from({ length: LEAGUE.teams }, (_, index) => slotTeams.get(index + 1) || index + 1);
}

function sleeperBaseRoundOrders(rosters, draft) {
  const slotTeams = sleeperDraftSlotTeams(rosters, draft);
  return Array.from({ length: LEAGUE.rounds }, (_, roundIndex) => {
    const order = [...slotTeams];
    return roundIndex % 2 === 0 ? order : order.reverse();
  });
}

function sleeperTradedPickAppliesToDraft(trade, season, draft) {
  const targetSeason = Number(season);
  const draftSeason = Number(draft?.season);
  const acceptableSeasons = new Set([
    String(targetSeason),
    String(targetSeason + 1),
    Number.isFinite(draftSeason) ? String(draftSeason) : "",
    Number.isFinite(draftSeason) ? String(draftSeason + 1) : "",
  ]);
  if (trade._source === "draft") return true;
  if (trade.draft_id && draft?.draft_id && String(trade.draft_id) === String(draft.draft_id)) return true;
  return !trade.season || acceptableSeasons.has(String(trade.season));
}

function sleeperTradedPickTimestamp(trade) {
  return Number(trade.updated || trade.updated_at || trade.created || trade.created_at || 0);
}

function sleeperTradedPickKey(trade) {
  return `${trade.season || ""}|${trade.round || ""}|${trade.roster_id || ""}`;
}

function sleeperTradedPickIdentity(trade) {
  return [
    trade.season || "",
    trade.round || "",
    trade.roster_id || "",
    trade.previous_owner_id || "",
    trade.owner_id || "",
  ].join("|");
}

function tagSleeperTradedPicks(picks, source) {
  return (Array.isArray(picks) ? picks : []).map((trade) => ({ ...trade, _source: source }));
}

function mergeSleeperTradedPicks(...groups) {
  const byIdentity = new Map();
  groups.flat().filter(Boolean).forEach((trade, index) => {
    const identity = sleeperTradedPickIdentity(trade);
    const existing = byIdentity.get(identity);
    const timestamp = sleeperTradedPickTimestamp(trade);
    if (!existing || timestamp >= existing.timestamp || (!timestamp && index >= existing.index)) {
      byIdentity.set(identity, { trade, index, timestamp });
    }
  });
  return [...byIdentity.values()].map((item) => item.trade);
}

function sleeperEligibleTradedPicks(tradedPicks, rosters, season, draft) {
  const latestByPick = new Map();
  (tradedPicks || []).forEach((trade, index) => {
    const round = Number(trade.round);
    if (!round || round < 1 || round > LEAGUE.rounds) return;
    if (!sleeperTradedPickAppliesToDraft(trade, season, draft)) return;
    const originalTeam = appTeamForSleeperRosterId(rosters, trade.roster_id);
    const currentOwnerTeam = appTeamForSleeperRosterId(rosters, trade.owner_id);
    if (!originalTeam || !currentOwnerTeam) return;
    const key = sleeperTradedPickKey(trade);
    const existing = latestByPick.get(key);
    const timestamp = sleeperTradedPickTimestamp(trade);
    const sourcePriority = trade._source === "draft" ? 2 : 1;
    if (!existing || sourcePriority > existing.sourcePriority || (sourcePriority === existing.sourcePriority && (timestamp >= existing.timestamp || (!timestamp && index >= existing.index)))) {
      latestByPick.set(key, {
        trade,
        index,
        timestamp,
        sourcePriority,
        round,
        originalTeam,
        currentOwnerTeam,
      });
    }
  });
  return [...latestByPick.values()].sort((a, b) => a.round - b.round || a.originalTeam - b.originalTeam);
}

function applySleeperTradedPicksToRoundOrders(tradedPicks, rosters, season, draft) {
  const baseOrders = sleeperBaseRoundOrders(rosters, draft);
  const orders = baseOrders.map((round) => [...round]);
  sleeperEligibleTradedPicks(tradedPicks, rosters, season, draft).forEach((item) => {
    const slotIndex = baseOrders[item.round - 1].findIndex((team) => team === item.originalTeam);
    if (slotIndex >= 0) orders[item.round - 1][slotIndex] = item.currentOwnerTeam;
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
  state.sleeper.status = "Importing Sleeper rosters, draft order, player IDs, traded picks, and league history...";
  renderSleeperImport();
  try {
    const league = await sleeperFetch(`/league/${encodeURIComponent(leagueId)}`);
    const [rosters, users, drafts, sleeperPlayers, leagueTradedPicks] = await Promise.all([
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
    const draftTradedPicks = draft?.draft_id
      ? await sleeperFetchOptional(`/draft/${encodeURIComponent(draft.draft_id)}/traded_picks`, [])
      : [];
    const tradedPicks = mergeSleeperTradedPicks(
      tagSleeperTradedPicks(leagueTradedPicks, "league"),
      tagSleeperTradedPicks(draftTradedPicks, "draft")
    );
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
    const leagueHistory = await sleeperLeagueHistory(league, normalizedRosters, draft, Array.isArray(picks) ? picks : []);
    importData.scoutingReport = buildScoutingReport(leagueHistory, normalizedRosters);
    state.activeLeagueId = state.activeLeagueId || appLeague.id;
    state.teamNames = importData.teams.map((team) => team.name);
    const importedUserTeam = importData.teams.find((team) => team.sleeperOwnerId && team.sleeperOwnerId === state.sleeper.userId)?.team;
    state.userTeam = importedUserTeam || Math.min(state.userTeam, LEAGUE.teams);
    state.roomRosterTeam = state.userTeam;
    const eligibleTradedPicks = sleeperEligibleTradedPicks(
      tradedPicks,
      normalizedRosters,
      season,
      draft
    );
    state.roundOrders = resizeRoundOrders(applySleeperTradedPicksToRoundOrders(
      tradedPicks,
      normalizedRosters,
      season,
      draft
    ));
    state.keeperSelections = normalizeKeeperSelections(state.keeperSelections);
    state.teamPersonas = Array.from({ length: LEAGUE.teams }, (_, index) => state.teamPersonas[index] || PERSONAS[index % PERSONAS.length].id);
    state.personaSources = Array.from({ length: LEAGUE.teams }, (_, index) => state.personaSources?.[index] || "default");
    state.sleeper.importData = importData;
    applyScoutingPersonasToTeams(importData.scoutingReport);
    clearTradeFinderIdeas();
    saveActiveLeagueProfile();
    setupTeamSelects();
    renderLeagueSettings();
    renderOrderEditor();
    resetDraft();
    const candidateCount = importData.teams.reduce((sum, team) => sum + team.keeperCandidates.length, 0);
    const leagueTradedPickCount = Array.isArray(leagueTradedPicks) ? leagueTradedPicks.length : 0;
    const draftTradedPickCount = Array.isArray(draftTradedPicks) ? draftTradedPicks.length : 0;
    const tradedPickCount = tradedPicks.length;
    const appliedTradedPickCount = eligibleTradedPicks.length;
    const draftSlotSource = Object.keys(draft?.slot_to_roster_id || {}).length
      ? "Sleeper draft slots"
      : Object.keys(draft?.draft_order || {}).length
        ? "Sleeper draft order"
        : "default snake order";
    const sourceText = importData.usedPreviousLeagueForKeepers
      ? ` Keeper candidates came from ${importData.keeperSourceSeason} via Sleeper's previous league link.`
      : "";
    const scoutingText = importData.scoutingReport?.league?.draftsAnalyzed
      ? ` Scouting report analyzed ${importData.scoutingReport.league.draftsAnalyzed} historical drafts.`
      : " Scouting report did not find completed historical drafts yet.";
    state.sleeper.status = `Imported ${importData.leagueName}: ${importData.teams.length} teams, ${candidateCount} keeper candidates, draft order from ${draftSlotSource}, and ${appliedTradedPickCount}/${tradedPickCount} Sleeper traded-pick records applied to Pick Order (${leagueTradedPickCount} league, ${draftTradedPickCount} draft).${sourceText}${scoutingText}`;
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
  renderCheatSheet();
  resetDraft();
}

function removeRankingSource(sourceName) {
  if (sourceName === SEED_SOURCE.name) {
    state.seedRankingsEnabled = false;
    state.rankingSources = state.rankingSources.filter((source) => source.name !== SEED_SOURCE.name);
    refreshRankingsAfterSourceChange("Sleeper ADP baseline disabled. The custom board now uses uploaded sources only.");
    return;
  }
  state.importedRankingRows = state.importedRankingRows.filter((row) => row.source !== sourceName);
  state.rankingSources = state.rankingSources.filter((source) => source.name !== sourceName);
  delete state.rankingSourceWeights[sourceName];
  refreshRankingsAfterSourceChange(`Removed ${sourceName}.`);
}

function restoreSeedRankings() {
  state.seedRankingsEnabled = true;
  if (!state.rankingSources.some((source) => source.name === SEED_SOURCE.name)) {
    state.rankingSources = [{ ...SEED_SOURCE }, ...state.rankingSources];
  }
  if (!Number.isFinite(Number(state.rankingSourceWeights[SEED_SOURCE.name]))) state.rankingSourceWeights[SEED_SOURCE.name] = 3;
  refreshRankingsAfterSourceChange("Sleeper ADP baseline restored.");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCustomBoardCsv() {
  const headers = [
    "lab_rank", "base_rank", "player", "position", "team", "tier", "sleeper_adp", "league_fit", "guide_signal", "rank_move",
    "confidence", "confidence_score", "source_count", "source_range", "source_agreement", "source_ranks", "tags", "league_reasons",
    "guide_positive", "guide_risks", "explanation",
  ];
  const rows = PLAYERS.map((player) => {
    const analysis = player.labAnalysis || buildRankAnalysis(player);
    return [
      player.consensusRank,
      player.baseConsensusRank,
      player.name,
      player.position,
      player.team,
      player.tier,
      Number.isFinite(player.adp) ? player.adp.toFixed(1) : "",
      Math.round(player.leagueFitScore || 50),
      Math.round(player.guideSignalScore || 50),
      player.modelEdge || 0,
      analysis.confidenceLabel,
      Number(analysis.confidenceScore || 0).toFixed(1),
      player.sourceCount || 0,
      analysis.sourceRange,
      analysis.agreementLabel,
      (analysis.sourceLines || []).join(" | "),
      (player.tags || []).join("|"),
      (analysis.leagueReasons || []).join(" | "),
      (analysis.guidePositive || []).join(" | "),
      (analysis.guideRisks || []).join(" | "),
      analysis.summary,
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fantasy-draft-labs-custom-board-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  const status = $("importStatus");
  if (status) status.textContent = "Custom board exported as CSV with source evidence, confidence, league reasons, guide signals, and tags.";
}

function resetRankingLab() {
  state.importedRankingRows = [];
  state.seedRankingsEnabled = true;
  state.rankingSources = [{ ...SEED_SOURCE }];
  state.rankingSourceWeights = { [SEED_SOURCE.name]: 3 };
  state.overlayStrength = "balanced";
  state.cheatSheetSource = "ALL";
  rebuildConsensusPlayers([]);
  saveRankingState();
  resetDraft();
  renderSourceStatus();
  renderCheatSheet();
  const status = $("importStatus");
  if (status) status.textContent = "Ranking Lab reset to the Sleeper ADP baseline.";
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
    invalidateSimulatorDerived("Draft strategy changed.", { keepSummary: true });
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
    state.personaSources = Array.from({ length: LEAGUE.teams }, () => "default");
    applyScoutingPersonasToTeams();
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
    state.tradeFinder.allIdeas = [];
    state.tradeFinder.declinedIdeaIds = [];
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
  $("cancelBulkSimBtn")?.addEventListener("click", cancelBulkSimulations);
  $("exportBulkSimBtn").addEventListener("click", exportBulkSimulationsZip);
  $("bulkCountInput").addEventListener("change", (event) => {
    state.bulk.count = Math.max(1, Math.min(bulkSafeCountLimit(state.bulk.mode), Number(event.target.value) || (state.bulk.mode === "compare" ? BULK_DEPTH_PRESETS[state.bulk.depth] : BULK_SINGLE_DEFAULT)));
    event.target.value = state.bulk.count;
    if (state.bulk.mode === "compare") {
      const matched = Object.entries(BULK_DEPTH_PRESETS).find(([, count]) => count === state.bulk.count);
      if (matched) state.bulk.depth = matched[0];
    }
    invalidateSimulatorDerived("Simulation sample settings changed.", { keepSummary: true });
    renderBulkSimulator();
  });
  $("bulkDepthSelect")?.addEventListener("change", (event) => {
    state.bulk.depth = Object.prototype.hasOwnProperty.call(BULK_DEPTH_PRESETS, event.target.value) ? event.target.value : "standard";
    if (state.bulk.mode === "compare") state.bulk.count = Math.min(BULK_DEPTH_PRESETS[state.bulk.depth], bulkSafeCountLimit("compare"));
    invalidateSimulatorDerived("Simulation analysis depth changed.", { keepSummary: true });
    renderBulkSimulator();
  });
  $("leagueScoringInput").addEventListener("change", (event) => {
    applyScoringPresetToForm(event.target.value);
  });
  $("bulkModeSelect").addEventListener("change", (event) => {
    state.bulk.mode = event.target.value === "single" ? "single" : "compare";
    state.bulk.count = state.bulk.mode === "compare"
      ? Math.min(BULK_DEPTH_PRESETS[state.bulk.depth], bulkSafeCountLimit("compare"))
      : Math.min(BULK_SINGLE_DEFAULT, bulkSafeCountLimit("single"));
    invalidateSimulatorDerived("Simulation mode changed.", { keepSummary: true });
    renderBulkSimulator();
  });
  $("bulkStrategySelect").addEventListener("change", (event) => {
    state.bulk.strategy = event.target.value;
    invalidateSimulatorDerived("Draft strategy changed.", { keepSummary: true });
    renderBulkSimulator();
  });
  $("bulkRandomizeRoomInput").addEventListener("change", (event) => {
    state.bulk.randomizeRoom = event.target.checked;
    invalidateSimulatorDerived("Room-variation settings changed.", { keepSummary: true });
    renderBulkSimulator();
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
  $("simRestBtn").addEventListener("click", simRestOfDraft);
  $("autoPickBtn").addEventListener("click", autoPickForCurrentTurn);
  $("undoPickBtn").addEventListener("click", undoLastPick);

  if ($("moreColumnsBtn")) $("moreColumnsBtn").addEventListener("click", () => { state.bigBoardMoreColumns = !state.bigBoardMoreColumns; renderAvailable(); });

  $("playerSearch").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAvailable();
  });

  $("cheatSheetSearch").addEventListener("input", (event) => {
    state.cheatSheetSearch = event.target.value;
    renderCheatSheet();
  });
  $("cheatSheetPosition").addEventListener("change", (event) => {
    state.cheatSheetPosition = event.target.value;
    renderCheatSheet();
  });
  $("cheatSheetSource").addEventListener("change", (event) => {
    state.cheatSheetSource = event.target.value;
    renderCheatSheet();
  });
  $("cheatSheetSort").addEventListener("change", (event) => {
    state.cheatSheetSort = event.target.value;
    renderCheatSheet();
  });
  $("cheatSheetPlanFilter")?.addEventListener("change", (event) => {
    state.cheatSheetPlanFilter = event.target.value;
    renderCheatSheet();
  });

  $("assistantSendBtn").addEventListener("click", () => submitAssistantQuestion($("assistantInput").value));
  $("assistantInput").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submitAssistantQuestion(event.currentTarget.value);
  });
  $("assistantClearBtn")?.addEventListener("click", () => resetAssistantSession("Conversation cleared."));
  $("assistantStopBtn")?.addEventListener("click", stopAssistantGeneration);
  $("assistantRetryBtn")?.addEventListener("click", retryAssistantQuestion);
  $("assistantDetailToggle")?.addEventListener("change", (event) => {
    synchronizeAssistantSession();
    state.assistantSession.answerDetail = event.target.checked ? "detailed" : "concise";
    saveAssistantSession();
    renderDraftAssistant();
  });
  $("assistantOfflineToggle")?.addEventListener("change", (event) => {
    synchronizeAssistantSession();
    state.assistantSession.offlineMode = Boolean(event.target.checked);
    state.assistantSession.lastError = "";
    saveAssistantSession();
    setAssistantStatus(event.target.checked ? "offline" : "ready");
    renderDraftAssistant();
  });

  $("exportCustomBoardBtn")?.addEventListener("click", exportCustomBoardCsv);
  $("resetRankingLabBtn")?.addEventListener("click", resetRankingLab);
  $("overlayStrengthSelect")?.addEventListener("change", (event) => {
    state.overlayStrength = OVERLAY_PRESETS[event.target.value] ? event.target.value : "balanced";
    rebuildConsensusPlayers(state.importedRankingRows);
    saveRankingState();
    resetDraft();
    renderSourceStatus();
    renderCheatSheet();
    const status = $("importStatus");
    if (status) status.textContent = `${OVERLAY_PRESETS[state.overlayStrength].label} customization applied.`;
  });

  $("rankingsUpload").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      await importRankingFiles(files);
    } catch (error) {
      $("importStatus").textContent = `Import failed: ${error.message}`;
    } finally {
      event.target.value = "";
    }
  });

  renderPositionFilters();

  document.addEventListener("click", (event) => {
    const closePlayerDetailFlag = event.target.closest("[data-close-player-detail]");
    const playerDetailId = event.target.closest("[data-player-detail]")?.dataset.playerDetail;
    const draftId = event.target.closest("[data-draft]")?.dataset.draft;
    const flagPlayerId = event.target.closest("[data-flag-player]")?.dataset.flagPlayer;
    const flaggedSleepers = event.target.closest("[data-flagged-sleepers]");
    const sleeperFlagSuggestions = event.target.closest("[data-sleeper-flag-suggestions]");
    const analysisView = event.target.closest("[data-analysis-view]")?.dataset.analysisView;
    const scoutingView = event.target.closest("[data-scouting-view]")?.dataset.scoutingView;
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
    const declineTradeIdeaId = event.target.closest("[data-decline-trade-idea]")?.dataset.declineTradeIdea;
    const useRankedKeeperButton = event.target.closest("[data-use-ranked-keeper-team]");
    const roomRosterTeam = event.target.closest("[data-room-roster-team]")?.dataset.roomRosterTeam;
    const scoutingTeamCard = event.target.closest("[data-scouting-team-card]")?.dataset.scoutingTeamCard;
    const refreshCounterfactual = event.target.closest("#refreshCounterfactualBtn, [data-refresh-counterfactual]");
    if (refreshCounterfactual) {
      startBulkCounterfactualAnalysis();
      return;
    }
    if (closePlayerDetailFlag) {
      closePlayerDetail();
      return;
    }
    if (playerDetailId) {
      openPlayerDetail(playerDetailId);
      return;
    }
    if (flagPlayerId) {
      if (state.flaggedPlayerIds.has(flagPlayerId)) state.flaggedPlayerIds.delete(flagPlayerId);
      else state.flaggedPlayerIds.add(flagPlayerId);
      saveFlaggedPlayers();
      renderAvailable();
      return;
    }
    if (flaggedSleepers) {
      addAssistantMessage("user", "Recommend sleepers from my flagged players.");
      addAssistantMessage("assistant", flaggedSleeperAdvice());
      return;
    }
    if (sleeperFlagSuggestions) {
      addAssistantMessage("user", "Who should I flag as potential sleepers?");
      addAssistantMessage("assistant", sleeperFlagSuggestionsAdvice());
      return;
    }
    if (analysisView) {
      state.analysisView = analysisView;
      renderTeamAnalysis();
      return;
    }
    if (scoutingTeamCard) {
      state.scoutingTeam = Number(scoutingTeamCard);
      state.scoutingView = "managers";
      state.activePanel = "scouting";
      render();
      return;
    }
    if (scoutingView) {
      state.scoutingView = scoutingView;
      renderScoutingReport();
      return;
    }
    if (draftId) {
      const order = draftOrderFor(state.currentPick);
      if (state.viewedDraftId || (!isLiveDraftMode() && order.team !== state.userTeam)) return;
      const player = availablePlayers().find((p) => p.id === draftId);
      if (player) {
        makeUserPickAndContinue(player);
        closePlayerDetail();
      }
      return;
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
      const idea = state.tradeFinder.allIdeas.find((item) => item.id === loadTradeIdeaId) || state.tradeFinder.ideas.find((item) => item.id === loadTradeIdeaId);
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
    if (declineTradeIdeaId) {
      state.tradeFinder.declinedIdeaIds = [...new Set([...state.tradeFinder.declinedIdeaIds, declineTradeIdeaId])];
      refreshVisibleTradeIdeas();
      renderTradeFinder();
    }
    if (useRankedKeeperButton) {
      const team = Number(useRankedKeeperButton.dataset.useRankedKeeperTeam);
      const playerId = useRankedKeeperButton.dataset.useRankedKeeperPlayer;
      const round = Number(useRankedKeeperButton.dataset.useRankedKeeperRound);
      state.keeperSelections[team - 1] = { playerId, round };
      clearTradeFinderIdeas();
      saveKeeperSelections();
      refreshKeeperPicksInCurrentDraft();
      setKeeperStatus("Keeper settings saved and added to the draft board.");
      render();
    }
    const assistantAction = event.target.closest("[data-assistant-action]");
    if (assistantAction) {
      handleDraftAssistantAction(assistantAction.dataset.assistantAction, assistantAction.dataset.assistantPlayerId || null);
      return;
    }
    const assistantPrompt = event.target.closest("[data-assistant-prompt]")?.dataset.assistantPrompt;
    if (assistantPrompt) {
      submitAssistantQuestion(assistantPrompt);
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const rankingSourceName = event.target.dataset.rankingSourceWeight;
    if (rankingSourceName !== undefined) {
      state.rankingSourceWeights[rankingSourceName] = clampNumber(event.target.value, 0, 5);
      rebuildConsensusPlayers(state.importedRankingRows);
      saveRankingState();
      resetDraft();
      renderSourceStatus();
      renderCheatSheet();
      const status = $("importStatus");
      if (status) status.textContent = `${rankingSourceName} weight set to ${state.rankingSourceWeights[rankingSourceName]}/5.`;
      return;
    }
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
    if (event.target.id === "keeperRankingsTeamSelect") {
      state.keeperRankingsTeam = event.target.value;
      renderKeeperRankings();
    }
    if (event.target.id === "scoutingTeamSelect") {
      state.scoutingTeam = Number(event.target.value);
      state.scoutingView = "managers";
      renderScoutingReport();
    }
    if (event.target.id === "behaviorSeasonFilter") {
      state.behaviorFilters.season = event.target.value;
      renderScoutingReport();
    }
    if (event.target.id === "behaviorManagerFilter") {
      state.behaviorFilters.manager = event.target.value;
      renderScoutingReport();
    }
    if (event.target.id === "behaviorPositionFilter") {
      state.behaviorFilters.position = event.target.value;
      renderScoutingReport();
    }
    if (event.target.id === "behaviorRoundStart") {
      state.behaviorFilters.roundStart = Math.max(1, Math.min(LEAGUE.rounds, Number(event.target.value) || 1));
      if (state.behaviorFilters.roundEnd < state.behaviorFilters.roundStart) state.behaviorFilters.roundEnd = state.behaviorFilters.roundStart;
      renderScoutingReport();
    }
    if (event.target.id === "behaviorRoundEnd") {
      state.behaviorFilters.roundEnd = Math.max(state.behaviorFilters.roundStart, Math.min(LEAGUE.rounds, Number(event.target.value) || LEAGUE.rounds));
      renderScoutingReport();
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
    if (event.target.id === "tradeFinderTargetTeam") {
      state.tradeFinder.targetTeam = event.target.value;
      if (!targetablePlayerEntryForTeam(state.tradeFinder.targetTeam, state.tradeFinder.targetPlayer)) {
        state.tradeFinder.targetPlayer = "";
        state.tradeFinder.targetRound = "";
      }
      state.tradeFinder.hasRun = false;
      renderTradeFinderTargetPlayerOptions();
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
      state.personaSources[Number(teamPersonaIndex)] = "manual";
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
    if (event.target.id === "tradeFinderTargetPlayer") {
      state.tradeFinder.targetPlayer = event.target.value;
      const entry = targetablePlayerEntryForTeam(state.tradeFinder.targetTeam, state.tradeFinder.targetPlayer);
      if (entry?.round && !state.tradeFinder.targetRound) state.tradeFinder.targetRound = entry.round;
      state.tradeFinder.hasRun = false;
      renderTradeFinder();
      return;
    }
    if (event.target.id === "tradeFinderTargetRound") {
      const round = Number(event.target.value);
      state.tradeFinder.targetRound = round ? Math.max(1, Math.min(LEAGUE.rounds, round)) : "";
      event.target.value = state.tradeFinder.targetRound;
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
loadFlaggedPlayers();
loadDraftHistory();
loadSimulatorState();
loadAssistantSession();
setupControls();
renderOrderEditor();
renderPersonaManager();
resetDraft({ preserveSimulator: true });
render();
