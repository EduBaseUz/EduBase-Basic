# EduBase

O'quv markazini boshqarish tizimi (Educational Management System). Monorepo:
**Go (chi + MongoDB)** backend va **Next.js (App Router + TypeScript)** frontend.

To'rt rol: **Admin**, **Mentor**, **Student**, **Parent** (parent — kelajak uchun, faqat
ma'lumotlar modeli). Barcha UI matni o'zbek tilida, valyuta **so'm (UZS)**, vaqt
mintaqasi **Asia/Tashkent**.

## Texnologiyalar

**Backend** — Go, `chi`, MongoDB (official driver), JWT (`golang-jwt/v5`), bcrypt,
`validator/v10`, `log/slog`. Qatlamli arxitektura: `handlers → services → repositories`
(repository — interfeyslar, Mongo implementatsiyasi). PostgreSQL'ga o'tish faqat
repository qatlamiga tegadi.

**Frontend** — Next.js (App Router), TypeScript (strict), Tailwind CSS + shadcn uslubidagi
komponentlar (neutral), `next-themes` (dark/light), `@tanstack/react-query`,
`react-hook-form` + `zod`, `@tanstack/react-table`, `recharts`, `lucide-react`.

## Talablar

- Go 1.23+
- Node.js 18+ (npm yoki pnpm)
- MongoDB (lokal Docker yoki MongoDB Atlas)

## 1. Ma'lumotlar bazasi

Lokal MongoDB'ni Docker orqali ishga tushirish:

```bash
docker compose up -d        # MongoDB :27017 da ishlaydi
```

Yoki MongoDB Atlas ulanish satridan foydalaning (pastdagi `MONGO_URI`).

## 2. Backend

```bash
cd backend
cp .env.example .env        # qiymatlarni to'ldiring (ayniqsa JWT secretlar)
go mod tidy
go run ./cmd/seed           # admin + demo ma'lumotlarni yaratadi, login chiqaradi
go run ./cmd/api            # API :8080 da ishlaydi
```

`.env` (backend):

| O'zgaruvchi | Tavsif |
|---|---|
| `PORT` | API porti (masalan `8080`) |
| `MONGO_URI` | MongoDB ulanish satri |
| `MONGO_DB` | Ma'lumotlar bazasi nomi |
| `JWT_ACCESS_SECRET` | Access token uchun maxfiy kalit |
| `JWT_REFRESH_SECRET` | Refresh token uchun maxfiy kalit |
| `ACCESS_TTL` | Access token muddati (masalan `15m`) |
| `REFRESH_TTL` | Refresh token muddati (masalan `168h`) |
| `FRONTEND_ORIGIN` | CORS uchun frontend manzili (masalan `http://localhost:3000`) |

**Seed** `go run ./cmd/seed` quyidagini yaratadi: 1 admin, 2 mentor, 6 o'quvchi,
2 kurs, 2 guruh (mentorlar va o'quvchilar biriktirilgan holda). Barcha
foydalanuvchilarning **boshlang'ich paroli = telefon raqami** va birinchi kirishda
parolni o'zgartirish majburiy. Admin login konsolga chop etiladi
(`Telefon: 998901112233`).

## 3. Frontend

```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL ni backend manziliga moslang
npm install                 # yoki: pnpm install
npm run dev                 # Next.js :3000 da ishlaydi
```

`.env.local` (frontend):

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## 4. Kirish

Brauzerda `http://localhost:3000` ni oching. Seed bergan admin telefon raqami va
parol (= telefon) bilan kiring → birinchi kirishda parol o'zgartiriladi (kamida 8 ta
belgi, kamida 1 katta va 1 kichik harf).

## Biznes qoidalari (qisqacha)

- **Auth:** faqat login (ro'yxatdan o'tish yo'q). Telefon + parol. Admin faqat seed
  orqali yaratiladi. "Parolni tiklash" → parol telefon raqamiga qaytariladi.
- **Davomat:** `Keldi` / `Kech qoldi` → to'lov bor, maoshga hisoblanadi, baho qo'yiladi.
  `Sababli` / `Kelmadi` → to'lov yo'q, baho qo'yilmaydi.
- **Baholar:** har dars uchun ikkita baho (uy vazifasi + faollik), 1–10. Harf:
  1–4 → P, 5–7 → M, 8–10 → D. **O'quvchi faqat harfni ko'radi**, raqamni emas.
- **Mentor maoshi:** dars boshiga `(keldi+kech qolgan o'quvchilar soni) ×
  mentorRateSnapshot`. Stavka oshsa, o'tgan oylar o'zgarmaydi (snapshot).
- **O'quvchi to'lovi:** faqat qatnashgan darslar uchun (`monthlyPrices[oy] /
  lessonsPerMonth`). O'rtada qo'shilgan o'quvchi faqat qo'shilgan kundan to'laydi.
  Chegirma va qisman to'lovlar qo'llab-quvvatlanadi.
- **Reyting:** o'rtacha baho bo'yicha; tenglikda davomat yuqori bo'lgan oldinda.
- **Dars jadvali to'qnashuvi** va **takror ro'yxat** server tomonida tekshiriladi.

## Loyiha tuzilishi

```
EduBase/
├── docker-compose.yml
├── backend/
│   ├── cmd/{api,seed}
│   ├── internal/{config,server,middleware,models,repositories,services,handlers}
│   └── pkg/{jwt,hash,response}
└── frontend/
    └── src/{app,components,lib,hooks,providers,types}
```

## Eslatma

Frontend `npm run build` va `tsc --noEmit` xatosiz o'tadi. Backend uchun `go mod tidy`
birinchi marta bog'liqliklarni yuklab oladi (internet talab qilinadi).
