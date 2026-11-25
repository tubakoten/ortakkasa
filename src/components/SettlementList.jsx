import { formatTL } from '../lib/balance';
import { shortDateFromTs } from '../lib/tr';

export default function SettlementList({ settlements, nameOf, canDelete, onDelete }) {
  if (settlements.length === 0) {
    return (
      <div className="empty">
        <strong>Henüz kimse ödeme yapmadı.</strong>
        <p>Birine borcunu ödediğinde “Kim kime borçlu” sekmesindeki “Ödedim” düğmesiyle kaydet; bakiyeler hemen güncellenir.</p>
      </div>
    );
  }

  return (
    <ul className="ruled">
      {settlements.map((s) => {
        const { day, month } = shortDateFromTs(s.createdAt);
        return (
          <li key={s.id} className="entry">
            <div className="entry-date">
              <b>{day}</b>
              {month}
            </div>
            <div>
              <div className="entry-title">
                {nameOf(s.from)} <span className="muted">→</span> {nameOf(s.to)}
              </div>
              <div className="entry-sub">Borç ödemesi</div>
            </div>
            <div className="entry-amount pos">{formatTL(s.amount)}</div>
            {canDelete(s) ? (
              <button className="x-btn" aria-label="Ödeme kaydını sil" onClick={() => onDelete(s.id)}>✕</button>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}
