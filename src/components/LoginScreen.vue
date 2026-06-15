<script setup lang="ts">
import { ref, computed } from 'vue'
import { login, tokenStore, ApiError } from '../api'

const mail = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const success = ref(false)
const loggedUser = ref('')

const canSubmit = computed(
  () => mail.value.trim().length > 0 && password.value.length > 0 && !loading.value,
)

async function onSubmit() {
  errorMsg.value = ''
  if (!canSubmit.value) return
  loading.value = true
  try {
    const res = await login(mail.value.trim(), password.value)
    tokenStore.set(res.token)
    loggedUser.value = res.user.name
    success.value = true
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.errors) {
        errorMsg.value = Object.values(e.errors).flat()[0] ?? e.message
      } else if (e.status === 422 || e.status === 401) {
        errorMsg.value = 'E-posta veya şifre hatalı.'
      } else {
        errorMsg.value = e.message
      }
    } else {
      errorMsg.value = 'Sunucuya ulaşılamadı. Backend çalışıyor mu?'
    }
  } finally {
    loading.value = false
  }
}

function logout() {
  tokenStore.clear()
  success.value = false
  mail.value = ''
  password.value = ''
}
</script>

<template>
  <div class="auth">
    <!-- Bulanık arka plan şekilleri -->
    <div class="bg">
      <span class="orb orb-1" />
      <span class="orb orb-2" />
      <span class="orb orb-3" />
    </div>

    <!-- Ortadaki cam kart -->
    <div class="card">
      <template v-if="!success">
        <div class="logo">
          <span class="logo-mark">M</span>
        </div>
        <header class="head">
          <h1>Hoş geldiniz</h1>
          <p>Devam etmek için hesabınıza giriş yapın.</p>
        </header>

        <form class="form" @submit.prevent="onSubmit">
          <div class="field">
            <label for="mail">E-posta</label>
            <div class="input">
              <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
                <path
                  d="M4 6h16v12H4z M4 6l8 6 8-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <input
                id="mail"
                v-model="mail"
                type="email"
                autocomplete="username"
                placeholder="ornek@firma.com"
                @keyup.enter="onSubmit"
              />
            </div>
          </div>

          <div class="field">
            <label for="password">Şifre</label>
            <div class="input">
              <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
                <path
                  d="M6 10V8a6 6 0 0 1 12 0v2 M5 10h14v10H5z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                @keyup.enter="onSubmit"
              />
              <button
                type="button"
                class="toggle"
                :aria-label="showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Gizle' : 'Göster' }}
              </button>
            </div>
          </div>

          <div class="row">
            <label class="remember">
              <input type="checkbox" />
              <span>Beni hatırla</span>
            </label>
            <a class="link" href="#" @click.prevent>Şifremi unuttum?</a>
          </div>

          <p v-if="errorMsg" class="error" role="alert">{{ errorMsg }}</p>

          <button type="submit" class="submit" :disabled="!canSubmit">
            <span v-if="loading" class="spinner" />
            <span>{{ loading ? 'Giriş yapılıyor…' : 'Giriş Yap' }}</span>
          </button>
        </form>

        <p class="foot">
          Hesabınız yok mu? <a class="link" href="#" @click.prevent>Yöneticinize başvurun</a>
        </p>
      </template>

      <!-- Başarı durumu (dashboard henüz yok) -->
      <template v-else>
        <div class="success">
          <div class="check">✓</div>
          <h1>Giriş başarılı</h1>
          <p>Hoş geldin, <strong>{{ loggedUser }}</strong>. Dashboard yakında burada olacak.</p>
          <button class="submit ghost" @click="logout">Çıkış yap</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth {
  --brand: #aa3bff;
  --brand-2: #6d28d9;
  --ink: #1a1530;
  --muted: #6b7280;
  --line: #e8e6f0;
  color-scheme: light;
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, #f6f3ff 0%, #fdfcff 45%, #f3f0ff 100%);
  color: var(--ink);
}

/* ---------- Bulanık arka plan ---------- */
.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
}
.orb-1 {
  width: 460px;
  height: 460px;
  top: -120px;
  left: -100px;
  background: #c77dff;
}
.orb-2 {
  width: 420px;
  height: 420px;
  bottom: -140px;
  right: -90px;
  background: #8b5cf6;
}
.orb-3 {
  width: 360px;
  height: 360px;
  top: 40%;
  left: 55%;
  background: #f0abfc;
  opacity: 0.4;
}

/* ---------- Cam kart ---------- */
.card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 410px;
  padding: 40px 36px 32px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 1px 1px rgba(255, 255, 255, 0.6) inset,
    0 20px 50px -18px rgba(109, 40, 217, 0.35);
}
.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}
.logo-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 15px;
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
  color: #fff;
  font-weight: 800;
  font-size: 26px;
  box-shadow: 0 10px 22px -8px rgba(109, 40, 217, 0.6);
}
.head {
  text-align: center;
  margin-bottom: 26px;
}
.head h1 {
  margin: 0 0 6px;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: var(--ink);
}
.head p {
  margin: 0;
  color: var(--muted);
  font-size: 14.5px;
}
.form {
  display: grid;
  gap: 17px;
}
.field {
  display: grid;
  gap: 7px;
}
.field label {
  font-size: 13px;
  font-weight: 600;
  color: #4a4560;
}
.input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 48px;
  border: 1.5px solid var(--line);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.input:focus-within {
  border-color: var(--brand);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(170, 59, 255, 0.13);
}
.input .icon {
  width: 19px;
  height: 19px;
  color: #9aa0ac;
  flex: none;
}
.input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 15px;
  color: var(--ink);
}
.toggle {
  border: 0;
  background: transparent;
  color: var(--brand);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 2px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -2px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--muted);
  cursor: pointer;
}
.remember input {
  accent-color: var(--brand);
  width: 15px;
  height: 15px;
}
.link {
  color: var(--brand);
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.error {
  margin: 0;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.09);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #dc2626;
  border-radius: 11px;
  font-size: 13.5px;
}
.submit {
  height: 48px;
  border: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.12s, box-shadow 0.2s, opacity 0.15s;
  box-shadow: 0 10px 22px -10px rgba(109, 40, 217, 0.65);
}
.submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px -10px rgba(109, 40, 217, 0.75);
}
.submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.submit.ghost {
  background: rgba(170, 59, 255, 0.1);
  color: var(--brand);
  box-shadow: none;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.foot {
  margin: 22px 0 0;
  text-align: center;
  font-size: 13.5px;
  color: var(--muted);
}

/* ---------- Başarı ---------- */
.success {
  text-align: center;
  display: grid;
  gap: 10px;
  padding: 8px 0;
}
.check {
  margin: 0 auto 6px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, #22c55e, #16a34a);
}
.success h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}
.success p {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 14.5px;
}
</style>
