const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('token')

  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection.')
  }

  let data: T & {
    message?: string
    errors?: string[]
  }

  try {
    data = await response.json()
  } catch {
    throw new Error('Invalid response from server')
  }

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    window.dispatchEvent(new Event('auth:unauthorized'))

    throw new Error(data.message || 'Session expired. Please login again.')
  }

  if (!response.ok) {
    const errorMsg =
      data.message ||
      (Array.isArray(data.errors) && data.errors.length > 0
        ? data.errors.join(', ')
        : 'Something went wrong')
    throw new Error(errorMsg)
  }

  return data
}