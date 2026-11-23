import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Card, Tooltip, Typography } from "antd";

/** Headline number with the change versus the previous period */
const KpiCard = ({
  title,
  value,
  previous,
  format,
  hint,
}: {
  title: string;
  value: number;
  previous: number;
  format: (value: number) => string;
  hint?: string;
}) => {
  const change =
    previous === 0 ? (value === 0 ? 0 : null) : ((value - previous) / previous) * 100;
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;

  return (
    <Card size="small" className="h-full" styles={{ body: { padding: 16 } }}>
      <Tooltip title={hint}>
        <Typography.Text type="secondary" className="text-[13px]">
          {title}
        </Typography.Text>
      </Tooltip>
      <div className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">
        {format(value)}
      </div>
      <Tooltip title={`Previous period: ${format(previous)}`}>
        <div className="mt-1 flex items-center gap-1 whitespace-nowrap text-xs">
          {change === null ? (
            <Typography.Text type="secondary">None in previous period</Typography.Text>
          ) : (
            <>
              <Typography.Text type={up ? "success" : down ? "danger" : "secondary"}>
                {up && <ArrowUpOutlined />}
                {down && <ArrowDownOutlined />} {Math.abs(change).toFixed(change === 0 ? 0 : 1)}%
              </Typography.Text>
              <Typography.Text type="secondary">vs previous</Typography.Text>
            </>
          )}
        </div>
      </Tooltip>
    </Card>
  );
};

export default KpiCard;
