# Upload manual ke GitHub dan Vercel

Proyek ini menggunakan Vite, Three.js, dan GSAP. GLB, foto, logo, font, dan lisensi sudah tersedia di `public/`. Tidak ada API key atau environment variable yang dibutuhkan.

## GitHub dari terminal PowerShell

Repositori lokal sudah diinisialisasi dengan branch `main` dan remote:
`https://github.com/MhmmdFaizal04/Unismuh3D.git`

Jalankan dari folder proyek:

```powershell
Set-Location C:\Admin\Project\Unismuh3D
git add .
git status
git commit -m "Prepare Unismuh 3D exhibition website"
git push -u origin main
```

`git add .` menyertakan seluruh source dan aset yang diperlukan. Jangan hanya menambahkan README. `.gitignore` mengecualikan node_modules, dist, konfigurasi lokal, log, dan .env.

Jika Git meminta identitas, atur nama dan email untuk repositori ini, lalu ulangi commit:

```powershell
git config user.name "Nama Anda"
git config user.email "Email GitHub Anda"
```

Login GitHub saat diminta Git Credential Manager. Perintah push di atas mengasumsikan repository GitHub masih kosong. Jika repository sudah berisi commit, gunakan clone repository tersebut dan salin berkas proyek ke dalamnya; jangan force push.

## Alternatif upload melalui browser GitHub

Ekstrak ZIP source yang disiapkan. Di repository GitHub, pilih Add file → Upload files. Unggah isi folder hasil ekstraksi, bukan berkas ZIP, sehingga `package.json` dan `vercel.json` berada langsung di root repository. Folder node_modules dan dist tidak perlu diunggah.

## Vercel

1. Buka https://vercel.com/new dan import repository `MhmmdFaizal04/Unismuh3D`.
2. Root Directory: root repository (biarkan default).
3. Framework Preset: Vite.
4. Install Command: `npm ci`.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Environment Variables: tidak diperlukan.
8. Pilih Deploy dan tunggu build selesai.

`vercel.json` sudah menyimpan pengaturan build tersebut. Model GLB tidak perlu dibuat ulang saat deploy karena sudah disertakan di public/models. Navigasi website memakai hash dan scroll, sehingga tidak membutuhkan rewrite SPA.

Setelah deploy, periksa pemuatan logo/model/font, opening salam, sepuluh bab perjalanan, scroll balik, tombol Model 3D, dan tampilan mobile. Untuk pameran, buka website di perangkat dan browser yang akan dipakai serta pastikan WebGL tersedia.

Dokumentasi resmi: https://vercel.com/docs/frameworks/frontend/vite

## Pemeriksaan lokal

```powershell
npm ci
npm run model:check
npm run build
npm run preview
```

Untuk perubahan berikutnya:

```powershell
git add .
git commit -m "Update website"
git push
```

Jika repo telah terhubung ke Vercel dengan Git integration, push berikutnya akan memicu deployment sesuai pengaturan branch proyek.

Opening memakai public/intro/emblem-hand.glb. Sertakan folder public/intro saat upload manual. Build opening ulang dengan npm run intro:build bila generator diubah. Layar Memuat denah kampus dipertahankan sesudah opening.

Sertakan public/intro/logo-unismuh-3d.glb bersama emblem-hand.glb. Logo GLB menyimpan teksturnya sendiri dan tidak membutuhkan file gambar tambahan saat dimuat.
