export const CHESSCOM_NAV = [
  {
    id: 'play',
    icon: '🎮',
    label: 'Play',
    path: '/play',
    items: [
      {
        icon: '🌐',
        label: 'Play Online',
        desc: 'Real-time multiplayer games',
        path: '/play',
        isSubSection: true,
        subSectionId: 'play-online',
        items: [
          { icon: '🌐', label: 'Play Live', desc: 'Real-time multiplayer matchmaking', path: '/play' },
          { icon: '🏆', label: 'Tournaments', desc: 'Join arena and chess events', path: '/tournaments' },
          { icon: '👥', label: 'Play a Friend', desc: 'Invite friends to a match', path: '/play' }
        ]
      },
      {
        icon: '🤖',
        label: 'Play Bots',
        desc: 'Challenge customized AI levels',
        path: '/game',
        state: { mode: 'ai' },
        isSubSection: true,
        subSectionId: 'play-bots',
        items: [
          { icon: '🤖', label: 'Bot Selector', desc: 'Choose from adaptive AI levels', path: '/game', state: { mode: 'ai' } },
          { icon: '🔥', label: 'Custom Match', desc: 'Customize bot configuration', path: '/game', state: { mode: 'ai' } },
          { icon: '🧠', label: 'Engine Practice', desc: 'Train with Stockfish engine', path: '/game', state: { mode: 'ai' } }
        ]
      },
      {
        icon: '🧩',
        label: 'Puzzles',
        desc: 'Solve tactics, rushes & streaks',
        path: '/puzzles',
        isSubSection: true,
        subSectionId: 'puzzles',
        items: [
          { icon: '🧩', label: 'Puzzles Hub', desc: 'Solve tactics of all levels', path: '/puzzles' },
          { icon: '📅', label: 'Daily Challenge', desc: 'Solve the daily board challenge', path: '/puzzles/daily' },
          { icon: '🔥', label: 'Puzzle Streak', desc: 'Endless tactics solver', path: '/puzzles/streak' },
          { icon: '⚡', label: 'Puzzle Rush', desc: 'Race the clock under pressure', path: '/puzzles', soon: true },
        ]
      },
      {
        icon: '🎓',
        label: 'Learn',
        desc: 'Lessons, openings & endgames',
        path: '/learn',
        isSubSection: true,
        subSectionId: 'learn',
        items: [
          { icon: '📖', label: 'Lessons Hub', desc: 'Interactive chess video courses', path: '/learn' },
          { icon: '📚', label: 'Openings Explorer', desc: 'Explore lines and main theory', path: '/learn' },
          { icon: '♜', label: 'Endgames', desc: 'Master key mating patterns', path: '/learn' },
        ]
      },
      {
        icon: '📺',
        label: 'Watch',
        desc: 'Watch live games & events',
        path: '/watch',
        isSubSection: true,
        subSectionId: 'watch',
        items: [
          { icon: '🔴', label: 'Live Games', desc: 'Spectate ongoing master matches', path: '/watch' },
          { icon: '🏆', label: 'Championships', desc: 'Official tournaments coverage', path: '/tournaments' },
        ]
      }
    ],
  },
  {
    id: 'other',
    icon: '•••',
    label: 'Other',
    path: '/other',
    items: [
      {
        icon: '👥',
        label: 'Community',
        desc: 'Players, clubs & leaderboards',
        path: '/leaderboard',
        isSubSection: true,
        subSectionId: 'community',
        items: [
          { icon: '👥', label: 'Leaderboard', desc: 'Compare rankings against the best', path: '/leaderboard' },
          { icon: '🏛️', label: 'Clubs', desc: 'Join groups and custom events', path: '/community', soon: true },
          { icon: '💬', label: 'Forum', desc: 'Discuss strategy and chess topics', path: '/community', soon: true },
        ]
      },
      {
        icon: '🛠️',
        label: 'Tools',
        desc: 'Generate FEN diagrams and setups',
        path: '/other',
        isSubSection: true,
        subSectionId: 'tools',
        items: [
          { icon: '🛠️', label: 'Analysis Board', desc: 'Analyze positions and games', path: '/other' },
          { icon: '📋', label: 'Setup Board', desc: 'Customize chess board setups', path: '/other' },
          { icon: '📚', label: 'Opening Explorer', desc: 'Master initial openings theory', path: '/learn' }
        ]
      },
      {
        icon: '🛍️',
        label: 'Shop/Merch',
        desc: 'Get chess boards and pieces designs',
        path: '/shop',
        isSubSection: true,
        subSectionId: 'shop',
        items: [
          { icon: '🛍️', label: 'Chess Sets', desc: 'Unique 3D & 2D piece styles', path: '/shop' },
          { icon: '🎨', label: 'Board Designs', desc: 'Beautiful custom table themes', path: '/shop' },
          { icon: '✨', label: 'Premium Membership', desc: 'Access unlimited features', path: '/shop' }
        ]
      },
      {
        icon: '📋',
        label: 'Rules',
        desc: 'Official chess regulations handbook',
        path: '/other',
        isSubSection: true,
        subSectionId: 'rules',
        items: [
          { icon: '📋', label: 'Basic Rules', desc: 'General gameplay regulations', path: '/other' },
          { icon: '♟️', label: 'Special Moves', desc: 'Castling, en passant & promotion', path: '/other' },
          { icon: '🏁', label: 'Draw Conditions', desc: 'Stalemate & repeat rules', path: '/other' }
        ]
      },
    ],
  },
];

export const LANDING_BOTS = [
  { name: 'Aria', elo: 800, avatar: '😊', difficulty: 1 },
  { name: 'Martin', elo: 1200, avatar: '🧔', difficulty: 2 },
  { name: 'Zara', elo: 1500, avatar: '👩', difficulty: 3 },
  { name: 'Viktor', elo: 1800, avatar: '🧠', difficulty: 4 },
  { name: 'Magnus', elo: 2850, avatar: '👑', difficulty: 5 },
  { name: 'Stockfish', elo: 3500, avatar: '🤖', difficulty: 5 },
];
