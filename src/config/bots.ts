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
    id: 'rookie',       
    name: 'Rookie',       
    elo: 400,  
    depth: 1,  
    skillLevel: 0,  
    moveTimeMs: 300,  
    description: 'Just learning the rules. Makes random blunders.',        
    avatarInitials: 'RK', 
    colorClass: 'gray' 
  },
  { 
    id: 'beginner',     
    name: 'Beginner',     
    elo: 650,  
    depth: 1,  
    skillLevel: 3,  
    moveTimeMs: 500,  
    description: 'Avoids obvious blunders but misses tactics.',            
    avatarInitials: 'BG', 
    colorClass: 'teal' 
  },
  { 
    id: 'casual',       
    name: 'Casual',       
    elo: 900,  
    depth: 3,  
    skillLevel: 6,  
    moveTimeMs: 800,  
    description: 'Knows basic strategy, still falls for forks.',           
    avatarInitials: 'CS', 
    colorClass: 'blue' 
  },
  { 
    id: 'club',         
    name: 'Club Player',  
    elo: 1200, 
    depth: 5,  
    skillLevel: 10, 
    moveTimeMs: 1200, 
    description: 'Plays solid moves. Punishes obvious mistakes.',          
    avatarInitials: 'CP', 
    colorClass: 'purple' 
  },
  { 
    id: 'intermediate', 
    name: 'Intermediate', 
    elo: 1500, 
    depth: 8,  
    skillLevel: 13, 
    moveTimeMs: 1500, 
    description: 'Understands tactics and basic endgames.',               
    avatarInitials: 'IM', 
    colorClass: 'amber' 
  },
  { 
    id: 'advanced',     
    name: 'Advanced',     
    elo: 1800, 
    depth: 10, 
    skillLevel: 16, 
    moveTimeMs: 2000, 
    description: 'Plans ahead. Strong positional play.',                  
    avatarInitials: 'AV', 
    colorClass: 'coral' 
  },
  { 
    id: 'expert',       
    name: 'Expert',       
    elo: 2100, 
    depth: 12, 
    skillLevel: 18, 
    moveTimeMs: 2500, 
    description: 'Near master level. Rarely makes mistakes.',             
    avatarInitials: 'EX', 
    colorClass: 'pink' 
  },
  { 
    id: 'master',       
    name: 'Master',       
    elo: 2400, 
    depth: 15, 
    skillLevel: 20, 
    moveTimeMs: 3000, 
    description: 'Full Stockfish strength. Almost unbeatable.',           
    avatarInitials: 'GM', 
    colorClass: 'red' 
  },
];
