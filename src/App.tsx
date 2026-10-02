/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  CircleConfig,
  HorizontalLineConfig,
  CanvasDisplaySettings,
} from './types/machining';
import {
  buildIntersectionPoints,
  inspectAllSegments,
  summarizeInspection,
} from './utils/geometry';
import { Header } from './components/Header';
import { CadCanvas } from './components/CadCanvas';
import { ParameterPanel } from './components/ParameterPanel';

const DEFAULT_CIRCLE1: CircleConfig = {
  id: 'circle1',
  name: '圆 1 (外壁 / 主圆)',
  cx: 0,
  cy: 0,
  radius: 60,
  color: '#06b6d4',
};

const DEFAULT_CIRCLE2: CircleConfig = {
  id: 'circle2',
  name: '圆 2 (内壁 / 刀体圆弧)',
  cx: 0,
  cy: 0,
  radius: 40,
  color: '#f59e0b',
};

const DEFAULT_HORIZONTAL_LINE: HorizontalLineConfig = {
  y: 0,
  color: '#94a3b8',
  label: '切削刃中心基准线',
};

const DEFAULT_DISPLAY_SETTINGS: CanvasDisplaySettings = {
  showGrid: true,
  showDimensions: true,
  showCoordinates: true,
  showInterferenceLabels: true,
  showClearanceLines: true,
  clearanceMode: 'origin_circle',
  circleInputMode: 'radius',
  theme: 'dark',
};

export default function App() {
  // 核心几何模型状态
  const [circle1, setCircle1] = useState<CircleConfig>(DEFAULT_CIRCLE1);
  const [circle2, setCircle2] = useState<CircleConfig>(DEFAULT_CIRCLE2);
  const [horizontalLine, setHorizontalLine] =
    useState<HorizontalLineConfig>(DEFAULT_HORIZONTAL_LINE);

  // 垂直线长度 (向上与向下)
  const [lengthUp, setLengthUp] = useState<number>(20);
  const [lengthDown, setLengthDown] = useState<number>(20);

  // 约束状态
  const [concentric, setConcentric] = useState<boolean>(true);
  const [syncLengths, setSyncLengths] = useState<boolean>(true);

  // 图纸显示与视口设置（齿轮设置状态）
  const [displaySettings, setDisplaySettings] =
    useState<CanvasDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  const handleUpdateDisplaySettings = useCallback(
    (updates: Partial<CanvasDisplaySettings>) => {
      setDisplaySettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // 移动端专用视图状态：'canvas' 显示 CAD 图纸，'params' 显示参数调节面板
  const [mobileView, setMobileView] = useState<'canvas' | 'params'>('canvas');

  // 同心联动更新
  const handleUpdateCircle1 = useCallback(
    (updates: Partial<CircleConfig>) => {
      setCircle1((prev) => {
        const next = { ...prev, ...updates };
        if (concentric && (updates.cx !== undefined || updates.cy !== undefined)) {
          setCircle2((prevC2) => ({
            ...prevC2,
            cx: updates.cx ?? prevC2.cx,
            cy: updates.cy ?? prevC2.cy,
          }));
        }
        return next;
      });
    },
    [concentric]
  );

  const handleUpdateCircle2 = useCallback(
    (updates: Partial<CircleConfig>) => {
      setCircle2((prev) => {
        const next = { ...prev, ...updates };
        if (concentric && (updates.cx !== undefined || updates.cy !== undefined)) {
          setCircle1((prevC1) => ({
            ...prevC1,
            cx: updates.cx ?? prevC1.cx,
            cy: updates.cy ?? prevC1.cy,
          }));
        }
        return next;
      });
    },
    [concentric]
  );

  const handleUpdateHorizontalLine = useCallback(
    (updates: Partial<HorizontalLineConfig>) => {
      setHorizontalLine((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // 4个交点及8条垂直线实时计算
  const intersections = useMemo(() => {
    return buildIntersectionPoints(
      circle1,
      circle2,
      horizontalLine.y,
      lengthUp,
      lengthDown
    );
  }, [circle1, circle2, horizontalLine.y, lengthUp, lengthDown]);

  // 干涉与切深端点水平避空线计算
  const inspections = useMemo(() => {
    return inspectAllSegments(intersections, circle1, circle2);
  }, [intersections, circle1, circle2]);

  // 提取端点避空引线数据
  const summary = useMemo(() => {
    return summarizeInspection(inspections);
  }, [inspections]);

  // 重置回初始几何参数
  const handleReset = () => {
    setCircle1(DEFAULT_CIRCLE1);
    setCircle2(DEFAULT_CIRCLE2);
    setHorizontalLine(DEFAULT_HORIZONTAL_LINE);
    setLengthUp(20);
    setLengthDown(20);
    setConcentric(true);
    setSyncLengths(true);
    setDisplaySettings(DEFAULT_DISPLAY_SETTINGS);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 顶部简明标题与操作栏 */}
      <Header
        onReset={handleReset}
        mobileView={mobileView}
        setMobileView={setMobileView}
      />

      {/* 主工作区：桌面端左右分栏，移动端一键切视图与悬浮胶囊联动 */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 左侧参数控制器：移动端在 params 视图下全屏呈现，桌面端固定在侧边 */}
        <aside
          className={`h-full bg-slate-900 border-r border-slate-800 transition-all ${
            mobileView === 'params'
              ? 'w-full block z-10'
              : 'hidden md:block w-80 md:w-96 shrink-0'
          }`}
        >
          <ParameterPanel
            circle1={circle1}
            circle2={circle2}
            horizontalLine={horizontalLine}
            lengthUp={lengthUp}
            lengthDown={lengthDown}
            concentric={concentric}
            syncLengths={syncLengths}
            clearanceLines={summary.horizontalClearanceLines}
            displaySettings={displaySettings}
            onUpdateCircle1={handleUpdateCircle1}
            onUpdateCircle2={handleUpdateCircle2}
            onUpdateHorizontalLine={handleUpdateHorizontalLine}
            onUpdateLengthUp={setLengthUp}
            onUpdateLengthDown={setLengthDown}
            setConcentric={setConcentric}
            setSyncLengths={setSyncLengths}
            onUpdateDisplaySettings={handleUpdateDisplaySettings}
            onSwitchToCanvas={() => setMobileView('canvas')}
          />
        </aside>

        {/* 右侧 CAD 交互视图：移动端在 canvas 视图下全屏呈现，支持手势单指拖拽、双指捏合缩放 */}
        <main
          className={`flex-1 h-full bg-slate-950 relative overflow-hidden ${
            mobileView === 'canvas' ? 'block' : 'hidden md:block'
          }`}
        >
          <CadCanvas
            circle1={circle1}
            circle2={circle2}
            horizontalLine={horizontalLine}
            intersections={intersections}
            inspections={inspections}
            lengthUp={lengthUp}
            lengthDown={lengthDown}
            displaySettings={displaySettings}
            onUpdateDisplaySettings={handleUpdateDisplaySettings}
          />
        </main>
      </div>
    </div>
  );
}
