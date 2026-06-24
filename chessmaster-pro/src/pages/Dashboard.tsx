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
      bgClass: 'bg-chess-dark border border-[#3c3a37] text-white',
      accentColor: 'text-chess-green',
    },
    {
      title: 'Tactics & Puzzles',
      description: 'Sharpen your tactical vision with curated tactical chess puzzles.',
      icon: Layers,
      buttonText: 'Solve Puzzles',
      to: '/puzzles',
      testId: 'dashboard-card-puzzles',
      btnTestId: 'btn-dashboard-puzzles',
      bgClass: 'bg-chess-dark border border-[#3c3a37] text-white',
      accentColor: 'text-chess-green',
    },
    {
      title: 'Interactive Lessons',
      description: 'Master chess openings, middlegame strategies, and endgame theory.',
      icon: BookOpen,
      buttonText: 'Start Learning',
      to: '/courses',
      testId: 'dashboard-card-courses',
      btnTestId: 'btn-dashboard-courses',
      bgClass: 'bg-chess-dark border border-[#3c3a37] text-white',
      accentColor: 'text-chess-green',
    },
    {
      title: 'Live Tournaments',
      description: 'Participate in fast-paced Arena and Swiss tournaments.',
      icon: Award,
      buttonText: 'Join Arena',
      to: '/tournaments',
      testId: 'dashboard-card-tournaments',
      btnTestId: 'btn-dashboard-tournaments',
      bgClass: 'bg-chess-dark border border-[#3c3a37] text-white',
      accentColor: 'text-chess-green',
    },
  ]

  return (
    <div className="space-y-6">
      <DocumentTitle
        title="Dashboard"
        description="Access your rating progress, puzzle stats, active tournaments, and recommended lessons from your Chessmaster Pro dashboard."
      />

      {/* Hero Welcome banner */}
      <section className="relative overflow-hidden rounded-xl border border-[#3c3a37] bg-chess-dark p-8 sm:p-10 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Welcome back, <span className="text-chess-green">Grandmaster</span>
          </h1>
          <p className="text-[#bababa] text-sm sm:text-base leading-relaxed">
            Ready to improve your game? Play a live match, solve tactical puzzles, or check out the latest courses from top coaches.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/play"
              data-testid="btn-hero-play"
              className="chess-btn-green px-6 py-3 rounded-lg text-sm transition-all"
            >
              Start Playing Now
            </Link>
            <Link
              to="/courses"
              data-testid="btn-hero-learn"
              className="chess-btn-grey px-6 py-3 rounded-lg text-sm transition-all"
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
              className="border border-[#3c3a37] bg-chess-dark p-6 rounded-xl flex items-center space-x-4 shadow"
              data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className="p-3 bg-chess-darker rounded-lg text-chess-green">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[#bababa] text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-white mt-0.5">{stat.value}</h3>
                <span className="text-[10px] font-bold text-chess-green">{stat.change}</span>
              </div>
            </div>
          )
        })}
      </section>

      {/* Feature Navigation Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <span className="text-chess-green">♚</span> Explore Chessmaster
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.title}
                data-testid={feat.testId}
                className={`${feat.bgClass} p-6 rounded-xl flex flex-col justify-between h-52 shadow`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-black text-white">{feat.title}</span>
                    <Icon className={`w-5 h-5 ${feat.accentColor}`} />
                  </div>
                  <p className="text-[#bababa] text-xs leading-relaxed">{feat.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {feat.title === 'Play Live Chess' ? (
                    <>
                      <Link
                        to="/play"
                        data-testid="btn-dashboard-play"
                        className="chess-btn-green px-4 py-2 rounded-lg text-xs"
                      >
                        vs Computer
                      </Link>
                      <Link
                        to="/play/online"
                        data-testid="btn-dashboard-play-online"
                        className="chess-btn-grey px-4 py-2 rounded-lg text-xs text-white"
                      >
                        vs Online Player
                      </Link>
                    </>
                  ) : (
                    <Link
                      to={feat.to}
                      data-testid={feat.btnTestId}
                      className="chess-btn-grey px-4 py-2 rounded-lg text-xs text-white"
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
      <section className="border border-[#3c3a37] bg-chess-dark rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-chess-darker text-chess-green rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white">Live Community Activity</h4>
            <p className="text-xs text-[#bababa]">
              12,450 players online | 3,122 active chess games
            </p>
          </div>
        </div>
        <Link
          to="/play/online"
          data-testid="btn-lobby-join"
          className="chess-btn-grey px-5 py-2.5 rounded-lg text-xs text-white"
        >
          Open Game Lobby
        </Link>
      </section>
    </div>
  )
}
