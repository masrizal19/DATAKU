import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Worker, MasterWorker } from '../types';
import { DatakuProjectWeek } from './projectWeekService';
import { getMandorUuid, isUuidFormat } from './userService';

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
  week_id: string;
  worker_id: string;
  job_type?: string | null;
  daily_rate: number;
  work_days: number;
  total_wage?: number;
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

/**
 * Helper to map UI payment status to DB payment_status enum
 */
export function mapPaymentStatusToDB(status?: string): 'unpaid' | 'partial' | 'paid' {
  if (!status) return 'unpaid';
  const s = status.trim().toUpperCase();
  if (s === 'LUNAS' || s === 'PAID') return 'paid';
  if (s === 'SEBAGIAN' || s === 'PARTIAL') return 'partial';
  return 'unpaid';
}

/**
 * Helper to map DB payment_status to UI status string
 */
export function mapPaymentStatusFromDB(status?: string): 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' {
  if (!status) return 'BELUM_DIBAYAR';
  const s = status.trim().toLowerCase();
  if (s === 'paid' || s === 'lunas') return 'LUNAS';
  if (s === 'partial' || s === 'sebagian') return 'SEBAGIAN';
  return 'BELUM_DIBAYAR';
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
        console.warn('Error fetching dataku_workers:', error.message);
        return [];
      }
      return (data as DatakuWorker[]) || [];
    } catch (err: any) {
      console.warn('Failed to load master workers:', err?.message || err);
      return [];
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
    let mandorId = (worker.mandor_id && isUuidFormat(worker.mandor_id)) ? worker.mandor_id : await getMandorUuid();
    if (!mandorId || !isUuidFormat(mandorId)) {
      throw new Error('Mandor ID tidak valid.');
    }
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
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    if (!id) {
      throw new Error('ID worker tidak valid.');
    }

    // 1. Check if worker has history in dataku_week_workers or dataku_worker_payments
    const [{ count: weekCount, error: weekErr }, { count: payCount, error: payErr }] = await Promise.all([
      supabase
        .from('dataku_week_workers')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', String(id)),
      supabase
        .from('dataku_worker_payments')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', String(id))
    ]);

    if (weekErr) {
      console.error('Error checking dataku_week_workers:', weekErr);
    }
    if (payErr) {
      console.error('Error checking dataku_worker_payments:', payErr);
    }

    const hasWeekHistory = typeof weekCount === 'number' && weekCount > 0;
    const hasPayHistory = typeof payCount === 'number' && payCount > 0;

    if (hasWeekHistory || hasPayHistory) {
      throw new Error('Tukang ini masih memiliki riwayat penugasan atau pembayaran sehingga tidak dapat dihapus permanen.');
    }

    // 2. Perform DELETE on public.dataku_workers using worker.id
    const { error } = await supabase
      .from('dataku_workers')
      .delete()
      .eq('id', String(id));

    if (error) {
      console.error('Error deleting dataku_worker:', error);
      if (error.code === '23503' || error.message?.includes('foreign key constraint') || error.message?.includes('violates foreign key')) {
        throw new Error('Tukang ini masih memiliki riwayat penugasan atau pembayaran sehingga tidak dapat dihapus permanen.');
      }
      throw new Error(error.message || 'Gagal menghapus data tukang.');
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
        console.warn('Error fetching dataku_week_workers:', error.message);
        return [];
      }
      return (data as DatakuWeekWorker[]) || [];
    } catch (err: any) {
      console.warn('Failed to load week workers:', err?.message || err);
      return [];
    }
  },

  async assignWorkerToWeek(data: {
    project_id: string;
    week_id: string;
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

    if (!data.week_id) {
      throw new Error('Minggu proyek belum memiliki week_id dari database.');
    }

    const days = Number(data.work_days) || 0;
    const rate = Number(data.daily_rate) || 0;
    const dbStatus = mapPaymentStatusToDB(data.payment_status);

    // Check if assignment already exists for this week_id and worker_id
    const { data: existing } = await supabase
      .from('dataku_week_workers')
      .select('id')
      .eq('week_id', data.week_id)
      .eq('worker_id', data.worker_id)
      .maybeSingle();

    if (existing) {
      return await this.updateWeekWorker(existing.id, {
        job_type: data.job_type || 'Tukang',
        daily_rate: rate,
        work_days: days,
        payment_status: data.payment_status || 'BELUM_DIBAYAR',
        notes: data.notes || ''
      });
    }

    const { data: created, error } = await supabase
      .from('dataku_week_workers')
      .insert({
        project_id: String(data.project_id),
        week_id: data.week_id,
        worker_id: data.worker_id,
        job_type: data.job_type || 'Tukang',
        daily_rate: rate,
        work_days: days,
        payment_status: dbStatus,
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
    delete payload.total_wage; // Generated column calculated automatically by Postgres

    if (payload.payment_status) {
      payload.payment_status = mapPaymentStatusToDB(payload.payment_status);
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
        console.warn('Error fetching dataku_worker_payments:', error.message);
        return [];
      }
      return (data as DatakuWorkerPayment[]) || [];
    } catch (err: any) {
      console.warn('Failed to load worker payments:', err?.message || err);
      return [];
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
        payment_date: payment.payment_date ? payment.payment_date.substring(0, 10) : new Date().toISOString().substring(0, 10),
      payment_at: payment.payment_date || new Date().toISOString(),
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
  },

  async updateWorkerPayment(id: string, updates: Partial<DatakuWorkerPayment>): Promise<DatakuWorkerPayment> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    delete payload.id;
    delete payload.created_at;

    const { data, error } = await supabase
      .from('dataku_worker_payments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating dataku_worker_payment:', error);
      throw error;
    }
    return data as DatakuWorkerPayment;
  },

  async deleteWorkerPayment(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database tidak terkonfigurasi.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Payment ID tidak valid.');
    }
    const { error } = await supabase
      .from('dataku_worker_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dataku_worker_payment:', error);
      throw error;
    }
  }
};

/**
 * Helper to map Supabase dataku_week_workers & dataku_workers & payments into UI Worker type
 */
export function mapSupabaseToAppWorkers(
  weekWorkers: DatakuWeekWorker[],
  masterWorkers: DatakuWorker[],
  payments: DatakuWorkerPayment[],
  projectWeeks: DatakuProjectWeek[] = []
): Worker[] {
  const masterMap = new Map<string, DatakuWorker>();
  masterWorkers.forEach(mw => masterMap.set(mw.id, mw));

  const weekMap = new Map<string, DatakuProjectWeek>();
  projectWeeks.forEach(pw => weekMap.set(pw.id, pw));

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

    let status: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' = mapPaymentStatusFromDB(ww.payment_status);
    if (totalPaid >= totalWages && totalWages > 0) {
      status = 'LUNAS';
    } else if (totalPaid > 0) {
      status = 'SEBAGIAN';
    }

    const latestPayment = matchingPayments[0];

    // Determine week number from dataku_project_weeks or notes
    let weekNumber: number | undefined = undefined;
    let weekStartDate: string | undefined = undefined;
    let weekEndDate: string | undefined = undefined;

    if (ww.week_id && weekMap.has(ww.week_id)) {
      const pw = weekMap.get(ww.week_id)!;
      weekNumber = pw.week_number;
      weekStartDate = pw.week_start || undefined;
      weekEndDate = pw.week_end || undefined;
    } else if (ww.notes) {
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
      weekStartDate: weekStartDate,
      weekEndDate: weekEndDate,
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

