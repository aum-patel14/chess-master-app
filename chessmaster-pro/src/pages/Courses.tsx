import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { supabase } from '../lib/supabaseClient'
import { usePremium } from '../hooks/usePremium'
import { BookOpen, Clock, Star, Lock, Sparkles, Trophy } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Course {
  id: string
  slug: string
  title: string
  description: string
  level: string
  category: string
  thumbnail_emoji: string
  xp_reward: number
  lesson_count: number
  estimated_minutes: number
  is_published: boolean
  is_premium: boolean
}

export function Courses() {
  const navigate = useNavigate()
  const { isPremium } = usePremium()

  const [courses, setCourses] = useState<Course[]>([])
  const [courseLessonsCount, setCourseLessonsCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  // Load Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  // Load Courses and Progress
  useEffect(() => {
    async function loadAcademyData() {
      try {
        setLoading(true)

        // 1. Fetch courses
        const { data: coursesData, error: coursesErr } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: true })

        if (coursesErr) {
          console.error('Error fetching courses:', coursesErr)
        } else {
          setCourses(coursesData || [])
        }

        // 2. Fetch lesson counts per course
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, course_id')

        const counts: Record<string, number> = {}
        if (lessonsData) {
          lessonsData.forEach((l) => {
            counts[l.course_id] = (counts[l.course_id] || 0) + 1
          })
        }
        setCourseLessonsCount(counts)
      } catch (err) {
        console.error('Failed to load courses data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAcademyData()
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-chess-green border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-lg font-bold text-white">Loading Chess Academy...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <DocumentTitle title="Interactive Courses | Chess Academy" description="Master chess theory, opening strategies, and endgame calculations with step-by-step interactive lessons at Chessmaster Pro's Chess Academy." />

      {/* Header section */}
      <section className="border-b border-[#3c3a37]/50 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-black tracking-tight text-white" data-testid="academy-header-title">Chess Academy</h1>
          <p className="text-[#bababa] text-xs max-w-xl leading-relaxed">
            Expand your knowledge and master chess theory with interactive exercises, tactical guides, and masterclasses.
          </p>
        </div>

        {isPremium && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#211f1d] border border-amber-500/30 rounded-xl text-amber-500 font-bold text-xs shadow">
            <Sparkles className="w-4 h-4 fill-current" /> Diamond Membership Active
          </div>
        )}
      </section>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-chess-dark border border-[#3c3a37] rounded-xl p-6 shadow">
          <Trophy className="w-12 h-12 text-[#bababa]/30 mx-auto mb-3" />
          <p className="text-[#bababa] text-sm font-bold">No courses have been published yet. Check back soon!</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => {
            const totalLessons = courseLessonsCount[course.id] || course.lesson_count || 0
            const isLocked = course.is_premium && !isPremium

            return (
              <div
                key={course.id}
                data-testid={`course-card-${course.id}`}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="border border-[#3c3a37] bg-chess-dark hover:border-chess-green/50 rounded-xl p-6 flex flex-col justify-between space-y-6 transition-all cursor-pointer group shadow"
              >
                {/* Upper Content */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-0.5 text-xs bg-chess-darker border border-[#3c3a37] text-chess-green rounded-full font-bold uppercase tracking-wider">
                      {course.level}
                    </span>
                    <div className="flex items-center gap-2">
                      {course.is_premium && (
                        <span className="px-2.5 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full font-black flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> PREMIUM
                        </span>
                      )}
                      <span className="text-xs text-[#bababa] font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-chess-green" />
                        XP: {course.xp_reward}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white leading-snug group-hover:text-chess-green transition-colors flex items-center gap-2">
                    <span className="text-2xl">{course.thumbnail_emoji || '♟'}</span>
                    <span>{course.title}</span>
                  </h3>
                  <p className="text-[#bababa] text-xs leading-relaxed">{course.description}</p>
                </div>

                {/* Lower info */}
                <div className="space-y-4 pt-4 border-t border-[#3c3a37]">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex space-x-4 text-[#bababa] font-mono">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-chess-green" />
                        {totalLessons} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-chess-green" />
                        {course.estimated_minutes} mins
                      </span>
                    </div>

                    <button
                      data-testid={`btn-view-course-${course.id}`}
                      className={`px-4 py-2 text-xs rounded-lg shadow transition-all ${
                        isLocked
                          ? 'chess-btn-grey text-[#bababa]'
                          : 'chess-btn-green'
                      }`}
                    >
                      {isLocked ? (
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Unlock
                        </span>
                      ) : (
                        'View Syllabus'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
