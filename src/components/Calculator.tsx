/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, Button, Input } from './Common';
import { Layers, Calculator as CalcIcon, LayoutGrid, Box, ClipboardCopy } from 'lucide-react';

export const ProjectCalculator: React.FC = () => {
  const [calcTab, setCalcTab] = useState<'umum' | 'proyek'>('umum');
  
  // State for General Calculator
  const [display, setDisplay] = useState<string>('0');
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [shouldReset, setShouldReset] = useState<boolean>(false);

  // State for Project Calculator
  const [projCalcType, setProjCalcType] = useState<'luas' | 'volume' | 'semen_cor'>('luas');
  const [length, setLength] = useState<string>('10');
  const [width, setWidth] = useState<string>('5');
  const [height, setHeight] = useState<string>('0.12'); // tebal dak e.g. 12cm
  const [semenRatio, setSemenRatio] = useState<string>('57'); // sak semen per m3 untuk campuran K-225 (e.g. 5-7 sak)
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // General Calculator Operations
  const handleNumClick = (num: string) => {
    if (display === '0' || shouldReset) {
      setDisplay(num);
      setShouldReset(false);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOpClick = (op: string) => {
    const val = parseFloat(display);
    if (prevVal === null) {
      setPrevVal(val);
    } else if (operator) {
      const result = calculate(prevVal, val, operator);
      setPrevVal(result);
      setDisplay(String(result));
    }
    setOperator(op);
    setShouldReset(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      case '%': return (a * b) / 100;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (prevVal === null || !operator) return;
    const val = parseFloat(display);
    const result = calculate(prevVal, val, operator);
    setDisplay(String(result));
    setPrevVal(null);
    setOperator(null);
    setShouldReset(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevVal(null);
    setOperator(null);
    setShouldReset(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Math calculated outputs
  const calculatedLuas = parseFloat(length || '0') * parseFloat(width || '0');
  const calculatedVolume = parseFloat(length || '0') * parseFloat(width || '0') * parseFloat(height || '0');
  
  // Estimasi Kebutuhan Cor Campuran 1:2:3 (Semen:Pasir:Koral)
  // Berdasarkan SNI, 1 m3 beton membutuhkan sekitar:
  // - Semen Portland: ~326 kg (atau 6.5 sak @ 50kg)
  // - Pasir Beton: ~0.54 m3
  // - Kerikil/Split: ~0.82 m3
  const volumeTotal = calculatedVolume;
  const semenNeeded = Math.ceil(volumeTotal * 6.5);
  const pasirNeeded = (volumeTotal * 0.54).toFixed(1);
  const koralNeeded = (volumeTotal * 0.82).toFixed(1);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <Card className="p-5 select-none bg-white">
      {/* Tab Selector */}
      <div className="flex border-2 border-[#0F172A] rounded-xl overflow-hidden mb-5 shadow-neo-sm">
        <button
          onClick={() => setCalcTab('umum')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            calcTab === 'umum' ? 'bg-[#0284C7] text-white' : 'bg-white text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          <CalcIcon className="w-4.5 h-4.5" />
          Kalkulator Umum
        </button>
        <button
          onClick={() => setCalcTab('proyek')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            calcTab === 'proyek' ? 'bg-[#0284C7] text-white' : 'bg-white text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          Kalkulator Proyek
        </button>
      </div>

      {calcTab === 'umum' ? (
        /* GENERAL CALCULATOR FOR ONE-HAND USE */
        <div>
          {/* Display screen */}
          <div className="bg-[#F8FAFC] border-2 border-[#0F172A] rounded-xl p-4 mb-4 text-right shadow-inner select-all">
            <div className="text-xs text-[#64748B] font-bold h-4">
              {prevVal !== null ? `${prevVal} ${operator || ''}` : ''}
            </div>
            <div className="text-3xl font-chunky text-[#0F172A] tracking-normal break-all">
              {display}
            </div>
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleClear}
              className="py-4 bg-[#FEE2E2] text-[#B91C1C] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              C
            </button>
            <button
              onClick={handleBackspace}
              className="py-4 bg-[#F1F5F9] text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              ⌫
            </button>
            <button
              onClick={() => handleOpClick('%')}
              className="py-4 bg-[#F1F5F9] text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              %
            </button>
            <button
              onClick={() => handleOpClick('÷')}
              className="py-4 bg-[#FEF3C7] text-[#92400E] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              ÷
            </button>

            {['7', '8', '9'].map((n) => (
              <button
                key={n}
                onClick={() => handleNumClick(n)}
                className="py-4 bg-white text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer hover:bg-[#F8FAFC]"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => handleOpClick('×')}
              className="py-4 bg-[#FEF3C7] text-[#92400E] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              ×
            </button>

            {['4', '5', '6'].map((n) => (
              <button
                key={n}
                onClick={() => handleNumClick(n)}
                className="py-4 bg-white text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer hover:bg-[#F8FAFC]"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => handleOpClick('-')}
              className="py-4 bg-[#FEF3C7] text-[#92400E] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              -
            </button>

            {['1', '2', '3'].map((n) => (
              <button
                key={n}
                onClick={() => handleNumClick(n)}
                className="py-4 bg-white text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer hover:bg-[#F8FAFC]"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => handleOpClick('+')}
              className="py-4 bg-[#FEF3C7] text-[#92400E] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              +
            </button>

            <button
              onClick={() => handleNumClick('0')}
              className="col-span-2 py-4 bg-white text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer hover:bg-[#F8FAFC]"
            >
              0
            </button>
            <button
              onClick={() => handleNumClick('.')}
              className="py-4 bg-white text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-extrabold shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              .
            </button>
            <button
              onClick={handleEqual}
              className="py-4 bg-[#F59E0B] text-[#0F172A] border-2 border-[#0F172A] rounded-xl font-black shadow-neo-sm active:translate-y-[1.5px] cursor-pointer"
            >
              =
            </button>
          </div>
        </div>
      ) : (
        /* ESTIMATOR & BUILD MATERIAL CALCULATOR */
        <div className="space-y-4">
          {/* Proj Calc Subtabs */}
          <div className="flex gap-2 mb-2 select-none">
            <button
              onClick={() => setProjCalcType('luas')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border-1.5 border-[#0F172A] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                projCalcType === 'luas' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Luas (m²)
            </button>
            <button
              onClick={() => setProjCalcType('volume')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border-1.5 border-[#0F172A] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                projCalcType === 'volume' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Volume (m³)
            </button>
            <button
              onClick={() => setProjCalcType('semen_cor')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border-1.5 border-[#0F172A] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                projCalcType === 'semen_cor' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8FAFC] text-[#475569]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Kalkulator Cor
            </button>
          </div>

          <div className="bg-[#FAF8FF] border-2 border-[#0F172A] rounded-xl p-4 shadow-inner space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Panjang (m)"
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="10"
                className="bg-white"
              />
              <Input
                label="Lebar (m)"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="5"
                className="bg-white"
              />
            </div>

            {projCalcType !== 'luas' && (
              <Input
                label="Tinggi / Tebal Dak (m)"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="0.12"
                step="0.01"
                className="bg-white"
              />
            )}
          </div>

          {/* Results Display */}
          <div className="bg-[#E0F2FE] border-2 border-[#0F172A] rounded-xl p-4 shadow-neo-sm space-y-2 select-all">
            {projCalcType === 'luas' && (
              <div className="text-center">
                <p className="text-xs text-[#0369A1] font-bold uppercase tracking-wide">Hasil Luas</p>
                <p className="text-4xl font-chunky text-[#0F172A] my-1">
                  {calculatedLuas.toLocaleString('id-ID')} m²
                </p>
                <p className="text-xs text-[#0F172A] font-semibold">
                  Sangat cocok untuk perhitungan pasang keramik, cat tembok, atau plesteran.
                </p>
              </div>
            )}

            {projCalcType === 'volume' && (
              <div className="text-center">
                <p className="text-xs text-[#0369A1] font-bold uppercase tracking-wide">Hasil Volume</p>
                <p className="text-4xl font-chunky text-[#0F172A] my-1">
                  {calculatedVolume.toLocaleString('id-ID', { maximumFractionDigits: 3 })} m³
                </p>
                <p className="text-xs text-[#0F172A] font-semibold">
                  Sangat cocok untuk galian tanah, timbunan, atau pengadaan pasir cor.
                </p>
              </div>
            )}

            {projCalcType === 'semen_cor' && (
              <div className="space-y-3">
                <div className="text-center pb-2 border-b-1.5 border-[#0F172A]/10">
                  <p className="text-xs text-[#0369A1] font-bold uppercase tracking-wide">Volume Cor Total</p>
                  <p className="text-3xl font-chunky text-[#0F172A] my-0.5">
                    {calculatedVolume.toLocaleString('id-ID', { maximumFractionDigits: 3 })} m³
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl border border-[#0F172A] p-2 text-center shadow-neo-sm">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Semen</p>
                    <p className="text-lg font-extrabold text-[#0F172A]">{semenNeeded}</p>
                    <p className="text-[10px] text-[#475569] font-semibold">sak (50kg)</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#0F172A] p-2 text-center shadow-neo-sm">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Pasir</p>
                    <p className="text-lg font-extrabold text-[#0F172A]">{pasirNeeded}</p>
                    <p className="text-[10px] text-[#475569] font-semibold">m³</p>
                  </div>
                  <div className="bg-white rounded-xl border border-[#0F172A] p-2 text-center shadow-neo-sm">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase">Split/Koral</p>
                    <p className="text-lg font-extrabold text-[#0F172A]">{koralNeeded}</p>
                    <p className="text-[10px] text-[#475569] font-semibold">m³</p>
                  </div>
                </div>

                <p className="text-[10px] text-center text-[#475569] font-bold uppercase tracking-wide">
                  Estimasi Standard Campuran Mutu Beton K-225 (1 : 2 : 3)
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              let text = '';
              if (projCalcType === 'luas') text = `Kalkulator Luas: ${length}m x ${width}m = ${calculatedLuas} m²`;
              else if (projCalcType === 'volume') text = `Kalkulator Volume: ${length}m x ${width}m x ${height}m = ${calculatedVolume} m³`;
              else text = `Estimasi Cor: Vol = ${calculatedVolume}m³, Semen = ${semenNeeded} sak, Pasir = ${pasirNeeded} m³, Koral = ${koralNeeded} m³`;
              copyToClipboard(text);
            }}
          >
            <ClipboardCopy className="w-4.5 h-4.5" />
            {copiedText ? 'Berhasil Disalin! ✓' : 'Salin Hasil Perhitungan'}
          </Button>
        </div>
      )}
    </Card>
  );
};
