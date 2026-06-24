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
      <DocumentTitle title="Profile" description="View your player statistics, rating ELO progress, recent match history, and achievements on Chessmaster Pro." />

      {/* User Identity Header Card */}
      <section className="bg-chess-dark border-b-4 border-chess-darker rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-xl bg-chess-light-grey flex items-center justify-center text-white font-extrabold text-3xl border border-chess-darker shadow-md">
            GM
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold text-white mb-0">Grandmaster (You)</h2>
              <span className="px-2 py-0.5 text-[10px] bg-chess-green/20 text-chess-green font-extrabold uppercase rounded border border-chess-green/30">
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
            className="px-4 py-2.5 chess-btn-grey rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            data-testid="btn-settings"
            className="px-4 py-2.5 chess-btn-grey rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </section>

      {/* Ratings Dashboard Grid */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-chess-green" />
          Ratings & Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ratings.map((r) => (
            <div
              key={r.type}
              data-testid={`rating-card-${r.type.toLowerCase()}`}
              className="bg-chess-dark border-b-4 border-chess-darker p-5 rounded-xl space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold text-sm uppercase tracking-wider">{r.type}</span>
                <span className="text-xs text-slate-500 font-semibold font-mono">Rank {r.rank}</span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <h4
                  className="text-3xl font-extrabold text-white"
                  data-testid={`rating-${r.type.toLowerCase()}-val`}
                >
                  {r.rating}
                </h4>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold border-t border-chess-light-grey pt-2.5">
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
          <PlayCircle className="w-5 h-5 text-chess-green" />
          Recent Match History
        </h3>
        <div className="bg-chess-dark border-b-4 border-chess-darker rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-chess-darker text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-chess-light-grey">
                  <th className="p-4">Opponent</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Color</th>
                  <th className="p-4">Result</th>
                  <th className="p-4">Moves</th>
                  <th className="p-4">Played</th>
                  <th className="p-4 text-right">Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chess-light-grey text-slate-300">
                {recentGames.map((game) => (
                  <tr
                    key={game.id}
                    data-testid={`game-history-row-${game.id}`}
                    className="hover:bg-chess-light-grey/20 transition-colors"
                  >
                    <td className="p-4 font-semibold text-white">{game.opponent}</td>
                    <td className="p-4 font-mono text-xs">{game.mode}</td>
                    <td className="p-4 text-xs">{game.color}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase ${
                          game.result === 'Win'
                            ? 'bg-chess-green/20 text-chess-green'
                            : game.result === 'Loss'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {game.result}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{game.moves}</td>
                    <td className="p-4 text-slate-400 text-xs">{game.date}</td>
                    <td className="p-4 text-right">
                      <button
                        data-testid={`btn-analyze-game-${game.id}`}
                        className="p-2 hover:bg-chess-light-grey text-chess-green hover:text-chess-green-hover rounded transition-all inline-flex items-center justify-center cursor-pointer"
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
