import { useEffect, useState } from 'react';
import type { SearchField } from '../domain/search';
import { SEARCH_FIELDS, SEARCH_FIELD_LABEL } from '../domain/search';
import type { SearchHit, SearchProvider } from '../data/providers';
import { StatusBadge } from './StatusBadge';

interface Props {
  providers: SearchProvider[];
  version: number; // bump to re-run search when data changes
  onSelect: (hit: SearchHit) => void;
  onFocus?: () => void;
}

export function SearchPanel({ providers, version, onSelect, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const [field, setField] = useState<SearchField>('all');
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const all = (await Promise.all(providers.map((p) => p.search(query, field)))).flat();
      if (!cancelled) setHits(all);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, field, providers, version]);

  return (
    <section className="search" aria-label="ค้นหาที่อยู่">
      <div className="search-row">
        <input
          type="search"
          className="search-input"
          placeholder="ค้นหา บ้านเลขที่ ซอย ถนน หมู่บ้าน จุดสังเกต"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={onFocus}
          aria-label="คำค้นหา"
        />
        <select value={field} onChange={(e) => setField(e.target.value as SearchField)} aria-label="ประเภทการค้นหา" className="search-field">
          {SEARCH_FIELDS.map((f) => (
            <option key={f} value={f}>{SEARCH_FIELD_LABEL[f]}</option>
          ))}
        </select>
      </div>
      {query.trim() && (
        <div className="results" role="list" aria-label="ผลการค้นหา">
          <div className="results-meta">พบ {hits.length} รายการ · ค้นจากข้อมูลที่บันทึกในระบบ</div>
          {hits.map((h) => (
            <button key={`${h.providerId}-${h.id}`} role="listitem" className="result" onClick={() => onSelect(h)}>
              <span className="result-label">{h.label}</span>
              {h.point?.landmark && <span className="result-sub">จุดสังเกต: {h.point.landmark}</span>}
              <span className="result-meta">
                {h.position.lat.toFixed(6)}, {h.position.lng.toFixed(6)} · แหล่ง: {h.source}
                {h.point && <StatusBadge status={h.point.verification_status} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
