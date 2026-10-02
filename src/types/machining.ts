/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface CircleConfig {
  id: 'circle1' | 'circle2';
  name: string;
  cx: number;
  cy: number;
  radius: number;
  color: string;
  strokeWidth?: number;
  description?: string;
}

export interface HorizontalLineConfig {
  y: number;
  color: string;
  label: string;
}

export interface VerticalLineConfig {
  lengthUp: number;     // 向上垂直线长度 (mm)
  lengthDown: number;   // 向下垂直线长度 (mm)
  colorUp: string;
  colorDown: string;
}

export interface VerticalSegment {
  pointId: string;
  direction: 'up' | 'down';
  start: Point2D;
  end: Point2D;
  length: number;
}

export interface IntersectionPoint {
  id: string; // P1, P2, P3, P4
  circleId: 'circle1' | 'circle2';
  circleName: string;
  point: Point2D;
  side: 'left' | 'right';
  upSegment: VerticalSegment;
  downSegment: VerticalSegment;
}

export interface SegmentInterferenceDetail {
  targetCircleId: 'circle1' | 'circle2';
  targetCircleName: string;
  hasIntersection: boolean;
  intersectionCount: number;
  intersectionCoords: Point2D[];
  minClearance: number; // 最小间隙距离 (mm)
  closestPointOnSegment: Point2D;
  closestPointOnCircle: Point2D;
  isPenetratingInterior: boolean; // 是否切入圆体内部
  status: 'safe' | 'warning' | 'collision';
  note: string;
}

export interface HorizontalClearanceLine {
  id: string;
  originPointId: string;
  direction: 'up' | 'down';
  y: number;
  startX: number;
  endX: number;
  targetCircleId: 'circle1' | 'circle2';
  targetCircleName: string;
  clearanceDistance: number; // 侧向避空量 (mm)
  hasIntersection: boolean;
  status: 'safe' | 'warning' | 'collision' | 'out_of_bounds';
  label: string;
}

export type ClearanceLineTargetMode = 'origin_circle' | 'opposite_circle' | 'both';

export interface SegmentInspectionResult {
  segment: VerticalSegment;
  originIntersectionId: string;
  originCircleId: 'circle1' | 'circle2';
  details: SegmentInterferenceDetail[];
  clearanceLines: HorizontalClearanceLine[];
  overallStatus: 'safe' | 'warning' | 'collision';
  summary: string;
}

export interface InspectionSummary {
  totalIntersections: number;
  totalVerticalLines: number;
  collisionCount: number;
  warningCount: number;
  safeCount: number;
  criticalPoints: string[];
  maxGrooveDepthSafe: number;
  horizontalClearanceLines: HorizontalClearanceLine[];
  engineeringVerdict: 'PASS' | 'WARNING' | 'FAIL';
  recommendation: string;
}

export type ViewportTheme = 'blueprint' | 'dark' | 'light';
