import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Award, ArrowLeft, ArrowRight, CheckCircle2, RotateCcw, HelpCircle, Sparkles, ChevronRight } from 'lucide-react';
import ChessBoard from './ChessBoard';
import { soundManager } from '../engine/soundManager';
import supabase from '../services/supabase';

interface LessonStep {
  id: string;
  position: number;
  type: 'theory' | 'challenge' | 'quiz';
  title: string;
  content: string;
  fen: string | null;
  solution_moves: string[] | null;
  hint: string | null;
  explanation: string | null;
  arrows: Array<{ from: string; to: string; color?: string }> | null;
  highlights: Array<{ square: string; color?: string }> | null;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  summary: string;
  xp_reward: number;
  courses: {
    slug: string;
    title: string;
    level: string;
  };
}

export default function LessonPlayer() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [steps, setSteps] = useState<LessonStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board states
  const [boardFen, setBoardFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [moveIndex, setMoveIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [challengeSuccess, setChallengeSuccess] = useState(false);

  // Quiz states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizStatus, setQuizStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [quizDisabledOptions, setQuizDisabledOptions] = useState<string[]>([]);

  // User auth and progress saving
  const [user, setUser] = useState<any>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);

  // Custom board state for ChessBoard component (using Chess.js local states)
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  useEffect(() => {
    async function loadUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    }
    loadUser();
  }, []);

  // Fetch lesson & steps
  useEffect(() => {
    async function fetchLessonData() {
      if (!lessonId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: lessonData, error: lessonErr } = await supabase
          .from('lessons')
          .select('*, courses(slug, title, level)')
          .eq('id', lessonId)
          .single();

        if (lessonErr) throw lessonErr;
        setLesson(lessonData);

        const { data: stepsData, error: stepsErr } = await supabase
          .from('lesson_steps')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('position', { ascending: true });

        if (stepsErr) throw stepsErr;
        setSteps(stepsData || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load lesson.');
      } finally {
        setLoading(false);
      }
    }
    fetchLessonData();
  }, [lessonId]);

  const currentStep = steps[currentStepIdx];

  // Initialize board state whenever current step changes
  useEffect(() => {
    if (!currentStep) return;

    // Reset interaction state
    setMoveIndex(0);
    setAttempts(0);
    setShowHint(false);
    setChallengeSuccess(false);
    setSelectedOption(null);
    setQuizStatus('unanswered');
    setQuizDisabledOptions([]);

    if (currentStep.fen) {
      try {
        chess.load(currentStep.fen);
        setBoardFen(currentStep.fen);
      } catch (err) {
        console.error('Failed to load step FEN:', err);
        chess.reset();
        setBoardFen(chess.fen());
      }
    } else {
      chess.reset();
      setBoardFen(chess.fen());
    }
  }, [currentStepIdx, currentStep, chess]);

  // Derived quiz data
  const quizData = useMemo(() => {
    if (!currentStep || currentStep.type !== 'quiz') return null;
    
    const lines = currentStep.content.split('\n');
    const questionLines: string[] = [];
    const options: { id: string; text: string }[] = [];
    let correctOption = '';

    lines.forEach((line) => {
      const trimmed = line.trim();
      const optionMatch = trimmed.match(/^([A-D])[\)\.]\s*(.*)$/i);
      const correctMatch = trimmed.match(/\[CORRECT:\s*([A-D])\]/i);

      if (optionMatch) {
        options.push({
          id: optionMatch[1].toUpperCase(),
          text: optionMatch[2].trim(),
        });
      } else if (correctMatch) {
        correctOption = correctMatch[1].toUpperCase();
      } else if (!trimmed.startsWith('[CORRECT:')) {
        questionLines.push(line);
      }
    });

    return {
      question: questionLines.join('\n').trim(),
      options,
      correctOption,
    };
  }, [currentStep]);

  // Handle Challenge Opponent Reply
  const playOpponentReply = (nextMoveIdx: number, solutionMoves: string[]) => {
    if (nextMoveIdx < solutionMoves.length) {
      const oppMove = solutionMoves[nextMoveIdx];
      const from = oppMove.substring(0, 2);
      const to = oppMove.substring(2, 4);
      const promotion = oppMove[4] || undefined;

      setTimeout(() => {
        try {
          chess.move({ from, to, promotion });
          setBoardFen(chess.fen());
          soundManager.playMove();

          const nextIndex = nextMoveIdx + 1;
          setMoveIndex(nextIndex);

          if (nextIndex >= solutionMoves.length) {
            setChallengeSuccess(true);
            soundManager.playSuccess();
          }
        } catch (err) {
          console.error('Opponent failed to move:', err);
        }
      }, 600);
    }
  };

  // Handle Board Moves for challenges
  const handleMove = (from: string, to: string) => {
    if (!currentStep || currentStep.type !== 'challenge' || challengeSuccess) return;
    const solutionMoves = currentStep.solution_moves || [];
    
    // Check if it is the user's turn
    if (moveIndex % 2 !== 0) return;

    const expectedMove = solutionMoves[moveIndex];
    if (!expectedMove) return;

    const uci = from + to;

    let moveResult = null;
    try {
      const isPromo = chess.get(from)?.type === 'p' && (to[1] === '8' || to[1] === '1');
      moveResult = chess.move({ from, to, promotion: isPromo ? 'q' : undefined });
    } catch (e) {
      soundManager.playError();
      return;
    }

    if (!moveResult) {
      soundManager.playError();
      return;
    }

    // Undo immediately to check if it's the right move
    chess.undo();

    // Verify UCI match (ignoring promotion suffix in strict comparison if not needed, but check prefix)
    if (uci !== expectedMove.substring(0, 4)) {
      soundManager.playError();
      setAttempts((a) => a + 1);
      // Redraw board to reset piece position
      setBoardFen(chess.fen());
      return;
    }

    // Apply the correct move
    const promo = expectedMove[4] || undefined;
    chess.move({ from, to, promotion: promo });
    setBoardFen(chess.fen());

    if (moveResult.captured) {
      soundManager.playCapture();
    } else {
      soundManager.playMove();
    }

    const nextIdx = moveIndex + 1;
    setMoveIndex(nextIdx);

    if (nextIdx >= solutionMoves.length) {
      setChallengeSuccess(true);
      soundManager.playSuccess();
    } else {
      playOpponentReply(nextIdx, solutionMoves);
    }
  };

  // Handle Quiz Selection
  const handleQuizSelect = (optionId: string) => {
    if (!quizData || quizStatus === 'correct') return;

    setSelectedOption(optionId);
    if (optionId === quizData.correctOption) {
      setQuizStatus('correct');
      soundManager.playSuccess();
    } else {
      setQuizStatus('incorrect');
      setQuizDisabledOptions((prev) => [...prev, optionId]);
      soundManager.playError();
    }
  };

  // Progress Saving Logic
  const handleLessonCompletion = async () => {
    if (!user || !lesson) {
      setLessonCompleted(true);
      return;
    }

    setSavingProgress(true);
    try {
      // 1. Mark lesson complete
      const { error: lessonProgressErr } = await supabase
        .from('user_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          steps_completed: steps.length,
          xp_earned: lesson.xp_reward || 20,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });

      if (lessonProgressErr) throw lessonProgressErr;

      // 2. Fetch all course lessons
      const { data: allLessons, error: lessonsErr } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', lesson.course_id);

      if (lessonsErr) throw lessonsErr;

      // 3. Fetch completed lessons for this course
      const { data: completedLessons, error: completedErr } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', allLessons.map(l => l.id));

      if (completedErr) throw completedErr;

      // 4. If all lessons are completed, complete the course
      if (allLessons.length > 0 && completedLessons.length === allLessons.length) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('xp_reward')
          .eq('id', lesson.course_id)
          .single();

        const { error: courseProgressErr } = await supabase
          .from('user_course_progress')
          .upsert({
            user_id: user.id,
            course_id: lesson.course_id,
            lessons_completed: allLessons.length,
            xp_earned: courseData?.xp_reward || 100,
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' });

        if (courseProgressErr) throw courseProgressErr;
        setCourseCompleted(true);
      }

      setLessonCompleted(true);
    } catch (err) {
      console.error('Error saving progress:', err);
      // Still show completion screen
      setLessonCompleted(true);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((idx) => idx + 1);
    } else {
      handleLessonCompletion();
    }
  };

  const resetChallenge = () => {
    if (!currentStep) return;
    setMoveIndex(0);
    setAttempts(0);
    setShowHint(false);
    setChallengeSuccess(false);
    if (currentStep.fen) {
      chess.load(currentStep.fen);
      setBoardFen(currentStep.fen);
    }
  };

  if (loading) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.loadingPulse}>Loading learning modules...</div>
      </div>
    );
  }

  if (error || !lesson || steps.length === 0) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.errorCard}>
          <h2 style={styles.title}>Failed to load lesson</h2>
          <p style={styles.text}>{error || 'Lesson steps are missing or empty.'}</p>
          <button type="button" onClick={() => navigate('/learn')} style={styles.primaryBtn}>
            Back to Learn Hub
          </button>
        </div>
      </div>
    );
  }

  // Completion Splash screen
  if (lessonCompleted) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.completionCard}>
          <Award size={64} color="#d4af37" style={{ marginBottom: 16 }} />
          <h1 style={styles.serifHeading}>Lesson Completed!</h1>
          <h2 style={styles.lessonTitle}>{lesson.title}</h2>
          
          <div style={styles.rewardsBox}>
            <div style={styles.rewardItem}>
              <Sparkles size={20} color="#d4af37" />
              <span>+{lesson.xp_reward || 20} Lesson XP Earned</span>
            </div>
            {courseCompleted && (
              <div style={styles.rewardItem}>
                <Award size={20} color="#22c55e" />
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                  Course Completed! Bonus XP Awarded!
                </span>
              </div>
            )}
          </div>

          <div style={styles.completionActions}>
            <button
              type="button"
              onClick={() => navigate(`/learn/${lesson.courses.slug}`)}
              style={styles.primaryBtn}
            >
              Continue to Course
            </button>
            <button
              type="button"
              onClick={() => navigate('/learn')}
              style={styles.secondaryBtn}
            >
              Learn Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active step navigation helpers
  const isTheory = currentStep.type === 'theory';
  const isChallenge = currentStep.type === 'challenge';
  const isQuiz = currentStep.type === 'quiz';

  const canContinue = 
    isTheory || 
    (isChallenge && challengeSuccess) || 
    (isQuiz && quizStatus === 'correct');

  // Custom game state dummy object to pass to ChessBoard
  const customBoardState = {
    fen: boardFen,
    selectedSquare: null,
    validMoves: [],
    lastMove: null,
    checkSquare: null,
    showCoords: true,
    playerColor: 'w',
    promotionPending: null,
    animationsEnabled: true,
    history: [],
    hintSquares: null,
    boardFlipped: false,
    reviewFen: null,
    isAIThinking: false,
    errorSquare: null
  };

  return (
    <div style={styles.playerLayout}>
      {/* Top Header Navigation */}
      <div style={styles.header}>
        <button
          type="button"
          onClick={() => navigate(`/learn/${lesson.courses.slug}`)}
          style={styles.backBtn}
        >
          <ArrowLeft size={18} /> Exit Lesson
        </button>
        <div style={styles.headerTitleBox}>
          <div style={styles.courseTag}>{lesson.courses.title}</div>
          <div style={styles.headerLessonTitle}>{lesson.title}</div>
        </div>
        <div style={styles.progressContainer}>
          <div style={styles.progressLabel}>
            Step {currentStepIdx + 1} of {steps.length}
          </div>
          <div style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${((currentStepIdx + 1) / steps.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main split work space */}
      <div style={styles.workspace}>
        {/* Left Side: Chess Board */}
        <div style={styles.boardWrapper}>
          <div style={styles.boardContainer}>
            <ChessBoard
              customState={customBoardState}
              readOnly={!isChallenge || challengeSuccess}
              arrows={currentStep.arrows}
              highlights={currentStep.highlights}
              onMove={handleMove}
            />
          </div>
        </div>

        {/* Right Side: Instructions & Content */}
        <div style={styles.contentPanel}>
          <div style={styles.contentScroll}>
            {/* Step badge */}
            <div style={styles.stepBadge}>
              {currentStep.type.toUpperCase()}
            </div>

            <h2 style={styles.stepTitle}>{currentStep.title}</h2>

            {/* Markdown instruction content */}
            <div style={styles.markdownBody}>
              {isQuiz && quizData ? (
                <div style={styles.quizQuestion}>
                  <ReactMarkdown>{quizData.question}</ReactMarkdown>
                </div>
              ) : (
                <ReactMarkdown>{currentStep.content}</ReactMarkdown>
              )}
            </div>

            {/* Render challenge helper elements */}
            {isChallenge && (
              <div style={styles.challengeBox}>
                {challengeSuccess ? (
                  <div style={styles.successMessage}>
                    <CheckCircle2 size={20} color="#22c55e" />
                    <span>Solved! Correct moves played.</span>
                  </div>
                ) : (
                  <div style={styles.challengeMeta}>
                    <div style={styles.failsCounter}>Attempts: {attempts}</div>
                    {attempts >= 3 && !showHint && currentStep.hint && (
                      <button
                        type="button"
                        onClick={() => setShowHint(true)}
                        style={styles.hintLink}
                      >
                        <HelpCircle size={16} /> Need a hint?
                      </button>
                    )}
                    {showHint && currentStep.hint && (
                      <div style={styles.hintBox}>
                        <strong>Hint:</strong> {currentStep.hint}
                      </div>
                    )}
                  </div>
                )}

                {/* Challenge Reset Option */}
                {!challengeSuccess && attempts > 0 && (
                  <button onClick={resetChallenge} style={styles.resetBtn}>
                    <RotateCcw size={14} /> Retry challenge
                  </button>
                )}
              </div>
            )}

            {/* Render Quiz Options */}
            {isQuiz && quizData && (
              <div style={styles.quizBox}>
                <div style={styles.optionsList}>
                  {quizData.options.map((option) => {
                    const isSelected = selectedOption === option.id;
                    const isDisabled = quizDisabledOptions.includes(option.id);
                    const isCorrect = option.id === quizData.correctOption;

                    let btnStyle = { ...styles.quizOptionBtn };
                    if (isSelected && isCorrect) {
                      btnStyle = { ...btnStyle, ...styles.quizCorrectBtn };
                    } else if (isSelected && !isCorrect) {
                      btnStyle = { ...btnStyle, ...styles.quizIncorrectBtn };
                    } else if (isDisabled) {
                      btnStyle = { ...btnStyle, ...styles.quizDisabledBtn };
                    }

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleQuizSelect(option.id)}
                        disabled={isDisabled || quizStatus === 'correct'}
                        style={btnStyle}
                      >
                        <span style={styles.optionLetter}>{option.id}</span>
                        <span style={styles.optionText}>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explanations shown once completed */}
            {canContinue && (currentStep.explanation || (isQuiz && quizStatus === 'correct' && currentStep.explanation)) && (
              <div style={styles.explanationBox}>
                <h4 style={styles.explanationHeader}>Explanation</h4>
                <div style={styles.explanationText}>
                  <ReactMarkdown>{currentStep.explanation}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div style={styles.controlsBar}>
            {canContinue ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={savingProgress}
                style={styles.continueBtn}
              >
                {savingProgress ? 'Saving progress...' : (
                  <>
                    Continue <ChevronRight size={18} />
                  </>
                )}
              </button>
            ) : (
              <div style={styles.waitingMessage}>
                {isChallenge ? 'Solve the challenge to continue' : 'Select the correct answer to continue'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fullscreenCenter: {
    minHeight: '100vh',
    background: '#080710',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  loadingPulse: {
    fontSize: '18px',
    color: '#a0aec0',
  },
  errorCard: {
    background: '#151421',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    maxWidth: '400px',
  },
  title: {
    fontSize: '20px',
    marginBottom: '12px',
    color: '#ef4444',
  },
  text: {
    color: '#a0aec0',
    fontSize: '14px',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  completionCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '48px 32px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  serifHeading: {
    fontFamily: 'Cinzel, Georgia, serif',
    color: '#d4af37',
    fontSize: '2.5rem',
    fontWeight: 'normal',
    marginBottom: '8px',
  },
  lessonTitle: {
    fontSize: '18px',
    color: '#f8fafc',
    marginBottom: '24px',
    fontWeight: '500',
  },
  rewardsBox: {
    background: '#13111f',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '20px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  rewardItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#e2e8f0',
  },
  completionActions: {
    display: 'flex',
    gap: '16px',
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8416 100%)',
    color: '#080710',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
  secondaryBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  playerLayout: {
    height: '100vh',
    background: '#06060c',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    height: '64px',
    background: '#0c0b14',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 10,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  headerTitleBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  courseTag: {
    fontSize: '10px',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },
  headerLessonTitle: {
    fontSize: '15px',
    color: '#f8fafc',
    fontWeight: 'bold',
    marginTop: '2px',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '180px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#a0aec0',
    marginBottom: '6px',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    background: '#1a1926',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #d4af37, #f5e050)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  boardWrapper: {
    flex: '1.2',
    background: '#08070d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  boardContainer: {
    width: '100%',
    maxWidth: '560px',
    aspectRatio: '1',
  },
  contentPanel: {
    flex: '1',
    background: '#0d0c15',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  contentScroll: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  stepBadge: {
    alignSelf: 'flex-start',
    background: 'rgba(212, 175, 55, 0.12)',
    color: '#d4af37',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '4px 10px',
    letterSpacing: '1px',
  },
  stepTitle: {
    fontFamily: 'Cinzel, Georgia, serif',
    fontSize: '24px',
    color: '#f8fafc',
  },
  markdownBody: {
    color: '#cbd5e1',
    lineHeight: '1.6',
    fontSize: '15px',
  },
  challengeBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  challengeMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  failsCounter: {
    fontSize: '13px',
    color: '#a0aec0',
  },
  hintLink: {
    background: 'none',
    border: 'none',
    color: '#d4af37',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: 0,
    width: 'fit-content',
    fontWeight: '500',
  },
  hintBox: {
    background: 'rgba(212, 175, 55, 0.08)',
    border: '1px dashed rgba(212, 175, 55, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#4ade80',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  resetBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#cbd5e1',
    fontSize: '12px',
    padding: '6px 12px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  quizBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quizQuestion: {
    fontWeight: '500',
    color: '#f8fafc',
    fontSize: '16px',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quizOptionBtn: {
    background: '#151421',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    color: '#cbd5e1',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    gap: '14px',
    fontSize: '15px',
    transition: 'all 0.15s ease',
  },
  optionLetter: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#f8fafc',
  },
  optionText: {
    flex: 1,
    lineHeight: '1.4',
  },
  quizCorrectBtn: {
    borderColor: '#22c55e',
    background: 'rgba(34, 197, 94, 0.08)',
    color: '#4ade80',
  },
  quizIncorrectBtn: {
    borderColor: '#ef4444',
    background: 'rgba(239, 68, 68, 0.08)',
    color: '#fca5a5',
  },
  quizDisabledBtn: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  explanationBox: {
    background: '#100f1a',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '16px 20px',
    marginTop: '12px',
  },
  explanationHeader: {
    color: '#d4af37',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  explanationText: {
    fontSize: '13.5px',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  controlsBar: {
    height: '80px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 32px',
    background: '#0c0b14',
  },
  continueBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8416 100%)',
    color: '#080710',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'transform 0.15s',
  },
  waitingMessage: {
    color: '#718096',
    fontSize: '14px',
    fontStyle: 'italic',
  }
};
