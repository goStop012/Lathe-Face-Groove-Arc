/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CircleConfig,
  HorizontalLineConfig,
  HorizontalClearanceLine,
  CanvasDisplaySettings,
} from '../types/machining';
import { PrecisionInput } from './PrecisionInput';
import {
  Circle,
  MoveVertical,
  Minus,
  Link,
  Unlink,
  RotateCcw,
  Settings,
} from 'lucide-react';

interface ParameterPanelProps {
  circle1: CircleConfig;
  circle2: CircleConfig;
  horizontalLine: HorizontalLineConfig;
  lengthUp: number;
  lengthDown: number;
  concentric: boolean;
  syncLengths: boolean;
  clearanceLines: HorizontalClearanceLine[];
  displaySettings: CanvasDisplaySettings;
  onUpdateCircle1: (updates: Partial<CircleConfig>) => void;
  onUpdateCircle2: (updates: Partial<CircleConfig>) => void;
  onUpdateHorizontalLine: (updates: Partial<HorizontalLineConfig>) => void;
  onUpdateLengthUp: (val: number) => void;
  onUpdateLengthDown: (val: number) => void;
  setConcentric: (val: boolean) => void;
  setSyncLengths: (val: boolean) => void;
  onUpdateDisplaySettings: (updates: Partial<CanvasDisplaySettings>) => void;
  onSwitchToCanvas?: () => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  circle1,
  circle2,
  horizontalLine,
  lengthUp,
  lengthDown,
  concentric,
  syncLengths,
  clearanceLines,
  displaySettings,
  onUpdateCircle1,
  onUpdateCircle2,
  onUpdateHorizontalLine,
  onUpdateLengthUp,
  onUpdateLengthDown,
  setConcentric,
  setSyncLengths,
  onUpdateDisplaySettings,
  onSwitchToCanvas,
}) => {
  const isDiameter = displaySettings.circleInputMode === 'diameter';

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-r border-slate-800 overflow-y-auto text-slate-200 text-xs">
      <div className="p-3.5 space-y-4 flex-1">
        {/* 同心关联锁 */}
        <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-300 font-medium">双圆同心联动 (Concentric)</span>
          <button
            onClick={() => setConcentric(!concentric)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              concentric
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {concentric ? (
              <>
                <Link className="w-3.5 h-3.5 text-sky-400" />
                <span>同心锁定</span>
              </>
            ) : (
              <>
                <Unlink className="w-3.5 h-3.5 text-slate-400" />
                <span>独立偏心</span>
              </>
            )}
          </button>
        </div>

        {/* 1. 圆 1 (Circle 1) */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-cyan-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Circle className="w-3.5 h-3.5" />
              <span>圆 1 (外壁 / 主圆)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateDisplaySettings({
                    circleInputMode: isDiameter ? 'radius' : 'diameter',
                  })
                }
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="快速切换半径/直径输入模式"
              >
                {isDiameter ? '直径 Ø' : '半径 R'}
              </button>
              <span className="font-mono text-cyan-300 font-semibold tabular-nums text-xs">
                {isDiameter
                  ? `Ø${(circle1.radius * 2).toFixed(1)} mm`
                  : `R${circle1.radius.toFixed(1)} mm`}
              </span>
            </div>
          </div>

          {isDiameter ? (
            <PrecisionInput
              label="直径 Ø1"
              value={Number((circle1.radius * 2).toFixed(3))}
              onChange={(d) =>
                onUpdateCircle1({
                  radius: Math.max(0.25, Number((d / 2).toFixed(3))),
                })
              }
              unit="mm"
              min={0.5}
              max={1000}
              step={1}
              subLabel={`对应半径 R: ${circle1.radius.toFixed(2)} mm`}
              quickDeltas={[-20, -10, -2, 2, 10, 20]}
              accentColor="cyan"
            />
          ) : (
            <PrecisionInput
              label="半径 R1"
              value={circle1.radius}
              onChange={(r) => onUpdateCircle1({ radius: Math.max(0.25, r) })}
              unit="mm"
              min={0.25}
              max={500}
              step={0.5}
              subLabel={`对应直径 Ø: ${(circle1.radius * 2).toFixed(2)} mm`}
              quickDeltas={[-10, -5, -1, 1, 5, 10]}
              accentColor="cyan"
            />
          )}

          {!concentric && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">圆心 X1 (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={circle1.cx}
                  onChange={(e) => onUpdateCircle1({ cx: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2 py-1 font-mono text-slate-100 text-center text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">圆心 Y1 (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={circle1.cy}
                  onChange={(e) => onUpdateCircle1({ cy: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded px-2 py-1 font-mono text-slate-100 text-center text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. 圆 2 (Circle 2) */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-amber-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Circle className="w-3.5 h-3.5" />
              <span>圆 2 (内壁 / 刀体圆弧)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateDisplaySettings({
                    circleInputMode: isDiameter ? 'radius' : 'diameter',
                  })
                }
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="快速切换半径/直径输入模式"
              >
                {isDiameter ? '直径 Ø' : '半径 R'}
              </button>
              <span className="font-mono text-amber-300 font-semibold tabular-nums text-xs">
                {isDiameter
                  ? `Ø${(circle2.radius * 2).toFixed(1)} mm`
                  : `R${circle2.radius.toFixed(1)} mm`}
              </span>
            </div>
          </div>

          {isDiameter ? (
            <PrecisionInput
              label="直径 Ø2"
              value={Number((circle2.radius * 2).toFixed(3))}
              onChange={(d) =>
                onUpdateCircle2({
                  radius: Math.max(0.25, Number((d / 2).toFixed(3))),
                })
              }
              unit="mm"
              min={0.5}
              max={1000}
              step={1}
              subLabel={`对应半径 R: ${circle2.radius.toFixed(2)} mm`}
              quickDeltas={[-20, -10, -2, 2, 10, 20]}
              accentColor="amber"
            />
          ) : (
            <PrecisionInput
              label="半径 R2"
              value={circle2.radius}
              onChange={(r) => onUpdateCircle2({ radius: Math.max(0.25, r) })}
              unit="mm"
              min={0.25}
              max={500}
              step={0.5}
              subLabel={`对应直径 Ø: ${(circle2.radius * 2).toFixed(2)} mm`}
              quickDeltas={[-10, -5, -1, 1, 5, 10]}
              accentColor="amber"
            />
          )}

          {!concentric && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">圆心 X2 (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={circle2.cx}
                  onChange={(e) => onUpdateCircle2({ cx: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 font-mono text-slate-100 text-center text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">圆心 Y2 (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={circle2.cy}
                  onChange={(e) => onUpdateCircle2({ cy: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 font-mono text-slate-100 text-center text-xs outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. 基准水平线设置 */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              <span>基准水平线</span>
            </div>
            <button
              onClick={() => onUpdateHorizontalLine({ y: 0 })}
              className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 hover:underline"
              title="水平线回归中心零点"
            >
              <RotateCcw className="w-3 h-3" />
              <span>归零 (Y=0)</span>
            </button>
          </div>

          <PrecisionInput
            label="水平基准线高度 Y"
            value={horizontalLine.y}
            onChange={(y) => onUpdateHorizontalLine({ y })}
            unit="mm"
            min={-200}
            max={200}
            step={0.5}
            subLabel="剖切参考位置"
            quickDeltas={[-10, -5, -1, 1, 5, 10]}
            accentColor="slate"
          />
        </div>

        {/* 4. 垂直线长度设置 */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <MoveVertical className="w-3.5 h-3.5" />
              <span>垂直线长度设置 (4交点各2条)</span>
            </div>
            <button
              onClick={() => setSyncLengths(!syncLengths)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                syncLengths
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {syncLengths ? '上下同步' : '独立长度'}
            </button>
          </div>

          {/* 向上垂直线 */}
          <PrecisionInput
            label="上方垂直线长度 (L_up)"
            value={lengthUp}
            onChange={(val) => {
              const clamped = Math.max(1, val);
              onUpdateLengthUp(clamped);
              if (syncLengths) onUpdateLengthDown(clamped);
            }}
            unit="mm"
            min={1}
            max={300}
            step={1}
            subLabel="进刀/深度方向"
            quickDeltas={[-10, -5, -1, 1, 5, 10]}
            accentColor="emerald"
          />

          {/* 向下垂直线 */}
          <PrecisionInput
            label="下方垂直线长度 (L_down)"
            value={lengthDown}
            onChange={(val) => {
              const clamped = Math.max(1, val);
              onUpdateLengthDown(clamped);
              if (syncLengths) onUpdateLengthUp(clamped);
            }}
            unit="mm"
            min={1}
            max={300}
            step={1}
            subLabel="回退/避空方向"
            quickDeltas={[-10, -5, -1, 1, 5, 10]}
            accentColor="emerald"
          />
        </div>

        {/* 5. 切深端点水平回交避空量 (ΔX) */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-sky-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sky-400 font-semibold flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-0.5 bg-sky-400 border-b border-dashed border-sky-400" />
              <span>端点水平回交避空量 (ΔX)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              各深度端点侧向裕度
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
            {clearanceLines
              .filter((l, idx, arr) => arr.findIndex(x => x.originPointId === l.originPointId && x.direction === l.direction && x.targetCircleId === (l.originPointId === 'P1' || l.originPointId === 'P4' ? circle1.id : circle2.id)) === idx)
              .slice(0, 8)
              .map((line) => (
                <div
                  key={line.id}
                  className="bg-slate-900/90 p-1.5 rounded border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-slate-400">
                    {line.originPointId} {line.direction === 'up' ? '上' : '下'}:
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      line.status === 'collision'
                        ? 'text-rose-400'
                        : line.status === 'warning'
                        ? 'text-amber-400'
                        : 'text-sky-300'
                    }`}
                  >
                    {line.hasIntersection ? `ΔX ${line.clearanceDistance.toFixed(2)}` : '超限'}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 6. 齿轮设置：图纸与视口显示设置 */}
        <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              <span>图纸显示与视口设置</span>
            </div>
            {/* 主题选择 */}
            <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
              {(['dark', 'blueprint', 'light'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdateDisplaySettings({ theme: t })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    displaySettings.theme === t
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'dark' ? '暗黑' : t === 'blueprint' ? '蓝图' : '工程白'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onUpdateDisplaySettings({ showGrid: !displaySettings.showGrid })}
              className={`flex items-center justify-between p-2 rounded-md border text-[11px] font-medium transition-all ${
                displaySettings.showGrid
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span>坐标网格</span>
              <span className="font-mono text-[10px]">{displaySettings.showGrid ? '已开启' : '关闭'}</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateDisplaySettings({ showDimensions: !displaySettings.showDimensions })}
              className={`flex items-center justify-between p-2 rounded-md border text-[11px] font-medium transition-all ${
                displaySettings.showDimensions
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span>尺寸标注</span>
              <span className="font-mono text-[10px]">{displaySettings.showDimensions ? '已开启' : '关闭'}</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateDisplaySettings({ showCoordinates: !displaySettings.showCoordinates })}
              className={`flex items-center justify-between p-2 rounded-md border text-[11px] font-medium transition-all ${
                displaySettings.showCoordinates
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span>交点坐标</span>
              <span className="font-mono text-[10px]">{displaySettings.showCoordinates ? '已开启' : '关闭'}</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateDisplaySettings({ showInterferenceLabels: !displaySettings.showInterferenceLabels })}
              className={`flex items-center justify-between p-2 rounded-md border text-[11px] font-medium transition-all ${
                displaySettings.showInterferenceLabels
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
            >
              <span>干涉标记</span>
              <span className="font-mono text-[10px]">{displaySettings.showInterferenceLabels ? '已开启' : '关闭'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => onUpdateDisplaySettings({ showClearanceLines: !displaySettings.showClearanceLines })}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                displaySettings.showClearanceLines
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span>避空水平引线</span>
              <span className="font-mono text-[10px]">({displaySettings.showClearanceLines ? '开启' : '关闭'})</span>
            </button>

            {displaySettings.showClearanceLines && (
              <select
                value={displaySettings.clearanceMode}
                onChange={(e) => onUpdateDisplaySettings({ clearanceMode: e.target.value as any })}
                className="bg-slate-900 text-sky-300 px-2 py-1 rounded border border-slate-700 text-[11px] outline-none cursor-pointer"
              >
                <option value="origin_circle">回交本圆弧</option>
                <option value="opposite_circle">交对侧圆弧</option>
                <option value="both">双向交回</option>
              </select>
            )}
          </div>

          {/* 圆1与圆2输入方式（半径 / 直径） */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-300 font-medium">圆尺寸输入方式</span>
            <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateDisplaySettings({ circleInputMode: 'radius' })}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  displaySettings.circleInputMode === 'radius'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                半径 (R)
              </button>
              <button
                type="button"
                onClick={() => onUpdateDisplaySettings({ circleInputMode: 'diameter' })}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  displaySettings.circleInputMode === 'diameter'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                直径 (Ø)
              </button>
            </div>
          </div>
        </div>

        {/* 移动端返回图纸快捷按键 */}
        {onSwitchToCanvas && (
          <div className="md:hidden pt-2 pb-6">
            <button
              type="button"
              onClick={onSwitchToCanvas}
              className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-sky-600 active:bg-sky-700 text-white rounded-lg font-semibold text-sm shadow-lg transition-colors touch-manipulation"
            >
              <span>查看 CAD 实时图纸</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
