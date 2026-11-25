import { useState } from 'react';
import { formatTL } from '../lib/balance';

export default function BalanceView({ balances, transfers, nameOf, currentUserId, onSettle }) {
  const [busyKey, setBusyKey] = useState(null);

  const rows = Object.entries(balances).sort((a, b) => a[1] - b[1]);
  const max = Math.max(1, ...rows.map(([, v]) => Math.abs(v)));

  async function settle(t) {
    const msg =
      t.from === currentUserId
        ? `${nameOf(t.to)} kişisine ${formatTL(t.amount)} ödediğini onaylıyor musun?`
        : `${nameOf(t.from)} kişisinden ${formatTL(t.amount)} aldığını onaylıyor musun?`;
    if (!window.confirm(msg)) return;
    const key = `${t.from}-${t.to}`;
    setBusyKey(key);
    try {
      await onSettle(t);
    } finally {
      setBusyKey(null);
    }
  }

  const label = (uid, bal) => (
    <span className="scale-label">
      <b>{nameOf(uid)}{uid === currentUserId ? ' (sen)' : ''}</b>
      <span className={bal > 0 ? 'pos' : bal < 0 ? 'neg' : 'muted'}>
        {bal > 0 ? '+' : ''}{formatTL(bal)}
      </span>
    </span>
  );

  return (
    <div>
      <h2 className="section-title">Bakiyeler</h2>
      <p className="section-hint">Herkesin ödediği ile payına düşenin farkı.</p>

      <ul className="scale">
        {rows.map(([uid, bal]) => {
          const width = `${Math.max(2, (Math.abs(bal) / max) * 70)}%`;
          return (
            <li key={uid}>
              <div className="scale-side left">
                {bal < 0 && (
                  <>
                    {label(uid, bal)}
                    <div className="bar neg" style={{ width }} />
                  </>
                )}
              </div>
              <div className="scale-side right">
                {bal > 0 && (
                  <>
                    <div className="bar pos" style={{ width }} />
                    {label(uid, bal)}
                  </>
                )}
                {bal === 0 && label(uid, bal)}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="scale-legend">
        <span>borçlu</span>
        <span>alacaklı</span>
      </div>

      <h2 className="section-title" style={{ marginTop: 40 }}>Nasıl ödeşilir?</h2>
      {transfers.length === 0 ? (
        <p className="done">Herkes ödeşti!</p>
      ) : (
        <>
          <p className="section-hint">
            {transfers.length === 1
              ? 'Tek bir ödemeyle herkesin hesabı kapanır.'
              : `${transfers.length} ödemeyle herkesin hesabı kapanır. Daha az ödemeyle kapatmanın yolu yok.`}
          </p>
          <ul className="ruled">
            {transfers.map((t) => {
              const key = `${t.from}-${t.to}`;
              const involved = t.from === currentUserId || t.to === currentUserId;
              return (
                <li key={key} className={`transfer ${involved ? 'mine' : ''}`}>
                  <span className="transfer-who">
                    <strong>{nameOf(t.from)}</strong>
                    <span className="arrow" aria-label="şu kişiye öder">→</span>
                    <strong>{nameOf(t.to)}</strong>
                  </span>
                  <span className="entry-amount">{formatTL(t.amount)}</span>
                  {involved && (
                    <button className="btn btn-sm" disabled={busyKey === key} onClick={() => settle(t)}>
                      {t.from === currentUserId ? 'Ödedim' : 'Aldım'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
