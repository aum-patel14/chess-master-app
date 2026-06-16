export interface BotConfig {
  id: string;
  name: string;
  elo: number;
  depth: number;
  skillLevel: number;
  moveTimeMs: number;
  description: string;
  avatarInitials: string;
  colorClass: string;
}

export const BOTS: BotConfig[] = [
  { 
    id: 'bot_1', name: 'Level 1', elo: 400, depth: 1, skillLevel: 1, moveTimeMs: 80,
    description: 'True beginner. Makes completely random blunders constantly.',        
    avatarInitials: 'L1', colorClass: 'slate' 
  },
  { 
    id: 'bot_2', name: 'Level 2', elo: 500, depth: 1, skillLevel: 2, moveTimeMs: 120,
    description: 'Still learning. High chance of dropping pieces.',            
    avatarInitials: 'L2', colorClass: 'gray' 
  },
  { 
    id: 'bot_3', name: 'Level 3', elo: 650, depth: 1, skillLevel: 3, moveTimeMs: 170,
    description: 'Avoids some blunders but misses obvious tactics.',           
    avatarInitials: 'L3', colorClass: 'zinc' 
  },
  { 
    id: 'bot_4', name: 'Level 4', elo: 800, depth: 2, skillLevel: 4, moveTimeMs: 230,
    description: 'Can see one move ahead. Makes poor decisions under pressure.',          
    avatarInitials: 'L4', colorClass: 'neutral' 
  },
  { 
    id: 'bot_5', name: 'Level 5', elo: 950, depth: 2, skillLevel: 5, moveTimeMs: 300,
    description: 'Knows basic strategy, but occasionally falls for simple traps.',               
    avatarInitials: 'L5', colorClass: 'stone' 
  },
  { 
    id: 'bot_6', name: 'Level 6', elo: 1100, depth: 2, skillLevel: 6, moveTimeMs: 380,
    description: 'Decent casual player. Rarely blunders full pieces for nothing.',                  
    avatarInitials: 'L6', colorClass: 'red' 
  },
  { 
    id: 'bot_7', name: 'Level 7', elo: 1250, depth: 3, skillLevel: 7, moveTimeMs: 470,
    description: 'Intermediate club player. Punishes your obvious mistakes.',             
    avatarInitials: 'L7', colorClass: 'orange' 
  },
  { 
    id: 'bot_8', name: 'Level 8', elo: 1400, depth: 3, skillLevel: 8, moveTimeMs: 560,
    description: 'Solid fundamentals. Makes occasional positional errors.',           
    avatarInitials: 'L8', colorClass: 'amber' 
  },
  { 
    id: 'bot_9', name: 'Level 9', elo: 1550, depth: 3, skillLevel: 9, moveTimeMs: 660,
    description: 'Understands basic endgames and typical tactical motifs.',           
    avatarInitials: 'L9', colorClass: 'yellow' 
  },
  { 
    id: 'bot_10', name: 'Level 10', elo: 1700, depth: 4, skillLevel: 10, moveTimeMs: 770,
    description: 'Strong intermediate. Needs precision to break their defense.',           
    avatarInitials: 'L10', colorClass: 'lime' 
  },
  { 
    id: 'bot_11', name: 'Level 11', elo: 1850, depth: 4, skillLevel: 11, moveTimeMs: 900,
    description: 'Advanced player. Sees deep tactical sequences.',           
    avatarInitials: 'L11', colorClass: 'green' 
  },
  { 
    id: 'bot_12', name: 'Level 12', elo: 2000, depth: 4, skillLevel: 12, moveTimeMs: 1050,
    description: 'Candidate Master level. Plays highly accurate, solid chess.',           
    avatarInitials: 'L12', colorClass: 'emerald' 
  },
  { 
    id: 'bot_13', name: 'Level 13', elo: 2150, depth: 4, skillLevel: 13, moveTimeMs: 1200,
    description: 'Expert level. Understands complex positional concepts.',           
    avatarInitials: 'L13', colorClass: 'teal' 
  },
  { 
    id: 'bot_14', name: 'Level 14', elo: 2300, depth: 5, skillLevel: 14, moveTimeMs: 1350,
    description: 'FIDE Master strength. Extremely tough to beat.',           
    avatarInitials: 'L14', colorClass: 'cyan' 
  },
  { 
    id: 'bot_15', name: 'Level 15', elo: 2450, depth: 5, skillLevel: 15, moveTimeMs: 1500,
    description: 'International Master strength. Ruthlessly sharp.',           
    avatarInitials: 'L15', colorClass: 'sky' 
  },
  { 
    id: 'bot_16', name: 'Level 16', elo: 2600, depth: 5, skillLevel: 16, moveTimeMs: 1700,
    description: 'Grandmaster level. Almost perfect play with zero noise.',           
    avatarInitials: 'L16', colorClass: 'blue' 
  },
];
