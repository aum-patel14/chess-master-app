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
  Shield,
  Globe,
  ChevronRight,
  Star,
  ArrowRight,
} from 'lucide-react'

/* ── Animated chess board ── */
const INITIAL_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R'

const PIECE_UNICODE: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

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
    <div className="grid grid-cols-8 rounded-xl overflow-hidden shadow-2xl shadow-purple-500/20 border border-slate-700/50 w-full max-w-[420px] aspect-square">
      {grid.flatMap((row, rIdx) =>
        row.map((piece, cIdx) => {
          const idx = rIdx * 8 + cIdx
          const isLight = (rIdx + cIdx) % 2 === 0
          const isHighlighted = highlightedSquare === idx
          return (
            <div
              key={idx}
              className={`aspect-square flex items-center justify-center text-2xl sm:text-3xl select-none transition-all duration-500 ${
                isHighlighted
                  ? 'bg-purple-500/40 ring-1 ring-purple-400/60 ring-inset'
                  : isLight
                    ? 'bg-amber-100/90'
                    : 'bg-emerald-800/80'
              }`}
            >
              {piece && (
                <span
                  className={`drop-shadow-md transition-transform duration-300 ${isHighlighted ? 'scale-110' : ''}`}
                >
                  {PIECE_UNICODE[piece]}
                </span>
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
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    {
      icon: Users,
      title: 'Online Multiplayer',
      description:
        'Real-time matchmaking, custom lobbies with room codes, live clocks, draw offers, and reconnection recovery.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Layers,
      title: 'Tactical Puzzles',
      description:
        'Daily puzzles, rated training, and streak challenges — all drawn from thousands of curated positions.',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      icon: BookOpen,
      title: 'Interactive Courses',
      description:
        'Learn openings, endgames, and middlegame strategy with step-by-step interactive lessons.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Award,
      title: 'Tournaments',
      description:
        'Compete in Arena and Swiss-format tournaments. Climb the leaderboard and earn titles.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: Shield,
      title: 'Track Progress',
      description:
        'ELO ratings, puzzle streaks, win/loss stats, and achievement badges — all tracked automatically.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      <DocumentTitle title="Chessmaster Pro — Play Chess Online" />

      {/* ─── NAVIGATION BAR ─── */}
      <header className="fixed top-0 w-full z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-bold tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
            data-testid="landing-logo"
          >
            <span>♚ CHESSMASTER PRO</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#testimonials"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Players
            </a>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-purple-600/20 transition-all hover:shadow-purple-500/30"
              data-testid="landing-cta-nav"
            >
              Play Now
            </Link>
          </nav>
          <Link
            to="/dashboard"
            className="md:hidden px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-all"
            data-testid="landing-cta-nav-mobile"
          >
            Play Now
          </Link>
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — Text content */}
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-semibold text-purple-300">
              <Globe className="w-3.5 h-3.5" />
              <span>Free to Play • No Sign-Up Required</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Play Chess Online
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Like Never Before
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Challenge AI bots, compete in real-time multiplayer, solve tactical puzzles, and track
              your improvement — all in one beautifully crafted chess platform.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-start gap-8 sm:gap-12">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  <AnimatedCounter target={25000} suffix="+" />
                </p>
                <p className="text-xs text-slate-500 mt-1">Games Today</p>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  <AnimatedCounter target={4200} suffix="+" />
                </p>
                <p className="text-xs text-slate-500 mt-1">Playing Now</p>
              </div>
              <div className="w-px h-10 bg-slate-800" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  <AnimatedCounter target={10000} suffix="+" />
                </p>
                <p className="text-xs text-slate-500 mt-1">Puzzles</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/dashboard"
                data-testid="landing-cta-hero"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-lg font-bold rounded-xl shadow-xl shadow-purple-600/25 transition-all hover:shadow-purple-500/40 hover:-translate-y-0.5"
              >
                <PlayCircle className="w-5 h-5" />
                Play Now — It's Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/puzzles"
                data-testid="landing-cta-puzzles"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-lg font-medium rounded-xl border border-slate-700/50 transition-all hover:-translate-y-0.5"
              >
                <Layers className="w-5 h-5 text-purple-400" />
                Solve Puzzles
              </Link>
            </div>
          </div>

          {/* Right — Animated Chess Board */}
          <div className="flex-shrink-0 w-full max-w-[420px]">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/20 via-transparent to-blue-600/20 rounded-2xl blur-xl pointer-events-none" />
              <AnimatedBoard />
            </div>
          </div>
        </div>
      </section>

      {/* ─── GAME MODES QUICK ACCESS ─── */}
      <section className="py-16 border-y border-slate-800/50 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Zap,
                label: 'Quick Play',
                desc: 'Jump into a game instantly',
                to: '/play',
                color: 'from-emerald-600 to-emerald-500',
              },
              {
                icon: Users,
                label: 'Play Online',
                desc: 'Challenge real players',
                to: '/play/online',
                color: 'from-blue-600 to-blue-500',
              },
              {
                icon: Layers,
                label: 'Daily Puzzle',
                desc: 'Sharpen your tactics',
                to: '/puzzles',
                color: 'from-purple-600 to-purple-500',
              },
              {
                icon: Award,
                label: 'Tournaments',
                desc: 'Compete for titles',
                to: '/tournaments',
                color: 'from-amber-600 to-amber-500',
              },
            ].map((mode) => {
              const Icon = mode.icon
              return (
                <Link
                  key={mode.label}
                  to={mode.to}
                  data-testid={`landing-mode-${mode.label.toLowerCase().replace(/\s/g, '-')}`}
                  className="group flex items-center gap-4 p-5 bg-slate-900/50 border border-slate-800/60 rounded-xl hover:border-slate-700 hover:bg-slate-800/40 transition-all"
                >
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${mode.color} text-white shadow-lg group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{mode.label}</p>
                    <p className="text-xs text-slate-500">{mode.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Master Chess
              </span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              From your first move to your first tournament victory — we've built every tool you'll
              ever need, polished to perfection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className={`group p-6 rounded-2xl border ${feat.bg} hover:scale-[1.02] transition-all duration-300 hover:shadow-lg`}
                >
                  <div
                    className={`inline-flex p-3 rounded-xl bg-slate-950/50 ${feat.color} mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── HERO IMAGE BREAK ─── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/30 via-slate-950 to-blue-950/30 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Play Anywhere,
              <br />
              <span className="text-purple-400">Anytime</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Whether you have 30 seconds for a puzzle or an hour for a rated game, Chessmaster Pro
              adapts to your schedule. Runs beautifully in your browser — no downloads needed.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Instant Load', 'Mobile Friendly', 'No Downloads', 'Free Forever'].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}hero-landing.png`}
              alt="Chessmaster Pro"
              className="w-full max-w-md rounded-2xl shadow-2xl shadow-purple-500/10 border border-slate-800/50"
            />
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="py-24 bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Loved by{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Chess Players
              </span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Join thousands of players who've already improved their game.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 bg-slate-900/50 border border-slate-800/60 rounded-2xl space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                  <span className="font-semibold text-white text-sm">{t.name}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded font-mono">
                    ELO {t.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to Make Your Move?
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Jump in, play your first game, and see why thousands of chess players choose Chessmaster
            Pro every day.
          </p>
          <Link
            to="/dashboard"
            data-testid="landing-cta-bottom"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-purple-600/30 transition-all hover:shadow-purple-500/40 hover:-translate-y-1"
          >
            <PlayCircle className="w-6 h-6" />
            Start Playing Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-800/50 py-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="text-purple-400 font-bold">♚</span>
            <span>© 2026 Chessmaster Pro. All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
