// Üyelerin baş harflerinden küçük renkli yuvarlaklar (defter kalemi renkleri)
const COLORS = ['#ffe45c', '#c9d4f5', '#f6c9c4', '#cfe8d5', '#f3d9b1', '#e2d4f2'];

function colorFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function initials(name = '?') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr-TR'))
    .join('');
}

export default function Avatars({ members, max = 5 }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="avatars" aria-hidden="true">
      {shown.map((m) => (
        <span key={m.id} className="avatar" style={{ background: colorFor(m.id) }} title={m.name}>
          {initials(m.name)}
        </span>
      ))}
      {extra > 0 && <span className="avatar" style={{ background: '#fff' }}>+{extra}</span>}
    </div>
  );
}
