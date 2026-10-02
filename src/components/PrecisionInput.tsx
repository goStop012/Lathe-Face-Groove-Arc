/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface PrecisionInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  subLabel?: string;
  quickDeltas?: number[];
  accentColor?: 'cyan' | 'amber' | 'emerald' | 'slate' | 'sky';
}

export const PrecisionInput: React.FC<PrecisionInputProps> = ({
  label,
  value,
  onChange,
  unit = 'mm',
  min,
  max,
  step = 1,
  subLabel,
  quickDeltas = [-5, -1, 1, 5],
  accentColor = 'sky',
}) => {
  // 内部临时输入状态，支持输入小数点负号时不被强转重置
  const [textValue, setTextValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(String(value));
    }
  }, [value, isFocused]);

  const commitValue = (valStr: string) => {
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      let clamped = num;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(Number(clamped.toFixed(3)));
      setTextValue(String(Number(clamped.toFixed(3))));
    } else {
      setTextValue(String(value));
    }
  };

  const handleDelta = (delta: number) => {
    let next = value + delta;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    const rounded = Number(next.toFixed(2));
    onChange(rounded);
    setTextValue(String(rounded));
  };

  const colorStyles = {
    cyan: {
      borderFocus: 'focus-within:border-cyan-500 focus-within:ring-cyan-500/20',
      labelColor: 'text-cyan-400',
      btnHover: 'hover:bg-cyan-500/20 hover:text-cyan-300 active:bg-cyan-500/30',
    },
    amber: {
      borderFocus: 'focus-within:border-amber-500 focus-within:ring-amber-500/20',
      labelColor: 'text-amber-400',
      btnHover: 'hover:bg-amber-500/20 hover:text-amber-300 active:bg-amber-500/30',
    },
    emerald: {
      borderFocus: 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20',
      labelColor: 'text-emerald-400',
      btnHover: 'hover:bg-emerald-500/20 hover:text-emerald-300 active:bg-emerald-500/30',
    },
    slate: {
      borderFocus: 'focus-within:border-slate-400 focus-within:ring-slate-400/20',
      labelColor: 'text-slate-300',
      btnHover: 'hover:bg-slate-700 hover:text-slate-200 active:bg-slate-600',
    },
    sky: {
      borderFocus: 'focus-within:border-sky-500 focus-within:ring-sky-500/20',
      labelColor: 'text-sky-400',
      btnHover: 'hover:bg-sky-500/20 hover:text-sky-300 active:bg-sky-500/30',
    },
  }[accentColor];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className={`font-medium ${colorStyles.labelColor}`}>
          {label}
        </label>
        {subLabel && (
          <span className="font-mono text-[11px] text-slate-400">
            {subLabel}
          </span>
        )}
      </div>

      <div
        className={`flex items-center rounded-lg border border-slate-700 bg-slate-950 px-1.5 py-1 transition-all ring-2 ring-transparent ${colorStyles.borderFocus}`}
      >
        {/* 增大触控面积的减量按钮 */}
        <button
          type="button"
          onClick={() => handleDelta(-step)}
          className={`flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 text-slate-400 rounded-md transition-colors touch-manipulation ${colorStyles.btnHover}`}
          title={`减小 ${step} ${unit}`}
          aria-label={`减小 ${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* 移动端 16px 避免 iOS Safari 自动放大聚焦 */}
        <input
          type="text"
          inputMode="decimal"
          value={textValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            commitValue(textValue);
          }}
          onChange={(e) => {
            setTextValue(e.target.value);
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              let clamped = num;
              if (min !== undefined) clamped = Math.max(min, clamped);
              if (max !== undefined) clamped = Math.min(max, clamped);
              onChange(Number(clamped.toFixed(3)));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitValue(textValue);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleDelta(step);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleDelta(-step);
            }
          }}
          className="w-full bg-transparent px-2 text-center font-mono text-base sm:text-sm font-semibold text-slate-100 outline-none tabular-nums"
        />

        <span className="select-none font-mono text-xs text-slate-400 pr-1 shrink-0">
          {unit}
        </span>

        {/* 增大触控面积的增量按钮 */}
        <button
          type="button"
          onClick={() => handleDelta(step)}
          className={`flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 text-slate-400 rounded-md transition-colors touch-manipulation ${colorStyles.btnHover}`}
          title={`增加 ${step} ${unit}`}
          aria-label={`增加 ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 快捷微调步进按钮：在触屏上提供更易点击的尺寸 */}
      {quickDeltas && quickDeltas.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-1 justify-end pt-0.5 flex-wrap">
          {quickDeltas.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDelta(d)}
              className="px-2 py-1 sm:px-1.5 sm:py-0.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs sm:text-[10px] font-mono text-slate-300 hover:text-white transition-colors touch-manipulation"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
