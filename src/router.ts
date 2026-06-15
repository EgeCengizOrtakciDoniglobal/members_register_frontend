import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from './api'
import LoginScreen from './components/LoginScreen.vue'
import AppShell from './components/AppShell.vue'
import Dashboard from './components/Dashboard.vue'
import MembersView from './components/MembersView.vue'
import WordpressConnection from './components/WordpressConnection.vue'
import ReportsView from './components/ReportsView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginScreen, meta: { guestOnly: true } },
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: Dashboard },
        { path: 'members', name: 'members', component: MembersView },
        { path: 'reports', name: 'reports', component: ReportsView },
        { path: 'settings/wordpress', name: 'wp-connection', component: WordpressConnection },
      ],
    },
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
