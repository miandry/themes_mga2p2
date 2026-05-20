import { apiUrl } from '@/lib/apiUrl';
import type { OrderMgaRow } from '@/types/orderMga';

export async function fetchOrderMgaByMontantInt(montantInt: number): Promise<{
  data: OrderMgaRow[];
  montant_int: number;
  count: number;
}> {
  const qs = new URLSearchParams({ montant_int: String(montantInt) }).toString();
  const res = await fetch(apiUrl(`mga2p2-form/api/order-mga-match-montant?${qs}`), {
    credentials: 'same-origin',
  });
  let body: {
    error?: string;
    data?: OrderMgaRow[];
    montant_int?: number;
    count?: number;
  } | null = null;
  try {
    body = await res.json();
  }
  catch {
    /* */
  }
  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    montant_int: typeof body?.montant_int === 'number' ? body.montant_int : montantInt,
    count: typeof body?.count === 'number' ? body.count : 0,
  };
}
