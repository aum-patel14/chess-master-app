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
  // backward compat
  avatarInitials: string;
  colorClass: string;
}

export const BOTS: BotConfig[] = [
  // BEGINNER (4 bots)
  {
    id: 'bot_rookie', name: 'Rookie Rob', elo: 325, depth: 1, skillLevel: 1, moveTimeMs: 80,
    category: 'beginner', style: 'Chaotic',
    avatarEmoji: '🐣', avatarColor: 'bg-yellow-500', avatarInitials: 'RR', colorClass: 'yellow',
    quote: 'Chess? I thought this was checkers!',
    description: 'Completely new to chess. Moves pieces randomly, often hangs everything. Great for absolute beginners.',
  },
  {
    id: 'bot_andy', name: 'Anxious Andy', elo: 500, depth: 1, skillLevel: 2, moveTimeMs: 120,
    category: 'beginner', style: 'Nervous',
    avatarEmoji: '😰', avatarColor: 'bg-blue-400', avatarInitials: 'AA', colorClass: 'blue',
    quote: 'Wait, can the knight do that? Oh no.',
    description: 'Knows the basic rules but panics under pressure. Drops pieces frequently.',
  },
  {
    id: 'bot_pablo', name: 'Pawn Pablo', elo: 700, depth: 1, skillLevel: 3, moveTimeMs: 170,
    category: 'beginner', style: 'Pawn Pusher',
    avatarEmoji: '♟️', avatarColor: 'bg-green-500', avatarInitials: 'PP', colorClass: 'green',
    quote: 'My pawns will crush you. Eventually.',
    description: 'Loves advancing pawns but forgets about pieces. Predictable but improving.',
  },
  {
    id: 'bot_clueless', name: 'Clueless Carl', elo: 850, depth: 2, skillLevel: 4, moveTimeMs: 230,
    category: 'beginner', style: 'Random',
    avatarEmoji: '🤷', avatarColor: 'bg-orange-400', avatarInitials: 'CC', colorClass: 'orange',
    quote: 'I had a plan. I forgot it.',
    description: 'Can see one move ahead on a good day. Often walks into obvious traps.',
  },

  // INTERMEDIATE (6 bots)
  {
    id: 'bot_tactical_tina', name: 'Tactical Tina', elo: 1000, depth: 2, skillLevel: 5, moveTimeMs: 300,
    category: 'intermediate', style: 'Tactical',
    avatarEmoji: '⚔️', avatarColor: 'bg-red-500', avatarInitials: 'TT', colorClass: 'red',
    quote: 'I see your fork coming. Do you?',
    description: 'Starts spotting tactics like forks and pins. Will punish basic mistakes.',
  },
  {
    id: 'bot_solid_sam', name: 'Solid Sam', elo: 1150, depth: 2, skillLevel: 6, moveTimeMs: 380,
    category: 'intermediate', style: 'Solid',
    avatarEmoji: '🧱', avatarColor: 'bg-stone-500', avatarInitials: 'SS', colorClass: 'stone',
    quote: 'Boring wins games. Ask me how.',
    description: 'Plays safe, solid moves. Hard to beat outright but rarely creates threats.',
  },
  {
    id: 'bot_opening_olivia', name: 'Opening Olivia', elo: 1300, depth: 3, skillLevel: 7, moveTimeMs: 470,
    category: 'intermediate', style: 'Opening Expert',
    avatarEmoji: '📚', avatarColor: 'bg-purple-500', avatarInitials: 'OO', colorClass: 'purple',
    quote: 'e4 is objectively best. Fight me.',
    description: 'Has memorized opening theory but struggles in the middlegame. Dangerous early.',
  },
  {
    id: 'bot_counter_carlos', name: 'Counter Carlos', elo: 1450, depth: 3, skillLevel: 8, moveTimeMs: 560,
    category: 'intermediate', style: 'Counter-attacker',
    avatarEmoji: '🥊', avatarColor: 'bg-pink-500', avatarInitials: 'CC2', colorClass: 'pink',
    quote: 'You attack, I counter. Simple.',
    description: 'Lets you attack and then punishes overextension. Patient and dangerous.',
  },
  {
    id: 'bot_endgame_emma', name: 'Endgame Emma', elo: 1600, depth: 3, skillLevel: 9, moveTimeMs: 660,
    category: 'intermediate', style: 'Endgame Specialist',
    avatarEmoji: '👑', avatarColor: 'bg-amber-500', avatarInitials: 'EE', colorClass: 'amber',
    quote: 'Survive to the endgame. That is when I win.',
    description: 'Plays simple moves to reach endgames where technical skill dominates.',
  },
  {
    id: 'bot_trapper_tom', name: 'Trapper Tom', elo: 1750, depth: 4, skillLevel: 10, moveTimeMs: 770,
    category: 'intermediate', style: 'Tricky',
    avatarEmoji: '🦊', avatarColor: 'bg-orange-600', avatarInitials: 'TR', colorClass: 'orange',
    quote: 'It is not a blunder if it is a trap.',
    description: 'Sets clever traps and gambits. Unpredictable. Dangerous if you stop paying attention.',
  },

  // ADVANCED (4 bots)
  {
    id: 'bot_positional_pete', name: 'Positional Pete', elo: 1900, depth: 4, skillLevel: 11, moveTimeMs: 900,
    category: 'advanced', style: 'Positional',
    avatarEmoji: '🎯', avatarColor: 'bg-teal-500', avatarInitials: 'PP2', colorClass: 'teal',
    quote: 'Good pieces beat good moves.',
    description: 'Masters positional chess — outposts, weak squares, pawn structure. Hard to escape.',
  },
  {
    id: 'bot_berserker_boris', name: 'Berserker Boris', elo: 2050, depth: 4, skillLevel: 12, moveTimeMs: 1050,
    category: 'advanced', style: 'Ultra-Aggressive',
    avatarEmoji: '💥', avatarColor: 'bg-red-700', avatarInitials: 'BB', colorClass: 'red',
    quote: 'ATTACK. ALWAYS ATTACK.',
    description: 'Sacrifices pieces for wild attacking play. Not always correct but extremely dangerous.',
  },
  {
    id: 'bot_precise_priya', name: 'Precise Priya', elo: 2200, depth: 4, skillLevel: 13, moveTimeMs: 1200,
    category: 'advanced', style: 'Accurate',
    avatarEmoji: '🔬', avatarColor: 'bg-cyan-600', avatarInitials: 'PR', colorClass: 'cyan',
    quote: 'Every move has a reason. Do you know yours?',
    description: 'Plays with computer-like precision. Rarely blunders, exploits every inaccuracy.',
  },
  {
    id: 'bot_shark_sven', name: 'Shark Sven', elo: 2350, depth: 5, skillLevel: 14, moveTimeMs: 1350,
    category: 'advanced', style: 'Ruthless',
    avatarEmoji: '🦈', avatarColor: 'bg-blue-700', avatarInitials: 'SV', colorClass: 'blue',
    quote: 'I smell blood in the water.',
    description: 'Immediately capitalizes on any weakness. Extremely difficult to hold draws against.',
  },

  // MASTER (2 bots)
  {
    id: 'bot_gm_viktor', name: 'GM Viktor', elo: 2500, depth: 5, skillLevel: 15, moveTimeMs: 1500,
    category: 'master', style: 'Grandmaster',
    avatarEmoji: '🏆', avatarColor: 'bg-yellow-600', avatarInitials: 'GV', colorClass: 'yellow',
    quote: 'I have forgotten more chess than you know.',
    description: 'Grandmaster-strength play. Deep calculation, superior endgame technique. Very few can win.',
  },
  {
    id: 'bot_magnus_mode', name: 'The Machine', elo: 2800, depth: 5, skillLevel: 16, moveTimeMs: 2000,
    category: 'master', style: 'Perfect',
    avatarEmoji: '🤖', avatarColor: 'bg-gray-800', avatarInitials: 'MM', colorClass: 'gray',
    quote: 'Resistance is futile. I calculated your defeat 12 moves ago.',
    description: 'Near-perfect play with zero noise. Maximum engine strength. Can you even draw?',
  },
];
