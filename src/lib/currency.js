// Para birimleri ve kur çevirisi
// Bakiyeler her zaman TL (kuruş) üzerinden hesaplanır. Yabancı para / altın ile girilen
// harcamalar, girildiği anki kurla TL'ye çevrilip saklanır; böylece kur sonradan
// değişse bile kimsenin borcu kendiliğinden değişmez.

export const CURRENCIES = [
  { code: 'TRY', label: 'TL', suffix: 'TL' },
  { code: 'EUR', label: 'Euro', suffix: '€' },
  { code: 'USD', label: 'Dolar', suffix: '$' },
  { code: 'GBP', label: 'Sterlin', suffix: '£' },
  { code: 'GAU', label: 'Gram altın', suffix: 'gr altın' },
];

const TROY_OUNCE_GRAMS = 31.1034768;

export const currencyOf = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

/** 12550, 'EUR' -> "125,50 €" ; 250, 'GAU' -> "2,50 gr altın" */
export function formatMoney(minor, code = 'TRY') {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toLocaleString('tr-TR');
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole},${frac} ${currencyOf(code).suffix}`;
}

/** 36.80123 -> "36,8012" */
export function formatRate(rate) {
  return rate.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * Kur metnini sayıya çevirir. Virgül varsa Türkçe biçim kabul edilir ("6.198,49"),
 * yoksa nokta ondalık ayıracıdır ("36.80"). Geçersizse null.
 */
export function parseRate(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/\s/g, '');
  t = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** Orijinal para birimindeki tutarı (kuruş/sent/0,01 gr) TL kuruşa çevirir */
export const toKurus = (minor, rate) => Math.round(minor * rate);

/**
 * Kişiye özel payları TL'ye çevirir. Yuvarlama yüzünden oluşabilecek 1-2 kuruşluk
 * farkı ilk kişiye ekler; böylece payların toplamı TL tutarına birebir eşit kalır.
 */
export function convertShares(sharesMinor, rate, totalKurus) {
  const entries = Object.entries(sharesMinor);
  const out = Object.fromEntries(entries.map(([id, v]) => [id, toKurus(v, rate)]));
  const diff = totalKurus - Object.values(out).reduce((s, v) => s + v, 0);
  if (diff !== 0 && entries.length) out[entries[0][0]] += diff;
  return out;
}

/**
 * Güncel kuru getirir: 1 birim = kaç TL. Kaynak: Frankfurter (merkez bankaları ve resmi kaynaklardan derlenen açık API).
 * Gram altın için ons/TL fiyatı 31,1035'e bölünür.
 * Dönüş: { rate, date }
 */
export async function fetchRateToTRY(code) {
  if (code === 'TRY') return { rate: 1, date: null };
  const base = code === 'GAU' ? 'XAU' : code;
  const res = await fetch(`https://api.frankfurter.dev/v2/rate/${base}/TRY`);
  if (!res.ok) throw new Error(`Kur alınamadı (${res.status})`);
  const data = await res.json();
  const rate = code === 'GAU' ? data.rate / TROY_OUNCE_GRAMS : data.rate;
  return { rate: Math.round(rate * 10000) / 10000, date: data.date };
}
