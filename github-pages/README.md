# Bianca's Reading Room

Website jurnal buku publik dengan editor pribadi. Kode berada di GitHub Pages,
sedangkan review dan cover tersimpan di Supabase.

## Isi folder

- `index.html` — website publik.
- `admin.html` — login dan editor pribadi.
- `styles.css` — seluruh desain.
- `config.js` — tempat memasukkan URL dan publishable key Supabase.
- `app.js` — membaca dan menampilkan jurnal.
- `admin.js` — login, upload cover, publish, edit, dan delete.
- `setup.sql` — membuat database dan security.
- `.nojekyll` — memastikan GitHub Pages menyajikan file apa adanya.

## Bagian 1 — Buat project Supabase

1. Buka https://supabase.com dan buat akun.
2. Klik **New project**.
3. Pilih organization, isi nama project misalnya `bianca-reading-room`,
   buat database password, dan pilih region terdekat.
4. Simpan database password di password manager.
5. Tunggu sampai project selesai dibuat.

## Bagian 2 — Buat akun admin Bianca

1. Buka menu **Authentication** lalu **Users**.
2. Pilih **Add user** atau **Create new user**.
3. Masukkan email dan password yang hanya kamu ketahui.
4. Aktifkan auto-confirm bila dashboard menampilkan pilihan tersebut.
5. Simpan email ini karena harus sama persis dengan email di `setup.sql`.

Website publik tidak menampilkan email ini.

## Bagian 3 — Buat database dan keamanan

1. Di VS Code, buka `setup.sql`.
2. Cari semua tulisan:

   `YOUR_ADMIN_EMAIL@example.com`

3. Ganti semuanya dengan email admin dari Bagian 2.
4. Copy seluruh isi `setup.sql`.
5. Di Supabase, buka **SQL Editor** lalu **New query**.
6. Paste, lalu klik **Run**.
7. Pastikan muncul pesan sukses.

SQL tersebut:

- Membuat tabel `books`.
- Mengaktifkan Row Level Security.
- Membolehkan publik membaca review yang sudah dipublish.
- Hanya membolehkan emailmu menambah, mengubah, dan menghapus.
- Membuat bucket cover publik bernama `book-covers`.
- Membatasi upload/edit/delete cover hanya untuk emailmu.
- Membatasi cover ke JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.

## Bagian 4 — Hubungkan kode ke Supabase

1. Di Supabase, buka **Project Settings** lalu cari bagian **API**.
   Pada tampilan dashboard baru, informasi yang sama dapat ditemukan melalui
   tombol **Connect**.
2. Copy **Project URL**.
3. Copy **Publishable key**. Jika project lama belum memiliki publishable key,
   gunakan legacy `anon public` key.
4. Buka `config.js`.
5. Ganti kedua placeholder:

```js
window.BIANCA_CONFIG = {
  supabaseUrl: "https://PROJECT-ID.supabase.co",
  supabasePublishableKey: "sb_publishable_xxxxxxxxx"
};
```

Publishable/anon key memang boleh berada di frontend. Keamanan data dijaga oleh
RLS dari `setup.sql`. Jangan pernah memasukkan `service_role` atau secret key.

## Bagian 5 — Tes di VS Code

1. Buka folder project di VS Code.
2. Install extension **Live Server** bila belum ada.
3. Klik kanan `index.html` → **Open with Live Server**.
4. Pastikan halaman Reading Room muncul.
5. Buka `admin.html` melalui Live Server.
6. Login memakai email dan password dari Bagian 2.
7. Tambahkan satu buku percobaan, upload cover, lalu klik **Publish**.
8. Kembali ke `index.html` dan refresh.

Jika review muncul, koneksinya sudah benar.

## Bagian 6 — Upload ke GitHub

1. Buat repository baru, misalnya `reading-room`.
2. Upload semua file dalam folder ini ke bagian root repository.
3. Buka repository **Settings** → **Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu **Save**.
6. Tunggu deployment selesai.

Website publik:

`https://USERNAME.github.io/reading-room/`

Editor pribadi:

`https://USERNAME.github.io/reading-room/admin.html`

Halaman admin tidak ditampilkan di navigasi publik. Walaupun seseorang menebak
alamatnya, ia tetap tidak dapat menulis karena login dan RLS hanya mengizinkan
email adminmu.

## Cara menambah buku setelah semuanya selesai

1. Buka `admin.html` dari HP atau laptop.
2. Login.
3. Isi form dan upload cover.
4. Centang **Feature this book** jika ingin menjadikannya featured review.
5. Centang **Publish immediately** untuk langsung menampilkannya.
6. Klik **Publish to the shelves**.

Kamu tidak perlu membuka VS Code atau meng-upload cover ke GitHub lagi.

## Troubleshooting singkat

### `Invalid login credentials`

Pastikan akun sudah dibuat di Authentication → Users dan emailnya confirmed.

### `new row violates row-level security policy`

Pastikan email login sama persis dengan email yang menggantikan semua placeholder
di `setup.sql`. Jalankan ulang SQL setelah mengganti email.

### Cover gagal di-upload

Pastikan file JPG, PNG, atau WebP, maksimal 5 MB. Cek bahwa bucket
`book-covers` sudah ada dan bersifat public.

### Website mengatakan `Connect Supabase first`

Masih ada placeholder di `config.js`, atau URL/key salah.

### Review tersimpan tetapi tidak tampil

Pastikan **Publish immediately** dicentang. Draft hanya terlihat di editor.
