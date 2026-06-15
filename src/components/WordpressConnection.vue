<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import {
  INTEGRATION_API_KEY,
  INTEGRATION_ENDPOINT,
  fetchIntegrationMembers,
  type Member,
} from '../api'

const router = useRouter()
const $q = useQuasar()

/* ---------- Secret key (maskeli) ---------- */
const revealed = ref(false)
const hasKey = computed(() => INTEGRATION_API_KEY.length > 0)
const maskedKey = computed(() => {
  const k = INTEGRATION_API_KEY
  if (!k) return 'Tanımlı değil'
  if (revealed.value) return k
  if (k.length <= 10) return '•'.repeat(k.length)
  return `${k.slice(0, 6)}${'•'.repeat(16)}${k.slice(-4)}`
})

async function copy(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    $q.notify({ type: 'positive', message: `${label} kopyalandı.`, position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Kopyalanamadı.', position: 'top' })
  }
}

/* ---------- Bağlantı testi / veri önizleme ---------- */
const testing = ref(false)
const tested = ref(false)
const errorMsg = ref('')
const result = ref<Member[]>([])

function statusLabel(s: Member['status']) {
  return s === 'active' ? 'Aktif' : s === 'inactive' ? 'Pasif' : 'Beklemede'
}

async function testConnection() {
  testing.value = true
  tested.value = false
  errorMsg.value = ''
  result.value = []
  try {
    result.value = await fetchIntegrationMembers(INTEGRATION_API_KEY)
    tested.value = true
    $q.notify({
      type: 'positive',
      message: `Bağlantı başarılı — ${result.value.length} aktif üye döndü.`,
      position: 'top',
    })
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Bağlantı başarısız oldu.'
    $q.notify({ type: 'negative', message: errorMsg.value, position: 'top' })
  } finally {
    testing.value = false
  }
}

const curlExample = computed(
  () => `curl -H "X-API-Key: ${revealed.value && hasKey.value ? INTEGRATION_API_KEY : '<SECRET_KEY>'}" \\\n  ${INTEGRATION_ENDPOINT}`,
)
</script>

<template>
  <div class="page">
    <!-- Üst bar -->
    <header class="bar">
      <div class="bar-left">
        <q-btn flat round dense icon="arrow_back" color="grey-8" @click="router.push({ name: 'dashboard' })" />
        <div>
          <h1>WordPress Bağlantı</h1>
          <p>Harici sistemlerin (WordPress eklentisi) aktif üyeleri çekeceği güvenli uç</p>
        </div>
      </div>
      <q-chip :color="hasKey ? 'green-1' : 'red-1'" :text-color="hasKey ? 'green-9' : 'red-9'" icon="vpn_key" square>
        {{ hasKey ? 'Anahtar tanımlı' : 'Anahtar tanımsız' }}
      </q-chip>
    </header>

    <div class="wrap">
      <!-- Bağlantı bilgileri -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Bağlantı Bilgileri</h2>
            <p class="muted">Bu bilgileri WordPress eklentisine girerek üye verilerini senkronize edebilirsiniz.</p>
          </div>
        </div>

        <div class="panel-body">
          <!-- Endpoint -->
          <label class="field-label">Uç Adresi (Endpoint)</label>
          <div class="field-row">
            <q-input :model-value="INTEGRATION_ENDPOINT" readonly outlined dense class="grow">
              <template #prepend><q-icon name="link" /></template>
              <template #before><q-badge color="primary" label="GET" class="method" /></template>
            </q-input>
            <q-btn flat round dense icon="content_copy" color="primary" @click="copy(INTEGRATION_ENDPOINT, 'Adres')">
              <q-tooltip>Kopyala</q-tooltip>
            </q-btn>
          </div>

          <!-- Header adı -->
          <label class="field-label">Kimlik Doğrulama Başlığı (Header)</label>
          <div class="field-row">
            <q-input model-value="X-API-Key" readonly outlined dense class="grow">
              <template #prepend><q-icon name="vpn_key" /></template>
            </q-input>
          </div>

          <!-- Secret key -->
          <label class="field-label">Secret Key</label>
          <div class="field-row">
            <q-input :model-value="maskedKey" readonly outlined dense class="grow mono" :error="!hasKey"
              :error-message="!hasKey ? 'VITE_INTEGRATION_API_KEY .env içinde tanımlı değil.' : undefined">
              <template #prepend><q-icon name="key" /></template>
            </q-input>
            <q-btn flat round dense :icon="revealed ? 'visibility_off' : 'visibility'" color="grey-8"
              :disable="!hasKey" @click="revealed = !revealed">
              <q-tooltip>{{ revealed ? 'Gizle' : 'Göster' }}</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="content_copy" color="primary" :disable="!hasKey"
              @click="copy(INTEGRATION_API_KEY, 'Secret key')">
              <q-tooltip>Kopyala</q-tooltip>
            </q-btn>
          </div>

          <!-- curl örneği -->
          <label class="field-label">Örnek İstek</label>
          <pre class="code">{{ curlExample }}</pre>
        </div>
      </section>

      <!-- Veri aktarımı / test -->
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Veri Aktarımını Test Et</h2>
            <p class="muted">Secret key ile uca bağlanır ve WordPress'in çekeceği aktif üyeleri önizler.</p>
          </div>
          <q-btn unelevated color="primary" icon="sync" label="Bağlantıyı Test Et" no-caps
            :loading="testing" :disable="!hasKey" @click="testConnection" />
        </div>

        <div class="panel-body">
          <q-banner v-if="errorMsg" class="banner err" rounded>
            <template #avatar><q-icon name="error" color="negative" /></template>
            {{ errorMsg }}
          </q-banner>

          <template v-else-if="tested">
            <q-banner class="banner ok" rounded>
              <template #avatar><q-icon name="check_circle" color="positive" /></template>
              Bağlantı başarılı — <b>{{ result.length }}</b> aktif üye aktarıma hazır.
            </q-banner>

            <div v-if="result.length" class="preview">
              <table class="ptable">
                <thead>
                  <tr><th>Ad Soyad</th><th>E-posta</th><th>Lisans No</th><th>Durum</th></tr>
                </thead>
                <tbody>
                  <tr v-for="m in result" :key="m.id">
                    <td>{{ m.name }} {{ m.lastname }}</td>
                    <td class="muted-cell">{{ m.mail }}</td>
                    <td>{{ m.lisanceno }}</td>
                    <td><span class="badge b-active">{{ statusLabel(m.status) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <div v-else class="hint">
            <q-icon name="cloud_sync" size="38px" color="grey-5" />
            <span>Bağlantıyı test etmek için yukarıdaki butonu kullanın.</span>
          </div>
        </div>
      </section>
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
  gap: 16px;
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
  padding: 24px 28px 50px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.panel {
  background: #fff;
  border: 1px solid #ececf3;
  border-radius: 16px;
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid #ececf3;
}
.panel-head h2 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
}
.muted {
  margin: 3px 0 0;
  color: #7b7889;
  font-size: 12.5px;
}
.panel-body {
  padding: 18px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7b7889;
  margin-top: 10px;
}
.field-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.grow {
  flex: 1;
}
.mono :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.5px;
}
.method {
  font-weight: 700;
  border-radius: 6px;
}
.code {
  margin: 4px 0 0;
  padding: 14px 16px;
  background: #1e1b2e;
  color: #e7e3f5;
  border-radius: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.banner {
  font-size: 13.5px;
}
.banner.ok {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}
.banner.err {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}
.preview {
  margin-top: 14px;
  max-height: 340px;
  overflow: auto;
  border: 1px solid #ececf3;
  border-radius: 12px;
}
.ptable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.ptable th {
  text-align: left;
  padding: 11px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7b7889;
  background: #faf9fd;
  position: sticky;
  top: 0;
}
.ptable td {
  padding: 11px 16px;
  border-top: 1px solid #ececf3;
}
.muted-cell {
  color: #7b7889;
}
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
}
.b-active {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}
.hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #7b7889;
  font-size: 14px;
}
</style>
