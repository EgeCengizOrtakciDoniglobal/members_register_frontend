<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { userStore, lastLoginStore, getMembers, logout as doLogout, ApiError, type Member } from '../api'
import MemberFormDialog from './MemberFormDialog.vue'

const router = useRouter()
const $q = useQuasar()
const user = userStore.get()

const members = ref<Member[]>([])
const loading = ref(true)
const errorMsg = ref('')
const monthsRange = ref(6)

/* ---------- İkonlar (içerik) ---------- */
const ICONS: Record<string, string> = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
}

/* ---------- Veri ---------- */
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
function parseDate(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

const total = computed(() => members.value.length)
const activeCount = computed(() => members.value.filter((m) => m.status === 'active').length)
const inactiveCount = computed(() => members.value.filter((m) => m.status === 'inactive').length)
const pendingCount = computed(() => members.value.filter((m) => m.status === 'pending').length)
const activePct = computed(() => (total.value ? Math.round((activeCount.value / total.value) * 100) : 0))

// Aylık bucketlar (status kırılımıyla)
const monthly = computed(() => {
  const now = new Date()
  const buckets: { label: string; key: string; total: number; active: number; inactive: number; pending: number }[] = []
  for (let i = monthsRange.value - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ label: TR_MONTHS[d.getMonth()], key: `${d.getFullYear()}-${d.getMonth()}`, total: 0, active: 0, inactive: 0, pending: 0 })
  }
  for (const m of members.value) {
    const d = parseDate(m.create_date)
    const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`)
    if (b) {
      b.total++
      b[m.status]++
    }
  }
  return buckets
})

const chart = computed(() => {
  const max = Math.max(1, ...monthly.value.map((b) => b.total))
  return monthly.value.map((b) => ({ ...b, pct: Math.round((b.total / max) * 100) }))
})

function spark(values: number[]): string {
  if (!values.length) return ''
  const max = Math.max(1, ...values)
  const n = Math.max(values.length - 1, 1)
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / n) * 100).toFixed(1)} ${(28 - (v / max) * 24).toFixed(1)}`)
    .join(' ')
}
const sparks = computed(() => ({
  total: spark(monthly.value.map((b) => b.total)),
  active: spark(monthly.value.map((b) => b.active)),
  inactive: spark(monthly.value.map((b) => b.inactive)),
  pending: spark(monthly.value.map((b) => b.pending)),
}))
const thisMonth = computed(() => monthly.value[monthly.value.length - 1] ?? { total: 0, active: 0, inactive: 0, pending: 0 })

const recent = computed(() =>
  [...members.value].sort((a, b) => parseDate(b.create_date).getTime() - parseDate(a.create_date).getTime()).slice(0, 6),
)

