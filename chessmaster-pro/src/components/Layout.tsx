import { Link, Outlet, useLocation } from 'react-router-dom'
import { Trophy, BookOpen, Layers, PlayCircle, User, Award, Users } from 'lucide-react'

export function Layout() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Trophy, testId: 'nav-dashboard' },
    { path: '/play', label: 'Play Chess', icon: PlayCircle, testId: 'nav-play' },
    { path: '/play/online', label: 'Play Online', icon: Users, testId: 'nav-play-online' },
    { path: '/puzzles', label: 'Puzzles', icon: Layers, testId: 'nav-puzzles' },
    { path: '/courses', label: 'Courses', icon: BookOpen, testId: 'nav-courses' },
    { path: '/tournaments', label: 'Tournaments', icon: Award, testId: 'nav-tournaments' },
    { path: '/profile', label: 'Profile', icon: User, testId: 'nav-profile' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-2 text-xl font-bold tracking-wider text-purple-400 hover:text-purple-300 transition-colors"
                data-testid="logo-link"
              >
                <span>♚ CHESSMASTER PRO</span>
              </Link>
            </div>

            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={item.testId}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500 rounded-b-none'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center space-x-3">
              <button
                data-testid="btn-notifications"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
                title="Notifications"
              >
                <span className="sr-only">Notifications</span>
                🔔
              </button>
              <Link
                to="/profile"
                data-testid="nav-avatar"
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-800 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-between text-white font-bold text-sm justify-center border border-purple-400">
                  GM
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between">
          <p>© 2026 Chessmaster Pro. All rights reserved.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-slate-400" data-testid="footer-link-privacy">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-400" data-testid="footer-link-terms">
              Terms
            </a>
            <a href="#" className="hover:text-slate-400" data-testid="footer-link-support">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
