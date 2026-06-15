<script setup lang="ts">
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout as doLogout } from '../api'

const route = useRoute()
const router = useRouter()

const ICONS: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  userplus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}

interface NavChild { title: string; route?: string; query?: Record<string, string> }
interface NavItem { id: string; title: string; icon: string; route?: string; children?: NavChild[] }

const menu: { section: string; items: NavItem[] }[] = [
  {
    section: 'ANA MENÜ',
    items: [
      { id: 'dash', title: 'Dashboard', icon: 'grid', children: [{ title: 'Genel Bakış', route: 'dashboard' }] },
      { id: 'members', title: 'Üyeler', icon: 'users', children: [{ title: 'Tüm Üyeler', route: 'members' }] },
    ],
  },
  {
    section: 'YÖNETİM',
    items: [
      { id: 'reports', title: 'Raporlar', icon: 'chart', children: [{ title: 'Aylık Rapor', route: 'reports' }, { title: 'Durum Raporu', route: 'reports', query: { tab: 'status' } }] },
      { id: 'settings', title: 'Ayarlar', icon: 'settings', children: [{ title: 'WordPress Bağlantı', route: 'wp-connection' }] },
    ],
  },
]

// Tüm gruplar varsayılan olarak açık gelsin.
const open = reactive<Record<string, boolean>>({ dash: true, members: true, reports: true, settings: true })
function toggle(id: string) {
  open[id] = !open[id]
}
function go(name?: string) {
  if (name && name !== route.name) router.push({ name })
}
function goChild(c: NavChild) {
  if (!c.route) return
  router.push({ name: c.route, query: c.query })
}
function isActive(name?: string) {
  return !!name && route.name === name
}
function isChildActive(c: NavChild) {
  if (!c.route || route.name !== c.route) return false
  const tab = c.query?.tab
  // Sekmeli rotalarda (raporlar) doğru alt sekmeyi vurgula.
  return tab ? route.query.tab === tab : route.query.tab !== 'status'
}
function logout() {
  doLogout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="logo-mark">M</span>
      <div class="brand-text">
        <span class="brand-name">Members</span>
        <span class="brand-sub">Yönetim Paneli</span>
      </div>
    </div>

    <nav class="nav">
      <template v-for="grp in menu" :key="grp.section">
        <p class="nav-section">{{ grp.section }}</p>
        <template v-for="item in grp.items" :key="item.id">
          <template v-if="item.children">
            <button class="nav-parent" :class="{ open: open[item.id] }" @click="toggle(item.id)">
              <svg class="nav-ic" viewBox="0 0 24 24"><path :d="ICONS[item.icon]" /></svg>
              <span class="nav-title">{{ item.title }}</span>
              <svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <div class="submenu" :class="{ open: open[item.id] }">
              <div class="submenu-inner">
                <a v-for="c in item.children" :key="c.title" class="nav-child" :class="{ active: isChildActive(c) }" href="#" @click.prevent="goChild(c)">
                  <span class="bullet" />{{ c.title }}
                </a>
              </div>
            </div>
          </template>
          <a v-else class="nav-parent solo" :class="{ active: isActive(item.route) }" href="#" @click.prevent="go(item.route)">
            <svg class="nav-ic" viewBox="0 0 24 24"><path :d="ICONS[item.icon]" /></svg>
            <span class="nav-title">{{ item.title }}</span>
          </a>
        </template>
      </template>
    </nav>

    <button class="side-logout" @click="logout">
      <svg class="nav-ic" viewBox="0 0 24 24"><path :d="ICONS.logout" /></svg>
      Çıkış Yap
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  --brand: #aa3bff;
  --brand-2: #6d28d9;
  --ink: #18162a;
  --muted: #7b7889;
  --line: #ececf3;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  background: #fff;
  border-right: 1px solid var(--line);
  position: sticky;
  top: 0;
  height: 100vh;
}
svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px 18px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--line);
}
.logo-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--brand), var(--brand-2));
  color: #fff;
  font-weight: 800;
  font-size: 21px;
  box-shadow: 0 8px 18px -8px rgba(109, 40, 217, 0.7);
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-name {
  font-weight: 800;
  font-size: 17px;
  color: var(--ink);
}
.brand-sub {
  font-size: 11.5px;
  color: var(--muted);
}
.nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-section {
  margin: 14px 12px 6px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.7px;
  color: #b6b4c4;
}
.nav-parent {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #45435a;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.nav-parent:hover {
  background: #f6f3fc;
  color: var(--ink);
}
.nav-parent.open {
  color: var(--brand-2);
}
.nav-parent.solo.active {
  background: linear-gradient(135deg, rgba(170, 59, 255, 0.13), rgba(109, 40, 217, 0.1));
  color: var(--brand-2);
  font-weight: 700;
}
.nav-ic {
  width: 19px;
  height: 19px;
  flex: none;
}
.nav-title {
  flex: 1;
  text-align: left;
}
.chev {
  width: 16px;
  height: 16px;
  color: #b6b4c4;
  transition: transform 0.22s ease;
}
.nav-parent.open .chev {
  transform: rotate(90deg);
}
.submenu {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}
.submenu.open {
  grid-template-rows: 1fr;
}
.submenu-inner {
  overflow: hidden;
}
.nav-child {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 12px 8px 26px;
  margin: 1px 0;
  border-radius: 9px;
  color: #6a6880;
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.nav-child:hover {
  background: #f6f3fc;
  color: var(--ink);
}
.nav-child.active {
  background: linear-gradient(135deg, rgba(170, 59, 255, 0.13), rgba(109, 40, 217, 0.1));
  color: var(--brand-2);
  font-weight: 700;
}
.bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
  opacity: 0.5;
}
.nav-child.active .bullet {
  opacity: 1;
}
.side-logout {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 10px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: #45435a;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.side-logout:hover {
  border-color: var(--brand);
  color: var(--brand);
}
</style>
