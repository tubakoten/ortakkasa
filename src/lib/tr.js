// Türkçe yardımcıları: isimlere doğru ek getirme, tarih kısaltmaları

const FRONT = 'eiöü';
const BACK = 'aıou';
const VOWELS = FRONT + BACK;

/** Son ünlüye göre yönelme hâli eki: Begüm'e, Işıl'a, Rabia'ya, Ece'ye */
export function dative(name) {
  const lower = name.trim().toLocaleLowerCase('tr-TR');
  let last = '';
  for (let i = lower.length - 1; i >= 0; i--) {
    if (VOWELS.includes(lower[i])) {
      last = lower[i];
      break;
    }
  }
  const vowel = FRONT.includes(last) ? 'e' : 'a';
  const endsWithVowel = VOWELS.includes(lower[lower.length - 1]);
  return `${name.trim()}'${endsWithVowel ? 'y' : ''}${vowel}`;
}

export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** "2026-11-25" -> { day: "25", month: "Kas" } */
export function shortDate(iso) {
  if (!iso) return { day: '', month: '' };
  const [, m, d] = iso.split('-');
  return { day: String(Number(d)), month: MONTHS[Number(m) - 1] };
}

/** Firestore Timestamp -> { day, month } */
export function shortDateFromTs(ts) {
  if (!ts?.toDate) return { day: '', month: '' };
  const d = ts.toDate();
  return { day: String(d.getDate()), month: MONTHS[d.getMonth()] };
}
