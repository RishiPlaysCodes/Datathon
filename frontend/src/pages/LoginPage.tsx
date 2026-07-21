import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { authAPI, getApiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await authAPI.login(username, password)
      login(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate(data.user.role === 'citizen' ? '/firs' : '/dashboard')
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setLoading(true)
    try {
      const data = await authAPI.login(user, pass)
      login(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome, ${data.user.full_name}!`)
      navigate(data.user.role === 'citizen' ? '/firs' : '/dashboard')
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-800/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 shadow-xl shadow-primary-600/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PRAHARI</h1>
          <p className="text-sm text-gray-400 mt-1">Crime Intelligence Operating System</p>
          <p className="text-xs text-gray-600 mt-0.5">Karnataka State Police</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field w-full"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field w-full pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-center disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Access */}
          <div className="mt-6 pt-6 border-t border-dark-700/50">
            <p className="text-xs text-gray-500 text-center mb-3">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => quickLogin('demo', 'demo123')}
                className="btn-secondary text-xs py-2"
              >
                Investigator
              </button>
              <button
                onClick={() => quickLogin('admin', 'admin123')}
                className="btn-secondary text-xs py-2"
              >
                Supervisor
              </button>
              <button
                onClick={() => quickLogin('analyst', 'analyst123')}
                className="btn-secondary text-xs py-2"
              >
                Analyst
              </button>
              <button
                onClick={() => quickLogin('constable', 'constable123')}
                className="btn-secondary text-xs py-2"
              >
                Constable
              </button>
              <button
                onClick={() => quickLogin('citizen1', 'citizen123')}
                className="btn-secondary text-xs py-2 col-span-2 border-yellow-500/30 text-yellow-400"
              >
                Citizen (Public User)
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Predictive Relational AI for Holistic Analytics & Response Intelligence
        </p>
      </div>
    </div>
  )
}
