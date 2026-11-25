// Tekir kedi: giriş ekranında yazılanları gözleriyle takip eder,
// "şifreyi göster" denince patileriyle gözlerini kapatır.
//
// mood:  'idle' | 'watching' | 'hiding'
// look:  -1 (sola) … 1 (sağa) — yazı uzadıkça gözler sağa kayar

export default function Mascot({ mood = 'idle', look = 0 }) {
  const dx = mood === 'watching' ? look * 4 : 0;
  const dy = mood === 'watching' ? 3 : 0;

  return (
    <svg
      className={`mascot mascot-${mood}`}
      viewBox="0 0 160 128"
      width="150"
      height="120"
      aria-hidden="true"
    >
      {/* kulaklar */}
      <path d="M36 52 L34 8 L72 32 Z" className="m-fur" />
      <path d="M124 52 L126 8 L88 32 Z" className="m-fur" />
      <path d="M42 40 L41 20 L60 32 Z" className="m-ear-inner" />
      <path d="M118 40 L119 20 L100 32 Z" className="m-ear-inner" />

      {/* kafa */}
      <ellipse cx="80" cy="72" rx="54" ry="44" className="m-fur" />

      {/* tekir çizgileri */}
      <path d="M80 30 v12 M68 32 l3 10 M92 32 l-3 10" className="m-stripe" />

      {/* yanaklar */}
      <circle cx="46" cy="86" r="7" className="m-blush" />
      <circle cx="114" cy="86" r="7" className="m-blush" />

      {/* gözler */}
      <g className="m-eyes">
        <ellipse cx="60" cy="66" rx="7.5" ry="8.5" className="m-white" />
        <ellipse cx="100" cy="66" rx="7.5" ry="8.5" className="m-white" />
        <g className="m-pupils" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
          <ellipse cx="60" cy="66" rx="3.6" ry="5.5" className="m-ink-fill" />
          <ellipse cx="100" cy="66" rx="3.6" ry="5.5" className="m-ink-fill" />
          <circle cx="61.6" cy="63.5" r="1.5" fill="#fff" />
          <circle cx="101.6" cy="63.5" r="1.5" fill="#fff" />
        </g>
      </g>

      {/* burun ve ağız */}
      <path d="M75 82 h10 l-5 6 Z" className="m-nose" />
      <path d="M80 88 v3 M71 92 Q75.5 97 80 91 Q84.5 97 89 92" className="m-line" />

      {/* bıyıklar */}
      <path d="M38 84 L18 80 M38 90 L18 93 M122 84 L142 80 M122 90 L142 93" className="m-whisker" />

      {/* patiler: formun kenarında durur, şifre gösterilince gözleri kapatır */}
      <g className="m-paw m-paw-left">
        <ellipse cx="46" cy="120" rx="17" ry="11" className="m-fur" />
        <path d="M40 113 v6 M47 112 v6 M54 113 v6" className="m-line-thin" />
      </g>
      <g className="m-paw m-paw-right">
        <ellipse cx="114" cy="120" rx="17" ry="11" className="m-fur" />
        <path d="M106 113 v6 M113 112 v6 M120 113 v6" className="m-line-thin" />
      </g>
    </svg>
  );
}
