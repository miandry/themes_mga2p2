/** JSON row from mga2p2-form order list / detail APIs */
export interface OrderMgaRow {
  nid: number;
  title: string;
  path: string;
  created: number;
  remain_minutes: number;
  deadline: number;
  remaining_seconds: number;
  expired: boolean;
  montant?: string | null;
  phone?: string | null;
  nom?: string | null;
  reference?: string | null;
  currency?: string | null;
  bank_name?: string | null;
  payment_type?: string | null;
  status?: string | null;
  user_info?: string | null;
  receipt_filename?: string | null;
  /** Public URL path for field_image (payment proof); list + detail API */
  payment_proof_url?: string | null;
}
