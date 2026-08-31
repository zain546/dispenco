export interface BatchExpiryDetails {
  days: number;
  isExpired: boolean;
  isNear: boolean;
  label: string;
}

export interface BatchHealthStats {
  totalStock: number;
  expiredCount: number;
  nearExpiryCount: number;
  healthyCount: number;
  nearestExpiryDate: string | null;
}

/**
 * Calculates days remaining, expiry status, and human-readable label for a batch expiry date.
 */
export function getBatchExpiryDetails(expiryDateStr: string | Date | undefined | null): BatchExpiryDetails {
  if (!expiryDateStr) {
    return { days: 0, isExpired: false, isNear: false, label: 'No Expiry' };
  }

  const exp = new Date(expiryDateStr);
  if (isNaN(exp.getTime())) {
    return { days: 0, isExpired: false, isNear: false, label: 'Invalid Date' };
  }

  const now = new Date();       
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - now.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = days <= 0;
  const isNear = days > 0 && days <= 60;

  let label = '';
  if (isExpired) {
    label = 'Expired';
  } else if (days <= 60) {
    label = `${days} days left`;
  } else {
    const months = Math.round(days / 30);
    label = `${months > 0 ? months : 1} mos left`;
  }

  return { days, isExpired, isNear, label };
}

/**
 * Computes consolidated FEFO health statistics across an array of batches.
 */
export function getBatchHealthStats<T extends { expiryDate?: string | Date; quantityRemaining?: number }>(
  batches: T[]
): BatchHealthStats {
  if (!batches || batches.length === 0) {
    return {
      totalStock: 0,
      expiredCount: 0,
      nearExpiryCount: 0,
      healthyCount: 0,
      nearestExpiryDate: null,
    };
  }

  const totalStock = batches.reduce((sum, b) => sum + (b.quantityRemaining || 0), 0);

  let expiredCount = 0;
  let nearExpiryCount = 0;
  let healthyCount = 0;

  batches.forEach((b) => {
    const details = getBatchExpiryDetails(b.expiryDate);
    if (details.isExpired) {
      expiredCount++;
    } else if (details.isNear) {
      nearExpiryCount++;
    } else {
      healthyCount++;
    }
  });

  const sorted = [...batches].sort((a, b) => {
    const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
    const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
    return dateA - dateB;
  });

  const nearestExpiryDate = sorted[0]?.expiryDate
    ? typeof sorted[0].expiryDate === 'string'
      ? sorted[0].expiryDate
      : sorted[0].expiryDate.toISOString()
    : null;

  return {
    totalStock,
    expiredCount,
    nearExpiryCount,
    healthyCount,
    nearestExpiryDate,
  };
}
