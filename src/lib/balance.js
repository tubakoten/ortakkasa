// OrtakKasa — bakiye hesaplama ve borç sadeleştirme
// Tüm tutarlar KURUŞ cinsinden tam sayı (integer) olarak tutulur.
// Böylece 0.1 + 0.2 = 0.30000000000000004 gibi kayan nokta hataları oluşmaz.

/** "125,50" veya "125.5" gibi bir girdiyi kuruşa çevirir. Geçersizse null döner. */
export function parseToKurus(input) {
  if (input === null || input === undefined) return null;
  const normalized = String(input).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** 12550 -> "125,50 TL" */
export function formatTL(kurus) {
  const sign = kurus < 0 ? '-' : '';
  const abs = Math.abs(kurus);
  const whole = Math.floor(abs / 100).toLocaleString('tr-TR');
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole},${frac} TL`;
}

/**
 * Toplam tutarı kişiler arasında eşit böler.
 * Bölünemeyen kuruşlar (kalan) listedeki ilk kişilere birer birer dağıtılır,
 * böylece payların toplamı her zaman tutara birebir eşit olur.
 * Örn: 100 kuruş / 3 kişi -> [34, 33, 33]
 */
export function splitEqually(amountKurus, memberIds) {
  if (!memberIds.length) return {};
  const base = Math.floor(amountKurus / memberIds.length);
  let remainder = amountKurus - base * memberIds.length;
  const shares = {};
  for (const id of memberIds) {
    shares[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return shares;
}

/**
 * Her üyenin net bakiyesini hesaplar.
 *   pozitif  -> gruptan alacaklı
 *   negatif  -> gruba borçlu
 * Harcama: ödeyen kişi +tutar, payı olan herkes -payı.
 * Ödeme (settlement): borçlu "from" kişi borcunu kapattığı için +, alan "to" kişi -.
 */
export function computeBalances(memberIds, expenses, settlements = []) {
  const balances = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const ensure = (id) => {
    if (!(id in balances)) balances[id] = 0;
  };

  for (const e of expenses) {
    ensure(e.paidBy);
    balances[e.paidBy] += e.amount;
    for (const [uid, share] of Object.entries(e.shares || {})) {
      ensure(uid);
      balances[uid] -= share;
    }
  }

  for (const s of settlements) {
    ensure(s.from);
    ensure(s.to);
    balances[s.from] += s.amount;
    balances[s.to] -= s.amount;
  }

  return balances;
}

/**
 * Borç sadeleştirme (greedy / açgözlü yaklaşım).
 * 1) Herkesi borçlular ve alacaklılar olarak ikiye ayır.
 * 2) En çok borçlu olanı, en çok alacaklı olanla eşleştir.
 * 3) İkisinden küçük olan tutar kadar ödeme oluştur; biri sıfırlanır.
 * 4) Sıfırlanmayanla devam et.
 * Her adımda en az bir kişi kapandığı için n kişilik grupta en fazla n-1 ödeme çıkar.
 * Dönüş: [{ from, to, amount }]
 */
export function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];
  for (const [id, bal] of Object.entries(balances)) {
    if (bal < 0) debtors.push({ id, amount: -bal });
    else if (bal > 0) creditors.push({ id, amount: bal });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return transfers;
}
