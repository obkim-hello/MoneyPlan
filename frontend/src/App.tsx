import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Accounts from './pages/Accounts'
import Allocations from './pages/Allocations'
import { setNavigateCallback } from './api/auth'

function AppContent() {
  const isAuthenticated = !!localStorage.getItem('token')
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark'
  })

  // Set up navigation callback for API interceptor
  useEffect(() => {
    setNavigateCallback((path: string) => navigate(path))
  }, [navigate])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const toggleTheme = () => setDarkMode(!darkMode)

  return (
    <>
      {isAuthenticated && (
        <nav className="header">
          <div className="header-content">
            <h1 className="text-xl font-bold">MoneyPlan</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/accounts" className="nav-link">Accounts</Link>
                <Link to="/allocations" className="nav-link">Allocations</Link>
                <Link to="/settings" className="nav-link">Settings</Link>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-lg"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
                className="nav-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/accounts"
          element={isAuthenticated ? <Accounts /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/allocations"
          element={isAuthenticated ? <Allocations /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
      </main>
    </>
  )
}

function App() {
  return <AppContent />
}

export default App
