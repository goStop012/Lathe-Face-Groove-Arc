/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  mobileView?: 'canvas' | 'params';
  setMobileView?: (view: 'canvas' | 'params') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  mobileView,
  setMobileView,
}) => {
  return (
    <header className="h-13 sm:h-14 border-b border-slate-800 bg-slate-950 px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <span className="text-sm sm:text-base font-bold tracking-tight text-white font-sans">
          CNC FaceGroove
        </span>
        <span className="text-xs text-slate-400 hidden sm:inline">
          · 端面槽干涉检查
        </span>
      </div>

      {/* 移动端视图快速切换器 (图纸 / 参数) */}
      {mobileView && setMobileView && (
        <div className="flex md:hidden items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setMobileView('canvas')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors touch-manipulation ${
              mobileView === 'canvas'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            图纸
          </button>
          <button
            onClick={() => setMobileView('params')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors touch-manipulation ${
              mobileView === 'params'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            参数
          </button>
        </div>
      )}

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded transition-colors touch-manipulation"
          title="重置为默认几何参数"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">重置参数</span>
        </button>
      </div>
    </header>
  );
};
