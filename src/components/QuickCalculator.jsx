import React, { useState } from 'react';
import { Calculator, X, Delete, Copy, Check, Sparkles } from 'lucide-react';

export default function QuickCalculator({ isOpen, onClose, onApplyAmount }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [copied, setCopied] = useState(false);

  // Nights & Rate quick helper
  const [calculatorMode, setCalculatorMode] = useState('nights'); // 'nights' | 'ars'
  const [nights, setNights] = useState(5);
  const [nightRate, setNightRate] = useState(70);

  // ARS to USD helper
  const [arsVal, setArsVal] = useState('65000');
  const [arsRate, setArsRate] = useState('1250');

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (display === '0' || display === 'Error') {
      setDisplay(digit);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCalculate = () => {
    try {
      const fullExpr = equation + display;
      // Sanitize input to only allowed characters
      if (!/^[0-9+\-*/. ]+$/.test(fullExpr)) {
        setDisplay('Error');
        return;
      }
      // Safe math evaluation
      const result = Function(`'use strict'; return (${fullExpr})`)();
      const formatted = Math.round(result * 100) / 100;
      setDisplay(String(formatted));
      setEquation('');
    } catch (err) {
      setDisplay('Error');
    }
  };

  const handlePercentage = (pct) => {
    const val = parseFloat(display) || 0;
    const result = Math.round(val * pct * 100) / 100;
    setDisplay(String(result));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateNightsTotal = () => {
    const total = Number(nights) * Number(nightRate);
    setDisplay(String(total));
  };

  const calculateArsTotal = () => {
    const numArs = parseFloat(arsVal) || 0;
    const numRate = parseFloat(arsRate) || 1;
    const totalUsd = (numArs / numRate).toFixed(2);
    setDisplay(String(totalUsd));
    setEquation(`$${Number(arsVal).toLocaleString('es-AR')} ARS ÷ $${arsRate}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Calculadora Rápida</h3>
              <p className="text-xs text-slate-400">Presupuestos, señas y cambio USD/ARS</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="bg-slate-950 p-5 text-right border-b border-slate-800">
          <div className="text-xs font-mono text-slate-400 min-h-[1.25rem] truncate">
            {equation || ' '}
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight truncate mt-1">
            ${display} <span className="text-xs text-slate-500 font-sans">USD</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80">
            <button
              onClick={copyToClipboard}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
            {onApplyAmount && (
              <button
                onClick={() => {
                  onApplyAmount(parseFloat(display) || 0);
                  onClose();
                }}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800/50 hover:bg-blue-900/60 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Usar en Formulario
              </button>
            )}
          </div>
        </div>

        {/* Presets Bar with Mode Switcher */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 space-y-2">
          {/* Switcher */}
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/80 rounded-lg text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setCalculatorMode('nights')}
              className={`py-1 rounded-md transition ${
                calculatorMode === 'nights' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Noches × Tarifa
            </button>
            <button
              type="button"
              onClick={() => setCalculatorMode('ars')}
              className={`py-1 rounded-md transition ${
                calculatorMode === 'ars' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇦🇷 Pesos ➔ USD
            </button>
          </div>

          {calculatorMode === 'nights' ? (
            <div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs">
                  <input
                    type="number"
                    min="1"
                    value={nights}
                    onChange={(e) => setNights(e.target.value)}
                    className="w-full text-center font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-slate-400 text-[11px] ml-1">noches</span>
                </div>
                <span className="text-slate-400 font-bold text-xs">×</span>
                <div className="flex-1 flex items-center bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">$</span>
                  <input
                    type="number"
                    min="0"
                    value={nightRate}
                    onChange={(e) => setNightRate(e.target.value)}
                    className="w-full text-center font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <button
                  onClick={calculateNightsTotal}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  =
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-200/80">
                <span className="text-[11px] text-slate-500 font-semibold">Calcular seña:</span>
                <button
                  onClick={() => handlePercentage(0.3)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs rounded font-medium transition"
                >
                  30%
                </button>
                <button
                  onClick={() => handlePercentage(0.5)}
                  className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs rounded font-medium transition"
                >
                  50%
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="ARS"
                    value={arsVal}
                    onChange={(e) => setArsVal(e.target.value)}
                    className="w-full font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px] ml-1">ARS</span>
                </div>
                <span className="text-slate-400 font-bold text-xs">÷</span>
                <div className="flex-1 flex items-center bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs">
                  <span className="text-slate-400 text-[11px] mr-1">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="TC"
                    value={arsRate}
                    onChange={(e) => setArsRate(e.target.value)}
                    className="w-full font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px] ml-1">TC</span>
                </div>
                <button
                  onClick={calculateArsTotal}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  =
                </button>
              </div>
              <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                <span className="text-[10px] text-slate-400 font-medium">TC:</span>
                {[1200, 1250, 1300, 1350].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setArsRate(String(r));
                      const numArs = parseFloat(arsVal) || 0;
                      if (numArs > 0) {
                        const totalUsd = (numArs / r).toFixed(2);
                        setDisplay(String(totalUsd));
                        setEquation(`$${Number(arsVal).toLocaleString('es-AR')} ARS ÷ $${r}`);
                      }
                    }}
                    className="px-1.5 py-0.5 bg-white border border-slate-300 text-slate-600 text-[10px] rounded hover:bg-slate-200"
                  >
                    ${r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Standard Keypad */}
        <div className="grid grid-cols-4 gap-1.5 p-4 bg-white">
          <button
            onClick={handleClear}
            className="p-3 font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition text-sm"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="p-3 flex items-center justify-center text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePercentage(0.01)}
            className="p-3 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm"
          >
            %
          </button>
          <button
            onClick={() => handleOperator('/')}
            className="p-3 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-base"
          >
            ÷
          </button>

          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="p-3 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-base"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperator('*')}
            className="p-3 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-base"
          >
            ×
          </button>

          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="p-3 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-base"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperator('-')}
            className="p-3 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-base"
          >
            -
          </button>

          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="p-3 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-base"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleOperator('+')}
            className="p-3 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-base"
          >
            +
          </button>

          <button
            onClick={() => handleDigit('0')}
            className="col-span-2 p-3 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-base"
          >
            0
          </button>
          <button
            onClick={() => handleDigit('.')}
            className="p-3 font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-base"
          >
            .
          </button>
          <button
            onClick={handleCalculate}
            className="p-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition text-lg shadow-md"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
