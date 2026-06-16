import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, Play, Coins } from 'lucide-react';
import PageShell from '../../components/PageShell';
import supabase from '../../services/supabase';

interface Course {
  id: string;
  slug: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  lesson_count: number;
}

export default function GenerateLesson() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    lesson_id: string;
    title: string;
    summary: string;
    stepCount: number;
  } | null>(null);

  // Authentication & Role Check
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('You must be logged in.');
          setCheckingAuth(false);
          return;
        }

        const { data, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userError || !data || data.role !== 'admin') {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (err: any) {
        console.error('Error checking admin auth:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkRole();
  }, []);

  // Fetch courses
  useEffect(() => {
    if (!isAdmin) return;

    async function fetchCourses() {
      try {
        const { data, error: courseErr } = await supabase
          .from('courses')
          .select('id, slug, title, level, category, lesson_count')
          .order('level', { ascending: true })
          .order('title', { ascending: true });

        if (courseErr) throw courseErr;
        if (data) {
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourseId(data[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load courses.');
      }
    }
    fetchCourses();
  }, [isAdmin]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !topic.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessResult(null);

    const selectedCourse = courses.find(c => c.id === selectedCourseId);
    if (!selectedCourse) {
      setError('Selected course not found.');
      setLoading(false);
      return;
    }

    try {
      // Invoke the Edge Function via the Supabase Client
      const { data, error: functionError } = await supabase.functions.invoke('generate-lesson', {
        body: {
          course_id: selectedCourseId,
          topic: topic.trim(),
          level: selectedCourse.level,
          category: selectedCourse.category,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Error executing AI generation.');
      }

      if (data && data.success) {
        setSuccessResult({
          lesson_id: data.lesson_id,
          title: data.title,
          summary: data.summary,
          stepCount: data.stepCount,
        });
        setTopic(''); // Reset input
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('An unknown error occurred during generation.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate lesson.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <PageShell>
        <div style={styles.container}>
          <div style={styles.loadingPulse}>Checking admin authorization...</div>
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div style={styles.container}>
          <div style={styles.unauthorizedCard}>
            <AlertCircle size={48} color="#ef4444" />
            <h1 style={styles.serifHeading}>Access Denied</h1>
            <p style={styles.text}>You must be logged in as an administrator to access the AI lesson builder.</p>
            <button type="button" onClick={() => navigate('/')} style={styles.backBtn}>
              Return Home
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <PageShell>
      <div style={styles.container}>
        <div style={styles.header}>
          <button type="button" onClick={() => navigate('/learn')} style={styles.backLink}>
            <ArrowLeft size={16} /> Back to Learn Hub
          </button>
          <h1 style={styles.serifHeading}>AI Lesson Builder</h1>
          <p style={styles.subtitle}>Automatically generate interactive theory and challenges using Claude 3.5 Sonnet</p>
        </div>

        <div style={styles.grid}>
          {/* Controls Panel */}
          <div style={styles.glassCard}>
            <h2 style={styles.panelTitle}>
              <Sparkles size={20} color="#d4af37" /> Generation Parameters
            </h2>
            <form onSubmit={handleGenerate} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Target Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={styles.select}
                  disabled={loading}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.level.toUpperCase()} • {course.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Lesson Topic / Sub-Concept</label>
                <input
                  type="text"
                  placeholder="e.g., Back-rank mating patterns, Knight forks on c7..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={styles.input}
                  required
                  disabled={loading}
                />
                <span style={styles.inputTip}>
                  Be specific for better results. Specify the exact tactical trick, mating pattern, or opening line.
                </span>
              </div>

              {/* Estimate Cost indicator */}
              <div style={styles.costBox}>
                <Coins size={16} color="#d4af37" />
                <div style={styles.costText}>
                  <strong>Estimated run cost:</strong> ~$0.02 - $0.05
                  <div style={styles.costSub}>Uses ~2,000 output tokens of Claude 3.5 Sonnet</div>
                </div>
              </div>

              {error && (
                <div style={styles.errorAlert}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" style={styles.generateBtn} disabled={loading || !topic.trim()}>
                {loading ? (
                  <>
                    <div style={styles.spinner}></div> Generating Chess Lesson...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate & Publish Lesson
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results / Help Panel */}
          <div style={styles.glassCard}>
            {successResult ? (
              <div style={styles.successPanel}>
                <CheckCircle2 size={48} color="#22c55e" />
                <h3 style={styles.successTitle}>Lesson Generated Successfully!</h3>
                <div style={styles.successDetails}>
                  <p><strong>Title:</strong> {successResult.title}</p>
                  <p style={{ marginTop: 4 }}><strong>Summary:</strong> {successResult.summary}</p>
                  <p style={{ marginTop: 4 }}><strong>Created Steps:</strong> {successResult.stepCount} slides (Theory + Challenges + Quizzes)</p>
                </div>
                <div style={styles.actionGroup}>
                  <button
                    type="button"
                    onClick={() => navigate(`/learn/${selectedCourse?.slug}/${successResult.lesson_id}`)}
                    style={styles.playBtn}
                  >
                    <Play size={16} fill="white" /> Launch & Test Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuccessResult(null)}
                    style={styles.secondaryBtn}
                  >
                    Build Another
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.infoPanel}>
                <BookOpen size={40} color="#6b7280" />
                <h3 style={styles.infoTitle}>What happens next?</h3>
                <ul style={styles.infoList}>
                  <li>The generator will formulate a short theory slide with explanatory FEN layouts.</li>
                  <li>Claude will draw illustrative arrow highlights on the chessboard representing piece lines.</li>
                  <li>An interactive challenge will be created, verifying players make the correct moves.</li>
                  <li>A multiple-choice quiz will test critical decision points.</li>
                  <li>The lesson is published instantly at the end of the course sequence.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#080710',
    color: '#e2e8f0',
    padding: '40px 24px 100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: '1100px',
    marginBottom: '32px',
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: 0,
    marginBottom: '16px',
    transition: 'color 0.2s',
  },
  serifHeading: {
    fontFamily: 'Cinzel, Georgia, serif',
    color: '#d4af37',
    fontSize: '2.5rem',
    fontWeight: 'normal',
    letterSpacing: '0.5px',
  },
  subtitle: {
    color: '#a0aec0',
    fontSize: '16px',
    marginTop: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
    width: '100%',
    maxWidth: '1100px',
  },
  glassCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    display: 'flex',
    flexDirection: 'column',
  },
  panelTitle: {
    fontSize: '20px',
    color: '#f8fafc',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '12px',
    fontFamily: 'Cinzel, Georgia, serif',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: '500',
  },
  select: {
    background: '#151421',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
  },
  input: {
    background: '#151421',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    color: '#e2e8f0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputTip: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  costBox: {
    display: 'flex',
    gap: '12px',
    background: 'rgba(212, 175, 55, 0.08)',
    border: '1px dashed rgba(212, 175, 55, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    alignItems: 'flex-start',
  },
  costText: {
    fontSize: '13px',
    color: '#e2e8f0',
    lineHeight: '1.4',
  },
  costSub: {
    fontSize: '11px',
    color: '#a0aec0',
    marginTop: '2px',
  },
  generateBtn: {
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
    gap: '8px',
    transition: 'transform 0.15s, opacity 0.2s',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '3px solid rgba(8, 7, 16, 0.2)',
    borderTop: '3px solid #080710',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
  },
  infoPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
    color: '#a0aec0',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '18px',
    color: '#f8fafc',
    marginTop: '16px',
    marginBottom: '16px',
  },
  infoList: {
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '400px',
  },
  successPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  },
  successTitle: {
    fontSize: '20px',
    color: '#f8fafc',
    marginTop: '16px',
    marginBottom: '16px',
  },
  successDetails: {
    background: '#151421',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'left',
    width: '100%',
    fontSize: '14px',
    marginBottom: '24px',
    color: '#cbd5e1',
  },
  actionGroup: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  playBtn: {
    flex: 1,
    background: '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  secondaryBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  unauthorizedCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    background: 'none',
    border: '1px solid rgba(212, 175, 55, 0.5)',
    borderRadius: '8px',
    padding: '10px 24px',
    color: '#d4af37',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '12px',
  },
  loadingPulse: {
    fontSize: '16px',
    color: '#a0aec0',
  },
  text: {
    fontSize: '14px',
    color: '#cbd5e1',
  }
};
