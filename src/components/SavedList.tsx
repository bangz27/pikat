import type { AddressPoint } from '../domain/types';
import { formatAddress } from '../domain/labels';
import { StatusBadge } from './StatusBadge';

export function SavedList({ points, selectedId, onSelect }: {
  points: AddressPoint[];
  selectedId: string | null;
  onSelect: (p: AddressPoint) => void;
}) {
  if (points.length === 0) {
    return <p className="empty">ยังไม่มีตำแหน่งที่บันทึก — กด “เพิ่มตำแหน่ง” หรือ “นำเข้า CSV”</p>;
  }
  return (
    <ul className="saved" aria-label="ตำแหน่งที่บันทึก">
      {points.slice(0, 100).map((p) => (
        <li key={p.id}>
          <button className={`saved-item ${p.id === selectedId ? 'active' : ''}`} onClick={() => onSelect(p)}>
            <span className="result-label">{formatAddress(p)}</span>
            <StatusBadge status={p.verification_status} />
          </button>
        </li>
      ))}
      {points.length > 100 && <li className="hint">แสดง 100 จาก {points.length} รายการ ใช้การค้นหาเพื่อหาเพิ่ม</li>}
    </ul>
  );
}