const lastLogin = computed(() => {
  const prev = lastLoginStore.getPrevious()
  if (!prev) return 'İlk girişiniz'
  return new Date(prev).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
})
function fmtDate(s: string): string {
  return parseDate(s).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function statusLabel(s: Member['status']): string {
  return s === 'active' ? 'Aktif' : s === 'inactive' ? 'Pasif' : 'Beklemede'
}

const quickActions: { icon: string; label: string; action: string }[] = [
  { icon: 'userplus', label: 'Yeni Üye', action: 'new' },
  { icon: 'download', label: 'Dışa Aktar', action: 'export' },
  { icon: 'search', label: 'Üye Ara', action: 'search' },
  { icon: 'settings', label: 'Ayarlar', action: 'settings' },
]

const memberDialog = ref(false)

function runAction(a: { action: string }) {
  if (a.action === 'new') memberDialog.value = true
  else if (a.action === 'export') exportJson()
  else if (a.action === 'search') {
    searchQuery.value = ''
    searchDialog.value = true
  } else if (a.action === 'settings') router.push({ name: 'wp-connection' })
}

/* ---------- Dışa aktar (JSON) ---------- */
function exportJson() {
  const data = JSON.stringify(members.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `uyeler-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  $q.notify({
    type: 'positive',
    message: `${members.value.length} üye JSON olarak indirildi.`,
    position: 'top',
  })
}

/* ---------- Üye ara (modal) ---------- */
const searchDialog = ref(false)
const searchQuery = ref('')
function openHeaderSearch() {
  searchDialog.value = true
}
const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return members.value
    .filter((m) => `${m.name} ${m.lastname} ${m.mail} ${m.tckn} ${m.lisanceno}`.toLowerCase().includes(q))
    .slice(0, 30)
})
function goMember() {
  searchDialog.value = false
  router.push({ name: 'members' })
}

async function loadMembers() {
  loading.value = true
  try {
    members.value = await getMembers()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      doLogout()
      router.push({ name: 'login' })
      return
    }
    errorMsg.value = e instanceof Error ? e.message : 'Veri alınamadı.'
  } finally {
    loading.value = false
  }
}

onMounted(loadMembers)
</script>

<template>
  <div class="dash">
      <header class="topbar">
        <div class="tb-left">
          <h1>Genel Bakış</h1>
          <p class="crumb">Dashboard <span>›</span> Genel Bakış</p>
        </div>
        <div class="tb-right">
          <div class="searchbox" @click="openHeaderSearch">
            <svg viewBox="0 0 24 24"><path :d="ICONS.search" /></svg>
            <input type="text" placeholder="Üye ara…" v-model="searchQuery" @focus="openHeaderSearch" @keyup.enter="openHeaderSearch" />
          </div>
          <button class="icon-btn" aria-label="Bildirimler">
            <svg viewBox="0 0 24 24"><path :d="ICONS.bell" /></svg>
            <span class="badge-dot" />
          </button>
          <div class="who">
            <div class="avatar">{{ (user?.name ?? 'U').charAt(0).toUpperCase() }}</div>
            <div class="who-meta">
              <span class="who-name">{{ user?.name ?? 'Kullanıcı' }}</span>
              <span class="who-sub">Son giriş: {{ lastLogin }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="content">
        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <!-- Stat kartları -->
        <section class="stats">
          <article class="stat">
            <div class="stat-head">
              <span class="stat-ic ic-total"><svg viewBox="0 0 24 24"><path :d="ICONS.users" /></svg></span>
              <span class="trend up">+{{ thisMonth.total }} bu ay</span>
            </div>
            <p class="stat-num">{{ loading ? '—' : total }}</p>
            <p class="stat-name">Toplam Üye</p>
            <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path :d="sparks.total" class="s-total" /></svg>
          </article>
          <article class="stat">
            <div class="stat-head">
              <span class="stat-ic ic-active"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" /></svg></span>
              <span class="trend up">+{{ thisMonth.active }} bu ay</span>
            </div>
            <p class="stat-num">{{ loading ? '—' : activeCount }}</p>
            <p class="stat-name">Aktif Üyeler</p>
            <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path :d="sparks.active" class="s-active" /></svg>
          </article>
          <article class="stat">
            <div class="stat-head">
              <span class="stat-ic ic-inactive"><svg viewBox="0 0 24 24"><path d="M18.36 6.64A9 9 0 1 1 5.64 19.36 9 9 0 0 1 18.36 6.64zM4 4l16 16" /></svg></span>
              <span class="trend down">+{{ thisMonth.inactive }} bu ay</span>
            </div>
            <p class="stat-num">{{ loading ? '—' : inactiveCount }}</p>
            <p class="stat-name">Pasif Üyeler</p>
            <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path :d="sparks.inactive" class="s-inactive" /></svg>
          </article>
          <article class="stat">
            <div class="stat-head">
              <span class="stat-ic ic-pending"><svg viewBox="0 0 24 24"><path d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" /></svg></span>
              <span class="trend">+{{ thisMonth.pending }} bu ay</span>
            </div>
            <p class="stat-num">{{ loading ? '—' : pendingCount }}</p>
            <p class="stat-name">Beklemede</p>
            <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path :d="sparks.pending" class="s-pending" /></svg>
          </article>
        </section>

        <!-- Grafik + oran -->
        <section class="row-2">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h2>Üye Ekleme Grafiği</h2>
                <p class="muted">Aylık eklenen üye sayısı</p>
              </div>
              <div class="tabs">
                <button :class="{ on: monthsRange === 3 }" @click="monthsRange = 3">3A</button>
                <button :class="{ on: monthsRange === 6 }" @click="monthsRange = 6">6A</button>
                <button :class="{ on: monthsRange === 12 }" @click="monthsRange = 12">12A</button>
              </div>
            </div>
            <div class="chart">
              <div v-for="b in chart" :key="b.key" class="bar-col">
                <div class="bar-track">
                  <div class="bar" :style="{ height: Math.max(b.pct, 3) + '%' }">
                    <span class="bar-val">{{ b.total }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ b.label }}</span>
              </div>
            </div>
          </div>

          <div class="panel ratio">
            <div class="panel-head"><h2>Durum Dağılımı</h2></div>
            <div class="ring" :style="{ '--pct': activePct }">
              <div class="ring-center">
                <span class="ring-pct">%{{ activePct }}</span>
                <span class="ring-sub">Aktif oran</span>
              </div>
            </div>
            <ul class="legend">
              <li><span class="dot d-active" /> Aktif <b>{{ activeCount }}</b></li>
              <li><span class="dot d-inactive" /> Pasif <b>{{ inactiveCount }}</b></li>
              <li><span class="dot d-pending" /> Beklemede <b>{{ pendingCount }}</b></li>
            </ul>
          </div>
        </section>

        <!-- Son üyeler + hızlı işlemler -->
        <section class="row-3">
          <div class="panel">
            <div class="panel-head">
              <h2>Son Eklenen Üyeler</h2>
              <a class="link" href="#" @click.prevent="router.push({ name: 'members' })">Tümünü gör</a>
            </div>
            <div v-if="loading" class="empty">Yükleniyor…</div>
            <div v-else-if="!recent.length" class="empty">Henüz üye yok.</div>
            <table v-else class="table">
              <thead>
                <tr><th>Ad Soyad</th><th>E-posta</th><th>Lisans No</th><th>Durum</th><th>Tarih</th></tr>
              </thead>
              <tbody>
                <tr v-for="m in recent" :key="m.id">
                  <td class="td-name">
                    <span class="mini-avatar">{{ m.name.charAt(0).toUpperCase() }}</span>
                    {{ m.name }} {{ m.lastname }}
                  </td>
                  <td class="muted">{{ m.mail }}</td>
                  <td>{{ m.lisanceno }}</td>
                  <td><span class="badge" :class="'b-' + m.status">{{ statusLabel(m.status) }}</span></td>
                  <td class="muted">{{ fmtDate(m.create_date) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="panel">
            <div class="panel-head"><h2>Hızlı İşlemler</h2></div>
            <div class="actions">
              <button v-for="a in quickActions" :key="a.label" class="action" @click="runAction(a)">
                <span class="action-ic"><svg viewBox="0 0 24 24"><path :d="ICONS[a.icon]" /></svg></span>
                {{ a.label }}
              </button>
            </div>
          </div>
        </section>
      </main>

    <!-- Üye ara modalı -->
    <q-dialog v-model="searchDialog" no-refocus>
      <q-card class="search-card">
        <q-card-section class="search-head">
          <div class="text-h6">Üye Ara</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="search-row">
          <q-input
            v-model="searchQuery"
            dense
            outlined
            autofocus
            placeholder="Ad, soyad, e-posta, TCKN, lisans no…"
            class="search-field"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-btn unelevated color="primary" icon="search" label="Ara" no-caps />
        </q-card-section>
        <q-card-section class="search-results">
          <div v-if="!searchQuery.trim()" class="search-hint">Aramak için yazmaya başlayın.</div>
          <div v-else-if="!searchResults.length" class="search-hint">Sonuç bulunamadı.</div>
          <q-list v-else separator>
            <q-item v-for="m in searchResults" :key="m.id" clickable @click="goMember">
              <q-item-section avatar>
                <div class="res-avatar">{{ m.name.charAt(0).toUpperCase() }}</div>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ m.name }} {{ m.lastname }}</q-item-label>
                <q-item-label caption>{{ m.mail }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="badge" :class="'b-' + m.status">{{ statusLabel(m.status) }}</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Yeni üye modalı (hızlı işlemler) -->
    <MemberFormDialog v-model="memberDialog" @saved="loadMembers" />
  </div>
</template>

<style scoped>
.dash {
  --brand: #aa3bff;
  --brand-2: #6d28d9;
  --ink: #18162a;
  --muted: #7b7889;
  --line: #ececf3;
  --page: #f4f3f9;
  color-scheme: light;
  min-height: 100vh;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--page);
  color: var(--ink);
}
svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---------- Topbar ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 26px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 10;
}
.tb-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.3px;
}
.crumb {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--muted);
}
.crumb span {
  margin: 0 4px;
}
.tb-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.searchbox {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #faf9fd;
  width: 230px;
}
.searchbox svg {
  width: 17px;
  height: 17px;
  color: #9b99ab;
}
.searchbox input {
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  width: 100%;
  color: var(--ink);
}
.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  color: #5a5870;
  cursor: pointer;
}
.icon-btn svg {
  width: 19px;
  height: 19px;
}
.badge-dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
}
.who {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 6px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
  color: #fff;
  font-weight: 700;
}
.who-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.who-name {
  font-size: 13.5px;
  font-weight: 700;
}
.who-sub {
  font-size: 11.5px;
  color: var(--muted);
}

/* ---------- Content ---------- */
.content {
  flex: 1;
  padding: 22px 26px 50px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.error {
  margin: 0;
  padding: 11px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
  border-radius: 11px;
  font-size: 14px;
}

/* Stat kartları */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat {
  position: relative;
  padding: 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 14px 30px -24px rgba(109, 40, 217, 0.55);
}
.stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stat-ic {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
}
.stat-ic svg {
  width: 21px;
  height: 21px;
}
.ic-total {
  background: rgba(170, 59, 255, 0.12);
  color: var(--brand);
}
.ic-active {
  background: rgba(34, 197, 94, 0.14);
  color: #16a34a;
}
.ic-inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.ic-pending {
  background: rgba(245, 158, 11, 0.16);
  color: #d97706;
}
.trend {
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: #f1eef8;
  color: #6a6880;
}
.trend.up {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
}
.trend.down {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}
.stat-num {
  margin: 14px 0 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.6px;
}
.stat-name {
  margin: 2px 0 0;
  font-size: 13.5px;
  color: var(--muted);
  font-weight: 600;
}
.spark {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 46%;
  height: 38px;
  opacity: 0.85;
}
.spark path {
  stroke-width: 2.2;
  fill: none;
}
.s-total {
  stroke: var(--brand);
}
.s-active {
  stroke: #22c55e;
}
.s-inactive {
  stroke: #ef4444;
}
.s-pending {
  stroke: #f59e0b;
}

/* Satır düzenleri */
.row-2 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
.row-3 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}
.panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.panel-head h2 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
}
.muted {
  color: var(--muted);
  font-size: 12.5px;
  margin: 2px 0 0;
}
.tabs {
  display: flex;
  gap: 4px;
  background: #f3f1f8;
  padding: 3px;
  border-radius: 9px;
}
.tabs button {
  border: 0;
  background: transparent;
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6a6880;
  cursor: pointer;
}
.tabs button.on {
  background: #fff;
  color: var(--brand-2);
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.15);
}

/* Bar chart */
.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 236px;
  padding: 26px 22px 18px;
  flex: 1;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  height: 100%;
}
.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.bar {
  width: 64%;
  max-width: 42px;
  min-height: 6px;
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(180deg, #b964ff, var(--brand-2));
  position: relative;
  transition: height 0.5s ease;
}
.bar-val {
  position: absolute;
  top: -19px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11.5px;
  font-weight: 700;
}
.bar-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
}

/* Oran halkası */
.ratio {
  align-items: center;
}
.ring {
  margin: 26px 0 20px;
  width: 158px;
  height: 158px;
  border-radius: 50%;
  background: conic-gradient(var(--brand) calc(var(--pct) * 1%), #ece7f5 0);
  display: grid;
  place-items: center;
}
.ring-center {
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  text-align: center;
}
.ring-pct {
  display: block;
  font-size: 27px;
  font-weight: 800;
}
.ring-sub {
  font-size: 11.5px;
  color: var(--muted);
}
.legend {
  list-style: none;
  margin: 0;
  padding: 0 22px 22px;
  width: 100%;
  display: grid;
  gap: 11px;
}
.legend li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: #45435a;
}
.legend b {
  margin-left: auto;
  font-size: 14px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.d-active {
  background: #22c55e;
}
.d-inactive {
  background: #ef4444;
}
.d-pending {
  background: #f59e0b;
}

/* Tablo */
.link {
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.empty {
  padding: 50px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.table th {
  text-align: left;
  padding: 12px 20px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--muted);
  background: #faf9fd;
}
.table td {
  padding: 12px 20px;
  border-top: 1px solid var(--line);
}
.td-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.mini-avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(170, 59, 255, 0.12);
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
}
.badge {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}
.b-active {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}
.b-inactive {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}
.b-pending {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

/* Hızlı işlemler */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 18px 20px;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 16px 8px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #fcfbfe;
  color: #45435a;
  font-size: 12.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.12s, box-shadow 0.2s;
}
.action:hover {
  border-color: var(--brand);
  color: var(--brand-2);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -12px rgba(109, 40, 217, 0.5);
}
.action-ic {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(170, 59, 255, 0.1);
  color: var(--brand);
}
.action-ic svg {
  width: 19px;
  height: 19px;
}

/* Responsive */
/* Üye ara modalı */
.search-card {
  width: 520px;
  max-width: 94vw;
  border-radius: 16px;
}
.search-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 6px;
}
.search-field {
  flex: 1;
}
.search-results {
  max-height: 360px;
  overflow-y: auto;
  padding-top: 4px;
}
.search-hint {
  padding: 28px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.res-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(170, 59, 255, 0.12);
  color: var(--brand);
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .row-2,
  .row-3 {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 860px) {
  .searchbox,
  .who-meta {
    display: none;
  }
}
</style>
