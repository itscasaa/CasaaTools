---
name: CasaaTools
description: A high-precision web snapshot and security analysis utility.
colors:
  primary: "#2563eb"
  neutral-bg: "#090a0f"
  neutral-surface: "#0f111a"
  text-primary: "#F8FAFC"
  text-secondary: "#A1A1AA"
typography:
  display:
    fontFamily: "Outfit, Inter, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#1d4ed8"
---

# Design System: CasaaTools

## 1. Overview

**Creative North Star: "The Precision Observatory"**

CasaaTools dirancang dengan filosofi antarmuka yang sangat bersih, terfokus, dan berpresisi tinggi. Mengambil inspirasi dari perkakas data modern (seperti Stripe dan Linear), antarmuka ini menolak ornamen visual yang berlebihan demi menyajikan data teknis pemindaian secara transparan dan mudah dipahami. 

Sistem ini menolak keras estetika "AI Slop" seperti bayangan berpendar ungu/violet yang menyilaukan mata, efek kaca transparan (glassmorphism) yang tebal, teks bergradasi pelangi, dan animasi masuk yang lambat. Estetika yang diusung adalah perpaduan warna gelap pekat (Midnight Slate) dengan batas (border) tegas 1px dan aksen biru kobalt yang presisi.

**Key Characteristics:**
*   Tata letak data terstruktur rapi dengan grid 1-dimensi dan 2-dimensi yang tegas.
*   Kontras teks tinggi di atas latar gelap untuk kenyamanan mata saat membaca log panjang.
*   Animasi transisi halus yang menghormati setelan *reduced motion* pengguna.

## 2. Colors

Karakter warna didominasi oleh palet abu-slate pekat dan biru kobalt yang tajam, memberikan kesan fungsional dan profesional bagi para pengembang.

### Primary
*   **Cobalt Blue** (#2563eb): Digunakan secara eksklusif untuk tombol aksi utama, indikator aktif, dan aksen penting.

### Neutral
*   **Midnight Dark** (#090a0f): Warna latar belakang utama aplikasi.
*   **Slate Container** (#0f111a): Warna latar belakang card dan kontainer utama.
*   **Text Primary** (#F8FAFC): Warna putih bersih untuk judul dan teks utama.
*   **Text Secondary** (#A1A1AA): Warna abu-abu sedang untuk deskripsi dan teks penjelas.
*   **Text Muted** (#71717A): Warna abu-abu redup untuk penanda waktu dan informasi opsional.

### Named Rules
**The 10% Cobalt Rule.** Warna biru kobalt primer tidak boleh melebihi 10% dari total area permukaan layar yang terlihat. Biru kobalt digunakan untuk memandu perhatian pengguna, bukan sebagai dekorasi latar belakang.

## 3. Typography

**Display Font:** Outfit (dengan fallback Inter, sans-serif)
**Body Font:** Inter (dengan fallback system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (atau system monospace untuk kode sumber dan log)

**Character:** Penggabungan font sans-serif geometris Outfit untuk judul layar besar yang tajam dengan Inter yang sangat terbaca untuk konten teks tabular dan data log.

### Hierarchy
*   **Display** (Bold, clamp(2rem, 5vw, 3.5rem), 1.1): Digunakan khusus untuk judul utama Landing Page dan panel atas.
*   **Headline** (Semibold, 24px, 1.25): Digunakan untuk judul kelompok modul atau kontainer besar.
*   **Title** (Medium, 16px, 1.4): Digunakan pada judul card hasil scan atau form.
*   **Body** (Regular, 14px, 1.5): Digunakan untuk teks deskripsi, instruksi form, dan teks umum. Panjang baris dibatasi maksimal 75ch.
*   **Label** (Medium, 12px, tracking-wider, uppercase): Digunakan untuk label status, header tabel, dan teks metadata.

## 4. Elevation

Kedalaman antarmuka CasaaTools didasarkan pada pelapisan tonal (tonal layering) yang tegas menggunakan garis pembatas 1px, bukan bayangan tebal (drop shadows).

### Named Rules
**The Flat Boundary Rule.** Seluruh permukaan card dan panel bersifat datar secara visual. Kedalaman hierarki dicapai dengan membedakan intensitas abu-slate kontainer dan garis tepi (border) tipis 1px (#ffffff0d).

## 5. Components

Setiap komponen interaktif dirancang dengan garis tepi tegas dan transisi halus pada kondisi hover.

### Buttons
*   **Shape:** Sudut membulat kecil (8px radius / rounded-lg).
*   **Primary:** Latar belakang Cobalt Blue (#2563eb) dengan teks Text Primary (#F8FAFC) dan padding horizontal 20px serta vertikal 10px.
*   **Hover / Focus:** Latar belakang bertransisi ke biru lebih gelap (#1d4ed8) dalam waktu 150ms dengan kurva kemiringan standar (ease-out).

### Cards / Containers
*   **Corner Style:** Sudut membulat medium (12px / rounded-xl).
*   **Background:** Menggunakan Slate Container (#0f111a) padat.
*   **Border:** Garis tepi setebal 1px dengan opasitas rendah (rgba(255, 255, 255, 0.05)).
*   **Internal Padding:** Menggunakan skala medium (20px / p-5 atau 24px / p-6).

### Inputs / Fields
*   **Style:** Latar gelap pekat (#090a0f), garis tepi 1px (rgba(255, 255, 255, 0.08)), dengan tinggi seragam 42px.
*   **Focus:** Garis tepi beralih menjadi biru kobalt (#2563eb) dengan bayangan luar biru kobalt yang sangat tipis dan halus.

## 6. Do's and Don'ts

### Do:
*   **Do** Pastikan setiap card memiliki border tegas 1px dengan opasitas 5% hingga 8% agar terlihat rapi di atas latar gelap.
*   **Do** Gunakan font monospace JetBrains Mono untuk menyajikan data log, ID pekerjaan, dan cuplikan kode sumber hasil scan.
*   **Do** Jaga rasio kontras teks deskripsi (minimal kontras 4.5:1) agar selalu mudah dibaca di monitor manapun.

### Don't:
*   **Don't** Menggunakan gradasi warna teks (background-clip: text dengan gradient) untuk judul apa pun.
*   **Don't** Menambahkan ornamen neon menyala atau efek berpendar radial ungu tebal di sekeliling kontainer data.
*   **Don't** Menggunakan border sebelah kiri saja (side-stripe border) yang tebal sebagai penanda jenis status card. Gunakan lencana status (StatusBadge) sebagai gantinya.
