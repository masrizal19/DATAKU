/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, User, Project, Transaction, Material, MaterialLog, Worker, DailyReport, Notification, MaterialCategory } from '../types';
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
  loginUser: (emailOrPhone: string) => void;
  logoutUser: () => void;
  addProject: (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => void;
  setActiveProject: (id: string) => void;
  archiveProject: (id: string) => void;
  updateProject: (proj: Project) => void;
  addDanaMasuk: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  addPengeluaran: (tx: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  addBarangMasuk: (log: { name: string; category: MaterialCategory; amount: number; unit: string; pricePerUnit: number; supplier: string; notes: string; photos: string[]; date: string; payWithProjectFunds: boolean }) => void;
  addBarangKeluar: (log: { materialId: string; amount: number; purposeOrWork: string; usedBy: string; notes: string; photos: string[]; date: string }) => void;
  addBarangTerpakai: (log: { materialId: string; amount: number; purposeOrWork: string; location: string; notes: string; photos: string[]; date: string }) => void;
  payWorker: (workerId: string, amountPaid: number, method: string) => void;
  addWorker: (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => void;
  addDailyReport: (report: Omit<DailyReport, 'id' | 'projectId'>) => void;
  deleteTransaction: (id: string) => void;
  deleteDailyReport: (id: string) => void;
  markNotificationsRead: () => void;
  triggerNotification: (message: string, type: 'WARNING' | 'ALERT' | 'INFO') => void;
  clearAllState: () => void;
  updateWorker: (worker: Worker) => void;
  updateCurrentUser: (user: User) => void;
  restoreAllState: (newState: AppState) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'DATAKU_APP_STATE';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const isAuthenticated = localStorage.getItem("dataku_auth") === "true";
    const loggedUser = localStorage.getItem("dataku_user") || "PAUJI";
    
    let loadedState: AppState;
    if (saved) {
      try {
        loadedState = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved state', e);
        loadedState = {
          currentUser: null,
          projects: initialProjects,
          activeProjectId: 'PRJ-MDN-2024-08',
          transactions: initialTransactions,
          materials: initialMaterials,
          materialLogs: initialMaterialLogs,
          workers: initialWorkers,
          dailyReports: initialDailyReports,
          notifications: initialNotifications
        };
      }
    } else {
      loadedState = {
        currentUser: null,
        projects: initialProjects,
        activeProjectId: 'PRJ-MDN-2024-08',
        transactions: initialTransactions,
        materials: initialMaterials,
        materialLogs: initialMaterialLogs,
        workers: initialWorkers,
        dailyReports: initialDailyReports,
        notifications: initialNotifications
      };
    }

    if (isAuthenticated) {
      loadedState.currentUser = {
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

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loginUser = (username: string) => {
    setState(prev => ({
      ...prev,
      currentUser: {
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
    setState(prev => ({
      ...prev,
      activeProjectId: id,
      projects: prev.projects.map(p => ({
        ...p,
        isActive: p.id === id
      }))
    }));
  };

  const addProject = (proj: Omit<Project, 'id' | 'isArchived' | 'isActive'>) => {
    const newId = `PRJ-${Date.now().toString().slice(-4)}`;
    const newProj: Project = {
      ...proj,
      id: newId,
      isArchived: false,
      isActive: true
    };

    setState(prev => {
      const updatedProjects = prev.projects.map(p => ({ ...p, isActive: false })).concat(newProj);
      
      // Default initial materials for new project
      const initialNewMaterials: Material[] = [
        { id: `MAT-${newId}-SEMEN`, projectId: newId, name: 'Semen Portland 50kg', category: 'Semen', stock: 0, unit: 'sak', minStock: 20 },
        { id: `MAT-${newId}-BESI`, projectId: newId, name: 'Besi Beton Ulir 10mm', category: 'Besi', stock: 0, unit: 'batang', minStock: 30 },
        { id: `MAT-${newId}-PASIR`, projectId: newId, name: 'Pasir Pasang Super', category: 'Pasir', stock: 0, unit: 'kol', minStock: 5 }
      ];

      return {
        ...prev,
        projects: updatedProjects,
        activeProjectId: newId,
        materials: [...prev.materials, ...initialNewMaterials]
      };
    });
  };

  const archiveProject = (id: string) => {
    setState(prev => {
      const isArchivingActive = prev.activeProjectId === id;
      const updatedProjects = prev.projects.map(p => 
        p.id === id ? { ...p, isArchived: !p.isArchived, isActive: false } : p
      );
      
      let nextActive = prev.activeProjectId;
      if (isArchivingActive) {
        const remaining = updatedProjects.filter(p => !p.isArchived);
        nextActive = remaining.length > 0 ? remaining[0].id : null;
        if (nextActive) {
          updatedProjects.forEach(p => {
            if (p.id === nextActive) p.isActive = true;
          });
        }
      }

      return {
        ...prev,
        projects: updatedProjects,
        activeProjectId: nextActive
      };
    });
  };

  const updateProject = (proj: Project) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === proj.id ? proj : p)
    }));
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
  const payWorker = (workerId: string, amountPaid: number, method: string) => {
    if (!state.activeProjectId) return;
    
    setState(prev => {
      const worker = prev.workers.find(w => w.id === workerId);
      if (!worker) return prev;

      // Hitung status pembayaran
      // Worker wages are totalWages
      let newStatus: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' = worker.status;
      if (amountPaid >= worker.totalWages) {
        newStatus = 'LUNAS';
      } else if (amountPaid > 0) {
        newStatus = 'SEBAGIAN';
      }

      const updatedWorkers = prev.workers.map(w => 
        w.id === workerId ? { ...w, status: newStatus } : w
      );

      // Record transaction
      const newTx: Transaction = {
        id: `TX-${Date.now().toString().slice(-5)}`,
        projectId: prev.activeProjectId!,
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

      return {
        ...prev,
        workers: updatedWorkers,
        transactions: [newTx, ...prev.transactions]
      };
    });

    triggerNotification('Pembayaran Upah Tukang berhasil dicatat.', 'INFO');
  };

  const addWorker = (worker: Omit<Worker, 'id' | 'projectId' | 'totalWages'>) => {
    if (!state.activeProjectId) return;
    const newId = `WRK-${Date.now().toString().slice(-4)}`;
    const newWorker: Worker = {
      ...worker,
      id: newId,
      projectId: state.activeProjectId,
      totalWages: worker.daysWorked * worker.dailyRate
    };

    setState(prev => ({
      ...prev,
      workers: [...prev.workers, newWorker]
    }));

    triggerNotification(`Pekerja ${worker.name} berhasil ditambahkan.`, 'INFO');
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
    setState({
      currentUser: initialCurrentUser,
      projects: initialProjects,
      activeProjectId: 'PRJ-MDN-2024-08',
      transactions: initialTransactions,
      materials: initialMaterials,
      materialLogs: initialMaterialLogs,
      workers: initialWorkers,
      dailyReports: initialDailyReports,
      notifications: initialNotifications
    });
  };

  const updateWorker = (updatedWorker: Worker) => {
    setState(prev => ({
      ...prev,
      workers: prev.workers.map(w => w.id === updatedWorker.id ? updatedWorker : w)
    }));
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
        loginUser,
        logoutUser,
        addProject,
        setActiveProject,
        archiveProject,
        updateProject,
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
