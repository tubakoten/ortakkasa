import { useEffect, useState } from 'react';
import { parseToKurus, splitEqually, formatTL } from '../lib/balance';
import {
  CURRENCIES,
  currencyOf,
  formatMoney,
  formatRate,
  parseRate,
  toKurus,
  convertShares,
  fetchRateToTRY,
} from '../lib/currency';
import { shortDate } from '../lib/tr';

export const CATEGORIES = [
  { id: 'market', label: 'Market', icon: '🛒' },
  { id: 'kira', label: 'Kira', icon: '🏠' },
  { id: 'fatura', label: 'Fatura', icon: '💡' },
  { id: 'yemek', label: 'Yemek', icon: '🍕' },
  { id: 'ulasim', label: 'Ulaşım', icon: '🚕' },
  { id: 'eglence', label: 'Eğlence', icon: '🎉' },
  { id: 'diger', label: 'Diğer', icon: '📦' },
];

// Açıklamadaki kelimelere göre kategori tahmini (kullanıcı elle seçmediyse uygulanır)
const KEYWORDS = {
  market: ['migros', 'a101', 'bim', 'şok', 'sok', 'carrefour', 'market', 'manav', 'kasap', 'fırın', 'ekmek', 'getir', 'macro'],
  kira: ['kira', 'aidat', 'depozito'],
  fatura: ['fatura', 'elektrik', 'su ', 'doğalgaz', 'dogalgaz', 'internet', 'telefon', 'netflix', 'spotify', 'abonelik'],
  yemek: ['yemek', 'pizza', 'burger', 'döner', 'kahve', 'cafe', 'kafe', 'restoran', 'lahmacun', 'yemeksepeti', 'trendyol yemek', 'kahvaltı', 'çay'],
  ulasim: ['taksi', 'uber', 'bitaksi', 'otobüs', 'metro', 'istanbulkart', 'benzin', 'yakıt', 'otopark', 'uçak', 'marmaray', 'vapur'],
  eglence: ['sinema', 'konser', 'bowling', 'oyun', 'parti', 'müze', 'tiyatro'],
};

function guessCategory(text) {
  const t = ` ${text.toLocaleLowerCase('tr-TR')} `;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return cat;
  }
  return null;
}

