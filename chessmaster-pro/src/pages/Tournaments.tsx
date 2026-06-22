import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { supabase } from '../lib/supabaseClient'
import { Clock, Users, ShieldAlert, X, PlusCircle, Trophy } from 'lucide-react'
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

export function Tournaments() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'finished'>('active')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  // Create Tournament Form States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<'arena' | 'swiss'>('arena')
  const [timeControl, setTimeControl] = useState('10+0')
  const [maxPlayers, setMaxPlayers] = useState(64)
  const [startsAt, setStartsAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Load Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  // Load Tournaments
  const loadTournaments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('starts_at', { ascending: true })

      if (error) {
        console.error('Error fetching tournaments:', error)
      } else {
        setTournaments(data || [])
      }
    } catch (err) {
      console.error('Failed to load tournaments list:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournaments()
  }, [])

  // Map activeTab to statuses
  // Tab 'upcoming' -> status 'upcoming' or 'registration'
  // Tab 'active' -> status 'active'
  // Tab 'finished' -> status 'completed' or 'cancelled'
  const filteredTournaments = tournaments.filter((t) => {
    if (activeTab === 'active') return t.status === 'active'
    if (activeTab === 'upcoming') return t.status === 'upcoming' || t.status === 'registration'
    return t.status === 'completed' || t.status === 'cancelled'
  })

  // Handle Form Submit
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      setFormError('You must be signed in to create a tournament.')
      return
    }

    if (!title || !startsAt) {
      setFormError('Please fill out all required fields.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)
      const newTournament = {
        slug,
        title,
        description,
        format,
        status: 'upcoming',
        time_control: timeControl,
        is_rated: true,
        created_by: session.user.id,
        max_players: maxPlayers,
        min_players: 4,
        registration_opens_at: new Date().toISOString(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(new Date(startsAt).getTime() + 90 * 60000).toISOString(), // defaults to +90 mins
      }

      const { data, error } = await supabase
        .from('tournaments')
        .insert(newTournament)
        .select()
        .single()

      if (error) {
        console.error('Create tournament failed:', error)
        setFormError(error.message || 'Failed to create tournament. Please try again.')
      } else if (data) {
        setTournaments([...tournaments, data])
        setIsModalOpen(false)
        // Reset form
        setTitle('')
        setDescription('')
        setFormat('arena')
        setTimeControl('10+0')
        setMaxPlayers(64)
        setStartsAt('')
      }
    } catch (err) {
      console.error('Error creating tournament:', err)
      setFormError('An error occurred during submission.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCardClick = (id: string) => {
    navigate(`/tournaments/${id}`)
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <DocumentTitle title="Tournaments" description="Join competitive chess Arenas and Swiss events on Chessmaster Pro, track live standings, or host your own customized tournament." />

      {/* Header and Create Button */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2" data-testid="tournaments-header-title">
            Live Tournaments
          </h1>
          <p className="text-slate-400 text-sm">
            Join competitive Arenas and Swiss events to challenge matching players globally.
          </p>
        </div>
        {session && (
          <button
            onClick={() => setIsModalOpen(true)}
            data-testid="btn-create-tournament"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-650 hover:bg-purple-550 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/10 hover:shadow-purple-550/20 transition-all border border-purple-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Create Tournament
          </button>
        )}
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
                  : 'border-transparent text-slate-450 hover:text-slate-200'
              }`}
            >
              {tab === 'active' ? '🔴 Live now' : tab}
            </button>
          ))}
        </div>

        {/* Tournaments List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-purple-400">
            <span className="animate-spin text-2xl">♞</span>
            <span className="ml-3 font-semibold">Loading tournament matches...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredTournaments.length > 0 ? (
              filteredTournaments.map((tour) => (
                <div
                  key={tour.id}
                  data-testid={`tournament-card-${tour.id}`}
                  onClick={() => handleCardClick(tour.id)}
                  className="border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all cursor-pointer group"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-0.5 text-[10px] bg-slate-850 border border-slate-800 text-slate-350 rounded font-bold font-mono uppercase">
                        {tour.time_control} • {tour.format}
                      </span>
                      {tour.prize_badge_name && (
                        <span className="text-xs text-amber-400 flex items-center gap-1 font-mono font-semibold">
                          <Trophy className="w-3.5 h-3.5 fill-amber-500/10" />
                          Prize: {tour.prize_badge_emoji} {tour.prize_badge_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white leading-snug group-hover:text-purple-300 transition-colors">
                      {tour.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{tour.description}</p>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-850">
                    <div className="flex space-x-4 md:space-x-0 md:flex-col md:space-y-1 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {tour.player_count} players
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(tour.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      data-testid={`btn-join-tournament-${tour.id}`}
                      className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                        tour.status === 'active'
                          ? 'bg-red-650 hover:bg-red-550 text-white shadow-md'
                          : tour.status === 'upcoming' || tour.status === 'registration'
                            ? 'bg-purple-650 hover:bg-purple-550 text-white'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-350'
                      }`}
                    >
                      {tour.status === 'active'
                        ? 'Join Match Arena'
                        : tour.status === 'upcoming' || tour.status === 'registration'
                          ? 'Register Event'
                          : 'View Standings'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
                <ShieldAlert className="w-12 h-12 text-slate-650 mx-auto mb-3" />
                <p className="text-slate-450 font-semibold text-sm">
                  No tournaments available in this category
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Create Tournament Modal Dialog */}
      {isModalOpen && (
        <div
          data-testid="create-tournament-modal"
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-extrabold text-white">Create Tournament</h3>
              <p className="text-slate-400 text-xs leading-normal">
                Host a customized chess event for the community. Matches are scheduled automatically.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold" data-testid="form-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTournament} className="space-y-4 text-sm" data-testid="form-create-tournament">
              <div className="space-y-1.5">
                <label className="text-slate-350 font-semibold text-xs">Event Title*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Blitz Brawl"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-title"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-350 font-semibold text-xs">Description</label>
                <textarea
                  placeholder="e.g. Friendly Swiss tournament for members..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-description"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-350 font-semibold text-xs">Format*</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as 'arena' | 'swiss')}
                    data-testid="select-format"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="arena">Arena</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-350 font-semibold text-xs">Time Control*</label>
                  <select
                    value={timeControl}
                    onChange={(e) => setTimeControl(e.target.value)}
                    data-testid="select-time-control"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="1+0">1+0 (Bullet)</option>
                    <option value="3+2">3+2 (Blitz)</option>
                    <option value="5+0">5+0 (Blitz)</option>
                    <option value="10+0">10+0 (Rapid)</option>
                    <option value="30+0">30+0 (Classical)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-350 font-semibold text-xs">Max Players</label>
                  <input
                    type="number"
                    min={4}
                    max={200}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    data-testid="input-max-players"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-350 font-semibold text-xs">Starts At*</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    data-testid="input-starts-at"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-lg px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="btn-submit-tournament"
                  className="flex-1 py-3 bg-purple-650 hover:bg-purple-550 disabled:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-purple-600/10 transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
