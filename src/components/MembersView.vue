<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar, type QTableColumn } from 'quasar'
import {
  getMembers,
  deleteMember,
  logout as doLogout,
  ApiError,
  type Member,
} from '../api'
import MemberFormDialog from './MemberFormDialog.vue'

const router = useRouter()
const $q = useQuasar()

const rows = ref<Member[]>([])
const loading = ref(false)
const filter = ref('')

const statusFilter = ref<'all' | Member['status']>('all')
const statusFilterOptions = [
  { label: 'Tümü', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Pasif', value: 'inactive' },
  { label: 'Beklemede', value: 'pending' },
]
const displayedRows = computed(() =>
  statusFilter.value === 'all' ? rows.value : rows.value.filter((m) => m.status === statusFilter.value),
)

const columns: QTableColumn<Member>[] = [
  { name: 'name', label: 'Ad', field: 'name', align: 'left', sortable: true },
  { name: 'lastname', label: 'Soyad', field: 'lastname', align: 'left', sortable: true },
  { name: 'mail', label: 'E-posta', field: 'mail', align: 'left', sortable: true },
  { name: 'tckn', label: 'TCKN', field: 'tckn', align: 'left' },
  { name: 'lisanceno', label: 'Lisans No', field: 'lisanceno', align: 'left' },
  { name: 'status', label: 'Durum', field: 'status', align: 'center', sortable: true },
  { name: 'create_date', label: 'Tarih', field: 'create_date', align: 'left', sortable: true,
    format: (v: string) => new Date(v.replace(' ', 'T')).toLocaleDateString('tr-TR') },
  { name: 'actions', label: 'İşlemler', field: 'id', align: 'right' },
]

function statusColor(s: Member['status']) {
  return s === 'active' ? 'positive' : s === 'inactive' ? 'negative' : 'warning'
}
function statusLabel(s: Member['status']) {
  return s === 'active' ? 'Aktif' : s === 'inactive' ? 'Pasif' : 'Beklemede'
}

/* ---------- Veri yükleme ---------- */
async function load() {
  loading.value = true
  try {
    rows.value = await getMembers()
  } catch (e) {
    handleError(e, 'Üyeler yüklenemedi.')
  } finally {
    loading.value = false
  }
}

function handleError(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.status === 401) {
    doLogout()
    router.push({ name: 'login' })
    return
  }
  const msg = e instanceof ApiError && e.errors
    ? Object.values(e.errors).flat()[0]
    : e instanceof Error
      ? e.message
      : fallback
  $q.notify({ type: 'negative', message: msg ?? fallback, position: 'top' })
}

/* ---------- Form (ekle / düzenle) — MemberFormDialog bileşeniyle ---------- */
const dialog = ref(false)
const editing = ref<Member | null>(null)

function openCreate() {
  editing.value = null
  dialog.value = true
}

function openEdit(m: Member) {
  editing.value = m
  dialog.value = true
}

/* ---------- Silme ---------- */
function confirmDelete(m: Member) {
  $q.dialog({
    title: 'Üyeyi sil',
    message: `${m.name} ${m.lastname} adlı üyeyi silmek istediğinize emin misiniz?`,
    cancel: { label: 'Vazgeç', flat: true, color: 'grey-8' },
    ok: { label: 'Sil', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteMember(m.id)
      $q.notify({ type: 'positive', message: 'Üye silindi.', position: 'top' })
      await load()
    } catch (e) {
      handleError(e, 'Silinemedi.')
    }
  })
}

onMounted(load)
</script>

<template>
  <div class="page">
    <!-- Üst bar -->
    <header class="bar">
      <div class="bar-left">
        <q-btn flat round dense icon="arrow_back" color="grey-8" @click="router.push({ name: 'dashboard' })" />
        <div>
          <h1>Üye Yönetimi</h1>
          <p>Üyeleri görüntüle, ekle, düzenle ve sil</p>
        </div>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Yeni Üye" no-caps @click="openCreate" />
    </header>

    <!-- Tablo -->
    <div class="wrap">
      <q-table
        :rows="displayedRows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :filter="filter"
        flat
        bordered
        :rows-per-page-options="[10, 20, 50, 0]"
        class="members-table"
      >
        <template #top-left>
          <div class="top-left">
            <div class="t-title">Tüm Üyeler <span class="count">{{ displayedRows.length }}</span></div>
            <q-btn-toggle
              v-model="statusFilter"
              :options="statusFilterOptions"
              no-caps
              unelevated
              dense
              toggle-color="primary"
              color="white"
              text-color="grey-8"
              class="status-toggle"
            />
          </div>
        </template>
        <template #top-right>
          <q-input v-model="filter" dense outlined debounce="200" placeholder="Ara…">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </template>

        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="cell-name">
              <span class="avatar">{{ props.row.name.charAt(0).toUpperCase() }}</span>
              {{ props.row.name }}
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" rounded class="status-badge" />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense icon="edit" color="primary" size="sm" @click="openEdit(props.row)">
              <q-tooltip>Düzenle</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(props.row)">
              <q-tooltip>Sil</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="empty">
            <q-icon name="group_off" size="42px" color="grey-5" />
            <span>Henüz üye yok. "Yeni Üye" ile ekleyebilirsin.</span>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Ekle / Düzenle dialog -->
    <MemberFormDialog v-model="dialog" :member="editing" @saved="load" />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f3f9;
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
  color: #18162a;
}
.bar p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #7b7889;
}
.wrap {
  padding: 24px 28px 50px;
  max-width: 1200px;
  margin: 0 auto;
}
.members-table {
  background: #fff;
  border-radius: 16px;
}
.members-table :deep(thead th) {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7b7889;
  background: #faf9fd;
}
.members-table :deep(tbody td) {
  font-size: 13.5px;
}
.t-title {
  font-size: 16px;
  font-weight: 700;
  color: #18162a;
}
.count {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 9px;
  border-radius: 999px;
  background: rgba(170, 59, 255, 0.12);
  color: #6d28d9;
  font-size: 12.5px;
  font-weight: 700;
}
.top-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.status-toggle {
  border: 1px solid #ececf3;
  border-radius: 9px;
  overflow: hidden;
}
/* Segment butonları: net aralık, sabit yükseklik, üst üste binme yok */
.status-toggle :deep(.q-btn) {
  min-height: 30px;
  padding: 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 0;
}
.status-toggle :deep(.q-btn + .q-btn) {
  border-left: 1px solid #ececf3;
}
.cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: rgba(170, 59, 255, 0.12);
  color: #aa3bff;
  font-size: 13px;
  font-weight: 700;
}
.status-badge {
  padding: 4px 11px;
  font-weight: 700;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  width: 100%;
  color: #7b7889;
  font-size: 14px;
}
</style>
