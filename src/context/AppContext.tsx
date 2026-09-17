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
  mapToMasterWorker
} from '../services/workerService';
import { projectWeekService } from '../services/projectWeekService';
import { transactionService, mapSupabaseTransactionToApp } from '../services/transactionService';
import { materialService, mapSupabaseMaterialToApp, mapSupabaseMaterialLogToApp } from '../services/materialService';
import { reportService, mapSupabaseDailyReportToApp } from '../services/reportService';
import { fundService } from '../services/fundService';
import { getMandorUuid } from '../services/userService';
import { isUuidFormat } from '../utils/uuid';
import { AppState, User, Project, Transaction, Material, MaterialLog, Worker, MasterWorker, DailyReport, Notification, MaterialCategory, AppIdentityConfig } from '../types';
import { identityService, DEFAULT_IDENTITY_CONFIG } from '../services/identityService';
import { appSettingsService } from '../services/appSettingsService';
import { printSettingsService } from '../services/printSettingsService';
import {
  initialCurrentUser,
  initialNotifications
} from '../mock/data';

interface AppContextType {
  state: AppState;
  identityConfig: AppIdentityConfig;
  updateIdentityConfig: (cfg: Partial<AppIdentityConfig>) => void;
  resetIdentityConfig: () => void;
  saveIdentityConfig: (cfg?: AppIdentityConfig) => Promise<boolean>;
  printSettings: any;
  updatePrintSettings: (cfg: any) => void;
  savePrintSettings: (cfg?: any) => Promise<boolean>;
  masterWorkers: MasterWorker[];
  loadWorkers: () => Promise<void>;
  loginUser: (emailOrPhone: string, mandorIdFromAuth?: string) => void;
  logoutUser: () => void;
  addProject: (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => Promise<void>;
  setActiveProject: (id: string) => void;
  archiveProject: (id: string) => Promise<void>;
  updateProject: (proj: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addDanaMasuk: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => Promise<void>;
  addPengeluaran: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => Promise<void>;
  addBarangMasuk: (log: { name: string; category: MaterialCategory; amount: number; unit: string; pricePerUnit: number; supplier: string; notes: string; photos: string[]; date: string; payWithProjectFunds: boolean }) => Promise<void>;
  addBarangKeluar: (log: { materialId: string; amount: number; purposeOrWork: string; usedBy: string; notes: string; photos: string[]; date: string }) => Promise<void>;
  addBarangTerpakai: (log: { materialId: string; amount: number; purposeOrWork: string; location: string; notes: string; photos: string[]; date: string }) => Promise<void>;
  payWorker: (workerId: string, amountPaid: number, method: string, date?: string) => Promise<void>;
  addWorker: (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => Promise<void>;
  addDailyReport: (report: Omit<DailyReport, 'id' | 'projectId'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (tx: Partial<Transaction> & { id: string }) => Promise<void>;
  updateTransactionsOrder: (orderedItems: Transaction[]) => Promise<void>;
  updateMaterialLog: (log: Partial<MaterialLog> & { id: string }) => Promise<void>;
  deleteMaterialLog: (id: string) => Promise<void>;
  deleteDailyReport: (id: string) => Promise<void>;
  markNotificationsRead: () => void;
  triggerNotification: (message: string, type: 'WARNING' | 'ALERT' | 'INFO') => void;
  clearAllState: () => void;
  updateWorker: (worker: Worker) => Promise<void>;
  deleteWorker: (id: string) => Promise<void>;
  deleteMasterWorker: (id: string) => Promise<void>;
  updateMaterial: (mat: Material) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  updateCurrentUser: (user: User) => void;
  restoreAllState: (newState: AppState) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'DATAKU_APP_STATE';
const ACTIVE_PROJECT_KEY = 'dataku_active_project_id';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [state, setState] = useState<AppState>(() => {
    const isAuthenticated = localStorage.getItem("dataku_auth") === "true";
    const loggedUser = localStorage.getItem("dataku_user") || "PAUJI";
    const savedActiveProject = localStorage.getItem(ACTIVE_PROJECT_KEY) || null;

    const storedMandorId = localStorage.getItem("dataku_mandor_id");
    const initialMandorId = (storedMandorId && isUuidFormat(storedMandorId)) ? storedMandorId : '';

    return {
      currentUser: isAuthenticated ? {
        id: initialMandorId,
        name: loggedUser,
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        phone: '0812-3456-7890',
        email: 'pauji.mandor@dataku.com'
      } : null,
      projects: [],
      activeProjectId: savedActiveProject,
      transactions: [],
      materials: [],
      materialLogs: [],
      workers: [],
      dailyReports: [],
      notifications: initialNotifications
    };
  });
  const [masterWorkers, setMasterWorkers] = useState<MasterWorker[]>([]);
  const [identityConfig, setIdentityConfig] = useState<AppIdentityConfig>(() => identityService.loadConfig());
  const [printSettings, setPrintSettings] = useState<any>(() => printSettingsService.loadSettings());

  // Cross-device settings fetch on login
  useEffect(() => {
    const fetchSettings = async () => {
      if (state.currentUser?.id) {
        const dbRow = await appSettingsService.fetchSettings(state.currentUser.id);
        if (dbRow) {
          setIdentityConfig(identityService.loadConfig());
          setPrintSettings(printSettingsService.loadSettings());
        }
      }
    };
    fetchSettings();
  }, [state.currentUser?.id]);

  const updateIdentityConfig = useCallback((cfg: Partial<AppIdentityConfig>) => {
    setIdentityConfig(prev => {
      const next = { ...prev, ...cfg };
      identityService.saveConfig(next);
      return next;
    });
  }, []);

  const resetIdentityConfig = useCallback(() => {
    const defaultCfg = identityService.resetConfig();
    setIdentityConfig(defaultCfg);
  }, []);

  const saveIdentityConfig = useCallback(async (cfg?: AppIdentityConfig): Promise<boolean> => {
    const configToSave = cfg || identityConfig;
    setIdentityConfig(configToSave);
    if (state.currentUser?.id) {
      const success = await appSettingsService.saveSettings(state.currentUser.id, configToSave, printSettings, state.currentUser);
      if (!success) triggerNotification('Gagal menyimpan pengaturan identitas.', 'ALERT');
      return success;
    }
    return true;
  }, [identityConfig, printSettings, state.currentUser]);

  const updatePrintSettings = useCallback((cfg: any) => {
    setPrintSettings(cfg);
  }, []);

  const savePrintSettings = useCallback(async (cfg?: any): Promise<boolean> => {
    const configToSave = cfg || printSettings;
    setPrintSettings(configToSave);
    if (state.currentUser?.id) {
      const success = await appSettingsService.saveSettings(state.currentUser.id, identityConfig, configToSave, state.currentUser);
      if (!success) triggerNotification('Gagal menyimpan pengaturan cetak.', 'ALERT');
      return success;
    }
    return true;
  }, [identityConfig, printSettings, state.currentUser]);

  // Domain loader for Transactions
  const loadTransactions = useCallback(async (projectId: string) => {
    if (!isSupabaseConfigured || !projectId) return;
    try {
      const data = await transactionService.getTransactions(projectId);
      const mapped = data.map(mapSupabaseTransactionToApp);
      setState(prev => ({
        ...prev,
        transactions: mapped
      }));
    } catch (err) {
      console.error('Error loading transactions from Supabase:', err);
    }
  }, []);

  // Domain loader for Materials
  const loadMaterials = useCallback(async (projectId: string) => {
    if (!isSupabaseConfigured || !projectId) return;
    try {
      const data = await materialService.getMaterials(projectId);
      const mapped = data.map(mapSupabaseMaterialToApp);
      setState(prev => ({
        ...prev,
        materials: mapped
      }));
    } catch (err) {
      console.error('Error loading materials from Supabase:', err);
    }
  }, []);

  // Domain loader for Material Logs
  const loadMaterialLogs = useCallback(async (projectId: string) => {
    if (!isSupabaseConfigured || !projectId) return;
    try {
      const [logsData, materialsData] = await Promise.all([
        materialService.getMaterialTransactions(projectId),
        materialService.getMaterials(projectId)
      ]);
      const appMaterials = materialsData.map(mapSupabaseMaterialToApp);
      const materialsMap = new Map<string, Material>(appMaterials.map(m => [m.id, m]));
      const mapped = logsData.map(l => mapSupabaseMaterialLogToApp(l, materialsMap));

      setState(prev => ({
        ...prev,
        materials: appMaterials,
        materialLogs: mapped
      }));
    } catch (err) {
      console.error('Error loading material logs from Supabase:', err);
    }
  }, []);

  // Domain loader for Daily Reports
  const loadDailyReports = useCallback(async (projectId: string) => {
    if (!isSupabaseConfigured || !projectId) return;
    try {
      const data = await reportService.getDailyReports(projectId);
      const mapped = data.map(mapSupabaseDailyReportToApp);
      setState(prev => ({
        ...prev,
        dailyReports: mapped
      }));
    } catch (err) {
      console.error('Error loading daily reports from Supabase:', err);
    }
  }, []);

  // Domain loader for Workers and Master Workers
  const loadWorkers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [rawMasterWorkers, weekWorkers, payments, projectWeeks] = await Promise.all([
        workerService.getMasterWorkers(),
        workerService.getWeekWorkers(),
        workerService.getWorkerPayments(),
        projectWeekService.getProjectWeeks()
      ]);

      const mappedWorkers = mapSupabaseToAppWorkers(weekWorkers, rawMasterWorkers, payments, projectWeeks);
      const mappedMasterWorkers = rawMasterWorkers.map(mapToMasterWorker);

      setMasterWorkers(mappedMasterWorkers);
      setState(prev => ({
        ...prev,
        workers: mappedWorkers
      }));
    } catch (err) {
      console.error('Error loading workers from Supabase:', err);
    }
  }, []);

  // Load Projects directly from Supabase
  const loadProjects = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const mandorUuid = await getMandorUuid(state.currentUser?.name);
      const data = await projectService.getProjects(mandorUuid);
      const storedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);

