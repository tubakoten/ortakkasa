import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import Avatars from '../components/Avatars';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', user.uid));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setGroups(list);
      },
      () => setError('Gruplar yüklenemedi. Bağlantını kontrol edip sayfayı yenile.')
    );
  }, [user.uid]);

  async function createGroup(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const ref = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        ownerId: user.uid,
        memberIds: [user.uid],
        members: { [user.uid]: { name: user.displayName || 'Ben' } },
        createdAt: serverTimestamp(),
      });
      setName('');
      navigate(`/group/${ref.id}`);
    } catch {
      setError('Grup oluşturulamadı. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Gruplarım</h1>

      <form className="new-group" onSubmit={createGroup}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yeni grup: Ev 3B, Kapadokya tatili…"
          aria-label="Yeni grup adı"
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          Grup oluştur
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="sheet">
        {groups === null ? (
          <p className="muted">Yükleniyor…</p>
        ) : groups.length === 0 ? (
          <div className="empty">
            <strong>Henüz bir grubun yok.</strong>
            <p>
              Yukarıdan bir grup oluştur ve davet linkini ev arkadaşlarına gönder. Bir arkadaşın
              seni davet ettiyse onun gönderdiği linke tıklaman yeterli.
            </p>
          </div>
        ) : (
          <ul className="ruled">
            {groups.map((g) => {
              const members = g.memberIds.map((id) => ({ id, name: g.members?.[id]?.name || '?' }));
              return (
                <li key={g.id}>
                  <Link to={`/group/${g.id}`} className="group-row">
                    <div className="grow">
                      <div className="group-name">{g.name}</div>
                      <div className="group-meta">
                        {g.memberIds.length} kişi{g.ownerId === user.uid ? ', yöneticisi sensin' : ''}
                      </div>
                    </div>
                    <Avatars members={members} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
