import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { DocumentTitle } from '../components/DocumentTitle'
import { ChessBoard } from '../components/ChessBoard'
import { supabase } from '../lib/supabaseClient'
import { usePremium } from '../hooks/usePremium'
import { Chess } from 'chess.js'
import { ArrowLeft, ChevronLeft, ChevronRight, HelpCircle, RefreshCw, CheckCircle, Award, Sparkles, LogIn } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Course {
  id: string
  title: string
  is_premium: boolean
}

interface Lesson {
  id: string
  title: string
  summary: string
}

interface LessonStep {
  id: string
  lesson_id: string
  position: number
  type: 'theory' | 'challenge' | 'quiz'
  title: string
  content: string
  fen: string
  solution_moves: string[] | null
  hint: string | null
  explanation: string | null
}

export function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { isPremium } = usePremium()

  const [course, setCourse] = useState<Course | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)

  // Current step state
  const [boardPosition, setBoardPosition] = useState('')
  const [solutionMoveIdx, setSolutionMoveIdx] = useState(0)
  const [stepCompleted, setStepCompleted] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null })
  const [showHint, setShowHint] = useState(false)

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [lessonFinished, setLessonFinished] = useState(false)

  // Load Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  // Load course, lesson and steps
  useEffect(() => {
    if (!courseId || !lessonId) return

    async function loadLessonData() {
      try {
        setLoading(true)

        // 1. Fetch course details
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title, is_premium')
          .eq('id', courseId)
          .single()

        if (!courseData) {
          setLoading(false)
          return
        }
        setCourse(courseData)

        // Premium Gate
        if (courseData.is_premium && !isPremium) {
          navigate(`/courses/${courseId}`)
          return
        }

        // 2. Fetch lesson details
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('id, title, summary')
          .eq('id', lessonId)
          .single()

        if (!lessonData) {
          setLoading(false)
          return
        }
        setLesson(lessonData)

        // 3. Fetch steps
        const { data: stepsData } = await supabase
          .from('lesson_steps')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('position', { ascending: true })

        const loadedSteps = stepsData || []
        setSteps(loadedSteps)
        setCurrentStepIdx(0)
        resetStepState(loadedSteps[0])
      } catch (err) {
        console.error('Failed to load lesson:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLessonData()
  }, [courseId, lessonId, isPremium])

  // Helper to reset step play variables
  const resetStepState = (step?: LessonStep) => {
    if (!step) return
    setBoardPosition(step.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    setSolutionMoveIdx(0)
    setShowHint(false)
    setStatusMsg({ text: '', type: null })
    setStepCompleted(step.type === 'theory')
  }

  const currentStep = steps[currentStepIdx]

  // Handle board move
  const handleBoardMove = (move: { from: string; to: string; promotion?: string }) => {
    if (!currentStep) return
    if (stepCompleted) return

    const movesList = currentStep.solution_moves
    if (!movesList || movesList.length === 0) {
      // Just normal free play for steps that don't have defined solutions (e.g. theory)
      try {
        const game = new Chess(boardPosition)
        const res = game.move({ from: move.from, to: move.to, promotion: move.promotion })
        if (res) {
          setBoardPosition(game.fen())
        }
      } catch {
        // Invalid move
      }
      return
    }

    const expectedMove = movesList[solutionMoveIdx]
    const uciMove = `${move.from}${move.to}${move.promotion || ''}`

    if (uciMove === expectedMove) {
      // Correct Move!
      try {
        const game = new Chess(boardPosition)
        game.move({ from: move.from, to: move.to, promotion: move.promotion })
        const nextFen = game.fen()
        setBoardPosition(nextFen)

        const nextMoveIdx = solutionMoveIdx + 1
        setSolutionMoveIdx(nextMoveIdx)

        if (nextMoveIdx >= movesList.length) {
          // Completed the challenge step!
          setStepCompleted(true)
          setStatusMsg({ text: 'Correct! Well done.', type: 'success' })
        } else {
          setStatusMsg({ text: 'Good move! Keep going...', type: 'info' })
        }
      } catch (e) {
        console.error('Failed to apply valid move FEN:', e)
      }
    } else {
      // Incorrect Move!
      setStatusMsg({ text: 'Incorrect move. Try again!', type: 'error' })
      // Flash board back to previous state shortly
      setTimeout(() => {
        // Reset to FEN before this step
        if (solutionMoveIdx === 0) {
          setBoardPosition(currentStep.fen)
        } else {
          // Find FEN for current step by simulating previous correct moves
          try {
            const game = new Chess(currentStep.fen)
            for (let i = 0; i < solutionMoveIdx; i++) {
              const prevMove = movesList[i]
              game.move({
                from: prevMove.slice(0, 2),
                to: prevMove.slice(2, 4),
                promotion: prevMove.length > 4 ? prevMove[4] : undefined,
              })
            }
            setBoardPosition(game.fen())
          } catch {
            setBoardPosition(currentStep.fen)
          }
        }
      }, 800)
    }
  }

  // Handle navigation
  const handleNextStep = () => {
    if (!stepCompleted) return

    if (currentStepIdx + 1 < steps.length) {
      const nextIdx = currentStepIdx + 1
      setCurrentStepIdx(nextIdx)
      resetStepState(steps[nextIdx])
    } else {
      // Finished the lesson!
      handleFinishLesson()
    }
  }

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1
      setCurrentStepIdx(prevIdx)
      resetStepState(steps[prevIdx])
    }
  }

  const handleFinishLesson = async () => {
    if (!lesson || !course) return

    try {
      if (session?.user?.id) {
        // Persist to Supabase
        await supabase.from('lesson_progress').upsert(
          {
            user_id: session.user.id,
            lesson_id: lesson.id,
            completed: true,
            steps_completed: steps.length,
          },
          { onConflict: 'user_id,lesson_id' }
        )
      } else {
        // Guest LocalStorage fallback
        const localProgress = localStorage.getItem('chess_local_lesson_progress')
        let completedList: string[] = []
        if (localProgress) {
          try {
            completedList = JSON.parse(localProgress)
          } catch {
            completedList = []
          }
        }
        if (!completedList.includes(lesson.id)) {
          completedList.push(lesson.id)
          localStorage.setItem('chess_local_lesson_progress', JSON.stringify(completedList))
        }
      }
      setLessonFinished(true)
    } catch (err) {
      console.error('Failed to save progress:', err)
      // Display finished status regardless so user isn't stuck
      setLessonFinished(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-purple-400">
        <span className="animate-spin text-3xl">♞</span>
        <span className="ml-3 text-lg font-semibold">Loading lesson player...</span>
      </div>
    )
  }

  if (!lesson || !course || steps.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-2xl font-bold text-red-400">Lesson Not Found</h2>
        <p className="text-slate-400">We could not load the steps for this lesson.</p>
        <Link
          to={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Syllabus
        </Link>
      </div>
    )
  }

  if (lessonFinished) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-fade-in">
        <DocumentTitle title="Lesson Completed! | Chess Academy" description="Congratulations on completing the chess lesson! Keep learning and practice on Chessmaster Pro." />

        <div className="inline-flex p-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <Award className="w-16 h-16" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-white">Lesson Completed!</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Congratulations! You completed all the interactive challenges for **{lesson.title}**.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-full text-purple-300 font-bold text-sm">
            <Sparkles className="w-4 h-4 fill-current" /> +20 XP Earned
          </div>
        </div>

        {!session && (
          <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <p className="text-white text-xs font-bold flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5 text-purple-400" /> Save Progress Permanently
              </p>
              <p className="text-slate-450 text-[11px] leading-normal">
                Your progress is saved locally, but sign in or create an account to sync it permanently.
              </p>
            </div>
            <Link
              to="/play/online"
              className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all"
            >
              Sign In
            </Link>
          </div>
        )}

        <div>
          <button
            onClick={() => navigate(`/courses/${course.id}`)}
            data-testid="btn-lesson-finished-continue"
            className="w-full py-3 bg-purple-650 hover:bg-purple-550 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20"
          >
            Continue Syllabus
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DocumentTitle title={`${lesson.title} - Step ${currentStepIdx + 1} | Chess Academy`} description={`Step ${currentStepIdx + 1} of the lesson "${lesson.title}" in the ${course.title} course at Chessmaster Pro's Chess Academy.`} />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="space-y-1">
          <Link
            to={`/courses/${course?.id || ''}`}
            data-testid="btn-lesson-back"
            aria-label={course?.title ? `Back to ${course.title}` : 'Back to Course'}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> {course?.title || 'Back to Course'}
          </Link>
          <h1 className="text-2xl font-bold text-white leading-tight">{lesson.title}</h1>
        </div>

        {/* Steps Progress Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold font-mono">
            Step {currentStepIdx + 1} of {steps.length}
          </span>
          <div className="flex gap-1.5">
            {steps.map((_, idx) => {
              const isCurrent = idx === currentStepIdx
              const isCompleted = idx < currentStepIdx || (idx === currentStepIdx && stepCompleted)
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                      : isCurrent
                        ? 'bg-purple-500 ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950 scale-110'
                        : 'bg-slate-800'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Player Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side — Interactive Board */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[480px]">
            <ChessBoard
              key={currentStep.id}
              position={boardPosition}
              orientation="white"
              readOnly={currentStep.type === 'theory' || stepCompleted}
              onMove={handleBoardMove}
            />
          </div>
        </div>

        {/* Right Side — Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/35 border border-slate-850 rounded-2xl p-6 flex flex-col min-h-[380px] justify-between">
            {/* Step Content */}
            <div className="space-y-4">
              <span className="px-2 py-0.5 text-[10px] border border-purple-500/20 bg-purple-500/10 text-purple-400 rounded-full font-bold uppercase tracking-wider">
                {currentStep.type} Step
              </span>
              <h2 className="text-xl font-bold text-white leading-snug" data-testid="step-title">
                {currentStep.title}
              </h2>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-2">
                {currentStep.content}
              </div>

              {/* Collapsible Hint section */}
              {currentStep.hint && (
                <div className="pt-2">
                  {showHint ? (
                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg text-xs text-amber-300 leading-normal flex items-start gap-2 animate-fade-in" data-testid="step-hint-text">
                      <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{currentStep.hint}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      data-testid="btn-show-hint"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Need a hint?
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Status Feedback and Actions */}
            <div className="space-y-4 pt-6 border-t border-slate-850">
              {/* Feedback messages */}
              {statusMsg.type && (
                <div
                  data-testid="step-status-message"
                  className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : statusMsg.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  }`}
                >
                  {statusMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Explanation after step completion */}
              {stepCompleted && currentStep.explanation && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-850 text-xs text-slate-350 leading-relaxed rounded-xl animate-fade-in">
                  <p className="font-bold text-white mb-1">Explanation:</p>
                  <p>{currentStep.explanation}</p>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIdx === 0}
                  data-testid="btn-prev-step"
                  className="px-3.5 py-3 bg-slate-800 hover:bg-slate-750 disabled:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-xl transition-all border border-slate-750"
                  aria-label="Previous Step"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {currentStep.type === 'challenge' && !stepCompleted ? (
                  <button
                    onClick={() => resetStepState(currentStep)}
                    data-testid="btn-reset-step"
                    className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Board
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    disabled={!stepCompleted}
                    data-testid="btn-next-step"
                    className="flex-1 py-3 bg-purple-650 hover:bg-purple-550 disabled:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-650/10"
                  >
                    <span>
                      {currentStepIdx + 1 === steps.length ? 'Complete Lesson' : 'Next Step'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
