# Unismuh — Campus Journey

Pengalaman 3D layar penuh yang bergerak mengikuti scroll. Jalur kamera:

1. Panorama kampus.
2. Taman depan dan air mancur dengan semburan serta riak air.
3. Mendekati masjid dan kubah biru.
4. Beralih ke fasad Menara Iqro.
5. Naik dan berhenti di mahkota menara pada scroll paling akhir.

Teks, judul per baris, indikator perjalanan, dan pencahayaan mengikuti progress scroll. Scroll ke atas membalik perjalanan. Tombol navigasi membawa ke posisi scroll yang sesuai. Tidak ada section tambahan setelah puncak.

## Jalankan

```sh
npm install
npm run dev
npm run build
npm run preview
```

Distribusikan isi `dist/` melalui HTTP. `base: './'` mendukung hosting di subfolder. Tidak ada permintaan font atau aset 3D ke CDN; model, foto, dan shader tersedia lokal.

## Model individual

`public/models/` berisi tujuh berkas GLB mandiri: `menara-iqro.glb`, `masjid.glb`, `sayap-akademik.glb`, `balai-sidang.glb`, `gerbang.glb`, `lansekap.glb`, dan `air-mancur.glb`.

Setiap berkas memiliki pivot X/Z di tengah bagiannya, Y=0 di tanah. `manifest.json` menyimpan posisi untuk merakitnya kembali ke kampus. Website benar-benar memuat ketujuh GLB dengan GLTFLoader. Model dapat diunduh satu per satu melalui tombol Model 3D.

```sh
npm run model:build
npm run model:check
```

Generator deterministik berada di `scripts/generate-campus.mjs`. Geometri statis digabung per material untuk menekan draw call. Air mancur memuat basin, bibir kolam, pedestal, dan geometri semburan. Website menambahkan riak shader serta partikel bergerak.

Model merupakan interpretasi dari foto referensi pengguna, bukan survei arsitektur. Dimensi dan sisi belakang diperkirakan. Air mancur merupakan tambahan desain sesuai permintaan. Riwayat pendirian Unismuh bersumber dari https://www.unismuh.ac.id/profil/sejarah/ dan ditautkan di dalam pengalaman.

## Struktur

- `src/core/journey.js`: GSAP master timeline, ScrollTrigger pin/scrub, animasi teks, navigasi dan reduced motion.
- `src/core/campus-viewer.js`: model modular, kamera, lighting, fountain shader, render adaptif dan free orbit.
- `src/main.js`: pemuatan, dialog model, unduhan, fallback dan event lifecycle.
- `src/styles/main.css`: layout layar penuh, overlay narasi dan framing mobile.

Edit `SHOTS` di `campus-viewer.js` untuk mengubah posisi kamera (`x/y/z`), titik pandang (`tx/ty/tz`), FOV dan campuran malam. Titik terakhir memandang mahkota pada Y=75 dalam satuan model; angka ini bukan klaim pengukuran bangunan.

## Skill proyek

Seluruh 18 SKILL.md dalam `.agents/skills/` ditinjau. Penerapan:

| Skill | Penerapan |
|---|---|
| gsap-core | Tween, easing, autoAlpha, overwrite dan matchMedia. |
| gsap-timeline | Satu master timeline dengan label kamera; sinkronisasi teks dan cahaya. |
| gsap-scrolltrigger | Pin layar penuh, scrub dua arah, progress dan refresh responsif. |
| gsap-plugins | ScrollToPlugin untuk navigasi, SplitText untuk reveal baris dengan mask, MotionPathPlugin untuk cue scroll, CustomEase untuk perjalanan antar bab. |
| gsap-utils | toArray dan clamp untuk scope elemen serta indeks bab. |
| gsap-performance | Transform/opacity, stagger, lifecycle cleanup, dan tanpa tween baru per frame. |
| gsap-frameworks | Prinsip lifecycle dan scope diterapkan pada modul vanilla serta dispose HMR. Vue/Svelte tidak dipasang karena proyek ini vanilla. |
| gsap-react | Ditinjau; hook React tidak berlaku pada proyek vanilla. Prinsip cleanup dan pembatasan selector tetap diterapkan. |
| threejs-fundamentals | Scene, kamera, hirarki Object3D, resize dan disposal. |
| threejs-geometry | Geometri bangunan, arch, dome, GLB modular dan merge per material. |
| threejs-materials | PBR beton, kaca, atap, logam dan air. |
| threejs-lighting | Hemisphere, matahari, rim, shadow frustum dan transisi cahaya. |
| threejs-loaders | GLTFLoader async, progress, manifest, error dan fallback. |
| threejs-animation | Loop berbasis delta untuk partikel dan gerak air; jeda saat tab tersembunyi. |
| threejs-interaction | OrbitControls, zoom, rotasi otomatis, kontrol keyboard +/− dan Escape. |
| threejs-postprocessing | Ditinjau dan disederhanakan setelah optimasi: render langsung dengan ACES; efek layar penuh digantikan overlay CSS. |
| threejs-shaders | Riak air melalui onBeforeCompile, partikel semburan dengan batas frustum. |
| threejs-textures | PMREM environment texture, color space dan disposal. |

