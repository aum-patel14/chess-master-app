import { DocumentTitle } from '../components/DocumentTitle'
import { Award, Calendar, Edit, Settings, PlayCircle, Eye } from 'lucide-react'

export function Profile() {
  const ratings = [
    { type: 'Bullet', rating: 1480, rank: '#14,250', wins: 45, losses: 38 },
    { type: 'Blitz', rating: 1512, rank: '#11,102', wins: 112, losses: 98 },
    { type: 'Rapid', rating: 1540, rank: '#9,845', wins: 88, losses: 70 },
    { type: 'Puzzles', rating: 1680, rank: '#6,512', wins: 342, losses: 35 },
  ]

  const recentGames = [
    {
      id: 'game-101',
      opponent: 'GrandmasterStockfish (1800)',
      color: 'White',
      result: 'Loss',
      moves: 38,
      date: '10 mins ago',
      mode: 'Rated Rapid',
    },
    {
      id: 'game-102',
      opponent: 'MagnusFan99 (1520)',
      color: 'Black',
      result: 'Win',
      moves: 24,
      date: '2 hours ago',
      mode: 'Rated Blitz',
    },
    {
      id: 'game-103',
      opponent: 'ChessPro_88 (1555)',
      color: 'White',
      result: 'Draw',
      moves: 42,
      date: '1 day ago',
      mode: 'Rated Rapid',
    },
  ]

  return (
    <div className="space-y-8">
      <DocumentTitle title="Profile" />

      {/* User Identity Header Card */}
      <section className="border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/10 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white font-extrabold text-3xl border-2 border-purple-400 shadow-xl">
            GM
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold text-white mb-0">Grandmaster (You)</h2>
              <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 font-extrabold uppercase rounded border border-purple-500/30">
                PRO
              </span>
            </div>
            <p className="text-slate-400 text-sm">@chessmaster_pro_user</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-1 justify-center sm:justify-start">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined June 2026</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            data-testid="btn-edit-profile"
            className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            data-testid="btn-settings"
            className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </section>

      {/* Ratings Dashboard Grid */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-450" />
          Ratings & Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ratings.map((r) => (
            <div
              key={r.type}
              data-testid={`rating-card-${r.type.toLowerCase()}`}
              className="border border-slate-850 bg-slate-900/40 p-5 rounded-xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold text-sm">{r.type}</span>
                <span className="text-[10px] text-slate-550 font-mono">Rank {r.rank}</span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <h4
                  className="text-3xl font-extrabold text-white"
                  data-testid={`rating-${r.type.toLowerCase()}-val`}
                >
                  {r.rating}
                </h4>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-850/50 pt-2.5">
                <span>Wins: {r.wins}</span>
                <span>Losses: {r.losses}</span>
                <span>WR: {((r.wins / (r.wins + r.losses)) * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Game History Table */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-purple-450" />
          Recent Match History
        </h3>
        <div className="border border-slate-800 bg-slate-900/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 text-xs font-mono">
                  <th className="p-4">Opponent</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Color</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Moves</th>
                  <th className="p-4">Played</th>
                  <th className="p-4 text-right">Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-slate-300">
                {recentGames.map((game) => (
                  <tr
                    key={game.id}
                    data-testid={`game-history-row-${game.id}`}
                    className="hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="p-4 font-semibold text-white">{game.opponent}</td>
                    <td className="p-4 font-mono text-xs">{game.mode}</td>
                    <td className="p-4 text-xs">{game.color}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                          game.result === 'Win'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : game.result === 'Loss'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {game.result}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{game.moves}</td>
                    <td className="p-4 text-slate-450 text-xs">{game.date}</td>
                    <td className="p-4 text-right">
                      <button
                        data-testid={`btn-analyze-game-${game.id}`}
                        className="p-1.5 hover:bg-slate-800 text-purple-400 hover:text-purple-300 rounded transition-all inline-flex items-center justify-center"
                        title="Analyze Game"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
