import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
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
