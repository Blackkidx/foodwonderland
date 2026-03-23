# 🍽️ FoodWonderland v2 — ระบบสั่งอาหารศูนย์อาหาร

> ระบบสั่งอาหารออนไลน์ผ่าน QR Code สำหรับศูนย์อาหาร (Food Court) พัฒนาใหม่ทั้งหมดจากระบบเดิม  
> รองรับ 3 บทบาท: **ลูกค้า** (ไม่ต้องสมัคร) · **ร้านค้า** (Vendor) · **ผู้ดูแลระบบ** (Super Admin)

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deploy_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## 📖 Background — ทำไมต้องพัฒนาใหม่?

### ระบบเดิม (v1)

ระบบเดิมพัฒนาด้วย **Express.js + MySQL + EJS** ทำงานแบบ Server-side Rendering ทั้งหมด

| ด้าน | ระบบเดิม (v1) |
|------|--------------|
| Framework | Express.js (Node.js) |
| Database | MySQL (localhost) |
| Frontend | EJS Template Engine |
| Authentication | Session + รหัสผ่านโต๊ะ |
| Realtime | ❌ ไม่มี (ต้อง refresh หน้าเอง) |
| Payment | ❌ ไม่มีการตรวจสลิป |
| Role | Admin กับ Customer เท่านั้น (Admin ทำหน้าที่ Vendor ด้วย) |
| Deploy | ❌ Run ได้แค่ localhost |

### 🔴 Pain Points ที่ต้องแก้

1. **ไม่มี Realtime** — ลูกค้าและร้านค้าต้อง refresh browser เพื่อดูสถานะ order ใหม่ ทำให้พลาดออเดอร์
2. **Login ไม่สะดวก** — ลูกค้าต้องใส่รหัสผ่านโต๊ะ (เช่น `pass123`) ซึ่งไม่ปลอดภัยและไม่สะดวก
3. **ไม่มีระบบตรวจสลิป** — ร้านค้าไม่สามารถยืนยันการชำระเงินในระบบได้
4. **Role ไม่ชัดเจน** — Admin ทำหน้าที่ทุกอย่างทั้งจัดการร้าน+รับ order ทำให้ใช้งานยาก
5. **ไม่สามารถ Deploy ได้** — ผูกกับ localhost MySQL ไม่สามารถใช้บน cloud
6. **UI ไม่ Responsive** — ลูกค้าใช้งานบนมือถือลำบาก ไม่ mobile-friendly
7. **ไม่มีระบบ Stock** — ไม่มีการจัดการจำนวนสินค้า ลูกค้าสั่งได้แม้ของหมด

---

## 💡 แนวคิดการพัฒนา v2

### การแก้ไข Pain Points

| Pain Point | วิธีแก้ใน v2 |
|-----------|-------------|
| ไม่มี Realtime | ✅ **Supabase Realtime** — subscribe การเปลี่ยนแปลง order status แบบ real-time ไม่ต้อง refresh |
| Login ไม่สะดวก | ✅ **QR Code Session** — สแกน QR ที่โต๊ะ → ใส่แค่ชื่อ → เริ่มสั่งได้เลย |
| ไม่มีระบบตรวจสลิป | ✅ **Payment Verification** — ลูกค้าแนบสลิป → ร้านค้าดูสลิป+ยืนยัน/ปฏิเสธในระบบ |
| Role ไม่ชัดเจน | ✅ **3 Roles แยกชัด** — Customer (ไม่ต้อง login), Vendor (จัดการร้านตัวเอง), Super Admin (ดูแลทั้งระบบ) |
| Deploy ไม่ได้ | ✅ **Supabase (Cloud PostgreSQL)** + **Vercel** — deploy ได้ทันที ใช้งานจริงบน internet |
| UI ไม่ Responsive | ✅ **Mobile-first Design** — Tailwind CSS + shadcn/ui ลูกค้าใช้บนมือถือสะดวก |
| ไม่มีระบบ Stock | ✅ **Stock Management** — หัก stock อัตโนมัติ + แจ้งเตือนเมื่อ stock ใกล้หมด |

### สถาปัตยกรรมใหม่

```
ระบบเดิม (v1)                    ระบบใหม่ (v2)
─────────────                    ─────────────
Express.js + EJS                 Next.js (App Router + SSR)
MySQL (localhost)          →     Supabase (Cloud PostgreSQL)
Session + Password               QR Code + UUID Session
ไม่มี Realtime             →     Supabase Realtime (WebSocket)
ไม่แยก Role               →     3 Roles: Customer / Vendor / Admin
ไม่มี Payment              →     Slip Upload + Verification
EJS (ไม่ Responsive)       →     Tailwind CSS + shadcn/ui (Mobile-first)
```

