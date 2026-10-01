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
