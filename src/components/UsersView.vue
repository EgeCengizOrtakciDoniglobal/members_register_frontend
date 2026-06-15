<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar, type QTableColumn } from 'quasar'
import {
  getUsers,
  deleteUser,
  userStore,
  logout as doLogout,
  ApiError,
  type User,
} from '../api'
import UserFormDialog from './UserFormDialog.vue'

const router = useRouter()
const $q = useQuasar()

const rows = ref<User[]>([])
const loading = ref(false)
const filter = ref('')

// Kendi hesabını silmeyi engellemek için giriş yapan kullanıcının id'si.
const myId = userStore.get()?.id ?? -1

const columns: QTableColumn<User>[] = [
  { name: 'name', label: 'Ad', field: 'name', align: 'left', sortable: true },
  { name: 'mail', label: 'E-posta', field: 'mail', align: 'left', sortable: true },
  { name: 'role', label: 'Rol', field: 'role', align: 'center', sortable: true },
  { name: 'status', label: 'Durum', field: 'status', align: 'center', sortable: true },
  { name: 'create_date', label: 'Tarih', field: 'create_date', align: 'left', sortable: true,
    format: (v: string) => new Date(v.replace(' ', 'T')).toLocaleDateString('tr-TR') },
  { name: 'actions', label: 'İşlemler', field: 'id', align: 'right' },
]

function statusColor(s: User['status']) {
  return s === 'active' ? 'positive' : s === 'inactive' ? 'negative' : 'warning'
}
function statusLabel(s: User['status']) {
  return s === 'active' ? 'Aktif' : s === 'inactive' ? 'Pasif' : 'Beklemede'
}
function roleLabel(r: User['role']) {
  return r === 'admin' ? 'Yönetici' : 'Kullanıcı'
}

/* ---------- Veri yükleme ---------- */
async function load() {
  loading.value = true
  try {
    rows.value = await getUsers()
  } catch (e) {
    handleError(e, 'Kullanıcılar yüklenemedi.')
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

/* ---------- Form (ekle / düzenle) ---------- */
const dialog = ref(false)
const editing = ref<User | null>(null)

function openCreate() {
  editing.value = null
  dialog.value = true
}

function openEdit(u: User) {
  editing.value = u
  dialog.value = true
}

/* ---------- Silme ---------- */
function confirmDelete(u: User) {
  $q.dialog({
    title: 'Kullanıcıyı sil',
    message: `${u.name} adlı kullanıcıyı silmek istediğinize emin misiniz?`,
    cancel: { label: 'Vazgeç', flat: true, color: 'grey-8' },
    ok: { label: 'Sil', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async () => {
    try {
      await deleteUser(u.id)
      $q.notify({ type: 'positive', message: 'Kullanıcı silindi.', position: 'top' })
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
          <h1>Kullanıcı Yönetimi</h1>
          <p>Panel kullanıcılarını görüntüle, ekle, düzenle ve yetki ata</p>
        </div>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Yeni Kullanıcı" no-caps @click="openCreate" />
    </header>

    <!-- Tablo -->
    <div class="wrap">
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :filter="filter"
        flat
        bordered
        :rows-per-page-options="[10, 20, 50, 0]"
        class="users-table"
      >
        <template #top-left>
          <div class="t-title">Tüm Kullanıcılar <span class="count">{{ rows.length }}</span></div>
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
              <q-badge v-if="props.row.id === myId" color="primary" label="Siz" class="me-badge" />
            </div>
          </q-td>
        </template>

        <template #body-cell-role="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="props.row.role === 'admin' ? 'deep-purple-5' : 'blue-grey-4'" :label="roleLabel(props.row.role)" rounded class="status-badge" />
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
            <q-btn
              flat round dense icon="delete" color="negative" size="sm"
              :disable="props.row.id === myId"
              @click="confirmDelete(props.row)"
            >
              <q-tooltip>{{ props.row.id === myId ? 'Kendinizi silemezsiniz' : 'Sil' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="empty">
            <q-icon name="person_off" size="42px" color="grey-5" />
            <span>Henüz kullanıcı yok. "Yeni Kullanıcı" ile ekleyebilirsin.</span>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Ekle / Düzenle dialog -->
    <UserFormDialog v-model="dialog" :user="editing" @saved="load" />
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
.users-table {
  background: #fff;
  border-radius: 16px;
}
.users-table :deep(thead th) {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #7b7889;
  background: #faf9fd;
}
.users-table :deep(tbody td) {
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
.cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.me-badge {
  font-size: 10px;
  font-weight: 700;
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
