import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Award, CheckCircle2, Lock, Sparkles, Filter, ChevronRight, Bookmark } from 'lucide-react';
import PageShell from '../components/PageShell';
import supabase from '../services/supabase';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  thumbnail_emoji: string;
  xp_reward: number;
  lesson_count: number;
  estimated_minutes: number;
  progressPercent?: number;
}

export default function LearnHub() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User details & stats
  const [user, setUser] = useState<any>(null);
  const [userElo, setUserElo] = useState(1200);
  const [totalXp, setTotalXp] = useState(0);
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState(0);
  const [coursesCompletedCount, setCoursesCompletedCount] = useState(0);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics' },
    { id: 'fundamentals', name: 'Fundamentals' },
    { id: 'tactics', name: 'Tactics' },
    { id: 'openings', name: 'Openings' },
    { id: 'strategy', name: 'Strategy' },
    { id: 'endgames', name: 'Endgames' },
  ];

  const levels = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ];

  useEffect(() => {
    async function loadLearningHub() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        let currentElo = 1200;
        let lessonProgressMap = new Map<string, number>();
        let completedLessonsSet = new Set<string>();
        let completedCoursesSet = new Set<string>();
        let totalLessonXp = 0;
        let totalCourseXp = 0;

        if (currentUser) {
          // 1. Fetch ELO
          const { data: ratingData } = await supabase
            .from('puzzle_ratings')
            .select('rating')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (ratingData) {
            currentElo = ratingData.rating || 1200;
          }
          setUserElo(currentElo);

          // 2. Fetch Lesson Progress
          const { data: lessonProgressData } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id, completed, xp_earned')
            .eq('user_id', currentUser.id);

          if (lessonProgressData) {
            lessonProgressData.forEach((progress) => {
              totalLessonXp += progress.xp_earned || 0;
              if (progress.completed) {
                completedLessonsSet.add(progress.lesson_id);
              }
            });
            setLessonsCompletedCount(completedLessonsSet.size);
          }

          // 3. Fetch Course Progress
          const { data: courseProgressData } = await supabase
            .from('user_course_progress')
            .select('course_id, xp_earned, completed_at')
            .eq('user_id', currentUser.id);

          if (courseProgressData) {
            courseProgressData.forEach((progress) => {
              totalCourseXp += progress.xp_earned || 0;
              if (progress.completed_at) {
                completedCoursesSet.add(progress.course_id);
              }
            });
            setCoursesCompletedCount(completedCoursesSet.size);
          }

          setTotalXp(totalLessonXp + totalCourseXp);
        }

        // 4. Fetch Courses & Lessons
        const { data: coursesData, error: coursesErr } = await supabase
          .from('courses')
          .select('*, lessons(id)')
          .eq('is_published', true);

        if (coursesErr) throw coursesErr;

        if (coursesData) {
          const mappedCourses: Course[] = coursesData.map((course: any) => {
            const courseLessons = course.lessons || [];
            const courseLessonIds = courseLessons.map((l: any) => l.id);
            
            // Calculate progress percent
            let progressPercent = 0;
            if (currentUser && courseLessonIds.length > 0) {
              const completedInCourse = courseLessonIds.filter((id: string) => completedLessonsSet.has(id)).length;
              progressPercent = Math.round((completedInCourse / courseLessonIds.length) * 100);
            }

            return {
              id: course.id,
              slug: course.slug,
              title: course.title,
              description: course.description,
              level: course.level,
              category: course.category,
              thumbnail_emoji: course.thumbnail_emoji || '♟',
              xp_reward: course.xp_reward,
              lesson_count: course.lesson_count,
              estimated_minutes: course.estimated_minutes,
              progressPercent,
            };
          });

          setCourses(mappedCourses);

          // Find active resumeable course (started but not finished)
          const startedCourse = mappedCourses.find(c => c.progressPercent && c.progressPercent > 0 && c.progressPercent < 100);
          if (startedCourse) {
            setActiveCourse(startedCourse);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load Learn Hub.');
      } finally {
        setLoading(false);
      }
    }
    loadLearningHub();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesCategory && matchesLevel;
  });

  // Locked check for advanced courses
  const isCourseLocked = (course: Course) => {
    return course.level === 'advanced' && userElo < 1200;
  };

  return (
    <PageShell>
      <div style={styles.container}>
        {/* Banner/Header */}
        <div style={styles.header}>
          <div style={styles.welcomeBox}>
            <h1 style={styles.serifHeading}>ChessMaster Academy</h1>
            <p style={styles.subtitle}>Unlock strategic mastery, solve tactical challenges, and level up your rating.</p>
          </div>

          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.statCard}>
              <Sparkles size={20} color="#d4af37" />
              <div style={styles.statInfo}>
                <div style={styles.statValue}>{totalXp}</div>
                <div style={styles.statLabel}>Academy XP</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <Award size={20} color="#22c55e" />
              <div style={styles.statInfo}>
                <div style={styles.statValue}>{coursesCompletedCount}</div>
                <div style={styles.statLabel}>Courses Completed</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <CheckCircle2 size={20} color="#3b82f6" />
              <div style={styles.statInfo}>
                <div style={styles.statValue}>{lessonsCompletedCount}</div>
                <div style={styles.statLabel}>Lessons Solved</div>
              </div>
            </div>
            <div style={styles.statCard}>
              <BookOpen size={20} color="#d4af37" />
              <div style={styles.statInfo}>
                <div style={styles.statValue}>{userElo}</div>
                <div style={styles.statLabel}>Puzzle ELO</div>
              </div>
            </div>
          </div>
        </div>

        {/* Continuation Banner */}
        {activeCourse && (
          <div style={styles.resumeBanner}>
            <div style={styles.resumeLeft}>
              <Bookmark size={24} color="#d4af37" />
              <div>
                <div style={styles.resumeLabel}>Resume Course</div>
                <h3 style={styles.resumeTitle}>{activeCourse.title}</h3>
              </div>
            </div>
            <div style={styles.resumeRight}>
              <div style={styles.resumeProgressText}>{activeCourse.progressPercent}% Completed</div>
              <button
                type="button"
                onClick={() => navigate(`/learn/${activeCourse.slug}`)}
                style={styles.resumeBtn}
              >
                Resume Course <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Browser Grid */}
        <div style={styles.browserHeader}>
          <h2 style={styles.sectionHeading}>Browse Courses</h2>
          
          {/* Filters Row */}
          <div style={styles.filtersRow}>
            {/* Category selection */}
            <div style={styles.filterGroup}>
              <Filter size={14} color="#a0aec0" />
              <div style={styles.pillsBox}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      ...styles.pillBtn,
                      ...(selectedCategory === cat.id ? styles.pillBtnActive : {}),
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selector */}
            <div style={styles.pillsBox}>
              {levels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  style={{
                    ...styles.pillBtn,
                    ...(selectedLevel === lvl.id ? styles.pillBtnActive : {}),
                  }}
                >
                  {lvl.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingSpinnerBox}>
            <div style={styles.spinner}></div>
            <span style={{ color: '#a0aec0' }}>Loading courses library...</span>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>{error}</div>
        ) : filteredCourses.length === 0 ? (
          <div style={styles.emptyBox}>No courses found matching criteria.</div>
        ) : (
          <div style={styles.grid}>
            {filteredCourses.map((course) => {
              const locked = isCourseLocked(course);
              const isFinished = course.progressPercent === 100;

              return (
                <div
                  key={course.id}
                  onClick={() => !locked && navigate(`/learn/${course.slug}`)}
                  style={{
                    ...styles.courseCard,
                    ...(locked ? styles.courseCardLocked : {}),
                  }}
                >
                  {/* Thumbnail Emoji overlay */}
                  <div style={styles.thumbnailBox}>
                    <span style={styles.thumbnailEmoji}>{course.thumbnail_emoji}</span>
                    {locked && (
                      <div style={styles.lockOverlay}>
                        <Lock size={18} color="#ef4444" />
                      </div>
                    )}
                    {isFinished && (
                      <div style={styles.checkOverlay}>
                        <CheckCircle2 size={18} color="#22c55e" fill="#080710" />
                      </div>
                    )}
                  </div>

                  {/* Course Details */}
                  <div style={styles.courseMeta}>
                    <div style={styles.cardHeader}>
                      <span style={{
                        ...styles.levelBadge,
                        ...styles[`level_${course.level}` as any]
                      }}>
                        {course.level.toUpperCase()}
                      </span>
                      <span style={styles.categoryLabel}>{course.category}</span>
                    </div>

                    <h3 style={styles.cardTitle}>{course.title}</h3>
                    <p style={styles.cardDesc}>{course.description}</p>

                    {/* Footer / stats */}
                    <div style={styles.cardFooter}>
                      <div style={styles.footerStat}>
                        <strong>{course.lesson_count}</strong> lessons
                      </div>
                      <div style={styles.footerStat}>
                        <strong>{course.estimated_minutes}</strong> mins
                      </div>
                      <div style={styles.footerStat}>
                        <strong>{course.xp_reward}</strong> XP
                      </div>
                    </div>

                    {/* Progress tracking */}
                    {course.progressPercent !== undefined && course.progressPercent > 0 && (
                      <div style={styles.cardProgressBox}>
                        <div style={styles.progressText}>
                          <span>Progress</span>
                          <span>{course.progressPercent}%</span>
                        </div>
                        <div style={styles.cardBarBg}>
                          <div
                            style={{
                              ...styles.cardBarFill,
                              width: `${course.progressPercent}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Lock overlay banner */}
                    {locked && (
                      <div style={styles.lockMessage}>
                        <Lock size={12} /> Requires 1200 ELO (Current: {userElo})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  header: {
    width: '100%',
    maxWidth: '1100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  welcomeBox: {
    textAlign: 'left',
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
    maxWidth: '650px',
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    width: '100%',
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
  },
  resumeBanner: {
    width: '100%',
    maxWidth: '1100px',
    background: 'linear-gradient(90deg, rgba(212,175,55,0.06) 0%, rgba(212,175,55,0.01) 100%)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  resumeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  resumeLabel: {
    fontSize: '11px',
    color: '#d4af37',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  resumeTitle: {
    fontSize: '18px',
    color: '#f8fafc',
    marginTop: '2px',
  },
  resumeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  resumeProgressText: {
    fontSize: '14px',
    color: '#a0aec0',
  },
  resumeBtn: {
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8416 100%)',
    color: '#080710',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  browserHeader: {
    width: '100%',
    maxWidth: '1100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '16px',
  },
  sectionHeading: {
    fontSize: '22px',
    color: '#f8fafc',
    fontFamily: 'Cinzel, Georgia, serif',
  },
  filtersRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pillsBox: {
    display: 'flex',
    gap: '8px',
  },
  pillBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '6px 14px',
    color: '#a0aec0',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pillBtnActive: {
    background: 'rgba(212, 175, 55, 0.15)',
    borderColor: '#d4af37',
    color: '#d4af37',
  },
  loadingSpinnerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px',
    gap: '16px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '4px solid rgba(212, 175, 55, 0.15)',
    borderTop: '4px solid #d4af37',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorBox: {
    color: '#fca5a5',
    padding: '40px',
    textAlign: 'center',
  },
  emptyBox: {
    color: '#a0aec0',
    padding: '60px',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    width: '100%',
    maxWidth: '1100px',
  },
  courseCard: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    ':hover': {
      transform: 'translateY(-4px)',
      borderColor: 'rgba(212, 175, 55, 0.3)',
      boxShadow: '0 8px 30px rgba(212,175,55,0.08)',
    }
  },
  courseCardLocked: {
    opacity: 0.5,
    cursor: 'not-allowed',
    ':hover': {
      transform: 'none',
      borderColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: 'none',
    }
  },
  thumbnailBox: {
    height: '120px',
    background: '#13111f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  thumbnailEmoji: {
    fontSize: '48px',
  },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(8, 7, 16, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
  },
  courseMeta: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '12px',
  },
  cardHeader: {
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
  cardTitle: {
    fontSize: '18px',
    color: '#f8fafc',
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: '13.5px',
    color: '#a0aec0',
    lineHeight: '1.5',
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    gap: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '12px',
    marginTop: '4px',
  },
  footerStat: {
    fontSize: '12px',
    color: '#718096',
  },
  cardProgressBox: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#a0aec0',
  },
  cardBarBg: {
    width: '100%',
    height: '4px',
    background: '#1a1926',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  cardBarFill: {
    height: '100%',
    background: '#22c55e',
    borderRadius: '2px',
  },
  lockMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '8px',
    fontWeight: 'bold',
  }
};
