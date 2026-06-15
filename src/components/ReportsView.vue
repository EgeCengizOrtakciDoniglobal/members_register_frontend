<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getMembers, logout as doLogout, ApiError, type Member } from '../api'

const route = useRoute()
const router = useRouter()

const members = ref<Member[]>([])
const loading = ref(true)
const errorMsg = ref('')

// Sekme URL'deki ?tab=status ile senkron (menüdeki "Durum Raporu" bağlantısı için).
const tab = ref<'monthly' | 'status'>(route.query.tab === 'status' ? 'status' : 'monthly')
watch(
  () => route.query.tab,
  (t) => {
    tab.value = t === 'status' ? 'status' : 'monthly'
  },
)

const monthsRange = ref(6)

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
function parseDate(s: string): Date {
  return new Date(s.replace(' ', 'T'))
}

type Bucket = { label: string; key: string; total: number; active: number; inactive: number; pending: number }

const monthly = computed<Bucket[]>(() => {
  const now = new Date()
  const buckets: Bucket[] = []
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

const rangeTotal = computed(() => monthly.value.reduce((s, b) => s + b.total, 0))
const monthlyAvg = computed(() =>
  monthly.value.length ? Math.round((rangeTotal.value / monthly.value.length) * 10) / 10 : 0,
)
const bestMonth = computed(() => {
  let best: Bucket | null = null
  for (const b of monthly.value) if (!best || b.total > best.total) best = b
  return best ?? { label: '—', total: 0 }
})

const total = computed(() => members.value.length)

const statusRows = computed(() => {
  const defs: { key: Member['status']; label: string }[] = [
    { key: 'active', label: 'Aktif' },
    { key: 'inactive', label: 'Pasif' },
    { key: 'pending', label: 'Beklemede' },
  ]
  return defs.map((d) => {
    const count = members.value.filter((m) => m.status === d.key).length
    return { ...d, count, pct: total.value ? Math.round((count / total.value) * 100) : 0 }
  })
})

async function load() {
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
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="bar">
      <div class="bar-left">
        <q-btn flat round dense icon="arrow_back" color="grey-8" @click="router.push({ name: 'dashboard' })" />
        <div>
          <h1>Raporlar</h1>
          <p>Üye verilerinin aylık ve durum bazlı özeti</p>
        </div>
      </div>
    </header>

    <div class="wrap">
      <q-tabs v-model="tab" class="rtabs" active-color="primary" indicator-color="primary" align="left" no-caps narrow-indicator>
        <q-tab name="monthly" icon="bar_chart" label="Aylık Rapor" />
        <q-tab name="status" icon="donut_large" label="Durum Raporu" />
      </q-tabs>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <q-tab-panels v-model="tab" animated class="panels">
        <!-- Aylık Rapor -->
        <q-tab-panel name="monthly" class="panel-pad">
          <div class="range">
            <span class="range-label">Dönem</span>
            <div class="range-btns">
              <button :class="{ on: monthsRange === 3 }" @click="monthsRange = 3">3 Ay</button>
              <button :class="{ on: monthsRange === 6 }" @click="monthsRange = 6">6 Ay</button>
              <button :class="{ on: monthsRange === 12 }" @click="monthsRange = 12">12 Ay</button>
            </div>
          </div>

          <div class="cards">
            <div class="card">
              <span class="card-label">Dönem Toplamı</span>
              <span class="card-num">{{ loading ? '—' : rangeTotal }}</span>
              <span class="card-sub">son {{ monthsRange }} ayda eklenen</span>
            </div>
            <div class="card">
              <span class="card-label">Aylık Ortalama</span>
              <span class="card-num">{{ loading ? '—' : monthlyAvg }}</span>
              <span class="card-sub">üye / ay</span>
            </div>
            <div class="card">
              <span class="card-label">En Yüksek Ay</span>
              <span class="card-num">{{ loading ? '—' : bestMonth.total }}</span>
              <span class="card-sub">{{ bestMonth.label }}</span>
            </div>
          </div>

          <div class="block">
            <div class="block-head"><h2>Aylık Eklenen Üye</h2></div>
            <div class="chart">
              <div v-for="b in chart" :key="b.key" class="bar-col">
                <div class="bar-track">
                  <div class="chart-bar" :style="{ height: Math.max(b.pct, 3) + '%' }">
                    <span class="bar-val">{{ b.total }}</span>
                  </div>
                </div>
                <span class="bar-label">{{ b.label }}</span>
              </div>
            </div>
          </div>

          <div class="block">
            <div class="block-head"><h2>Aylık Döküm</h2></div>
            <table class="rtable-tbl">
              <thead>
                <tr><th>Ay</th><th>Toplam</th><th>Aktif</th><th>Pasif</th><th>Beklemede</th></tr>
              </thead>
              <tbody>
                <tr v-for="b in monthly" :key="b.key">
                  <td>{{ b.label }}</td>
                  <td><b>{{ b.total }}</b></td>
                  <td>{{ b.active }}</td>
                  <td>{{ b.inactive }}</td>
                  <td>{{ b.pending }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr><td>Dönem Toplamı</td><td><b>{{ rangeTotal }}</b></td><td colspan="3"></td></tr>
              </tfoot>
            </table>
          </div>
        </q-tab-panel>

        <!-- Durum Raporu -->
        <q-tab-panel name="status" class="panel-pad">
          <div class="cards">
            <div v-for="r in statusRows" :key="r.key" class="card">
              <span class="card-label">{{ r.label }}</span>
              <span class="card-num">{{ loading ? '—' : r.count }}</span>
              <span class="card-sub">%{{ r.pct }}</span>
            </div>
          </div>

          <div class="block">
            <div class="block-head"><h2>Durum Dağılımı</h2></div>
            <div class="dist">
              <div v-for="r in statusRows" :key="r.key" class="dist-row">
                <span class="dist-name">{{ r.label }}</span>
                <div class="dist-bar"><div class="dist-fill" :class="'f-' + r.key" :style="{ width: Math.max(r.pct, 2) + '%' }" /></div>
                <span class="dist-val">{{ r.count }} <em>(%{{ r.pct }})</em></span>
              </div>
            </div>
          </div>

          <div class="block">
            <div class="block-head"><h2>Toplam Döküm</h2></div>
            <table class="rtable-tbl">
              <thead><tr><th>Durum</th><th>Adet</th><th>Yüzde</th></tr></thead>
              <tbody>
                <tr v-for="r in statusRows" :key="r.key"><td>{{ r.label }}</td><td><b>{{ r.count }}</b></td><td>%{{ r.pct }}</td></tr>
              </tbody>
              <tfoot><tr><td>Toplam</td><td><b>{{ total }}</b></td><td>%100</td></tr></tfoot>
            </table>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f3f9;
  color: #18162a;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: #fff;
  border-bottom: 1px solid #ececf3;
  position: sticky;
  top: 0;
  z-index: 5;
}
.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bar h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}
.bar p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #7b7889;
}
.wrap {
  padding: 22px 28px 50px;
  max-width: 1100px;
  margin: 0 auto;
}
.rtabs {
  background: #fff;
  border: 1px solid #ececf3;
  border-radius: 12px;
  margin-bottom: 18px;
}
.error {
  margin: 0 0 16px;
  padding: 11px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
  border-radius: 11px;
  font-size: 14px;
}
.panels {
  background: transparent;
}
.panel-pad {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Dönem seçici */
.range {
  display: flex;
  align-items: center;
  gap: 12px;
}
.range-label {
  font-size: 13px;
  font-weight: 700;
  color: #7b7889;
}
.range-btns {
  display: flex;
  gap: 4px;
  background: #ece9f4;
  padding: 3px;
  border-radius: 9px;
}
.range-btns button {
  border: 0;
  background: transparent;
  padding: 6px 14px;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: #6a6880;
  cursor: pointer;
  font-family: inherit;
}
.range-btns button.on {
  background: #fff;
  color: #6d28d9;
  box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.15);
}

/* Özet kartlar */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  background: #fff;
  border: 1px solid #ececf3;
  border-radius: 16px;
}
.card-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #7b7889;
}
.card-num {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.card-sub {
  font-size: 12px;
  color: #9b99ab;
}

/* Bloklar */
.block {
  background: #fff;
  border: 1px solid #ececf3;
  border-radius: 16px;
  overflow: hidden;
}
.block-head {
  padding: 15px 20px;
  border-bottom: 1px solid #ececf3;
}
.block-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

/* Bar grafik */
.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 220px;
  padding: 28px 22px 18px;
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
.chart-bar {
  width: 64%;
  max-width: 44px;
  min-height: 6px;
  border-radius: 8px 8px 4px 4px;
  background: linear-gradient(180deg, #b964ff, #6d28d9);
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
  color: #7b7889;
  font-weight: 600;
}

/* Tablolar */
.rtable-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.rtable-tbl th {
  text-align: left;
  padding: 12px 20px;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7b7889;
  background: #faf9fd;
}
.rtable-tbl td {
  padding: 11px 20px;
  border-top: 1px solid #ececf3;
}
.rtable-tbl tfoot td {
  background: #faf9fd;
  font-weight: 700;
}

/* Durum dağılım çubukları */
.dist {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}
.dist-row {
  display: grid;
  grid-template-columns: 90px 1fr 110px;
  align-items: center;
  gap: 14px;
}
.dist-name {
  font-size: 13.5px;
  font-weight: 600;
}
.dist-bar {
  height: 12px;
  border-radius: 999px;
  background: #f0edf7;
  overflow: hidden;
}
.dist-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}
.f-active {
  background: #22c55e;
}
.f-inactive {
  background: #ef4444;
}
.f-pending {
  background: #f59e0b;
}
.dist-val {
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}
.dist-val em {
  font-style: normal;
  color: #9b99ab;
  font-weight: 600;
}

@media (max-width: 760px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .dist-row {
    grid-template-columns: 80px 1fr 90px;
  }
}
</style>
