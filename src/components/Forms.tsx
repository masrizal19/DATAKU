/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Button, Input, TextArea, Select } from './Common';
import { Camera, Image, Check, Trash2, Sliders, DollarSign, Calendar, MapPin, Hammer, CloudSun, RefreshCw } from 'lucide-react';
import { MaterialCategory } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Mock high quality construction photo assets for simulation
const MOCK_PHOTOS = {
  semen: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&auto=format&fit=crop&q=80',
  besi: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=80',
  pasir: 'https://images.unsplash.com/photo-1532372320978-9b4d7a92b24d?w=400&auto=format&fit=crop&q=80',
  cat: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&auto=format&fit=crop&q=80',
  nota: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=400&auto=format&fit=crop&q=80',
  bukti: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=400&auto=format&fit=crop&q=80',
  pekerjaan: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&auto=format&fit=crop&q=80',
  alat: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80'
};

// --- REAL CAMERA & GALLERY UPLOAD COMPONENT ---
interface PhotoSelectorProps {
  label: string;
  photoType: keyof typeof MOCK_PHOTOS;
  onPhotoSelected: (url: string) => void;
  selectedPhotos: string[];
  onRemovePhoto: (index: number) => void;
  multiple?: boolean;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  label,
  photoType,
  onPhotoSelected,
  selectedPhotos,
  onRemovePhoto,
  multiple = false
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      alert('Format foto harus JPG, PNG, WEBP atau HEIC.');
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSize) {
      alert('Ukuran file foto maksimal adalah 10 MB.');
      return;
    }

    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setShowPreviewModal(true);
    setCameraError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const triggerCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  const triggerGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  const handleUploadAndSave = async () => {
    if (!pendingFile) return;

    setUploading(true);
    let finalUrl = '';

    if (isSupabaseConfigured) {
      try {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExt = pendingFile.name.split('.').pop() || 'jpg';
        const fileName = `${photoType}/${timestamp}_${randomString}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('dataku-files')
          .upload(fileName, pendingFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: pendingFile.type
          });

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('dataku-files')
          .getPublicUrl(fileName);

        finalUrl = publicUrl;
      } catch (err: any) {
        console.error('Real storage upload failed, using fallback:', err);
        // Fallback to local preview URL or high-quality mock URL
        finalUrl = localPreviewUrl || MOCK_PHOTOS[photoType] || MOCK_PHOTOS.pekerjaan;
      }
    } else {
      // Offline fallback: Use the local object URL or mock
      finalUrl = localPreviewUrl || MOCK_PHOTOS[photoType] || MOCK_PHOTOS.pekerjaan;
    }

    onPhotoSelected(finalUrl);
    setUploading(false);
    setShowPreviewModal(false);
    setPendingFile(null);
  };

  const handleCancelPending = () => {
    setPendingFile(null);
    setLocalPreviewUrl('');
    setShowPreviewModal(false);
  };

  return (
    <div className="mb-4">
      {/* Hidden File Inputs */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <span className="block text-xs font-extrabold text-[#0F172A] uppercase mb-1.5 tracking-wider">
        {label}
      </span>

      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Previews of selected photos */}
        {selectedPhotos.map((p, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-xl border-2 border-[#0F172A] overflow-hidden shadow-neo-sm bg-[#F1F5F9]">
            <img src={p} alt="Dokumentasi" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemovePhoto(idx)}
              className="absolute top-1 right-1 bg-red-100 border border-red-500 rounded-full p-1 text-red-600 hover:bg-red-200 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Buttons to trigger camera & gallery side-by-side */}
        {(multiple || selectedPhotos.length === 0) && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerCamera}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#0F172A]/40 flex flex-col items-center justify-center gap-1 hover:bg-[#F8FAFC] active:scale-95 transition-all cursor-pointer bg-white"
            >
              <Camera className="w-5 h-5 text-[#475569]" />
              <span className="text-[10px] font-extrabold text-[#475569] uppercase">Kamera</span>
            </button>
            <button
              type="button"
              onClick={triggerGallery}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-[#0F172A]/40 flex flex-col items-center justify-center gap-1 hover:bg-[#F8FAFC] active:scale-95 transition-all cursor-pointer bg-white"
            >
              <Image className="w-5 h-5 text-[#475569]" />
              <span className="text-[10px] font-extrabold text-[#475569] uppercase">Galeri</span>
            </button>
          </div>
        )}
      </div>

      {/* Camera/Photo Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-xs select-none">
          <div className="bg-white border-2.5 border-[#0F172A] rounded-2xl w-full max-w-sm overflow-hidden shadow-neo-lg flex flex-col">
            <div className="bg-[#FAF8FF] border-b-2 border-[#0F172A] px-4 py-3 flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase text-[#0F172A] tracking-wider">PREVIEW FOTO DOKUMENTASI</span>
              <button type="button" onClick={handleCancelPending} className="text-xs font-extrabold cursor-pointer">BATAL</button>
            </div>

            <div className="p-4 space-y-4 flex-1">
              <div className="relative aspect-square rounded-xl border-2 border-[#0F172A] bg-black overflow-hidden flex items-center justify-center">
                {localPreviewUrl ? (
                  <img src={localPreviewUrl} alt="Preview Foto Lapangan" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-6 text-white/70">
                    <p className="text-xs font-bold">Mempersiapkan preview...</p>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="text-xs font-extrabold uppercase tracking-wide">Mengunggah Foto...</p>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-semibold rounded-xl text-center">
                  ⚠️ {cameraError}
                </div>
              )}
            </div>

            <div className="bg-[#F8FAFC] border-t-2 border-[#0F172A] p-4 flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                type="button"
                disabled={uploading}
                onClick={triggerCamera}
              >
                Foto Ulang
              </Button>
              <Button
                variant="ghost"
                fullWidth
                type="button"
                disabled={uploading}
                onClick={triggerGallery}
              >
                Pilih Lain
              </Button>
              <Button
                variant="secondary"
                fullWidth
                type="button"
                disabled={uploading || !pendingFile}
                onClick={handleUploadAndSave}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- FORM 1: BUAT PROYEK BARU ---
interface ProyekFormProps {
  onSubmit: (data: { name: string; owner: string; location: string; startDate: string; targetDate: string; budget: number; notes: string }) => void;
  onCancel: () => void;
}

export const ProyekForm: React.FC<ProyekFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [targetDate, setTargetDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !owner || !location || !budget) {
      setError('Mohon lengkapi semua kolom wajib (*)');
      return;
    }
    const parsedBudget = parseFloat(budget.replace(/\D/g, ''));
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      setError('Budget harus berupa angka positif');
      return;
    }

    onSubmit({
      name,
      owner,
      location,
      startDate,
      targetDate: targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), // default 3 bulan
      budget: parsedBudget,
      notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}
      
      <Input label="Nama Proyek *" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Pembangunan Ruko 3 Pintu" />
      <Input label="Nama Pemilik *" type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Contoh: Bpk. Gunawan" />
      <Input label="Lokasi Proyek *" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Contoh: Jl. Ringroad No. 12, Medan" />
      
      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal Mulai *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="Target Selesai" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>

      <Input
        label="Budget Proyek (Rp) *"
        type="text"
        value={budget}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setBudget(raw ? Number(raw).toLocaleString('id-ID') : '');
        }}
        prefixText="Rp"
        placeholder="150.000.000"
      />

      <TextArea label="Catatan Tambahan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tulis catatan penting pengerjaan di sini..." />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Simpan Proyek</Button>
      </div>
    </form>
  );
};


// --- FORM 2: DANA MASUK ---
interface DanaMasukFormProps {
  onSubmit: (data: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  onCancel: () => void;
}

export const DanaMasukForm: React.FC<DanaMasukFormProps> = ({ onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Pembayaran Termin');
  const [source, setSource] = useState('Transfer Pemilik');
  const [method, setMethod] = useState('Transfer');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah dana harus diisi berupa angka');
      return;
    }
    onSubmit({
      amount: parsedAmount,
      category,
      sourceOrRecipient: source,
      paymentMethod: method,
      notes,
      photos,
      date
    });
  };

  const sources = [
    { value: 'Transfer Pemilik', label: 'Transfer Pemilik' },
    { value: 'Uang Muka Proyek', label: 'Uang Muka Proyek' },
    { value: 'Pembayaran Termin', label: 'Pembayaran Termin' },
    { value: 'Modal Pemilik', label: 'Modal Pemilik' },
    { value: 'Tambahan Dana', label: 'Tambahan Dana' },
    { value: 'Pinjaman', label: 'Pinjaman' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Jam *" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Input
        label="Jumlah Dana (Rp) *"
        type="text"
        value={amount}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
        }}
        prefixText="Rp"
        placeholder="10.000.000"
      />

      <Select label="Sumber Dana *" options={sources} value={source} onChange={(e) => setSource(e.target.value)} />
      
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Kategori Catatan"
          options={[
            { value: 'Pembayaran Termin', label: 'Termin' },
            { value: 'Uang Muka', label: 'Uang Muka (DP)' },
            { value: 'Kas Operasional', label: 'Kas Operasional' },
            { value: 'Tambahan', label: 'Tambahan' }
          ]}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Select
          label="Metode Pembayaran"
          options={[
            { value: 'Transfer', label: 'Transfer Bank' },
            { value: 'Kas Tunai', label: 'Kas Tunai' },
            { value: 'Lainnya', label: 'Lainnya' }
          ]}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />
      </div>

      <TextArea label="Keterangan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Dana tahap pertama, termin awal pembangunan." />
      
      <PhotoSelector
        label="Foto Bukti Transfer / Kwitansi"
        photoType="bukti"
        onPhotoSelected={(url) => setPhotos([...photos, url])}
        selectedPhotos={photos}
        onRemovePhoto={(idx) => setPhotos(photos.filter((_, i) => i !== idx))}
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Simpan Dana Masuk</Button>
      </div>
    </form>
  );
};


// --- FORM 3: BARANG MASUK ---
interface BarangMasukFormProps {
  onSubmit: (data: {
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
  }) => void;
  onCancel: () => void;
}

export const BarangMasukForm: React.FC<BarangMasukFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Semen');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('sak');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [payWithProjectFunds, setPayWithProjectFunds] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !price) {
      setError('Mohon lengkapi Nama Barang, Jumlah, dan Harga Satuan');
      return;
    }
    const parsedAmount = parseFloat(amount);
    const parsedPrice = parseFloat(price.replace(/\D/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah harus berupa angka positif');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Harga satuan harus diisi berupa angka positif');
      return;
    }

    onSubmit({
      name,
      category,
      amount: parsedAmount,
      unit,
      pricePerUnit: parsedPrice,
      supplier: supplier || 'Toko Material Lapangan',
      notes,
      photos,
      date: combineDateTime(date, time),
      payWithProjectFunds
    });
  };

  const categories: { value: MaterialCategory; label: string }[] = [
    { value: 'Semen', label: 'Semen' },
    { value: 'Pasir', label: 'Pasir' },
    { value: 'Batu', label: 'Batu' },
    { value: 'Besi', label: 'Besi' },
    { value: 'Kayu', label: 'Kayu' },
    { value: 'Cat', label: 'Cat' },
    { value: 'Keramik', label: 'Keramik' },
    { value: 'Paku', label: 'Paku' },
    { value: 'Alat Kerja', label: 'Alat Kerja' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal Masuk *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="Kategori Material *" options={categories} value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory)} />
      </div>

      <Input label="Nama Barang / Material *" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Semen Portland Gresik 50kg" />
      
      <div className="grid grid-cols-2 gap-3">
        <Input label="Jumlah Masuk *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" />
        <Input label="Satuan (sak/btg/kol) *" type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="sak" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Harga Satuan (Rp) *"
          type="text"
          value={price}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            setPrice(raw ? Number(raw).toLocaleString('id-ID') : '');
          }}
          prefixText="Rp"
          placeholder="75.000"
        />
        <Input label="Supplier / Toko" type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Contoh: TB Berkah Jaya" />
      </div>

      {/* Payment option */}
      <div className="flex items-center gap-3 bg-[#F1F5F9] border-2 border-[#0F172A] p-3 rounded-xl shadow-neo-sm select-none">
        <input
          id="payWithProjectFunds"
          type="checkbox"
          checked={payWithProjectFunds}
          onChange={(e) => setPayWithProjectFunds(e.target.checked)}
          className="w-5 h-5 accent-[#0284C7] border-2 border-[#0F172A] rounded cursor-pointer"
        />
        <label htmlFor="payWithProjectFunds" className="text-xs font-bold text-[#0F172A] cursor-pointer leading-tight">
          Bayar Langsung dengan Kas Proyek <br />
          <span className="text-[10px] font-semibold text-[#64748B]">(Otomatis menambah nominal pengeluaran keuangan)</span>
        </label>
      </div>

      <TextArea label="Keterangan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Diterima dalam kondisi baik, disimpan di gudang utama." />

      <div className="grid grid-cols-2 gap-3">
        <PhotoSelector
          label="Ambil Foto Barang"
          photoType={category.toLowerCase() as any}
          onPhotoSelected={(url) => setPhotos([...photos, url])}
          selectedPhotos={photos.filter((_, i) => i === 0)}
          onRemovePhoto={() => setPhotos(photos.filter((_, i) => i !== 0))}
        />
        <PhotoSelector
          label="Foto Nota Pembelian"
          photoType="nota"
          onPhotoSelected={(url) => setPhotos([...photos, url])}
          selectedPhotos={photos.filter((_, i) => i === 1)}
          onRemovePhoto={() => setPhotos(photos.filter((_, i) => i !== 1))}
        />
      </div>

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Simpan Barang Masuk</Button>
      </div>
    </form>
  );
};


// --- FORM 4: BARANG KELUAR ---
interface BarangKeluarFormProps {
  materials: { id: string; name: string; stock: number; unit: string }[];
  onSubmit: (data: { materialId: string; amount: number; purposeOrWork: string; usedBy: string; notes: string; photos: string[]; date: string }) => void;
  onCancel: () => void;
}

export const BarangKeluarForm: React.FC<BarangKeluarFormProps> = ({ materials, onSubmit, onCancel }) => {
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [usedBy, setUsedBy] = useState('');
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentMaterial = materials.find(m => m.id === materialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !amount || !purpose || !usedBy) {
      setError('Mohon lengkapi semua kolom wajib (*)');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah keluar harus berupa angka positif');
      return;
    }
    if (currentMaterial && parsedAmount > currentMaterial.stock) {
      setError(`Stok tidak mencukupi! Stok saat ini: ${currentMaterial.stock} ${currentMaterial.unit}`);
      return;
    }

    onSubmit({
      materialId,
      amount: parsedAmount,
      purposeOrWork: purpose,
      usedBy,
      notes,
      photos,
      date: combineDateTime(date, time)
    });
  };

  const materialOptions = materials.map(m => ({
    value: m.id,
    label: `${m.name} (Stok: ${m.stock} ${m.unit})`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <Input label="Tanggal Pengeluaran Gudang *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      
      {materialOptions.length > 0 ? (
        <Select label="Pilih Barang dari Gudang *" options={materialOptions} value={materialId} onChange={(e) => setMaterialId(e.target.value)} />
      ) : (
        <div className="p-3 bg-yellow-50 border border-yellow-400 rounded-xl text-xs font-semibold text-yellow-800">
          Belum ada stok material terdaftar di gudang proyek.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Jumlah Dikeluarkan *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Contoh: 10" />
        <Input label="Digunakan Oleh *" type="text" value={usedBy} onChange={(e) => setUsedBy(e.target.value)} placeholder="Contoh: Kenek Agus / Tukang Budi" />
      </div>

      <Input label="Tujuan / Pekerjaan Lapangan *" type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Contoh: Pekerjaan Kolom Lantai 2" />

      <TextArea label="Keterangan Tambahan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Besi dikeluarkan untuk dirakit oleh tukang besi." />

      <PhotoSelector
        label="Ambil Foto Serah Terima"
        photoType="besi"
        onPhotoSelected={(url) => setPhotos([url])}
        selectedPhotos={photos}
        onRemovePhoto={() => setPhotos([])}
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1" disabled={materials.length === 0}>Simpan Barang Keluar</Button>
      </div>
    </form>
  );
};


// --- FORM 5: BARANG TERPAKAI ---
interface BarangTerpakaiFormProps {
  materials: { id: string; name: string; stock: number; unit: string }[];
  onSubmit: (data: { materialId: string; amount: number; purposeOrWork: string; location: string; notes: string; photos: string[]; date: string }) => void;
  onCancel: () => void;
}

export const BarangTerpakaiForm: React.FC<BarangTerpakaiFormProps> = ({ materials, onSubmit, onCancel }) => {
  const [materialId, setMaterialId] = useState(materials[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentMaterial = materials.find(m => m.id === materialId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialId || !amount || !purpose || !location) {
      setError('Mohon lengkapi semua kolom wajib (*)');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Jumlah terpakai harus berupa angka positif');
      return;
    }
    if (currentMaterial && parsedAmount > currentMaterial.stock) {
      setError(`Stok tidak mencukupi! Stok saat ini: ${currentMaterial.stock} ${currentMaterial.unit}`);
      return;
    }

    onSubmit({
      materialId,
      amount: parsedAmount,
      purposeOrWork: purpose,
      location,
      notes,
      photos,
      date: combineDateTime(date, time)
    });
  };

  const materialOptions = materials.map(m => ({
    value: m.id,
    label: `${m.name} (Stok: ${m.stock} ${m.unit})`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <Input label="Tanggal Pemakaian *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      
      {materialOptions.length > 0 ? (
        <Select label="Pilih Material Terpakai *" options={materialOptions} value={materialId} onChange={(e) => setMaterialId(e.target.value)} />
      ) : (
        <div className="p-3 bg-yellow-50 border border-yellow-400 rounded-xl text-xs font-semibold text-yellow-800">
          Belum ada stok material terdaftar di gudang proyek.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Jumlah Terpakai *" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Contoh: 5" />
        <Input label="Lokasi Pemasangan *" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Contoh: Area Dapur Lantai 1" />
      </div>

      <Input label="Pekerjaan / Item Pekerjaan *" type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Contoh: Pengecoran Lantai" />

      <TextArea label="Keterangan Pengerjaan" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tuliskan catatan proses pengerjaan di lapangan..." />

      <PhotoSelector
        label="Ambil Foto Hasil Pekerjaan"
        photoType="semen"
        onPhotoSelected={(url) => setPhotos([url])}
        selectedPhotos={photos}
        onRemovePhoto={() => setPhotos([])}
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1" disabled={materials.length === 0}>Simpan Material Terpakai</Button>
      </div>
    </form>
  );
};


// --- FORM 6: PENGELUARAN PROYEK ---
interface PengeluaranFormProps {
  onSubmit: (data: { amount: number; category: string; sourceOrRecipient: string; paymentMethod: string; notes: string; photos: string[]; date: string }) => void;
  onCancel: () => void;
}

export const PengeluaranForm: React.FC<PengeluaranFormProps> = ({ onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Material');
  const [recipient, setRecipient] = useState('');
  const [method, setMethod] = useState('Kas Tunai');
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !recipient) {
      setError('Mohon isi nominal pengeluaran dan penerima dana');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal harus berupa angka positif');
      return;
    }

    onSubmit({
      amount: parsedAmount,
      category,
      sourceOrRecipient: recipient,
      paymentMethod: method,
      notes,
      photos,
      date: combineDateTime(date, time)
    });
  };

  const categories = [
    { value: 'Material', label: 'Material / Bahan' },
    { value: 'Upah Tukang', label: 'Upah Tukang' },
    { value: 'Transportasi', label: 'Transportasi' },
    { value: 'Konsumsi', label: 'Konsumsi' },
    { value: 'Sewa Alat', label: 'Sewa Alat' },
    { value: 'Operasional', label: 'Operasional Lapangan' },
    { value: 'Listrik/Air', label: 'Listrik & Air' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <Input label="Tanggal Pengeluaran *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      
      <Input
        label="Nominal Pengeluaran (Rp) *"
        type="text"
        value={amount}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
        }}
        prefixText="Rp"
        placeholder="1.500.000"
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Kategori *" options={categories} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select
          label="Metode Pembayaran"
          options={[
            { value: 'Kas Tunai', label: 'Kas Tunai' },
            { value: 'Transfer', label: 'Transfer Bank' },
            { value: 'Bon / Hutang', label: 'Bon / Hutang' }
          ]}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />
      </div>

      <Input label="Penerima / Toko / Nama *" type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Contoh: TB Berkah atau Bpk. Slamet" />

      <TextArea label="Keterangan Pengeluaran" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Pembelian paku cor dan kawat bendrat 2 kg." />

      <PhotoSelector
        label="Ambil Foto Nota / Bukti Pembayaran"
        photoType="nota"
        onPhotoSelected={(url) => setPhotos([url])}
        selectedPhotos={photos}
        onRemovePhoto={() => setPhotos([])}
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Simpan Pengeluaran</Button>
      </div>
    </form>
  );
};


// --- FORM 7: BAYAR UPAH TUKANG ---
interface UpahFormProps {
  workers: { id: string; name: string; position: string; totalWages: number; status: string }[];
  onSubmit: (workerId: string, amountPaid: number, method: string, dateStr: string) => void;
  onCancel: () => void;
}

export const UpahForm: React.FC<UpahFormProps> = ({ workers, onSubmit, onCancel }) => {
  const unpaidWorkers = workers.filter(w => w.status !== 'LUNAS');
  const [workerId, setWorkerId] = useState(unpaidWorkers[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Kas Tunai');
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(getJakartaDateString());
  const [time, setTime] = useState(getJakartaTimeInputString());

  const currentWorker = workers.find(w => w.id === workerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !amount) {
      setError('Mohon lengkapi Tukang yang dibayar dan Nominal Upah');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal pembayaran harus berupa angka positif');
      return;
    }

    onSubmit(workerId, parsedAmount, method, combineDateTime(date, time));
  };

  const workerOptions = unpaidWorkers.map(w => ({
    value: w.id,
    label: `${w.name} (${w.position}) - Sisa Wage: Rp ${w.totalWages.toLocaleString('id-ID')}`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      {workerOptions.length > 0 ? (
        <Select label="Pilih Tukang / Pekerja *" options={workerOptions} value={workerId} onChange={(e) => setWorkerId(e.target.value)} />
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-400 rounded-xl text-xs font-semibold text-emerald-800">
          🎉 Seluruh upah tukang minggu ini sudah dilunasi!
        </div>
      )}

      {currentWorker && (
        <div className="bg-[#FAF8FF] border border-[#0F172A] rounded-xl p-3 text-xs space-y-1.5 font-semibold text-[#475569]">
          <p className="text-[#0F172A] font-bold uppercase text-[10px] tracking-wider">Detil Upah Tukang:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>Nama: <span className="text-[#0F172A] font-bold">{currentWorker.name}</span></div>
            <div>Posisi: <span className="text-[#0F172A] font-bold">{currentWorker.position}</span></div>
            <div>Total Hak Upah: <span className="text-[#0F172A] font-bold">Rp {currentWorker.totalWages.toLocaleString('id-ID')}</span></div>
            <div>Status: <span className="text-amber-700 font-bold">{currentWorker.status}</span></div>
          </div>
        </div>
      )}

      <Input
        label="Nominal Pembayaran Upah (Rp) *"
        type="text"
        value={amount}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setAmount(raw ? Number(raw).toLocaleString('id-ID') : '');
        }}
        prefixText="Rp"
        placeholder="900.000"
      />

      <Select
        label="Metode Pembayaran *"
        options={[
          { value: 'Kas Tunai', label: 'Kas Tunai' },
          { value: 'Transfer', label: 'Transfer Bank' }
        ]}
        value={method}
        onChange={(e) => setMethod(e.target.value)}
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1" disabled={unpaidWorkers.length === 0}>Bayar Sekarang</Button>
      </div>
    </form>
  );
};


// --- FORM 8: LAPORAN HARIAN ---
interface LaporanFormProps {
  onSubmit: (data: { date: string; weather: string; workerCount: number; todayWork: string; materialsIn: string; materialsUsed: string; challenges: string; notes: string; photos: string[] }) => void;
  onCancel: () => void;
}

export const LaporanForm: React.FC<LaporanFormProps> = ({ onSubmit, onCancel }) => {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [weather, setWeather] = useState('Cerah');
  const [workers, setWorkers] = useState('8');
  const [workDone, setWorkDone] = useState('');
  const [matIn, setMatIn] = useState('');
  const [matUsed, setMatUsed] = useState('');
  const [challenge, setChallenge] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDone || !workers) {
      setError('Mohon lengkapi Jumlah Tukang dan Pekerjaan Hari Ini');
      return;
    }
    const parsedWorkers = parseInt(workers);
    if (isNaN(parsedWorkers) || parsedWorkers <= 0) {
      setError('Jumlah tukang harus berupa angka positif');
      return;
    }

    onSubmit({
      date,
      weather,
      workerCount: parsedWorkers,
      todayWork: workDone,
      materialsIn: matIn || 'Tidak ada',
      materialsUsed: matUsed || 'Tidak ada',
      challenges: challenge || 'Lancar / tidak ada kendala',
      notes,
      photos
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Tanggal Laporan *" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select
          label="Cuaca Harian *"
          options={[
            { value: 'Cerah', label: '☀️ Cerah' },
            { value: 'Hujan Rintik', label: '🌧️ Hujan Rintik' },
            { value: 'Hujan Lebat', label: '⛈️ Hujan Lebat' },
            { value: 'Mendung', label: '☁️ Mendung' }
          ]}
          value={weather}
          onChange={(e) => setWeather(e.target.value)}
        />
      </div>

      <Input label="Jumlah Pekerja Aktif (Tukang/Kenek) *" type="number" value={workers} onChange={(e) => setWorkers(e.target.value)} placeholder="Contoh: 8" />

      <TextArea label="Pekerjaan Hari Ini *" value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder="Contoh: Pemasangan dinding lantai 2, pengecoran balok dapur." />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Material Masuk Hari Ini" type="text" value={matIn} onChange={(e) => setMatIn(e.target.value)} placeholder="Semen 10 sak, Bata 300..." />
        <Input label="Material Terpakai Hari Ini" type="text" value={matUsed} onChange={(e) => setMatUsed(e.target.value)} placeholder="Semen 5 sak, Pasir 1 kol..." />
      </div>

      <Input label="Kendala / Masalah Lapangan" type="text" value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="Contoh: Hujan sore dari jam 15:00 s/d selesai." />

      <TextArea label="Catatan Tambahan Mandor" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan kontrol tambahan atau instruksi lanjutan..." />

      <PhotoSelector
        label="Ambil Dokumentasi Foto Pekerjaan Lapangan (Multiple)"
        photoType="pekerjaan"
        onPhotoSelected={(url) => setPhotos([...photos, url])}
        selectedPhotos={photos}
        onRemovePhoto={(idx) => setPhotos(photos.filter((_, i) => i !== idx))}
        multiple
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Kirim Laporan Harian</Button>
      </div>
    </form>
  );
};


// --- FORM 9: TAMBAH PEKERJA BARU ---
interface TambahPekerjaFormProps {
  onSubmit: (data: { name: string; position: string; dailyRate: number; daysWorked: number; status: 'BELUM_DIBAYAR' | 'SEBAGIAN' | 'LUNAS' }) => void;
  onCancel: () => void;
}

export const TambahPekerjaForm: React.FC<TambahPekerjaFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('Tukang');
  const [dailyRate, setDailyRate] = useState('');
  const [daysWorked, setDaysWorked] = useState('6');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dailyRate) {
      setError('Mohon lengkapi Nama Pekerja dan Upah Harian');
      return;
    }
    const parsedRate = parseFloat(dailyRate.replace(/\D/g, ''));
    const parsedDays = parseInt(daysWorked);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setError('Upah harian harus diisi berupa angka positif');
      return;
    }
    if (isNaN(parsedDays) || parsedDays <= 0) {
      setError('Jumlah hari kerja harus berupa angka positif');
      return;
    }

    onSubmit({
      name,
      position,
      dailyRate: parsedRate,
      daysWorked: parsedDays,
      status: 'BELUM_DIBAYAR'
    });
  };

  const positions = [
    { value: 'Tukang Batu', label: 'Tukang Batu' },
    { value: 'Tukang Besi', label: 'Tukang Besi' },
    { value: 'Tukang Kayu', label: 'Tukang Kayu' },
    { value: 'Kenek (Adukan)', label: 'Kenek (Adukan)' },
    { value: 'Instalatur Listrik', label: 'Instalatur Listrik' },
    { value: 'Tukang Cat', label: 'Tukang Cat' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pr-1">
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl">⚠️ {error}</div>}

      <Input label="Nama Lengkap Pekerja *" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Budi Prasetyo" />
      
      <div className="grid grid-cols-2 gap-3">
        <Select label="Posisi / Keahlian *" options={positions} value={position} onChange={(e) => setPosition(e.target.value)} />
        <Input label="Hari Kerja Awal *" type="number" value={daysWorked} onChange={(e) => setDaysWorked(e.target.value)} placeholder="6" />
      </div>

      <Input
        label="Upah per Hari (Rp) *"
        type="text"
        value={dailyRate}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setDailyRate(raw ? Number(raw).toLocaleString('id-ID') : '');
        }}
        prefixText="Rp"
        placeholder="150.000"
      />

      <div className="flex gap-3 pt-2 select-none">
        <Button variant="ghost" type="button" className="flex-1" onClick={onCancel}>Batal</Button>
        <Button variant="secondary" type="submit" className="flex-1">Tambah Tukang</Button>
      </div>
    </form>
  );
};
