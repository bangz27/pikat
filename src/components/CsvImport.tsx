import { useState } from 'react';
import type { AddressPoint, AddressPointInput } from '../domain/types';
import type { ImportPreview } from '../domain/csv';
import { CSV_TEMPLATE, buildImportPreview, rowsToImport } from '../domain/csv';

interface Props {
  existing: AddressPoint[];
  onImport: (rows: AddressPointInput[]) => Promise<number>;
  onClose: () => void;
}

const STATUS_TEXT = { valid: 'พร้อมนำเข้า', invalid: 'ไม่ถูกต้อง', duplicate: 'ซ้ำ' } as const;

export function CsvImport({ existing, onImport, onClose }: Props) {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setDone(null);
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกิน 5 MB');
      return;
    }
    setFileName(file.name);
    setPreview(buildImportPreview(await file.text(), existing, `csv:${file.name}`));
  };

  const toSave = preview ? rowsToImport(preview, includeDuplicates) : [];

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      setDone(await onImport(toSave));
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent('﻿' + CSV_TEMPLATE)}`;

  return (
    <section className="import" aria-label="นำเข้า CSV">
      <header>
        <h2>นำเข้าที่อยู่จาก CSV</h2>
        <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
      </header>
      <p className="hint">
        คอลัมน์ที่ต้องมี: <code>house_no, latitude, longitude</code> · ข้อมูลที่นำเข้าจะเป็น “ยังไม่ยืนยัน” เสมอ ·
        รายการซ้ำจะถูกข้ามโดยไม่เขียนทับของเดิม · <a href={templateHref} download="pikat-template.csv">ดาวน์โหลดแม่แบบ</a>
      </p>
      <p className="hint warn">นำเข้าเฉพาะข้อมูลที่คุณมีสิทธิ์ใช้ ห้ามใส่ชื่อผู้รับ เบอร์โทร หรือเลขพัสดุ</p>
      <label className="file">
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} aria-label="เลือกไฟล์ CSV" />
        <span>{fileName || 'เลือกไฟล์ CSV'}</span>
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      {done !== null && <p className="success" role="status">นำเข้าสำเร็จ {done} รายการ</p>}

      {preview && (
        <>
          {preview.fileErrors.map((e) => <p key={e} className="error" role="alert">{e}</p>)}
          {preview.unknownColumns.length > 0 && <p className="hint">ไม่ใช้คอลัมน์: {preview.unknownColumns.join(', ')}</p>}
          <div className="summary" role="status" aria-label="สรุปการนำเข้า">
            <span>ทั้งหมด <b>{preview.summary.total}</b></span>
            <span className="ok">ถูกต้อง <b>{preview.summary.valid}</b></span>
            <span className="bad">ไม่ถูกต้อง <b>{preview.summary.invalid}</b></span>
            <span className="dup">ซ้ำ <b>{preview.summary.duplicate}</b></span>
          </div>
          {preview.rows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>แถว</th><th>สถานะ</th><th>บ้านเลขที่</th><th>พิกัด</th><th>หมายเหตุ</th></tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 200).map((r) => (
                    <tr key={r.line} className={`row-${r.status}`}>
                      <td>{r.line}</td>
                      <td>{STATUS_TEXT[r.status]}</td>
                      <td>{r.raw.house_no}</td>
                      <td>{r.raw.latitude}, {r.raw.longitude}</td>
                      <td>{[...r.errors, ...r.warnings, r.duplicateOf ? `ซ้ำกับ ${r.duplicateOf.startsWith('row') ? `แถว ${r.duplicateOf.slice(4)}` : 'ข้อมูลเดิม'}` : ''].filter(Boolean).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 200 && <p className="hint">แสดง 200 แถวแรก</p>}
            </div>
          )}
          {preview.summary.duplicate > 0 && (
            <label className="check">
              <input type="checkbox" checked={includeDuplicates} onChange={(e) => setIncludeDuplicates(e.target.checked)} />
              นำเข้ารายการซ้ำเป็นรายการใหม่ด้วย (ไม่เขียนทับของเดิม)
            </label>
          )}
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>ยกเลิก</button>
            <button className="btn btn-primary" disabled={busy || toSave.length === 0} onClick={confirm}>
              {busy ? 'กำลังนำเข้า…' : `ยืนยันนำเข้า ${toSave.length} รายการ`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
