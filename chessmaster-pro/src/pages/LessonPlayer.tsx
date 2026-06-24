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
      } catch (e) {
        console.warn(e)
      }
      return
    }

    const expectedMove = movesList[solutionMoveIdx]
    const playerMoveStr = `${move.from}${move.to}`

    if (playerMoveStr.toLowerCase() === expectedMove.toLowerCase().slice(0, 4)) {
      // Correct player move!
      try {
        const game = new Chess(boardPosition)
        const res = game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || 'q',
        })

        if (res) {
          const nextFen = game.fen()
          setBoardPosition(nextFen)
          const nextIdx = solutionMoveIdx + 1

          if (nextIdx >= movesList.length) {
            // Completed step!
            setStepCompleted(true)
            setStatusMsg({ text: 'Correct! Well done.', type: 'success' })
            triggerStepCompletionInDB()
          } else {
            // Opponent move (next move in the sequence)
            const oppMove = movesList[nextIdx]
            const oppFrom = oppMove.slice(0, 2)
            const oppTo = oppMove.slice(2, 4)
            const oppPromo = oppMove.slice(4, 5) || undefined

            setTimeout(() => {
              try {
                const oppRes = game.move({ from: oppFrom, to: oppTo, promotion: oppPromo })
                if (oppRes) {
                  setBoardPosition(game.fen())
                  const finalIdx = nextIdx + 1
                  setSolutionMoveIdx(finalIdx)

                  if (finalIdx >= movesList.length) {
                    setStepCompleted(true)
                    setStatusMsg({ text: 'Correct! Well done.', type: 'success' })
                    triggerStepCompletionInDB()
                  } else {
                    setStatusMsg({ text: 'Good move! What is the follow-up?', type: 'info' })
                  }
                }
              } catch (err) {
                console.error('Opponent auto response error:', err)
              }
            }, 600)
          }
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      // Wrong move
      setStatusMsg({ text: 'Incorrect move. Try again!', type: 'error' })
    }
  }

  const triggerStepCompletionInDB = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !lessonId || !currentStep) return

      await supabase.from('lesson_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        step_id: currentStep.id,
        completed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Failed to save lesson progress:', err)
    }
  }

  const handleNextStep = () => {
    if (currentStepIdx + 1 < steps.length) {
      const nextIdx = currentStepIdx + 1
      setCurrentStepIdx(nextIdx)
      resetStepState(steps[nextIdx])
    } else {
      // Completed the entire lesson
      setLessonFinished(true)
    }
  }

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const nextIdx = currentStepIdx - 1
      setCurrentStepIdx(nextIdx)
      resetStepState(steps[nextIdx])
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-10 h-10 border-4 border-chess-green border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#bababa] text-sm font-bold">Loading Lesson Player...</p>
      </div>
    )
  }

  if (!course || !lesson || steps.length === 0 || !currentStep) {
    return (
      <div className="text-center py-12 max-w-md mx-auto space-y-4">
        <HelpCircle className="w-12 h-12 text-[#bababa]/30 mx-auto" />
        <p className="text-[#bababa] font-bold text-sm">Failed to load lesson position data.</p>
        <button
          onClick={() => navigate('/courses')}
          className="chess-btn-grey px-4 py-2 rounded-lg text-xs text-white"
        >
          Return to Courses
        </button>
      </div>
    )
  }

  // Lesson finished congratulations screen
  if (lessonFinished) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-8 bg-chess-dark border border-[#3c3a37] rounded-xl p-8 shadow-2xl">
        <DocumentTitle title="Lesson Completed" description="Congratulations on completing this Chess Academy lesson!" />

        <div className="inline-flex p-6 rounded-xl bg-chess-darker text-chess-green border border-[#3c3a37] shadow shadow-chess-green/5">
          <Award className="w-16 h-16" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">Lesson Completed!</h1>
          <p className="text-[#bababa] text-sm leading-relaxed">
            Congratulations! You completed all the interactive challenges for **{lesson.title}**.
          </p>
          <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-chess-darker border border-[#3c3a37] rounded-full text-chess-green font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" /> +20 XP Earned
          </div>
        </div>

        {!session && (
          <div className="bg-chess-darker border border-[#3c3a37] p-4 rounded-xl flex items-center justify-between gap-4 text-left shadow-inner">
            <div className="space-y-1">
              <p className="text-white text-xs font-bold flex items-center gap-1">
                <LogIn className="w-3.5 h-3.5 text-chess-green" /> Save Progress Permanently
              </p>
              <p className="text-[#bababa] text-[10px] leading-normal">
                Your progress is saved locally, but sign in or create an account to sync it permanently.
              </p>
            </div>
            <Link
              to="/play/online"
              className="chess-btn-green py-2 px-3 rounded-lg text-xs"
            >
              Sign In
            </Link>
          </div>
        )}

        <div>
          <button
            onClick={() => navigate(`/courses/${course.id}`)}
            data-testid="btn-lesson-finished-continue"
            className="chess-btn-green w-full py-3.5 rounded-xl text-sm"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3c3a37]/50 pb-4">
        <div className="space-y-1">
          <Link
            to={`/courses/${course.id}`}
            data-testid="btn-lesson-back"
            aria-label={`Back to ${course.title}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#bababa] hover:text-white font-bold transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> {course.title}
          </Link>
          <h1 className="text-2xl font-black text-white leading-tight">{lesson.title}</h1>
        </div>

        {/* Steps Progress Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#bababa] font-bold font-mono">
            Step {currentStepIdx + 1} of {steps.length}
          </span>
          <div className="flex gap-1.5">
            {steps.map((_, idx) => {
              const isCurrent = idx === currentStepIdx
              const isCompleted = idx < currentStepIdx || (idx === currentStepIdx && stepCompleted)
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                    isCompleted
                      ? 'bg-chess-green shadow'
                      : isCurrent
                        ? 'bg-chess-green ring-2 ring-white scale-110'
                        : 'bg-chess-darker border border-[#3c3a37]'
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Player Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
          <div className="bg-chess-dark border border-[#3c3a37] rounded-xl p-6 flex flex-col min-h-[380px] justify-between shadow-lg">
            {/* Step Content */}
            <div className="space-y-4">
              <span className="px-3 py-0.5 text-[9px] bg-chess-darker border border-[#3c3a37] text-chess-green rounded-full font-bold uppercase tracking-wider">
                {currentStep.type} Step
              </span>
              <h2 className="text-xl font-black text-white leading-snug" data-testid="step-title">
                {currentStep.title}
              </h2>
              <div className="text-[#bababa] text-xs leading-relaxed whitespace-pre-line space-y-2 font-medium">
                {currentStep.content}
              </div>

              {/* Collapsible Hint section */}
              {currentStep.hint && (
                <div className="pt-2">
                  {showHint ? (
                    <div className="p-3 bg-chess-darker border border-[#3c3a37] rounded-lg text-xs text-amber-500 leading-normal flex items-start gap-2 shadow-inner" data-testid="step-hint-text">
                      <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="font-bold">{currentStep.hint}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      data-testid="btn-show-hint"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-bold transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Need a hint?
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Status Feedback and Actions */}
            <div className="space-y-4 pt-6 border-t border-[#3c3a37]">
              {/* Feedback messages */}
              {statusMsg.type && (
                <div
                  data-testid="step-status-message"
                  className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    statusMsg.type === 'success'
                      ? 'bg-chess-green/10 border border-chess-green/20 text-chess-green'
                      : statusMsg.type === 'error'
                        ? 'bg-red-955/15 border border-red-500/20 text-red-400'
                        : 'bg-chess-darker border border-[#3c3a37] text-white'
                  }`}
                >
                  {statusMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Explanation after step completion */}
              {stepCompleted && currentStep.explanation && (
                <div className="p-3.5 bg-chess-darker border border-[#3c3a37] text-xs text-[#bababa] leading-relaxed rounded-xl shadow-inner font-medium">
                  <p className="font-black text-white mb-1">Explanation:</p>
                  <p>{currentStep.explanation}</p>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIdx === 0}
                  data-testid="btn-prev-step"
                  className="px-3.5 py-3 bg-[#3c3a37] hover:bg-[#4b4845] disabled:bg-chess-darker disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-xl transition-all border border-[#2b2927]"
                  aria-label="Previous Step"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {currentStep.type === 'challenge' && !stepCompleted ? (
                  <button
                    onClick={() => resetStepState(currentStep)}
                    data-testid="btn-reset-step"
                    className="flex-1 py-3 bg-[#3c3a37] hover:bg-[#4b4845] border border-[#2b2927] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-chess-green" /> Reset Board
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    disabled={!stepCompleted}
                    data-testid="btn-next-step"
                    className="chess-btn-green flex-1 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-45"
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
