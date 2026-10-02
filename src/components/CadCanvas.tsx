/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CircleConfig,
  HorizontalLineConfig,
  IntersectionPoint,
  Point2D,
  SegmentInspectionResult,
  ViewportTheme,
} from '../types/machining';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Crosshair,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CadCanvasProps {
  circle1: CircleConfig;
  circle2: CircleConfig;
  horizontalLine: HorizontalLineConfig;
  intersections: IntersectionPoint[];
  inspections: SegmentInspectionResult[];
  lengthUp: number;
  lengthDown: number;
  theme: ViewportTheme;
  setTheme: (theme: ViewportTheme) => void;
  onUpdateCircle1Radius?: (r: number) => void;
  onUpdateCircle2Radius?: (r: number) => void;
  onUpdateLineY?: (y: number) => void;
  onUpdateLengths?: (up: number, down: number) => void;
}

export const CadCanvas: React.FC<CadCanvasProps> = ({
  circle1,
  circle2,
  horizontalLine,
  intersections,
  inspections,
  lengthUp,
  lengthDown,
  theme,
  setTheme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 视口变换状态 (平移与缩放)
  const [zoom, setZoom] = useState<number>(3.2); // 像素每毫米 (px/mm)
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Point2D>({ x: 0, y: 0 });
  const [mouseWorld, setMouseWorld] = useState<Point2D>({ x: 0, y: 0 });

  // 移动端多点触控与捏合缩放状态追踪
  const touchState = useRef<{
    initialDist: number;
    initialZoom: number;
    startPan: Point2D;
    startCenter: Point2D;
    isPinching: boolean;
  }>({
    initialDist: 0,
    initialZoom: 1,
    startPan: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
    isPinching: false,
  });

  // 图层开关
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [showInterferenceLabels, setShowInterferenceLabels] = useState<boolean>(true);
  const [showClearanceLines, setShowClearanceLines] = useState<boolean>(true);
  const [clearanceMode, setClearanceMode] = useState<'origin_circle' | 'opposite_circle' | 'both'>('origin_circle');
  const [showShading, setShowShading] = useState<boolean>(true);

  // 主题配色
  const themeColors = useMemo(() => {
    switch (theme) {
      case 'blueprint':
        return {
          bg: '#0a192f',
          gridMajor: '#173559',
          gridMinor: '#0f2744',
          axis: '#38bdf8',
          text: '#bae6fd',
          textMuted: '#64748b',
          lineC1: '#38bdf8', // 浅蓝
          lineC2: '#fbbf24', // 琥珀金
          hLine: '#94a3b8',
          vertSafe: '#34d399',
          vertCollision: '#f43f5e',
          vertWarning: '#f59e0b',
          nodeBg: '#0f172a',
        };
      case 'light':
        return {
          bg: '#f8fafc',
          gridMajor: '#cbd5e1',
          gridMinor: '#e2e8f0',
          axis: '#475569',
          text: '#0f172a',
          textMuted: '#64748b',
          lineC1: '#0284c7',
          lineC2: '#d97706',
          hLine: '#64748b',
          vertSafe: '#10b981',
          vertCollision: '#e11d48',
          vertWarning: '#d97706',
          nodeBg: '#ffffff',
        };
      case 'dark':
      default:
        return {
          bg: '#090d16',
          gridMajor: '#1e293b',
          gridMinor: '#0f172a',
          axis: '#64748b',
          text: '#e2e8f0',
          textMuted: '#94a3b8',
          lineC1: '#06b6d4', // 激光青
          lineC2: '#f59e0b', // 暖金
          hLine: '#94a3b8',
          vertSafe: '#10b981',
          vertCollision: '#ef4444',
          vertWarning: '#f59e0b',
          nodeBg: '#020617',
        };
    }
  }, [theme]);

  // 自动将图纸居中适配到屏幕
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const maxR = Math.max(
      Math.abs(circle1.cx) + circle1.radius,
      Math.abs(circle2.cx) + circle2.radius,
      40
    );
    const maxY = Math.max(
      Math.abs(horizontalLine.y) + lengthUp + 15,
      Math.abs(horizontalLine.y) + lengthDown + 15,
      maxR + 15
    );

    const neededWidth = (maxR * 2 + 50) * 1.2;
    const neededHeight = (maxY * 2 + 40) * 1.2;

    const zoomX = clientWidth / neededWidth;
    const zoomY = clientHeight / neededHeight;
    const newZoom = Math.max(0.8, Math.min(zoomX, zoomY, 6.0));

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: clientWidth / 2, y: clientHeight / 2 });
  }, [circle1, circle2, horizontalLine.y, lengthUp, lengthDown]);

  useEffect(() => {
    fitToScreen();
    // 窗口尺寸变动自适应
    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 鼠标滚轮缩放（以鼠标所在处为中心缩放）
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const nextZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 20);

    // 保持光标下的世界坐标不变
    const newPanX = mouseX - (mouseX - pan.x) * (nextZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (nextZoom / zoom);

    setZoom(nextZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // 鼠标拖拽平移
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 仅左键
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 屏幕坐标 -> 世界坐标 (Y 轴向上为正)
    const worldX = (screenX - pan.x) / zoom;
    const worldY = -(screenY - pan.y) / zoom;
    setMouseWorld({ x: Number(worldX.toFixed(2)), y: Number(worldY.toFixed(2)) });

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 触摸手势事件 (移动端单指平移、双指捏合缩放)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      touchState.current.isPinching = false;
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const centerY = (t1.clientY + t2.clientY) / 2 - rect.top;

      touchState.current = {
        initialDist: dist,
        initialZoom: zoom,
        startPan: { ...pan },
        startCenter: { x: centerX, y: centerY },
        isPinching: true,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (e.touches.length === 1 && !touchState.current.isPinching) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });

      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      const worldX = (screenX - pan.x) / zoom;
      const worldY = -(screenY - pan.y) / zoom;
      setMouseWorld({ x: Number(worldX.toFixed(2)), y: Number(worldY.toFixed(2)) });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const { initialDist, initialZoom, startPan, startCenter } = touchState.current;

      if (initialDist > 0) {
        const scale = currentDist / initialDist;
        const nextZoom = Math.min(Math.max(initialZoom * scale, 0.4), 20);

        const newPanX = startCenter.x - (startCenter.x - startPan.x) * (nextZoom / initialZoom);
        const newPanY = startCenter.y - (startCenter.y - startPan.y) * (nextZoom / initialZoom);

        setZoom(Number(nextZoom.toFixed(2)));
        setPan({ x: newPanX, y: newPanY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      touchState.current.isPinching = false;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      touchState.current.isPinching = false;
    }
  };

  // 世界坐标转屏幕坐标
  const toScreen = useCallback(
    (pt: Point2D): Point2D => {
      return {
        x: pan.x + pt.x * zoom,
        y: pan.y - pt.y * zoom, // 笛卡尔坐标系 Y 向上
      };
    },
    [pan, zoom]
  );

  // 计算栅格刻度
  const gridParams = useMemo(() => {
    const rawStep = 50 / zoom;
    let step = 10;
    if (rawStep < 4) step = 2;
    else if (rawStep < 10) step = 5;
    else if (rawStep < 25) step = 10;
    else if (rawStep < 50) step = 20;
    else if (rawStep < 100) step = 50;
    else step = 100;
    return { step };
  }, [zoom]);

  // 获取各线段的检测状态
  const getSegmentStatus = (pointId: string, direction: 'up' | 'down') => {
    return inspections.find(
      (insp) =>
        insp.originIntersectionId === pointId &&
        insp.segment.direction === direction
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden font-sans border border-slate-800 touch-none"
      style={{ backgroundColor: themeColors.bg, touchAction: 'none' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 顶部悬浮控制栏 (移动端支持横向滑动，防止与右侧按钮重叠) */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10 flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs shadow-lg max-w-[calc(100vw-110px)] overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium shrink-0">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">图层与显示</span>
        </div>
        <div className="h-3 w-px bg-slate-700 mx-1 shrink-0" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
            showGrid ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="切换坐标网格"
        >
          网格
        </button>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
            showDimensions ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="切换尺寸标注"
        >
          尺寸
        </button>
        <button
          onClick={() => setShowCoordinates(!showCoordinates)}
          className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
            showCoordinates ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="显示交点坐标标签"
        >
          坐标
        </button>
        <button
          onClick={() => setShowInterferenceLabels(!showInterferenceLabels)}
          className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
            showInterferenceLabels ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="高亮干涉碰撞与间隙报警"
        >
          干涉
        </button>
        <button
          onClick={() => setShowClearanceLines(!showClearanceLines)}
          className={`px-2 py-0.5 rounded transition-colors shrink-0 ${
            showClearanceLines ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="过切深端点作水平引线交回圆弧，度量侧向避空量"
        >
          避空引线
        </button>
        {showClearanceLines && (
          <select
            value={clearanceMode}
            onChange={(e) => setClearanceMode(e.target.value as 'origin_circle' | 'opposite_circle' | 'both')}
            className="bg-slate-800 text-[11px] text-sky-300 px-1 py-0.5 rounded border border-slate-700 outline-none cursor-pointer shrink-0"
            title="选择水平避空引线目标圆弧"
          >
            <option value="origin_circle">回交本弧</option>
            <option value="opposite_circle">交对侧弧</option>
            <option value="both">双向交回</option>
          </select>
        )}

        <div className="h-3 w-px bg-slate-700 mx-1 shrink-0" />
        {/* 视口主题模式 */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700 shrink-0">
          <button
            onClick={() => setTheme('dark')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
              theme === 'dark' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            暗黑
          </button>
          <button
            onClick={() => setTheme('blueprint')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
              theme === 'blueprint' ? 'bg-blue-900/90 text-sky-200 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            蓝图
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
              theme === 'light' ? 'bg-slate-200 text-slate-900 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            工程白
          </button>
        </div>
      </div>

      {/* 右上角操作按键 */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 sm:p-1.5 rounded-lg border border-slate-700/80 text-xs shadow-lg">
        <button
          onClick={() => {
            const nextZoom = Math.min(zoom * 1.25, 20);
            setZoom(nextZoom);
          }}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors touch-manipulation"
          title="放大"
          aria-label="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const nextZoom = Math.max(zoom * 0.8, 0.4);
            setZoom(nextZoom);
          }}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors touch-manipulation"
          title="缩小"
          aria-label="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors touch-manipulation"
          title="整屏适应居中"
          aria-label="居中"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 左下角实时光标坐标与比例尺 */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700/80 font-mono text-[11px] sm:text-xs text-slate-300 shadow-md">
        <div className="flex items-center gap-1 text-sky-400">
          <Crosshair className="w-3.5 h-3.5" />
          <span className="text-slate-400 hidden sm:inline">X:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {mouseWorld.x >= 0 ? `+${mouseWorld.x}` : mouseWorld.x}
          </span>
          <span className="text-slate-400 ml-1 sm:ml-2 hidden sm:inline">Y:</span>
          <span className="font-semibold text-slate-100 tabular-nums">
            {mouseWorld.y >= 0 ? `+${mouseWorld.y}` : mouseWorld.y}
          </span>
        </div>
        <div className="h-3 w-px bg-slate-700" />
        <div className="text-[10px] sm:text-[11px] text-slate-400 tabular-nums">
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* 右下角图例 (小屏隐藏，避免覆盖绘图画面) */}
      <div className="hidden lg:flex absolute bottom-3 right-3 z-10 items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] text-slate-300 font-mono shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-cyan-400" />
          <span>{circle1.name} (R{circle1.radius})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-amber-400" />
          <span>{circle2.name} (R{circle2.radius})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-emerald-400" />
          <span>安全线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-rose-500" />
          <span>干涉线</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-sky-400 border-b border-dashed border-sky-400" />
          <span>避空引线 (ΔX)</span>
        </div>
      </div>

      {/* 主 SVG CAD 绘制层 */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 箭头标记 */}
          <marker
            id="dim-arrow-start"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker
            id="dim-arrow-end"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>

          {/* 红色干涉端点箭头 */}
          <marker
            id="collision-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
          </marker>

          {/* 槽壁剖面阴影 */}
          <pattern
            id="hatch-pattern"
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke={theme === 'light' ? '#cbd5e1' : '#1e293b'}
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        {/* 1. 坐标网格与刻度 */}
        {showGrid && (
          <g className="grid-lines" opacity={0.65}>
            {/* 生成动态网格线 */}
            {(() => {
              const lines = [];
              const width = containerRef.current?.clientWidth || 1000;
              const height = containerRef.current?.clientHeight || 700;
              const step = gridParams.step;

              const minX = -pan.x / zoom;
              const maxX = (width - pan.x) / zoom;
              const minY = -(height - pan.y) / zoom;
              const maxY = pan.y / zoom;

              const startGridX = Math.floor(minX / step) * step;
              const endGridX = Math.ceil(maxX / step) * step;
              const startGridY = Math.floor(minY / step) * step;
              const endGridY = Math.ceil(maxY / step) * step;

              for (let x = startGridX; x <= endGridX; x += step) {
                const screenX = pan.x + x * zoom;
                const isMajor = x % (step * 5) === 0;
                lines.push(
                  <line
                    key={`gx-${x}`}
                    x1={screenX}
                    y1={0}
                    x2={screenX}
                    y2={height}
                    stroke={isMajor ? themeColors.gridMajor : themeColors.gridMinor}
                    strokeWidth={isMajor ? 1.2 : 0.7}
                  />
                );
              }

              for (let y = startGridY; y <= endGridY; y += step) {
                const screenY = pan.y - y * zoom;
                const isMajor = y % (step * 5) === 0;
                lines.push(
                  <line
                    key={`gy-${y}`}
                    x1={0}
                    y1={screenY}
                    x2={width}
                    y2={screenY}
                    stroke={isMajor ? themeColors.gridMajor : themeColors.gridMinor}
                    strokeWidth={isMajor ? 1.2 : 0.7}
                  />
                );
              }

              return lines;
            })()}
          </g>
        )}

        {/* 2. 主轴 X 和 Y */}
        <g className="main-axes">
          {/* X 轴 (Y=0) */}
          <line
            x1={0}
            y1={pan.y}
            x2={containerRef.current?.clientWidth || 1200}
            y2={pan.y}
            stroke={themeColors.axis}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          {/* Y 轴 (X=0) */}
          <line
            x1={pan.x}
            y1={0}
            x2={pan.x}
            y2={containerRef.current?.clientHeight || 800}
            stroke={themeColors.axis}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          {/* 原点坐标 (0,0) */}
          <circle
            cx={pan.x}
            cy={pan.y}
            r={3.5}
            fill={themeColors.axis}
          />
          <text
            x={pan.x + 6}
            y={pan.y - 6}
            fill={themeColors.textMuted}
            fontSize="10"
            fontFamily="monospace"
          >
            (0,0)
          </text>
        </g>

        {/* 3. 槽体截面高亮阴影（同心时高亮端面槽体壁厚） */}
        {showShading && circle1.cx === circle2.cx && circle1.cy === circle2.cy && (
          <g className="groove-hatch" opacity={0.35}>
            {(() => {
              const center = toScreen({ x: circle1.cx, y: circle1.cy });
              const rOuter = Math.max(circle1.radius, circle2.radius) * zoom;
              const rInner = Math.min(circle1.radius, circle2.radius) * zoom;
              return (
                <path
                  d={`
                    M ${center.x} ${center.y - rOuter}
                    A ${rOuter} ${rOuter} 0 1 0 ${center.x} ${center.y + rOuter}
                    A ${rOuter} ${rOuter} 0 1 0 ${center.x} ${center.y - rOuter}
                    Z
                    M ${center.x} ${center.y - rInner}
                    A ${rInner} ${rInner} 0 1 1 ${center.x} ${center.y + rInner}
                    A ${rInner} ${rInner} 0 1 1 ${center.x} ${center.y - rInner}
                    Z
                  `}
                  fill="url(#hatch-pattern)"
                  fillRule="evenodd"
                />
              );
            })()}
          </g>
        )}

        {/* 4. 水平基准线 (y = horizontalLine.y) */}
        {(() => {
          const screenY = toScreen({ x: 0, y: horizontalLine.y }).y;
          const width = containerRef.current?.clientWidth || 1200;
          return (
            <g className="horizontal-baseline">
              <line
                x1={0}
                y1={screenY}
                x2={width}
                y2={screenY}
                stroke={themeColors.hLine}
                strokeWidth={1.8}
                strokeDasharray="8,5"
              />
              {/* 水平线标识文字 */}
              <text
                x={20}
                y={screenY - 6}
                fill={themeColors.hLine}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="600"
              >
                基准水平线 Y = {horizontalLine.y.toFixed(1)} mm
              </text>
            </g>
          );
        })()}

        {/* 5. 绘制两个圆 */}
        {/* 圆 1 */}
        {(() => {
          const c1Screen = toScreen({ x: circle1.cx, y: circle1.cy });
          const r1Screen = circle1.radius * zoom;
          return (
            <g className="circle-1">
              <circle
                cx={c1Screen.x}
                cy={c1Screen.y}
                r={r1Screen}
                fill="none"
                stroke={themeColors.lineC1}
                strokeWidth={2.4}
              />
              {/* 圆心十字标 */}
              <line
                x1={c1Screen.x - 7}
                y1={c1Screen.y}
                x2={c1Screen.x + 7}
                y2={c1Screen.y}
                stroke={themeColors.lineC1}
                strokeWidth={1.5}
              />
              <line
                x1={c1Screen.x}
                y1={c1Screen.y - 7}
                x2={c1Screen.x}
                y2={c1Screen.y + 7}
                stroke={themeColors.lineC1}
                strokeWidth={1.5}
              />
              {showDimensions && (
                <text
                  x={c1Screen.x + r1Screen * 0.707 + 8}
                  y={c1Screen.y - r1Screen * 0.707}
                  fill={themeColors.lineC1}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {circle1.name} R{circle1.radius} (Ø{(circle1.radius * 2).toFixed(1)})
                </text>
              )}
            </g>
          );
        })()}

        {/* 圆 2 */}
        {(() => {
          const c2Screen = toScreen({ x: circle2.cx, y: circle2.cy });
          const r2Screen = circle2.radius * zoom;
          return (
            <g className="circle-2">
              <circle
                cx={c2Screen.x}
                cy={c2Screen.y}
                r={r2Screen}
                fill="none"
                stroke={themeColors.lineC2}
                strokeWidth={2.4}
              />
              {/* 圆心十字标 */}
              <line
                x1={c2Screen.x - 7}
                y1={c2Screen.y}
                x2={c2Screen.x + 7}
                y2={c2Screen.y}
                stroke={themeColors.lineC2}
                strokeWidth={1.5}
              />
              <line
                x1={c2Screen.x}
                y1={c2Screen.y - 7}
                x2={c2Screen.x}
                y2={c2Screen.y + 7}
                stroke={themeColors.lineC2}
                strokeWidth={1.5}
              />
              {showDimensions && (
                <text
                  x={c2Screen.x + r2Screen * 0.707 + 8}
                  y={c2Screen.y + r2Screen * 0.707 + 14}
                  fill={themeColors.lineC2}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {circle2.name} R{circle2.radius} (Ø{(circle2.radius * 2).toFixed(1)})
                </text>
              )}
            </g>
          );
        })()}

        {/* 6. 绘制 8 条垂直线（4个交点，每个交点上、下各一条） */}
        <g className="vertical-lines">
          {intersections.map((inter) => {
            const startScreen = toScreen(inter.point);
            const upEndScreen = toScreen(inter.upSegment.end);
            const downEndScreen = toScreen(inter.downSegment.end);

            const upInsp = getSegmentStatus(inter.id, 'up');
            const downInsp = getSegmentStatus(inter.id, 'down');

            const isUpCollision = upInsp?.overallStatus === 'collision';
            const isUpWarning = upInsp?.overallStatus === 'warning';

            const isDownCollision = downInsp?.overallStatus === 'collision';
            const isDownWarning = downInsp?.overallStatus === 'warning';

            const upColor = isUpCollision
              ? themeColors.vertCollision
              : isUpWarning
              ? themeColors.vertWarning
              : themeColors.vertSafe;

            const downColor = isDownCollision
              ? themeColors.vertCollision
              : isDownWarning
              ? themeColors.vertWarning
              : themeColors.vertSafe;

            return (
              <g key={`vert-${inter.id}`}>
                {/* 向上垂直线 */}
                <line
                  x1={startScreen.x}
                  y1={startScreen.y}
                  x2={upEndScreen.x}
                  y2={upEndScreen.y}
                  stroke={upColor}
                  strokeWidth={isUpCollision ? 3.0 : 2.2}
                />
                {/* 向上端点端帽 */}
                <line
                  x1={upEndScreen.x - 4}
                  y1={upEndScreen.y}
                  x2={upEndScreen.x + 4}
                  y2={upEndScreen.y}
                  stroke={upColor}
                  strokeWidth={2}
                />

                {/* 向下垂直线 */}
                <line
                  x1={startScreen.x}
                  y1={startScreen.y}
                  x2={downEndScreen.x}
                  y2={downEndScreen.y}
                  stroke={downColor}
                  strokeWidth={isDownCollision ? 3.0 : 2.2}
                />
                {/* 向下端点端帽 */}
                <line
                  x1={downEndScreen.x - 4}
                  y1={downEndScreen.y}
                  x2={downEndScreen.x + 4}
                  y2={downEndScreen.y}
                  stroke={downColor}
                  strokeWidth={2}
                />

                {/* 尺寸标注文字 */}
                {showDimensions && (
                  <>
                    <text
                      x={startScreen.x + 5}
                      y={(startScreen.y + upEndScreen.y) / 2}
                      fill={upColor}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      +{lengthUp}
                    </text>
                    <text
                      x={startScreen.x + 5}
                      y={(startScreen.y + downEndScreen.y) / 2}
                      fill={downColor}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      -{lengthDown}
                    </text>
                  </>
                )}

                {/* 干涉碰撞点高亮环 */}
                {showInterferenceLabels && (
                  <>
                    {/* 上方碰撞点 */}
                    {upInsp?.details.map((d, dIdx) =>
                      d.intersectionCoords.map((pt, pIdx) => {
                        const scrPt = toScreen(pt);
                        return (
                          <g key={`up-col-${inter.id}-${dIdx}-${pIdx}`}>
                            <circle
                              cx={scrPt.x}
                              cy={scrPt.y}
                              r={6}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={2.5}
                              className="animate-pulse"
                            />
                            <circle
                              cx={scrPt.x}
                              cy={scrPt.y}
                              r={2.5}
                              fill="#ef4444"
                            />
                          </g>
                        );
                      })
                    )}
                    {/* 下方碰撞点 */}
                    {downInsp?.details.map((d, dIdx) =>
                      d.intersectionCoords.map((pt, pIdx) => {
                        const scrPt = toScreen(pt);
                        return (
                          <g key={`dn-col-${inter.id}-${dIdx}-${pIdx}`}>
                            <circle
                              cx={scrPt.x}
                              cy={scrPt.y}
                              r={6}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth={2.5}
                              className="animate-pulse"
                            />
                            <circle
                              cx={scrPt.x}
                              cy={scrPt.y}
                              r={2.5}
                              fill="#ef4444"
                            />
                          </g>
                        );
                      })
                    )}
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* 6.5 绘制切深端点水平引线（过垂直线端点作水平线交回圆弧，度量侧向避空量） */}
        {showClearanceLines && (
          <g className="horizontal-clearance-lines">
            {inspections.flatMap((insp) => {
              const lines = insp.clearanceLines.filter((l) => {
                if (clearanceMode === 'both') return true;
                if (clearanceMode === 'origin_circle') return l.targetCircleId === insp.originCircleId;
                return l.targetCircleId !== insp.originCircleId;
              });

              return lines.map((line) => {
                if (!line.hasIntersection) return null;

                const startScreen = toScreen({ x: line.startX, y: line.y });
                const endScreen = toScreen({ x: line.endX, y: line.y });

                const isCollision = line.status === 'collision';
                const isWarning = line.status === 'warning';
                const lineColor = isCollision
                  ? themeColors.vertCollision
                  : isWarning
                  ? themeColors.vertWarning
                  : '#38bdf8'; // 清晰的天蓝色侧向避空引线

                const midX = (startScreen.x + endScreen.x) / 2;
                const isUp = line.direction === 'up';
                const textY = isUp ? startScreen.y - 7 : startScreen.y + 16;

                return (
                  <g key={line.id} className="clearance-line-item">
                    {/* 水平引线主体 */}
                    <line
                      x1={startScreen.x}
                      y1={startScreen.y}
                      x2={endScreen.x}
                      y2={endScreen.y}
                      stroke={lineColor}
                      strokeWidth={1.8}
                      strokeDasharray="4,3"
                    />

                    {/* 圆弧交点处的端点圆环标记 */}
                    <circle
                      cx={endScreen.x}
                      cy={endScreen.y}
                      r={3.5}
                      fill={lineColor}
                    />
                    <circle
                      cx={endScreen.x}
                      cy={endScreen.y}
                      r={6.5}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={1.2}
                      opacity={0.85}
                    />

                    {/* 垂直线端点处的小刻度端帽 */}
                    <line
                      x1={startScreen.x}
                      y1={startScreen.y - 3.5}
                      x2={startScreen.x}
                      y2={startScreen.y + 3.5}
                      stroke={lineColor}
                      strokeWidth={1.6}
                    />

                    {/* 侧向避空量尺寸文字标注 */}
                    {showDimensions && (
                      <text
                        x={midX}
                        y={textY}
                        textAnchor="middle"
                        fill={lineColor}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ΔX={line.clearanceDistance.toFixed(2)}
                      </text>
                    )}
                  </g>
                );
              });
            })}
          </g>
        )}

        {/* 7. 绘制 4 个交点圆圈与标签 */}
        <g className="intersection-nodes">
          {intersections.map((inter, idx) => {
            const screenPt = toScreen(inter.point);
            const isC1 = inter.circleId === 'circle1';
            const baseColor = isC1 ? themeColors.lineC1 : themeColors.lineC2;

            return (
              <g key={`node-${inter.id}`}>
                {/* 节点外光圈 */}
                <circle
                  cx={screenPt.x}
                  cy={screenPt.y}
                  r={8}
                  fill={baseColor}
                  fillOpacity={0.2}
                />
                {/* 节点实心点 */}
                <circle
                  cx={screenPt.x}
                  cy={screenPt.y}
                  r={4.5}
                  fill={themeColors.nodeBg}
                  stroke={baseColor}
                  strokeWidth={2.2}
                />

                {/* 节点名称徽标 P1, P2, P3, P4 */}
                <g transform={`translate(${screenPt.x - 12}, ${screenPt.y - 28})`}>
                  <rect
                    width="24"
                    height="18"
                    rx="3"
                    fill={themeColors.nodeBg}
                    stroke={baseColor}
                    strokeWidth="1.2"
                  />
                  <text
                    x="12"
                    y="13"
                    textAnchor="middle"
                    fill={themeColors.text}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {inter.id}
                  </text>
                </g>

                {/* 坐标文字标签 */}
                {showCoordinates && (
                  <text
                    x={screenPt.x}
                    y={screenPt.y + 19}
                    textAnchor="middle"
                    fill={themeColors.textMuted}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="500"
                  >
                    X:{inter.point.x.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
