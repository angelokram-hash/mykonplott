// myKONPLOTT – Restocking viewer
import { useState, useEffect } from 'react';

const KONAGENT_URL = process.env.REACT_APP_KONAGENT_URL || 'https://kon-agent.vercel.app';
const CDN_BASE = 'https://konplott-cdn.com/mytism/image';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function imgUrl(id, size) {
  if (!id) return null;
  return `${CDN_BASE}/${id}/${id}.jpg?width=${size}&height=${size}&box=true`;
}

function goUrl(ean) {
  return `https://www.konplott.com/go/${ean}`;
}

function fmtPrice(v) {
  if (v == null || v === 0) return null;
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Convert flat ArtikelListeItem[] → catalog structure KonCatalog expects
function buildCatalog(artikel) {
  const cells = artikel.map(a => ({
    sku: a.ean,
    kollektion: a.kollektionsName || '—',
    form: a.formName || a.bezeichnung || '—',
    subkollektion: a.subKollektionsName || '—',
    bezeichnung: a.bezeichnung || '',
    price: a.verkaufspreiBrutto,
    imageId: a.vorschaubildId,
    images: a.vorschaubildId ? [a.vorschaubildId] : [],
  }));

  // Collect kollektionen in sorted order
  const kollOrder = [];
  const kollSeen = new Set();
  cells.forEach(c => {
    if (!kollSeen.has(c.kollektion)) { kollSeen.add(c.kollektion); kollOrder.push(c.kollektion); }
  });
  kollOrder.sort((a, b) => a.localeCompare(b, 'de'));

  const byKollektion = {};
  kollOrder.forEach(k => { byKollektion[k] = []; });
  cells.forEach(c => { byKollektion[c.kollektion].push(c); });

  // Sort each kollektion: subkollektion asc, then price desc
  Object.values(byKollektion).forEach(arr => {
    arr.sort((a, b) => {
      const sc = a.subkollektion.localeCompare(b.subkollektion, 'de');
      if (sc !== 0) return sc;
      return b.price - a.price;
    });
  });

  // Preview image: first item per kollektion with an imageId
  const kollektionPreviews = {};
  kollOrder.forEach(k => {
    const first = byKollektion[k].find(c => c.imageId);
    if (first) kollektionPreviews[k] = { image: imgUrl(first.imageId, 600) };
  });

  return { kollektionen: kollOrder, byKollektion, kollektionPreviews, cells };
}

// Build matrix: rows = unique form×price combos, subkollektionen = color columns
function buildMatrix(byKollektion, kollektion) {
  const kcells = byKollektion[kollektion] || [];
  const subkolOrder = [];
  const subkolSeen = new Set();
  kcells.forEach(c => {
    if (!subkolSeen.has(c.subkollektion)) { subkolSeen.add(c.subkollektion); subkolOrder.push(c.subkollektion); }
  });

  const rowKeySet = new Set(kcells.map(c => `${c.price}|||${c.form}`));
  const rows = [...rowKeySet].map(k => {
    const [priceStr, form] = k.split('|||');
    return { price: Number(priceStr), form };
  }).sort((a, b) => b.price - a.price || a.form.localeCompare(b.form, 'de'));

  const lookup = {};
  kcells.forEach(c => {
    const key = `${c.price}|||${c.form}|||${c.subkollektion}`;
    if (!lookup[key]) lookup[key] = c;
  });

  return { rows, subkollektionen: subkolOrder, lookup };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`bg-champagne-100 rounded-xl animate-shimmer ${className}`} />;
}

// ─── Not Found / Error ────────────────────────────────────────────────────────

function NotFound({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f6] px-6">
      <div className="text-champagne-300 mb-6">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M32 20v14M32 40v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 className="font-display text-2xl text-champagne-800 mb-2">Keine Liste gefunden</h1>
      <p className="text-sm text-champagne-500 text-center max-w-xs">{message || 'Für diesen Kunden wurde keine Restocking-Liste hinterlegt.'}</p>
    </div>
  );
}

// ─── Kollektion Card ──────────────────────────────────────────────────────────

