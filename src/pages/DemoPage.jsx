import { useLocation, useNavigate } from 'react-router-dom';
import { Puzzle, BookOpen, Dumbbell, Tv, Users, BarChart2, Trophy, Dice5, History, ChevronRight } from 'lucide-react';

const PAGE_DATA = {
  puzzles: {
    icon: <Puzzle size={48} color="#f97316" />,
    title: 'Chess Puzzles',
    subtitle: 'Sharpen your tactical vision.',
    desc: 'Solve thousands of curated chess puzzles ranging from beginner checkmates to grandmaster tactical sequences. Improve your pattern recognition and rating.',
    features: [
      { title: 'Rated Puzzles', desc: 'Climb the puzzle leaderboard.' },
      { title: 'Puzzle Rush', desc: 'Solve as many as you can in 3 minutes.' },
      { title: 'Daily Puzzle', desc: 'A new challenge every day.' }
    ]
  },
  learn: {
    icon: <BookOpen size={48} color="#0ea5e9" />,
    title: 'Learn Chess',
    subtitle: 'From beginner to master.',
    desc: 'Interactive lessons taught by Grandmasters. Master the opening principles, middlegame strategies, and endgame techniques.',
    features: [
      { title: 'Interactive Lessons', desc: 'Step-by-step interactive board.' },
      { title: 'Opening Explorer', desc: 'Study the most popular openings.' },
      { title: 'Master Games', desc: 'Analyze historical brilliant games.' }
    ]
  },
  train: {
    icon: <Dumbbell size={48} color="#e5e7eb" />,
    title: 'Training Hub',
    subtitle: 'Targeted practice routines.',
    desc: 'Build your repertoire, practice specific endgames against the engine, and analyze your weakest areas with our AI insights.',
    features: [
      { title: 'Endgame Practice', desc: 'Drill essential checkmates.' },
      { title: 'Vision Training', desc: 'Learn board coordinates fast.' },
      { title: 'AI Insights', desc: 'Find leaks in your game.' }
    ]
  },
  watch: {
    icon: <Tv size={48} color="#8b5cf6" />,
    title: 'Watch & Stream',
    subtitle: 'Live events and top players.',
    desc: 'Spectate live games from top grandmasters, follow major international tournaments, and watch your favorite chess streamers.',
    features: [
      { title: 'Top Games', desc: 'Watch GMs play in real-time.' },
      { title: 'Tournaments', desc: 'Live brackets and commentary.' },
      { title: 'Twitch Integration', desc: 'Discover live streamers.' }
    ]
  },
  community: {
    icon: <Users size={48} color="#22c55e" />,
    title: 'Community',
    subtitle: 'Connect with chess lovers.',
    desc: 'Join clubs, participate in forums, find coaches, and read blogs from the global chess community.',
    features: [
      { title: 'Clubs', desc: 'Join groups of like-minded players.' },
      { title: 'Forums', desc: 'Discuss openings and news.' },
      { title: 'Coaches', desc: 'Find a GM or IM to train you.' }
    ]
  },
  stats: {
    icon: <BarChart2 size={48} color="#0ea5e9" />,
    title: 'Your Statistics',
    subtitle: 'Track your chess journey.',
    desc: 'Deep analytics on your performance. View your rating graphs, win/loss records by color, and opening success rates.',
    features: [
      { title: 'Rating Graph', desc: 'Visualize your progress over time.' },
      { title: 'Opening Stats', desc: 'See which openings win you games.' },
      { title: 'Accuracy', desc: 'Average centipawn loss tracking.' }
    ]
  },
  tournaments: {
    icon: <Trophy size={48} color="var(--gold)" />,
    title: 'Tournaments',
    subtitle: 'Compete for glory.',
    desc: 'Join hourly, daily, and weekly tournaments. Participate in Swiss or Arena formats and win digital trophies for your profile.',
    features: [
      { title: 'Arena', desc: 'Fast-paced continuous pairing.' },
      { title: 'Swiss', desc: 'Classic structured rounds.' },
      { title: 'Championships', desc: 'Monthly cash prize events.' }
    ]
  },
  variants: {
    icon: <Dice5 size={48} color="#22c55e" />,
    title: 'Chess Variants',
    subtitle: 'A new twist on the classic game.',
    desc: 'Play fun variants like Chess960, Crazyhouse, King of the Hill, and 3-Check. Great for a casual break from standard chess.',
    features: [
      { title: 'Crazyhouse', desc: 'Drop captured pieces back on board.' },
      { title: 'Chess960', desc: 'Randomized starting positions.' },
      { title: 'Bughouse', desc: '2v2 team chess madness.' }
    ]
  },
  history: {
    icon: <History size={48} color="#facc15" />,
    title: 'Game History',
    subtitle: 'Review your past battles.',
    desc: 'Access your entire archive of played games. Export PGNs, request deep engine analysis, and learn from your past mistakes.',
    features: [
      { title: 'Game Archive', desc: 'Search and filter past games.' },
      { title: 'Deep Analysis', desc: 'Engine evaluation for every move.' },
      { title: 'Export', desc: 'Download PGNs for local study.' }
    ]
  }
};

