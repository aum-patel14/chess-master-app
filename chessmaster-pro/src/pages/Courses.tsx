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
      <div className="flex items-center justify-center min-h-[400px] text-purple-400">
        <span className="animate-spin text-3xl">♞</span>
        <span className="ml-3 text-lg font-semibold">Loading Chess Academy...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <DocumentTitle title="Interactive Courses | Chess Academy" />

      {/* Header section */}
      <section className="border-b border-slate-900 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2" data-testid="academy-header-title">Chess Academy</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Expand your knowledge and master chess theory with interactive exercises, tactical guides, and masterclasses.
          </p>
        </div>

        {isPremium && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl text-amber-400 font-bold text-xs shadow-lg">
            <Sparkles className="w-4 h-4 fill-current" /> Diamond Membership Active
          </div>
        )}
      </section>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/10 border border-slate-900 rounded-2xl p-6">
          <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No courses have been published yet. Check back soon!</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courses.map((course) => {
            const totalLessons = courseLessonsCount[course.id] || course.lesson_count || 0
            const isLocked = course.is_premium && !isPremium

            return (
              <div
                key={course.id}
                data-testid={`course-card-${course.id}`}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between space-y-6 transition-all cursor-pointer group"
              >
                {/* Upper Content */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 text-xs border border-purple-500/20 bg-purple-500/10 text-purple-400 rounded-full font-semibold">
                      {course.level}
                    </span>
                    <div className="flex items-center gap-2">
                      {course.is_premium && (
                        <span className="px-2.5 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> PREMIUM
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-purple-550/20 text-purple-400" />
                        XP: {course.xp_reward}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white leading-snug group-hover:text-purple-300 transition-colors flex items-center gap-2">
                    <span className="text-2xl">{course.thumbnail_emoji || '♟'}</span>
                    {course.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{course.description}</p>
                </div>

                {/* Lower info */}
                <div className="space-y-4 pt-4 border-t border-slate-850">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex space-x-4 text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        {totalLessons} lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        {course.estimated_minutes} mins
                      </span>
                    </div>

                    <button
                      data-testid={`btn-view-course-${course.id}`}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                        isLocked
                          ? 'bg-slate-800/80 text-slate-400 border border-slate-700/30'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Unlock
                        </>
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
