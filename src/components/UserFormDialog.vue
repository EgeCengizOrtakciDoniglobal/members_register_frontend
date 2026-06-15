<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import {
  createUser,
  updateUser,
  logout as doLogout,
  ApiError,
  type User,
  type UserInput,
} from '../api'

const props = defineProps<{
  /** Dialog açık/kapalı (v-model). */
  modelValue: boolean
  /** Dolu ise düzenleme, boş/yok ise yeni kayıt modu. */
  user?: User | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Kayıt/güncelleme başarılı olduğunda. */
  saved: []
}>()

const router = useRouter()
const $q = useQuasar()

const saving = ref(false)

const roleOptions = [
  { label: 'Yönetici (admin)', value: 'admin' },
  { label: 'Kullanıcı (user)', value: 'user' },
]
const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Pasif', value: 'inactive' },
  { label: 'Beklemede', value: 'pending' },
]

const form = reactive<UserInput>({
  name: '',
  mail: '',
  password: '',
  status: 'active',
  role: 'user',
})

function fill() {
  const u = props.user
  form.name = u?.name ?? ''
  form.mail = u?.mail ?? ''
  form.password = '' // Düzenlemede boş kalır; doldurulursa değişir.
  form.status = u?.status ?? 'active'
  form.role = u?.role ?? 'user'
}

// Dialog her açıldığında formu ilgili kayda göre doldur / sıfırla.
watch(
  () => props.modelValue,
  (open) => {
    if (open) fill()
  },
)

const required = (v: string) => (!!v && v.trim().length > 0) || 'Zorunlu alan'
const mailRule = (v: string) => /.+@.+\..+/.test(v) || 'Geçerli bir e-posta girin'
// Yeni kayıtta parola zorunlu ve en az 8 karakter; düzenlemede boşsa kabul, doluysa 8+.
const passwordRule = (v: string) => {
  if (!props.user) return (!!v && v.length >= 8) || 'En az 8 karakter'
  return !v || v.length >= 8 || 'En az 8 karakter'
}

function close() {
  emit('update:modelValue', false)
}

async function save() {
  saving.value = true
  try {
    if (props.user) {
      // Düzenleme: parola boşsa payload'a ekleme (değiştirme).
      const payload: Partial<UserInput> = {
        name: form.name,
        mail: form.mail,
        status: form.status,
        role: form.role,
      }
      if (form.password) payload.password = form.password
      await updateUser(props.user.id, payload)
      $q.notify({ type: 'positive', message: 'Kullanıcı güncellendi.', position: 'top' })
    } else {
      await createUser({ ...form })
      $q.notify({ type: 'positive', message: 'Kullanıcı eklendi.', position: 'top' })
    }
    emit('saved')
    close()
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      doLogout()
      router.push({ name: 'login' })
      return
    }
    const msg =
      e instanceof ApiError && e.errors
        ? Object.values(e.errors).flat()[0]
        : e instanceof Error
          ? e.message
          : 'Kaydedilemedi.'
    $q.notify({ type: 'negative', message: msg ?? 'Kaydedilemedi.', position: 'top' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card class="form-card">
      <q-card-section class="form-head">
        <div class="text-h6">{{ user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı' }}</div>
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-form @submit.prevent="save">
        <q-card-section class="form-body">
          <q-input v-model="form.name" label="Ad *" outlined dense :rules="[required]" lazy-rules />
          <q-input v-model="form.mail" label="E-posta *" type="email" outlined dense :rules="[required, mailRule]" lazy-rules />
          <q-input
            v-model="form.password"
            :label="user ? 'Yeni Parola (boş bırak = değişmez)' : 'Parola *'"
            type="password"
            outlined
            dense
            :rules="[passwordRule]"
            lazy-rules
          />
          <div class="grid-2">
            <q-select
              v-model="form.role"
              :options="roleOptions"
              label="Rol"
              outlined
              dense
              emit-value
              map-options
            />
            <q-select
              v-model="form.status"
              :options="statusOptions"
              label="Durum"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="form-actions">
          <q-btn flat label="Vazgeç" color="grey-8" no-caps @click="close" />
          <q-btn type="submit" unelevated color="primary" :loading="saving" no-caps
            :label="user ? 'Kaydet' : 'Ekle'" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.form-card {
  width: 480px;
  max-width: 92vw;
  border-radius: 16px;
}
.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
}
.form-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-actions {
  padding: 12px 16px 16px;
}
</style>
