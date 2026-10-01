# Unismuh3D



Kampus 3D dengan Three.js, GLB terpisah, dan tur kamera berbasis scroll GSAP.



## Denah kampus terbaru



Susunan mengikuti foto denah `photo_6194783613841248516_w.jpg` dari pengguna. Utara = -Z, timur = +X. Posisi tapak ditelusuri dari denah dengan skala perkiraan; tinggi, dimensi dan fasad bukan pengukuran resmi. Tidak ada pepohonan. Air mancur tetap menjadi tambahan desain.



28 kode denah A, B, AB, C–K, K1, M–M7, N–T tersedia dalam 29 GLB (kompleks K/K1 menyatu, bangunan lainnya terpisah, tapak/jalan, air mancur). K1 adalah Gedung Perkuliahan Bersama. Denah tidak mencantumkan Fakultas Hukum, sehingga model lama Hukum tidak lagi dimuat.



A: SMA Unismuh; B: Pascasarjana; AB: Lab Komputer FKIP; C: Masjid Subulussalam Al-Khoory; D: UMC; E: UPT Perpustakaan, IT, BKD, KOMDIS-ETIK; F: Fakultas Kedokteran; G: Lab Fakultas Teknik; H: Lab IPA FKIP; I: Kantor FKIP; J: Perkuliahan Farmasi; K: Menara Iqra; K1: Perkuliahan Bersama; M–M7: kompleks Mahad Al-Birr; N: Balai Sidang Muktamar 47; O: Asrama Putri; P: Asrama Putra; Q: PKM; R: Kantor Pusat IKA; S: Rumah Imam; T: Wudhu pria/wanita.



Jalan Sultan Alauddin di barat, Jalan Tala’salapang di utara. A/B/AB membentuk halaman terbuka. Masjid di utara perpustakaan. Balai Sidang di selatan taman, asrama putri/putra di sisi timur dan PKM di ujung selatan.



## Menjalankan



```sh

npm ci

npm run dev

npm run model:build

npm run model:check

node scripts/validate-tour.mjs

node scripts/validate-performance.mjs

npm run build

```



Vercel: framework Vite, build `npm run build`, output `dist`. Upload/push secara manual sesuai workflow pengguna. Gunakan Eksplorasi bebas → Denah untuk melihat tapak dari atas dengan utara di bagian atas layar. Model diunduh dari tombol Model 3D; manifest menyimpan posisi, batas geometri, hash dan kode denah. GLB digabung per material; renderer menggunakan anggaran piksel adaptif, shadow statis dan jeda render ketika tidak ada perubahan.


Jarak pusat bangunan diperlebar sekitar 45% tanpa membesarkan gedung. Kompleks Menara Iqro tetap rapat: menara dan dua sayap belakang tersambung dengan podium bersama dalam satu GLB `menara-iqro.glb`. Jalan, tapak, dan kamera mengikuti susunan yang diperlebar.

Tampilan awal dan tur menggunakan pencahayaan malam dengan jendela bercahaya. Dalam eksplorasi bebas, tombol Siang/Malam mengubah pencahayaan. Bundaran di depan Farmasi dihapus; taman air mancur tetap ada.

Kompleks A/B/AB membentuk U yang tersambung: A dan B menjadi dua lengan sejajar, sementara AB menghubungkan ujung timurnya. Halaman tengah tetap terbuka. Ketiga bagian tetap tersedia sebagai GLB individu.

Sambungan A/B/AB menggunakan bidang dinding tepat di X=-84,7 dan atap datar satu tingkat pada Y=13,95. List atap tidak melewati sambungan; fasad AB di sisi halaman hanya mengisi bagian yang terbuka.

Opening: Welcome Unismuh → tangan 3D memegang logo Unismuh → tangan turun dan logo tetap melayang → pemuatan denah → tur kampus. Model public/intro/emblem-hand.glb memuat 36 joint, satu clip Present_Emblem, dan tekstur WebP yang tertanam. GSAP mengontrol AnimationMixer sesuai scroll, termasuk saat scroll kembali. Buat ulang lewat npm run intro:build. Tombol Langsung ke kampus melewati opening. Mode reduced motion menampilkan pose tetap dan transisi fade. Renderer opening berhenti ketika di luar viewport atau tab tidak terlihat.

Referensi model/tekstur/gerakan tangan: https://cork-webgl-study.vercel.app/ (halaman mengkreditkan Lusion / ORYZO). Aset BUF referensi tersimpan di scripts/reference-hand; scripts/convert-reference-hand.mjs mengonversinya ke GLB standar. Kredit sumber dicatat di public/intro/CREDITS.md; pencatatan kredit bukan pernyataan lisensi dari pemilik aset.


Opening memakai gradasi biru muda lembut dan material/tekstur kulit asli dari referensi. Warna tur denah malam tetap sama. Logo yang dipegang adalah GLB public/intro/logo-unismuh-3d.glb: siluet asli diekstrusi, tepi emas, ketebalan 0.092 unit, serta tekstur logo tertanam. Buat ulang lewat npm run logo:build; npm run intro:build membangun kedua model opening.


Opening tidak memakai garis lingkaran. Gerakkan kursor ke atas/bawah area jari saat tangan sudah memegang logo: empat rantai jari bergerak secara terpisah memakai hierarchy referensi yang tertanam dalam GLB. Sendi telapak dan pegangan logo tetap stabil; gerakan kembali halus saat kursor menjauh. Interaksi tidak menangkap gesture scroll ponsel dan dinonaktifkan pada reduced motion. Validasi: node scripts/validate-opening-interaction.mjs.
