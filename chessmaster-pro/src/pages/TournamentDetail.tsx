import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Users, Trophy, Play, CheckCircle2, ShieldAlert, Award } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Tournament {
  id: string
  slug: string
  title: string
  description: string
  format: 'arena' | 'swiss'
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled'
  time_control: string
  is_rated: boolean
  max_players: number
  player_count: number
  starts_at: string
  ends_at: string
  prize_badge_name: string | null
  prize_badge_emoji: string | null
}

interface Player {
  id: string
  tournament_id: string
  user_id: string
  username: string
  elo_at_entry: number
  score: number
  wins: number
  draws: number
  losses: number
  rank: number
  withdrawn: boolean
}

interface Pairing {
  id: string
  tournament_id: string
  round: number
  white_id: string
  black_id: string | null
  result: 'white' | 'black' | 'draw' | 'pending' | 'bye' | null
  white_username?: string
  black_username?: string
}

export function TournamentDetail() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [pairings, setPairings] = useState<Pairing[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'standings' | 'pairings'>('standings')
  const [joining, setJoining] = useState(false)

  // Load Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  // Load Tournament Details
  useEffect(() => {
    if (!tournamentId) return

    async function loadTournamentData() {
      try {
        setLoading(true)

        // 1. Fetch tournament
        const { data: tourData, error: tourErr } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single()

        if (tourErr || !tourData) {
          console.error('Error fetching tournament:', tourErr)
          setLoading(false)
          return
        }
        setTournament(tourData)

        // 2. Fetch players
        const { data: playersData } = await supabase
          .from('tournament_players')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('score', { ascending: false })
          .order('wins', { ascending: false })

        setPlayers(playersData || [])

        // 3. Fetch pairings
        const { data: pairingsData } = await supabase
          .from('tournament_pairings')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round', { ascending: false })

        setPairings(pairingsData || [])
      } catch (err) {
        console.error('Failed to load tournament data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTournamentData()
  }, [tournamentId, session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-chess-green">
        <span className="animate-spin text-3xl">♞</span>
        <span className="ml-3 text-lg font-semibold">Loading tournament details...</span>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Tournament Not Found</h2>
        <p className="text-slate-400">The tournament you are looking for does not exist or has been removed.</p>
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-2 px-4 py-2.5 chess-btn-grey rounded-lg text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tournaments
        </Link>
      </div>
    )
  }

  const isRegistered = session?.user?.id && players.some((p) => p.user_id === session.user.id && !p.withdrawn)

  const handleRegister = async () => {
    if (!session?.user?.id) {
      alert('You must be signed in to register for a tournament.')
      return
    }

    try {
      setJoining(true)
      if (isRegistered) {
        // Withdraw
        const player = players.find((p) => p.user_id === session.user.id)
        if (player) {
          await supabase
            .from('tournament_players')
            .delete()
            .eq('id', player.id)

          setPlayers(players.filter((p) => p.id !== player.id))
          setTournament({
            ...tournament,
            player_count: Math.max(0, tournament.player_count - 1),
          })
        }
      } else {
        // Join
        const newPlayer = {
          tournament_id: tournament.id,
          user_id: session.user.id,
          username: session.user.email?.split('@')[0] || 'Grandmaster',
          elo_at_entry: 1540, // Mock or fetch ELO
          score: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        }

        const { data, error } = await supabase
          .from('tournament_players')
          .insert(newPlayer)
          .select()
          .single()

        if (error) {
          console.error('Registration failed:', error)
          alert('Could not complete tournament registration.')
        } else if (data) {
          setPlayers([...players, data])
          setTournament({
            ...tournament,
            player_count: tournament.player_count + 1,
          })
        }
      }
    } catch (err) {
      console.error('Failed to update tournament registration:', err)
    } finally {
      setJoining(false)
    }
  }

  // Group pairings by round for bracket view
  const rounds = Array.from(new Set(pairings.map((p) => p.round))).sort((a, b) => b - a)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <DocumentTitle title={tournament.title} description={`View pairings, standings, matches and results for ${tournament.title} on Chessmaster Pro.`} />

      {/* Back button */}
      <div>
        <Link
          to="/tournaments"
          data-testid="btn-back-tournaments"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-chess-green" /> Back to Tournaments
        </Link>
      </div>

      {/* Header Info */}
      <section className="bg-chess-dark border-b-4 border-chess-darker rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 text-xs border border-chess-green/20 bg-chess-green/10 text-chess-green rounded-full font-bold capitalize font-mono">
              {tournament.format} Format
            </span>
            <span className="px-2.5 py-0.5 text-xs bg-chess-light-grey border border-chess-darker text-slate-300 rounded-full font-mono font-bold uppercase tracking-wider">
              {tournament.time_control} time control
            </span>
            <span
              className={`px-2.5 py-0.5 text-xs rounded-full font-extrabold uppercase ${
                tournament.status === 'active'
                  ? 'bg-red-500/20 border border-red-500/20 text-red-400'
                  : tournament.status === 'completed'
                    ? 'bg-[#3c3a37] text-slate-400'
                    : 'bg-chess-green/20 border border-chess-green/25 text-chess-green'
              }`}
            >
              {tournament.status === 'active' ? '🔴 Live Now' : tournament.status}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white leading-tight" data-testid="tournament-title">
            {tournament.title}
          </h1>
          <p className="text-slate-400 text-sm font-semibold leading-relaxed max-w-2xl">{tournament.description}</p>

          <div className="flex space-x-6 text-sm text-slate-400 pt-2 font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-chess-green" />
              {tournament.player_count} joined / {tournament.max_players} max
            </span>
            {tournament.prize_badge_name && (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Trophy className="w-4 h-4 fill-amber-500/15 text-amber-500" />
                Badge: {tournament.prize_badge_emoji} {tournament.prize_badge_name}
              </span>
            )}
          </div>
        </div>

        {/* Action Button Section */}
        <div className="w-full md:w-72 bg-chess-darker border border-chess-light-grey rounded-xl p-5 flex flex-col justify-center space-y-4">
          <div className="text-center space-y-2.5">
            {tournament.status === 'completed' ? (
              <div className="py-2 text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-chess-green" />
                <p className="font-bold text-sm">Tournament Finished</p>
                <p className="text-[11px] leading-normal font-semibold">This event has concluded. View the final standings below.</p>
              </div>
            ) : (
              <>
                <h3 className="text-white font-bold text-sm">
                  {isRegistered ? 'Registered' : 'Join Tournament'}
                </h3>
                <p className="text-slate-400 text-xs leading-normal font-semibold">
                  {isRegistered
                    ? 'You are registered for this event. Withdraw if you cannot participate.'
                    : 'Claim your spot to participate and climb the leaderboard!'}
                </p>
                <button
                  onClick={handleRegister}
                  disabled={joining}
                  data-testid="btn-register-tournament"
                  className={`w-full py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-lg cursor-pointer ${
                    isRegistered
                      ? 'chess-btn-grey'
                      : 'chess-btn-green'
                  }`}
                >
                  {joining ? 'Processing...' : isRegistered ? 'Withdraw' : 'Register Now'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Bracket / Standings tabs */}
      <section className="space-y-6">
        <div className="flex border-b border-chess-darker">
          <button
            onClick={() => setActiveSubTab('standings')}
            data-testid="tab-tournament-standings"
            className={`px-6 py-3 font-extrabold text-sm capitalize border-b-2 -mb-[2px] cursor-pointer ${
              activeSubTab === 'standings'
                ? 'border-chess-green text-chess-green'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 Leaderboard
          </button>
          {tournament.format === 'swiss' && (
            <button
              onClick={() => setActiveSubTab('pairings')}
              data-testid="tab-tournament-bracket"
              className={`px-6 py-3 font-extrabold text-sm capitalize border-b-2 -mb-[2px] cursor-pointer ${
                activeSubTab === 'pairings'
                  ? 'border-chess-green text-chess-green'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              🌳 Pairings / Bracket
            </button>
          )}
        </div>

        {/* Tab Contents */}
        {activeSubTab === 'standings' ? (
          /* Standings Leaderboard */
          <div className="bg-chess-dark border-b-4 border-chess-darker rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm" data-testid="table-standings">
              <thead className="bg-chess-darker border-b border-chess-light-grey text-slate-400 font-bold text-xs uppercase">
                <tr>
                  <th className="px-6 py-3.5 w-16">Rank</th>
                  <th className="px-6 py-3.5">Player</th>
                  <th className="px-6 py-3.5 text-center">Wins</th>
                  <th className="px-6 py-3.5 text-center">Draws</th>
                  <th className="px-6 py-3.5 text-center">Losses</th>
                  <th className="px-6 py-3.5 text-right pr-8">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chess-light-grey">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500 font-semibold">
                      No players have registered for this tournament yet.
                    </td>
                  </tr>
                ) : (
                  players.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={
                        p.user_id === session?.user?.id
                          ? 'bg-chess-green/10 text-chess-green font-bold'
                          : 'hover:bg-chess-light-grey/20 transition-colors'
                      }
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-350">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{p.username}</span>
                          <span className="text-xs text-slate-500 font-mono">({p.elo_at_entry})</span>
                          {idx === 0 && <Award className="w-4 h-4 text-amber-400 fill-amber-450/10" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-400 font-semibold">{p.wins}</td>
                      <td className="px-6 py-4 text-center text-slate-400 font-semibold">{p.draws}</td>
                      <td className="px-6 py-4 text-center text-slate-400 font-semibold">{p.losses}</td>
                      <td className="px-6 py-4 text-right pr-8 font-mono font-bold text-chess-green">
                        {p.score}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Swiss Bracket Pairings */
          <div className="space-y-6" data-testid="swiss-pairings-container">
            {rounds.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-chess-darker rounded-xl bg-chess-dark/20">
                <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">No matches scheduled yet for this tournament.</p>
              </div>
            ) : (
              rounds.map((r) => {
                const roundPairings = pairings.filter((p) => p.round === r)
                return (
                  <div key={r} className="space-y-3">
                    <h4 className="text-slate-400 font-extrabold text-sm font-mono uppercase">Round {r}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roundPairings.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 bg-chess-dark border-b-4 border-chess-darker rounded-xl flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500 font-mono font-semibold">Board Match</p>
                            <p className="text-sm font-bold">
                              <span className={p.result === 'white' ? 'text-chess-green' : 'text-white'}>
                                {p.white_username || 'White'}
                              </span>
                              <span className="text-slate-500 px-2 font-mono">vs</span>
                              <span className={p.result === 'black' ? 'text-chess-green' : 'text-white'}>
                                {p.black_id ? p.black_username || 'Black' : 'BYE'}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-chess-light-grey border border-chess-darker px-2.5 py-1 text-slate-300 rounded font-bold font-mono">
                              {p.result === 'pending'
                                ? '⚔️ playing'
                                : p.result === 'bye'
                                  ? 'BYE'
                                  : p.result === 'draw'
                                    ? 'Draw'
                                    : `${p.result} won`}
                            </span>
                            {p.result === 'pending' && (p.white_id === session?.user?.id || p.black_id === session?.user?.id) && (
                              <button
                                onClick={() => navigate('/play')}
                                className="p-2 chess-btn-green rounded-lg flex items-center justify-center cursor-pointer"
                                title="Play Match"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </section>
    </div>
  )
}
