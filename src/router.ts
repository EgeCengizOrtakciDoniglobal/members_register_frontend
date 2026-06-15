import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from './api'
import LoginScreen from './components/LoginScreen.vue'
import Dashboard from './components/Dashboard.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginScreen, meta: { guestOnly: true } },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const authed = isAuthenticated()

  // Token yoksa korumalı sayfayı login'e yönlendir
  if (to.meta.requiresAuth && !authed) {
    return { name: 'login' }
  }

  // Zaten giriş yapmışken login sayfasına gidilirse dashboard'a at
  if (to.meta.guestOnly && authed) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
