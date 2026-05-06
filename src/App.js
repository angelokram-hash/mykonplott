// myKONPLOTT – Restocking viewer
import { useState, useEffect } from 'react';

const KONAGENT_URL = process.env.REACT_APP_KONAGENT_URL || 'https://kon-agent.vercel.app';
const CDN_BASE = 'https://konplott-cdn.com/mytism/image';

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

  const kollOrder = [];
  const kollSeen = new Set();
  cells.forEach(c => {
    if (!kollSeen.has(c.kollektion)) { kollSeen.add(c.kollektion); kollOrder.push(c.kollektion); }
  });
  kollOrder.sort((a, b) => a.localeCompare(b, 'de'));

  const byKollektion = {};
  kollOrder.forEach(k => { byKollektion[k] = []; });
  cells.forEach(c => { byKollektion[c.kollektion].push(c); });

  Object.values(byKollektion).forEach(arr => {
    arr.sort((a, b) => {
      const sc = a.subkollektion.localeCompare(b.subkollektion, 'de');
      if (sc !== 0) return sc;
      return b.price - a.price;
    });
  });

  const kollektionPreviews = {};
  kollOrder.forEach(k => {
    const first = byKollektion[k].find(c => c.imageId);
    if (first) kollektionPreviews[k] = { image: imgUrl(first.imageId, 600) };
  });

  return { kollektionen: kollOrder, byKollektion, kollektionPreviews, cells };
}

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

function Skeleton({ className }) {
  return <div className={`bg-champagne-100 rounded-xl animate-shimmer ${className}`} />;
}

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

// ─── Variants Modal ──────────────────────────────────────────────────────────