      const mapped = data.map(p => mapSupabaseProjectToProject(p, storedActiveId));

      let nextActiveId = storedActiveId || state.activeProjectId;
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

      setState(prev => ({
        ...prev,
        projects: updatedProjects,
        activeProjectId: nextActiveId
      }));

      if (nextActiveId) {
        await Promise.all([
          loadTransactions(nextActiveId),
          loadMaterials(nextActiveId),
          loadMaterialLogs(nextActiveId),
          loadDailyReports(nextActiveId),
          loadWorkers()
        ]);
      }
    } catch (err) {
      console.error('Error loading projects from Supabase:', err);
    }
  }, [state.currentUser?.name, state.activeProjectId, loadTransactions, loadMaterials, loadMaterialLogs, loadDailyReports, loadWorkers]);

  // Set Active Project handler
  const setActiveProject = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    setState(prev => ({
      ...prev,
      activeProjectId: id,
      projects: prev.projects.map(p => ({
        ...p,
        isActive: p.id === id
      }))
    }));
    if (isSupabaseConfigured && id) {
      loadTransactions(id);
      loadMaterials(id);
      loadMaterialLogs(id);
      loadDailyReports(id);
      loadWorkers();
    }
  }, [loadTransactions, loadMaterials, loadMaterialLogs, loadDailyReports, loadWorkers]);

  // Realtime listener for cross-device database changes
  useEffect(() => {
    loadProjects();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('dataku_realtime_sync_all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjects();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        if (state.activeProjectId) loadTransactions(state.activeProjectId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
        if (state.activeProjectId) loadMaterials(state.activeProjectId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'material_transactions' }, () => {
        if (state.activeProjectId) {
          loadMaterialLogs(state.activeProjectId);
          loadMaterials(state.activeProjectId);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_reports' }, () => {
        if (state.activeProjectId) loadDailyReports(state.activeProjectId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_workers' }, () => {
        loadWorkers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_week_workers' }, () => {
        loadWorkers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_worker_payments' }, () => {
        loadWorkers();
        if (state.activeProjectId) loadTransactions(state.activeProjectId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dataku_project_weeks' }, () => {
        loadWorkers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects, loadWorkers, loadTransactions, loadMaterials, loadMaterialLogs, loadDailyReports, state.activeProjectId]);

  const triggerNotification = (message: string, type: 'WARNING' | 'ALERT' | 'INFO') => {
    const newNotif: Notification = {
      id: `NT-${Date.now()}`,
      projectId: state.activeProjectId || 'GENERAL',
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

  const loginUser = (username: string, mandorIdFromAuth?: string) => {
    localStorage.setItem("dataku_auth", "true");
    localStorage.setItem("dataku_user", username);
    if (mandorIdFromAuth && isUuidFormat(mandorIdFromAuth)) {
      localStorage.setItem("dataku_mandor_id", mandorIdFromAuth);
    }
    const storedId = localStorage.getItem("dataku_mandor_id");
    const validMandorId = (storedId && isUuidFormat(storedId))
      ? storedId
      : (mandorIdFromAuth && isUuidFormat(mandorIdFromAuth)) ? mandorIdFromAuth : '';

    setState(prev => ({
      ...prev,
      currentUser: {
        id: validMandorId,
        name: username,
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        phone: '0812-3456-7890',
        email: 'pauji.mandor@dataku.com'
      }
    }));
    loadProjects();
  };

  const logoutUser = () => {
    localStorage.removeItem("dataku_auth");
    localStorage.removeItem("dataku_user");
    localStorage.removeItem("dataku_mandor_id");
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setState(prev => ({ ...prev, currentUser: null, projects: [], activeProjectId: null }));
    window.location.reload();
  };

  // 1. BUAT PROYEK BARU
  const addProject = async (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => {
    try {
      const mandorUuid = await getMandorUuid(state.currentUser?.name);
      const created = await projectService.createProject({
        name: proj.name,
        owner_name: proj.owner,
        location: proj.location,
        start_date: proj.startDate,
        target_date: proj.targetDate,
        budget: Number(proj.budget) || 0,
        description: proj.notes || '',
        status: 'active',
        created_by: mandorUuid
      });

      localStorage.setItem(ACTIVE_PROJECT_KEY, created.id);
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
      triggerNotification('Proyek berhasil dihapus permanen.', 'INFO');
      await loadProjects();
    } catch (err: any) {
      console.error('Gagal menghapus proyek:', err);
      triggerNotification(`Gagal menghapus proyek: ${err?.message || 'Terjadi kesalahan sistem'}`, 'ALERT');
      throw err;
    }
  };

  // 1. ADD DANA MASUK
  const addDanaMasuk = async (tx: {
    amount: number;
    category: string;
    sourceOrRecipient: string;
    paymentMethod: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        await transactionService.createTransaction({
          project_id: activeProjId,
          type: 'income',
          category: tx.category || 'Dana Masuk',
          amount: Number(tx.amount) || 0,
          recipient: tx.sourceOrRecipient || 'Pemilik Proyek',
          description: tx.notes || '',
          transaction_date: tx.date || new Date().toISOString(),
          created_by: mandorUuid
        });

        try {
          await fundService.createFund({
            project_id: activeProjId,
            amount: Number(tx.amount) || 0,
            source: tx.sourceOrRecipient || 'Pemilik Proyek',
            payment_method: tx.paymentMethod || 'Kas Tunai',
            transaction_date: tx.date || new Date().toISOString(),
            description: tx.notes || '',
            created_by: mandorUuid
          });
        } catch (fErr) {
          console.warn('Optional fund record insert notice:', fErr);
        }

        await loadTransactions(activeProjId);
      } else {
        const newTx: Transaction = {
          id: `TX-${Date.now().toString().slice(-5)}`,
          projectId: activeProjId,
          type: 'DANA_MASUK',
          ...tx
        };
        setState(prev => ({
          ...prev,
          transactions: [newTx, ...prev.transactions]
        }));
      }

      triggerNotification(`Dana Masuk sebesar Rp ${tx.amount.toLocaleString('id-ID')} berhasil disimpan ke database.`, 'INFO');
    } catch (err: any) {
      console.error('Gagal menambah Dana Masuk:', err);
      triggerNotification(`Gagal mencatat Dana Masuk: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 2. ADD PENGELUARAN
  const addPengeluaran = async (tx: {
    amount: number;
    category: string;
    sourceOrRecipient: string;
    paymentMethod: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        await transactionService.createTransaction({
          project_id: activeProjId,
          type: 'expense',
          category: tx.category || 'Pengeluaran',
          amount: Number(tx.amount) || 0,
          recipient: tx.sourceOrRecipient || 'Penerima',
          description: tx.notes || '',
          transaction_date: tx.date || new Date().toISOString(),
          created_by: mandorUuid
        });

        await loadTransactions(activeProjId);
      } else {
        const newTx: Transaction = {
          id: `TX-${Date.now().toString().slice(-5)}`,
          projectId: activeProjId,
          type: 'PENGELUARAN',
          ...tx
        };
        setState(prev => ({
          ...prev,
          transactions: [newTx, ...prev.transactions]
        }));
      }

      triggerNotification(`Pengeluaran sebesar Rp ${tx.amount.toLocaleString('id-ID')} berhasil disimpan ke database.`, 'INFO');
    } catch (err: any) {
      console.error('Gagal menambah Pengeluaran:', err);
      triggerNotification(`Gagal mencatat Pengeluaran: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 3. BARANG MASUK
  const addBarangMasuk = async (log: {
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
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        const existingMaterials = await materialService.getMaterials(activeProjId);
        let material = existingMaterials.find(m => m.name.trim().toLowerCase() === log.name.trim().toLowerCase());

        if (!material) {
          material = await materialService.createMaterial({
            project_id: activeProjId,
            name: log.name.trim(),
            category: log.category,
            unit: log.unit || 'pcs',
            stock: Number(log.amount) || 0,
            minimum_stock: log.category === 'Semen' ? 20 : log.category === 'Besi' ? 30 : 5,
            created_by: mandorUuid
          });
        } else {
          const newStock = Number(material.stock || 0) + Number(log.amount || 0);
          await materialService.updateMaterialStock(material.id, newStock);
        }

        await materialService.createMaterialTransaction({
          project_id: activeProjId,
          material_id: material.id,
          type: 'in',
          quantity: Number(log.amount) || 0,
          unit_price: Number(log.pricePerUnit) || 0,
          supplier: log.supplier || '',
          purpose: log.notes || '',
          transaction_date: log.date || new Date().toISOString(),
          description: log.notes || '',
          created_by: mandorUuid
        });

        if (log.payWithProjectFunds && log.amount > 0 && log.pricePerUnit > 0) {
          await transactionService.createTransaction({
            project_id: activeProjId,
            type: 'expense',
            category: 'Material',
            amount: Number(log.amount) * Number(log.pricePerUnit),
            recipient: log.supplier || 'Toko Material',
            description: `Pembelian ${log.amount} ${log.unit} ${log.name}`,
            transaction_date: log.date || new Date().toISOString(),
            created_by: mandorUuid
          });
        }

        await Promise.all([
          loadMaterials(activeProjId),
          loadMaterialLogs(activeProjId),
          loadTransactions(activeProjId)
        ]);
      }

      triggerNotification(`Barang Masuk: ${log.amount} ${log.unit} ${log.name} berhasil disimpan ke database.`, 'INFO');
    } catch (err: any) {
      console.error('Gagal mencatat Barang Masuk:', err);
      triggerNotification(`Gagal mencatat Barang Masuk: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 4. BARANG KELUAR
  const addBarangKeluar = async (log: {
    materialId: string;
    amount: number;
    purposeOrWork: string;
    usedBy: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        const existingMaterials = await materialService.getMaterials(activeProjId);
        const material = existingMaterials.find(m => m.id === log.materialId);

        if (!material) {
          throw new Error('Material tidak ditemukan di database.');
        }

        const newStock = Math.max(0, Number(material.stock || 0) - Number(log.amount || 0));
        await materialService.updateMaterialStock(material.id, newStock);

        await materialService.createMaterialTransaction({
          project_id: activeProjId,
          material_id: material.id,
          type: 'out',
          quantity: Number(log.amount) || 0,
          purpose: log.purposeOrWork || '',
          transaction_date: log.date || new Date().toISOString(),
          description: `Penggunaan oleh ${log.usedBy || 'Tukang'}: ${log.notes || ''}`.trim(),
          created_by: mandorUuid
        });

        await Promise.all([
          loadMaterials(activeProjId),
          loadMaterialLogs(activeProjId)
        ]);
      }

      triggerNotification('Barang Keluar berhasil dicatat ke database.', 'INFO');
    } catch (err: any) {
      console.error('Gagal mencatat Barang Keluar:', err);
      triggerNotification(`Gagal mencatat Barang Keluar: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 5. BARANG TERPAKAI
  const addBarangTerpakai = async (log: {
    materialId: string;
    amount: number;
    purposeOrWork: string;
    location: string;
    notes: string;
    photos: string[];
    date: string;
  }) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        const existingMaterials = await materialService.getMaterials(activeProjId);
        const material = existingMaterials.find(m => m.id === log.materialId);

        if (!material) {
          throw new Error('Material tidak ditemukan di database.');
        }

        const newStock = Math.max(0, Number(material.stock || 0) - Number(log.amount || 0));
        await materialService.updateMaterialStock(material.id, newStock);

        await materialService.createMaterialTransaction({
          project_id: activeProjId,
          material_id: material.id,
          type: 'used',
          quantity: Number(log.amount) || 0,
          purpose: log.purposeOrWork || '',
          transaction_date: log.date || new Date().toISOString(),
          description: `Pemakaian di ${log.location || 'Lokasi'}: ${log.notes || ''}`.trim(),
          created_by: mandorUuid
        });

        await Promise.all([
          loadMaterials(activeProjId),
          loadMaterialLogs(activeProjId)
        ]);
      }

      triggerNotification('Barang Terpakai berhasil dicatat ke database.', 'INFO');
    } catch (err: any) {
      console.error('Gagal mencatat Barang Terpakai:', err);
      triggerNotification(`Gagal mencatat Barang Terpakai: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 6. PAY WORKER
  const payWorker = async (workerId: string, amountPaid: number, method: string, dateStr?: string) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;

    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    let newStatus: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' = worker.status;
    if (amountPaid >= worker.totalWages) {
      newStatus = 'LUNAS';
    } else if (amountPaid > 0) {
      newStatus = 'SEBAGIAN';
    }

    try {
      if (isSupabaseConfigured) {
        const weeks = await projectWeekService.ensureProjectWeeks(activeProjId);
        const targetWeekNum = worker.weekNumber || 2;
        let matchedWeek = weeks.find(w => w.week_number === targetWeekNum);
        if (!matchedWeek && weeks.length > 0) {
          matchedWeek = weeks[0];
        }
        if (!matchedWeek || !matchedWeek.id) {
          throw new Error('Minggu kerja proyek tidak ditemukan di database.');
        }

        const weekId = matchedWeek.id;

        await workerService.createWorkerPayment({
          project_id: activeProjId,
          week_id: weekId,
          week_worker_id: worker.id,
          worker_id: worker.masterWorkerId || worker.id,
          amount: Number(amountPaid) || 0,
          payment_date: dateStr || new Date().toISOString(), // Modified for exact time
          payment_method: method || 'Kas Tunai',
          notes: `Pembayaran Upah untuk ${worker.name} (${worker.position})`
        });

        await workerService.updateWeekWorker(worker.id, {
          payment_status: newStatus
        });

        await transactionService.createTransaction({
          project_id: activeProjId,
          type: 'expense',
          category: 'Upah Tukang',
          amount: Number(amountPaid) || 0,
          recipient: worker.name,
          description: `Pembayaran Upah untuk ${worker.name} (${worker.position})`,
          transaction_date: dateStr || new Date().toISOString(), // Modified for exact time
          created_by: mandorUuid
        });

        await Promise.all([
          loadWorkers(),
          loadTransactions(activeProjId)
        ]);
      } else {
        setState(prev => ({
          ...prev,
          workers: prev.workers.map(w => w.id === workerId ? { ...w, status: newStatus } : w)
        }));
      }

      triggerNotification(`Pembayaran upah ${worker.name} berhasil dicatat ke database.`, 'INFO');
    } catch (err: any) {
      console.error('Failed to pay worker:', err);
      triggerNotification(`Gagal mencatat pembayaran: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 7. TAMBAH PEKERJA
  const addWorker = async (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        let mWorker = masterWorkers.find(
          mw => mw.name.trim().toLowerCase() === worker.name.trim().toLowerCase()
        );
        let mWorkerId = worker.masterWorkerId || mWorker?.id;

        if (!mWorkerId) {
          const createdMW = await workerService.createMasterWorker({
            mandor_id: mandorUuid,
            name: worker.name.trim(),
            job_type: worker.position || 'Tukang',
            daily_rate: Number(worker.dailyRate) || 0,
            is_active: true
          });
          mWorkerId = createdMW.id;
        }

        const targetWeekNum = worker.weekNumber || 2;
        const activeProj = state.projects.find(p => p.id === activeProjId);

        const pWeeks = await projectWeekService.ensureProjectWeeks(
          activeProjId,
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
          project_id: activeProjId,
          week_id: weekId,
          worker_id: mWorkerId,
          job_type: worker.position,
          daily_rate: Number(worker.dailyRate) || 0,
          work_days: Number(worker.daysWorked) || 0,
          payment_status: worker.status || 'BELUM_DIBAYAR',
          notes: notes
        });

        await loadWorkers();
      }

      triggerNotification(`Pekerja ${worker.name} berhasil ditambahkan ke database.`, 'INFO');
    } catch (err: any) {
      console.error('Failed to add worker:', err);
      triggerNotification(`Gagal menambahkan pekerja: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 8. DAILY REPORT
  const addDailyReport = async (report: Omit<DailyReport, 'id' | 'projectId'>) => {
    if (!state.activeProjectId) {
      triggerNotification('Pilih proyek terlebih dahulu.', 'WARNING');
      return;
    }
    const activeProjId = state.activeProjectId;
    const mandorUuid = await getMandorUuid(state.currentUser?.name);

    try {
      if (isSupabaseConfigured) {
        await reportService.createDailyReport({
          project_id: activeProjId,
          report_date: report.date || new Date().toISOString().substring(0, 10),
          weather: report.weather || 'Cerah',
          worker_count: Number(report.workerCount) || 0,
          work_description: report.todayWork || '',
          materials_used: report.materialsUsed || report.materialsIn || '',
          obstacles: report.challenges || '',
          notes: report.notes || '',
          created_by: mandorUuid
        });

        await loadDailyReports(activeProjId);
      }

      triggerNotification('Laporan harian berhasil disimpan ke database.', 'INFO');
    } catch (err: any) {
      console.error('Gagal menyimpan laporan harian:', err);
      triggerNotification(`Gagal menyimpan laporan harian: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 9. DELETE TRANSACTION
  const deleteTransaction = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
        if (state.activeProjectId) {
          // Normalisasi display_order transaksi yang tersisa
          const remainingData = await transactionService.getTransactions(state.activeProjectId);
          const updates = remainingData.map((t, idx) => ({
            id: t.id,
            display_order: idx + 1
          }));
          if (updates.length > 0) {
            await transactionService.updateTransactionsOrder(updates);
          }
          await loadTransactions(state.activeProjectId);
        }
      } else {
        setState(prev => {
          const filtered = prev.transactions.filter(t => t.id !== id);
          return {
            ...prev,
            transactions: filtered.map((t, idx) => ({ ...t, displayOrder: idx + 1 }))
          };
        });
      }
      triggerNotification('Transaksi berhasil dihapus dari database.', 'INFO');
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      triggerNotification(`Gagal menghapus transaksi: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  const updateTransactionsOrder = async (orderedItems: Transaction[]) => {
    // Update local state immediately for instant, responsive feedback (Optimistic UI)
    setState(prev => ({
      ...prev,
      transactions: orderedItems.map((item, idx) => ({ ...item, displayOrder: idx + 1 }))
    }));

    if (isSupabaseConfigured) {
      try {
        const payload = orderedItems.map((item, idx) => ({
          id: item.id,
          display_order: idx + 1
        }));
        await transactionService.updateTransactionsOrder(payload);
        // Silent reload
        if (state.activeProjectId) {
          await loadTransactions(state.activeProjectId);
        }
      } catch (err) {
        console.error('Failed to save manual drag display order:', err);
      }
    }
  };

  const updateTransaction = async (tx: Partial<Transaction> & { id: string }) => {
    try {
      if (!isUuidFormat(tx.id)) {
        throw new Error('Transaction ID tidak valid.');
      }
      if (isSupabaseConfigured) {
        let dbType: string | undefined = undefined;
        if (tx.type === 'DANA_MASUK') dbType = 'income';
        else if (tx.type === 'PENGELUARAN') dbType = 'expense';
        else if (tx.type === 'UPAH_TUKANG') dbType = 'expense';

        await transactionService.updateTransaction(tx.id, {
          category: tx.category,
          amount: tx.amount !== undefined ? Number(tx.amount) : undefined,
          recipient: tx.sourceOrRecipient,
          description: tx.notes,
          transaction_date: tx.date,
          transaction_type: dbType
        });

        if (state.activeProjectId) {
          await loadTransactions(state.activeProjectId);
        }
      } else {
        setState(prev => ({
          ...prev,
          transactions: prev.transactions.map(t => t.id === tx.id ? { ...t, ...tx } : t)
        }));
      }
      triggerNotification('Transaksi berhasil diperbarui.', 'INFO');
    } catch (err: any) {
      console.error('Error updating transaction:', err);
      triggerNotification(`Gagal mengedit transaksi: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  const updateMaterialLog = async (log: Partial<MaterialLog> & { id: string }) => {
    try {
      if (!isUuidFormat(log.id)) {
        throw new Error('Material Log ID tidak valid.');
      }
      const existingLog = state.materialLogs.find(l => l.id === log.id);
      if (!existingLog) {
        throw new Error('Log material tidak ditemukan.');
      }

      if (isSupabaseConfigured) {
        const materialId = log.materialId || existingLog.materialId;
        const oldQty = existingLog.amount;
        const newQty = log.amount !== undefined ? Number(log.amount) : oldQty;
        const logType = log.type || existingLog.type;

        // Recalculate stock
        const existingMaterial = state.materials.find(m => m.id === materialId);
        if (existingMaterial) {
          let stockDelta = 0;
          if (logType === 'MASUK') {
            stockDelta = newQty - oldQty;
          } else {
            stockDelta = -(newQty - oldQty);
          }
          if (stockDelta !== 0) {
            const updatedStock = Math.max(0, (existingMaterial.stock || 0) + stockDelta);
            await materialService.updateMaterialStock(existingMaterial.id, updatedStock);
          }
        }

        let dbTxType: string | undefined = undefined;
        if (logType === 'MASUK') dbTxType = 'in';
        else if (logType === 'KELUAR') dbTxType = 'out';
        else if (logType === 'TERPAKAI') dbTxType = 'used';

        await materialService.updateMaterialTransaction(log.id, {
          quantity: newQty,
          unit_price: log.pricePerUnit !== undefined ? Number(log.pricePerUnit) : existingLog.pricePerUnit,
          supplier: log.supplier !== undefined ? log.supplier : existingLog.supplier,
          purpose: log.purposeOrWork || log.notes || existingLog.purposeOrWork || existingLog.notes,
          transaction_date: log.date || existingLog.date,
          description: log.notes !== undefined ? log.notes : existingLog.notes,
          transaction_type: dbTxType
        });

        if (state.activeProjectId) {
          await Promise.all([
            loadMaterials(state.activeProjectId),
            loadMaterialLogs(state.activeProjectId),
            loadTransactions(state.activeProjectId)
          ]);
        }
      }
      triggerNotification('Log material berhasil diperbarui.', 'INFO');
    } catch (err: any) {
      console.error('Error updating material log:', err);
      triggerNotification(`Gagal mengedit log material: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  const deleteMaterialLog = async (id: string) => {
    try {
      if (!isUuidFormat(id)) {
        throw new Error('Material Log ID tidak valid.');
      }
      const existingLog = state.materialLogs.find(l => l.id === id);

      if (isSupabaseConfigured) {
        if (existingLog) {
          const existingMaterial = state.materials.find(m => m.id === existingLog.materialId);
          if (existingMaterial) {
            let revertDelta = 0;
            if (existingLog.type === 'MASUK') {
              revertDelta = -existingLog.amount;
            } else {
              revertDelta = existingLog.amount;
            }
            const revertedStock = Math.max(0, (existingMaterial.stock || 0) + revertDelta);
            await materialService.updateMaterialStock(existingMaterial.id, revertedStock);
          }
        }

        await materialService.deleteMaterialTransaction(id);

        if (state.activeProjectId) {
          await Promise.all([
            loadMaterials(state.activeProjectId),
            loadMaterialLogs(state.activeProjectId)
          ]);
        }
      } else {
        setState(prev => ({
          ...prev,
          materialLogs: prev.materialLogs.filter(l => l.id !== id)
        }));
      }
      triggerNotification('Log material berhasil dihapus.', 'INFO');
    } catch (err: any) {
      console.error('Error deleting material log:', err);
      triggerNotification(`Gagal menghapus log material: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  // 10. DELETE DAILY REPORT
  const deleteDailyReport = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('daily_reports').delete().eq('id', id);
        if (error) throw error;
        if (state.activeProjectId) {
          await loadDailyReports(state.activeProjectId);
        }
      } else {
        setState(prev => ({
          ...prev,
          dailyReports: prev.dailyReports.filter(r => r.id !== id)
        }));
      }
      triggerNotification('Laporan harian berhasil dihapus dari database.', 'INFO');
    } catch (err: any) {
      console.error('Error deleting daily report:', err);
      triggerNotification(`Gagal menghapus laporan harian: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  const markNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
    }));
  };

  const clearAllState = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setState({
      currentUser: initialCurrentUser,
      projects: [],
      activeProjectId: null,
      transactions: [],
      materials: [],
      materialLogs: [],
      workers: [],
      dailyReports: [],
      notifications: initialNotifications
    });
    loadProjects();
    loadWorkers();
  };

  const updateWorker = async (updatedWorker: Worker) => {
    try {
      if (isSupabaseConfigured) {
        let targetWeekId: string | undefined = undefined;
        if (updatedWorker.weekNumber && updatedWorker.projectId) {
          const weeks = await projectWeekService.ensureProjectWeeks(updatedWorker.projectId);
          const matchedWeek = weeks.find(w => w.week_number === updatedWorker.weekNumber);
          if (!matchedWeek) {
            throw new Error('Minggu kerja belum tersedia untuk proyek ini.');
          }
          targetWeekId = matchedWeek.id;

          if (updatedWorker.weekStartDate || updatedWorker.weekEndDate) {
            await projectWeekService.updateProjectWeek(matchedWeek.id, {
              week_start: updatedWorker.weekStartDate || matchedWeek.week_start || undefined,
              week_end: updatedWorker.weekEndDate || matchedWeek.week_end || undefined
            });
          }
        }

        const weekWorkerPayload: any = {
          work_days: updatedWorker.daysWorked,
          daily_rate: updatedWorker.dailyRate,
          payment_status: updatedWorker.status,
          notes: updatedWorker.notes,
          job_type: updatedWorker.position
        };

        if (targetWeekId) {
          weekWorkerPayload.week_id = targetWeekId;
        }

        await workerService.updateWeekWorker(updatedWorker.id, weekWorkerPayload);

        const existingPayments = await workerService.getWorkerPayments(updatedWorker.projectId);
        const matchedPayment = existingPayments.find(
          p => p.week_worker_id === updatedWorker.id || (updatedWorker.masterWorkerId && p.worker_id === updatedWorker.masterWorkerId && p.project_id === updatedWorker.projectId)
        );

        const netWages = (updatedWorker.daysWorked * updatedWorker.dailyRate) + (updatedWorker.bonus || 0) - (updatedWorker.potongan || 0);

        if (matchedPayment) {
          await workerService.updateWorkerPayment(matchedPayment.id, {
            payment_date: updatedWorker.paymentDate || matchedPayment.payment_date,
            payment_method: updatedWorker.paymentMethod || matchedPayment.payment_method,
            notes: updatedWorker.notes || matchedPayment.notes,
            receipt_attachment_id: updatedWorker.attachmentUrl !== undefined ? updatedWorker.attachmentUrl : matchedPayment.receipt_attachment_id
          });
        } else if (updatedWorker.paymentDate || updatedWorker.status === 'LUNAS' || updatedWorker.status === 'SEBAGIAN') {
          await workerService.createWorkerPayment({
            project_id: updatedWorker.projectId,
            week_id: targetWeekId || null,
            week_worker_id: updatedWorker.id,
            worker_id: updatedWorker.masterWorkerId || '',
            amount: netWages,
            payment_date: updatedWorker.paymentDate || new Date().toISOString().substring(0, 10),
            payment_method: updatedWorker.paymentMethod || 'Kas Tunai',
            notes: updatedWorker.notes || '',
            receipt_attachment_id: updatedWorker.attachmentUrl || null
          });
        }

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
      triggerNotification(`Gagal memperbarui data pekerja: ${err.message || 'Error'}`, 'ALERT');
      throw err;
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
      triggerNotification(`Gagal menghapus pekerja: ${err.message || 'Error'}`, 'ALERT');
    }
  };

  const deleteMasterWorker = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        await workerService.deleteMasterWorker(id);
        await loadWorkers();
      } else {
        setMasterWorkers(prev => prev.filter(mw => mw.id !== id));
      }
      triggerNotification('Data master tukang berhasil dihapus.', 'INFO');
    } catch (err: any) {
      console.error('Failed to delete master worker:', err);
      triggerNotification(err.message || 'Gagal menghapus data master tukang.', 'ALERT');
      throw err;
    }
  };

  const updateMaterial = async (updatedMat: Material) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('materials')
          .update({
            name: updatedMat.name,
            category: updatedMat.category,
            stock: updatedMat.stock,
            unit: updatedMat.unit,
            minimum_stock: updatedMat.minStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', updatedMat.id);

        if (error) throw error;
        if (state.activeProjectId) {
          await loadMaterials(state.activeProjectId);
        }
      } else {
        setState(prev => ({
          ...prev,
          materials: prev.materials.map(m => m.id === updatedMat.id ? updatedMat : m)
        }));
      }
      triggerNotification(`Data stok ${updatedMat.name} diperbarui.`, 'INFO');
    } catch (err: any) {
      console.error('Gagal memperbarui material:', err);
      triggerNotification(`Gagal memperbarui material: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) throw error;
        if (state.activeProjectId) {
          await Promise.all([
            loadMaterials(state.activeProjectId),
            loadMaterialLogs(state.activeProjectId)
          ]);
        }
      } else {
        setState(prev => ({
          ...prev,
          materials: prev.materials.filter(m => m.projectId !== id),
          materialLogs: prev.materialLogs.filter(l => l.materialId !== id)
        }));
      }
      triggerNotification('Material berhasil dihapus.', 'INFO');
    } catch (err: any) {
      console.error('Gagal menghapus material:', err);
      triggerNotification(`Gagal menghapus material: ${err.message || 'Error'}`, 'ALERT');
      throw err;
    }
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
        identityConfig,
        updateIdentityConfig,
        resetIdentityConfig,
        saveIdentityConfig,
        printSettings,
        updatePrintSettings,
        savePrintSettings,
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
        updateTransaction,
        updateTransactionsOrder,
        updateMaterialLog,
        deleteMaterialLog,
        deleteDailyReport,
        markNotificationsRead,
        triggerNotification,
        clearAllState,
        updateWorker,
        deleteWorker,
        deleteMasterWorker,
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
