# 💸 OrtakKasa — Ortak Gider Bölüşme Uygulaması

COME 373 ders projesi. Ev arkadaşları, tatil grupları ve yurt odaları için ortak harcamaları
kaydeden, her üyenin net bakiyesini hesaplayan ve borçları **en az sayıda ödemeyle** kapatacak
şekilde sadeleştiren web uygulaması.

## Özellikler (v1)
- E-posta/şifre ile kayıt ve giriş (Firebase Authentication)
- Grup oluşturma, davet linkiyle gruba katılma
- Harcama ekleme: açıklama, tutar, ödeyen, tarih, kategori (açıklamadan otomatik tahmin)
- Para birimi seçimi: TL, Euro, Dolar, Sterlin, gram altın — güncel kur otomatik gelir, elle değiştirilebilir
- Eşit bölüşüm (seçili kişiler arasında) veya kişiye özel tutarlarla bölüşüm
- Net bakiye ekranı (kim alacaklı, kim borçlu)
- Borç sadeleştirme algoritması (n kişide en fazla n−1 ödeme)
- "Ödedim / Aldım" ile ödeme kaydı, ödeme geçmişi
- Gerçek zamanlı güncelleme (biri harcama girince herkesin ekranı anında yenilenir)
- Grup yöneticisi: herhangi bir harcamayı silme, grubu silme

## Teknolojiler
React 19 · Vite · React Router · Firebase Authentication · Cloud Firestore · Frankfurter kur API · Netlify

## Kurulum

### 1) Firebase projesi
1. https://console.firebase.google.com → **Add project** (Google Analytics gerekmez).
2. **Build > Authentication > Get started > Sign-in method > Email/Password** → Enable.
3. **Build > Firestore Database > Create database** → bölge: `eur3 (europe-west)` → *production mode*.
4. **Firestore > Rules** sekmesine `firestore.rules` dosyasının içeriğini yapıştırıp **Publish**.
5. **Project settings (⚙️) > General > Your apps > Web (</>)** → uygulamayı kaydet, çıkan
   `firebaseConfig` değerlerini not al.

### 2) Projeyi çalıştır
```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env
# .env içindeki değerleri firebaseConfig'den doldur
npm run dev
```
http://localhost:5173 adresini aç.

### 3) Testler
```bash
npm test
```
Borç sadeleştirme ve kuruş hesaplama fonksiyonlarının birim testlerini çalıştırır.

### 4) Netlify'a yayınlama
1. Kodu GitHub'a yükle.
2. Netlify → **Add new site > Import from Git** → repoyu seç.
   Build command: `npm run build` · Publish directory: `dist`
3. **Site configuration > Environment variables** kısmına `.env` içindeki 6 değişkeni ekle, yeniden deploy et.
4. Firebase Console → **Authentication > Settings > Authorized domains** kısmına Netlify
   adresini (`xxx.netlify.app`) ekle.

## Veri modeli (Firestore)
```
users/{uid}                       displayName, email, createdAt
groups/{groupId}                  name, ownerId, memberIds[], members{uid:{name}}, createdAt
groups/{groupId}/expenses/{id}    description, amount (TL kuruş), currency, originalAmount,
                                  rate, rateDate, paidBy, date, category,
                                  splitType('equal'|'exact'), shares{uid: TL kuruş},
                                  createdBy, createdAt
groups/{groupId}/settlements/{id} from, to, amount, createdBy, createdAt
```
Tüm tutarlar **kuruş cinsinden tam sayı** olarak saklanır (125,50 TL → 12550). Böylece kayan
nokta (floating point) yuvarlama hataları oluşmaz.

Döviz veya altınla girilen harcamalar, girildiği anki kurla TL'ye çevrilip `amount` alanına yazılır;
orijinal tutar ve kullanılan kur da saklanır. Bakiyeler her zaman TL üzerinden hesaplanır, böylece
kur sonradan değişse bile borçlar değişmez. Kurlar Frankfurter açık API'sinden alınır
(`api.frankfurter.dev`); gram altın = ons/TL ÷ 31,1035.

## Borç sadeleştirme algoritması (`src/lib/balance.js`)
1. Her üyenin net bakiyesi = ödediği toplam − payına düşen toplam (+ yaptığı ödemeler − aldığı ödemeler).
2. Üyeler borçlular ve alacaklılar olarak ayrılıp tutara göre büyükten küçüğe sıralanır.
3. En çok borçlu kişi en çok alacaklı kişiye `min(borç, alacak)` kadar öder; biri sıfırlanır.
4. Herkes sıfırlanana kadar tekrar edilir. Her adımda en az bir kişi kapandığı için
   n kişilik grupta en fazla **n−1** ödeme oluşur.

## Klasör yapısı
```
src/
  lib/balance.js            hesaplama mantığı (+ balance.test.js)
  lib/tr.js                 Türkçe ekler ve tarih kısaltmaları
  lib/currency.js           para birimleri, kur çekme ve TL'ye çevirme
  firebase.js               Firebase bağlantısı
  AuthContext.jsx           oturum yönetimi
  App.jsx                   sayfa yönlendirme
  pages/                    Login, Dashboard, GroupPage, JoinGroup
  components/               AddExpenseForm, ExpenseList, BalanceView, SettlementList, Avatars
firestore.rules             güvenlik kuralları
```
