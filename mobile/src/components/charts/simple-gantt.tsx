import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";

import { colors } from "@/lib/theme";

export interface GanttBar {
  start: number; // epoch ms
  end: number; // epoch ms
  color?: string;
  label?: string;
}
export interface GanttRow {
  label: string;
  bars: GanttBar[];
}

const DAY = 86400000;
const ROW_H = 34;
const HEADER_H = 26;
const LABEL_W = 120;

/**
 * Read-only horizontal Gantt: frozen left label column + scrollable SVG bands.
 * Custom SVG because grouped per-row bands don't fit a chart library.
 */
export function SimpleGantt({
  rows,
  domainStart,
  domainEnd,
  pxPerDay = 28,
}: {
  rows: GanttRow[];
  domainStart: number;
  domainEnd: number;
  pxPerDay?: number;
}) {
  const span = Math.max(domainEnd - domainStart, DAY);
  const days = Math.ceil(span / DAY);
  const width = Math.min(Math.max(days * pxPerDay, 320), 20000);
  const height = HEADER_H + rows.length * ROW_H;
  const xFor = (t: number) =>
    ((Math.min(Math.max(t, domainStart), domainEnd) - domainStart) / span) * width;

  // Tick every ~1 day (dense) or every 7 days (sparse) based on span.
  const stepDays = days > 45 ? 7 : 1;
  const ticks: number[] = [];
  for (let d = 0; d <= days; d += stepDays) ticks.push(domainStart + d * DAY);

  const fmtTick = (t: number) => {
    const dt = new Date(t);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  };

  if (rows.length === 0) {
    return (
      <Text className="p-4 text-sm text-muted-foreground">Nothing to show.</Text>
    );
  }

  return (
    <View className="flex-row overflow-hidden rounded-lg border border-border bg-card">
      {/* Frozen labels */}
      <View style={{ width: LABEL_W }} className="border-r border-border">
        <View style={{ height: HEADER_H }} className="border-b border-border" />
        {rows.map((r, i) => (
          <View
            key={i}
            style={{ height: ROW_H }}
            className="justify-center border-b border-border px-2"
          >
            <Text className="text-xs text-foreground" numberOfLines={1}>
              {r.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Scrollable chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <Svg width={width} height={height}>
          {/* gridlines + tick labels */}
          {ticks.map((t, i) => {
            const x = xFor(t);
            return (
              <Line
                key={`g${i}`}
                x1={x}
                y1={HEADER_H}
                x2={x}
                y2={height}
                stroke={colors.border}
                strokeWidth={1}
              />
            );
          })}
          {ticks.map((t, i) => (
            <SvgText
              key={`t${i}`}
              x={xFor(t) + 2}
              y={16}
              fontSize={10}
              fill={colors.mutedForeground}
            >
              {fmtTick(t)}
            </SvgText>
          ))}
          {/* row separators + bars */}
          {rows.map((r, ri) => {
            const yTop = HEADER_H + ri * ROW_H;
            return (
              <Fragment key={ri}>
                <Line
                  x1={0}
                  y1={yTop + ROW_H}
                  x2={width}
                  y2={yTop + ROW_H}
                  stroke={colors.border}
                  strokeWidth={1}
                />
                {r.bars.map((b, bi) => {
                  const x = xFor(b.start);
                  const w = Math.max(xFor(b.end) - x, 4);
                  return (
                    <Rect
                      key={bi}
                      x={x}
                      y={yTop + 7}
                      width={w}
                      height={ROW_H - 14}
                      rx={4}
                      fill={b.color ?? colors.primary}
                      opacity={0.9}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    </View>
  );
}
