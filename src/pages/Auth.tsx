/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input, Toast } from '../components/Common';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

    const tryLogin = async () => {
      try {
        // 1. Connection test before login
        const { error: testError } = await supabase.rpc('dataku_connection_test');
        if (testError) {
          console.error('Connection test error:', testError);
          const errMessage = testError.message || JSON.stringify(testError);
          if (errMessage.toLowerCase().includes('invalid api key')) {
            setError('Konfigurasi koneksi database bermasalah.');
            return;
          }
        }

        // 2. Perform RPC login_mandor
        const { data, error: rpcError } = await supabase.rpc('login_mandor', {
          p_username: trimmedUsername,
          p_pin: trimmedPin
        });

        if (rpcError) {
          console.error('RPC login_mandor error:', rpcError);
          const errMessage = rpcError.message || JSON.stringify(rpcError);
          if (errMessage.toLowerCase().includes('invalid api key')) {
            setError('Konfigurasi koneksi database bermasalah.');
            return;
          }
          setError('Username atau PIN salah.');
          return;
        }

        // RPC returns true/success boolean or valid mandor object/list
        const isSuccess = data && (data === true || (Array.isArray(data) && data.length > 0) || (typeof data === 'object' && Object.keys(data).length > 0));

        if (isSuccess) {
          let mandorId = 'demo-id';
          let mandorName = trimmedUsername;
          if (Array.isArray(data) && data[0]) {
            mandorId = data[0].id || mandorId;
            mandorName = data[0].full_name || data[0].username || mandorName;
          } else if (typeof data === 'object') {
            mandorId = (data as any).id || mandorId;
            mandorName = (data as any).full_name || (data as any).username || mandorName;
          }

          setSuccessToast(`Login berhasil. Selamat datang, ${mandorName}!`);
          
          localStorage.setItem('dataku_auth', 'true');
          localStorage.setItem('dataku_user', trimmedUsername);
          localStorage.setItem('dataku_mandor_id', mandorId);
          
          loginUser(trimmedUsername);
          
          setTimeout(() => {
            onAuthSuccess();
          }, 1000);
        } else {
          setError('Username atau PIN salah.');
        }
      } catch (err: any) {
        console.error('Login exception:', err);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('invalid api key')) {
          setError('Konfigurasi koneksi database bermasalah.');
        } else {
          setError('Username atau PIN salah.');
        }
      }
    };

    tryLogin();
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