// Yerel tarihe göre YYYY-MM-DD (toISOString UTC kullandığı için gece yarısından sonra bir önceki günü verir)
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddExpenseForm({ members, currentUserId, onSubmit, onCancel }) {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [rateText, setRateText] = useState('1');
  const [rateInfo, setRateInfo] = useState({ status: 'idle', date: null }); // idle | loading | ok | error
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('diger');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'exact'
  const [included, setIncluded] = useState(() => members.map((m) => m.id));
  const [exact, setExact] = useState({}); // uid -> metin (seçili para biriminde)
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Para birimi değişince güncel kuru getir ve kur alanına yaz (kullanıcı değiştirebilir)
  useEffect(() => {
    if (currency === 'TRY') {
      setRateText('1');
      setRateInfo({ status: 'idle', date: null });
      return;
    }
    let cancelled = false;
    setRateText('');
    setRateInfo({ status: 'loading', date: null });
    fetchRateToTRY(currency)
      .then(({ rate, date: rateDate }) => {
        if (cancelled) return;
        setRateText(formatRate(rate));
        setRateInfo({ status: 'ok', date: rateDate });
      })
      .catch(() => {
        if (!cancelled) setRateInfo({ status: 'error', date: null });
      });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const isForeign = currency !== 'TRY';
  const cur = currencyOf(currency);
  const amount = parseToKurus(amountText); // seçili para biriminde, 2 ondalık
  const rate = isForeign ? parseRate(rateText) : 1;
  const amountTL = amount && rate ? toKurus(amount, rate) : null;

  // Özel bölüşümde girilen tutarların toplamı ve kalan (seçili para biriminde)
  const exactShares = Object.fromEntries(
    members.map((m) => [m.id, exact[m.id] ? parseToKurus(exact[m.id]) : 0])
  );
  const exactSum = Object.values(exactShares).reduce((s, v) => s + (v || 0), 0);
  const remaining = (amount || 0) - exactSum;

  const orderedIncluded = members.map((m) => m.id).filter((id) => included.includes(id));
  const preview = amount > 0 ? splitEqually(amount, orderedIncluded) : {};

  function onDescriptionChange(value) {
    setDescription(value);
    if (!categoryTouched) setCategory(guessCategory(value) || 'diger');
  }

  function pickCategory(id) {
    setCategory(id);
    setCategoryTouched(true);
  }

  function toggle(id) {
    setIncluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) return setError('Ne için harcandığını yaz, örneğin “Migros alışverişi”.');
    if (!amount || amount <= 0) return setError('Tutarı rakamla yaz, örneğin 245,90.');
    if (!rate) return setError(`Kuru yaz: 1 ${cur.suffix} kaç TL?`);

    // Bakiyeler TL üzerinden tutulduğu için paylar TL kuruşa çevrilir
    let shares;
    if (splitType === 'equal') {
      if (orderedIncluded.length === 0) return setError('Harcamayı en az bir kişiye böl.');
      shares = splitEqually(amountTL, orderedIncluded);
    } else {
      if (Object.values(exactShares).some((v) => v === null)) {
        return setError('Kişi tutarlarından biri rakam değil.');
      }
      if (remaining !== 0) {
        return setError(`Payların toplamı tutara eşit olmalı. Dağıtılmayan: ${formatMoney(remaining, currency)}`);
      }
      const positive = Object.fromEntries(Object.entries(exactShares).filter(([, v]) => v > 0));
      shares = convertShares(positive, rate, amountTL);
    }

    setBusy(true);
    try {
      await onSubmit({
        description: description.trim(),
        amount: amountTL, // TL kuruş — bakiye hesabı bunu kullanır
        currency,
        originalAmount: amount, // seçili para biriminde
        rate,
        rateDate: rateInfo.date || date,
        paidBy,
        date,
        category,
        splitType,
        shares,
      });
    } catch {
      setError('Harcama kaydedilemedi. Tekrar dene.');
      setBusy(false);
    }
  }

  const rateDay = rateInfo.date ? shortDate(rateInfo.date) : null;

  return (
    <form className="sheet expense-form" onSubmit={handleSubmit}>
      <h2>Yeni harcama</h2>

      <label>
        Ne için?
        <input value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Migros alışverişi" autoFocus />
      </label>

      <div>
        <span className="field-label">Tutar</span>
        <div className="money-row">
          <input
            className="amount-input"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0,00"
            aria-label="Tutar"
          />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Para birimi">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        {isForeign && (
          <div className="rate-box">
            <label className="rate-line">
              <span>1 {cur.suffix} =</span>
              <input
                inputMode="decimal"
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                placeholder={rateInfo.status === 'loading' ? 'kur alınıyor…' : 'kur'}
                aria-label={`1 ${cur.label} kaç TL`}
              />
              <span>TL</span>
            </label>
            <p className="rate-note">
              {rateInfo.status === 'loading' && 'Güncel kur alınıyor…'}
              {rateInfo.status === 'ok' && `${rateDay.day} ${rateDay.month} tarihli güncel kur. Farklı bir kurla ödediysen değiştir.`}
              {rateInfo.status === 'error' && 'Güncel kur alınamadı. Kuru elle yaz.'}
            </p>
            {amountTL > 0 && (
              <p className="rate-result">
                {formatMoney(amount, currency)} = <strong>{formatTL(amountTL)}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid-2">
        <label>
          Kim ödedi?
          <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.name} (ben)` : m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tarih
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div>
        <span className="field-label">Kategori</span>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={category === c.id ? 'chip active' : 'chip'}
              aria-pressed={category === c.id}
              onClick={() => pickCategory(c.id)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Kimler arasında bölünsün?</span>
        <div className="split-mode">
          <label>
            <input type="radio" name="split" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} />
            Eşit
          </label>
          <label>
            <input type="radio" name="split" checked={splitType === 'exact'} onChange={() => setSplitType('exact')} />
            Kişiye özel tutar
          </label>
        </div>

        {splitType === 'equal' ? (
          <div className="split-list">
            {members.map((m) => (
              <label key={m.id} className="check-row">
                <input type="checkbox" checked={included.includes(m.id)} onChange={() => toggle(m.id)} />
                {m.name}
                {preview[m.id] !== undefined && (
                  <span className="share">
                    {formatMoney(preview[m.id], currency)}
                    {isForeign && rate ? ` ≈ ${formatTL(toKurus(preview[m.id], rate))}` : ''}
                  </span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="split-list">
            {members.map((m) => (
              <label key={m.id} className="exact-row">
                {m.name}
                <span className="exact-input">
                  <input
                    inputMode="decimal"
                    value={exact[m.id] || ''}
                    onChange={(e) => setExact({ ...exact, [m.id]: e.target.value })}
                    placeholder="0,00"
                    aria-label={`${m.name} payı`}
                  />
                  <span className="muted small">{cur.suffix}</span>
                </span>
              </label>
            ))}
            <p className={`small ${remaining === 0 ? 'pos' : 'neg'}`} style={{ marginTop: 8, fontWeight: 600 }}>
              {remaining === 0 ? 'Paylar tutarla eşit.' : `Dağıtılmayan: ${formatMoney(remaining, currency)}`}
            </p>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="button" className="link-btn" onClick={onCancel}>Vazgeç</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Harcamayı kaydet'}</button>
      </div>
    </form>
  );
}
