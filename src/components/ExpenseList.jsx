import { formatTL } from '../lib/balance';
import { formatMoney } from '../lib/currency';
import { shortDate } from '../lib/tr';
import { CATEGORIES } from './AddExpenseForm';

const iconOf = (id) => CATEGORIES.find((c) => c.id === id)?.icon || '📦';

export default function ExpenseList({ expenses, nameOf, canDelete, onDelete }) {
  if (expenses.length === 0) {
    return (
      <div className="empty">
        <strong>Defter henüz boş.</strong>
        <p>Market, fatura, taksi… Gruptan biri ortak bir şey için ödeme yaptıysa “Harcama ekle” ile yaz.</p>
      </div>
    );
  }

  return (
    <ul className="ruled">
      {expenses.map((e) => {
        const { day, month } = shortDate(e.date);
        const count = Object.keys(e.shares || {}).length;
        const foreign = e.currency && e.currency !== 'TRY';
        return (
          <li key={e.id} className="entry">
            <div className="entry-date">
              <b>{day}</b>
              {month}
            </div>
            <div>
              <div className="entry-title">
                <span className="cat" aria-hidden="true">{iconOf(e.category)}</span>
                {e.description}
              </div>
              <div className="entry-sub">
                {nameOf(e.paidBy)} ödedi,{' '}
                {e.splitType === 'equal' ? `${count} kişiye eşit bölündü` : 'kişiye özel tutarlarla bölündü'}
              </div>
            </div>
            <div className="entry-amount">
              {foreign ? formatMoney(e.originalAmount, e.currency) : formatTL(e.amount)}
              {foreign && <div className="entry-sub converted">{formatTL(e.amount)}</div>}
            </div>
            {canDelete(e) ? (
              <button className="x-btn" aria-label={`${e.description} harcamasını sil`} onClick={() => onDelete(e.id)}>✕</button>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}
