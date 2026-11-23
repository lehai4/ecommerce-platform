import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import TrendChart from "@/components/dashboard/TrendChart";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import { formatMoney, ORDER_STATUS_META } from "@/constants/order";
import { ThemeContext } from "@/hook/useContext";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import type { DashboardData } from "@/type";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Segmented,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const DAY_FORMAT = "YYYY-MM-DD";
type Preset = "7d" | "30d" | "90d" | "month" | "custom";

const presetRange = (preset: Preset): [Dayjs, Dayjs] => {
  const today = dayjs();
  switch (preset) {
    case "7d":
      return [today.subtract(6, "day"), today];
    case "90d":
      return [today.subtract(89, "day"), today];
    case "month":
      return [today.startOf("month"), today];
    default:
      return [today.subtract(29, "day"), today];
  }
};

const count = (value: number) => value.toLocaleString("en-US");
const compactMoney = (value: number) =>
  value >= 1000 ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `$${value}`;

export default function Index() {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const name = user?.user?.name || "Admin";

  // Period lives in the URL so a refresh keeps it
  const [params, setParams] = useSearchParams();
  const preset = (params.get("range") as Preset) || "30d";
  const [from, to] = useMemo<[Dayjs, Dayjs]>(() => {
    if (preset === "custom" && params.get("from") && params.get("to")) {
      return [dayjs(params.get("from")), dayjs(params.get("to"))];
    }
    return presetRange(preset);
  }, [params]);

  const [data, setData] = useState<DashboardData>();
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<"revenue" | "sales">("revenue");
  const { themeContext } = useContext(ThemeContext);
  // Same validated series colors as the charts
  const barColor = themeContext === "dark" ? "#6366f1" : "#4f46e5";

  const load = useCallback(() => {
    setLoading(true);
    axiosAuth
      .get<DashboardData>("/stats/dashboard", {
        params: { from: from.format(DAY_FORMAT), to: to.format(DAY_FORMAT) },
      })
      .then(({ data }) => setData(data))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(load, [load]);

  const setPreset = (value: Preset) =>
    setParams(value === "30d" ? {} : { range: value }, { replace: true });

  const maxProductQty = Math.max(1, ...(data?.topProducts.map((p) => p.quantity) ?? []));
  const maxCategoryRevenue = Math.max(1, ...(data?.topCategories.map((c) => c.revenue) ?? []));
  const statusTotal = data?.ordersByStatus.reduce((s, x) => s + x.count, 0) ?? 0;

  return (
    <>
      <Helmet title="Dashboard">
        <></>
      </Helmet>
      <PageHeader
        title={`Welcome back, ${name}`}
        description={
          data
            ? `${dayjs(data.range.from).format("DD/MM/YYYY")} – ${dayjs(data.range.to).format(
                "DD/MM/YYYY"
              )}, compared with the ${data.sales.length} days before`
            : "Sales overview"
        }
        extra={
          <>
            <Segmented
              value={preset === "custom" ? undefined : preset}
              onChange={(value) => setPreset(value as Preset)}
              options={[
                { label: "7 days", value: "7d" },
                { label: "30 days", value: "30d" },
                { label: "90 days", value: "90d" },
                { label: "This month", value: "month" },
              ]}
            />
            <DatePicker.RangePicker
              value={[from, to]}
              format="DD/MM/YYYY"
              allowClear={false}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
              onChange={(range) => {
                if (!range?.[0] || !range?.[1]) return;
                setParams(
                  {
                    range: "custom",
                    from: range[0].format(DAY_FORMAT),
                    to: range[1].format(DAY_FORMAT),
                  },
                  { replace: true }
                );
              }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={load}
              loading={loading}
              aria-label="Refresh"
            />
          </>
        }
      />

      {!data ? (
        <Card>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {data.pendingOrders > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${data.pendingOrders} order${
                data.pendingOrders > 1 ? "s are" : " is"
              } waiting for confirmation`}
              action={
                <Link to="/order?status=PENDING">
                  <Button size="small">Review orders</Button>
                </Link>
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="Revenue"
              hint="Total of delivered orders"
              value={data.kpis.revenue}
              previous={data.previous.revenue}
              format={formatMoney}
            />
            <KpiCard
              title="Sales"
              hint="Total of every order that was not cancelled"
              value={data.kpis.sales}
              previous={data.previous.sales}
              format={formatMoney}
            />
            <KpiCard
              title="Orders"
              hint="Orders that were not cancelled"
              value={data.kpis.orders}
              previous={data.previous.orders}
              format={count}
            />
            <KpiCard
              title="Average order"
              hint="Sales divided by orders"
              value={data.kpis.averageOrderValue}
              previous={data.previous.averageOrderValue}
              format={formatMoney}
            />
            <KpiCard
              title="Items sold"
              value={data.kpis.itemsSold}
              previous={data.previous.itemsSold}
              format={count}
            />
            <KpiCard
              title="New customers"
              value={data.kpis.newCustomers}
              previous={data.previous.newCustomers}
              format={count}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title={metric === "revenue" ? "Revenue per day" : "Sales per day"}
              extra={
                <Segmented
                  size="small"
                  value={metric}
                  onChange={(value) => setMetric(value as "revenue" | "sales")}
                  options={[
                    { label: "Revenue", value: "revenue" },
                    { label: "Sales", value: "sales" },
                  ]}
                />
              }
            >
              <TrendChart
                label={metric === "revenue" ? "Revenue" : "Sales"}
                data={data.sales.map((d) => ({ date: d.date, value: d[metric] }))}
                format={(v) => (v >= 1000 ? compactMoney(v) : formatMoney(v))}
              />
            </Card>
            <Card title="Orders per day">
              <TrendChart
                label="Orders"
                data={data.sales.map((d) => ({ date: d.date, value: d.orders }))}
                format={count}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card title="Best sellers" className="xl:col-span-2">
              {data.topProducts.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales in this period" />
              ) : (
                <ol className="flex flex-col gap-3">
                  {data.topProducts.map((p, index) => (
                    <li key={p.productId ?? p.name} className="flex items-center gap-3">
                      <Typography.Text type="secondary" className="w-4 text-right">
                        {index + 1}
                      </Typography.Text>
                      <img
                        src={pictureUrl(p.picture, 40)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          {p.productId ? (
                            <Link to={`/product-list/edit/${p.productId}`} className="min-w-0">
                              <Typography.Text strong ellipsis className="!text-inherit">
                                {p.name}
                              </Typography.Text>
                            </Link>
                          ) : (
                            <Typography.Text strong ellipsis>
                              {p.name}
                            </Typography.Text>
                          )}
                          <Typography.Text className="shrink-0">
                            {formatMoney(p.revenue)}
                          </Typography.Text>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                            <div
                              className="h-full rounded-full"
                              style={{ background: barColor, width: `${(p.quantity / maxProductQty) * 100}%` }}
                            />
                          </div>
                          <Typography.Text type="secondary" className="w-16 shrink-0 text-right text-xs">
                            {p.quantity} sold
                          </Typography.Text>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title="Orders by status">
              <div className="flex flex-col gap-2">
                {data.ordersByStatus.map((s) => (
                  <Link
                    key={s.status}
                    to={`/order?status=${s.status}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-black/[0.03]"
                  >
                    <span className="flex items-center gap-2">
                      <OrderStatusTag status={s.status} />
                      <Typography.Text type="secondary" className="text-xs">
                        {ORDER_STATUS_META[s.status].description}
                      </Typography.Text>
                    </span>
                    <Typography.Text strong>{s.count}</Typography.Text>
                  </Link>
                ))}
                <Typography.Text type="secondary" className="px-2 text-xs">
                  {statusTotal} orders placed in this period
                </Typography.Text>
              </div>
            </Card>

            <Card title="Top categories">
              {data.topCategories.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales in this period" />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.topCategories.map((c) => (
                    <div key={c.categoryId}>
                      <div className="flex justify-between gap-2">
                        <Typography.Text ellipsis>{c.name}</Typography.Text>
                        <Typography.Text strong>{formatMoney(c.revenue)}</Typography.Text>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{ background: barColor, width: `${(c.revenue / maxCategoryRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title={
                <span className="flex items-center gap-2">
                  <WarningOutlined className="text-amber-500" /> Low stock
                </span>
              }
              extra={<Link to="/product-list?stockLevel=low">See all</Link>}
              className="xl:col-span-2"
            >
              {data.lowStock.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Every active product has enough stock" />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.lowStock.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product-list/edit/${p.id}`}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-black/[0.03]"
                    >
                      <img
                        src={pictureUrl(p.picture, 36)}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-md object-cover"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <Typography.Text ellipsis className="!text-inherit">
                          {p.name}
                        </Typography.Text>
                        {p.sku && (
                          <Typography.Text type="secondary" className="font-mono text-xs">
                            {p.sku}
                          </Typography.Text>
                        )}
                      </span>
                      {p.stock <= 0 ? (
                        <Tag color="red" className="!mr-0">Out of stock</Tag>
                      ) : (
                        <Tag color="orange" className="!mr-0">{p.stock} left</Tag>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
