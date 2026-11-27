import type { VerificationStatus } from '../domain/types';
import { STATUS_LABEL } from '../domain/labels';

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}
