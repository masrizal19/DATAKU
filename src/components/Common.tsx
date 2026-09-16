/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// Custom Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyle = "font-bold rounded-xl border-2 border-[#0F172A] transition-all flex items-center justify-center gap-2 select-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#0F172A] cursor-pointer";
  
  const variants = {
    primary: "bg-[#0284C7] text-white hover:bg-[#0369a1] shadow-neo",
    secondary: "bg-[#F59E0B] text-[#0F172A] hover:bg-[#d97706] shadow-neo",
    accent: "bg-[#F97316] text-white hover:bg-[#ea580c] shadow-neo",
    danger: "bg-[#FEE2E2] text-[#B91C1C] border-[#EF4444] hover:bg-[#fecaca] shadow-neo-sm",
    ghost: "bg-white text-[#0F172A] hover:bg-[#F1F5F9] border-2 border-[#0F172A] shadow-neo-sm"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base md:text-lg"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Custom Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'white' | 'tint' | 'amber' | 'cyan';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'white',
  ...props
}) => {
  const bgClasses = {
    white: 'bg-white',
    tint: 'bg-[#F1F5F9]',
    amber: 'bg-[#FEF3C7]',
    cyan: 'bg-[#E0F2FE]'
  };

  const clickableClasses = onClick 
    ? 'cursor-pointer hover:translate-y-[-2px] transition-transform select-none active:translate-y-[2px] active:translate-x-[1px]' 
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-2 border-[#0F172A] p-4 shadow-neo ${bgClasses[variant]} ${clickableClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Custom Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefixText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  prefixText,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="w-full mb-3">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#0F172A] uppercase mb-1 tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-stretch">
        {prefixText && (
          <span className="flex items-center px-3 bg-[#F1F5F9] border-y-2 border-l-2 border-[#0F172A] rounded-l-xl text-sm font-bold text-[#475569] select-none">
            {prefixText}
          </span>
        )}
        <input
          id={id}
          className={`w-full bg-white border-2 border-[#0F172A] px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#38BDF8]/40 ${
            prefixText ? 'rounded-r-xl border-l-0' : 'rounded-xl'
          } ${error ? 'border-[#EF4444]' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-[#EF4444] font-bold mt-1 select-none">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};

// Custom Textarea
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="w-full mb-3">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#0F172A] uppercase mb-1 tracking-wider">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#38BDF8]/40 ${
          error ? 'border-[#EF4444]' : ''
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && (
        <p className="text-xs text-[#EF4444] font-bold mt-1 select-none">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};

// Custom Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}) => {
  return (
    <div className="w-full mb-3">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#0F172A] uppercase mb-1 tracking-wider">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full bg-white border-2 border-[#0F172A] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#38BDF8]/40 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat ${
          error ? 'border-[#EF4444]' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-[#EF4444] font-bold mt-1 select-none">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};

// Status Badge
interface BadgeProps {
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, children, className = '' }) => {
  const styles = {
    success: 'bg-[#D1FAE5] text-[#065F46] border-[#059669]',
    warning: 'bg-[#FEF3C7] text-[#92400E] border-[#D97706]',
    danger: 'bg-[#FEE2E2] text-[#B91C1C] border-[#EF4444]',
    info: 'bg-[#E0F2FE] text-[#0369A1] border-[#0284C7]',
    neutral: 'bg-[#F1F5F9] text-[#334155] border-[#64748B]'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border-1.5 ${styles[type]} select-none whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
};

// Modal Box
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            className="relative bg-white border-2.5 border-[#0F172A] w-full max-w-lg rounded-2xl p-6 shadow-neo-lg z-10"
          >
            <div className="flex items-center justify-between border-b-2 border-[#F1F5F9] pb-3 mb-4">
              <h3 className="text-lg font-chunky text-[#0F172A] uppercase tracking-wide">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#0F172A] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Bottom Sheet (Mobile Quick Form Container)
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-xs"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative bg-white border-t-2.5 md:border-2.5 border-[#0F172A] w-full max-w-lg rounded-t-3xl md:rounded-2xl p-6 shadow-neo-lg z-10 max-h-[92vh] flex flex-col"
          >
            {/* Handle for mobile */}
            <div className="flex justify-center md:hidden mb-4 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 bg-[#0F172A] rounded-full" />
            </div>
            
            <div className="flex items-center justify-between border-b-2 border-[#F1F5F9] pb-3 mb-4 select-none">
              <h3 className="text-lg font-chunky text-[#0F172A] uppercase tracking-wide">{title}</h3>
              <button
                onClick={onClose}
                className="hidden md:block p-1 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#0F172A] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto no-scrollbar flex-1 pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Custom Toast System
interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const iconAndBg = {
    success: { bg: 'bg-[#D1FAE5]', border: 'border-[#10B981]', text: 'text-[#065F46]', icon: '✓' },
    info: { bg: 'bg-[#E0F2FE]', border: 'border-[#0284C7]', text: 'text-[#0369A1]', icon: 'ℹ️' },
    warning: { bg: 'bg-[#FEF3C7]', border: 'border-[#F59E0B]', text: 'text-[#92400E]', icon: '⚠️' },
    danger: { bg: 'bg-[#FEE2E2]', border: 'border-[#EF4444]', text: 'text-[#B91C1C]', icon: '❌' }
  };

  const current = iconAndBg[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 left-4 md:left-auto md:w-80 z-50 flex items-center gap-3 p-3.5 rounded-xl border-2 ${current.border} ${current.bg} ${current.text} shadow-neo font-bold text-sm`}
    >
      <span className="text-base select-none">{current.icon}</span>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100 font-extrabold px-1 text-current cursor-pointer select-none">
        TUTUP
      </button>
    </motion.div>
  );
};
