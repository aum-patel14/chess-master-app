import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LandingPage } from './pages/LandingPage'
import { Dashboard } from './pages/Dashboard'
import { Play } from './pages/Play'
import { Puzzles } from './pages/Puzzles'
import { Courses } from './pages/Courses'
import { Tournaments } from './pages/Tournaments'
import { Profile } from './pages/Profile'
import { Multiplayer } from './pages/Multiplayer'

function App() {
  return (
    <BrowserRouter>
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
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
