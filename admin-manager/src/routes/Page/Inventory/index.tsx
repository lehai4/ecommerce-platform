import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import StockHistoryTable from "@/components/stock/StockHistoryTable";
import { STOCK_REASONS, STOCK_REASON_META } from "@/constants/stock";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Paginated, StockMovement, StockReason } from "@/type";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Card, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 20;
const DAY_FORMAT = "YYYY-MM-DD";

/** Every stock change of every product */
const Inventory = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const reason = (params.get("reason") as StockReason) || undefined;
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const productId = params.get("productId") || undefined;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [search] = useDebounce(query.trim(), 400);

  const [result, setResult] = useState<Paginated<StockMovement>>();
  const [loading, setLoading] = useState(false);

  const updateParams = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) =>
      value ? merged.set(key, value) : merged.delete(key)
    );
    setParams(merged, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    axiosAuth
      .get<Paginated<StockMovement>>("/stock/movements", {
        params: {
          page,
          offset: PAGE_SIZE,
          reason,
          productId,
          from,
          to,
          search: params.get("q") || undefined,
        },
      })
      .then(({ data }) => setResult(data))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(load, [load]);

  useEffect(() => {
    if ((params.get("q") ?? "") !== search) {
      updateParams({ q: search || undefined, page: undefined });
    }
  }, [search]);

  return (
    <>
      <Helmet title="Inventory">
        <></>
      </Helmet>
      <PageHeader
        title="Inventory"
        description="Every change of stock: sales, cancellations, deliveries and corrections."
        extra={
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />
      <Card>
        {productId && (
          <Alert
            className="!mb-4"
            type="info"
            showIcon
            message={
              result?.data[0]
                ? `Showing the history of "${result.data[0].product.name}"`
                : "Showing the history of one product"
            }
            action={
              <Button size="small" onClick={() => updateParams({ productId: undefined, page: undefined })}>
                Show all products
              </Button>
            }
          />
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Product name or SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-60"
          />
          <Select
            allowClear
            placeholder="Reason"
            value={reason}
            onChange={(v) => updateParams({ reason: v, page: undefined })}
            options={STOCK_REASONS.map((r) => ({ value: r, label: STOCK_REASON_META[r].label }))}
            className="w-[calc(50%-4px)] sm:w-44"
          />
          <DatePicker.RangePicker
            value={from && to ? [dayjs(from), dayjs(to)] : null}
            format="DD/MM/YYYY"
            onChange={(range) =>
              updateParams({
                from: range?.[0]?.format(DAY_FORMAT),
                to: range?.[1]?.format(DAY_FORMAT),
                page: undefined,
              })
            }
            className="w-full sm:w-auto"
          />
        </div>
        <StockHistoryTable
          data={result?.data ?? []}
          loading={loading}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: result?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} changes`,
            onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          }}
        />
      </Card>
    </>
  );
};

export default Inventory;
