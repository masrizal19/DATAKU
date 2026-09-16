export interface SupabaseProfile {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  email: string;
  avatar_url: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  owner_name: string;
  location: string;
  start_date: string;
  target_date: string;
  budget: number;
  description: string;
  status: 'active' | 'completed' | 'archived';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseFund {
  id: string;
  project_id: string;
  amount: number;
  source: string;
  payment_method: string;
  transaction_date: string;
  description: string;
  created_by?: string;
  created_at?: string;
}

export interface SupabaseTransaction {
  id: string;
  project_id: string;
  transaction_type: 'income' | 'expense' | string;
  type?: string;
  category: string;
  amount: number;
  recipient: string;
  description: string;
  transaction_date: string;
  reference_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMaterial {
  id: string;
  project_id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minimum_stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMaterialTransaction {
  id: string;
  project_id: string;
  material_id: string;
  transaction_type: 'in' | 'out' | 'used' | string;
  type?: string;
  quantity: number;
  unit_price?: number;
  supplier?: string;
  purpose?: string;
  transaction_date: string;
  description: string;
  created_by?: string;
  created_at?: string;
}

export interface SupabaseWorker {
  id: string;
  project_id: string;
  name: string;
  position: string;
  phone: string;
  daily_rate: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseWorkerPayment {
  id: string;
  project_id: string;
  worker_id: string;
  work_days: number;
  daily_rate: number;
  bonus: number;
  deduction: number;
  total_amount: number;
  payment_date: string;
  payment_method: string;
  status: 'unpaid' | 'partial' | 'paid';
  notes: string;
  created_by?: string;
  created_at?: string;
}

export interface SupabaseDailyReport {
  id: string;
  project_id: string;
  report_date: string;
  weather: string;
  worker_count: number;
  work_description: string;
  materials_used: string;
  obstacles: string;
  notes: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseAttachment {
  id: string;
  project_id: string;
  reference_type: 'fund' | 'material' | 'transaction' | 'worker_payment' | 'daily_report' | 'profile';
  reference_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_by?: string;
  created_at?: string;
}
