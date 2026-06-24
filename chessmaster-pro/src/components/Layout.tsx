import { Link, Outlet, useLocation } from 'react-router-dom'
import { Trophy, BookOpen, Layers, PlayCircle, User, Award, Users } from 'lucide-react'

export function Layout() {
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Trophy, testId: 'nav-dashboard' },
    { path: '/play', label: 'Play Chess', icon: PlayCircle, testId: 'nav-play' },
    { path: '/play/online', label: 'Play Online', icon: Users, testId: 'nav-play-online' },
    { path: '/puzzles', label: 'Puzzles', icon: Layers, testId: 'nav-puzzles' },
    { path: '/courses', label: 'Courses', icon: BookOpen, testId: 'nav-courses' },
    { path: '/tournaments', label: 'Tournaments', icon: Award, testId: 'nav-tournaments' },
    { path: '/profile', label: 'Profile', icon: User, testId: 'nav-profile' },
  ]

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-chess-bg text-slate-100 flex flex-col md:flex-row font-sans">
      {/* ─── DESKTOP LEFT SIDEBAR ─── */}
      <aside className="hidden md:flex flex-col w-60 h-screen sticky top-0 bg-chess-dark border-r border-[#3c3a37] z-50 flex-shrink-0">
        {/* Sidebar Logo */}
        <div className="p-5 border-b border-[#3c3a37]">
          <Link
            to="/"
            className="flex items-center space-x-2 text-lg font-black tracking-wider text-white hover:text-chess-green transition-colors"
            data-testid="logo-link"
          >
            <span className="text-2xl text-chess-green">♚</span>
            <span>CHESSMASTER</span>
          </Link>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={item.testId}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-150 group ${
                  active
                    ? 'bg-[#3c3a37] text-white border-l-4 border-chess-green pl-3'
                    : 'text-[#bababa] hover:text-white hover:bg-[#3c3a37]/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${active ? 'text-chess-green' : 'text-[#bababa] group-hover:text-white'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Bottom Profile/Actions */}
        <div className="p-4 border-t border-[#3c3a37] bg-chess-darker flex items-center justify-between">
          <Link
            to="/profile"
            data-testid="nav-avatar"
            className="flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-md bg-chess-green flex items-center justify-center text-white font-extrabold text-sm border-b-2 border-chess-green-dark">
              GM
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">Grandmaster</p>
              <p className="text-[10px] text-[#bababa] leading-none mt-1">View Profile</p>
            </div>
          </Link>

          <button
            data-testid="btn-notifications"
            className="p-1.5 rounded-md text-[#bababa] hover:text-white hover:bg-[#3c3a37] transition-all relative"
            title="Notifications"
          >
            🔔
            <span className="absolute top-1 right-1 w-2 h-2 bg-chess-green rounded-full"></span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE TOP HEADER ─── */}
      <header className="md:hidden h-14 bg-chess-dark border-b border-[#3c3a37] flex items-center justify-between px-4 sticky top-0 z-40 w-full flex-shrink-0">
        <Link
          to="/"
          className="flex items-center space-x-1.5 text-sm font-black tracking-wider text-white"
          data-testid="logo-link-mobile"
        >
          <span className="text-xl text-chess-green">♚</span>
          <span>CHESSMASTER</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            data-testid="btn-notifications-mobile"
            className="p-1 text-[#bababa] hover:text-white"
            title="Notifications"
          >
            🔔
          </button>
          <Link
            to="/profile"
            data-testid="nav-avatar-mobile"
            className="w-8 h-8 rounded-md bg-chess-green flex items-center justify-center text-white font-bold text-xs border-b-2 border-chess-green-dark"
          >
            GM
          </Link>
        </div>
      </header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-grow flex flex-col min-w-0 min-h-screen">
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        {/* ─── MOBILE BOTTOM NAV BAR ─── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-chess-dark border-t border-[#3c3a37] flex items-center justify-around z-40 px-2 shadow-lg shadow-black/55">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`${item.testId}-mobile`}
                className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md transition-colors w-12 ${
                  active ? 'text-chess-green' : 'text-[#bababa] active:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 tracking-tight truncate max-w-full">
                  {item.label.replace('Play ', '')}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
