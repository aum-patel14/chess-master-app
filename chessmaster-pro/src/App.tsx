import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { Dashboard } from './pages/Dashboard'
import { Play } from './pages/Play'
import { Puzzles } from './pages/Puzzles'
import { Courses } from './pages/Courses'
import { CourseDetail } from './pages/CourseDetail'
import { LessonPlayer } from './pages/LessonPlayer'
import { Tournaments } from './pages/Tournaments'
import { TournamentDetail } from './pages/TournamentDetail'
import { Profile } from './pages/Profile'
import { Multiplayer } from './pages/Multiplayer'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public landing page — standalone layout */}
        <Route path="/" element={<LandingPage />} />

        {/* App shell — shared nav/footer via Layout */}
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="play" element={<Play />} />
          <Route path="play/online" element={<Multiplayer />} />
          <Route path="puzzles" element={<Puzzles />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="tournaments/:tournamentId" element={<TournamentDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
