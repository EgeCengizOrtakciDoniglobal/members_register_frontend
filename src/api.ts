// Basit API yardımcısı — backend Laravel REST API ile konuşur.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export interface LoginResponse {
  user: { id: number; name: string; mail: string; status: string }
  token: string
  token_type: string
}

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function login(mail: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mail, password }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(
      data?.message ?? 'Giriş başarısız oldu.',
      res.status,
      data?.errors,
    )
  }

  return data as LoginResponse
}

const TOKEN_KEY = 'auth_token'

export const tokenStore = {
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  get: () => localStorage.getItem(TOKEN_KEY),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
