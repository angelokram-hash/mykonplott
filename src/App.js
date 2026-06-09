// myKONPLOTT – Restocking viewer
import { useState, useEffect, useRef, useMemo } from 'react';

const KONAGENT_URL = process.env.REACT_APP_KONAGENT_URL || 'https://kon-agent.vercel.app';
const CDN_BASE = 'https://konplott-cdn.com/mytism/image';

// ─── PIN Screen ─────────────────────────────────────────────────────────────

function PinScreen({ kundeId, onSuccess }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [checking, setChecking] = useState(false);
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);

  // Auto-trigger restocking list creation in background while PIN is shown
  useEffect(() => {
    fetch(`${KONAGENT_URL}/api/public/restocking-trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kundeId }),
    }).catch(() => {}); // fire-and-forget
  }, [kundeId]);

  useEffect(() => { ref0.current?.focus(); }, []);

  const getRefs = () => [ref0, ref1, ref2, ref3];

  const verifyPin = (fullPin) => {
    setChecking(true);
    fetch(`${KONAGENT_URL}/api/public/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kundeId, pin: fullPin }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          sessionStorage.setItem(`pin_${kundeId}`, 'ok');
          onSuccess();
        } else {
          setPinError('Falscher PIN');
          setPin(['', '', '', '']);
          ref0.current?.focus();
        }
      })
      .catch(() => {
        setPinError('Verbindungsfehler');
        setPin(['', '', '', '']);
        ref0.current?.focus();
      })
      .finally(() => setChecking(false));
  };

  const handleChange = (idx, value) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newPin = [...pin];
    newPin[idx] = digit;
    setPin(newPin);
    setPinError('');
    const allRefs = getRefs();
    if (digit && idx < 3) allRefs[idx + 1].current?.focus();
    if (digit && idx === 3 && newPin.join('').length === 4) verifyPin(newPin.join(''));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      getRefs()[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 0) return;
    const newPin = ['', '', '', ''];
    for (let i = 0; i < digits.length; i++) newPin[i] = digits[i];
    setPin(newPin);
    setPinError('');
    const allRefs = getRefs();
    if (digits.length < 4) {
      allRefs[digits.length].current?.focus();
    } else {
      allRefs[3].current?.focus();
      verifyPin(newPin.join(''));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#faf9f6]">
      <div className="text-center px-6">
        <img src="/konplott-logo-oval.svg" alt="KONPLOTT" className="w-16 h-auto mx-auto mb-4 opacity-80" />
        <img src="/konplott-wordmark.svg" alt="KONPLOTT" className="h-4 mx-auto mb-6 opacity-50" />
        <div className="w-8 mx-auto border-t border-champagne-300/50 mb-6" />
        <h1 className="font-display text-2xl text-champagne-800 tracking-wide mb-8">PIN</h1>
        <div className="flex justify-center gap-3 mb-6">
          {pin.map((d, i) => (
            <input
              key={i}
              ref={getRefs()[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={checking}
              className="w-16 h-20 text-center text-3xl font-display text-champagne-800 bg-white border-2 border-champagne-200 rounded-xl focus:border-champagne-500 focus:ring-2 focus:ring-champagne-200 outline-none transition-all"
            />
          ))}
        </div>
        {pinError && <p className="text-red-500 text-sm font-medium">{pinError}</p>}
        {checking && <p className="text-champagne-500 text-sm">Wird geprüft...</p>}
      </div>
    </div>
  );
}

function imgUrl(id, size) {
  if (!id) return null;
  return `${CDN_BASE}/${id}/${id}.jpg?width=${size}&height=${size}&box=true`;
}

// function goUrl(ean) {
//   return `https://www.konplott.com/go/${ean}`;
// }

// Anzeige-Währung der aktuellen Kunden-Preisliste (modulweit; pro Seitenaufruf 1 Kunde/1 Währung).
// Wird beim Laden der Daten aus der API-Antwort (data.waehrung) gesetzt. Default: EUR.
let DISPLAY_CURRENCY = { iso: 'EUR', locale: 'de-DE' };
function setDisplayCurrency(waehrung) {
  const iso = (waehrung && waehrung.isoCode) || 'EUR';
  DISPLAY_CURRENCY = { iso, locale: iso === 'USD' ? 'en-US' : 'de-DE' };
}

function fmtPrice(v) {
  if (v == null || v === 0) return null;
  try {
    return 'VK ' + new Intl.NumberFormat(DISPLAY_CURRENCY.locale, { style: 'currency', currency: DISPLAY_CURRENCY.iso }).format(v);
  } catch {
    return 'VK ' + v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
}

// Geldbetrag ohne „VK"-Präfix (für Summen).
function fmtMoney(v) {
  const n = Number(v) || 0;
  try {
    return new Intl.NumberFormat(DISPLAY_CURRENCY.locale, { style: 'currency', currency: DISPLAY_CURRENCY.iso }).format(n);
  } catch {
    return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }
}
// Summe (Anzahl × Preis) über eine Zellen-Liste.
function summeCells(cells) {
  return (cells || []).reduce((s, c) => s + (Number(c.bestand) || 0) * (Number(c.price) || 0), 0);
}

function buildCatalog(artikel) {
  // Deduplicate by EAN — keep first occurrence
  const seenEan = new Set();
  const deduped = artikel.filter(a => {
    if (seenEan.has(a.ean)) return false;
    seenEan.add(a.ean);
    return true;
  });

  const cells = deduped.map(a => ({
    sku: a.ean,
    kollektion: (a.kollektionsName || '—').trim(),
    form: (a.formName || a.bezeichnung || '—').trim(),
    subkollektion: (a.subKollektionsName || '—').trim(),
    bezeichnung: a.bezeichnung || '',
    price: a.verkaufspreiBrutto,
    bestand: Number(a.bestand) || 0,
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
  const kollektionTopPreviews = {}; // Vorschaubild = teuerster Artikel der Kollektion (für Katalog)
  kollOrder.forEach(k => {
    const first = byKollektion[k].find(c => c.imageId);
    if (first) kollektionPreviews[k] = { image: imgUrl(first.imageId, 600) };
    const withImg = byKollektion[k].filter(c => c.imageId);
    if (withImg.length) {
      const top = withImg.reduce((a, b) => ((b.price || 0) > (a.price || 0) ? b : a));
      kollektionTopPreviews[k] = { image: imgUrl(top.imageId, 600) };
    }
  });

  return { kollektionen: kollOrder, byKollektion, kollektionPreviews, kollektionTopPreviews, cells };
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

function VariantsModal({ cell, allCells, onClose, onAddCart, cart, onSetQty, allowStock = true, lager }) {
  const [variants, setVariants] = useState([]);
  const [loaded, setLoaded] = useState(10);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    if (!cell) return;
    const matches = allCells.filter(c =>
      c.kollektion === cell.kollektion &&
      c.subkollektion !== cell.subkollektion &&
      c.form === cell.form &&
      c.sku !== cell.sku
    );
    setVariants(matches);
    setStockItems([]);
    setStockLoaded(false);
    setStockError('');
  }, [cell, allCells]);

  const loadStock = async () => {
    if (!cell) return;
    setStockLoading(true);
    setStockError('');
    try {
      const existingEans = [cell.sku, ...variants.map(v => v.sku)];
      const res = await fetch(`${KONAGENT_URL}/api/public/stock-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kollektion: cell.kollektion,
          form: cell.form,
          exclude: existingEans,
          ...(lager ? { lager } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Fehler ${res.status}`);
      const data = await res.json();
      setStockItems(data.items || []);
      setStockLoaded(true);
    } catch (e) {
      setStockError(e.message || 'Stock-Abfrage fehlgeschlagen');
    } finally {
      setStockLoading(false);
    }
  };

  const addStockItem = (item) => {
    onAddCart({
      sku: item.ean,
      kollektion: item.kollektion,
      form: item.form,
      subkollektion: item.subKollektion,
      price: item.richtpreis,
      imageId: item.vorschaubildId,
      fromStock: true,
    });
  };

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
            {variants.slice(0, loaded).map(v => {
              const inCart = cart?.find(item => item.sku === v.sku);
              return (
              <div key={v.sku} className="flex gap-3 p-3 bg-champagne-50 hover:bg-champagne-100 rounded-lg border border-champagne-200/40 transition-all">
                <button
                  onClick={() => onAddCart(v)}
                  className="flex-1 flex gap-3 text-left cursor-pointer"
                >
                  {v.imageId && (
                    <img src={imgUrl(v.imageId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-champagne-800 text-sm">{v.form}</p>
                    <p className="text-xs text-champagne-600">{v.subkollektion}</p>
                    <p className="text-[10px] text-champagne-400 font-mono mt-0.5">{v.sku}</p>
                    <p className="text-sm font-bold text-champagne-700 mt-1">{fmtPrice(v.price)}</p>
                  </div>
                </button>
                {inCart ? (
                  <div className="flex items-center gap-1 self-center">
                    <button onClick={() => onSetQty(v.sku, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">−</button>
                    <span className="w-5 text-center font-bold text-champagne-800 text-xs">{inCart.qty}</span>
                    <button onClick={() => onSetQty(v.sku, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddCart(v)}
                    className="px-2 py-1 rounded text-xs font-semibold text-champagne-700 bg-champagne-100 hover:bg-champagne-200 transition-colors whitespace-nowrap self-center"
                  >
                    hinzufügen
                  </button>
                )}
              </div>
              );
            })}
          </div>

          {loaded < variants.length && (
            <button
              onClick={() => setLoaded(l => l + 10)}
              className="w-full mt-4 px-4 py-2 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm"
            >
              {variants.length - loaded} weitere Varianten laden
            </button>
          )}

          {variants.length === 0 && !stockLoaded && (
            <p className="text-center text-champagne-500 text-sm py-6">Keine Varianten in der Liste</p>
          )}

          {/* KONPLOTT Stock section */}
          {allowStock && <div className="mt-4 border-t border-champagne-200/40 pt-4">
            {!stockLoaded && !stockLoading && (
              <button
                onClick={loadStock}
                className="w-full px-4 py-2.5 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                KONPLOTT Stock abfragen
              </button>
            )}

            {stockLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-champagne-500 text-sm">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Stock wird abgefragt...
              </div>
            )}

            {stockError && (
              <p className="text-center text-red-500 text-sm py-2">{stockError}</p>
            )}

            {stockLoaded && stockItems.length > 0 && (
              <>
                <p className="text-xs text-champagne-500 mb-2 font-semibold uppercase tracking-wide">KONPLOTT Stock ({stockItems.length} verfügbar)</p>
                <div className="grid gap-2">
                  {stockItems.map(item => {
                    const inCart = cart?.find(ci => ci.sku === item.ean);
                    return (
                      <div key={item.ean} className="flex gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition-all">
                        <button
                          onClick={() => addStockItem(item)}
                          className="flex-1 flex gap-3 text-left cursor-pointer"
                        >
                          {item.vorschaubildId && (
                            <img src={imgUrl(item.vorschaubildId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-champagne-800 text-sm">{item.form}</p>
                            <p className="text-xs text-champagne-600">{item.subKollektion}</p>
                            <p className="text-[10px] text-champagne-400 font-mono mt-0.5">{item.ean}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {item.richtpreis > 0 && <p className="text-sm font-bold text-champagne-700">{fmtPrice(item.richtpreis)}</p>}
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">sofort lieferbar</span>
                            </div>
                          </div>
                        </button>
                        {inCart ? (
                          <div className="flex items-center gap-1 self-center">
                            <button onClick={() => onSetQty(item.ean, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-200/60 text-emerald-700 hover:bg-emerald-300 text-sm font-bold">−</button>
                            <span className="w-5 text-center font-bold text-champagne-800 text-xs">{inCart.qty}</span>
                            <button onClick={() => onSetQty(item.ean, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-200/60 text-emerald-700 hover:bg-emerald-300 text-sm font-bold">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addStockItem(item)}
                            className="px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors whitespace-nowrap self-center"
                          >
                            hinzufügen
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {stockLoaded && stockItems.length === 0 && (
              <p className="text-center text-champagne-500 text-sm py-2">Keine weiteren Varianten im KONPLOTT Stock</p>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Set Complements Modal ──────────────────────────────────────────────────

function SetComplementsModal({ cell, allCells, onClose, onAddCart, cart, onSetQty, allowStock = true, lager }) {
  const [complements, setComplements] = useState([]);
  const [loaded, setLoaded] = useState(10);
  const [stockItems, setStockItems] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockLoaded, setStockLoaded] = useState(false);
  const [stockError, setStockError] = useState('');

  useEffect(() => {
    if (!cell) return;
    const matches = allCells.filter(c =>
      c.kollektion === cell.kollektion &&
      c.subkollektion === cell.subkollektion &&
      c.form !== cell.form &&
      c.sku !== cell.sku
    );
    setComplements(matches);
    setStockItems([]);
    setStockLoaded(false);
    setStockError('');
  }, [cell, allCells]);

  const loadStock = async () => {
    if (!cell) return;
    setStockLoading(true);
    setStockError('');
    try {
      const existingEans = [cell.sku, ...complements.map(c => c.sku)];
      const res = await fetch(`${KONAGENT_URL}/api/public/stock-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kollektion: cell.kollektion,
          subKollektion: cell.subkollektion,
          exclude: existingEans,
          ...(lager ? { lager } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Fehler ${res.status}`);
      const data = await res.json();
      setStockItems(data.items || []);
      setStockLoaded(true);
    } catch (e) {
      setStockError(e.message || 'Stock-Abfrage fehlgeschlagen');
    } finally {
      setStockLoading(false);
    }
  };

  const addStockItem = (item) => {
    onAddCart({
      sku: item.ean,
      kollektion: item.kollektion,
      form: item.form,
      subkollektion: item.subKollektion,
      price: item.richtpreis,
      imageId: item.vorschaubildId,
      fromStock: true,
    });
  };

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
            {complements.slice(0, loaded).map(c => {
              const inCart = cart?.find(item => item.sku === c.sku);
              return (
              <div key={c.sku} className="flex gap-3 p-3 bg-champagne-50 hover:bg-champagne-100 rounded-lg border border-champagne-200/40 transition-all">
                <button
                  onClick={() => onAddCart(c)}
                  className="flex-1 flex gap-3 text-left cursor-pointer"
                >
                  {c.imageId && (
                    <img src={imgUrl(c.imageId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-champagne-800 text-sm">{c.kollektion}</p>
                    <p className="text-xs text-champagne-600">{c.form} · {c.subkollektion}</p>
                    <p className="text-[10px] text-champagne-400 font-mono mt-0.5">{c.sku}</p>
                    <p className="text-sm font-bold text-champagne-700 mt-1">{fmtPrice(c.price)}</p>
                  </div>
                </button>
                {inCart ? (
                  <div className="flex items-center gap-1 self-center">
                    <button onClick={() => onSetQty(c.sku, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">−</button>
                    <span className="w-5 text-center font-bold text-champagne-800 text-xs">{inCart.qty}</span>
                    <button onClick={() => onSetQty(c.sku, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddCart(c)}
                    className="px-2 py-1 rounded text-xs font-semibold text-champagne-700 bg-champagne-100 hover:bg-champagne-200 transition-colors whitespace-nowrap self-center"
                  >
                    hinzufügen
                </button>
                )}
              </div>
              );
            })}
          </div>

          {loaded < complements.length && (
            <button
              onClick={() => setLoaded(l => l + 10)}
              className="w-full mt-4 px-4 py-2 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm"
            >
              {complements.length - loaded} weitere Artikel laden
            </button>
          )}

          {/* KONPLOTT Stock section */}
          {allowStock && <div className="mt-4 border-t border-champagne-200/40 pt-4">
            {!stockLoaded && !stockLoading && (
              <button
                onClick={loadStock}
                className="w-full px-4 py-2.5 bg-champagne-700 text-white rounded-lg hover:bg-champagne-800 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                KONPLOTT Stock abfragen
              </button>
            )}

            {stockLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-champagne-500 text-sm">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Stock wird abgefragt...
              </div>
            )}

            {stockError && (
              <p className="text-center text-red-500 text-sm py-2">{stockError}</p>
            )}

            {stockLoaded && stockItems.length > 0 && (
              <>
                <p className="text-xs text-champagne-500 mb-2 font-semibold uppercase tracking-wide">KONPLOTT Stock ({stockItems.length} verfügbar)</p>
                <div className="grid gap-2">
                  {stockItems.map(item => {
                    const inCart = cart?.find(ci => ci.sku === item.ean);
                    return (
                      <div key={item.ean} className="flex gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition-all">
                        <button
                          onClick={() => addStockItem(item)}
                          className="flex-1 flex gap-3 text-left cursor-pointer"
                        >
                          {item.vorschaubildId && (
                            <img src={imgUrl(item.vorschaubildId, 120)} alt="" className="w-20 h-20 object-cover rounded" />
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-champagne-800 text-sm">{item.kollektion}</p>
                            <p className="text-xs text-champagne-600">{item.form} · {item.subKollektion}</p>
                            <p className="text-[10px] text-champagne-400 font-mono mt-0.5">{item.ean}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {item.richtpreis > 0 && <p className="text-sm font-bold text-champagne-700">{fmtPrice(item.richtpreis)}</p>}
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">sofort lieferbar</span>
                            </div>
                          </div>
                        </button>
                        {inCart ? (
                          <div className="flex items-center gap-1 self-center">
                            <button onClick={() => onSetQty(item.ean, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-200/60 text-emerald-700 hover:bg-emerald-300 text-sm font-bold">−</button>
                            <span className="w-5 text-center font-bold text-champagne-800 text-xs">{inCart.qty}</span>
                            <button onClick={() => onSetQty(item.ean, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-200/60 text-emerald-700 hover:bg-emerald-300 text-sm font-bold">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addStockItem(item)}
                            className="px-2 py-1 rounded text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors whitespace-nowrap self-center"
                          >
                            hinzufügen
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {stockLoaded && stockItems.length === 0 && (
              <p className="text-center text-champagne-500 text-sm py-2">Keine weiteren Artikel im KONPLOTT Stock</p>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Cart View Modal ────────────────────────────────────────────────────────

function CartView({ cartItems, onClose, vertreterKontakt, kundeName, kundeId, onSetQty, onRemove, onOrderComplete, allowOrder = true, onSaveList }) {
  const [ordering, setOrdering] = useState(false);
  const [orderConfirm, setOrderConfirm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null); // { id, datum }
  const [orderError, setOrderError] = useState('');
  const [notiz, setNotiz] = useState(''); // Bemerkung zur Bestellung
  // Liste speichern
  const [listName, setListName] = useState('');
  const [savingList, setSavingList] = useState(false);
  const [listSaved, setListSaved] = useState(false);
  const [listError, setListError] = useState('');
  // EANs kopieren
  const [eansCopied, setEansCopied] = useState(false);
  const handleCopyEans = () => {
    const text = cartItems.map(i => i.sku).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setEansCopied(true);
      setTimeout(() => setEansCopied(false), 2000);
    }).catch(() => {});
  };

  const handleSaveListClick = async () => {
    const name = listName.trim();
    if (!name || !onSaveList) return;
    setSavingList(true);
    setListError('');
    try {
      await onSaveList(name);
      setListSaved(true);
      setListName('');
      setTimeout(() => setListSaved(false), 2500);
    } catch (e) {
      setListError(e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSavingList(false);
    }
  };

  if (cartItems.length === 0 && !orderSuccess) {
    return null;
  }

  const selektionText = cartItems.map(item => `${item.qty}x | ${item.sku} | ${item.form}`).join('\n');

  const handleWhatsAppVertreter = () => {
    if (!vertreterKontakt?.whatsapp) return;
    const message = `Hallo ${vertreterKontakt.name},\n\nanbei meine Selektion:\n\n${selektionText}\n\nLiebe Grüße`;
    window.open(`https://wa.me/${vertreterKontakt.whatsapp.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleWhatsApp = () => {
    const message = `Meine KONPLOTT Selektion:\n\n${selektionText}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleEmailVertreter = () => {
    if (!vertreterKontakt?.email) return;
    const subject = `Selektion von ${kundeName}`;
    const body = `Hallo ${vertreterKontakt.name},\n\nanbei meine Selektion:\n\n${selektionText}\n\nLiebe Grüße`;
    window.location.href = `mailto:${vertreterKontakt.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };


  const handleOrder = async () => {
    setOrdering(true);
    setOrderError('');
    try {
      const artikel = cartItems.map(item => ({
        ean: item.sku,
        bezeichnung: item.form,
        formName: item.form,
        menge: item.qty,
        imageId: item.imageId || '',
      }));
      const res = await fetch(`${KONAGENT_URL}/api/public/bestellung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kundeId, kundeName, artikel, notiz: notiz.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Bestellung fehlgeschlagen');
      }
      const data = await res.json();
      setOrderSuccess({ id: data.id, datum: data.datum });
      setOrderConfirm(false);
      if (onOrderComplete) onOrderComplete();
    } catch (e) {
      setOrderError(e.message || 'Fehler beim Bestellen');
    } finally {
      setOrdering(false);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);

  // ── Order Success Screen ──
  if (orderSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h2 className="font-display text-xl text-champagne-800 mb-2">Bestellung gesendet!</h2>
            <p className="text-sm text-champagne-600 mb-4">
              Deine verbindliche Bestellung wurde erfolgreich übermittelt.
            </p>
            <div className="bg-champagne-50 rounded-xl p-4 mb-6 text-left space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-champagne-500">Datum</span>
                <span className="font-semibold text-champagne-800">{orderSuccess.datum}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-champagne-500">Bestellnr.</span>
                <span className="font-mono text-xs text-champagne-700">{orderSuccess.id.slice(0, 8)}…</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-champagne-800 text-white rounded-xl hover:bg-champagne-900 text-sm font-semibold transition-all"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              <div key={item.sku} className="flex gap-2 p-3 bg-champagne-50 rounded-lg border border-champagne-200/40 items-center">
                {item.imageId && (
                  <img src={imgUrl(item.imageId, 80)} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-champagne-800 text-sm truncate">{item.form}</p>
                  <p className="text-xs text-champagne-500 font-mono">Art.-Nr. {item.sku}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onSetQty(item.sku, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold transition-colors"
                  >−</button>
                  <span className="w-6 text-center font-bold text-champagne-800 text-sm">{item.qty}</span>
                  <button
                    onClick={() => onSetQty(item.sku, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold transition-colors"
                  >+</button>
                  <button
                    onClick={() => onRemove(item.sku)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 text-xs transition-colors ml-1"
                    title="Entfernen"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-champagne-200/40 p-3 space-y-1.5">
          {/* ── EANs kopieren ── */}
          <button
            onClick={handleCopyEans}
            className="w-full px-4 py-2 rounded-xl bg-champagne-100 text-champagne-700 text-[13px] font-semibold hover:bg-champagne-200 border border-champagne-200/60 transition-all flex items-center justify-center gap-2"
          >
            {eansCopied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                EANs kopiert
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                EANs kopieren
              </>
            )}
          </button>
          {/* ── Als Liste speichern ── */}
          {onSaveList && (
            <div className="bg-champagne-50 border border-champagne-200/60 rounded-xl p-2.5 mb-1">
              <div className="flex gap-2">
                <input
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveListClick(); }}
                  placeholder="Listenname…"
                  className="flex-1 min-w-0 bg-white border border-champagne-200 rounded-lg px-3 py-2 text-sm text-champagne-800 placeholder-champagne-300 outline-none focus:border-champagne-400"
                />
                <button
                  onClick={handleSaveListClick}
                  disabled={savingList || !listName.trim()}
                  className="px-4 py-2 rounded-lg bg-champagne-700 text-white text-sm font-semibold hover:bg-champagne-800 disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
                >
                  {savingList ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg> …</>
                  ) : listSaved ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg> Gespeichert</>
                  ) : 'Liste speichern'}
                </button>
              </div>
              {listError && <p className="text-[11px] text-red-500 mt-1">{listError}</p>}
            </div>
          )}
          {/* ── Verbindlich bestellen ── */}
          {allowOrder && kundeId && !orderConfirm && (
            <button
              onClick={() => setOrderConfirm(true)}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              Verbindlich bestellen
            </button>
          )}
          {orderConfirm && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
              <p className="text-sm text-orange-900 font-semibold text-center">
                {totalItems} Artikel verbindlich bestellen?
              </p>
              <p className="text-xs text-orange-600 text-center">Diese Bestellung wird an KONPLOTT übermittelt.</p>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                disabled={ordering}
                rows={2}
                placeholder="Bemerkung (optional) – z. B. Lieferwunsch, Hinweis …"
                className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-champagne-800 placeholder-champagne-400 outline-none focus:border-orange-400 resize-y"
              />
              {orderError && <p className="text-xs text-red-600 text-center">{orderError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setOrderConfirm(false); setOrderError(''); }}
                  disabled={ordering}
                  className="flex-1 px-3 py-2 bg-white text-orange-700 rounded-lg border border-orange-200 text-sm font-medium hover:bg-orange-50 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {ordering ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg> Wird gesendet…</>
                  ) : 'Ja, bestellen'}
                </button>
              </div>
            </div>
          )}
          <div className="border-t border-champagne-100 pt-1.5 mt-1"></div>
          {vertreterKontakt?.whatsapp && (
            <button
              onClick={handleWhatsAppVertreter}
              className="w-full px-4 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1FAD53] text-[13px] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 175.216 175.552" fill="white">
                <path d="M87.184 14.2c-40.36 0-73.178 32.792-73.196 73.134.002 12.89 3.372 25.47 9.78 36.572l-10.39 37.93 38.84-10.188c10.686 5.826 22.71 8.896 34.942 8.9h.032c40.348 0 73.17-32.8 73.188-73.142.008-19.536-7.59-37.908-21.396-51.726C125.192 21.904 106.736 14.2 87.184 14.2zm0 133.856h-.024c-10.916-.004-21.614-2.938-30.924-8.488l-2.218-1.316-22.988 6.03 6.14-22.434-1.444-2.298c-6.098-9.696-9.318-20.9-9.314-32.42.016-33.53 27.312-60.808 60.87-60.808 16.254.008 31.528 6.34 43.006 17.832 11.478 11.492 17.8 26.776 17.792 43.022-.02 33.54-27.32 60.88-60.896 60.88z"/>
                <path d="M126.298 94.794c-2.148-1.074-12.706-6.27-14.678-6.986-1.972-.716-3.406-1.074-4.84 1.074-1.434 2.148-5.554 6.986-6.81 8.422-1.254 1.434-2.51.716-4.658-.36-2.148-1.074-9.07-3.342-17.276-10.66-6.388-5.696-10.702-12.73-11.956-14.878-1.254-2.148-.134-3.312 .942-4.384 .968-.964 2.148-2.51 3.224-3.764 1.074-1.254 1.432-2.148 2.148-3.582.716-1.434.358-2.69-.18-3.764-.536-1.074-4.84-11.668-6.632-15.966-1.746-4.192-3.52-3.624-4.84-3.69-1.254-.062-2.69-.076-4.124-.076-1.434 0-3.762.538-5.734 2.69-1.972 2.148-7.526 7.35-7.526 17.926 0 10.576 7.706 20.794 8.78 22.228 1.074 1.434 15.162 23.148 36.726 32.462 5.126 2.214 9.13 3.538 12.248 4.528 5.148 1.636 9.832 1.404 13.534.852 4.13-.618 12.706-5.194 14.498-10.21 1.792-5.014 1.792-9.314 1.254-10.21-.538-.896-1.972-1.434-4.12-2.508z"/>
              </svg>
              WhatsApp an {vertreterKontakt.name}
            </button>
          )}
          <button
            onClick={handleWhatsApp}
            className="w-full px-4 py-2 bg-[#25D366]/10 text-[#25D366] rounded-xl hover:bg-[#25D366]/20 text-[12px] font-medium transition-all flex items-center justify-center gap-2 border border-[#25D366]/30"
          >
            <svg width="15" height="15" viewBox="0 0 175.216 175.552" fill="currentColor">
              <path d="M87.184 14.2c-40.36 0-73.178 32.792-73.196 73.134.002 12.89 3.372 25.47 9.78 36.572l-10.39 37.93 38.84-10.188c10.686 5.826 22.71 8.896 34.942 8.9h.032c40.348 0 73.17-32.8 73.188-73.142.008-19.536-7.59-37.908-21.396-51.726C125.192 21.904 106.736 14.2 87.184 14.2zm0 133.856h-.024c-10.916-.004-21.614-2.938-30.924-8.488l-2.218-1.316-22.988 6.03 6.14-22.434-1.444-2.298c-6.098-9.696-9.318-20.9-9.314-32.42.016-33.53 27.312-60.808 60.87-60.808 16.254.008 31.528 6.34 43.006 17.832 11.478 11.492 17.8 26.776 17.792 43.022-.02 33.54-27.32 60.88-60.896 60.88z"/>
              <path d="M126.298 94.794c-2.148-1.074-12.706-6.27-14.678-6.986-1.972-.716-3.406-1.074-4.84 1.074-1.434 2.148-5.554 6.986-6.81 8.422-1.254 1.434-2.51.716-4.658-.36-2.148-1.074-9.07-3.342-17.276-10.66-6.388-5.696-10.702-12.73-11.956-14.878-1.254-2.148-.134-3.312 .942-4.384 .968-.964 2.148-2.51 3.224-3.764 1.074-1.254 1.432-2.148 2.148-3.582.716-1.434.358-2.69-.18-3.764-.536-1.074-4.84-11.668-6.632-15.966-1.746-4.192-3.52-3.624-4.84-3.69-1.254-.062-2.69-.076-4.124-.076-1.434 0-3.762.538-5.734 2.69-1.972 2.148-7.526 7.35-7.526 17.926 0 10.576 7.706 20.794 8.78 22.228 1.074 1.434 15.162 23.148 36.726 32.462 5.126 2.214 9.13 3.538 12.248 4.528 5.148 1.636 9.832 1.404 13.534.852 4.13-.618 12.706-5.194 14.498-10.21 1.792-5.014 1.792-9.314 1.254-10.21-.538-.896-1.972-1.434-4.12-2.508z"/>
            </svg>
            WhatsApp teilen
          </button>
          {vertreterKontakt?.email && (
            <button
              onClick={handleEmailVertreter}
              className="w-full px-4 py-2 bg-champagne-50 text-champagne-700 rounded-xl hover:bg-champagne-100 text-[12px] font-medium border border-champagne-200/50 transition-all flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-10 5L2 7"/>
              </svg>
              Email an {vertreterKontakt.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Image Cell with Buttons ─────────────────────────────────────────────────

function ImageCell({ cell, allCells, onAddCart, cartOpen, cart, onSetQty, allowStock = true, lager }) {
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
        <button
          onClick={() => onAddCart(cell)}
          className="block w-full overflow-hidden bg-champagne-50/50 rounded-xl border-2 border-champagne-100/60 hover:border-champagne-300 hover:shadow-lg transition-all duration-300 active:scale-[0.97] cursor-pointer"
          style={{ aspectRatio: '1' }}
          title="In den Warenkorb"
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
        </button>

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
        {(() => {
          const inCart = cart?.find(item => item.sku === cell.sku);
          if (inCart) {
            return (
              <div className="flex items-center gap-0.5 min-w-[65px]">
                <button onClick={() => onSetQty(cell.sku, inCart.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold transition-colors">−</button>
                <span className="w-5 text-center font-bold text-champagne-800 text-[11px]">{inCart.qty}</span>
                <button onClick={() => onSetQty(cell.sku, inCart.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold transition-colors">+</button>
              </div>
            );
          }
          return (
            <button
              onClick={() => onAddCart(cell)}
              className="flex-1 min-w-[65px] px-2 py-1 text-[11px] font-medium text-amber-700 bg-amber-100/80 rounded-md hover:bg-amber-150 transition-colors"
            >
              🛒 Korb
            </button>
          );
        })()}
      </div>

      {showVariants && <VariantsModal cell={cell} allCells={allCells} onClose={() => setShowVariants(false)} onAddCart={onAddCart} cart={cart} onSetQty={onSetQty} allowStock={allowStock} lager={lager} />}
      {showComplements && <SetComplementsModal cell={cell} allCells={allCells} onClose={() => setShowComplements(false)} onAddCart={onAddCart} cart={cart} onSetQty={onSetQty} allowStock={allowStock} lager={lager} />}
    </>
  );
}

// ─── Kollektion View ──────────────────────────────────────────────────────────

const CELL_SIZES = [120, 150, 180, 220, 260];

function KollektionView({ kollektion, onBack, catalog, kundeName, kundeId, cart, onAddCart, onSetQty, cartOpen, onCartOpen, onCartClose, vertreterKontakt, onOrderComplete, allowStock = true, lager, allowOrder = true }) {
  const [sizeIdx, setSizeIdx] = useState(2);
  const [viewMode, setViewMode] = useState('fliessend');

  const { rows, subkollektionen, lookup } = buildMatrix(catalog.byKollektion, kollektion);
  const allCells = catalog.cells;
  const CELL_W = CELL_SIZES[sizeIdx];
  const LABEL_W = 130;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="sticky top-0 z-40 glass border-b border-champagne-200/40 px-5 py-3.5 flex items-center gap-3">
        <img src="/konplott-logo-oval.svg" alt="" className="w-6 h-auto opacity-50 shrink-0 hidden sm:block" />
        <button onClick={onBack} className="flex items-center gap-1.5 text-champagne-500 hover:text-champagne-700 transition-colors text-xs font-semibold shrink-0 group">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Übersicht
        </button>
        <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, transparent, #d4c9b8, transparent)' }} />
        <h1 className="font-display text-base text-champagne-800 truncate tracking-wide">{kollektion}</h1>
        <div className="ml-auto flex items-center gap-1.5">
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
          {cart.length > 0 && (
            <button
              onClick={onCartOpen}
              className="relative flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-bold transition-all shadow-md shadow-orange-500/25 ml-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              <span className="text-base font-bold">{cart.reduce((s, i) => s + i.qty, 0)}</span>
            </button>
          )}
        </div>
      </header>

      <main className="px-4 py-6">
        {viewMode === 'fliessend' ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CELL_W}px, 1fr))` }}>
            {catalog.byKollektion[kollektion]?.map(cell => (
              <div key={cell.sku}>
                <ImageCell cell={cell} allCells={allCells} onAddCart={onAddCart} cartOpen={cartOpen} cart={cart} onSetQty={onSetQty} allowStock={allowStock} lager={lager} />
                <div className="mt-1.5 px-0.5">
                  <p className="text-[10px] font-semibold text-champagne-700 truncate">{cell.form}</p>
                  <p className="text-[10px] text-champagne-500 truncate">{cell.subkollektion}</p>
                  <p className="text-[9px] text-champagne-400 font-mono truncate">{cell.sku}</p>
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
                          <ImageCell cell={cell} allCells={allCells} onAddCart={onAddCart} cartOpen={cartOpen} cart={cart} onSetQty={onSetQty} allowStock={allowStock} lager={lager} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {cartOpen && <CartView cartItems={cart} onClose={onCartClose} vertreterKontakt={vertreterKontakt} kundeName={kundeName} kundeId={kundeId} onSetQty={onSetQty} onRemove={(sku) => onSetQty(sku, 0)} onOrderComplete={onOrderComplete} allowOrder={allowOrder} />}

      {/* Floating Cart Button — mobile */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={onCartOpen}
          className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow border border-orange-200">
            {cart.reduce((s, i) => s + i.qty, 0)}
          </span>
        </button>
      )}
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

function VertreterHeader({ vertreterKontakt }) {
  if (!vertreterKontakt) return null;
  return (
    <div className="flex items-center gap-2">
      {vertreterKontakt.bild && (
        <img src={vertreterKontakt.bild} alt={vertreterKontakt.name} className="w-9 h-9 rounded-full object-cover" />
      )}
      <p className="text-sm text-champagne-800 font-medium">{vertreterKontakt.name}</p>
      <div className="flex items-center gap-1.5 ml-1">
        {vertreterKontakt.telefon && (
          <a href={`tel:${vertreterKontakt.telefon.replace(/\s/g, '')}`} className="w-8 h-8 flex items-center justify-center rounded-full bg-champagne-100/80 text-champagne-600 hover:text-orange-600 hover:bg-orange-50 transition" title="Anrufen">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
        )}
        {vertreterKontakt.whatsapp && (
          <a href={`https://wa.me/${vertreterKontakt.whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition" title="WhatsApp">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403c-5.523 0-10-4.477-10-10 0-1.77.46-3.43 1.27-4.87L2.05 2.05l4.87 1.22A9.93 9.93 0 0012.05 2c5.523 0 10 4.477 10 10s-4.477 10-10 10z"/>
            </svg>
          </a>
        )}
        {vertreterKontakt.email && (
          <a href={`mailto:${vertreterKontakt.email}`} className="w-8 h-8 flex items-center justify-center rounded-full bg-champagne-100/80 text-champagne-600 hover:text-blue-600 hover:bg-blue-50 transition" title="Email">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-10 5L2 7"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Hero & Banner (Order-Seite) ──────────────────────────────────────────────

function heroImg(id, w = 1280) {
  if (!id) return null;
  return `${CDN_BASE}/${id}/${id}.jpg?width=${w}`;
}

function vimeoSrc(id, muted) {
  return `https://player.vimeo.com/video/${id}?autoplay=1&loop=1&muted=${muted ? 1 : 0}&controls=0&playsinline=1&autopause=0&title=0&byline=0&portrait=0`;
}

// Sehr einfaches, sicheres Format: **fett** + Zeilenumbrüche. Kein roh-HTML.
function StyledText({ text, className }) {
  if (!text) return null;
  return (
    <div className={className}>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

function MediaView({ media, muted, onToggleMute, rounded = 'rounded-2xl', heightClass = 'h-full' }) {
  if (!media) return null;
  if (media.type === 'vimeo' && media.vimeoId) {
    return (
      <div className={`relative w-full ${heightClass} overflow-hidden ${rounded} bg-black`}>
        <iframe
          title="Video"
          src={vimeoSrc(media.vimeoId, muted)}
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture"
        />
        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className="absolute bottom-3 right-3 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center hover:bg-black/70 transition"
            title={muted ? 'Ton an' : 'Ton aus'}
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/></svg>
            )}
          </button>
        )}
      </div>
    );
  }
  const imgSrc = media.type === 'image' ? (media.url || heroImg(media.imageId)) : null;
  if (imgSrc) {
    return (
      <div className={`w-full ${heightClass} overflow-hidden ${rounded} bg-champagne-100`}>
        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return null;
}

function HeroSection({ hero, kundeName, vertreterKontakt }) {
  const [muted, setMuted] = useState(true);
  const hideKey = `heroHidden:${kundeName}`;
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(hideKey) === '1'; } catch { return false; }
  });
  if (!hero || !hero.aktiv) return null;
  const desktop = hero.desktop || hero.mobile;
  const mobile = hero.mobile || hero.desktop;
  if (!desktop && !mobile) return null;

  if (hidden) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-3 -mb-2">
        <button
          onClick={() => { try { localStorage.removeItem(hideKey); } catch {} setHidden(false); }}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-champagne-400 hover:text-champagne-700 transition"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Hero anzeigen
        </button>
      </div>
    );
  }
  const hasVideo = desktop?.type === 'vimeo' || mobile?.type === 'vimeo';
  const toggle = hasVideo ? () => setMuted(m => !m) : null;
  const wa = vertreterKontakt?.whatsapp ? `https://wa.me/${vertreterKontakt.whatsapp.replace(/[^0-9+]/g, '')}` : null;
  const mail = vertreterKontakt?.email ? `mailto:${vertreterKontakt.email}` : null;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      <div className="relative">
        <div className="hidden sm:block">
          <MediaView media={desktop} muted={muted} onToggleMute={toggle} heightClass="h-[300px] md:h-[420px]" />
        </div>
        <div className="sm:hidden">
          <MediaView media={mobile} muted={muted} onToggleMute={toggle} heightClass="h-[460px]" />
        </div>

        {/* Verlauf für Lesbarkeit */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-black/45 via-black/5 to-black/55" />

        {/* Ausblenden */}
        <button
          onClick={() => { try { localStorage.setItem(hideKey, '1'); } catch {} setHidden(true); }}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60 transition"
          title="Hero ausblenden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* Oben: ovales Logo + „Konplott & {Kunde}" */}
        <div className="absolute top-0 left-0 right-0 p-5 flex items-center gap-3">
          <img src="/konplott-logo-oval.svg" alt="" className="w-9 sm:w-11 h-auto drop-shadow-lg brightness-0 invert opacity-95" />
          <h1 className="font-display text-white text-lg sm:text-2xl tracking-wide drop-shadow-lg leading-tight">
            Konplott &amp; {kundeName}{hero.headlineSuffix ? <span className="opacity-80"> · {hero.headlineSuffix}</span> : null}
          </h1>
        </div>

        {/* Unten: Kontakt-CTAs */}
        {(wa || mail) && (
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-[13px] font-semibold shadow-lg hover:bg-[#1FAD53] transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 2C6.527 2 2.05 6.477 2.05 12c0 1.77.46 3.43 1.27 4.87L2.05 22l5.25-1.27A9.93 9.93 0 0012.05 22c5.523 0 10-4.477 10-10S17.573 2 12.05 2z"/></svg>
                WhatsApp
              </a>
            )}
            {mail && (
              <a href={mail}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur text-champagne-800 text-[13px] font-semibold shadow-lg hover:bg-white transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
                E-Mail
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ListBanner({ banner }) {
  const [muted, setMuted] = useState(true);
  if (!banner || !banner.aktiv) return null;
  const desktop = banner.desktop || banner.mobile;
  const mobile = banner.mobile || banner.desktop;
  const hasMedia = !!(desktop || mobile);
  const hasText = !!(banner.styledText && banner.styledText.trim());
  if (!hasMedia && !hasText) return null;
  const hasVideo = desktop?.type === 'vimeo' || mobile?.type === 'vimeo';
  const toggle = hasVideo ? () => setMuted(m => !m) : null;

  return (
    <div className="mb-5 rounded-2xl overflow-hidden border border-champagne-100/80 bg-white shadow-sm flex flex-col sm:flex-row xl:flex-col">
      {hasMedia && (
        <>
          {/* Mobil-Medium (< sm) */}
          {mobile && (
            <div className="sm:hidden">
              <MediaView media={mobile} muted={muted} onToggleMute={toggle} rounded="rounded-none" heightClass="h-52" />
            </div>
          )}
          {/* Desktop-Medium (sm+): links (sm–lg) bzw. oben (xl) */}
          {desktop && (
            <div className="hidden sm:block sm:w-1/2 xl:w-full shrink-0">
              <MediaView media={desktop} muted={muted} onToggleMute={toggle} rounded="rounded-none" heightClass="h-full min-h-[180px] xl:h-52 xl:min-h-0" />
            </div>
          )}
        </>
      )}
      {hasText && (
        <div className="flex-1 p-5 flex items-center">
          <StyledText text={banner.styledText} className="text-champagne-800 text-sm sm:text-base leading-relaxed space-y-1" />
        </div>
      )}
    </div>
  );
}

function ListSection({ name, isRestocking, catalog: listCatalog, geaendert, onSelect, allowStock, banner }) {
  const date = geaendert ? new Date(geaendert).toLocaleDateString('de-DE') : null;
  // Wrap onSelect to include list-specific catalog and allowStock
  const handleSelect = (kollName) => onSelect(kollName, listCatalog, allowStock);
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-1">
        {isRestocking ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-semibold uppercase tracking-wider">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 12"/><path d="M7.5 15.5 17.5 5.5"/>
              <path d="M7 17c1.3-1.4 2.8-2.1 4.5-2.1"/><path d="M6 13c1.4-1.4 3-2.1 5-2.1"/>
            </svg>
            Restocking
          </span>
        ) : (
          <h3 className="font-display text-base text-champagne-800 tracking-wide">{name}</h3>
        )}
      </div>
      <p className="text-xs text-champagne-500 mb-4">
        {listCatalog.kollektionen.length} Kollektion{listCatalog.kollektionen.length !== 1 ? 'en' : ''} &middot; {listCatalog.cells.length} Artikel
        {date && <span> &middot; {date}</span>}
      </p>
      {(() => {
        const grid = (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {listCatalog.kollektionen.map(k => (
              <KollektionCard
                key={k}
                name={k}
                preview={listCatalog.kollektionPreviews[k]}
                onClick={handleSelect}
                byKollektion={listCatalog.byKollektion}
              />
            ))}
          </div>
        );
        if (banner && banner.aktiv) {
          // Breiter Desktop (xl): Banner links, Artikel rechts. Sonst: Banner oben, Artikel darunter.
          return (
            <div className="xl:grid xl:grid-cols-[minmax(280px,340px)_1fr] xl:gap-6 xl:items-start">
              <ListBanner banner={banner} />
              <div>{grid}</div>
            </div>
          );
        }
        return grid;
      })()}
    </div>
  );
}

function CollectionOverview({ catalog, catalogs, isOrderView, kundeName, geaendert, onSelect, vertreterKontakt, deepLinkUrlName, showAllLists, onShowAll, hero }) {
  const date = geaendert ? new Date(geaendert).toLocaleDateString('de-DE') : null;
  const showMultiList = isOrderView && catalogs && catalogs.length > 0;

  // Deep-link: find the targeted list by urlName
  const deepLinkedList = deepLinkUrlName && showMultiList
    ? catalogs.find(c => c.urlName === deepLinkUrlName)
    : null;
  const hasDeepLink = !!deepLinkedList;
  // Filter: hide lists with showInOrder=false (unless they are the deep-linked list)
  const otherLists = (hasDeepLink
    ? catalogs.filter(c => c !== deepLinkedList)
    : catalogs
  ).filter(c => c.showInOrder !== false);

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      {hero && <HeroSection hero={hero} kundeName={kundeName} vertreterKontakt={vertreterKontakt} />}
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <img src="/konplott-logo-oval.svg" alt="" className="w-8 h-auto opacity-60 shrink-0 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <img src="/konplott-wordmark.svg" alt="KONPLOTT" className="h-2.5 opacity-40" />
              </div>
              <h1 className="font-display text-xl text-champagne-800 tracking-wide">{kundeName}</h1>
              {!showMultiList && date && <p className="text-[10px] text-champagne-400 mt-0.5">Aktualisiert {date}</p>}
            </div>
          </div>
          <VertreterHeader vertreterKontakt={vertreterKontakt} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {showMultiList ? (
          <>
            {/* Deep-linked list shown first, regardless of priority */}
            {hasDeepLink && (
              <ListSection
                name={deepLinkedList.name}
                isRestocking={deepLinkedList.isRestocking}
                catalog={deepLinkedList.catalog}
                geaendert={deepLinkedList.geaendert}
                onSelect={onSelect}
                allowStock={deepLinkedList.allowStock}
                banner={deepLinkedList.banner}
              />
            )}

            {/* Show more button when deep-linked and other lists exist */}
            {hasDeepLink && !showAllLists && otherLists.length > 0 && (
              <div className="flex justify-center mb-10">
                <button
                  onClick={onShowAll}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-champagne-100 hover:bg-champagne-200 text-champagne-700 text-sm font-medium transition-colors border border-champagne-200/60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                  {otherLists.length} weitere Liste{otherLists.length !== 1 ? 'n' : ''} anzeigen
                </button>
              </div>
            )}

            {/* Other lists: shown always (no deep link) or after "show more" */}
            {(!hasDeepLink || showAllLists) && otherLists.map((entry, idx) => (
              <ListSection
                key={idx}
                name={entry.name}
                isRestocking={entry.isRestocking}
                catalog={entry.catalog}
                geaendert={entry.geaendert}
                onSelect={onSelect}
                allowStock={entry.allowStock}
                banner={entry.banner}
              />
            ))}
          </>
        ) : (
          <>
            <h2 className="font-display text-lg text-champagne-800 tracking-wide mb-1">Restocking</h2>
            <p className="text-xs text-champagne-500 mb-6">
              {catalog.kollektionen.length} Kollektion{catalog.kollektionen.length !== 1 ? 'en' : ''} &middot; {catalog.cells.length} Artikel
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {catalog.kollektionen.map(k => (
                <KollektionCard
                  key={k}
                  name={k}
                  preview={catalog.kollektionPreviews[k]}
                  onClick={(name) => onSelect(name, catalog, true)}
                  byKollektion={catalog.byKollektion}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Brand Footer */}
      <footer className="py-8 text-center">
        <div className="flex items-center justify-center gap-2 opacity-30">
          <img src="/konplott-logo-oval.svg" alt="" className="w-5 h-auto" />
          <img src="/konplott-wordmark.svg" alt="" className="h-2 opacity-70" />
        </div>
      </footer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <img src="/konplott-logo-oval.svg" alt="" className="w-8 h-auto opacity-40 animate-pulse" />
          <div>
            <img src="/konplott-wordmark.svg" alt="KONPLOTT" className="h-2.5 opacity-30 mb-1" />
            <Skeleton className="h-5 w-40" />
          </div>
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

// ─── Katalog: Lager-Picker ────────────────────────────────────────────────────

function LagerPicker({ lager, kundeName, onSelect }) {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/konplott-logo-oval.svg" alt="" className="w-8 h-auto opacity-60 shrink-0" />
          <div>
            <img src="/konplott-wordmark.svg" alt="KONPLOTT" className="h-2.5 opacity-40 mb-0.5" />
            <h1 className="font-display text-xl text-champagne-800 tracking-wide">{kundeName}</h1>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="font-display text-lg text-champagne-800 tracking-wide mb-1">Lager wählen</h2>
        <p className="text-xs text-champagne-500 mb-6">Wähle ein Lager, um den lieferbaren Katalog anzusehen.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {lager.map(l => (
            <button
              key={l.id || l.name}
              onClick={() => onSelect(l)}
              className="text-left p-5 rounded-2xl bg-white border border-champagne-100/80 hover:border-champagne-300/60 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-champagne-100 flex items-center justify-center text-champagne-500 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base text-champagne-800 truncate">{l.name}</p>
                  {l.id && <p className="text-[10px] text-champagne-400 font-mono">Lager-ID {l.id}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Katalog: Setergänzung für ALLE ───────────────────────────────────────────

function findCatalogComplements(cell, cells) {
  return cells.filter(c =>
    c.kollektion === cell.kollektion &&
    c.subkollektion === cell.subkollektion &&
    c.form !== cell.form &&
    c.sku !== cell.sku
  );
}

function SetComplementsAllModal({ cells, allCells, onClose, onAddCart, cart, onSetQty }) {
  const sections = useMemo(() => cells
    .map(base => ({ base, complements: findCatalogComplements(base, allCells) }))
    .filter(s => s.complements.length > 0), [cells, allCells]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-champagne-200/40 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-champagne-800">Setergänzung für alle</h2>
            <p className="text-xs text-champagne-500 mt-0.5">{sections.length} Artikel mit Ergänzungen</p>
          </div>
          <button onClick={onClose} className="text-champagne-400 hover:text-champagne-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {sections.length === 0 && (
            <p className="text-center text-champagne-500 text-sm py-6">Keine Setergänzungen im Lager gefunden.</p>
          )}
          {sections.map(({ base, complements }) => (
            <div key={base.sku}>
              <div className="flex items-center gap-2 mb-2">
                {base.imageId && <img src={imgUrl(base.imageId, 80)} alt="" className="w-9 h-9 object-cover rounded" />}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-champagne-800 truncate">{base.kollektion} · {base.form}</p>
                  <p className="text-[10px] text-champagne-400">{base.subkollektion} · {complements.length} Ergänzungen</p>
                </div>
              </div>
              <div className="grid gap-2 pl-2 border-l-2 border-champagne-100">
                {complements.map(c => {
                  const inCart = cart?.find(item => item.sku === c.sku);
                  return (
                    <div key={c.sku} className="flex gap-3 p-2.5 bg-champagne-50 rounded-lg border border-champagne-200/40">
                      <button onClick={() => onAddCart(c)} className="flex-1 flex gap-3 text-left">
                        {c.imageId && <img src={imgUrl(c.imageId, 100)} alt="" className="w-16 h-16 object-cover rounded" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-champagne-800 text-sm truncate">{c.form}</p>
                          <p className="text-xs text-champagne-600 truncate">{c.subkollektion}</p>
                          <p className="text-[10px] text-champagne-400 font-mono mt-0.5">{c.sku}</p>
                          {fmtPrice(c.price) && <p className="text-sm font-bold text-champagne-700 mt-0.5">{fmtPrice(c.price)}</p>}
                        </div>
                      </button>
                      {inCart ? (
                        <div className="flex items-center gap-1 self-center">
                          <button onClick={() => onSetQty(c.sku, inCart.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">−</button>
                          <span className="w-5 text-center font-bold text-champagne-800 text-xs">{inCart.qty}</span>
                          <button onClick={() => onSetQty(c.sku, inCart.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-sm font-bold">+</button>
                        </div>
                      ) : (
                        <button onClick={() => onAddCart(c)} className="px-2 py-1 rounded text-xs font-semibold text-champagne-700 bg-champagne-100 hover:bg-champagne-200 self-center whitespace-nowrap">hinzufügen</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Katalog: Die N teuersten Artikel ─────────────────────────────────────────

function KatalogTeuerste({ cells, allCells, lager, cart, onAddCart, onSetQty, defaultCount = 50, showQty = false }) {
  const [count, setCount] = useState(defaultCount);
  const [complementCell, setComplementCell] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const lookupCells = allCells || cells;
  const sorted = useMemo(() => [...cells].sort((a, b) => (b.price || 0) - (a.price || 0)), [cells]);
  const top = count === -1 ? sorted : sorted.slice(0, count);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-champagne-500">Anzahl</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="bg-white border border-champagne-200 rounded-lg px-3 py-1.5 text-sm text-champagne-800 outline-none focus:border-champagne-400"
          >
            {[20, 50, 100, 200].map(n => <option key={n} value={n}>{n} teuerste</option>)}
            <option value={-1}>Alle ({sorted.length})</option>
          </select>
        </div>
        <button
          onClick={() => setShowAll(true)}
          className="px-4 py-2 rounded-full bg-champagne-700 text-white text-sm font-semibold hover:bg-champagne-800 transition-colors"
        >
          Setergänzung für alle anzeigen
        </button>
      </div>

      {showQty && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-champagne-100/60 border border-champagne-200/60 text-[13px] text-champagne-800 font-semibold flex items-center justify-between">
          <span>{top.reduce((s, c) => s + (Number(c.bestand) || 0), 0)} Stk angezeigt</span>
          <span>Σ {fmtMoney(summeCells(top))}</span>
        </div>
      )}

      <div className="grid gap-2">
        {top.map((cell, idx) => {
          const inCart = cart?.find(item => item.sku === cell.sku);
          return (
            <div key={cell.sku} className="flex gap-3 p-3 bg-white rounded-xl border border-champagne-100/80 items-center">
              <span className="text-[11px] font-bold text-champagne-300 w-6 text-center shrink-0">{idx + 1}</span>
              {cell.imageId
                ? <img src={imgUrl(cell.imageId, 120)} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
                : <div className="w-16 h-16 rounded-lg bg-champagne-50 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-champagne-800 text-sm truncate">{cell.kollektion} · {cell.form}</p>
                <p className="text-xs text-champagne-500 truncate">{cell.subkollektion}</p>
                <p className="text-[10px] text-champagne-400 font-mono">{cell.sku}</p>
                {fmtPrice(cell.price) && <p className="text-sm font-bold text-champagne-700 mt-0.5">{fmtPrice(cell.price)}</p>}
                {showQty && <p className="text-[11px] text-champagne-600 font-semibold mt-0.5">Bestand {cell.bestand || 0} &middot; Σ {fmtMoney((Number(cell.bestand) || 0) * (Number(cell.price) || 0))}</p>}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => setComplementCell(cell)}
                  className="px-3 py-1 text-[11px] font-medium text-champagne-700 bg-champagne-100/80 rounded-md hover:bg-champagne-200 transition-colors whitespace-nowrap"
                >
                  Setergänzung
                </button>
                {inCart ? (
                  <div className="flex items-center gap-1 justify-center">
                    <button onClick={() => onSetQty(cell.sku, inCart.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold">−</button>
                    <span className="w-4 text-center font-bold text-champagne-800 text-[11px]">{inCart.qty}</span>
                    <button onClick={() => onSetQty(cell.sku, inCart.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold">+</button>
                  </div>
                ) : (
                  <button onClick={() => onAddCart(cell)} className="px-3 py-1 text-[11px] font-medium text-amber-700 bg-amber-100/80 rounded-md hover:bg-amber-200 transition-colors whitespace-nowrap">🛒 Korb</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {complementCell && (
        <SetComplementsModal
          cell={complementCell}
          allCells={lookupCells}
          onClose={() => setComplementCell(null)}
          onAddCart={onAddCart}
          cart={cart}
          onSetQty={onSetQty}
          allowStock={false}
          lager={lager}
        />
      )}
      {showAll && (
        <SetComplementsAllModal
          cells={top}
          allCells={lookupCells}
          onClose={() => setShowAll(false)}
          onAddCart={onAddCart}
          cart={cart}
          onSetQty={onSetQty}
        />
      )}
    </div>
  );
}

// ─── Katalog: Setansicht (Lead-Artikel + Setergänzung) ────────────────────────

function SetansichtView({ cells, cart, onAddCart, onSetQty }) {
  // Ein "Set" (Parure) = gleiche Kollektion + SubKollektion, verschiedene Formen
  const sets = useMemo(() => {
    const bySub = {};
    cells.forEach(c => { (bySub[c.subkollektion] = bySub[c.subkollektion] || []).push(c); });
    return Object.entries(bySub)
      .map(([sub, items]) => {
        const ordered = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
        return {
          sub,
          lead: ordered[0],
          rest: ordered.slice(1),
          all: ordered,
          summe: ordered.reduce((s, c) => s + (c.price || 0), 0),
        };
      })
      .sort((a, b) => (b.lead?.price || 0) - (a.lead?.price || 0));
  }, [cells]);

  const addWholeSet = (set) => set.all.forEach(c => {
    const inCart = cart?.find(i => i.sku === c.sku);
    if (!inCart) onAddCart(c);
  });

  const PieceQty = ({ c }) => {
    const inCart = cart?.find(i => i.sku === c.sku);
    if (inCart) {
      return (
        <div className="flex items-center gap-1 justify-center mt-1">
          <button onClick={() => onSetQty(c.sku, inCart.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold">−</button>
          <span className="w-4 text-center font-bold text-champagne-800 text-[11px]">{inCart.qty}</span>
          <button onClick={() => onSetQty(c.sku, inCart.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-champagne-200/60 text-champagne-700 hover:bg-champagne-300 text-xs font-bold">+</button>
        </div>
      );
    }
    return (
      <button onClick={() => onAddCart(c)} className="mt-1 w-full px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-100/80 rounded-md hover:bg-amber-200 transition-colors">🛒 einzeln</button>
    );
  };

  const Piece = ({ c, lead }) => (
    <div className={`shrink-0 ${lead ? 'w-40' : 'w-28'} `}>
      {c.imageId
        ? <img src={imgUrl(c.imageId, lead ? 320 : 200)} alt="" className={`w-full ${lead ? 'aspect-square' : 'aspect-square'} object-cover rounded-xl border ${lead ? 'border-champagne-300' : 'border-champagne-100'}`} />
        : <div className={`w-full aspect-square rounded-xl bg-champagne-50 border border-champagne-100`} />}
      <p className="text-[11px] font-semibold text-champagne-800 truncate mt-1">{c.form}</p>
      {fmtPrice(c.price) && <p className="text-[11px] font-bold text-champagne-700">{fmtPrice(c.price)}</p>}
      <p className="text-[9px] text-champagne-400 font-mono truncate">{c.sku}</p>
      <PieceQty c={c} />
    </div>
  );

  return (
    <div className="space-y-5">
      {sets.map(set => (
        <div key={set.sub} className="bg-white rounded-2xl border border-champagne-100/80 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="font-display text-base text-champagne-800 truncate">{set.sub}</p>
              <p className="text-[11px] text-champagne-500">{set.all.length} Teile · Set-Summe {fmtPrice(set.summe) || '—'}</p>
            </div>
            <button
              onClick={() => addWholeSet(set)}
              className="px-3 py-1.5 rounded-full bg-champagne-700 text-white text-xs font-semibold hover:bg-champagne-800 transition-colors whitespace-nowrap shrink-0"
            >
              + ganzes Set
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <Piece c={set.lead} lead />
            {set.rest.length > 0 && <div className="w-px bg-champagne-200/60 shrink-0" />}
            {set.rest.map(c => <Piece key={c.sku} c={c} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Katalog: Kollektion-Detail (Alle / Setansicht) ───────────────────────────

function KatalogKollektionDetail({ kollektion, cells, allCells, lager, onBack, cart, onAddCart, onSetQty, onCartOpen, showQty = false }) {
  const [view, setView] = useState('alle'); // 'alle' | 'set'
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-3.5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-champagne-500 hover:text-champagne-700 text-xs font-semibold shrink-0 group">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:-translate-x-0.5 transition-transform"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Übersicht
          </button>
          <div className="w-px h-5" style={{ background: 'linear-gradient(to bottom, transparent, #d4c9b8, transparent)' }} />
          <h1 className="font-display text-base text-champagne-800 truncate tracking-wide">{kollektion}</h1>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-champagne-50 rounded-xl border border-champagne-200/60 overflow-hidden">
              <button onClick={() => setView('alle')} className={`px-3 py-1.5 text-xs font-semibold transition-all ${view === 'alle' ? 'bg-champagne-700 text-white' : 'text-champagne-500 hover:text-champagne-700'}`}>Alle</button>
              <button onClick={() => setView('set')} className={`px-3 py-1.5 text-xs font-semibold transition-all ${view === 'set' ? 'bg-champagne-700 text-white' : 'text-champagne-500 hover:text-champagne-700'}`}>Setansicht</button>
            </div>
            {cart.length > 0 && (
              <button onClick={onCartOpen} className="relative flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-bold transition-all shadow-md shadow-orange-500/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                <span className="text-base font-bold">{cart.reduce((s, i) => s + i.qty, 0)}</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === 'alle' ? (
          <KatalogTeuerste cells={cells} allCells={allCells} lager={lager} cart={cart} onAddCart={onAddCart} onSetQty={onSetQty} defaultCount={-1} showQty={showQty} />
        ) : (
          <SetansichtView cells={cells} cart={cart} onAddCart={onAddCart} onSetQty={onSetQty} />
        )}
      </main>
    </div>
  );
}

// ─── Katalog: Übersicht (Kollektionen / Teuerste) ─────────────────────────────

function KatalogKollektionCard({ name, preview, onClick, byKollektion, showQty = false }) {
  const kcells = byKollektion[name] || [];
  const total = kcells.length;
  const forms = new Set(kcells.map(c => c.form)).size;
  const kollStueck = showQty ? kcells.reduce((s, c) => s + (Number(c.bestand) || 0), 0) : 0;
  const kollSumme = showQty ? summeCells(kcells) : 0;
  return (
    <div className="group relative rounded-2xl overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer bg-white border border-champagne-100/80 hover:border-champagne-300/60">
      <button onClick={() => onClick(name)} className="text-left w-full active:scale-[0.98] transition-transform duration-200">
        <div className="overflow-hidden aspect-square w-full bg-champagne-50 relative">
          {preview?.image ? (
            <img src={preview.image} alt={name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-champagne-200">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none"><rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.5"/></svg>
            </div>
          )}
        </div>
        <div className="px-3.5 py-3">
          <p className="font-display text-base text-champagne-800 leading-snug tracking-wide truncate">{name}</p>
          <p className="text-[9px] text-champagne-400 leading-tight mt-0.5 font-medium tracking-wide">
            {forms} verschiedene Artikel &middot; {total} Artikel gesamt
          </p>
          {showQty && (
            <p className="text-[10px] text-champagne-700 font-semibold leading-tight mt-1">{kollStueck} Stk &middot; Σ {fmtMoney(kollSumme)}</p>
          )}
        </div>
      </button>
    </div>
  );
}

function KatalogOverview({ catalog, lager, kundeName, onChangeLager, onSelectKollektion, cart, onCartOpen, onAddCart, onSetQty, multiLager, savedLists = [], onLoadSelektion, showQty = false }) {
  const [mode, setMode] = useState('kollektionen'); // 'kollektionen' | 'teuerste'
  const lagerSumme = showQty ? summeCells(catalog.cells) : 0;
  const lagerStueck = showQty ? catalog.cells.reduce((s, c) => s + (Number(c.bestand) || 0), 0) : 0;
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="glass border-b border-champagne-200/40 px-5 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/konplott-logo-oval.svg" alt="" className="w-8 h-auto opacity-60 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="font-display text-lg text-champagne-800 tracking-wide truncate">{kundeName}</h1>
              <p className="text-[11px] text-champagne-500 truncate">
                <span className="font-semibold">{lager.name}</span> &middot; {catalog.cells.length} Items in {catalog.kollektionen.length} Kollektionen
                {showQty && <span className="text-champagne-700 font-semibold"> &middot; {lagerStueck} Stk &middot; Σ {fmtMoney(lagerSumme)}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {multiLager && (
              <button onClick={onChangeLager} className="text-xs font-semibold text-champagne-500 hover:text-champagne-700 px-3 py-1.5 rounded-full bg-champagne-50 border border-champagne-200/60">
                Lager wechseln
              </button>
            )}
            {cart.length > 0 && (
              <button onClick={onCartOpen} className="relative flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 text-sm font-bold transition-all shadow-md shadow-orange-500/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                <span className="text-base font-bold">{cart.reduce((s, i) => s + i.qty, 0)}</span>
              </button>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-3 flex gap-2">
          <button
            onClick={() => setMode('kollektionen')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${mode === 'kollektionen' ? 'bg-champagne-700 text-white' : 'bg-champagne-50 text-champagne-500 hover:text-champagne-700 border border-champagne-200/60'}`}
          >
            Alle Kollektionen
          </button>
          <button
            onClick={() => setMode('teuerste')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${mode === 'teuerste' ? 'bg-champagne-700 text-white' : 'bg-champagne-50 text-champagne-500 hover:text-champagne-700 border border-champagne-200/60'}`}
          >
            Teuerste Artikel
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {savedLists.length > 0 && (
          <div className="mb-6">
            <p className="text-[11px] font-semibold text-champagne-500 uppercase tracking-wider mb-2">Gespeicherte Listen</p>
            <div className="flex flex-wrap gap-2">
              {savedLists.map(sel => (
                <button
                  key={sel.id}
                  onClick={() => onLoadSelektion && onLoadSelektion(sel)}
                  className="inline-flex items-center gap-2 bg-white border border-champagne-200/70 rounded-full pl-3 pr-3.5 py-1.5 text-xs text-champagne-700 hover:border-champagne-400 hover:shadow-sm transition-all"
                  title="In Auswahl laden"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3M17 13l2.3 2.3M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
                  <span className="font-semibold">{sel.name}</span>
                  <span className="text-champagne-400">{(sel.artikel || []).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'kollektionen' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {catalog.kollektionen.map(k => (
              <KatalogKollektionCard
                key={k}
                name={k}
                preview={catalog.kollektionTopPreviews?.[k] || catalog.kollektionPreviews?.[k]}
                onClick={onSelectKollektion}
                byKollektion={catalog.byKollektion}
                showQty={showQty}
              />
            ))}
          </div>
        ) : (
          <KatalogTeuerste cells={catalog.cells} allCells={catalog.cells} lager={lager.name} cart={cart} onAddCart={onAddCart} onSetQty={onSetQty} showQty={showQty} />
        )}
      </main>
    </div>
  );
}

// ─── Katalog: Haupt-Container (eigene Route /katalogs/{kundeId}) ──────────────

function KatalogApp() {
  const kundeId = (() => {
    const m = window.location.pathname.match(/\/katalogs\/([^/]+)/);
    return m ? m[1] : null;
  })();

  const [pinOk, setPinOk] = useState(() => {
    if (!kundeId) return false;
    return sessionStorage.getItem(`pin_${kundeId}`) === 'ok';
  });
  const [lagerList, setLagerList] = useState(null); // null = loading
  const [kundeName, setKundeName] = useState('');
  const [vertreterName, setVertreterName] = useState('');
  const [vertreterKontakt, setVertreterKontakt] = useState(null);
  const [error, setError] = useState(null);

  const [selectedLager, setSelectedLager] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedKollektion, setSelectedKollektion] = useState(null);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [savedLists, setSavedLists] = useState([]);

  // Gespeicherte Selektionen laden
  const loadSavedLists = useMemo(() => () => {
    if (!kundeId) return;
    fetch(`${KONAGENT_URL}/api/public/katalog-selektion/${kundeId}?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : { selektionen: [] })
      .then(d => setSavedLists(d.selektionen || []))
      .catch(() => {});
  }, [kundeId]);

  // 1. Erlaubte Läger laden (nach PIN)
  useEffect(() => {
    if (!kundeId || !pinOk) return;
    let cancelled = false;
    fetch(`${KONAGENT_URL}/api/public/katalog-lager/${kundeId}?t=${Date.now()}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        setKundeName(data.kundeName || kundeId);
        setVertreterName(data.vertreterName || '');
        const lager = data.lager || [];
        setLagerList(lager);
        if (lager.length === 1) setSelectedLager(lager[0]);
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLagerList([]); } });
    return () => { cancelled = true; };
  }, [kundeId, pinOk]);

  // 1b. Gespeicherte Listen laden (nach PIN)
  useEffect(() => {
    if (!kundeId || !pinOk) return;
    loadSavedLists();
  }, [kundeId, pinOk, loadSavedLists]);

  // 2. Vertreter-Kontakt laden
  useEffect(() => {
    if (!vertreterName) return;
    let cancelled = false;
    fetch(`${KONAGENT_URL}/api/public/vertreter`)
      .then(r => r.ok ? r.json() : [])
      .then(kontakte => {
        if (cancelled) return;
        const v = (kontakte || []).find(k => k.gebiet.toLowerCase() === vertreterName.toLowerCase());
        if (v) setVertreterKontakt(v);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [vertreterName]);

  // 3. Katalog des gewählten Lagers laden
  useEffect(() => {
    if (!kundeId || !selectedLager) { setCatalog(null); return; }
    let cancelled = false;
    setCatalogLoading(true);
    setSelectedKollektion(null);
    fetch(`${KONAGENT_URL}/api/public/katalog/${kundeId}?lager=${encodeURIComponent(selectedLager.name)}&t=${Date.now()}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (cancelled) return;
        setDisplayCurrency(data.waehrung);
        setCatalog(buildCatalog(data.artikel || []));
        setCatalogLoading(false);
      })
      .catch(e => { if (!cancelled) { setError(e.message); setCatalogLoading(false); } });
    return () => { cancelled = true; };
  }, [kundeId, selectedLager]);

  const handleAddCart = (cell) => {
    setCart(prev => {
      const existing = prev.find(item => item.sku === cell.sku);
      if (existing) return prev.map(item => item.sku === cell.sku ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { sku: cell.sku, form: cell.form, qty: 1, imageId: cell.imageId }];
    });
  };
  const handleSetQty = (sku, qty) => {
    if (qty <= 0) setCart(prev => prev.filter(item => item.sku !== sku));
    else setCart(prev => prev.map(item => item.sku === sku ? { ...item, qty } : item));
  };

  // Selektion als benannte Liste speichern
  const handleSaveList = async (name) => {
    const artikel = cart.map(i => ({ ean: i.sku, form: i.form, menge: i.qty, imageId: i.imageId || '' }));
    const res = await fetch(`${KONAGENT_URL}/api/public/katalog-selektion/${kundeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lagerName: selectedLager?.name || '', artikel }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Fehler ${res.status}`);
    }
    loadSavedLists();
  };

  // Gespeicherte Liste zurück in die Auswahl laden
  const handleLoadSelektion = (sel) => {
    setCart(prev => {
      const next = [...prev];
      (sel.artikel || []).forEach(a => {
        const existing = next.find(i => i.sku === a.ean);
        if (existing) existing.qty += a.menge || 1;
        else next.push({ sku: a.ean, form: a.form, qty: a.menge || 1, imageId: a.imageId });
      });
      return next;
    });
    setCartOpen(true);
  };

  // ── Render ──
  if (kundeId && !pinOk) return <PinScreen kundeId={kundeId} onSuccess={() => setPinOk(true)} />;
  if (!kundeId) return <NotFound message="Keine Kunden-ID in der URL. Erwartet: /katalogs/{kundeId}" />;
  if (lagerList === null) return <LoadingScreen />;
  if (error && !catalog) return <NotFound message={error} />;
  if (lagerList.length === 0) return <NotFound message="Für diesen Kunden sind keine Läger freigegeben. Bitte wende dich an deinen Vertreter." />;

  if (!selectedLager) {
    return <LagerPicker lager={lagerList} kundeName={kundeName} onSelect={setSelectedLager} />;
  }
  if (catalogLoading || !catalog) return <LoadingScreen />;

  if (selectedKollektion) {
    return (
      <>
        <KatalogKollektionDetail
          kollektion={selectedKollektion}
          cells={catalog.byKollektion[selectedKollektion] || []}
          allCells={catalog.cells}
          lager={selectedLager.name}
          onBack={() => setSelectedKollektion(null)}
          cart={cart}
          onAddCart={handleAddCart}
          onSetQty={handleSetQty}
          onCartOpen={() => setCartOpen(true)}
          showQty={!!selectedLager.mitAnzahl}
        />
        {cartOpen && (
          <CartView
            cartItems={cart}
            onClose={() => setCartOpen(false)}
            vertreterKontakt={vertreterKontakt}
            kundeName={kundeName}
            kundeId={kundeId}
            onSetQty={handleSetQty}
            onRemove={(sku) => handleSetQty(sku, 0)}
            onOrderComplete={() => {}}
            allowOrder={false}
            onSaveList={handleSaveList}
          />
        )}
      </>
    );
  }

  return (
    <>
      <KatalogOverview
        catalog={catalog}
        lager={selectedLager}
        kundeName={kundeName}
        multiLager={lagerList.length > 1}
        onChangeLager={() => { setSelectedLager(null); setCatalog(null); }}
        onSelectKollektion={(name) => setSelectedKollektion(name)}
        cart={cart}
        onCartOpen={() => setCartOpen(true)}
        onAddCart={handleAddCart}
        onSetQty={handleSetQty}
        savedLists={savedLists}
        onLoadSelektion={handleLoadSelektion}
        showQty={!!selectedLager.mitAnzahl}
      />
      {/* Katalog-Modus: Warenkorb dient nur der Selektion (kein verbindliches Bestellen) */}
      {cartOpen && (
        <CartView
          cartItems={cart}
          onClose={() => setCartOpen(false)}
          vertreterKontakt={vertreterKontakt}
          kundeName={kundeName}
          kundeId={kundeId}
          onSetQty={handleSetQty}
          onRemove={(sku) => handleSetQty(sku, 0)}
          onOrderComplete={() => {}}
          allowOrder={false}
          onSaveList={handleSaveList}
        />
      )}
      {/* Floating Cart Button (mobil) */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow border border-orange-200">{cart.reduce((s, i) => s + i.qty, 0)}</span>
        </button>
      )}
    </>
  );
}

// ─── Order: Stocks-Tab (zugeordnete Läger) ────────────────────────────────────

function StocksView({ lager, kundeId, kundeName, onSelectKollektion }) {
  const [expanded, setExpanded] = useState(null);
  const [catalogs, setCatalogs] = useState({});
  const [loadingName, setLoadingName] = useState(null);
  const [errors, setErrors] = useState({});

  const openLive = async (l) => {
    if (expanded === l.name) { setExpanded(null); return; }
    setExpanded(l.name);
    if (!catalogs[l.name]) {
      setLoadingName(l.name);
      try {
        const r = await fetch(`${KONAGENT_URL}/api/public/katalog/${kundeId}?lager=${encodeURIComponent(l.name)}&t=${Date.now()}`);
        if (!r.ok) throw new Error(`Fehler ${r.status}`);
        const d = await r.json();
        setCatalogs(prev => ({ ...prev, [l.name]: buildCatalog(d.artikel || []) }));
      } catch (e) {
        setErrors(prev => ({ ...prev, [l.name]: e.message || 'Laden fehlgeschlagen' }));
      } finally { setLoadingName(null); }
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      {lager.length === 0 && <p className="text-sm text-champagne-500 text-center py-10">Dir sind keine Läger zugeordnet.</p>}
      <div className="space-y-4">
        {lager.map(l => l.persisted ? (
          <a
            key={l.name}
            href={`${KONAGENT_URL}/lager/${l.slug}?kunde=${kundeId}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-champagne-100/80 hover:border-champagne-300 hover:shadow-sm transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-champagne-100 flex items-center justify-center text-champagne-500 shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-champagne-800 truncate">{l.name}</p>
              <p className="text-[11px] text-champagne-400">Statisches Lager · öffnen</p>
            </div>
            <span className="text-champagne-400 text-sm shrink-0">↗</span>
          </a>
        ) : (
          <div key={l.name} className="rounded-2xl bg-white border border-champagne-100/80 overflow-hidden">
            <button onClick={() => openLive(l)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-champagne-50/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-champagne-100 flex items-center justify-center text-champagne-500 shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base text-champagne-800 truncate">{l.name}</p>
                <p className="text-[11px] text-champagne-400">Lager · {expanded === l.name ? 'zuklappen' : 'aufklappen'}</p>
              </div>
              <span className="text-champagne-400 shrink-0">{expanded === l.name ? '▲' : '▼'}</span>
            </button>
            {expanded === l.name && (
              <div className="border-t border-champagne-100/60 p-4">
                {loadingName === l.name ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-champagne-500 text-sm"><div className="w-4 h-4 border-2 border-champagne-300 border-t-transparent rounded-full animate-spin"></div> Lager wird geladen…</div>
                ) : errors[l.name] ? (
                  <p className="text-center text-red-500 text-sm py-4">{errors[l.name]}</p>
                ) : catalogs[l.name] ? (
                  <>
                    <p className="text-xs text-champagne-500 mb-3">{catalogs[l.name].cells.length} Artikel · {catalogs[l.name].kollektionen.length} Kollektionen</p>
                    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                      {catalogs[l.name].kollektionen.map(k => (
                        <KollektionCard
                          key={k}
                          name={k}
                          preview={catalogs[l.name].kollektionTopPreviews?.[k] || catalogs[l.name].kollektionPreviews?.[k]}
                          onClick={(name) => onSelectKollektion(name, catalogs[l.name], true)}
                          byKollektion={catalogs[l.name].byKollektion}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function MainApp() {
  const [catalog, setCatalog] = useState(null);
  const [catalogs, setCatalogs] = useState([]); // multi-list: [{name, catalog, geaendert}]
  const [kundeName, setKundeName] = useState('');
  const [geaendert, setGeaendert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedKollektion, setSelectedKollektion] = useState(null);
  const [selectedListCatalog, setSelectedListCatalog] = useState(null);
  const [selectedListAllowStock, setSelectedListAllowStock] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [vertreterKontakt, setVertreterKontakt] = useState(null);
  const [vertreterName, setVertreterName] = useState('');
  const [hero, setHero] = useState(null);
  const [showAllLists, setShowAllLists] = useState(false);
  const [orderTab, setOrderTab] = useState('listen'); // 'listen' | 'stocks'
  const [stockLager, setStockLager] = useState([]); // [{id,name,persisted,slug}]

  const _path = window.location.pathname;
  const isOrderView = _path.startsWith('/order/');
  // Beleg-Ansicht: /beleg/{belegId}?c={kundeId} — zeigt die Artikel eines Belegs LIVE
  // als (flüchtige) Liste; über „more" sind die übrigen Kunden-Listen erreichbar.
  const isBelegView = _path.startsWith('/beleg/');
  const belegId = isBelegView ? (_path.match(/\/beleg\/([^/]+)/)?.[1] || null) : null;

  const kundeId = (() => {
    if (isBelegView) return new URLSearchParams(window.location.search).get('c');
    const m = _path.match(/\/(restocking|order)\/([^/]+)/);
    return m ? m[2] : null;
  })();

  // Deep-link: ?ListenName in query string → show that list first.
  // Im Beleg-Modus ist der synthetische Eintrag `beleg-{id}` der Deep-Link → er steht oben,
  // „more" enthüllt die anderen Listen.
  const deepLinkUrlName = (() => {
    if (isBelegView) return belegId ? `beleg-${belegId}` : null;
    const search = window.location.search;
    if (!search || search.length < 2) return null;
    // The urlName is the query string without the leading '?', e.g. ?summer-vibes → "summer-vibes"
    return search.slice(1).split('&')[0].split('=')[0] || null;
  })();

  const [pinOk, setPinOk] = useState(() => {
    if (!kundeId) return false;
    return sessionStorage.getItem(`pin_${kundeId}`) === 'ok';
  });

  useEffect(() => {
    if (!kundeId) {
      setError('Keine Kunden-ID in der URL gefunden. Erwartet: /restocking/{kundeId}, /order/{kundeId} oder /beleg/{belegId}?c={kundeId}');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 8;

    if (isBelegView) {
      // Beleg-Ansicht: Beleg-Positionen LIVE laden (nicht persistiert) + die übrigen Listen
      // des Kunden, damit „more" sie zeigt. Der Beleg ist der Deep-Link (steht oben).
      const fetchBeleg = () => {
        Promise.all([
          fetch(`${KONAGENT_URL}/api/public/beleg-artikel/${belegId}?c=${kundeId}&t=${Date.now()}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }),
          fetch(`${KONAGENT_URL}/api/public/order/${kundeId}?t=${Date.now()}`)
            .then(res => res.ok ? res.json() : { listen: [] })
            .catch(() => ({ listen: [] })),
        ])
          .then(([belegData, orderData]) => {
            if (cancelled) return;
            setKundeName(belegData.kundeName || orderData.kundeName || kundeId);
            setVertreterName(belegData.vertreterName || orderData.vertreterName || '');
            setHero(orderData.hero || null);
            setDisplayCurrency(belegData.waehrung || orderData.waehrung);
            const belegArtikel = belegData.artikel || [];
            const belegEntry = {
              name: belegData.name || `Beleg ${belegId}`,
              isRestocking: false,
              prioritaet: 9999,
              geaendert: null,
              catalog: buildCatalog(belegArtikel),
              urlName: `beleg-${belegId}`,
              allowStock: true,
              showInOrder: true,
              banner: null,
            };
            const otherLists = (orderData.listen || [])
              .filter(l => l.artikel && l.artikel.length > 0)
              .map(l => ({
                name: l.name,
                isRestocking: l.isRestocking,
                prioritaet: l.isRestocking ? 0 : (l.prioritaet ?? 1),
                geaendert: l.geaendert,
                catalog: buildCatalog(l.artikel),
                urlName: l.urlName || null,
                allowStock: l.allowStock !== false,
                showInOrder: l.showInOrder !== false,
                banner: l.banner || null,
              }))
              .sort((a, b) => b.prioritaet - a.prioritaet);
            setCatalogs([belegEntry, ...otherLists]);
            // Merged catalog für einheitlichen Warenkorb/Suche
            const merged = [belegArtikel, ...(orderData.listen || []).flatMap(l => l.artikel || [])].flat();
            setCatalog(buildCatalog(merged.length ? merged : belegArtikel));
            setGeaendert(null);
            setLoading(false);
          })
          .catch(e => {
            if (cancelled) return;
            setError(e.message);
            setLoading(false);
          });
      };
      fetchBeleg();
    } else if (isOrderView) {
      // Order view: fetch all lists for this customer
      const fetchOrder = () => {
        const url = `${KONAGENT_URL}/api/public/order/${kundeId}?t=${Date.now()}`;
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : `HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (cancelled) return;
            setKundeName(data.kundeName || kundeId);
            setVertreterName(data.vertreterName || '');
            setHero(data.hero || null);
            setDisplayCurrency(data.waehrung);
            const listenWithCatalogs = (data.listen || [])
              .filter(l => l.artikel && l.artikel.length > 0)
              .map(l => ({
                name: l.name,
                isRestocking: l.isRestocking,
                prioritaet: l.isRestocking ? 0 : (l.prioritaet ?? 1),
                geaendert: l.geaendert,
                catalog: buildCatalog(l.artikel),
                urlName: l.urlName || null,
                allowStock: l.allowStock !== false,
                showInOrder: l.showInOrder !== false,
                banner: l.banner || null,
              }))
              .sort((a, b) => b.prioritaet - a.prioritaet);
            setCatalogs(listenWithCatalogs);
            // Use first list as primary catalog (for KollektionView compatibility)
            if (listenWithCatalogs.length > 0) {
              // Merge all cells for unified cart/search
              const allArtikel = (data.listen || []).flatMap(l => l.artikel || []);
              setCatalog(buildCatalog(allArtikel));
              setGeaendert(listenWithCatalogs[0].geaendert);
            }
            setLoading(false);
          })
          .catch(e => {
            if (cancelled) return;
            if (e.message === 'not_found' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(fetchOrder, 3000);
            } else {
              setError(e.message === 'not_found' ? null : e.message);
              setLoading(false);
            }
          });
      };
      fetchOrder();
    } else {
      // Restocking view: fetch only restocking list
      const fetchList = () => {
        const url = `${KONAGENT_URL}/api/public/restocking/${kundeId}?t=${Date.now()}`;
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : `HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (cancelled) return;
            setKundeName(data.kundeName || kundeId);
            setGeaendert(data.geaendert);
            setVertreterName(data.vertreterName || '');
            setDisplayCurrency(data.waehrung);
            setCatalog(buildCatalog(data.artikel || []));
            setLoading(false);
          })
          .catch(e => {
            if (cancelled) return;
            if (e.message === 'not_found' && retryCount < maxRetries) {
              retryCount++;
              setTimeout(fetchList, 3000);
            } else {
              setError(e.message === 'not_found' ? null : e.message);
              setLoading(false);
            }
          });
      };
      fetchList();
    }

    return () => { cancelled = true; };
  }, [kundeId, isOrderView, isBelegView, belegId]);

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
      return [...prev, { sku: cell.sku, form: cell.form, qty: 1, imageId: cell.imageId }];
    });
    // Warenkorb nur beim ERSTEN Mal öffnen, nicht bei Menge+1
  };

  const handleSetQty = (sku, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.sku !== sku));
    } else {
      setCart(prev => prev.map(item => item.sku === sku ? { ...item, qty } : item));
    }
  };

  // eslint-disable-next-line
  const _handleRemoveFromCart = (sku) => {
    setCart(prev => prev.filter(item => item.sku !== sku));
  };

  // Zugeordnete Läger laden (nur Order-View, nach PIN)
  useEffect(() => {
    if (!isOrderView || !kundeId || !pinOk) return;
    let cancelled = false;
    fetch(`${KONAGENT_URL}/api/public/katalog-lager/${kundeId}?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : { lager: [] })
      .then(d => { if (!cancelled) setStockLager(d.lager || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOrderView, kundeId, pinOk]);

  const handleSelectKollektion = (name, listCatalog, allowStock) => {
    setSelectedKollektion(name);
    setSelectedListCatalog(listCatalog || catalog);
    setSelectedListAllowStock(allowStock ?? true);
  };

  // PIN-Schutz (nach allen Hooks!)
  if (kundeId && !pinOk) {
    return <PinScreen kundeId={kundeId} onSuccess={() => setPinOk(true)} />;
  }

  if (loading) return <LoadingScreen />;
  if (!catalog || error) return <NotFound message={error} />;

  if (selectedKollektion) {
    return (
      <KollektionView
        kollektion={selectedKollektion}
        onBack={() => { setSelectedKollektion(null); setSelectedListCatalog(null); }}
        catalog={selectedListCatalog || catalog}
        kundeName={kundeName}
        kundeId={kundeId}
        cart={cart}
        onAddCart={handleAddCart}
        onSetQty={handleSetQty}
        cartOpen={cartOpen}
        onCartOpen={() => setCartOpen(true)}
        onCartClose={() => setCartOpen(false)}
        vertreterKontakt={vertreterKontakt}
        onOrderComplete={() => setCart([])}
        allowStock={selectedListAllowStock}
      />
    );
  }

  const hasStocks = isOrderView && stockLager.length > 0;

  if (hasStocks) {
    return (
      <div className="min-h-screen bg-[#faf9f6]">
        {/* Tab-Leiste Listen / Stocks */}
        <div className="glass border-b border-champagne-200/40 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 flex gap-1">
            <button
              onClick={() => setOrderTab('listen')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${orderTab === 'listen' ? 'border-champagne-700 text-champagne-800' : 'border-transparent text-champagne-400 hover:text-champagne-600'}`}
            >Listen</button>
            <button
              onClick={() => setOrderTab('stocks')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${orderTab === 'stocks' ? 'border-champagne-700 text-champagne-800' : 'border-transparent text-champagne-400 hover:text-champagne-600'}`}
            >Stocks <span className="text-[11px] text-champagne-400">({stockLager.length})</span></button>
          </div>
        </div>
        {orderTab === 'listen' ? (
          <CollectionOverview
            catalog={catalog}
            catalogs={catalogs}
            isOrderView={isOrderView}
            kundeName={kundeName}
            geaendert={geaendert}
            onSelect={handleSelectKollektion}
            vertreterKontakt={vertreterKontakt}
            deepLinkUrlName={deepLinkUrlName}
            showAllLists={showAllLists}
            onShowAll={() => setShowAllLists(true)}
            hero={hero}
          />
        ) : (
          <StocksView lager={stockLager} kundeId={kundeId} kundeName={kundeName} onSelectKollektion={handleSelectKollektion} />
        )}
      </div>
    );
  }

  return (
    <CollectionOverview
      catalog={catalog}
      catalogs={(isOrderView || isBelegView) ? catalogs : []}
      isOrderView={isOrderView || isBelegView}
      kundeName={kundeName}
      geaendert={geaendert}
      onSelect={handleSelectKollektion}
      vertreterKontakt={vertreterKontakt}
      deepLinkUrlName={deepLinkUrlName}
      showAllLists={showAllLists}
      onShowAll={() => setShowAllLists(true)}
      hero={hero}
    />
  );
}

export default function App() {
  // Routing ohne Hooks (Dispatcher) — verhindert Rules-of-Hooks-Konflikte
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/katalogs/')) {
    return <KatalogApp />;
  }
  return <MainApp />;
}