export default function DemoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine which data to show based on the URL path
  const pathKey = location.pathname.split('/')[1] || 'puzzles';
  const data = PAGE_DATA[pathKey] || PAGE_DATA.puzzles;

  // Further sub-paths just alter the title slightly for realism
  const subPath = location.pathname.split('/')[2];
  let displayTitle = data.title;
  if (subPath) {
    displayTitle += `: ${subPath.charAt(0).toUpperCase() + subPath.slice(1).replace('-', ' ')}`;
  }

  // Dynamic button config for interactive demos
  let btnConfig = {
    text: 'Play a Game Instead',
    action: () => navigate('/play')
  };

  if (pathKey === 'puzzles') {
    btnConfig = {
      text: 'Try a Demo Puzzle',
      action: () => navigate(`/play?mode=puzzle&fen=${encodeURIComponent('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1')}`)
    };
  } else if (pathKey === 'learn') {
    btnConfig = {
      text: 'Start Endgame Lesson',
      action: () => navigate(`/play?mode=lesson&fen=${encodeURIComponent('8/8/8/8/8/8/4k3/4K2R w K - 0 1')}`)
    };
  } else if (pathKey === 'train') {
    btnConfig = {
      text: 'Try AI Training',
      action: () => navigate(`/play?mode=ai&difficulty=1&color=w`)
    };
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      padding: '60px 20px', color: 'var(--text-primary)', minHeight: '100%',
      background: 'var(--bg-base)'
    }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '700px', marginBottom: '60px' }}>
        <div style={{ display: 'inline-flex', padding: '20px', background: 'var(--bg-card)', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          {data.icon}
        </div>
        <h1 style={{ fontFamily: '"Cinzel", serif', fontSize: '42px', marginBottom: '12px', color: 'var(--gold)' }}>
          {displayTitle}
        </h1>
        <h3 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>
          {data.subtitle}
        </h3>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px' }}>
          {data.desc}
        </p>
        <button 
          onClick={btnConfig.action}
          style={{
            padding: '14px 32px', background: 'var(--gold)', color: '#fff', border: 'none',
            borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {btnConfig.text}
        </button>
      </div>

      {/* Feature Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%', maxWidth: '1000px' }}>
        {data.features.map((feat, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '24px', transition: 'all 0.2s', cursor: 'pointer'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--gold)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <h4 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {feat.title}
              <ChevronRight size={18} color="var(--gold)" />
            </h4>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {feat.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '60px', opacity: 0.5, fontSize: '12px', color: 'var(--text-muted)' }}>
        *This is a preview page. The full feature is under development.
      </div>
    </div>
  );
}
