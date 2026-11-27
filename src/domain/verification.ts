import type { AddressPoint, VerificationStatus } from './types';

/**
 * Explicit verification action. Sets verified_at only when moving to "verified";
 * any other status clears it so the timestamp always means "verified at".
 */
export function applyVerification(
  point: AddressPoint,
  status: VerificationStatus,
  now: Date = new Date(),
): Pick<AddressPoint, 'verification_status' | 'verified_at'> {
  if (status === 'verified') {
    return {
      verification_status: 'verified',
      verified_at: point.verification_status === 'verified' && point.verified_at ? point.verified_at : now.toISOString(),
    };
  }
  return { verification_status: status, verified_at: null };
}
