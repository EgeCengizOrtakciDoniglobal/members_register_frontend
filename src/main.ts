import { createApp } from 'vue'
import { Quasar, Notify, Dialog, setCssVar } from 'quasar'

// Quasar ikon seti ve hazır stilleri
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'

import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(Quasar, {
  plugins: { Notify, Dialog },
})

// Marka renklerini (mor tema) çalışma anında ayarla
setCssVar('primary', '#aa3bff')
setCssVar('secondary', '#6d28d9')
setCssVar('positive', '#22c55e')
setCssVar('negative', '#ef4444')
setCssVar('warning', '#f59e0b')

app.use(router).mount('#app')
