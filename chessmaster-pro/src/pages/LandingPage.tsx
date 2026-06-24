import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import {
  PlayCircle,
  Layers,
  BookOpen,
  Award,
  Users,
  Zap,
  Star,
  ArrowRight,
  Shield,
  Trophy,
} from 'lucide-react'

/* ── Animated chess board ── */
const INITIAL_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R'

function fenToGrid(fen: string): string[][] {
  return fen
    .split(' ')[0]
    .split('/')
    .map((row) => {
      const cells: string[] = []
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let i = 0; i < parseInt(ch); i++) cells.push('')
        } else {
          cells.push(ch)
        }
      }
      return cells
    })
}

function AnimatedBoard() {
  const grid = fenToGrid(INITIAL_FEN)
  const [highlightedSquare, setHighlightedSquare] = useState<number | null>(null)

  useEffect(() => {
    const HIGHLIGHTS = [52, 34, 21, 45, 62, 28, 12, 57]
    let idx = 0
    const interval = setInterval(() => {
      setHighlightedSquare(HIGHLIGHTS[idx % HIGHLIGHTS.length])
      idx++
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-8 rounded-xl overflow-hidden shadow-2xl border border-[#3c3a37] w-full max-w-[420px] aspect-square bg-[#211f1d]">
      {grid.flatMap((row, rIdx) =>
        row.map((piece, cIdx) => {
          const idx = rIdx * 8 + cIdx
          const isLight = (rIdx + cIdx) % 2 === 0
          const isHighlighted = highlightedSquare === idx
          return (
            <div
              key={idx}
              className={`aspect-square flex items-center justify-center relative select-none transition-all duration-500 ${
                isHighlighted
                  ? 'bg-yellow-400/35 ring-2 ring-yellow-400 ring-inset'
                  : isLight
                    ? 'bg-board-light'
                    : 'bg-board-dark'
              }`}
            >
              {piece && (
                <img
                  src={`${import.meta.env.BASE_URL}pieces/cburnett/${piece === piece.toUpperCase() ? 'w' : 'b'}${piece.toUpperCase()}.svg`}
                  alt={piece}
                  className="w-[85%] h-[85%] object-contain drop-shadow-md"
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

/* ── Animated stat counter ── */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 2000
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target])

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ── Main Landing Page ── */
export function LandingPage() {
  const features = [
    {
      icon: Zap,
      title: 'Play vs AI',
      description:
        'Challenge five difficulty tiers powered by Stockfish — from friendly beginner games to brutal engine-level play.',
      color: 'text-yellow-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
    {
      icon: Users,
      title: 'Online Multiplayer',
      description:
        'Real-time matchmaking, custom lobbies with room codes, live clocks, draw offers, and reconnection recovery.',
      color: 'text-blue-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
    {
      icon: Layers,
      title: 'Tactical Puzzles',
      description:
        'Daily puzzles, rated training, and streak challenges — all drawn from thousands of curated positions.',
      color: 'text-purple-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
    {
      icon: BookOpen,
      title: 'Interactive Courses',
      description:
        'Learn openings, endgames, and middlegame strategy with step-by-step interactive lessons.',
      color: 'text-emerald-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
    {
      icon: Award,
      title: 'Tournaments',
      description:
        'Compete in Arena and Swiss-format tournaments. Climb the leaderboard and earn titles.',
      color: 'text-amber-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
    {
      icon: Shield,
      title: 'Track Progress',
      description:
        'ELO ratings, puzzle streaks, win/loss stats, and achievement badges — all tracked automatically.',
      color: 'text-rose-400',
      bg: 'bg-[#262421] border-[#3c3a37]',
    },
  ]

  const testimonials = [
    {
      name: 'Alex K.',
      rating: '1850',
      text: 'The puzzle system really sharpened my tactics. My blitz rating went up 200 points in two months.',
    },
    {
      name: 'Sarah M.',
      rating: '1420',
      text: 'Beautiful interface and smooth gameplay. The AI bots are perfect for practicing specific openings.',
    },
    {
      name: 'Raj P.',
      rating: '2100',
      text: 'Finally a chess app that feels premium. The multiplayer is lag-free and the reconnection handling is excellent.',
    },
  ]

  return (
    <div className="min-h-screen bg-chess-bg text-slate-100 font-sans overflow-x-hidden">
      <DocumentTitle
        title="Chessmaster Pro — Play Chess Online"
        description="Play chess online against powerful Stockfish AI bots, solve interactive puzzles, learn chess fundamentals, compete in matchmaking, and join tournaments."
      />

      {/* ─── NAVIGATION BAR ─── */}
      <header className="fixed top-0 w-full z-50 border-b border-[#3c3a37]/50 bg-chess-dark/95 backdrop-blur-xl shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-black tracking-wider text-white hover:text-chess-green transition-colors"
            data-testid="landing-logo"
          >
            <span className="text-2xl text-chess-green">♚</span>
            <span>CHESSMASTER PRO</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm font-bold text-[#bababa] hover:text-white transition-colors">
              Features
            </a>
            <a href="#testimonials" className="text-sm font-bold text-[#bababa] hover:text-white transition-colors">
              Players
            </a>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 chess-btn-green rounded-lg text-sm transition-all"
              data-testid="landing-cta-nav"
            >
              Play Now
            </Link>
          </nav>
          <Link
            to="/dashboard"
            className="md:hidden px-4 py-2 chess-btn-green rounded-lg text-sm transition-all"
            data-testid="landing-cta-nav-mobile"
          >
            Play Now
          </Link>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — Text content */}
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.08] text-white">
              Play Chess Online
              <br />
              <span className="text-chess-green">on the #1 Site!</span>
            </h1>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 sm:gap-12 py-2">
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">
                  <AnimatedCounter target={25000} suffix="+" />
                </p>
                <p className="text-xs text-[#bababa] mt-0.5 font-bold uppercase tracking-wider">Games Today</p>
              </div>
              <div className="w-px h-10 bg-[#3c3a37]" />
              <div className="text-center lg:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">
                  <AnimatedCounter target={2300} suffix="+" />
                </p>
                <p className="text-xs text-[#bababa] mt-0.5 font-bold uppercase tracking-wider">Playing Now</p>
              </div>
            </div>

            {/* Flat chunky 3D buttons */}
            <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0">
              <Link
                to="/dashboard"
                data-testid="landing-cta-hero"
                className="chess-btn-green w-full flex flex-col items-center justify-center py-4 px-6 rounded-xl text-center shadow-lg"
              >
                <div className="flex items-center gap-2 text-xl font-black">
                  <PlayCircle className="w-6 h-6" />
                  <span>Quick Play</span>
                </div>
                <span className="text-xs text-white/90 font-medium mt-1">
                  Jump into a game against a bot instantly
                </span>
              </Link>
              
              <Link
                to="/play"
                data-testid="landing-cta-puzzles"
                className="chess-btn-grey w-full flex flex-col items-center justify-center py-4 px-6 rounded-xl text-center shadow-lg"
              >
                <div className="flex items-center gap-2 text-xl font-black text-white">
                  <Trophy className="w-6 h-6 text-chess-green" />
                  <span>Play vs Computer</span>
                </div>
                <span className="text-xs text-[#bababa] font-medium mt-1">
                  Challenge custom bots or full Stockfish
                </span>
              </Link>
            </div>
          </div>

          {/* Right — Animated Chess Board */}
          <div className="flex-shrink-0 w-full max-w-[420px] flex justify-center">
            <div className="relative p-2 bg-chess-dark rounded-2xl shadow-2xl border border-[#3c3a37]">
              <AnimatedBoard />
            </div>
          </div>
        </div>
      </section>

      {/* ─── GAME MODES QUICK ACCESS ─── */}
      <section className="py-12 border-y border-[#3c3a37]/50 bg-chess-dark/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Zap,
                label: 'Quick Play',
                desc: 'Jump into a game instantly',
                to: '/play',
              },
              {
                icon: Users,
                label: 'Play Online',
                desc: 'Challenge real players',
                to: '/play/online',
              },
              {
                icon: Layers,
                label: 'Daily Puzzle',
                desc: 'Sharpen your tactics',
                to: '/puzzles',
              },
              {
                icon: Award,
                label: 'Tournaments',
                desc: 'Compete for titles',
                to: '/tournaments',
              },
            ].map((mode) => {
              const Icon = mode.icon
              return (
                <Link
                  key={mode.label}
                  to={mode.to}
                  data-testid={`landing-mode-${mode.label.toLowerCase().replace(/\s/g, '-')}`}
                  className="group flex items-center gap-4 p-5 bg-chess-dark border border-[#3c3a37] rounded-xl hover:border-chess-green/50 hover:bg-[#3c3a37]/30 transition-all duration-150"
                >
                  <div className="p-3 rounded-lg bg-[#3c3a37] text-chess-green shadow group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{mode.label}</p>
                    <p className="text-xs text-[#bababa]">{mode.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#bababa] group-hover:text-chess-green group-hover:translate-x-1 transition-all" />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── CHESS.COM GRID CARD LAYOUT ─── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Tactics', lessons: '1,240 lessons', desc: 'Sharpen your pattern recognition with interactive setup drills.' },
            { title: 'Endgames', lessons: '890 lessons', desc: 'Master essential checkmate techniques and pawn conversion.' },
            { title: 'Openings', lessons: '2,100 lessons', desc: 'Build a solid opening repertoire with lines for White and Black.' },
            { title: 'Strategy', lessons: '650 lessons', desc: 'Improve positional awareness, pawn structures, and planning.' }
          ].map((item) => (
            <div key={item.title} className="p-5 bg-chess-dark border border-[#3c3a37] rounded-xl hover:border-[#4b4845] transition-all">
              <span className="text-[10px] uppercase font-bold tracking-wider text-chess-green">{item.lessons}</span>
              <h3 className="text-xl font-extrabold text-white mt-1">{item.title}</h3>
              <p className="text-xs text-[#bababa] mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Lessons CTA Card */}
        <div className="p-8 bg-chess-dark border border-[#3c3a37] rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-2xl font-black text-white">Improve Your Game with Lessons</h2>
            <p className="text-sm text-[#bababa] max-w-xl">
              Learn with quick, fun lessons designed for players of all levels. Study under master bots, master positional planning, and play out interactive exercises.
            </p>
          </div>
          <Link
            to="/courses"
            className="chess-btn-grey whitespace-nowrap px-8 py-3.5 rounded-lg text-sm text-center w-full md:w-auto"
          >
            Start a Lesson
          </Link>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="py-20 border-t border-[#3c3a37]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Everything You Need to <span className="text-chess-green">Master Chess</span>
            </h2>
            <p className="text-[#bababa] max-w-2xl mx-auto text-sm leading-relaxed">
              From your first move to your first tournament victory — we've built every tool you'll ever need, polished to perfection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className={`group p-6 rounded-xl border ${feat.bg} hover:border-chess-green/30 transition-all duration-200`}
                >
                  <div className={`inline-flex p-3 rounded-lg bg-[#3c3a37] ${feat.color} mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-[#bababa] leading-relaxed">{feat.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="py-20 border-t border-[#3c3a37]/30 bg-chess-dark/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Loved by <span className="text-chess-green">Chess Players</span>
            </h2>
            <p className="text-[#bababa] max-w-xl mx-auto text-sm">
              Join thousands of players who've already improved their game.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 bg-chess-dark border border-[#3c3a37] rounded-xl space-y-4 hover:border-[#4b4845] transition-all"
              >
                <div className="flex items-center gap-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-[#bababa] text-xs leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center justify-between pt-3 border-t border-[#3c3a37]/50">
                  <span className="font-bold text-white text-sm">{t.name}</span>
                  <span className="text-[10px] bg-[#3c3a37] text-[#bababa] px-2 py-0.5 rounded font-mono font-bold">
                    ELO {t.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 border-t border-[#3c3a37]/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Ready to Make Your Move?
          </h2>
          <p className="text-[#bababa] text-sm max-w-md mx-auto leading-relaxed">
            Jump in, play your first game, and see why thousands of chess players choose Chessmaster Pro every day.
          </p>
          <Link
            to="/dashboard"
            data-testid="landing-cta-bottom"
            className="chess-btn-green inline-flex items-center gap-3 px-8 py-4 rounded-xl shadow-lg"
          >
            <PlayCircle className="w-5 h-5" />
            <span className="text-lg font-black">Start Playing Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[#3c3a37]/50 py-10 bg-chess-darker">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#bababa] text-xs font-semibold">
            <span className="text-chess-green font-bold text-sm">♚</span>
            <span>© 2026 Chessmaster Pro. All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-xs font-bold text-[#bababa]">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
