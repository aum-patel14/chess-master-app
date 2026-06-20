import { DocumentTitle } from '../components/DocumentTitle'
import { BookOpen, Clock, Star } from 'lucide-react'

export function Courses() {
  const courses = [
    {
      id: 'course-1',
      title: 'Chess Openings Masterclass',
      description:
        'Learn the fundamental principles of openings like Ruy Lopez, Queen Gambit, and Sicilian Defence.',
      lessonsCount: 12,
      duration: '4h 15m',
      difficulty: 'Intermediate',
      progress: 66, // 66% completed
      author: 'IM Anna Rudolf',
    },
    {
      id: 'course-2',
      title: 'Middlegame Strategy & Pawn Structures',
      description:
        'Master pawn chains, outposts, minor piece exchanges, and king safety in complex middlegames.',
      lessonsCount: 8,
      duration: '3h 30m',
      difficulty: 'Advanced',
      progress: 25,
      author: 'GM Daniel Naroditsky',
    },
    {
      id: 'course-3',
      title: 'Essential Endgame Patterns',
      description:
        'Never throw away a winning position. Study King + Pawn endgames, opposition, and rook cutoffs.',
      lessonsCount: 10,
      duration: '2h 50m',
      difficulty: 'Beginner',
      progress: 100,
      author: 'GM Yasser Seirawan',
    },
    {
      id: 'course-4',
      title: 'Attacking Chess & Tactical Sacrifices',
      description:
        'Unleash your inner tactical beast. Study double bishop sacrifices, Greek gifts, and storming the castle.',
      lessonsCount: 6,
      duration: '2h 10m',
      difficulty: 'Advanced',
      progress: 0,
      author: 'GM Hikaru Nakamura',
    },
  ]

  return (
    <div className="space-y-8">
      <DocumentTitle title="Interactive Courses" />

      {/* Header section */}
      <section className="border-b border-slate-900 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Chess Academy</h1>
        <p className="text-slate-455">
          Expand your knowledge and master chess theory with video lessons and interactive
          exercises.
        </p>
      </section>

      {/* Courses Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {courses.map((course) => (
          <div
            key={course.id}
            data-testid={`course-card-${course.id}`}
            className="border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 rounded-2xl p-6 flex flex-col justify-between space-y-6 transition-all"
          >
            {/* Upper Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 text-xs border border-purple-500/20 bg-purple-500/10 text-purple-400 rounded-full font-semibold">
                  {course.difficulty}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400/80 text-amber-400" />
                  Coach: {course.author}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white leading-snug">{course.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{course.description}</p>
            </div>

            {/* Progress and lower content */}
            <div className="space-y-4 pt-4 border-t border-slate-850">
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Course Progress</span>
                  <span className="text-purple-400">{course.progress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Course Meta Info & Button */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex space-x-3.5 text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {course.lessonsCount} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {course.duration}
                  </span>
                </div>

                <button
                  data-testid={`btn-view-course-${course.id}`}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    course.progress === 100
                      ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/30'
                      : course.progress > 0
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {course.progress === 100
                    ? '✓ Review Course'
                    : course.progress > 0
                      ? 'Continue Lesson'
                      : 'Start Learning'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
