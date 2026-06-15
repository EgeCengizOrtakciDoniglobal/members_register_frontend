<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import {
  createMember,
  updateMember,
  logout as doLogout,
  ApiError,
  type Member,
  type MemberInput,
} from '../api'

const props = defineProps<{
  /** Dialog açık/kapalı (v-model). */
  modelValue: boolean
  /** Dolu ise düzenleme, boş/yok ise yeni kayıt modu. */
  member?: Member | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Kayıt/güncelleme başarılı olduğunda. */
  saved: []
}>()

const router = useRouter()
const $q = useQuasar()

const saving = ref(false)

const statusOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Pasif', value: 'inactive' },
  { label: 'Beklemede', value: 'pending' },
]

const form = reactive<MemberInput>({
  name: '',
  lastname: '',
  mail: '',
  tckn: '',
  lisanceno: '',
  status: 'active',
})

function fill() {
  const m = props.member
  form.name = m?.name ?? ''
  form.lastname = m?.lastname ?? ''
  form.mail = m?.mail ?? ''
  form.tckn = m?.tckn ?? ''
  form.lisanceno = m?.lisanceno ?? ''
  form.status = m?.status ?? 'active'
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
const tcknRule = (v: string) => /^\d{11}$/.test(v) || '11 haneli olmalı'

function close() {
  emit('update:modelValue', false)
}

async function save() {
  saving.value = true
  try {
    if (props.member) {
      await updateMember(props.member.id, { ...form })
      $q.notify({ type: 'positive', message: 'Üye güncellendi.', position: 'top' })
    } else {
      await createMember({ ...form })
      $q.notify({ type: 'positive', message: 'Üye eklendi.', position: 'top' })
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
        <div class="text-h6">{{ member ? 'Üyeyi Düzenle' : 'Yeni Üye' }}</div>
        <q-btn flat round dense icon="close" @click="close" />
      </q-card-section>

      <q-form @submit.prevent="save">
        <q-card-section class="form-body">
          <div class="grid-2">
            <q-input v-model="form.name" label="Ad *" outlined dense :rules="[required]" lazy-rules />
            <q-input v-model="form.lastname" label="Soyad *" outlined dense :rules="[required]" lazy-rules />
          </div>
          <q-input v-model="form.mail" label="E-posta *" type="email" outlined dense :rules="[required, mailRule]" lazy-rules />
          <div class="grid-2">
            <q-input v-model="form.tckn" label="TCKN *" outlined dense maxlength="11" :rules="[required, tcknRule]" lazy-rules />
            <q-input v-model="form.lisanceno" label="Lisans No *" outlined dense :rules="[required]" lazy-rules />
          </div>
          <q-select
            v-model="form.status"
            :options="statusOptions"
            label="Durum"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>

        <q-card-actions align="right" class="form-actions">
          <q-btn flat label="Vazgeç" color="grey-8" no-caps @click="close" />
          <q-btn type="submit" unelevated color="primary" :loading="saving" no-caps
            :label="member ? 'Kaydet' : 'Ekle'" />
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
