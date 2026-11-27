import type { AddressPoint, VerificationStatus } from '../domain/types';
import { VERIFICATION_STATUSES } from '../domain/types';
import { FIELD_LABEL, STATUS_LABEL, formatAddress } from '../domain/labels';
import { StatusBadge } from './StatusBadge';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('th-TH') : '—');

export function LocationDetail({ point, onEdit, onDelete, onVerify, onClose }: {
  point: AddressPoint;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: (s: VerificationStatus) => void;
  onClose: () => void;
}) {
  const rows: [string, string | null][] = [
    [FIELD_LABEL.landmark, point.landmark],
    [FIELD_LABEL.notes, point.notes],
    [FIELD_LABEL.source, point.source],
    ['พิกัด', `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`],
    ['ยืนยันเมื่อ', fmt(point.verified_at)],
    ['แก้ไขล่าสุด', fmt(point.updated_at)],
  ];
  return (
    <article className="detail" aria-label="รายละเอียดตำแหน่ง">
      <header>
        <h2>{formatAddress(point)}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
      </header>
      <StatusBadge status={point.verification_status} />
      <dl>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className="verify" role="group" aria-label="เปลี่ยนสถานะการยืนยัน">
        {VERIFICATION_STATUSES.filter((s) => s !== point.verification_status).map((s) => (
          <button key={s} className={`btn btn-sm btn-status-${s}`} onClick={() => onVerify(s)}>
            ทำเครื่องหมาย “{STATUS_LABEL[s]}”
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="btn btn-danger" onClick={onDelete}>ลบ</button>
        <button className="btn btn-primary" onClick={onEdit}>แก้ไข</button>
      </div>
    </article>
  );
}
