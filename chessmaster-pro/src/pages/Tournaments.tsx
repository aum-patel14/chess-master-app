import { useState } from 'react'
import { DocumentTitle } from '../components/DocumentTitle'
import { Clock, Users, ShieldAlert } from 'lucide-react'

export function Tournaments() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'finished'>('active')

  const tournaments = [
    {
      id: 'tour-1',
      name: 'Summer Rapid Arena 2026',
      description:
        '90-minute arena tournament with standard 10+0 Rapid chess rules. Keep winning to climb the board!',
      timeFormat: '10+0',
      status: 'active',
      participants: 128,
      startTime: 'Started 20 mins ago',
      prize: '300 Rating points',
      type: 'Arena',
    },
    {
      id: 'tour-2',
      name: 'Grand Blitz Championship',
      description:
        'Weekly Swiss tournament. 7 Rounds of 3+2 Blitz chess. Perfect for tactical players.',
      timeFormat: '3+2',
      status: 'upcoming',
      participants: 45,
      startTime: 'Starting in 2 hours',
      prize: 'Golden Trophy Badge',
      type: 'Swiss',
    },
    {
      id: 'tour-3',
      name: 'Bullet Bullet Madness',
      description: 'Ultra-fast 1+0 Bullet tournament. Speed is everything in this 60-minute arena.',
      timeFormat: '1+0',
      status: 'upcoming',
      participants: 89,
      startTime: 'Starting in 4 hours',
      prize: 'Speedy Knight Badge',
      type: 'Arena',
    },
    {
      id: 'tour-4',
      name: 'Spring Classic Open 2026',
      description: '5-round classical Swiss match series. Extended 30+0 time control.',
      timeFormat: '30+0',
      status: 'finished',
      participants: 64,
      startTime: 'Ended 2 days ago',
      prize: '500 Rating points',
      type: 'Swiss',
    },
  ]

  const filteredTournaments = tournaments.filter((t) => t.status === activeTab)

  return (
    <div className="space-y-8">
      <DocumentTitle title="Tournaments" />

      {/* Header and Create Button */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Live Tournaments
          </h1>
          <p className="text-slate-450">
            Join competitive Arenas and Swiss events to challenge matching players globally.
          </p>
        </div>
        <button
          data-testid="btn-create-tournament"
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          Create Tournament
        </button>
      </section>

      {/* Tabs */}
      <section className="space-y-6">
        <div className="flex border-b border-slate-850">
          {(['active', 'upcoming', 'finished'] as const).map((tab) => (
            <button
              key={tab}
              data-testid={`tab-tournaments-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold text-sm capitalize transition-all border-b-2 -mb-[2px] ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'active' ? '🔴 Live now' : tab}
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        <div className="grid grid-cols-1 gap-6">
          {filteredTournaments.length > 0 ? (
            filteredTournaments.map((tour) => (
              <div
                key={tour.id}
                data-testid={`tournament-card-${tour.id}`}
                className="border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-350 rounded font-semibold font-mono">
                      {tour.timeFormat} • {tour.type}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      💰 Prize: {tour.prize}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-snug">{tour.name}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{tour.description}</p>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-850">
                  <div className="flex space-x-4 md:space-x-0 md:flex-col md:space-y-1.5 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {tour.participants} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      {tour.startTime}
                    </span>
                  </div>

                  <button
                    data-testid={`btn-join-tournament-${tour.id}`}
                    className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      tour.status === 'active'
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                        : tour.status === 'upcoming'
                          ? 'bg-purple-650 hover:bg-purple-550 text-white border border-purple-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-350'
                    }`}
                  >
                    {tour.status === 'active'
                      ? 'Join Match Arena'
                      : tour.status === 'upcoming'
                        ? 'Register Event'
                        : 'View Leaderboard'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
              <ShieldAlert className="w-10 h-10 text-slate-650 mx-auto mb-3" />
              <p className="text-slate-450 font-medium">
                No tournaments available in this category
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