---

## ⚡ Tech Stack

| Layer | Technology | เหตุผล |
|-------|-----------|--------|
| Framework | **Next.js 16** (App Router) | Full-stack SSR, API Routes ในตัว |
| Language | **TypeScript** | Type safety ทั้ง frontend + backend |
| Database | **Supabase** (PostgreSQL) | ฟรี, Realtime built-in, Storage, Auth |
| Realtime | **Supabase Realtime** | Subscribe DB changes แบบ real-time |
| Auth | **Supabase Auth** | JWT session, Role-based, RLS |
| Storage | **Supabase Storage** | รูปเมนู + สลิปชำระเงิน |
| Styling | **Tailwind CSS v4** | Utility-first, responsive ง่าย |
| UI Components | **shadcn/ui** | สวย, accessible, customizable |
| State (Cart) | **Zustand** + persist | Lightweight, เก็บ localStorage |
| Charts | **Recharts** | Dashboard analytics |
| Icons | **Lucide React** | Consistent icon set |
| Toast | **Sonner** | Notification |
| Payment | **Omise** (Test Mode) | Payment gateway สำหรับประเทศไทย |
| Deploy | **Vercel** | CI/CD อัตโนมัติจาก GitHub |

---

## ✨ Features

### 👤 ลูกค้า (Customer) — ไม่ต้องสมัคร / ไม่ต้อง Login

- 📱 สแกน **QR Code** ที่โต๊ะ → ใส่ชื่อ → เริ่มสั่งอาหาร
- 🏪 ดูร้านอาหารทั้งหมด + ค้นหา + filter ตามหมวดหมู่
- 🍜 ดูเมนูแต่ละร้าน + เพิ่มหมายเหตุ + เลือก option พิเศษ
- 🛒 ตะกร้าสินค้าแยกตามร้าน + สั่งหลายร้านพร้อมกัน
- 💳 ชำระเงินผ่าน QR PromptPay + แนบสลิป
- 📊 ติดตามสถานะ order **แบบ Realtime** (pending → paid → cooking → ready → picked_up)
- 🔔 แจ้งเตือนเมื่ออาหารเสร็จ
- ⭐ รีวิวร้านอาหารหลังรับอาหารแล้ว

### 🏪 ร้านค้า (Vendor) — Login ด้วย Email + Password

- 📊 **Dashboard** — ยอดขายวันนี้/เดือนนี้, กราฟ 7 วัน, Top 5 เมนูขายดี
- 📋 **รับ Order Realtime** — ได้ยินเสียงเมื่อ order ใหม่เข้า + Browser Notification
- ✅ ตรวจสลิป → ยืนยัน/ปฏิเสธ → เริ่มทำ → เสร็จ → ลูกค้ารับแล้ว
- 🍔 **CRUD เมนู** — เพิ่ม/แก้ไข/ลบเมนู + upload รูป + ตั้งราคาพิเศษ
- 📦 **จัดการ Stock** — ดู stock, แก้ไข, ตั้ง threshold แจ้งเตือนเมื่อใกล้หมด

### 🛡️ ผู้ดูแลระบบ (Super Admin)

- 📊 **Dashboard ภาพรวม** — total orders, revenue, เปรียบเทียบยอดขายแต่ละร้าน
- 🏪 จัดการร้านอาหาร — เพิ่ม/แก้ไข/เปิด/ปิดร้าน
- 👤 จัดการ Vendor — สร้าง account, assign เข้าร้าน
- 🪑 จัดการโต๊ะ — เพิ่ม/ลบโต๊ะ, Generate QR Code, ดู active session

---

## 🔄 Order Lifecycle

```
ลูกค้าสแกน QR → เลือกเมนู → ชำระเงิน + แนบสลิป
                                    │
                                    ▼
                              [pending] ────── รอร้านค้าตรวจสลิป
                                    │
                         Vendor ยืนยันสลิป
                                    │
                                    ▼
                               [paid] ──────── ชำระเงินแล้ว
                                    │
                          Vendor กดเริ่มทำ
                                    │
                                    ▼
                             [cooking] ─────── กำลังทำอาหาร
                                    │
                           Vendor กดเสร็จ
                                    │
                                    ▼
                              [ready] ──────── 🔔 แจ้งลูกค้า "มารับอาหารได้!"
                                    │
                          ลูกค้ารับอาหาร
                                    │
                                    ▼
                            [picked_up] ────── ✅ เสร็จสิ้น
```

