/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CircleConfig,
  IntersectionPoint,
  Point2D,
  SegmentInspectionResult,
  SegmentInterferenceDetail,
  VerticalSegment,
  InspectionSummary,
  HorizontalClearanceLine,
} from '../types/machining';

const EPSILON = 1e-5;

/**
 * 计算圆与水平线 y = lineY 的交点
 */
export function calculateCircleHorizontalIntersections(
  circle: CircleConfig,
  lineY: number
): Point2D[] {
  const dy = lineY - circle.cy;
  const discriminant = circle.radius * circle.radius - dy * dy;

  if (discriminant < -EPSILON) {
    return []; // 无交点
  }

  if (Math.abs(discriminant) <= EPSILON) {
    // 切点 (1个交点)
    return [{ x: circle.cx, y: lineY }];
  }

  const dx = Math.sqrt(discriminant);
  return [
    { x: circle.cx - dx, y: lineY }, // 左交点
    { x: circle.cx + dx, y: lineY }, // 右交点
  ];
}

/**
 * 组装并排序4个交点及各自的上、下两条垂直线
 */
export function buildIntersectionPoints(
  circle1: CircleConfig,
  circle2: CircleConfig,
  lineY: number,
  lengthUp: number,
  lengthDown: number
): IntersectionPoint[] {
  const pts1 = calculateCircleHorizontalIntersections(circle1, lineY);
  const pts2 = calculateCircleHorizontalIntersections(circle2, lineY);

  const rawList: {
    point: Point2D;
    circleId: 'circle1' | 'circle2';
    circleName: string;
    side: 'left' | 'right';
  }[] = [];

  if (pts1.length === 2) {
    rawList.push({
      point: pts1[0],
      circleId: 'circle1',
      circleName: circle1.name,
      side: 'left',
    });
    rawList.push({
      point: pts1[1],
      circleId: 'circle1',
      circleName: circle1.name,
      side: 'right',
    });
  } else if (pts1.length === 1) {
    rawList.push({
      point: pts1[0],
      circleId: 'circle1',
      circleName: circle1.name,
      side: 'left',
    });
  }

  if (pts2.length === 2) {
    rawList.push({
      point: pts2[0],
      circleId: 'circle2',
      circleName: circle2.name,
      side: 'left',
    });
    rawList.push({
      point: pts2[1],
      circleId: 'circle2',
      circleName: circle2.name,
      side: 'right',
    });
  } else if (pts2.length === 1) {
    rawList.push({
      point: pts2[0],
      circleId: 'circle2',
      circleName: circle2.name,
      side: 'left',
    });
  }

  // 从左到右排序（按 X 坐标升序）
  rawList.sort((a, b) => a.point.x - b.point.x);

  return rawList.map((item, index) => {
    const id = `P${index + 1}`;
    const x = item.point.x;

    const upSegment: VerticalSegment = {
      pointId: id,
      direction: 'up',
      start: { x, y: lineY },
      end: { x, y: lineY + lengthUp },
      length: lengthUp,
    };

    const downSegment: VerticalSegment = {
      pointId: id,
      direction: 'down',
      start: { x, y: lineY },
      end: { x, y: lineY - lengthDown },
      length: lengthDown,
    };

    return {
      id,
      circleId: item.circleId,
      circleName: item.circleName,
      point: item.point,
      side: item.side,
      upSegment,
      downSegment,
    };
  });
}

/**
 * 计算垂直线段与指定圆的干涉详情
 */
