import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  doc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { computeBalances, simplifyDebts, formatTL } from '../lib/balance';
import { dative } from '../lib/tr';
import Avatars from '../components/Avatars';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseList from '../components/ExpenseList';
import BalanceView from '../components/BalanceView';
import SettlementList from '../components/SettlementList';

/** Kullanıcının durumunu tek cümlelik bir not olarak yazar */
function statusNote(myId, transfers, nameOf) {
  const iPay = transfers.filter((t) => t.from === myId);
  const iGet = transfers.filter((t) => t.to === myId);
  if (iPay.length === 1) {
    return { tone: 'neg', text: `${dative(nameOf(iPay[0].to))} ${formatTL(iPay[0].amount)} borçlusun` };
  }
  if (iPay.length > 1) {
    const sum = iPay.reduce((s, t) => s + t.amount, 0);
    return { tone: 'neg', text: `Toplam ${formatTL(sum)} borçlusun` };
  }
  if (iGet.length === 1) {
    return { tone: 'pos', text: `${nameOf(iGet[0].from)} sana ${formatTL(iGet[0].amount)} borçlu` };
  }
  if (iGet.length > 1) {
    const sum = iGet.reduce((s, t) => s + t.amount, 0);
    return { tone: 'pos', text: `Sana toplam ${formatTL(sum)} borçlular` };
  }
  return { tone: '', text: 'Hesabın kapalı, kimseye borcun yok' };
}

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(undefined);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [tab, setTab] = useState('expenses');
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gerçek zamanlı dinleme: biri harcama eklediğinde herkesin ekranı anında güncellenir
  useEffect(() => {
    const unsubGroup = onSnapshot(
      doc(db, 'groups', groupId),
      (snap) => setGroup(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setGroup(null)
    );
    const unsubExp = onSnapshot(collection(db, 'groups', groupId, 'expenses'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort(
        (a, b) =>
          (b.date || '').localeCompare(a.date || '') ||
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setExpenses(list);
    });
    const unsubSet = onSnapshot(collection(db, 'groups', groupId, 'settlements'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSettlements(list);
    });
    return () => {
      unsubGroup();
      unsubExp();
      unsubSet();
    };
  }, [groupId]);

  const balances = useMemo(
    () => (group ? computeBalances(group.memberIds, expenses, settlements) : {}),
    [group, expenses, settlements]
  );
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);

  if (group === undefined) return <p className="muted">Yükleniyor…</p>;
  if (group === null || !group.memberIds.includes(user.uid)) {
    return (
      <div className="sheet empty">
        <strong>Bu grubu göremiyorsun.</strong>
        <p>Grup silinmiş olabilir ya da henüz üye değilsin. Bir davet linkin varsa onu aç.</p>
      </div>
    );
  }

  const isOwner = group.ownerId === user.uid;
  const nameOf = (uid) => group.members?.[uid]?.name || 'Eski üye';
  const members = group.memberIds.map((id) => ({ id, name: nameOf(id) }));
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const note = statusNote(user.uid, transfers, nameOf);

  async function copyInvite() {
    const link = `${window.location.origin}/join/${groupId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Davet linkini kopyala:', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addExpense(data) {
    await addDoc(collection(db, 'groups', groupId, 'expenses'), {
      ...data,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    setShowForm(false);
    setTab('expenses');
  }

  async function deleteExpense(id) {
    if (!window.confirm('Bu harcama silinsin mi? Bakiyeler yeniden hesaplanacak.')) return;
    await deleteDoc(doc(db, 'groups', groupId, 'expenses', id));
  }

  async function recordSettlement({ from, to, amount }) {
    await addDoc(collection(db, 'groups', groupId, 'settlements'), {
      from,
      to,
      amount,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  }

  async function deleteSettlement(id) {
    if (!window.confirm('Bu ödeme kaydı silinsin mi?')) return;
    await deleteDoc(doc(db, 'groups', groupId, 'settlements', id));
  }

  async function deleteGroup() {
    if (!window.confirm(`"${group.name}" grubu ve tüm harcamaları kalıcı olarak silinsin mi?`)) return;
    // Firestore alt koleksiyonları otomatik silmez; önce onları temizliyoruz
    for (const sub of ['expenses', 'settlements']) {
      const snap = await getDocs(collection(db, 'groups', groupId, sub));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteDoc(doc(db, 'groups', groupId));
    navigate('/');
  }

  return (
    <div>
      <Link to="/" className="back">Tüm gruplar</Link>

      <div className="group-head">
        <div>
          <h1>{group.name}</h1>
          <div className="members-line">
            <Avatars members={members} />
            <span>{members.map((m) => m.name).join(', ')}</span>
          </div>
        </div>
        <button className="btn btn-sm" onClick={copyInvite}>
          {copied ? 'Link kopyalandı' : 'Davet linkini kopyala'}
        </button>
      </div>

      <div className="status">
        <div className="note-wrap">
          <span className={`note ${note.tone}`}>{note.text}</span>
        </div>
        <div>
          <div className="total-label">Gruptaki toplam harcama</div>
          <div className="total-value">{formatTL(total)}</div>
        </div>
      </div>

      {showForm ? (
        <AddExpenseForm
          members={members}
          currentUserId={user.uid}
          onSubmit={addExpense}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => setShowForm(true)}>
          Harcama ekle
        </button>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'expenses'} className={tab === 'expenses' ? 'active' : ''} onClick={() => setTab('expenses')}>
          Harcamalar <span className="count">{expenses.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'balances'} className={tab === 'balances' ? 'active' : ''} onClick={() => setTab('balances')}>
          Kim kime borçlu
        </button>
        <button role="tab" aria-selected={tab === 'settlements'} className={tab === 'settlements' ? 'active' : ''} onClick={() => setTab('settlements')}>
          Ödemeler <span className="count">{settlements.length}</span>
        </button>
      </div>

      <div className="sheet">
        {tab === 'expenses' && (
          <ExpenseList
            expenses={expenses}
            nameOf={nameOf}
            canDelete={(e) => isOwner || e.createdBy === user.uid}
            onDelete={deleteExpense}
          />
        )}
        {tab === 'balances' && (
          <BalanceView
            balances={balances}
            transfers={transfers}
            nameOf={nameOf}
            currentUserId={user.uid}
            onSettle={recordSettlement}
          />
        )}
        {tab === 'settlements' && (
          <SettlementList
            settlements={settlements}
            nameOf={nameOf}
            canDelete={(s) => isOwner || s.createdBy === user.uid}
            onDelete={deleteSettlement}
          />
        )}
      </div>

      {isOwner && (
        <div className="danger-row">
          <button className="link-btn danger" onClick={deleteGroup}>Grubu sil</button>
        </div>
      )}
    </div>
  );
}
