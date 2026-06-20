import { DocumentTitle } from '../components/DocumentTitle'
import { Link } from 'react-router-dom'
import { PlayCircle, Layers, BookOpen, Award, TrendingUp, Users } from 'lucide-react'

export function Dashboard() {
  const stats = [
    { label: 'Rapid Rating', value: '1540', icon: TrendingUp, change: '+12 this week' },
    { label: 'Puzzles Solved', value: '342', icon: Layers, change: '88% accuracy' },
    { label: 'Active Games', value: '3', icon: PlayCircle, change: 'Your turn in 2' },
    { label: 'Tournament Rank', value: '#12', icon: Award, change: 'In active arena' },
  ]

  const features = [
    {
      title: 'Play Live Chess',
      description: 'Challenge other players or practice against advanced engine bots.',
      icon: PlayCircle,
      buttonText: 'Play Game',
      to: '/play',
      testId: 'dashboard-card-play',
      btnTestId: 'btn-dashboard-play',
      color: 'from-blue-600/20 to-indigo-600/10 border-blue-500/30 text-blue-400',
      btnColor: 'bg-blue-600 hover:bg-blue-500',
    },
    {
      title: 'Tactics & Puzzles',
      description: 'Sharpen your tactical vision with curated tactical chess puzzles.',
      icon: Layers,
      buttonText: 'Solve Puzzles',
      to: '/puzzles',
      testId: 'dashboard-card-puzzles',
      btnTestId: 'btn-dashboard-puzzles',
      color: 'from-purple-600/20 to-fuchsia-600/10 border-purple-500/30 text-purple-400',
      btnColor: 'bg-purple-600 hover:bg-purple-500',
    },
    {
      title: 'Interactive Lessons',
      description: 'Master chess openings, middlegame strategies, and endgame theory.',
      icon: BookOpen,
      buttonText: 'Start Learning',
      to: '/courses',
      testId: 'dashboard-card-courses',
      btnTestId: 'btn-dashboard-courses',
      color: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
      btnColor: 'bg-emerald-600 hover:bg-emerald-500',
    },
    {
      title: 'Live Tournaments',
      description: 'Participate in fast-paced Arena and Swiss tournaments.',
      icon: Award,
      buttonText: 'Join Arena',
      to: '/tournaments',
      testId: 'dashboard-card-tournaments',
      btnTestId: 'btn-dashboard-tournaments',
      color: 'from-amber-600/20 to-orange-600/10 border-amber-500/30 text-amber-400',
      btnColor: 'bg-amber-600 hover:bg-amber-500',
    },
  ]

  return (
    <div className="space-y-8">
      <DocumentTitle title="Dashboard" />

      {/* Hero Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 p-8 sm:p-10">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, <span className="text-purple-400">Grandmaster</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-6">
            Ready to improve your game? Play a live match, solve tactical puzzles, or check out the
            latest courses from top coaches.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/play"
              data-testid="btn-hero-play"
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              Start Playing Now
            </Link>
            <Link
              to="/courses"
              data-testid="btn-hero-learn"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-all"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div
              key={idx}
              className="border border-slate-850 bg-slate-900/50 p-6 rounded-xl flex items-center space-x-4 shadow-sm"
              data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className="p-3 bg-slate-800/80 rounded-lg text-purple-400">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">{stat.value}</h3>
                <span className="text-xs text-slate-500">{stat.change}</span>
              </div>
            </div>
          )
        })}
      </section>

      {/* Feature Navigation Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <span>🎯</span> Explore Chessmaster
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                data-testid={feat.testId}
                className={`border bg-gradient-to-br ${feat.color} p-6 rounded-2xl flex flex-col justify-between h-56 transition-all hover:scale-[1.01]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-white">{feat.title}</span>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{feat.description}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {feat.title === 'Play Live Chess' ? (
                    <>
                      <Link
                        to="/play"
                        data-testid="btn-dashboard-play"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white shadow-md transition-all text-xs"
                      >
                        vs Computer
                      </Link>
                      <Link
                        to="/play/online"
                        data-testid="btn-dashboard-play-online"
                        className="px-4 py-2 bg-purple-650 hover:bg-purple-550 rounded-lg font-medium text-white shadow-md transition-all text-xs"
                      >
                        vs Online Player
                      </Link>
                    </>
                  ) : (
                    <Link
                      to={feat.to}
                      data-testid={feat.btnTestId}
                      className={`inline-block px-4 py-2 rounded-lg font-medium text-white shadow-md transition-all ${feat.btnColor}`}
                    >
                      {feat.buttonText}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Online Players overview */}
      <section className="border border-slate-800 bg-slate-900/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Live Community Activity</h4>
            <p className="text-sm text-slate-400">
              12,450 players online | 3,122 active chess games
            </p>
          </div>
        </div>
        <Link
          to="/play/online"
          data-testid="btn-lobby-join"
          className="px-4 py-2 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-all"
        >
          Open Game Lobby
        </Link>
      </section>
    </div>
  )
}
