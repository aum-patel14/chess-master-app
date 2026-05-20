export const DEMO_PLAYERS = [
  { rank:1, name:"Magnus_AI",      rating:2847, wins:142, losses:12, draws:31, streak:+8, country:"NO", games:185 },
  { rank:2, name:"QueenGambit99",  rating:2741, wins:118, losses:24, draws:22, streak:+5, country:"US", games:164 },
  { rank:3, name:"KnightRider_X",  rating:2698, wins:101, losses:31, draws:18, streak:+3, country:"IN", games:150 },
  { rank:4, name:"Aum_Patel",      rating:2510, wins:89,  losses:40, draws:14, streak:+1, country:"IN", games:143 },
  { rank:5, name:"SicilianDragon", rating:2488, wins:76,  losses:48, draws:20, streak:-2, country:"RU", games:144 },
  { rank:6, name:"EndgameKing",    rating:2401, wins:65,  losses:55, draws:10, streak:0,  country:"DE", games:130 },
  { rank:7, name:"BishopPair",     rating:2378, wins:60,  losses:58, draws:12, streak:-1, country:"FR", games:130 },
  { rank:8, name:"Zugzwang_Fan",   rating:2290, wins:54,  losses:62, draws:8,  streak:+2, country:"GB", games:124 },
];

export const DEMO_GAMES = [
  { id:1, opponent:{name:"Magnus_AI",rating:2847},     result:"loss", myColor:"white", moves:42, date:"2025-05-14", opening:"Sicilian Defence · Najdorf",  accuracy:{me:87,opp:94}, timeControl:"5+3",  duration:"18m" },
  { id:2, opponent:{name:"QueenGambit99",rating:2741},  result:"win",  myColor:"black", moves:31, date:"2025-05-13", opening:"Queen's Gambit Accepted",      accuracy:{me:91,opp:83}, timeControl:"10+0", duration:"12m" },
  { id:3, opponent:{name:"KnightRider_X",rating:2698},  result:"draw", myColor:"white", moves:58, date:"2025-05-12", opening:"Ruy Lopez · Berlin",           accuracy:{me:94,opp:95}, timeControl:"15+10",duration:"28m" },
  { id:4, opponent:{name:"BishopPair",rating:2378},     result:"win",  myColor:"white", moves:27, date:"2025-05-11", opening:"Italian Game",                 accuracy:{me:89,opp:76}, timeControl:"3+2",  duration:"10m" },
  { id:5, opponent:{name:"SicilianDragon",rating:2488}, result:"win",  myColor:"black", moves:35, date:"2025-05-10", opening:"French Defence · Winawer",     accuracy:{me:78,opp:71}, timeControl:"5+0",  duration:"15m" },
  { id:6, opponent:{name:"EndgameKing",rating:2401},    result:"loss", myColor:"white", moves:62, date:"2025-05-09", opening:"King's Indian Defence",        accuracy:{me:82,opp:88}, timeControl:"30+0", duration:"32m" },
  { id:7, opponent:{name:"Zugzwang_Fan",rating:2290},   result:"win",  myColor:"black", moves:44, date:"2025-05-08", opening:"Caro-Kann Defence",            accuracy:{me:93,opp:80}, timeControl:"10+5", duration:"20m" },
  { id:8, opponent:{name:"AnonymousBot",rating:1200},   result:"win",  myColor:"white", moves:19, date:"2025-05-07", opening:"Scholar's Mate Defense",       accuracy:{me:99,opp:55}, timeControl:"1+0",  duration:"4m"  },
];