function VariantsModal({ cell, allCells, onClose, onAddCart }) {
  const [variants, setVariants] = useState([]);
  const [loaded, setLoaded] = useState(10);

  useEffect(() => {
    if (!cell) return;
    const matches = allCells.filter(c =>
      c.kollektion === cell.kollektion &&
      c.subkollektion !== cell.subkollektion &&
      c.form === cell.form &&
      c.sku !== cell.sku
    );
    setVariants(matches);
  }, [cell, allCells]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-champagne-200/40 px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-display text-lg text-champagne-800">Varianten</h2>
          <button onClick={onClose} className="text-champagne-400 hover:text-champagne-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid gap-2">
            {variants.slice(0, loaded).map(v => (
              <div key={v.sku} className="flex gap-3 p-3 bg-champagne-50 hover:bg-champagne-100 rounded-lg border border-champagne-200/40 transition-all">
                <a
                  href={goUrl(v.sku)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex gap-3"
                >
                  {v.imageId && (
                    <img src={imgUrl(v.imageId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-champagne-800 text-sm">{v.form}</p>
                    <p className="text-xs text-champagne-600">{v.subkollektion}</p>
                    <p className="text-sm font-bold text-champagne-700 mt-1">{fmtPrice(v.price)}</p>
                  </div>
                </a>
                <button
                  onClick={() => onAddCart(v)}
                  className="px-2 py-1 rounded text-xs font-semibold text-champagne-700 bg-champagne-100 hover:bg-champagne-200 transition-colors whitespace-nowrap self-center"
                  title="In den Warenkorb"
                >
                  + Korb
                </button>
              </div>
            ))}
          </div>

          {loaded < variants.length && (
            <button
              onClick={() => setLoaded(l => l + 10)}
              className="w-full mt-4 px-4 py-2 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm"
            >
              {variants.length - loaded} weitere Varianten laden
            </button>
          )}

          {variants.length === 0 && (
            <p className="text-center text-champagne-500 text-sm py-6">Keine Varianten gefunden</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Set Complements Modal ──────────────────────────────────────────────────

function SetComplementsModal({ cell, allCells, onClose, onAddCart }) {
  const [complements, setComplements] = useState([]);
  const [loaded, setLoaded] = useState(10);

  useEffect(() => {
    if (!cell) return;
    const matches = allCells.filter(c =>
      c.kollektion === cell.kollektion &&
      c.subkollektion === cell.subkollektion &&
      c.form !== cell.form &&
      c.sku !== cell.sku
    );
    setComplements(matches);
  }, [cell, allCells]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-champagne-200/40 px-5 py-3.5 flex items-center justify-between">
          <h2 className="font-display text-lg text-champagne-800">Setergänzung</h2>
          <button onClick={onClose} className="text-champagne-400 hover:text-champagne-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid gap-2">
            {complements.slice(0, loaded).map(c => (
              <div key={c.sku} className="flex gap-3 p-3 bg-champagne-50 hover:bg-champagne-100 rounded-lg border border-champagne-200/40 transition-all">
                <a
                  href={goUrl(c.sku)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex gap-3"
                >
                  {c.imageId && (
                    <img src={imgUrl(c.imageId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-champagne-800 text-sm">{c.kollektion}</p>
                    <p className="text-xs text-champagne-600">{c.form} · {c.subkollektion}</p>
                    <p className="text-sm font-bold text-champagne-700 mt-1">{fmtPrice(c.price)}</p>
                  </div>
                </a>
                <button
                  onClick={() => onAddCart(c)}
                  className="px-2 py-1 rounded text-xs font-semibold text-champagne-700 bg-champagne-100 hover:bg-champagne-200 transition-colors whitespace-nowrap self-center"
                  title="In den Warenkorb"
                >
                  + Korb
                </button>
              </div>
            ))}
          </div>

          {loaded < complements.length && (
            <button
              onClick={() => setLoaded(l => l + 10)}
              className="w-full mt-4 px-4 py-2 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm"
            >
              {complements.length - loaded} weitere Artikel laden
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart View Modal ────────────────────────────────────────────────────────

function CartView({ cartItems, onClose, vertreterKontakt, kundeName }) {
  if (cartItems.length === 0) {
    return null;
  }

  const handleWhatsApp = () => {
    if (!vertreterKontakt?.whatsapp) return;

    const message = `Hallo ${vertreterKontakt.name},\n\nanbei meine Restocking-Selektion:\n\n${cartItems.map(item => `${item.qty}x | ${item.sku} | ${item.form}`).join('\n')}\n\nLiebe Grüße`;
    const waLink = `https://wa.me/${vertreterKontakt.whatsapp.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  const handleEmail = () => {
    if (!vertreterKontakt?.email) return;

    const subject = `Restocking-Selektion von ${kundeName}`;
    const body = `Hallo ${vertreterKontakt.name},\n\nanbei meine Restocking-Selektion:\n\n${cartItems.map(item => `${item.qty}x | ${item.sku} | ${item.form}`).join('\n')}\n\nLiebe Grüße`;
    const mailLink = `mailto:${vertreterKontakt.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailLink;
  };

  const handleCopy = () => {
    const text = cartItems.map(item => `${item.qty}x | ${item.sku} | ${item.form}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExportCSV = () => {
    const csv = ['SKU,Form,Menge'].concat(cartItems.map(item => `${item.sku},${item.form},${item.qty}`)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restocking-${kundeName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-champagne-200/40 px-5 py-3.5 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="font-display text-lg text-champagne-800">Meine Selektion</h2>
            <p className="text-xs text-champagne-500 mt-0.5">{totalItems} Artikel · {cartItems.length} Stile</p>
          </div>
          {vertreterKontakt?.bild && (
            <img src={vertreterKontakt.bild} alt={vertreterKontakt.name} className="w-10 h-10 rounded-full object-cover mr-3" />
          )}
          <button onClick={onClose} className="text-champagne-400 hover:text-champagne-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid gap-2 mb-4">
            {cartItems.map(item => (
              <div key={item.sku} className="flex gap-2 p-3 bg-champagne-50 rounded-lg border border-champagne-200/40">
                <div className="flex-1">
                  <p className="font-semibold text-champagne-800 text-sm">{item.form}</p>
                  <p className="text-xs text-champagne-600">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-champagne-700 text-sm">{item.qty}x</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-champagne-200/40 p-4 space-y-2">
          {vertreterKontakt && (
            <>
              <button
                onClick={handleWhatsApp}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.94 1.298c-.504.282-.973.664-1.364 1.118l-1.852-1.852a1.375 1.375 0 10-1.946 1.946l1.852 1.852c-.454.391-.836.86-1.118 1.364a9.87 9.87 0 001.298 4.94 9.87 9.87 0 008.23 4.858c1.67 0 3.27-.417 4.67-1.15l1.852 1.852a1.375 1.375 0 101.946-1.946l-1.852-1.852c.454-.391.836-.86 1.118-1.364a9.87 9.87 0 00-1.298-4.94 9.87 9.87 0 00-8.23-4.858z"/>
                </svg>
                WhatsApp an {vertreterKontakt.name}
              </button>
              {vertreterKontakt.email && (
                <button
                  onClick={handleEmail}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-10 5L2 7"/>
                  </svg>
                  Email an {vertreterKontakt.name}
                </button>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-2 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm font-semibold transition-all"
            >
              Kopieren
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 px-4 py-2 bg-champagne-200 text-champagne-800 rounded-lg hover:bg-champagne-300 text-sm font-semibold transition-all"
            >
              CSV Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image Cell with Buttons ─────────────────────────────────────────────────

function ImageCell({ cell, allCells, onAddCart, cartOpen }) {
  const img = cell?.imageId ? imgUrl(cell.imageId, 600) : null;
  const [showVariants, setShowVariants] = useState(false);
  const [showComplements, setShowComplements] = useState(false);

  if (!cell) {
    return <div className="w-full bg-champagne-50/40 rounded-xl border border-champagne-100/50" style={{ aspectRatio: '1' }} />;
  }

  const price = fmtPrice(cell.price);

  return (
    <>
      <div className="relative group">
        <a
          href={goUrl(cell.sku)}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full overflow-hidden bg-champagne-50/50 rounded-xl border-2 border-champagne-100/60 hover:border-champagne-300 hover:shadow-lg transition-all duration-300 active:scale-[0.97]"
          style={{ aspectRatio: '1' }}
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

      {/* Buttons below */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        <button
          onClick={() => setShowVariants(true)}
          className="flex-1 min-w-[55px] px-2 py-1 text-[11px] font-medium text-champagne-700 bg-champagne-100/80 rounded-md hover:bg-champagne-150 transition-colors"
        >
          Variante
        </button>
        <button
          onClick={() => setShowComplements(true)}
          className="flex-1 min-w-[55px] px-2 py-1 text-[11px] font-medium text-champagne-700 bg-champagne-100/80 rounded-md hover:bg-champagne-150 transition-colors"
        >
          Seterg.
        </button>
        <button
          onClick={() => onAddCart(cell)}
          className="flex-1 min-w-[65px] px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-100/80 rounded-md hover:bg-amber-150 transition-colors"
        >
          🛒 Korb
        </button>
      </div>

      {showVariants && <VariantsModal cell={cell} allCells={allCells} onClose={() => setShowVariants(false)} onAddCart={onAddCart} />}
      {showComplements && <SetComplementsModal cell={cell} allCells={allCells} onClose={() => setShowComplements(false)} onAddCart={onAddCart} />}
    </>
  );
}

// ─── Kollektion View ──────────────────────────────────────────────────────────

const CELL_SIZES = [120, 150, 180, 220, 260];

function KollektionView({ kollektion, onBack, catalog, kundeName, cart, onAddCart, cartOpen, onCartOpen, onCartClose, vertreterKontakt }) {
  const [sizeIdx, setSizeIdx] = useState(2);
  const [viewMode, setViewMode] = useState('fliessend');

  const { rows, subkollektionen, lookup } = buildMatrix(catalog.byKollektion, kollektion);
  const allCells = catalog.cells;
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
          {cart.length > 0 && (
            <button
              onClick={onCartOpen}
              className="relative px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs font-semibold transition-all"
            >
              🛒 {cart.length}
            </button>
          )}
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
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CELL_W}px, 1fr))` }}>
            {catalog.byKollektion[kollektion]?.map(cell => (
              <div key={cell.sku}>
                <ImageCell cell={cell} allCells={allCells} onAddCart={onAddCart} cartOpen={cartOpen} />
                <div className="mt-1.5 px-0.5">
                  <p className="text-[10px] font-semibold text-champagne-700 truncate">{cell.form}</p>
                  <p className="text-[10px] text-champagne-500 truncate">{cell.subkollektion}</p>
                </div>
              </div>
            )) || []}
          </div>
        ) : (
          <div className="table-container">
            <div style={{ minWidth: LABEL_W + subkollektionen.length * (CELL_W + 6) }}>
              <div className="flex items-end gap-1.5 mb-2 pb-2 border-b border-champagne-200/60 sticky top-0 bg-[#faf9f6] z-10">
                <div style={{ width: LABEL_W, minWidth: LABEL_W }} />
                {subkollektionen.map(sub => (
                  <div key={sub} style={{ width: CELL_W, minWidth: CELL_W }}
                    className="text-[9px] font-semibold text-champagne-500 tracking-wide truncate text-center pb-1">
                    {sub}
                  </div>
                ))}
              </div>
              {rows.map(row => {
                const rowKey = `${row.price}|||${row.form}`;
                return (
                  <div key={rowKey} className="flex items-start gap-1.5 mb-1.5">
                    <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="pr-3 pt-1">
                      <p className="text-[10px] font-semibold text-champagne-700 truncate">{row.form}</p>
                      {row.price > 0 && (
                        <p className="text-[9px] text-champagne-400">{fmtPrice(row.price)}</p>
                      )}
                    </div>
                    {subkollektionen.map(sub => {
                      const cell = lookup[`${row.price}|||${row.form}|||${sub}`] || null;
                      return (
                        <div key={sub} style={{ width: CELL_W, minWidth: CELL_W }}>
                          <ImageCell cell={cell} allCells={allCells} onAddCart={onAddCart} cartOpen={cartOpen} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {cartOpen && <CartView cartItems={cart} onClose={onCartClose} vertreterKontakt={vertreterKontakt} kundeName={kundeName} />}
      </main>
    </div>
  );
}

// ─── Collection Overview ──────────────────────────────────────────────────────

function KollektionCard({ name, preview, onClick, byKollektion }) {
  const kcells = byKollektion[name] || [];
  const itemCount = kcells.length;
  const styles = new Set(kcells.map(c => c.form)).size;
  const colors = new Set(kcells.map(c => c.subkollektion)).size;

  return (
    <div className="group relative rounded-2xl overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer bg-white border border-champagne-100/80 hover:border-champagne-300/60">
      <button onClick={() => onClick(name)} className="text-left w-full active:scale-[0.98] transition-transform duration-200">
        <div className="overflow-hidden aspect-square w-full bg-champagne-50 relative">
          {preview?.image ? (
            <img src={preview.image} alt={name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
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

function CollectionOverview({ catalog, kundeName, geaendert, onSelect, vertreterKontakt }) {
  const date = geaendert ? new Date(geaendert).toLocaleDateString('de-DE') : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-champagne-400 uppercase mb-0.5">myKONPLOTT</p>
            <h1 className="font-display text-xl text-champagne-800 tracking-wide">{kundeName}</h1>
            {date && <p className="text-[10px] text-champagne-400 mt-0.5">Aktualisiert {date}</p>}
          </div>
          {vertreterKontakt && (
            <div className="text-right flex items-center gap-3">
              {vertreterKontakt.bild && (
                <img src={vertreterKontakt.bild} alt={vertreterKontakt.name} className="w-10 h-10 rounded-full object-cover" />
              )}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-champagne-400 uppercase mb-0.5">Ihr Vertreter</p>
                <p className="text-sm text-champagne-800 font-medium">{vertreterKontakt.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {vertreterKontakt.whatsapp && (
                    <a href={`https://wa.me/${vertreterKontakt.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-champagne-600 hover:text-green-600 transition" title="WhatsApp">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.968 1.495c-1.529.88-2.773 2.114-3.557 3.635-.779 1.524-1.188 3.199-1.188 4.905 0 1.339.209 2.647.616 3.897l.964-3.523c-.151-1.073-.23-2.18-.23-3.374 0-1.442.369-2.842 1.055-4.045.687-1.203 1.64-2.214 2.802-2.92 1.162-.707 2.485-1.08 3.85-1.08h.004c1.362 0 2.685.373 3.847 1.08 1.162.706 2.115 1.717 2.802 2.92.686 1.203 1.055 2.603 1.055 4.045 0 1.194-.079 2.301-.23 3.374l.964 3.523c.407-1.25.616-2.558.616-3.897 0-1.706-.409-3.381-1.188-4.905-.784-1.521-2.028-2.755-3.557-3.635a9.87 9.87 0 00-4.968-1.495"/>
                      </svg>
                    </a>
                  )}
                  {vertreterKontakt.email && (
                    <a href={`mailto:${vertreterKontakt.email}`} className="text-champagne-600 hover:text-blue-600 transition" title="Email">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-10 5L2 7"/>
                      </svg>
                    </a>
                  )}
                  {vertreterKontakt.telefon && (
                    <a href={`tel:${vertreterKontakt.telefon.replace(/\s/g, '')}`} className="text-champagne-600 hover:text-orange-600 transition" title="Telefon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
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

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [kundeName, setKundeName] = useState('');
  const [geaendert, setGeaendert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKollektion, setSelectedKollektion] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [vertreterKontakt, setVertreterKontakt] = useState(null);
  const [vertreterName, setVertreterName] = useState('');

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

    const url = `${KONAGENT_URL}/api/public/restocking/${kundeId}?t=${Date.now()}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : `HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setKundeName(data.kundeName || kundeId);
        setGeaendert(data.geaendert);
        setVertreterName(data.vertreterName || '');
        setCatalog(buildCatalog(data.artikel || []));
        setLoading(false);
      })
      .catch(e => {
        setError(e.message === 'not_found' ? null : e.message);
        setLoading(false);
      });
  }, [kundeId]);

  // Fetch vertreter kontakte from KonAgent public API
  useEffect(() => {
    const fetchVertreter = async () => {
      try {
        const res = await fetch(`${KONAGENT_URL}/api/public/vertreter`);
        if (!res.ok) return;
        const kontakte = await res.json();
        // Find vertreter matching customer's vertreterName (case-insensitive)
        const vertreter = kontakte.find(k => k.gebiet.toLowerCase() === vertreterName.toLowerCase());
        if (vertreter) {
          setVertreterKontakt(vertreter);
        }
      } catch (e) {
        console.warn('Failed to fetch vertreter:', e);
      }
    };

    if (vertreterName) {
      fetchVertreter();
    }
  }, [vertreterName]);

  const handleAddCart = (cell) => {
    setCart(prev => {
      const existing = prev.find(item => item.sku === cell.sku);
      if (existing) {
        return prev.map(item =>
          item.sku === cell.sku ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { sku: cell.sku, form: cell.form, qty: 1 }];
    });
    setCartOpen(true);
  };

  if (loading) return <LoadingScreen />;
  if (!catalog || error) return <NotFound message={error} />;

  if (selectedKollektion) {
    return (
      <KollektionView
        kollektion={selectedKollektion}
        onBack={() => setSelectedKollektion(null)}
        catalog={catalog}
        kundeName={kundeName}
        cart={cart}
        onAddCart={handleAddCart}
        cartOpen={cartOpen}
        onCartOpen={() => setCartOpen(true)}
        onCartClose={() => setCartOpen(false)}
        vertreterKontakt={vertreterKontakt}
      />
    );
  }

  return (
    <CollectionOverview
      catalog={catalog}
      kundeName={kundeName}
      geaendert={geaendert}
      onSelect={setSelectedKollektion}
      vertreterKontakt={vertreterKontakt}
    />
  );
}
