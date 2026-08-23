import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from '../services/api'
import type { ApiResponse, User } from '../types'

interface LoginResponseData {
  token: string
  user: User
}

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void
}

function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'CUSTOMER' | 'ORGANISER'>('CUSTOMER')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      if (isRegistering) {
        // Register API: POST /api/auth/register
        await apiRequest<ApiResponse<User>>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({
              name,
              email,
              password,
              role,
            }),
          },
        )

        // Then auto login
        const loginResponse = await apiRequest<ApiResponse<LoginResponseData>>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({
              email,
              password,
            }),
          },
        )

        localStorage.setItem('token', loginResponse.data.token)
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user))
        onLoginSuccess(loginResponse.data.user, loginResponse.data.token)
      } else {
        // Login API: POST /api/auth/login
        const response = await apiRequest<ApiResponse<LoginResponseData>>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({
              email,
              password,
            }),
          },
        )

        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        onLoginSuccess(response.data.user, response.data.token)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isRegistering ? 'active' : ''}`}
            onClick={() => {
              setIsRegistering(false)
              setError('')
              setSuccessMessage('')
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegistering ? 'active' : ''}`}
            onClick={() => {
              setIsRegistering(true)
              setError('')
              setSuccessMessage('')
            }}
          >
            Register
          </button>
        </div>

        <h1>{isRegistering ? 'Create an Account' : 'Welcome Back'}</h1>
        <p>
          {isRegistering
            ? 'Sign up to book tickets or manage events.'
            : 'Login to access your bookings and shows.'}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <label>
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </label>

              <label>
                Account Role
                <select
                  className="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'CUSTOMER' | 'ORGANISER')}
                >
                  <option value="CUSTOMER">Customer (Book tickets)</option>
                  <option value="ORGANISER">Organiser (Manage events & venues)</option>
                </select>
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegistering ? 'Min 8 characters' : 'Enter your password'}
              required
              minLength={isRegistering ? 8 : undefined}
            />
          </label>

          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? isRegistering
                ? 'Creating account...'
                : 'Logging in...'
              : isRegistering
                ? 'Register'
                : 'Login'}
          </button>
        </form>

        <div className="auth-footer-hint">
          {isRegistering ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => setIsRegistering(false)}
              >
                Login here
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => setIsRegistering(true)}
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default Login