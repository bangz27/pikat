import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AddressPoint, AddressPointInput, LatLng, VerificationStatus } from './domain/types';
import { createRepository } from './data';
import type { AddressRepository } from './data';
import { SavedLocationProvider } from './data/providers';
import type { SearchHit } from './data/providers';
import { getTileProvider } from './config/tiles';
import { DEFAULT_LAYER_VISIBILITY, layerOf, visiblePoints } from './domain/layers';
import type { LayerId, LayerVisibility } from './domain/layers';
import type { AddressFormValues } from './domain/formState';
import { applyMapClick, emptyForm, formCoordinate, formFromPoint } from './domain/formState';
import { findDuplicate } from './domain/duplicates';
import { formatAddress } from './domain/labels';
import { roundCoord } from './domain/geo';
import { MapView } from './components/MapView';
import { SearchPanel } from './components/SearchPanel';
import { LayerControls } from './components/LayerControls';
import { SavedList } from './components/SavedList';
import { LocationForm } from './components/LocationForm';
import { LocationDetail } from './components/LocationDetail';
import { CsvImport } from './components/CsvImport';
import { ConfirmDialog } from './components/ConfirmDialog';

type Panel = { kind: 'browse' } | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'import' };

export default function App({ repository }: { repository?: AddressRepository }) {
  const [repo, setRepo] = useState<AddressRepository | null>(repository ?? null);
  const tiles = useMemo(() => getTileProvider(), []);
  const [points, setPoints] = useState<AddressPoint[]>([]);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: 'browse' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<LatLng | null>(null);
  const [form, setForm] = useState<AddressFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [flyTarget, setFlyTarget] = useState<{ pos: LatLng; zoom: number; key: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AddressPoint | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3500);
  }, []);

  useEffect(() => {
    if (repository) return;
    createRepository().then(setRepo, (e) => setLoadError(e instanceof Error ? e.message : 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ'));
  }, [repository]);

  const reload = useCallback(async () => {
    if (!repo) return;
    try {
      setPoints(await repo.list());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
    setVersion((v) => v + 1);
  }, [repo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const providers = useMemo(() => [new SavedLocationProvider(() => pointsRef.current)], []);
  const selected = points.find((p) => p.id === selectedId) ?? null;
  const shown = useMemo(() => visiblePoints(points, layers), [points, layers]);
  const counts = useMemo(() => {
    const c: Partial<Record<LayerId, number>> = { saved: 0, landmarks: 0, verified: 0 };
    for (const p of points) c[layerOf(p)] = (c[layerOf(p)] ?? 0) + 1;
    return c;
  }, [points]);

  const flyTo = (pos: LatLng, zoom = 17) => setFlyTarget({ pos, zoom, key: Date.now() });

  const selectPoint = useCallback((p: AddressPoint) => {
    setSelectedId(p.id);
    setPanel({ kind: 'browse' });
    setSheetOpen(true);
    setFlyTarget({ pos: { lat: p.latitude, lng: p.longitude }, zoom: 17, key: Date.now() });
  }, []);

  const onSearchSelect = (hit: SearchHit) => {
    if (hit.point) selectPoint(hit.point);
    else flyTo(hit.position);
  };

  const formOpen = panel.kind === 'create' || panel.kind === 'edit';
  const onMapClick = (pos: LatLng) => {
    setInspected({ lat: roundCoord(pos.lat), lng: roundCoord(pos.lng) });
    if (formOpen) setForm((f) => applyMapClick(f, pos));
  };

  const startCreate = (at?: LatLng | null) => {
    setSelectedId(null);
    setForm(at ? applyMapClick(emptyForm(), at) : emptyForm());
    setPanel({ kind: 'create' });
    setSheetOpen(true);
  };

  const startEdit = (p: AddressPoint) => {
    setForm(formFromPoint(p));
    setPanel({ kind: 'edit', id: p.id });
  };

  const save = async (input: AddressPointInput) => {
    if (!repo) return;
    setSaving(true);
    try {
      if (panel.kind === 'edit') {
        const updated = await repo.update(panel.id, input);
        notify('บันทึกการแก้ไขแล้ว');
        setSelectedId(updated.id);
      } else {
        const dup = findDuplicate(input, points);
        if (dup) notify(`คำเตือน: ใกล้เคียง/ซ้ำกับ “${formatAddress(dup)}” (บันทึกเป็นรายการใหม่)`);
        const created = await repo.create(input);
        if (!dup) notify('บันทึกตำแหน่งแล้ว');
        setSelectedId(created.id);
      }
      setPanel({ kind: 'browse' });
      await reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const verify = async (p: AddressPoint, status: VerificationStatus) => {
    if (!repo) return;
    try {
      await repo.setVerification(p.id, status);
      await reload();
      notify('อัปเดตสถานะแล้ว');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const doDelete = async (p: AddressPoint) => {
    if (!repo) return;
    setConfirmDelete(null);
    try {
      await repo.remove(p.id);
      setSelectedId(null);
      await reload();
      notify('ลบตำแหน่งแล้ว');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'ลบไม่สำเร็จ');
    }
  };

  const importRows = async (rows: AddressPointInput[]) => {
    if (!repo) throw new Error('ยังไม่พร้อมเชื่อมต่อที่เก็บข้อมูล');
    const created = await repo.createMany(rows);
    await reload();
    return created.length;
  };

  const picked = formOpen ? formCoordinate(form) : inspected;

  let body: React.ReactNode;
  if (panel.kind === 'create' || panel.kind === 'edit') {
    body = (
      <LocationForm
        mode={panel.kind}
        values={form}
        onChange={setForm}
        onSubmit={save}
        onCancel={() => setPanel({ kind: 'browse' })}
        saving={saving}
      />
    );
  } else if (panel.kind === 'import') {
    body = <CsvImport existing={points} onImport={importRows} onClose={() => setPanel({ kind: 'browse' })} />;
  } else if (selected) {
    body = (
      <LocationDetail
        point={selected}
        onEdit={() => startEdit(selected)}
        onDelete={() => setConfirmDelete(selected)}
        onVerify={(s) => verify(selected, s)}
        onClose={() => setSelectedId(null)}
      />
    );
  } else {
    body = (
      <>
        <LayerControls visibility={layers} counts={counts} onToggle={(id) => setLayers((l) => ({ ...l, [id]: !l[id] }))} />
        <h3 className="section-title">ตำแหน่งที่บันทึก ({points.length})</h3>
        <SavedList points={points} selectedId={selectedId} onSelect={selectPoint} />
      </>
    );
  }

  return (
    <div className={`app ${sheetOpen ? 'sheet-open' : ''}`}>
      <aside className="sidebar" aria-label="แผงควบคุม">
        <div className="brand">
          <img src="/pikat.svg" alt="" width={28} height={28} />
          <div>
            <div className="brand-name">PIKAT <span className="brand-th">พิกัด</span></div>
            <div className="brand-tag">ทุกบ้าน ทุกจุด ทุกพิกัด</div>
          </div>
        </div>
        <SearchPanel providers={providers} version={version} onSelect={onSearchSelect} onFocus={() => setSheetOpen(true)} />
        <button className="sheet-handle" onClick={() => setSheetOpen((o) => !o)} aria-label={sheetOpen ? 'ย่อแผง' : 'ขยายแผง'} aria-expanded={sheetOpen}>
          <span />
        </button>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => startCreate(inspected)}>＋ เพิ่มตำแหน่ง</button>
          <button className="btn btn-ghost" onClick={() => { setPanel({ kind: 'import' }); setSheetOpen(true); }}>นำเข้า CSV</button>
        </div>
        <div className="sidebar-body">
          {loadError && <p className="error" role="alert">{loadError}</p>}
          {body}
        </div>
        <footer className="datasource" title="ที่เก็บข้อมูลปัจจุบัน">
          ที่เก็บข้อมูล: {repo?.label ?? 'กำลังเชื่อมต่อ…'}
        </footer>
      </aside>

      <main className="workspace">
        <MapView
          tiles={tiles}
          showBase={layers.base}
          points={shown}
          selectedId={selectedId}
          picked={picked}
          flyTarget={flyTarget}
          layoutKey={sheetOpen}
          onMapClick={onMapClick}
          onSelectPoint={selectPoint}
          onLocated={(p) => setInspected({ lat: roundCoord(p.lat), lng: roundCoord(p.lng) })}
          onError={notify}
        />
        <div className="coord-chip" aria-live="polite">
          {picked ? (
            <>
              <span>Lat <b>{picked.lat.toFixed(6)}</b></span>
              <span>Lng <b>{picked.lng.toFixed(6)}</b></span>
              {!formOpen && <button className="link" onClick={() => startCreate(picked)}>เพิ่มที่นี่</button>}
            </>
          ) : (
            <span>{formOpen ? 'คลิกแผนที่เพื่อเลือกพิกัด' : 'คลิกแผนที่เพื่อดูพิกัด'}</span>
          )}
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>

      {confirmDelete && (
        <ConfirmDialog
          message={`ลบ “${formatAddress(confirmDelete)}” ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบ"
          onConfirm={() => doDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