Mode reduced motion meniadakan animasi air dan reveal teks serta menggunakan pergantian kamera langsung. Resolusi render dibatasi berdasarkan jumlah piksel dan kemampuan perangkat; shadow map statis 1024px dipakai ulang. Jika GLB gagal, tersedia retry dan perjalanan teks dengan foto.

## Verifikasi

Build produksi dan pemeriksaan struktur GLB dijalankan. Uji browser mencakup lima posisi scroll, scroll balik, posisi puncak di akhir, wheel native, navigasi, orbit/zoom/malam/rotasi, Escape, unduhan model, mobile 390×844, reduced motion, serta fallback saat satu GLB hilang.

Tipografi memadukan Sora untuk judul, DM Sans untuk teks dan navigasi, serta Cormorant Garamond italic untuk aksen. Font WOFF2 dimuat dari `public/fonts/`, disertai lisensi OFL, sehingga tidak membutuhkan koneksi Google Fonts saat pameran. Judul muncul per baris melalui SplitText dengan mask dan stagger, diikuti paragraf serta tombol. Font selesai dimuat sebelum teks dipecah, dan mask diperbarui ketika lebar layar berubah. Ukuran teks diatur untuk layar pameran besar maupun mobile. Geometri signage memakai font contoh Three.js; lisensi font disertakan dalam `public/models/FONT-LICENSE.txt`.

## Deploy ke GitHub dan Vercel

Lihat [DEPLOY.md](DEPLOY.md) untuk upload manual. Pengaturan Vite, npm ci, npm run build, dan dist sudah tersedia di vercel.json. Source dan aset diunggah ke GitHub; node_modules dan dist diabaikan oleh Git.

## Optimasi performa deployment

- Render langsung satu pass dengan ACES dan native antialiasing; tanpa bloom, render target HDR, atau MSAA tambahan pada composer.
- Shadow map statis 1024px dihitung sekali karena posisi bangunan dan arah matahari tetap. Transisi intensitas cahaya tetap berjalan.
- Render buffer maksimal 2,1 juta piksel di desktop / 0,9 juta di perangkat ringan. DPR awal maksimal 1,5 / 1,15. Jika interval frame aktif terus melebihi 23ms selama 90 sampel, resolusi diturunkan bertahap sampai 65% dari kualitas awal. Teks HTML tetap memakai resolusi layar asli.
- Kamera dan matriks proyeksi diperbarui hanya ketika berubah. Transform lokal geometri statis tidak dihitung ulang.
- Kamera bergerak dirender maksimal 60fps. Air yang terlihat dari dekat dirender maksimal 30fps (24fps pada perangkat ringan). Saat kamera diam dan air tidak perlu bergerak, render frame dilewati. Loop dihentikan saat tab tersembunyi.
- Partikel air 320 / 160, dengan bounding sphere untuk frustum culling.
- Progress GSAP menggunakan quickSetter; teks persentase hanya ditulis saat angkanya berubah.
- Shader dipersiapkan dengan compileAsync sebelum loader ditutup. Foto referensi dalam dialog dimuat secara lazy.
- Header cache GLB dan font selama satu jam untuk kunjungan berulang; HTML tidak diberi cache panjang. Setelah mengganti berkas model atau font dengan nama yang sama, cache browser bisa bertahan sampai satu jam.

Pemeriksaan kebijakan resolusi: `node scripts/validate-performance.mjs`.

Optimasi ini mengurangi pekerjaan render; tidak menetapkan klaim kenaikan FPS tanpa pengukuran pada perangkat dan URL deployment yang digunakan.
