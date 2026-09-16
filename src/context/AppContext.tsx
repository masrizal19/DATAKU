/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { projectService, mapSupabaseProjectToProject } from '../services/projectService';
import {
  workerService,
  mapSupabaseToAppWorkers,
  mapToMasterWorker,
  DatakuWorker
} from '../services/workerService';
import { projectWeekService, DatakuProjectWeek } from '../services/projectWeekService';
import { AppState, User, Project, Transaction, Material, MaterialLog, Worker, MasterWorker, DailyReport, Notification, MaterialCategory } from '../types';
import {
  initialCurrentUser,
  initialProjects,
  initialMaterials,
  initialMaterialLogs,
  initialTransactions,
  initialWorkers,
  initialDailyReports,
  initialNotifications
} from '../mock/data';

interface AppContextType {
  state: AppState;
  masterWorkers: MasterWorker[];
  loadWorkers: () => Promise<void>;
  loginUser: (emailOrPhone: string) => void;
  logoutUser: () => void;
  addProject: (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => Promise<void> | void;
  setActiveProject: (id: string) => void;
  archiveProject: (id: string) => Promise<void> | void;
  updateProject: (proj: Project) => Promise<void> | void;
  deleteProject: (id: string) => Promise<void> | void;
  addDanaMasuk: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  addPengeluaran: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  addBarangMasuk: (log: { name: string; category: MaterialCategory; amount: number; unit: string; pricePerUnit: number; supplier: string; notes: string; photos: string[]; date: string; payWithProjectFunds: boolean }) => void;
  addBarangKeluar: (log: { materialId: string; amount: number; purposeOrWork: string; usedBy: string; notes: string; photos: string[]; date: string }) => void;
  addBarangTerpakai: (log: { materialId: string; amount: number; purposeOrWork: string; location: string; notes: string; photos: string[]; date: string }) => void;
  payWorker: (workerId: string, amountPaid: number, method: string) => Promise<void> | void;
  addWorker: (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => Promise<void> | void;
  addDailyReport: (report: Omit<DailyReport, 'id' | 'projectId'>) => void;
  deleteTransaction: (id: string) => void;
  deleteDailyReport: (id: string) => void;
  markNotificationsRead: () => void;
  triggerNotification: (message: string, type: 'WARNING' | 'ALERT' | 'INFO') => void;
  clearAllState: () => void;
  updateWorker: (worker: Worker) => Promise<void> | void;
  deleteWorker: (id: string) => Promise<void> | void;
  updateMaterial: (mat: Material) => void;
  deleteMaterial: (id: string) => void;
  updateCurrentUser: (user: User) => void;
  restoreAllState: (newState: AppState) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'DATAKU_APP_STATE';
const ACTIVE_PROJECT_KEY = 'dataku_active_project_id';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [masterWorkers, setMasterWorkers] = useState<MasterWorker[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const isAuthenticated = localStorage.getItem("dataku_auth") === "true";
    const loggedUser = localStorage.getItem("dataku_user") || "PAUJI";
    const savedActiveProject = localStorage.getItem(ACTIVE_PROJECT_KEY) || null;
    
    let loadedState: AppState;
    if (saved) {
      try {
        loadedState = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved state', e);
        loadedState = {
          currentUser: null,
          projects: [],
          activeProjectId: savedActiveProject,
          transactions: initialTransactions,
          materials: initialMaterials,
          materialLogs: initialMaterialLogs,
          workers: [],
          dailyReports: initialDailyReports,
          notifications: initialNotifications
        };
      }
    } else {
      loadedState = {
        currentUser: null,
        projects: [],
        activeProjectId: savedActiveProject,
        transactions: initialTransactions,
        materials: initialMaterials,
        materialLogs: initialMaterialLogs,
        workers: [],
        dailyReports: initialDailyReports,
        notifications: initialNotifications
      };
    }

    // Projects & Workers MUST always come from Supabase as source of truth
    loadedState.projects = [];
    loadedState.workers = [];

    if (isAuthenticated) {
      loadedState.currentUser = {
        id: `MDR-${loggedUser.toUpperCase().replace(/\s+/g, '')}`,
        name: loggedUser,
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        phone: '0812-3456-7890',
        email: 'pauji.mandor@dataku.com'
      };
    } else {
      loadedState.currentUser = null;
    }
    return loadedState;
  });

  // Load Projects directly from Supabase
  const loadProjects = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const data = await projectService.getProjects();
      const storedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      
      const mapped = data.map(p => mapSupabaseProjectToProject(p, storedActiveId));
      
      setState(prev => {
        const currentActiveId = storedActiveId || prev.activeProjectId;
        let nextActiveId = currentActiveId;
        const activeExists = mapped.some(p => p.id === nextActiveId && !p.isArchived);
        if (!activeExists) {
          const firstActive = mapped.find(p => !p.isArchived);
          nextActiveId = firstActive ? firstActive.id : (mapped[0]?.id || null);
        }

        if (nextActiveId) {
          localStorage.setItem(ACTIVE_PROJECT_KEY, nextActiveId);
        } else {
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }

        const updatedProjects = mapped.map(p => ({
          ...p,
          isActive: p.id === nextActiveId
        }));

        return {
          ...prev,
          projects: updatedProjects,
          activeProjectId: nextActiveId
        };
      });
    } catch (err) {
      console.error('Gagal memuat data proyek dari Supabase:', err);
    }
  }, []);

  // Load Workers, Week Workers, and Payments directly from Supabase
  const loadWorkers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const activeProjId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      const [rawMaster, rawWeek, rawPayments, projectWeeks] = await Promise.all([
        workerService.getMasterWorkers(),
        workerService.getWeekWorkers(),
        workerService.getWorkerPayments(),
        activeProjId ? projectWeekService.getProjectWeeks(activeProjId) : Promise.resolve([])
      ]);

      const mappedMaster = rawMaster.map(mapToMasterWorker);
      setMasterWorkers(mappedMaster);

      const mappedAppWorkers = mapSupabaseToAppWorkers(rawWeek, rawMaster, rawPayments, projectWeeks);

      setState(prev => ({
        ...prev,
        workers: mappedAppWorkers
      }));
    } catch (err) {
      console.error('Gagal memuat data pekerja dari Supabase:', err);
    }
  }, []);

  // Initial load and Realtime synchronization for public.projects
  useEffect(() => {
    loadProjects();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects]);

  // Realtime synchronization for public.dataku_workers, public.dataku_project_weeks, public.dataku_week_workers, and public.dataku_worker_payments
  useEffect(() => {
    loadWorkers();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:workers_realtime_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataku_workers'
        },
        () => {
          loadWorkers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataku_project_weeks'
        },
        () => {
          loadWorkers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataku_week_workers'
        },
        () => {
          loadWorkers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dataku_worker_payments'
        },
        () => {
          loadWorkers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadWorkers]);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loginUser = (username: string) => {
    setState(prev => ({
      ...prev,
      currentUser: {
        id: `MDR-${username.toUpperCase().replace(/\s+/g, '')}`,
        name: username,
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        phone: '0812-3456-7890',
        email: 'pauji.mandor@dataku.com'
      }
    }));
  };

  const logoutUser = () => {
    localStorage.removeItem("dataku_auth");
    localStorage.removeItem("dataku_user");
    setState(prev => ({ ...prev, currentUser: null }));
    window.location.reload();
  };

  const setActiveProject = (id: string) => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    setState(prev => ({
      ...prev,
      activeProjectId: id,
      projects: prev.projects.map(p => ({
        ...p,
        isActive: p.id === id
      }))
    }));
  };

  const addProject = async (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => {
    try {
      const mandorId = localStorage.getItem('dataku_mandor_id') || undefined;
      const created = await projectService.createProject({
        name: proj.name,
        owner_name: proj.owner,
        location: proj.location,
        start_date: proj.startDate,
        target_date: proj.targetDate,
        budget: proj.budget,
        description: proj.notes || '',
        status: 'active',
        created_by: mandorId
      });

      const newProj = mapSupabaseProjectToProject(created, created.id);
      localStorage.setItem(ACTIVE_PROJECT_KEY, created.id);

      // Default initial materials for new project
      const initialNewMaterials: Material[] = [
        { id: `MAT-${created.id}-SEMEN`, projectId: created.id, name: 'Semen Portland 50kg', category: 'Semen', stock: 0, unit: 'sak', minStock: 20 },
        { id: `MAT-${created.id}-BESI`, projectId: created.id, name: 'Besi Beton Ulir 10mm', category: 'Besi', stock: 0, unit: 'batang', minStock: 30 },
        { id: `MAT-${created.id}-PASIR`, projectId: created.id, name: 'Pasir Pasang Super', category: 'Pasir', stock: 0, unit: 'kol', minStock: 5 }
      ];

      setState(prev => ({
        ...prev,
        projects: [newProj, ...prev.projects.filter(p => p.id !== created.id).map(p => ({ ...p, isActive: false }))],
        activeProjectId: created.id,
        materials: [...prev.materials, ...initialNewMaterials]
      }));

      triggerNotification(`Proyek "${created.name}" berhasil dibuat.`, 'INFO');
      await loadProjects();
    } catch (err: any) {
      console.error('Gagal menambahkan proyek:', err);
      triggerNotification(`Gagal membuat proyek: ${err?.message || 'Terjadi kesalahan sistem'}`, 'ALERT');
      throw err;
    }
  };

  const archiveProject = async (id: string) => {
    try {
      const targetProj = state.projects.find(p => p.id === id);
      const newStatus = targetProj?.isArchived ? 'active' : 'archived';

      await projectService.setProjectStatus(id, newStatus);

      setState(prev => {
        const isArchivingActive = prev.activeProjectId === id;
        const updatedProjects = prev.projects.map(p => 
          p.id === id ? { ...p, isArchived: newStatus === 'archived', isActive: newStatus === 'active' && !isArchivingActive ? p.isActive : false } : p
        );
        
        let nextActive = prev.activeProjectId;
        if (isArchivingActive && newStatus === 'archived') {
          const remaining = updatedProjects.filter(p => !p.isArchived);
          nextActive = remaining.length > 0 ? remaining[0].id : null;
          if (nextActive) {
            localStorage.setItem(ACTIVE_PROJECT_KEY, nextActive);
            updatedProjects.forEach(p => {
              if (p.id === nextActive) p.isActive = true;
            });
          } else {
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
          }
        }

        return {
          ...prev,
          projects: updatedProjects,
          activeProjectId: nextActive
        };
      });

      triggerNotification(newStatus === 'archived' ? 'Proyek berhasil diarsipkan.' : 'Proyek berhasil diaktifkan kembali.', 'INFO');
      await loadProjects();
    } catch (err: any) {
      console.error('Gagal mengubah status proyek:', err);
      triggerNotification(`Gagal mengubah status proyek: ${err?.message || 'Terjadi kesalahan sistem'}`, 'ALERT');
      throw err;
    }
  };

  const updateProject = async (proj: Project) => {
    try {
      await projectService.updateProject(proj.id, {
        name: proj.name,
        owner_name: proj.owner,
        location: proj.location,
        start_date: proj.startDate,
        target_date: proj.targetDate,
        budget: proj.budget,
        description: proj.notes,
        status: proj.isArchived ? 'archived' : 'active'
      });

      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === proj.id ? proj : p)
      }));

      triggerNotification(`Proyek "${proj.name}" berhasil diperbarui.`, 'INFO');
      await loadProjects();
    } catch (err: any) {
      console.error('Gagal memperbarui proyek:', err);
      triggerNotification(`Gagal memperbarui proyek: ${err?.message || 'Terjadi kesalahan sistem'}`, 'ALERT');
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectService.deleteProject(id);

      setState(prev => {
        const updatedProjects = prev.projects.filter(p => p.id !== id);
        const wasActive = prev.activeProjectId === id;
        let nextActive = prev.activeProjectId;
        if (wasActive) {
          const remaining = updatedProjects.filter(p => !p.isArchived);
          nextActive = remaining.length > 0 ? remaining[0].id : (updatedProjects.length > 0 ? updatedProjects[0].id : null);
          if (nextActive) {
            localStorage.setItem(ACTIVE_PROJECT_KEY, nextActive);
            updatedProjects.forEach(p => {
              if (p.id === nextActive) p.isActive = true;
            });
          } else {
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
          }
        }

        return {
          ...prev,
          projects: updatedProjects,
          activeProjectId: nextActive,
          transactions: prev.transactions.filter(t => t.projectId !== id),
          materials: prev.materials.filter(m => m.projectId !== id),
          materialLogs: prev.materialLogs.filter(ml => ml.projectId !== id),
          workers: prev.workers.filter(w => w.projectId !== id),
          dailyReports: prev.dailyReports.filter(dr => dr.projectId !== id),
          notifications: prev.notifications.filter(n => n.projectId !== id)
        };
      });

      triggerNotification('Proyek berhasil dihapus permanen.', 'INFO');
      await loadProjects();
    } catch (err: any) {
      console.error('Gagal menghapus proyek:', err);
      triggerNotification(`Gagal menghapus proyek: ${err?.message || 'Terjadi kesalahan sistem'}`, 'ALERT');
      throw err;
    }
  };

  // 1. ADD DANA MASUK
  const addDanaMasuk = (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => {
    if (!state.activeProjectId) return;
    const newTx: Transaction = {
      id: `TX-${Date.now().toString().slice(-5)}`,
      projectId: state.activeProjectId,
      type: 'DANA_MASUK',
      ...tx
    };

    setState(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions]
    }));

    triggerNotification(`Dana Masuk sebesar Rp ${tx.amount.toLocaleString('id-ID')} berhasil dicatat dari ${tx.sourceOrRecipient}.`, 'INFO');
  };

  // 2. ADD PENGELUARAN AMAN
  const addPengeluaran = (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => {
    if (!state.activeProjectId) return;
    const newTx: Transaction = {
      id: `TX-${Date.now().toString().slice(-5)}`,
      projectId: state.activeProjectId,
      type: 'PENGELUARAN',
      ...tx
    };

    setState(prev => {
      // Check current project balance to warning if low
      const projectTxs = prev.transactions.filter(t => t.projectId === prev.activeProjectId);
      const totalDana = projectTxs.filter(t => t.type === 'DANA_MASUK').reduce((acc, c) => acc + c.amount, 0);
      const totalKeluar = projectTxs.filter(t => t.type === 'PENGELUARAN' || t.type === 'UPAH_TUKANG').reduce((acc, c) => acc + c.amount, 0);
      const curBalance = totalDana - totalKeluar;
      
      const updatedTxs = [newTx, ...prev.transactions];
      const newBalance = curBalance - tx.amount;

      const updatedNotifs = [...prev.notifications];
      if (newBalance < 10000000 && curBalance >= 10000000) {
        updatedNotifs.unshift({
          id: `NT-${Date.now()}`,
          projectId: prev.activeProjectId!,
          message: 'Saldo proyek mulai menipis (di bawah Rp 10.000.000).',
          date: new Date().toISOString(),
          isRead: false,
          type: 'WARNING'
        });
      }

      return {
        ...prev,
        transactions: updatedTxs,
        notifications: updatedNotifs
      };
    });
  };

  // 3. BARANG MASUK
  const addBarangMasuk = (log: {
    name: string;
    category: MaterialCategory;
    amount: number;
    unit: string;
    pricePerUnit: number;
    supplier: string;
    notes: string;
    photos: string[];
    date: string;
    payWithProjectFunds: boolean;
  }) => {
    if (!state.activeProjectId) return;
    const pId = state.activeProjectId;
    
    setState(prev => {
      // Find or create material in project
      let material = prev.materials.find(m => m.projectId === pId && m.name.toLowerCase() === log.name.toLowerCase());
      let updatedMaterials = [...prev.materials];
      
      if (!material) {
        material = {
          id: `MAT-${Date.now().toString().slice(-5)}`,
          projectId: pId,
          name: log.name,
          category: log.category,
          stock: log.amount,
          unit: log.unit,
          minStock: log.category === 'Semen' ? 20 : log.category === 'Besi' ? 30 : 5
        };
        updatedMaterials.push(material);
      } else {
        updatedMaterials = prev.materials.map(m => 
          m.id === material!.id ? { ...m, stock: m.stock + log.amount } : m
        );
      }

      // Record Material Log
      const newLogId = `MLOG-${Date.now().toString().slice(-5)}`;
      const newMaterialLog: MaterialLog = {
        id: newLogId,
        projectId: pId,
        type: 'MASUK',
        materialId: material.id,
        materialName: material.name,
        date: log.date,
        amount: log.amount,
        unit: log.unit,
        pricePerUnit: log.pricePerUnit,
        totalPrice: log.amount * log.pricePerUnit,
        supplier: log.supplier,
        notes: log.notes,
        photos: log.photos
      };

      // Record Transaction if pay with project funds
      let updatedTransactions = [...prev.transactions];
      if (log.payWithProjectFunds) {
        const newTx: Transaction = {
          id: `TX-${Date.now().toString().slice(-5)}`,
          projectId: pId,
          type: 'PENGELUARAN',
          date: log.date,
          amount: log.amount * log.pricePerUnit,
          category: 'Material',
          sourceOrRecipient: log.supplier || 'Toko Material',
          paymentMethod: 'Kas Tunai',
          notes: `Pembelian ${log.amount} ${log.unit} ${log.name}`,
          photos: log.photos
        };
        updatedTransactions.unshift(newTx);
      }

      return {
        ...prev,
        materials: updatedMaterials,
        materialLogs: [newMaterialLog, ...prev.materialLogs],
        transactions: updatedTransactions
      };
    });

    triggerNotification(`Barang Masuk: ${log.amount} ${log.unit} ${log.name} berhasil ditambahkan.`, 'INFO');
  };

  // 4. BARANG KELUAR (dari gudang)
  const addBarangKeluar = (log: {
    materialId: string;
    amount: number;
    purposeOrWork: string;
    usedBy: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) return;
    
    setState(prev => {
      const material = prev.materials.find(m => m.id === log.materialId);
      if (!material) return prev;

      const newStock = Math.max(0, material.stock - log.amount);
      const updatedMaterials = prev.materials.map(m => 
        m.id === log.materialId ? { ...m, stock: newStock } : m
      );

      const newLogId = `MLOG-${Date.now().toString().slice(-5)}`;
      const newMaterialLog: MaterialLog = {
        id: newLogId,
        projectId: prev.activeProjectId!,
        type: 'KELUAR',
        materialId: log.materialId,
        materialName: material.name,
        date: log.date,
        amount: log.amount,
        unit: material.unit,
        purposeOrWork: log.purposeOrWork,
        usedBy: log.usedBy,
        notes: log.notes,
        photos: log.photos
      };

      const updatedNotifs = [...prev.notifications];
      if (newStock <= material.minStock && newStock > 0) {
        updatedNotifs.unshift({
          id: `NT-${Date.now()}`,
          projectId: prev.activeProjectId!,
          message: `Stok ${material.name} mulai menipis (Sisa ${newStock} ${material.unit}).`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'ALERT'
        });
      } else if (newStock === 0) {
        updatedNotifs.unshift({
          id: `NT-${Date.now()}`,
          projectId: prev.activeProjectId!,
          message: `Stok ${material.name} HABIS! Segera lakukan pemesanan ulang.`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'WARNING'
        });
      }

      return {
        ...prev,
        materials: updatedMaterials,
        materialLogs: [newMaterialLog, ...prev.materialLogs],
        notifications: updatedNotifs
      };
    });

    triggerNotification('Barang Keluar berhasil dicatat.', 'INFO');
  };

  // 5. BARANG TERPAKAI (langsung dipekerjakan)
  const addBarangTerpakai = (log: {
    materialId: string;
    amount: number;
    purposeOrWork: string;
    location: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) return;

    setState(prev => {
      const material = prev.materials.find(m => m.id === log.materialId);
      if (!material) return prev;

      // Rule: Jangan mengurangi stok dua kali jika barang sebelumnya sudah dicatat sebagai barang keluar
      // Di sini kita catat di material log sebagai TERPAKAI, dan kita kurangi stok material langsung.
      const newStock = Math.max(0, material.stock - log.amount);
      const updatedMaterials = prev.materials.map(m => 
        m.id === log.materialId ? { ...m, stock: newStock } : m
      );

      const newLogId = `MLOG-${Date.now().toString().slice(-5)}`;
      const newMaterialLog: MaterialLog = {
        id: newLogId,
        projectId: prev.activeProjectId!,
        type: 'TERPAKAI',
        materialId: log.materialId,
        materialName: material.name,
        date: log.date,
        amount: log.amount,
        unit: material.unit,
        purposeOrWork: log.purposeOrWork,
        location: log.location,
        notes: log.notes,
        photos: log.photos
      };

      const updatedNotifs = [...prev.notifications];
      if (newStock <= material.minStock && newStock > 0) {
        updatedNotifs.unshift({
          id: `NT-${Date.now()}`,
          projectId: prev.activeProjectId!,
          message: `Stok ${material.name} mulai menipis (Sisa ${newStock} ${material.unit}).`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'ALERT'
        });
      } else if (newStock === 0) {
        updatedNotifs.unshift({
          id: `NT-${Date.now()}`,
          projectId: prev.activeProjectId!,
          message: `Stok ${material.name} HABIS! Segera lakukan pemesanan ulang.`,
          date: new Date().toISOString(),
          isRead: false,
          type: 'WARNING'
        });
      }

      return {
        ...prev,
        materials: updatedMaterials,
        materialLogs: [newMaterialLog, ...prev.materialLogs],
        notifications: updatedNotifs
      };
    });

    triggerNotification('Barang Terpakai berhasil dicatat.', 'INFO');
  };

  // 6. PAY WORKER
  const payWorker = async (workerId: string, amountPaid: number, method: string) => {
    if (!state.activeProjectId) return;
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;

    let newStatus: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' = worker.status;
    if (amountPaid >= worker.totalWages) {
      newStatus = 'LUNAS';
    } else if (amountPaid > 0) {
      newStatus = 'SEBAGIAN';
    }

    try {
      if (isSupabaseConfigured) {
        await workerService.createWorkerPayment({
          project_id: String(state.activeProjectId),
          week_worker_id: worker.id,
          worker_id: worker.masterWorkerId || worker.id,
          amount: amountPaid,
          payment_method: method,
          notes: `Pembayaran Upah untuk ${worker.name} (${worker.position})`
        });

        await workerService.updateWeekWorker(worker.id, {
          payment_status: newStatus
        });

        await loadWorkers();
      } else {
        setState(prev => ({
          ...prev,
          workers: prev.workers.map(w => w.id === workerId ? { ...w, status: newStatus } : w)
        }));
      }

      // Record transaction
      const newTx: Transaction = {
        id: `TX-${Date.now().toString().slice(-5)}`,
        projectId: state.activeProjectId,
        type: 'UPAH_TUKANG',
        date: new Date().toISOString(),
        amount: amountPaid,
        category: 'Upah Tukang',
        sourceOrRecipient: worker.name,
        paymentMethod: method,
        notes: `Pembayaran Upah untuk ${worker.name} (${worker.position})`,
        photos: [],
        status: newStatus
      };

      setState(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions]
      }));

      triggerNotification(`Pembayaran upah ${worker.name} berhasil dicatat.`, 'INFO');
    } catch (err: any) {
      console.error('Failed to pay worker:', err);
      triggerNotification(`Gagal mencatat pembayaran: ${err.message || 'Error'}`, 'WARNING');
    }
  };

  const addWorker = async (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => {
    if (!state.activeProjectId) return;
    const currentMandorId = state.currentUser?.id || localStorage.getItem('dataku_mandor_id') || 'MDR-PAUJI';

    try {
      if (isSupabaseConfigured) {
        let mWorker = masterWorkers.find(
          mw => mw.name.trim().toLowerCase() === worker.name.trim().toLowerCase()
        );
        let mWorkerId = worker.masterWorkerId || mWorker?.id;

        if (!mWorkerId) {
          const created = await workerService.createMasterWorker({
            mandor_id: currentMandorId,
            name: worker.name.trim(),
            job_type: worker.position,
            daily_rate: worker.dailyRate,
            is_active: true
          });
          mWorkerId = created.id;
        }

        const targetWeekNum = worker.weekNumber || 2;
        const activeProj = state.projects.find(p => p.id === state.activeProjectId);

        // Ensure project weeks exist in database and fetch week_id
        const pWeeks = await projectWeekService.ensureProjectWeeks(
          state.activeProjectId,
          activeProj?.startDate
        );

        let targetWeek = pWeeks.find(pw => pw.week_number === targetWeekNum);
        if (!targetWeek && pWeeks.length > 0) {
          targetWeek = pWeeks[0];
        }

        if (!targetWeek || !targetWeek.id) {
          throw new Error('Minggu proyek belum memiliki week_id dari database.');
        }

        const weekId = targetWeek.id;
        const notes = worker.notes || `Minggu ${targetWeekNum}`;

        await workerService.assignWorkerToWeek({
          project_id: String(state.activeProjectId),
          week_id: weekId,
          worker_id: mWorkerId,
          job_type: worker.position,
          daily_rate: worker.dailyRate,
          work_days: worker.daysWorked,
          payment_status: worker.status || 'BELUM_DIBAYAR',
          notes: notes
        });

        await loadWorkers();
      } else {
        const newId = `WRK-${Date.now().toString().slice(-4)}`;
        const newWorker: Worker = {
          ...worker,
          id: newId,
          projectId: state.activeProjectId,
          totalWages: (worker.daysWorked * worker.dailyRate) + (worker.bonus || 0) - (worker.potongan || 0)
        };
        setState(prev => ({
          ...prev,
          workers: [...prev.workers, newWorker]
        }));
      }

      triggerNotification(`Pekerja ${worker.name} berhasil ditambahkan.`, 'INFO');
    } catch (err: any) {
      console.error('Failed to add worker:', err);
      triggerNotification(`Gagal menambahkan pekerja: ${err.message || 'Error'}`, 'WARNING');
    }
  };

  // 7. DAILY REPORT
  const addDailyReport = (report: Omit<DailyReport, 'id' | 'projectId'>) => {
    if (!state.activeProjectId) return;
    
    const newReport: DailyReport = {
      id: `REP-${Date.now().toString().slice(-4)}`,
      projectId: state.activeProjectId,
      ...report
    };

    setState(prev => {
      // Remove any daily report notification warning if today's report is saved
      const filteredNotifs = prev.notifications.filter(n => 
        !(n.projectId === prev.activeProjectId && n.message.toLowerCase().includes('laporan hari ini belum dibuat'))
      );

      return {
        ...prev,
        dailyReports: [newReport, ...prev.dailyReports],
        notifications: filteredNotifs
      };
    });

    triggerNotification('Laporan harian hari ini berhasil disimpan.', 'SUCCESS' as any);
  };

  // 8. DELETE TRANSACTION
  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
    triggerNotification('Transaksi berhasil dihapus.', 'INFO');
  };

  // 9. DELETE DAILY REPORT
  const deleteDailyReport = (id: string) => {
    setState(prev => ({
      ...prev,
      dailyReports: prev.dailyReports.filter(r => r.id !== id)
    }));
    triggerNotification('Laporan harian berhasil dihapus.', 'INFO');
  };

  const markNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const triggerNotification = (message: string, type: 'WARNING' | 'ALERT' | 'INFO') => {
    if (!state.activeProjectId) return;
    const newNotif: Notification = {
      id: `NT-${Date.now()}`,
      projectId: state.activeProjectId,
      message,
      date: new Date().toISOString(),
      isRead: false,
      type
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications]
    }));
  };

  const clearAllState = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setState({
      currentUser: initialCurrentUser,
      projects: [],
      activeProjectId: null,
      transactions: initialTransactions,
      materials: initialMaterials,
      materialLogs: initialMaterialLogs,
      workers: [],
      dailyReports: initialDailyReports,
      notifications: initialNotifications
    });
    loadProjects();
    loadWorkers();
  };

  const updateWorker = async (updatedWorker: Worker) => {
    try {
      if (isSupabaseConfigured) {
        await workerService.updateWeekWorker(updatedWorker.id, {
          work_days: updatedWorker.daysWorked,
          daily_rate: updatedWorker.dailyRate,
          total_wage: (updatedWorker.daysWorked * updatedWorker.dailyRate) + (updatedWorker.bonus || 0) - (updatedWorker.potongan || 0),
          payment_status: updatedWorker.status,
          notes: updatedWorker.notes,
          job_type: updatedWorker.position
        });

        if (updatedWorker.masterWorkerId) {
          await workerService.updateMasterWorker(updatedWorker.masterWorkerId, {
            name: updatedWorker.name,
            daily_rate: updatedWorker.dailyRate,
            job_type: updatedWorker.position
          });
        }

        await loadWorkers();
      } else {
        setState(prev => ({
          ...prev,
          workers: prev.workers.map(w => w.id === updatedWorker.id ? updatedWorker : w)
        }));
      }
      triggerNotification(`Data upah ${updatedWorker.name} berhasil diperbarui.`, 'INFO');
    } catch (err: any) {
      console.error('Failed to update worker:', err);
      triggerNotification(`Gagal memperbarui data pekerja: ${err.message || 'Error'}`, 'WARNING');
    }
  };

  const deleteWorker = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        await workerService.deleteWeekWorker(id);
        await loadWorkers();
      } else {
        setState(prev => ({
          ...prev,
          workers: prev.workers.filter(w => w.id !== id)
        }));
      }
      triggerNotification('Pekerja berhasil dihapus dari daftar.', 'INFO');
    } catch (err: any) {
      console.error('Failed to delete worker:', err);
      triggerNotification(`Gagal menghapus pekerja: ${err.message || 'Error'}`, 'WARNING');
    }
  };

  const updateMaterial = (updatedMat: Material) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === updatedMat.id ? updatedMat : m)
    }));

    const tryUpdateSupabase = async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('materials').update(updatedMat).eq('id', updatedMat.id);
        } catch (dbErr) {
          console.error('Failed to update material in Supabase:', dbErr);
        }
      }
    };
    tryUpdateSupabase();
  };

  const deleteMaterial = (id: string) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== id),
      materialLogs: prev.materialLogs.filter(l => l.materialId !== id)
    }));

    const tryDeleteSupabase = async () => {
      if (isSupabaseConfigured) {
        try {
          await supabase.from('materials').delete().eq('id', id);
        } catch (dbErr) {
          console.error('Failed to delete material from Supabase:', dbErr);
        }
      }
    };
    tryDeleteSupabase();
  };

  const updateCurrentUser = (user: User) => {
    setState(prev => ({
      ...prev,
      currentUser: user
    }));
    localStorage.setItem("dataku_user", user.name);
  };

  const restoreAllState = (newState: AppState) => {
    setState(newState);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        masterWorkers,
        loadWorkers,
        loginUser,
        logoutUser,
        addProject,
        setActiveProject,
        archiveProject,
        updateProject,
        deleteProject,
        addDanaMasuk,
        addPengeluaran,
        addBarangMasuk,
        addBarangKeluar,
        addBarangTerpakai,
        payWorker,
        addWorker,
        addDailyReport,
        deleteTransaction,
        deleteDailyReport,
        markNotificationsRead,
        triggerNotification,
        clearAllState,
        updateWorker,
        deleteWorker,
        updateMaterial,
        deleteMaterial,
        updateCurrentUser,
        restoreAllState
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
