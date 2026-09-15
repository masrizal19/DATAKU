/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Toast } from '../components/Common';
import { Sparkles } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const { loginUser } = useApp();
  const [authView, setAuthView] = useState<'splash' | 'login'>('splash');
  
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [infoToast, setInfoToast] = useState<string | null>(null);

  // Auto skip splash after 2.5 seconds
  useEffect(() => {
    if (authView === 'splash') {
      const timer = setTimeout(() => {
        setAuthView('login');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [authView]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Automatic uppercase conversion and trim spaces automatically
    const cleanVal = rawVal.toUpperCase().replace(/\s+/g, '');
    setUsername(cleanVal);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Only numbers allowed, maximum 6 digits
    const cleanVal = rawVal.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(cleanVal);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim().toUpperCase();
    const trimmedPin = pin.trim();

    // Validasi input wajib diisi
    if (!trimmedUsername) {
      setError('Username wajib diisi');
      return;
    }
    if (!trimmedPin) {
      setError('PIN wajib diisi');
      return;
    }

    // Validasi akun demo / kustom yang telah diupdate di Pengaturan
    const savedUsername = (localStorage.getItem('dataku_user') || 'PAUJI').toUpperCase().replace(/\s+/g, '');
    const savedPin = localStorage.getItem('dataku_pin') || '1999';

    if (trimmedUsername === savedUsername && trimmedPin === savedPin) {
      // Login Berhasil
      setSuccessToast(`Login berhasil. Selamat datang, ${trimmedUsername}!`);
      
      // Simpan session pada localStorage
      localStorage.setItem('dataku_auth', 'true');
      localStorage.setItem('dataku_user', trimmedUsername);
      
      // Update state di AppContext & trigger redirection
      loginUser(trimmedUsername);
      
      // Biarkan user melihat toast sukses sejenak sebelum redirect
      setTimeout(() => {
        onAuthSuccess();
      }, 1000);
    } else {
      // Login Gagal (tidak membeberkan detail mana yang salah)
      setError('Username atau PIN salah.');
    }
  };

  const handleLupaPin = () => {
    setInfoToast('Silakan hubungi administrator proyek Anda untuk mereset PIN.');
  };

  const handleDaftarBaru = () => {
    setInfoToast('Fitur pendaftaran akan tersedia pada tahap berikutnya.');
  };

  // --- SPLASH SCREEN ---
  if (authView === 'splash') {
    return (
      <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-6 select-none">
        <div className="text-center space-y-6 max-w-sm">
          {/* Main Logo Icon */}
          <div className="w-24 h-24 rounded-3xl bg-[#FBBF24] border-3.5 border-[#0F172A] shadow-neo flex items-center justify-center text-5xl mx-auto animate-bounce">
            🔨
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-chunky text-[#0F172A] tracking-tight uppercase">
              DATAKU
            </h1>
            <p className="text-xs font-extrabold uppercase bg-[#38BDF8] text-[#0F172A] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-neo-sm inline-block">
              Aplikasi Mandor Bangunan
            </p>
          </div>

          <p className="text-sm font-bold text-[#475569] leading-relaxed uppercase">
            Catat Dana Masuk • Pantau Material • Kelola Upah Tukang Lapangan.
          </p>

          <div className="pt-6">
            <Button variant="secondary" onClick={() => setAuthView('login')} fullWidth>
              Mulai Sekarang <Sparkles className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex items-center justify-center p-4">
      {successToast && (
        <Toast
          message={successToast}
          type="success"
          onClose={() => setSuccessToast(null)}
        />
      )}
      {infoToast && (
        <Toast
          message={infoToast}
          type="info"
          onClose={() => setInfoToast(null)}
        />
      )}

      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center space-y-2 mb-6 select-none">
          <div className="w-14 h-14 rounded-2xl bg-[#FBBF24] border-2.5 border-[#0F172A] shadow-neo-sm flex items-center justify-center text-3xl mx-auto mb-2">
            👷
          </div>
          <h2 className="text-2xl font-chunky text-[#0F172A] uppercase">Masuk DATAKU</h2>
          <p className="text-xs text-[#64748B] font-bold uppercase">Akses Dasbor & Manajemen Lapangan Anda</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded-xl select-none">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="USERNAME *"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Masukkan username mandor"
          />

          <Input
            label="PIN *"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={handlePinChange}
            placeholder="Masukkan PIN"
          />

          <div className="flex justify-end select-none">
            <button
              type="button"
              onClick={handleLupaPin}
              className="text-xs font-bold text-[#0284C7] hover:underline cursor-pointer uppercase"
            >
              Lupa PIN?
            </button>
          </div>

          <Button variant="secondary" type="submit" fullWidth>
            Masuk ke Dasbor
          </Button>
        </form>

        {/* Demo Option & Register */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-3 select-none">
          <p className="text-center text-[11px] text-[#64748B] font-semibold uppercase">
            Belum punya akun?{' '}
            <button
              onClick={handleDaftarBaru}
              className="text-[#0284C7] font-extrabold hover:underline cursor-pointer"
            >
              Daftar Mandor Baru
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};
