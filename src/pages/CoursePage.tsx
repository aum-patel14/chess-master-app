import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Award, CheckCircle2, Lock, Play, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import PageShell from '../components/PageShell';
import supabase from '../services/supabase';

interface Lesson {
  id: string;
  position: number;
  title: string;
  summary: string;
  xp_reward: number;
  completed?: boolean;
  unlocked?: boolean;
}

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  thumbnail_emoji: string;
  xp_reward: number;
  estimated_minutes: number;
  lesson_count: number;
}

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadCourseAndLessons() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        // 1. Fetch Course details
        const { data: courseData, error: courseErr } = await supabase
          .from('courses')
          .select('*')
          .eq('slug', slug)
          .single();

        if (courseErr) throw courseErr;
        setCourse(courseData);

        // 2. Fetch Lessons
        const { data: lessonsData, error: lessonsErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseData.id)
          .order('position', { ascending: true });

        if (lessonsErr) throw lessonsErr;

        let completedLessonIds = new Set<string>();

        // 3. Fetch user's completion progress if logged in
        if (currentUser) {
          const { data: progressData } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', currentUser.id)
            .eq('completed', true);

          if (progressData) {
            progressData.forEach(p => completedLessonIds.add(p.lesson_id));
          }
        }

        // 4. Map unlocked state based on linear sequence logic
        const lessonsWithStatus = (lessonsData || []).map((lesson, idx) => {
          const completed = completedLessonIds.has(lesson.id);
          
          // Unlocked if first lesson, or if the previous lesson was completed
          let unlocked = true;
          if (idx > 0) {
            const prevLesson = lessonsData[idx - 1];
            unlocked = completedLessonIds.has(prevLesson.id);
          }

          return {
            id: lesson.id,
            position: lesson.position,
            title: lesson.title,
            summary: lesson.summary,
            xp_reward: lesson.xp_reward,
            completed,
            unlocked
          };
        });

        setLessons(lessonsWithStatus);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load course detail.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadCourseAndLessons();
    }
  }, [slug]);

  if (loading) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.spinner}></div>
        <span style={{ color: '#a0aec0', marginTop: 12 }}>Loading course structure...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={styles.fullscreenCenter}>
        <div style={styles.errorCard}>
          <h2 style={styles.title}>Failed to load course</h2>
          <p style={styles.text}>{error || 'Course not found.'}</p>
          <button type="button" onClick={() => navigate('/learn')} style={styles.primaryBtn}>
            Back to Learn Hub
          </button>
        </div>
      </div>
    );
  }

  // Find next lesson to study
  const nextLesson = lessons.find(l => l.unlocked && !l.completed) || lessons[0];

  return (
    <PageShell>
      <div style={styles.container}>
        {/* Navigation Breadcrumb */}
        <div style={styles.breadcrumbBox}>
          <button type="button" onClick={() => navigate('/learn')} style={styles.backBtn}>
            <ArrowLeft size={16} /> Back to Learn Hub
          </button>
        </div>

        {/* Hero Section */}
        <div style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={styles.largeEmoji}>{course.thumbnail_emoji}</div>
            <div style={styles.heroMeta}>
              <div style={styles.tagRow}>
                <span style={{
                  ...styles.levelBadge,
                  ...styles[`level_${course.level}` as any]
                }}>
                  {course.level.toUpperCase()}
                </span>
                <span style={styles.categoryLabel}>{course.category}</span>
              </div>
              <h1 style={styles.serifHeading}>{course.title}</h1>
              <p style={styles.description}>{course.description}</p>
              
              <div style={styles.statsRow}>
                <div style={styles.statItem}>
                  <BookOpen size={16} color="#d4af37" />
                  <span>{course.lesson_count} lessons</span>
                </div>
                <div style={styles.statItem}>
                  <Clock size={16} color="#3b82f6" />
                  <span>{course.estimated_minutes} mins duration</span>
                </div>
                <div style={styles.statItem}>
                  <Sparkles size={16} color="#22c55e" />
                  <span>{course.xp_reward} XP Reward</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.heroRight}>
            {nextLesson && (
              <button
                type="button"
                onClick={() => navigate(`/learn/${course.slug}/${nextLesson.id}`)}
                style={styles.ctaBtn}
              >
                <Play size={18} fill="black" /> 
                {lessons.some(l => l.completed) ? 'Continue Course' : 'Start Course'}
              </button>
            )}
          </div>
        </div>

        {/* Lessons List Section */}
        <div style={styles.lessonsSection}>
          <h2 style={styles.sectionHeading}>Lessons Sequence</h2>
          
          <div style={styles.lessonsList}>
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                style={{
                  ...styles.lessonRow,
                  ...(!lesson.unlocked ? styles.lessonRowLocked : {}),
                }}
              >
                {/* Position / Lock status icon */}
                <div style={styles.statusCol}>
                  {lesson.completed ? (
                    <div style={styles.completeIcon}>
                      <CheckCircle2 size={22} color="#22c55e" fill="#0d0c15" />
                    </div>
                  ) : !lesson.unlocked ? (
                    <div style={styles.lockIcon}>
                      <Lock size={16} color="#ef4444" />
                    </div>
                  ) : (
                    <div style={styles.unlockedPos}>{idx + 1}</div>
                  )}
                </div>

                {/* Info Column */}
                <div style={styles.infoCol}>
                  <h3 style={{
                    ...styles.lessonTitle,
                    ...(!lesson.unlocked ? styles.lessonTextLocked : {}),
                  }}>
                    {lesson.title}
                  </h3>
                  <p style={styles.lessonSummary}>{lesson.summary}</p>
                </div>

                {/* Actions column */}
                <div style={styles.actionCol}>
                  <div style={styles.lessonXp}>+{lesson.xp_reward} XP</div>
                  {lesson.unlocked && (
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/${course.slug}/${lesson.id}`)}
                      style={{
                        ...styles.rowPlayBtn,
                        ...(lesson.completed ? styles.rowReplayBtn : {}),
                      }}
                    >
                      {lesson.completed ? 'Review' : <Play size={12} fill="white" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
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
    gap: '32px',
  },
  fullscreenCenter: {
    minHeight: '100vh',
    background: '#080710',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid rgba(212, 175, 55, 0.15)',
    borderTop: '4px solid #d4af37',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
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
  primaryBtn: {
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8416 100%)',
    color: '#080710',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
  },
  breadcrumbBox: {
    width: '100%',
    maxWidth: '900px',
    textAlign: 'left',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#a0aec0',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: 0,
    fontWeight: '500',
  },
  heroCard: {
    width: '100%',
    maxWidth: '900px',
    background: 'rgba(255, 255, 255, 0.02)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '24px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
  },
  heroLeft: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    flex: '1',
    minWidth: '280px',
  },
  largeEmoji: {
    fontSize: '64px',
    background: '#13111f',
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  heroMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  levelBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  level_beginner: {
    background: 'rgba(74, 222, 128, 0.1)',
    color: '#4ade80',
  },
  level_intermediate: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
  },
  level_advanced: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
  },
  categoryLabel: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'capitalize',
  },
  serifHeading: {
    fontFamily: 'Cinzel, Georgia, serif',
    color: '#d4af37',
    fontSize: '2rem',
    fontWeight: 'normal',
  },
  description: {
    color: '#a0aec0',
    fontSize: '14.5px',
    lineHeight: '1.6',
  },
  statsRow: {
    display: 'flex',
    gap: '20px',
    marginTop: '4px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#e2e8f0',
  },
  heroRight: {
    display: 'flex',
    alignItems: 'center',
  },
  ctaBtn: {
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8416 100%)',
    color: '#080710',
    border: 'none',
    borderRadius: '8px',
    padding: '16px 28px',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 15px rgba(212,175,55,0.25)',
  },
  lessonsSection: {
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeading: {
    fontFamily: 'Cinzel, Georgia, serif',
    fontSize: '22px',
    color: '#f8fafc',
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '100%',
  },
  lessonRow: {
    background: '#0d0c15',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.15s ease',
  },
  lessonRowLocked: {
    opacity: 0.45,
  },
  statusCol: {
    width: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeIcon: {
    display: 'flex',
  },
  lockIcon: {
    display: 'flex',
  },
  unlockedPos: {
    fontSize: '15px',
    color: '#718096',
    fontWeight: 'bold',
  },
  infoCol: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  lessonTitle: {
    fontSize: '16px',
    color: '#f8fafc',
    fontWeight: '600',
  },
  lessonTextLocked: {
    color: '#a0aec0',
  },
  lessonSummary: {
    fontSize: '13.5px',
    color: '#718096',
    lineHeight: '1.4',
  },
  actionCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  lessonXp: {
    fontSize: '13px',
    color: '#d4af37',
    fontWeight: '500',
  },
  rowPlayBtn: {
    background: '#1a1926',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': {
      background: '#d4af37',
      color: '#080710',
      borderColor: '#d4af37',
    }
  },
  rowReplayBtn: {
    borderRadius: '20px',
    width: 'auto',
    height: 'auto',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 'bold',
  }
};
