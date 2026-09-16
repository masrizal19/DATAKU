import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseMaterial, SupabaseMaterialTransaction } from '../types/supabase';
import { Material, MaterialLog, MaterialCategory } from '../types';
import { isUuidFormat } from '../utils/uuid';

export const materialService = {
  async getMaterials(projectId?: string): Promise<SupabaseMaterial[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    let query = supabase.from('materials').select('*');
    if (projectId && isUuidFormat(projectId)) {
      query = query.eq('project_id', String(projectId));
    }
    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error getting materials:', error);
      throw error;
    }
    return data || [];
  },

  async createMaterial(material: {
    project_id: string;
    name: string;
    category: string;
    unit: string;
    stock: number;
    minimum_stock?: number;
    created_by?: string;
  }): Promise<SupabaseMaterial> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(material.project_id)) {
      throw new Error('Project ID tidak valid.');
    }
    const insertData: Record<string, any> = {
      project_id: material.project_id.trim(),
      name: material.name.trim(),
      category: material.category,
      unit: material.unit || 'pcs',
      stock: Number(material.stock) || 0,
      minimum_stock: Number(material.minimum_stock) || 5
    };

    if (material.created_by && isUuidFormat(material.created_by)) {
      insertData.created_by = material.created_by.trim();
    }

    const { data, error } = await supabase
      .from('materials')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating material:', error);
      throw error;
    }
    return data;
  },

  async updateMaterialStock(id: string, newStock: number): Promise<SupabaseMaterial> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Material ID tidak valid.');
    }
    const { data, error } = await supabase
      .from('materials')
      .update({ stock: Math.max(0, Number(newStock) || 0) })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating material stock:', error);
      throw error;
    }
    return data;
  },

  async getMaterialTransactions(projectId?: string): Promise<SupabaseMaterialTransaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    let query = supabase.from('material_transactions').select('*');
    if (projectId && isUuidFormat(projectId)) {
      query = query.eq('project_id', String(projectId));
    }
    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error getting material transactions:', error);
      throw error;
    }
    return data || [];
  },

  async createMaterialTransaction(log: {
    project_id: string;
    material_id: string;
    type?: string;
    transaction_type?: string;
    quantity: number;
    unit_price?: number;
    supplier?: string;
    purpose?: string;
    transaction_date?: string;
    description?: string;
    created_by?: string;
  }): Promise<SupabaseMaterialTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(log.project_id)) {
      throw new Error('Project ID tidak valid.');
    }
    if (!isUuidFormat(log.material_id)) {
      throw new Error('Material ID tidak valid.');
    }
    const txType = log.transaction_type || log.type || 'in';
    const insertData: Record<string, any> = {
      project_id: log.project_id.trim(),
      material_id: log.material_id.trim(),
      transaction_type: txType,
      quantity: Number(log.quantity) || 0,
      unit_price: Number(log.unit_price) || 0,
      supplier: log.supplier || '',
      purpose: log.purpose || '',
      transaction_date: log.transaction_date || new Date().toISOString().substring(0, 10),
      description: log.description || ''
    };

    if (log.created_by && isUuidFormat(log.created_by)) {
      insertData.created_by = log.created_by.trim();
    }

    const { data, error } = await supabase
      .from('material_transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating material transaction:', error);
      throw error;
    }
    return data;
  },

  async updateMaterialTransaction(id: string, updates: {
    quantity?: number;
    unit_price?: number;
    supplier?: string;
    purpose?: string;
    transaction_date?: string;
    description?: string;
    transaction_type?: string;
  }): Promise<SupabaseMaterialTransaction> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Material transaction ID tidak valid.');
    }

    const payload: Record<string, any> = {};
    if (updates.quantity !== undefined) payload.quantity = Number(updates.quantity) || 0;
    if (updates.unit_price !== undefined) payload.unit_price = Number(updates.unit_price) || 0;
    if (updates.supplier !== undefined) payload.supplier = updates.supplier;
    if (updates.purpose !== undefined) payload.purpose = updates.purpose;
    if (updates.transaction_date !== undefined) payload.transaction_date = updates.transaction_date;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.transaction_type !== undefined) payload.transaction_type = updates.transaction_type;

    const { data, error } = await supabase
      .from('material_transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating material transaction:', error);
      throw error;
    }
    return data;
  },

  async deleteMaterialTransaction(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured.');
    }
    if (!isUuidFormat(id)) {
      throw new Error('Material transaction ID tidak valid.');
    }

    const { error } = await supabase
      .from('material_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting material transaction:', error);
      throw error;
    }
  }
};

export function mapSupabaseMaterialToApp(sm: SupabaseMaterial): Material {
  return {
    id: sm.id,
    projectId: sm.project_id,
    name: sm.name || '',
    category: (sm.category || 'Lainnya') as MaterialCategory,
    stock: Number(sm.stock) || 0,
    unit: sm.unit || 'pcs',
    minStock: Number(sm.minimum_stock) || 5
  };
}

export function mapSupabaseMaterialLogToApp(smt: SupabaseMaterialTransaction, materialsMap: Map<string, Material>): MaterialLog {
  const mat = materialsMap.get(smt.material_id);
  const matName = mat ? mat.name : 'Material';
  const matUnit = mat ? mat.unit : 'pcs';

  let type: 'MASUK' | 'KELUAR' | 'TERPAKAI' = 'MASUK';
  const rawType = (smt.transaction_type || smt.type || '').toString().toLowerCase();
  if (rawType === 'out' || rawType === 'keluar') {
    type = 'KELUAR';
  } else if (rawType === 'used' || rawType === 'terpakai') {
    type = 'TERPAKAI';
  } else {
    type = 'MASUK';
  }

  const qty = Number(smt.quantity) || 0;
  const price = Number(smt.unit_price) || 0;

  return {
    id: smt.id,
    projectId: smt.project_id,
    type: type,
    materialId: smt.material_id,
    materialName: matName,
    date: smt.transaction_date || smt.created_at || new Date().toISOString().substring(0, 10),
    amount: qty,
    unit: matUnit,
    pricePerUnit: price,
    totalPrice: qty * price,
    supplier: smt.supplier || '',
    purposeOrWork: smt.purpose || '',
    usedBy: '',
    location: '',
    notes: smt.description || '',
    photos: []
  };
}

