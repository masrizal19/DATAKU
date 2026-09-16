import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Worker, MasterWorker } from '../types';

export interface DatakuWorker {
  id: string;
  mandor_id?: string | null;
  name: string;
  job_type: string;
  phone?: string | null;
  address?: string | null;
  daily_rate: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DatakuWeekWorker {
  id: string;
  project_id: string;
  week_id?: string | null;
  worker_id: string;
  job_type?: string | null;
  daily_rate: number;
  work_days: number;
  total_wage: number;
  payment_status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatakuWorkerPayment {
  id: string;
  project_id: string;
  week_id?: string | null;
  week_worker_id?: string | null;
  worker_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string | null;
  receipt_attachment_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const workerService = {
  // 1. MASTER TUKANG (public.dataku_workers)
  async getMasterWorkers(mandorId?: string): Promise<DatakuWorker[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    try {
      let query = supabase
        .from('dataku_workers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching dataku_workers:', error);
        throw error;
      }
      return (data as DatakuWorker[]) || [];
    } catch (err) {
      console.error('Failed to load master workers:', err);
      throw err;
    }
  },

  async createMasterWorker(worker: {
    mandor_id?: string;
    name: string;
    job_type?: string;
    phone?: string;
    address?: string;
    daily_rate: number;
    is_active?: boolean;
  }): Promise<DatakuWorker> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const mandorId = worker.mandor_id || localStorage.getItem('dataku_mandor_id') || 'MDR-PAUJI';
    const { data, error } = await supabase
      .from('dataku_workers')
      .insert({
        mandor_id: mandorId,
        name: worker.name.trim(),
        job_type: worker.job_type || 'Tukang',
        phone: worker.phone || '',
        address: worker.address || '',
        daily_rate: Number(worker.daily_rate) || 0,
        is_active: worker.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dataku_worker:', error);
      throw error;
    }
    return data as DatakuWorker;
  },

  async updateMasterWorker(id: string, updates: Partial<DatakuWorker>): Promise<DatakuWorker> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.created_at;

    const { data, error } = await supabase
      .from('dataku_workers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating dataku_worker:', error);
      throw error;
    }
    return data as DatakuWorker;
  },

  async deactivateMasterWorker(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('dataku_workers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deactivating dataku_worker:', error);
      throw error;
    }
  },

  async deleteMasterWorker(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('dataku_workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dataku_worker:', error);
      throw error;
    }
  },

  // 2. PENUGASAN MINGGUAN TUKANG (public.dataku_week_workers)
  async getWeekWorkers(projectId?: string): Promise<DatakuWeekWorker[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    try {
      let query = supabase.from('dataku_week_workers').select('*');
      if (projectId) {
        query = query.eq('project_id', String(projectId));
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching dataku_week_workers:', error);
        throw error;
      }
      return (data as DatakuWeekWorker[]) || [];
    } catch (err) {
      console.error('Failed to load week workers:', err);
      throw err;
    }
  },

  async assignWorkerToWeek(data: {
    project_id: string;
    week_id?: string | null;
    worker_id: string;
    job_type?: string;
    daily_rate: number;
    work_days: number;
    total_wage?: number;
    payment_status?: string;
    notes?: string;
  }): Promise<DatakuWeekWorker> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const days = Number(data.work_days) || 0;
    const rate = Number(data.daily_rate) || 0;
    const totalWage = data.total_wage ?? (days * rate);

    const { data: created, error } = await supabase
      .from('dataku_week_workers')
      .insert({
        project_id: String(data.project_id),
        week_id: data.week_id || null,
        worker_id: data.worker_id,
        job_type: data.job_type || 'Tukang',
        daily_rate: rate,
        work_days: days,
        total_wage: totalWage,
        payment_status: data.payment_status || 'BELUM_DIBAYAR',
        notes: data.notes || ''
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting dataku_week_worker:', error);
      throw error;
    }
    return created as DatakuWeekWorker;
  },

  async updateWeekWorker(id: string, updates: Partial<DatakuWeekWorker>): Promise<DatakuWeekWorker> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.created_at;

    if (payload.work_days !== undefined && payload.daily_rate !== undefined) {
      payload.total_wage = Number(payload.work_days) * Number(payload.daily_rate);
    }

    const { data, error } = await supabase
      .from('dataku_week_workers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating dataku_week_worker:', error);
      throw error;
    }
    return data as DatakuWeekWorker;
  },

  async deleteWeekWorker(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('dataku_week_workers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dataku_week_worker:', error);
      throw error;
    }
  },

  // 3. PEMBAYARAN UPAH TUKANG (public.dataku_worker_payments)
  async getWorkerPayments(projectId?: string): Promise<DatakuWorkerPayment[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    try {
      let query = supabase.from('dataku_worker_payments').select('*');
      if (projectId) {
        query = query.eq('project_id', String(projectId));
      }
      const { data, error } = await query.order('payment_date', { ascending: false });
      if (error) {
        console.error('Error fetching dataku_worker_payments:', error);
        throw error;
      }
      return (data as DatakuWorkerPayment[]) || [];
    } catch (err) {
      console.error('Failed to load worker payments:', err);
      throw err;
    }
  },

  async createWorkerPayment(payment: {
    project_id: string;
    week_id?: string | null;
    week_worker_id?: string | null;
    worker_id: string;
    amount: number;
    payment_date?: string;
    payment_method?: string;
    notes?: string;
    receipt_attachment_id?: string | null;
  }): Promise<DatakuWorkerPayment> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const { data, error } = await supabase
      .from('dataku_worker_payments')
      .insert({
        project_id: String(payment.project_id),
        week_id: payment.week_id || null,
        week_worker_id: payment.week_worker_id || null,
        worker_id: payment.worker_id,
        amount: Number(payment.amount) || 0,
        payment_date: payment.payment_date || new Date().toISOString().substring(0, 10),
        payment_method: payment.payment_method || 'Kas Tunai',
        notes: payment.notes || '',
        receipt_attachment_id: payment.receipt_attachment_id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting dataku_worker_payment:', error);
      throw error;
    }
    return data as DatakuWorkerPayment;
  }
};

