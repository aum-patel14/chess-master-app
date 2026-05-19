export const DEMO_PLAYERS = [
  { rank:1, name:"Magnus_AI",      rating:2847, wins:142, losses:12,  draws:31, streak:+8 },
  { rank:2, name:"QueenGambit99",  rating:2741, wins:118, losses:24,  draws:22, streak:+5 },
  { rank:3, name:"KnightRider_X",  rating:2698, wins:101, losses:31,  draws:18, streak:+3 },
  { rank:4, name:"Aum_Patel",      rating:2510, wins:89,  losses:40,  draws:14, streak:+1 },
  { rank:5, name:"SicilianDragon", rating:2488, wins:76,  losses:48,  draws:20, streak:-2 },
  { rank:6, name:"EndgameKing",    rating:2401, wins:65,  losses:55,  draws:10, streak: 0 },
  { rank:7, name:"BishopPair",     rating:2378, wins:60,  losses:58,  draws:12, streak:-1 },
  { rank:8, name:"Zugzwang_Fan",   rating:2290, wins:54,  losses:62,  draws:8,  streak:+2 },
];

export const DEMO_GAMES = [
  { id:1, opponent:"Magnus_AI",      result:"loss", myColor:"white", moves:42, date:"2025-05-14", opening:"Sicilian Defence",    accuracy:87, duration:"18m" },
  { id:2, opponent:"QueenGambit99",  result:"win",  myColor:"black", moves:31, date:"2025-05-13", opening:"Queen's Gambit",      accuracy:91, duration:"12m" },
  { id:3, opponent:"KnightRider_X",  result:"draw", myColor:"white", moves:58, date:"2025-05-12", opening:"Ruy Lopez",           accuracy:94, duration:"28m" },
  { id:4, opponent:"BishopPair",     result:"win",  myColor:"white", moves:27, date:"2025-05-11", opening:"Italian Game",        accuracy:89, duration:"10m" },
  { id:5, opponent:"SicilianDragon", result:"win",  myColor:"black", moves:35, date:"2025-05-10", opening:"French Defence",      accuracy:78, duration:"15m" },
  { id:6, opponent:"EndgameKing",    result:"loss", myColor:"white", moves:62, date:"2025-05-09", opening:"King's Indian",       accuracy:82, duration:"32m" },
  { id:7, opponent:"Zugzwang_Fan",   result:"win",  myColor:"black", moves:44, date:"2025-05-08", opening:"Caro-Kann Defence",   accuracy:93, duration:"20m" },
  { id:8, opponent:"AnonymousBot",   result:"win",  myColor:"white", moves:19, date:"2025-05-07", opening:"Scholar's Mate trap", accuracy:99, duration:"4m"  },
];
