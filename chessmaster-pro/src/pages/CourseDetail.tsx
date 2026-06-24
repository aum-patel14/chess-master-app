import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { supabase } from '../lib/supabaseClient'
import { usePremium } from '../hooks/usePremium'
import { ArrowLeft, BookOpen, Clock, Lock, CheckCircle2, Play, Sparkles } from 'lucide-react'
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

interface Lesson {
  id: string
  course_id: string
  position: number
  title: string
  summary: string
  xp_reward: number
}

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { isPremium } = usePremium()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    if (!courseId) return

    async function fetchCourseAndLessons() {
      try {
        setLoading(true)
        // 1. Fetch course details
        const { data: courseData, error: courseErr } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single()

        if (courseErr || !courseData) {
          console.error('Error fetching course:', courseErr)
          setLoading(false)
          return
        }
        setCourse(courseData)
        if (courseData.is_premium && !isPremium) {
          setShowPremiumModal(true)
        }

        // 2. Fetch lessons
        const { data: lessonsData, error: lessonsErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('position', { ascending: true })

        if (lessonsErr) {
          console.error('Error fetching lessons:', lessonsErr)
        } else {
          setLessons(lessonsData || [])
        }

        // 3. Fetch completed progress
        if (session?.user?.id) {
          const { data: progressData, error: progressErr } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', session.user.id)
            .eq('completed', true)

          if (!progressErr && progressData) {
            setCompletedLessons(progressData.map((p) => p.lesson_id))
          }
        } else {
          // Guest local storage fallback
          const localProgress = localStorage.getItem('chess_local_lesson_progress')
          if (localProgress) {
            try {
              const parsed = JSON.parse(localProgress)
              setCompletedLessons(parsed || [])
            } catch {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.error('Failed to load course details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseAndLessons()
  }, [courseId, session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-chess-green">
        <span className="animate-spin text-3xl">♞</span>
        <span className="ml-3 text-lg font-semibold">Loading course details...</span>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Course Not Found</h2>
        <p className="text-slate-400">The course you are looking for does not exist or has been removed.</p>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-4 py-2.5 chess-btn-grey rounded-lg text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    )
  }

  const isLocked = course.is_premium && !isPremium
  const progressPercent =
    lessons.length > 0 ? Math.round((completedLessons.filter((id) => lessons.some((l) => l.id === id)).length / lessons.length) * 100) : 0

  const handleLessonClick = (lessonId: string) => {
    if (isLocked) {
      setShowPremiumModal(true)
    } else {
      navigate(`/courses/${course.id}/lessons/${lessonId}`)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <DocumentTitle title={`${course.title} | Chess Academy`} description={`Learn ${course.title} on Chessmaster Pro. ${course.description}`} />

      {/* Back button */}
      <div>
        <Link
          to="/courses"
          data-testid="btn-back-courses"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-chess-green" /> Back to Courses
        </Link>
      </div>

      {/* Course Banner */}
      <section className="bg-chess-dark border-b-4 border-chess-darker rounded-xl p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
        <div className="space-y-4 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs border border-chess-green/20 bg-chess-green/10 text-chess-green rounded-full font-bold uppercase tracking-wider">
              {course.level}
            </span>
            <span className="px-2.5 py-0.5 text-xs bg-chess-light-grey text-slate-350 rounded-full font-bold uppercase tracking-wider">
              {course.category}
            </span>
            {course.is_premium && (
              <span className="px-2.5 py-0.5 text-xs bg-amber-500 text-slate-950 rounded-full font-extrabold flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3 fill-current" /> PREMIUM
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-white leading-tight" data-testid="course-detail-title">
            {course.title}
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl">{course.description}</p>

          <div className="flex space-x-6 text-sm text-slate-400 pt-2 font-mono font-semibold">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-chess-green" />
              {lessons.length} lessons
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-chess-green" />
              {course.estimated_minutes} minutes
            </span>
          </div>
        </div>

        {/* Progress Card / Lock Callout */}
        <div className="w-full md:w-72 bg-chess-darker border border-chess-light-grey rounded-xl p-5 flex flex-col justify-center space-y-4">
          {isLocked ? (
            <div className="text-center space-y-3 py-2">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-sm">Premium Content Locked</h3>
              <p className="text-slate-400 text-xs leading-normal">
                Unlock with Diamond membership to access all masterclasses and advanced lessons.
              </p>
              <button
                onClick={() => setShowPremiumModal(true)}
                data-testid="btn-unlock-premium"
                className="w-full py-2.5 chess-btn-green rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer"
              >
                Unlock Course
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Course Completion</span>
                <span className="text-chess-green font-bold font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-chess-light-grey h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-chess-green h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 font-semibold leading-normal text-center">
                {completedLessons.filter((id) => lessons.some((l) => l.id === id)).length} of {lessons.length} lessons completed
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Lessons List */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Course Syllabus</h2>

        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id)
            return (
              <div
                key={lesson.id}
                data-testid={`lesson-item-${lesson.id}`}
                onClick={() => handleLessonClick(lesson.id)}
                className={`flex items-start justify-between p-5 border rounded-xl transition-all cursor-pointer ${
                  isLocked
                    ? 'border-chess-dark bg-chess-darker/50 opacity-60 hover:opacity-80'
                    : 'border-chess-light-grey bg-chess-dark/50 hover:border-chess-green hover:bg-chess-dark/80'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Step number badge / status */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-chess-green/20 border border-chess-green/45 flex items-center justify-center text-chess-green">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-chess-light-grey border border-chess-darker flex items-center justify-center text-slate-300 font-mono text-sm font-bold">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Title & summary */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                      {lesson.title}
                      {isLocked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                    </h3>
                    <p className="text-slate-400 text-xs leading-normal font-semibold">{lesson.summary}</p>
                  </div>
                </div>

                {/* Action button */}
                <div className="ml-4 flex-shrink-0 self-center">
                  {isLocked ? (
                    <div className="p-2 text-slate-500 bg-chess-darker rounded-lg">
                      <Lock className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isCompleted
                          ? 'text-chess-green bg-chess-green/10 hover:bg-chess-green/20'
                          : 'text-white bg-chess-green hover:bg-chess-green-hover shadow-md'
                      }`}
                      aria-label="Start Lesson"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Premium Locking Modal */}
      {showPremiumModal && (
        <div
          data-testid="premium-lock-modal"
          className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="bg-chess-dark border-b-4 border-chess-darker rounded-xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto">
              <Sparkles className="w-8 h-8 fill-current" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">Diamond Exclusive Course</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                This course contains premium theoretical analysis and intermediate/advanced interactive training modules.
              </p>
            </div>

            <div className="bg-chess-darker border border-chess-light-grey rounded-xl p-4 text-xs text-slate-400 leading-relaxed text-left space-y-2 font-semibold">
              <p className="font-bold text-white">How to unlock:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Activate **Sandbox Premium** in the application settings or profile.</li>
                <li>Set `localStorage.setItem('chess_premium_mock', 'true')` in your console.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('chess_premium_mock', 'true')
                  // Trigger local state updates
                  window.dispatchEvent(new Event('storage'))
                  setShowPremiumModal(false)
                }}
                data-testid="btn-enable-premium-mock"
                className="flex-1 py-3 chess-btn-green rounded-xl text-sm font-extrabold cursor-pointer"
              >
                Enable Sandbox Premium
              </button>
              <button
                onClick={() => setShowPremiumModal(false)}
                className="py-3 px-5 chess-btn-grey rounded-xl text-sm font-extrabold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
