export interface BotConfig {
  id: string;
  name: string;
  elo: number;
  depth: number;
  skillLevel: number;
  moveTimeMs: number;
  description: string;       // personality description shown in preview
  quote: string;             // fun one-liner the bot "says"
  avatarEmoji: string;       // emoji used as avatar
  avatarColor: string;       // tailwind bg color class for avatar circle
  category: 'beginner' | 'intermediate' | 'advanced' | 'master';
  style: string;             // playing style label
  engine?: 'stockfish' | 'maia'; // engine source selector
  // backward compat
  avatarInitials: string;
  colorClass: string;
}

export const BOTS: BotConfig[] = [
  // BEGINNER (4 bots)
  {
    id: 'bot_rookie', name: 'Rookie Rob', elo: 325, depth: 1, skillLevel: 1, moveTimeMs: 80,
    category: 'beginner', style: 'Chaotic', engine: 'stockfish',
    avatarEmoji: '🐣', avatarColor: 'bg-yellow-500', avatarInitials: 'RR', colorClass: 'yellow',
    quote: 'Chess? I thought this was checkers!',
    description: 'Completely new to chess. Moves pieces randomly, often hangs everything. Great for absolute beginners.',
  },
  {
    id: 'bot_andy', name: 'Anxious Andy', elo: 500, depth: 1, skillLevel: 2, moveTimeMs: 120,
    category: 'beginner', style: 'Nervous', engine: 'stockfish',
    avatarEmoji: '😰', avatarColor: 'bg-blue-400', avatarInitials: 'AA', colorClass: 'blue',
    quote: 'Wait, can the knight do that? Oh no.',
    description: 'Knows the basic rules but panics under pressure. Drops pieces frequently.',
  },
  {
    id: 'bot_pablo', name: 'Pawn Pablo', elo: 700, depth: 1, skillLevel: 3, moveTimeMs: 170,
    category: 'beginner', style: 'Pawn Pusher', engine: 'stockfish',
    avatarEmoji: '♟️', avatarColor: 'bg-green-500', avatarInitials: 'PP', colorClass: 'green',
    quote: 'My pawns will crush you. Eventually.',
    description: 'Loves advancing pawns but forgets about pieces. Predictable but improving.',
  },
  {
    id: 'bot_clueless', name: 'Clueless Carl', elo: 850, depth: 2, skillLevel: 4, moveTimeMs: 230,
    category: 'beginner', style: 'Random', engine: 'stockfish',
    avatarEmoji: '🤷', avatarColor: 'bg-orange-400', avatarInitials: 'CC', colorClass: 'orange',
    quote: 'I had a plan. I forgot it.',
    description: 'Can see one move ahead on a good day. Often walks into obvious traps.',
  },

  // INTERMEDIATE (6 bots)
  {
    id: 'bot_tactical_tina', name: 'Tactical Tina', elo: 1000, depth: 2, skillLevel: 5, moveTimeMs: 300,
    category: 'intermediate', style: 'Tactical', engine: 'stockfish',
    avatarEmoji: '⚔️', avatarColor: 'bg-red-500', avatarInitials: 'TT', colorClass: 'red',
    quote: 'I see your fork coming. Do you?',
    description: 'Starts spotting tactics like forks and pins. Will punish basic mistakes.',
  },
  {
    id: 'bot_solid_sam', name: 'Solid Sam', elo: 1150, depth: 2, skillLevel: 6, moveTimeMs: 380,
    category: 'intermediate', style: 'Solid', engine: 'stockfish',
    avatarEmoji: '🧱', avatarColor: 'bg-stone-500', avatarInitials: 'SS', colorClass: 'stone',
    quote: 'Boring wins games. Ask me how.',
    description: 'Plays safe, solid moves. Hard to beat outright but rarely creates threats.',
  },
  {
    id: 'bot_opening_olivia', name: 'Opening Olivia', elo: 1300, depth: 3, skillLevel: 7, moveTimeMs: 470,
    category: 'intermediate', style: 'Opening Expert', engine: 'stockfish',
    avatarEmoji: '📚', avatarColor: 'bg-purple-500', avatarInitials: 'OO', colorClass: 'purple',
    quote: 'e4 is objectively best. Fight me.',
    description: 'Has memorized opening theory but struggles in the middlegame. Dangerous early.',
  },
  {
    id: 'bot_counter_carlos', name: 'Counter Carlos', elo: 1450, depth: 3, skillLevel: 8, moveTimeMs: 560,
    category: 'intermediate', style: 'Counter-attacker', engine: 'stockfish',
    avatarEmoji: '🥊', avatarColor: 'bg-pink-500', avatarInitials: 'CC2', colorClass: 'pink',
    quote: 'You attack, I counter. Simple.',
    description: 'Lets you attack and then punishes overextension. Patient and dangerous.',
  },
  {
    id: 'bot_endgame_emma', name: 'Endgame Emma', elo: 1600, depth: 3, skillLevel: 9, moveTimeMs: 660,
    category: 'intermediate', style: 'Endgame Specialist', engine: 'stockfish',
    avatarEmoji: '👑', avatarColor: 'bg-amber-500', avatarInitials: 'EE', colorClass: 'amber',
    quote: 'Survive to the endgame. That is when I win.',
    description: 'Plays simple moves to reach endgames where technical skill dominates.',
  },
  {
    id: 'bot_trapper_tom', name: 'Trapper Tom', elo: 1750, depth: 4, skillLevel: 10, moveTimeMs: 770,
    category: 'intermediate', style: 'Tricky', engine: 'stockfish',
    avatarEmoji: '🦊', avatarColor: 'bg-orange-600', avatarInitials: 'TR', colorClass: 'orange',
    quote: 'It is not a blunder if it is a trap.',
    description: 'Sets clever traps and gambits. Unpredictable. Dangerous if you stop paying attention.',
  },

  // ADVANCED (4 bots)
  {
    id: 'bot_positional_pete', name: 'Positional Pete', elo: 1900, depth: 4, skillLevel: 11, moveTimeMs: 900,
    category: 'advanced', style: 'Positional', engine: 'stockfish',
    avatarEmoji: '🎯', avatarColor: 'bg-teal-500', avatarInitials: 'PP2', colorClass: 'teal',
    quote: 'Good pieces beat good moves.',
    description: 'Masters positional chess — outposts, weak squares, pawn structure. Hard to escape.',
  },
  {
    id: 'bot_berserker_boris', name: 'Berserker Boris', elo: 2050, depth: 4, skillLevel: 12, moveTimeMs: 1050,
    category: 'advanced', style: 'Ultra-Aggressive', engine: 'stockfish',
    avatarEmoji: '💥', avatarColor: 'bg-red-700', avatarInitials: 'BB', colorClass: 'red',
    quote: 'ATTACK. ALWAYS ATTACK.',
    description: 'Sacrifices pieces for wild attacking play. Not always correct but extremely dangerous.',
  },
  {
    id: 'bot_precise_priya', name: 'Precise Priya', elo: 2200, depth: 4, skillLevel: 13, moveTimeMs: 1200,
    category: 'advanced', style: 'Accurate', engine: 'stockfish',
    avatarEmoji: '🔬', avatarColor: 'bg-cyan-600', avatarInitials: 'PR', colorClass: 'cyan',
    quote: 'Every move has a reason. Do you know yours?',
    description: 'Plays with computer-like precision. Rarely blunders, exploits every inaccuracy.',
  },
  {
    id: 'bot_shark_sven', name: 'Shark Sven', elo: 2350, depth: 5, skillLevel: 14, moveTimeMs: 1350,
    category: 'advanced', style: 'Ruthless', engine: 'stockfish',
    avatarEmoji: '🦈', avatarColor: 'bg-blue-700', avatarInitials: 'SV', colorClass: 'blue',
    quote: 'I smell blood in the water.',
    description: 'Immediately capitalizes on any weakness. Extremely difficult to hold draws against.',
  },

  // MASTER (2 bots)
  {
    id: 'bot_gm_viktor', name: 'GM Viktor', elo: 2500, depth: 5, skillLevel: 15, moveTimeMs: 1500,
    category: 'master', style: 'Grandmaster', engine: 'stockfish',
    avatarEmoji: '🏆', avatarColor: 'bg-yellow-600', avatarInitials: 'GV', colorClass: 'yellow',
    quote: 'I have forgotten more chess than you know.',
    description: 'Grandmaster-strength play. Deep calculation, superior endgame technique. Very few can win.',
  },
  {
    id: 'bot_magnus_mode', name: 'The Machine', elo: 2800, depth: 5, skillLevel: 16, moveTimeMs: 2000,
    category: 'master', style: 'Perfect', engine: 'stockfish',
    avatarEmoji: '🤖', avatarColor: 'bg-gray-800', avatarInitials: 'MM', colorClass: 'gray',
    quote: 'Resistance is futile. I calculated your defeat 12 moves ago.',
    description: 'Near-perfect play with zero noise. Maximum engine strength. Can you even draw?',
  },

  // MAIA AI BOTS (11 bots, human-like)
  {
    id: 'bot_maia_400', name: 'Maia 400', elo: 400, depth: 1, skillLevel: 1, moveTimeMs: 100,
    category: 'beginner', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🐣', avatarColor: 'bg-indigo-400', avatarInitials: 'M0', colorClass: 'indigo',
    quote: 'I\'m just starting out, learning the ropes!',
    description: 'Simulates a human beginner around 400 ELO. Focuses on single-move ideas, prone to basic tactical blunders.',
  },
  {
    id: 'bot_maia_600', name: 'Maia 600', elo: 600, depth: 1, skillLevel: 2, moveTimeMs: 150,
    category: 'beginner', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🐥', avatarColor: 'bg-indigo-500', avatarInitials: 'M1', colorClass: 'indigo',
    quote: 'Let\'s try some simple plans!',
    description: 'Simulates a human player around 600 ELO. Understands basic captures, but easily distracted by active lines.',
  },
  {
    id: 'bot_maia_800', name: 'Maia 800', elo: 800, depth: 1, skillLevel: 3, moveTimeMs: 200,
    category: 'beginner', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🐢', avatarColor: 'bg-indigo-600', avatarInitials: 'M2', colorClass: 'indigo',
    quote: 'I\'ll keep my pieces safe if I can.',
    description: 'Simulates a human player around 800 ELO. Plays passive defensive moves, occasionally overlooking tactics.',
  },
  {
    id: 'bot_maia_1000', name: 'Maia 1000', elo: 1000, depth: 2, skillLevel: 5, moveTimeMs: 300,
    category: 'intermediate', style: 'Human-like', engine: 'maia',
    avatarEmoji: '⚔️', avatarColor: 'bg-indigo-700', avatarInitials: 'M3', colorClass: 'indigo',
    quote: 'I\'m starting to spot some tactical shots.',
    description: 'Simulates a human player around 1000 ELO. Spots basic 1-2 move forks and pins, but makes positional mistakes.',
  },
  {
    id: 'bot_maia_1200', name: 'Maia 1200', elo: 1200, depth: 2, skillLevel: 7, moveTimeMs: 400,
    category: 'intermediate', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🛡️', avatarColor: 'bg-violet-500', avatarInitials: 'M4', colorClass: 'violet',
    quote: 'Patience and structure are key.',
    description: 'Simulates a human player around 1200 ELO. Plays standard openings and solid human plans, with occasional blindspots.',
  },
  {
    id: 'bot_maia_1400', name: 'Maia 1400', elo: 1400, depth: 3, skillLevel: 9, moveTimeMs: 500,
    category: 'intermediate', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🦊', avatarColor: 'bg-violet-600', avatarInitials: 'M5', colorClass: 'violet',
    quote: 'Look out for my middlegame plans!',
    description: 'Simulates a human player around 1400 ELO. Active piece play, human-like attacks, and reasonable positional awareness.',
  },
  {
    id: 'bot_maia_1600', name: 'Maia 1600', elo: 1600, depth: 3, skillLevel: 11, moveTimeMs: 650,
    category: 'intermediate', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🧠', avatarColor: 'bg-violet-700', avatarInitials: 'M6', colorClass: 'violet',
    quote: 'Let\'s play a balanced, logical game.',
    description: 'Simulates a human player around 1600 ELO. Good opening preparation and tactical vision. Prone to errors in complex endgames.',
  },
  {
    id: 'bot_maia_1800', name: 'Maia 1800', elo: 1800, depth: 4, skillLevel: 13, moveTimeMs: 800,
    category: 'advanced', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🏹', avatarColor: 'bg-purple-500', avatarInitials: 'M7', colorClass: 'purple',
    quote: 'I\'ll challenge your positional accuracy.',
    description: 'Simulates a human player around 1800 ELO. Positional and tactical strength that matches solid club players.',
  },
  {
    id: 'bot_maia_2000', name: 'Maia 2000', elo: 2000, depth: 4, skillLevel: 15, moveTimeMs: 1000,
    category: 'advanced', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🧙', avatarColor: 'bg-purple-600', avatarInitials: 'M8', colorClass: 'purple',
    quote: 'A mistake from you is all I need.',
    description: 'Simulates a human player around 2000 ELO. High precision, aggressive tactics, and deep human plans.',
  },
  {
    id: 'bot_maia_2200', name: 'Maia 2200', elo: 2200, depth: 5, skillLevel: 17, moveTimeMs: 1300,
    category: 'advanced', style: 'Human-like', engine: 'maia',
    avatarEmoji: '🦄', avatarColor: 'bg-purple-700', avatarInitials: 'M9', colorClass: 'purple',
    quote: 'Let\'s see how you handle master-level play.',
    description: 'Simulates a human player around 2200 ELO (Candidate Master). Deep calculation, superior endgame technique.',
  },
  {
    id: 'bot_maia_2400', name: 'Maia 2400', elo: 2400, depth: 5, skillLevel: 19, moveTimeMs: 1700,
    category: 'master', style: 'Human-like', engine: 'maia',
    avatarEmoji: '👑', avatarColor: 'bg-fuchsia-800', avatarInitials: 'MX', colorClass: 'fuchsia',
    quote: 'Only near-flawless play can breach my defense.',
    description: 'Simulates a human master at 2400 ELO. Masterful positional squeeze and razor-sharp calculations.',
  },
];
