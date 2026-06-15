# Members Register — Frontend (Vue 3 + Quasar)

Üye kayıt / yönetim panelinin arayüzü. **Vue 3 + TypeScript + Vite** ile yazılmıştır, bileşen kütüphanesi olarak **Quasar** kullanır. Backend olan Laravel REST API'sini (`members_register_backend`) tüketir.

---

## Özellikler

- **Giriş / oturum** — Bearer token ile kimlik doğrulama (token `localStorage`'da tutulur).
- **Dashboard** — Üye istatistikleri, aylık grafik, durum dağılımı, hızlı işlemler.
- **Üye yönetimi** — Listele, ara, filtrele, ekle, düzenle, sil.
- **Kullanıcı yönetimi** *(yalnızca admin)* — Panel kullanıcılarını listele, ekle, düzenle, sil ve **rol ata** (admin/user).
- **Raporlar** — Aylık ve durum bazlı raporlar.
- **WordPress bağlantısı** — Entegrasyon ucunu ve API anahtarını önizleme.

---

## Roller (arayüz davranışı)

Giriş yanıtındaki `user.role` değerine göre arayüz uyarlanır:

| | admin | user |
|---|:--:|:--:|
| "Kullanıcılar" menüsü ve `/users` sayfası | ✓ | gizli |
| Üye listesinde **sil** butonu | ✓ | gizli |
| Üye ekle / düzenle | ✓ | ✓ |

> Bu kısıtlar arayüzde gizlemenin yanı sıra **backend'de de** zorunludur (admin olmayan istek `403` alır). Arayüz yalnızca kullanım kolaylığı için gizler.

---

## Gereksinimler

- Node.js 18+
- Çalışan backend API (`members_register_backend`, varsayılan `http://localhost:8000`)

## Kurulum & Çalıştırma

```bash
# 1) Bağımlılıklar
npm install

# 2) Ortam dosyası
cp .env.example .env     # değerleri düzenle (aşağıya bakın)

# 3) Geliştirme sunucusu (varsayılan http://localhost:5173)
npm run dev

# Üretim derlemesi
npm run build
npm run preview
```

---

## Ortam Değişkenleri (.env)

| Değişken | Açıklama |
|---|---|
| `VITE_API_URL` | Backend API taban adresi. Örn. `http://localhost:8000/api`. |
| `VITE_INTEGRATION_API_KEY` | WordPress entegrasyon ucunu önizlemek için kullanılan anahtar. Backend `.env`'deki `INTEGRATION_API_KEY` ile **aynı** olmalıdır. |

> `.env` git'e gönderilmez; paylaşılan şablon `.env.example`'dır.

---

## İlk Giriş

Backend'de en az bir kullanıcı (tercihen bir admin) oluşturulmuş olmalıdır — bkz. backend README'sindeki "İlk admin'i oluşturma". Ardından login ekranından o kullanıcının `mail` ve parolasıyla giriş yapılır.

> Var olan bir oturumla rol bilgisi henüz yoksa (eski giriş), bir kez **çıkış yapıp tekrar giriş** yapın; rol bilgisi giriş yanıtıyla gelir ve menü/yetkiler ona göre güncellenir.

---

## Proje Yapısı (özet)

```
src/
  api.ts                    # API yardımcıları (login, members, users, integration) + token/rol store
  router.ts                 # rotalar + auth/admin guard
  components/
    LoginScreen.vue
    AppShell.vue            # sidebar + içerik düzeni
    AppSidebar.vue          # sol menü (Kullanıcılar yalnızca admin)
    Dashboard.vue
    MembersView.vue         # üye listesi
    MemberFormDialog.vue    # üye ekle/düzenle
    UsersView.vue           # kullanıcı listesi (admin)
    UserFormDialog.vue      # kullanıcı ekle/düzenle + rol atama (admin)
    ReportsView.vue
    WordpressConnection.vue
```
