export const BOTS = [
  {
    id: 'rookie',
    name: 'Rookie Bot',
    elo: 400,
    avatar: '👶',
    bio: 'Just learned how the chess pieces move. Plays entirely at random!',
    skill: 0,
    depth: 0, // indicates random legal moves
    personality: 'Random & Clueless',
    theme: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', // Green
  },
  {
    id: 'beginner',
    name: 'Beginner Bot',
    elo: 600,
    avatar: '🤖',
    bio: 'Familiar with basic rules but misses simple tactical threats. Great for beginners!',
    skill: 2,
    depth: 1,
    personality: 'Eager & Forgetful',
    theme: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', // Green
  },
  {
    id: 'casual',
    name: 'Casual Player',
    elo: 900,
    avatar: '☕',
    bio: 'Plays casual games in the park. Decent, but falls for easy tactics.',
    skill: 5,
    depth: 3,
    personality: 'Chill & Impulsive',
    theme: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
  },
  {
    id: 'club',
    name: 'Club Player',
    elo: 1200,
    avatar: '🧔',
    bio: 'A regular at local chess clubs. Knows standard openings and plays solid moves.',
    skill: 8,
    depth: 5,
    personality: 'Methodical & Cautious',
    theme: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
  },
  {
    id: 'intermediate',
    name: 'Tactician Bot',
    elo: 1500,
    avatar: '🦊',
    bio: 'Enjoys sharp tactical lines and actively searches for forks, pins, and skewers.',
    skill: 12,
    depth: 8,
    personality: 'Aggressive & Tricky',
    theme: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', // Purple
  },
  {
    id: 'advanced',
    name: 'Advanced Bot',
    elo: 1800,
    avatar: '🧙‍♂️',
    bio: 'Calculates several moves ahead and rarely blunders. A very tough opponent.',
    skill: 16,
    depth: 10,
    personality: 'Calculating & Quiet',
    theme: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', // Purple
  },
  {
    id: 'expert',
    name: 'Expert Bot',
    elo: 2100,
    avatar: '🧠',
    bio: 'Mastered positional play and endgames. Punishes mistakes instantly.',
    skill: 18,
    depth: 12,
    personality: 'Positional & Ruthless',
    theme: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', // Orange/Amber
  },
  {
    id: 'master',
    name: 'Master Engine',
    elo: 2400,
    avatar: '👑',
    bio: 'Full Stockfish depth. Plays at grandmaster strength with flawless precision.',
    skill: 20,
    depth: 15,
    personality: 'Grandmaster level',
    theme: 'linear-gradient(135deg, #e2b04a 0%, #b8861b 100%)', // Gold
  },
  {
    id: 'easy_ai',
    name: 'Easy AI',
    elo: 600,
    avatar: '😊',
    bio: 'Depth 2 Stockfish. Plays casual, beginner-level moves.',
    skill: 2,
    depth: 2,
    personality: 'Easy & Helpful',
    theme: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', // Green
  },
  {
    id: 'medium_ai',
    name: 'Medium AI',
    elo: 1200,
    avatar: '🧠',
    bio: 'Depth 6 Stockfish. A decent challenge for regular players.',
    skill: 8,
    depth: 6,
    personality: 'Methodical & Cautious',
    theme: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
  },
  {
    id: 'hard_ai',
    name: 'Hard AI',
    elo: 2000,
    avatar: '🔥',
    bio: 'Depth 12 Stockfish. Ruthless tactical precision.',
    skill: 18,
    depth: 12,
    personality: 'Ruthless & Positional',
    theme: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)', // Orange/Amber
  }
];

export default BOTS;