function KollektionCard({ name, preview, onClick, byKollektion }) {
  const img = preview?.image || null;
  const kcells = byKollektion[name] || [];
  const itemCount = kcells.length;
  const styles = new Set(kcells.map(c => c.form)).size;
  const colors = new Set(kcells.map(c => c.subkollektion)).size;

  return (
    <div className="group relative rounded-2xl overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer bg-white border border-champagne-100/80 hover:border-champagne-300/60">
      <button onClick={() => onClick(name)} className="text-left w-full active:scale-[0.98] transition-transform duration-200">
        <div className="overflow-hidden aspect-square w-full bg-champagne-50 relative">
          {img ? (
            <img src={img} alt={name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-champagne-200">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 30l10-8 8 6 6-5 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        <div className="px-3.5 py-3">
          <p className="font-display text-base text-champagne-800 leading-snug tracking-wide">{name}</p>
          {itemCount > 0 && (
            <p className="text-[9px] text-champagne-400 leading-tight mt-0.5 font-medium tracking-wide">
              {itemCount} Artikel &middot; {styles} Form{styles !== 1 ? 'en' : ''} &middot; {colors} Farb{colors !== 1 ? 'en' : 'e'}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── Image Cell ───────────────────────────────────────────────────────────────

function ImageCell({ cell }) {
  const img = cell?.imageId ? imgUrl(cell.imageId, 600) : null;

  if (!cell) {
    return <div className="w-full bg-champagne-50/40 rounded-xl border border-champagne-100/50" style={{ aspectRatio: '1' }} />;
  }

  const price = fmtPrice(cell.price);

  return (
    <div className="relative group">
      <a
        href={goUrl(cell.sku)}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full overflow-hidden bg-champagne-50/50 rounded-xl border-2 border-champagne-100/60 hover:border-champagne-300 hover:shadow-lg transition-all duration-300 active:scale-[0.97]"
        style={{ aspectRatio: '1' }}
        title={`${cell.form} · ${cell.subkollektion}${price ? ` · ${price}` : ''}`}
      >
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-champagne-200">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 16l5-4 4 3 3-2.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </a>

      {price && (
        <div className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-sm text-champagne-800 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm border border-champagne-200/50">
          {price}
        </div>
      )}
    </div>
  );
}

// ─── Kollektion View ──────────────────────────────────────────────────────────

const CELL_SIZES = [120, 150, 180, 220, 260];

function KollektionView({ kollektion, onBack, catalog, kundeName }) {
  const [sizeIdx, setSizeIdx] = useState(2);
  const [viewMode, setViewMode] = useState('tabelle');

  const { rows, subkollektionen, lookup } = buildMatrix(catalog.byKollektion, kollektion);
  const allCells = catalog.byKollektion[kollektion] || [];
  const CELL_W = CELL_SIZES[sizeIdx];
  const LABEL_W = 130;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="sticky top-0 z-40 glass border-b border-champagne-200/40 px-5 py-3.5 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-champagne-500 hover:text-champagne-700 transition-colors text-xs font-semibold shrink-0 group">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Übersicht
        </button>
        <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, transparent, #d4c9b8, transparent)' }} />
        <h1 className="font-display text-base text-champagne-800 truncate tracking-wide">{kollektion}</h1>
        <div className="ml-auto flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex items-center bg-champagne-50 rounded-xl border border-champagne-200/60 overflow-hidden mr-1">
            <button onClick={() => setViewMode('tabelle')} title="Matrix"
              className={`p-1.5 transition-all ${viewMode === 'tabelle' ? 'bg-champagne-700 text-white' : 'text-champagne-400 hover:text-champagne-600'}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/>
              </svg>
            </button>
            <button onClick={() => setViewMode('fliessend')} title="Fließend"
              className={`p-1.5 transition-all ${viewMode === 'fliessend' ? 'bg-champagne-700 text-white' : 'text-champagne-400 hover:text-champagne-600'}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="3" x2="15" y2="3"/><line x1="1" y1="7" x2="15" y2="7"/><line x1="1" y1="11" x2="10" y2="11"/>
              </svg>
            </button>
          </div>
          {/* Size controls */}
          <div className="flex items-center bg-champagne-50 rounded-xl border border-champagne-200/60 overflow-hidden">
            <button onClick={() => setSizeIdx(i => Math.max(0, i - 1))} disabled={sizeIdx === 0}
              className="p-1.5 text-champagne-400 hover:text-champagne-700 disabled:opacity-30 transition-all" title="Kleiner">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="11" y2="7"/></svg>
            </button>
            <button onClick={() => setSizeIdx(i => Math.min(CELL_SIZES.length - 1, i + 1))} disabled={sizeIdx === CELL_SIZES.length - 1}
              className="p-1.5 text-champagne-400 hover:text-champagne-700 disabled:opacity-30 transition-all" title="Größer">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="3" x2="7" y2="11"/><line x1="3" y1="7" x2="11" y2="7"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {viewMode === 'fliessend' ? (
          // Flow view: simple responsive grid
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CELL_W}px, 1fr))` }}>
            {allCells.map(cell => (
              <div key={cell.sku}>
                <ImageCell cell={cell} />
                <div className="mt-1.5 px-0.5">
                  <p className="text-[10px] font-semibold text-champagne-700 truncate">{cell.form}</p>
                  <p className="text-[10px] text-champagne-500 truncate">{cell.subkollektion}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Matrix view: rows = form/price, columns = subkollektion
          <div className="table-container">
            <div style={{ minWidth: LABEL_W + subkollektionen.length * (CELL_W + 6) }}>
              {/* Header row */}
              <div className="flex items-end gap-1.5 mb-2 pb-2 border-b border-champagne-200/60 sticky top-0 bg-[#faf9f6] z-10">
                <div style={{ width: LABEL_W, minWidth: LABEL_W }} />
                {subkollektionen.map(sub => (
                  <div key={sub} style={{ width: CELL_W, minWidth: CELL_W }}
                    className="text-[9px] font-semibold text-champagne-500 tracking-wide truncate text-center pb-1">
                    {sub}
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {rows.map(row => {
                const rowKey = `${row.price}|||${row.form}`;
                return (
                  <div key={rowKey} className="flex items-center gap-1.5 mb-1.5">
                    <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="pr-3">
                      <p className="text-[10px] font-semibold text-champagne-700 truncate">{row.form}</p>
                      {row.price > 0 && (
                        <p className="text-[9px] text-champagne-400">{fmtPrice(row.price)}</p>
                      )}
                    </div>
                    {subkollektionen.map(sub => {
                      const cell = lookup[`${row.price}|||${row.form}|||${sub}`] || null;
                      return (
                        <div key={sub} style={{ width: CELL_W, minWidth: CELL_W }}>
                          <ImageCell cell={cell} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Collection Overview ──────────────────────────────────────────────────────

function CollectionOverview({ catalog, kundeName, geaendert, onSelect }) {
  const date = geaendert ? new Date(geaendert).toLocaleDateString('de-DE') : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] text-champagne-400 uppercase mb-0.5">myKONPLOTT</p>
            <h1 className="font-display text-xl text-champagne-800 tracking-wide">{kundeName}</h1>
            {date && <p className="text-[10px] text-champagne-400 mt-0.5">Aktualisiert {date}</p>}
          </div>
          <div className="text-champagne-300">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1"/>
              <path d="M20 12c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" stroke="currentColor" strokeWidth="1"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
            </svg>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-xs text-champagne-500 mb-6">
          {catalog.kollektionen.length} Kollektion{catalog.kollektionen.length !== 1 ? 'en' : ''} &middot; {catalog.cells.length} Artikel
        </p>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {catalog.kollektionen.map(k => (
            <KollektionCard
              key={k}
              name={k}
              preview={catalog.kollektionPreviews[k]}
              onClick={onSelect}
              byKollektion={catalog.byKollektion}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-6 w-48" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-champagne-100">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-3">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [kundeName, setKundeName] = useState('');
  const [geaendert, setGeaendert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKollektion, setSelectedKollektion] = useState(null);

  // Extract kundeId from URL path: /restocking/{kundeId}
  const kundeId = (() => {
    const m = window.location.pathname.match(/\/restocking\/([^/]+)/);
    return m ? m[1] : null;
  })();

  useEffect(() => {
    if (!kundeId) {
      setError('Keine Kunden-ID in der URL gefunden. Erwartet: /restocking/{kundeId}');
      setLoading(false);
      return;
    }

    const url = `${KONAGENT_URL}/api/public/restocking/${kundeId}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : `HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setKundeName(data.kundeName || kundeId);
        setGeaendert(data.geaendert);
        setCatalog(buildCatalog(data.artikel || []));
        setLoading(false);
      })
      .catch(e => {
        setError(e.message === 'not_found' ? null : e.message);
        setLoading(false);
      });
  }, [kundeId]);

  if (loading) return <LoadingScreen />;
  if (!catalog || error) return <NotFound message={error} />;

  if (selectedKollektion) {
    return (
      <KollektionView
        kollektion={selectedKollektion}
        onBack={() => setSelectedKollektion(null)}
        catalog={catalog}
        kundeName={kundeName}
      />
    );
  }

  return (
    <CollectionOverview
      catalog={catalog}
      kundeName={kundeName}
      geaendert={geaendert}
      onSelect={setSelectedKollektion}
    />
  );
}