---

## 🗄️ Database Schema (13 Tables)

| Table | หน้าที่ |
|-------|--------|
| `tables` | โต๊ะอาหาร + QR Token |
| `sessions` | Session ลูกค้า (1 session = 1 ครั้งที่มากิน) |
| `profiles` | Vendor / Admin account |
| `categories` | หมวดหมู่ร้าน |
| `restaurants` | ร้านอาหาร + QR PromptPay |
| `vendor_assignments` | Vendor ↔ Restaurant (many-to-many) |
| `menus` | เมนูอาหาร + stock + threshold + ราคาพิเศษ |
| `orders` | คำสั่งซื้อ (1 order = 1 ร้าน) |
| `order_items` | รายการอาหารใน order (snapshot ชื่อ/ราคา) |
| `payments` | สลิป + สถานะ verified/rejected |
| `order_status_logs` | Audit trail ทุกครั้งที่ status เปลี่ยน |
| `stock_alerts` | แจ้งเตือน stock ใกล้หมด |
| `reviews` | รีวิวและให้คะแนนร้านอาหาร |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 ขึ้นไป
- [Supabase](https://supabase.com/) account (Free tier)

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/foodwonderland-v2.git
cd foodwonderland-v2

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# แก้ไขค่าใน .env.local ตาม Supabase dashboard ของคุณ

# Run development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) เพื่อเริ่มใช้งาน

### Environment Variables

| Variable | Description | ได้จากไหน |
|----------|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (public) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (secret) | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_OMISE_PUBLIC_KEY` | Omise Public Key | Omise Dashboard → Keys |
| `OMISE_SECRET_KEY` | Omise Secret Key | Omise Dashboard → Keys |

---

## 🌐 Deploy on Vercel

1. Push โค้ดขึ้น **GitHub**
2. ไปที่ [vercel.com](https://vercel.com) → **Import** repository
3. ตั้ง **Environment Variables** ตาม `.env.example`
4. กด **Deploy** → ได้ URL `your-app.vercel.app` ทันที ✅

> 💡 **Free Domain**: Vercel ให้ subdomain `*.vercel.app` ฟรี พร้อม SSL + CI/CD อัตโนมัติ  
> ทุกครั้งที่ push ขึ้น GitHub จะ deploy ใหม่อัตโนมัติ

---

## 📁 Project Structure

```
foodwonderland-v2/
├── src/
│   ├── app/
│   │   ├── (customer)/          # ลูกค้า — ไม่ต้อง login
│   │   │   ├── table/[qr_token]   # สแกน QR → เริ่ม session
│   │   │   ├── restaurants/       # เลือกร้านอาหาร
│   │   │   ├── menu/[id]/         # ดูเมนู + สั่งอาหาร
│   │   │   ├── cart/              # ตะกร้าสินค้า
│   │   │   ├── checkout/[id]/     # ชำระเงิน + แนบสลิป
│   │   │   └── orders/            # ติดตามสถานะ realtime
│   │   ├── (vendor)/            # ร้านค้า — ต้อง login
│   │   │   ├── dashboard/         # POS dashboard + กราฟ
│   │   │   ├── orders/            # รับ order + ตรวจสลิป
│   │   │   ├── menus/             # CRUD เมนู
│   │   │   └── stock/             # จัดการ stock
│   │   ├── (admin)/             # Super Admin — ต้อง login
│   │   │   ├── dashboard/         # ภาพรวมทั้งระบบ
│   │   │   ├── restaurants/       # จัดการร้าน
│   │   │   ├── vendors/           # จัดการ vendor
│   │   │   └── tables/            # จัดการโต๊ะ + QR
│   │   ├── api/                 # API Routes (payment, admin)
│   │   └── login/               # Login page
│   ├── components/              # React components (ui, customer, vendor, admin)
│   ├── lib/supabase/            # Supabase client (browser, server, admin, middleware)
│   ├── store/                   # Zustand cart store
│   └── types/                   # TypeScript type definitions
├── supabase/migrations/         # Database migration SQL
├── .env.example                 # Template Environment Variables
└── package.json
```

---

## 📄 License

This project is developed for educational purposes.