export function inspectSegmentAgainstCircle(
  segment: VerticalSegment,
  circle: CircleConfig,
  isOriginCircle: boolean
): SegmentInterferenceDetail {
  const x0 = segment.start.x;
  const yStart = segment.start.y;
  const yEnd = segment.end.y;
  const yMin = Math.min(yStart, yEnd);
  const yMax = Math.max(yStart, yEnd);

  const dx = x0 - circle.cx;
  const discriminant = circle.radius * circle.radius - dx * dx;

  const intersectionCoords: Point2D[] = [];
  let isPenetratingInterior = false;

  if (discriminant >= -EPSILON) {
    const root = discriminant > 0 ? Math.sqrt(discriminant) : 0;
    const yCandidates = [circle.cy + root, circle.cy - root];

    for (const yCand of yCandidates) {
      // 检查是否在垂直线段范围内
      if (yCand >= yMin - EPSILON && yCand <= yMax + EPSILON) {
        // 如果是自身起始圆，且交点非常接近起点，属于天然接触基准
        const isBaseOrigin = isOriginCircle && Math.abs(yCand - yStart) < 1e-3;
        if (!isBaseOrigin) {
          // 避免重复坐标
          if (!intersectionCoords.some((p) => Math.abs(p.y - yCand) < 1e-3)) {
            intersectionCoords.push({ x: x0, y: yCand });
          }
        }
      }
    }
  }

  // 检查线段中点或端点是否深入到了圆内部
  const testY = (yStart + yEnd) / 2;
  const distCenterTest = Math.hypot(x0 - circle.cx, testY - circle.cy);
  if (distCenterTest < circle.radius - 1e-3) {
    isPenetratingInterior = true;
  }

  // 计算线段到圆的最短距离
  // 垂直线段上任意点 (x0, y), y 在 [yMin, yMax]
  // 到圆心 (cx, cy) 的垂直距离在 y = cy 处取得极值
  let closestY: number;
  if (circle.cy >= yMin && circle.cy <= yMax) {
    closestY = circle.cy;
  } else if (circle.cy < yMin) {
    closestY = yMin;
  } else {
    closestY = yMax;
  }

  const closestPointOnSegment: Point2D = { x: x0, y: closestY };
  const distToCenter = Math.hypot(x0 - circle.cx, closestY - circle.cy);
  const minClearance = Math.abs(distToCenter - circle.radius);

  // 对应圆弧上的最近点
  let closestPointOnCircle: Point2D;
  if (distToCenter > 1e-6) {
    const scale = circle.radius / distToCenter;
    closestPointOnCircle = {
      x: circle.cx + (closestPointOnSegment.x - circle.cx) * scale,
      y: circle.cy + (closestPointOnSegment.y - circle.cy) * scale,
    };
  } else {
    closestPointOnCircle = { x: circle.cx + circle.radius, y: circle.cy };
  }

  // 状态判定
  let status: 'safe' | 'warning' | 'collision' = 'safe';
  let note = '间隙充足';

  if (intersectionCoords.length > 0 || (isPenetratingInterior && !isOriginCircle)) {
    status = 'collision';
    note = `与${circle.name}相交干涉 (${intersectionCoords.length}处交点)`;
  } else if (minClearance < 1.0) {
    status = 'warning';
    note = `接近${circle.name}，间隙较小 (${minClearance.toFixed(2)}mm)`;
  } else {
    status = 'safe';
    note = `安全，最小间隙 ${minClearance.toFixed(2)}mm`;
  }

  return {
    targetCircleId: circle.id,
    targetCircleName: circle.name,
    hasIntersection: intersectionCoords.length > 0,
    intersectionCount: intersectionCoords.length,
    intersectionCoords,
    minClearance,
    closestPointOnSegment,
    closestPointOnCircle,
    isPenetratingInterior,
    status,
    note,
  };
}

/**
 * 计算切深端点处的水平引线，交回圆弧用于直观度量侧向避空安全间隙
 */
export function calculateHorizontalClearanceLine(
  segment: VerticalSegment,
  originCircle: CircleConfig,
  targetCircle: CircleConfig,
  isOrigin: boolean
): HorizontalClearanceLine {
  const startX = segment.start.x;
  const yEnd = segment.end.y;
  const dy = yEnd - targetCircle.cy;
  const disc = targetCircle.radius * targetCircle.radius - dy * dy;

  const id = `H-${segment.pointId}-${segment.direction}-${targetCircle.id}`;

  if (disc < -EPSILON) {
    return {
      id,
      originPointId: segment.pointId,
      direction: segment.direction,
      y: yEnd,
      startX,
      endX: startX,
      targetCircleId: targetCircle.id,
      targetCircleName: targetCircle.name,
      clearanceDistance: 0,
      hasIntersection: false,
      status: 'out_of_bounds',
      label: `切深超限 (超出${targetCircle.name}高度范围)`,
    };
  }

  const root = Math.sqrt(Math.max(0, disc));
  const xLeft = targetCircle.cx - root;
  const xRight = targetCircle.cx + root;

  let endX: number;
  if (isOrigin) {
    // 交回本圆：根据交点在圆心左侧还是右侧选择对应弧段
    endX = startX <= targetCircle.cx ? xLeft : xRight;
  } else {
    // 交至目标对侧圆：选取朝向 startX 的最近交点
    const distToLeft = Math.abs(startX - xLeft);
    const distToRight = Math.abs(startX - xRight);
    endX = distToLeft <= distToRight ? xLeft : xRight;
  }

  const clearanceDistance = Number(Math.abs(endX - startX).toFixed(3));

  let status: 'safe' | 'warning' | 'collision' | 'out_of_bounds' = 'safe';
  let label = '';

  if (isOrigin) {
    // 交回本圆：度量该切深处的圆弧回缩避空量
    status = clearanceDistance > 0.05 ? 'safe' : 'warning';
    label = `端点弧度回缩量 ΔX = ${clearanceDistance.toFixed(2)} mm`;
  } else {
    // 交至对侧圆：度量两圆/工件与刀体之间的净侧向间隙
    if (clearanceDistance < 0.001) {
      status = 'collision';
      label = `切深处与${targetCircle.name}相交碰撞!`;
    } else if (clearanceDistance < 1.0) {
      status = 'warning';
      label = `侧向避空间隙不足 (${clearanceDistance.toFixed(2)} mm)`;
    } else {
      status = 'safe';
      label = `侧向避空间隙 ΔX = ${clearanceDistance.toFixed(2)} mm`;
    }
  }

  return {
    id,
    originPointId: segment.pointId,
    direction: segment.direction,
    y: yEnd,
    startX,
    endX,
    targetCircleId: targetCircle.id,
    targetCircleName: targetCircle.name,
    clearanceDistance,
    hasIntersection: true,
    status,
    label,
  };
}

