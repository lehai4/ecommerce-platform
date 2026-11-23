import { ThemeContext } from "@/hook/useContext";
import { theme as antdTheme, Typography } from "antd";
import { useContext } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Brand series colors, validated with the dataviz palette script
 * (light: #4f46e5 on light surface, dark: #6366f1 on #141414). */
const SERIES = { light: "#4f46e5", dark: "#6366f1" };

type Point = { date: string; value: number };

const shortDate = (day: string) => {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
};

/** Single-series area chart over days, with a crosshair tooltip. */
const TrendChart = ({
  data,
  format,
  height = 240,
  label,
}: {
  data: Point[];
  format: (value: number) => string;
  height?: number;
  /** Name of the measure, shown in the tooltip */
  label: string;
}) => {
  const { themeContext } = useContext(ThemeContext);
  const { token } = antdTheme.useToken();
  const color = themeContext === "dark" ? SERIES.dark : SERIES.light;
  const gradientId = `trend-${label.replace(/\W/g, "")}`;

  return (
    <div style={{ height }} role="img" aria-label={`${label} per day`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={token.colorBorderSecondary}
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={{ stroke: token.colorBorderSecondary }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={format}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={64}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: token.colorTextQuaternary, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as Point;
              return (
                <div
                  className="rounded-lg px-3 py-2 shadow-md"
                  style={{
                    background: token.colorBgElevated,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Typography.Text type="secondary" className="block text-xs">
                    {point.date.split("-").reverse().join("/")}
                  </Typography.Text>
                  <Typography.Text strong>
                    {label}: {format(point.value)}
                  </Typography.Text>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, stroke: token.colorBgContainer, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