/**
 * Helper to map Supabase dataku_week_workers & dataku_workers & payments into UI Worker type
 */
export function mapSupabaseToAppWorkers(
  weekWorkers: DatakuWeekWorker[],
  masterWorkers: DatakuWorker[],
  payments: DatakuWorkerPayment[]
): Worker[] {
  const masterMap = new Map<string, DatakuWorker>();
  masterWorkers.forEach(mw => masterMap.set(mw.id, mw));

  return weekWorkers.map(ww => {
    const mw = masterMap.get(ww.worker_id);
    const workerName = mw ? mw.name : 'Tukang';
    const workerPosition = ww.job_type || mw?.job_type || 'Tukang';
    const dailyRate = Number(ww.daily_rate) || (mw ? Number(mw.daily_rate) : 0);
    const workDays = Number(ww.work_days) || 0;
    const totalWages = Number(ww.total_wage) || (workDays * dailyRate);

    // Calculate total payments for this week_worker or worker in project
    const matchingPayments = payments.filter(
      p => p.week_worker_id === ww.id || (p.worker_id === ww.worker_id && p.project_id === ww.project_id)
    );
    const totalPaid = matchingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    let status: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' = 'BELUM_DIBAYAR';
    if (totalPaid >= totalWages && totalWages > 0) {
      status = 'LUNAS';
    } else if (totalPaid > 0) {
      status = 'SEBAGIAN';
    } else if (ww.payment_status === 'LUNAS' || ww.payment_status === 'SEBAGIAN' || ww.payment_status === 'BELUM_DIBAYAR') {
      status = ww.payment_status;
    }

    const latestPayment = matchingPayments[0];

    // Extract week number from notes or defaults
    let weekNumber: number | undefined = undefined;
    if (ww.notes) {
      const match = ww.notes.match(/Minggu\s*(\d+)/i);
      if (match && match[1]) {
        weekNumber = parseInt(match[1], 10);
      }
    }
    if (!weekNumber) {
      weekNumber = 2; // Default active week
    }

    return {
      id: ww.id,
      projectId: ww.project_id,
      name: workerName,
      position: workerPosition,
      daysWorked: workDays,
      dailyRate: dailyRate,
      totalWages: totalWages,
      status: status,
      paymentDate: latestPayment?.payment_date,
      paymentMethod: latestPayment?.payment_method || 'Kas Tunai',
      notes: ww.notes || undefined,
      weekNumber: weekNumber,
      masterWorkerId: ww.worker_id
    };
  });
}

/**
 * Helper to map DatakuWorker to UI MasterWorker
 */
export function mapToMasterWorker(dw: DatakuWorker): MasterWorker {
  return {
    id: dw.id,
    name: dw.name,
    position: dw.job_type,
    dailyRate: Number(dw.daily_rate) || 0,
    phone: dw.phone || undefined,
    specialty: dw.job_type
  };
}
