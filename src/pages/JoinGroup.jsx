import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import Avatars from '../components/Avatars';

export default function JoinGroup() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(undefined); // undefined: yükleniyor, null: bulunamadı
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'groups', groupId))
      .then((snap) => setGroup(snap.exists() ? { id: snap.id, ...snap.data() } : null))
      .catch(() => setGroup(null));
  }, [groupId]);

  if (group === undefined) return <p className="muted">Davet kontrol ediliyor…</p>;
  if (group === null) {
    return (
      <div className="sheet empty">
        <strong>Bu davet linki çalışmıyor.</strong>
        <p>Grup silinmiş ya da link eksik kopyalanmış olabilir. Arkadaşından linki yeniden göndermesini iste.</p>
      </div>
    );
  }
  if (group.memberIds.includes(user.uid)) return <Navigate to={`/group/${groupId}`} replace />;

  const members = group.memberIds.map((id) => ({ id, name: group.members?.[id]?.name || '?' }));
  const ownerName = group.members?.[group.ownerId]?.name || 'Bir arkadaşın';

  async function join() {
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        memberIds: arrayUnion(user.uid),
        [`members.${user.uid}`]: { name: user.displayName || 'Üye' },
      });
      navigate(`/group/${groupId}`);
    } catch {
      setError('Gruba katılınamadı. Tekrar dene.');
      setBusy(false);
    }
  }

  return (
    <div className="sheet" style={{ display: 'grid', gap: 16, maxWidth: 480, margin: '24px auto 0' }}>
      <p className="muted">{ownerName} seni ortak hesabına çağırıyor:</p>
      <h1>{group.name}</h1>
      <div className="members-line">
        <Avatars members={members} />
        <span>{members.map((m) => m.name).join(', ')}</span>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={join} disabled={busy}>
        {busy ? 'Katılıyorsun…' : 'Gruba katıl'}
      </button>
    </div>
  );
}