/**
 * 完整巡检所有4个交点的8条垂直线段
 */
export function inspectAllSegments(
  points: IntersectionPoint[],
  circle1: CircleConfig,
  circle2: CircleConfig
): SegmentInspectionResult[] {
  const results: SegmentInspectionResult[] = [];

  for (const pt of points) {
    const originCircle = pt.circleId === circle1.id ? circle1 : circle2;
    const oppositeCircle = pt.circleId === circle1.id ? circle2 : circle1;

    for (const segment of [pt.upSegment, pt.downSegment]) {
      const detail1 = inspectSegmentAgainstCircle(
        segment,
        circle1,
        pt.circleId === circle1.id
      );
      const detail2 = inspectSegmentAgainstCircle(
        segment,
        circle2,
        pt.circleId === circle2.id
      );

      // 计算切深端点处的水平引线（交回本圆弧及对侧圆弧）
      const hLineOrigin = calculateHorizontalClearanceLine(
        segment,
        originCircle,
        originCircle,
        true
      );
      const hLineOpposite = calculateHorizontalClearanceLine(
        segment,
        originCircle,
        oppositeCircle,
        false
      );
      const clearanceLines = [hLineOrigin, hLineOpposite];

      let overallStatus: 'safe' | 'warning' | 'collision' = 'safe';
      if (
        detail1.status === 'collision' ||
        detail2.status === 'collision' ||
        hLineOpposite.status === 'collision'
      ) {
        overallStatus = 'collision';
      } else if (
        detail1.status === 'warning' ||
        detail2.status === 'warning' ||
        hLineOpposite.status === 'warning'
      ) {
        overallStatus = 'warning';
      }

      let summary = '';
      if (overallStatus === 'collision') {
        const collisions = [detail1, detail2]
          .filter((d) => d.status === 'collision')
          .map((d) => d.note)
          .join('; ');
        summary = `【干涉报警】${collisions || '切深端点碰撞'}`;
      } else if (overallStatus === 'warning') {
        summary = `【警告】临界裕度不足 (侧向避空 ${hLineOrigin.clearanceDistance.toFixed(2)}mm)`;
      } else {
        summary = `【正常】避空回缩量 ${hLineOrigin.clearanceDistance.toFixed(2)}mm`;
      }

      results.push({
        segment,
        originIntersectionId: pt.id,
        originCircleId: pt.circleId,
        details: [detail1, detail2],
        clearanceLines,
        overallStatus,
        summary,
      });
    }
  }

  return results;
}

/**
 * 汇总评估干涉工况
 */
export function summarizeInspection(
  inspectionResults: SegmentInspectionResult[]
): InspectionSummary {
  let collisionCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  const criticalPoints: string[] = [];
  const allClearanceLines: HorizontalClearanceLine[] = [];

  for (const res of inspectionResults) {
    allClearanceLines.push(...res.clearanceLines);
    if (res.overallStatus === 'collision') {
      collisionCount++;
      const dirText = res.segment.direction === 'up' ? '上方线' : '下方线';
      criticalPoints.push(`${res.originIntersectionId} ${dirText}`);
    } else if (res.overallStatus === 'warning') {
      warningCount++;
    } else {
      safeCount++;
    }
  }

  let engineeringVerdict: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
  let recommendation = '当前几何配置未检测到干涉，刀具圆弧与槽壁间隙符合安全加工规范。';

  if (collisionCount > 0) {
    engineeringVerdict = 'FAIL';
    recommendation = `检测到 ${collisionCount} 处严重干涉碰撞！请检查端面槽刀柄外/内圆弧曲率（增大内径或减小刀体外圆），或减小进刀深度(垂直线长度)。`;
  } else if (warningCount > 0) {
    engineeringVerdict = 'WARNING';
    recommendation = `间隙裕度小于1.0mm，实际切削中受切削振动或排屑挤压可能发生擦碰，建议适当修磨或微调刀体规格。`;
  }

  return {
    totalIntersections: inspectionResults.length / 2,
    totalVerticalLines: inspectionResults.length,
    collisionCount,
    warningCount,
    safeCount,
    criticalPoints,
    maxGrooveDepthSafe: 25, // default
    horizontalClearanceLines: allClearanceLines,
    engineeringVerdict,
    recommendation,
  };
}
