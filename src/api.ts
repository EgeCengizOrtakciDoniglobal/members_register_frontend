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

export interface Member {
  id: number
  name: string
  lastname: string
  mail: string
  tckn: string
  lisanceno: string
  status: 'active' | 'inactive' | 'pending'
  create_date: string
}

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const LAST_LOGIN_KEY = 'last_login'

export type AuthUser = LoginResponse['user']

export const tokenStore = {
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  get: () => localStorage.getItem(TOKEN_KEY),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const userStore = {
  set: (user: AuthUser) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  get: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  },
  clear: () => localStorage.removeItem(USER_KEY),
}

const PREV_LOGIN_KEY = 'prev_login'

export const lastLoginStore = {
  /** Giriş anında çağrılır: önceki giriş zamanını saklar, şimdiyi kaydeder. */
  markLogin() {
    const last = localStorage.getItem(LAST_LOGIN_KEY)
    if (last) localStorage.setItem(PREV_LOGIN_KEY, last)
    localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString())
  },
  /** Dashboard'da gösterilecek bir önceki giriş zamanı (yoksa null). */
  getPrevious: () => localStorage.getItem(PREV_LOGIN_KEY),
}

export function isAuthenticated(): boolean {
  return !!tokenStore.get()
}

export function logout() {
  tokenStore.clear()
  userStore.clear()
}

/** Korumalı üye listesini token ile çeker. */
export async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${API_URL}/members`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokenStore.get() ?? ''}`,
    },
  })

  if (res.status === 401) {
    throw new ApiError('Oturum süresi doldu.', 401)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Üyeler alınamadı.', res.status)
  }

  // Laravel JsonResource::collection → { data: [...] }
  return (data.data ?? data) as Member[]
}
