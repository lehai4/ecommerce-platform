import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import ProductPictureModal from "@/components/product/ProductPictureModal";
import { formatMoney } from "@/constants/order";
import {
  LOW_STOCK,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_META,
} from "@/constants/product";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import type { Category, Paginated, ProductProps, ProductStatus } from "@/type";
import {
  CameraOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Image,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  TableColumnsType,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 10;

const ProductList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  // Filters live in the URL so they survive going to a product and back.
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const status = (params.get("status") as ProductStatus) || undefined;
  const categoryId = params.get("categoryId") || undefined;
  const stockLevel = params.get("stockLevel") || undefined;
  const sort = params.get("sort") || "newest";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [search] = useDebounce(query.trim(), 400);

  const [result, setResult] = useState<Paginated<ProductProps>>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [pictureFor, setPictureFor] = useState<ProductProps>();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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
      .get<Paginated<ProductProps>>("/product/admin", {
        params: {
          page,
          offset: PAGE_SIZE,
          productName: params.get("q") || undefined,
          status,
          categoryId,
          stockLevel,
          sort,
        },
      })
      .then(({ data }) => setResult(data))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(load, [load]);
  useEffect(() => setSelected([]), [params]);

  const runBulk = async (
    action: () => Promise<{ data: { count: number } }>,
    done: (count: number) => string
  ) => {
    setBulkBusy(true);
    try {
      const { data } = await action();
      toast.success(done(data.count));
      setSelected([]);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkStatus = (value: ProductStatus) =>
    runBulk(
      () => axiosAuth.patch("/product/bulk/status", { ids: selected, status: value }),
      (count) => `${count} product(s) set to ${PRODUCT_STATUS_META[value].label}`
    );

  const bulkDelete = () =>
    runBulk(
      () => axiosAuth.post("/product/bulk/delete", { ids: selected }),
      (count) => `${count} product(s) deleted`
    );

  useEffect(() => {
    axiosAuth
      .get<Category[]>("/category", { params: { offset: 100 } })
      .then(({ data }) => setCategories(data))
      .catch(() => undefined);
  }, []);

  // Search box -> URL (and back to page 1)
  useEffect(() => {
    if ((params.get("q") ?? "") !== search) {
      updateParams({ q: search || undefined, page: undefined });
    }
  }, [search]);

  const onDelete = async (product: ProductProps) => {
    try {
      await axiosAuth.delete(`/product/${product.id}`);
      toast.success(`"${product.name}" deleted`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const hasFilters = !!(params.get("q") || status || categoryId || stockLevel);

  const baseColumns: TableColumnsType<ProductProps> = [
    {
      title: "Product",
      key: "product",
      render: (_, product) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <Tooltip title="Change picture">
            <button
              type="button"
              className="group relative shrink-0 overflow-hidden rounded-lg border border-black/5"
              onClick={() => setPictureFor(product)}
            >
              <Image
                src={pictureUrl(product.picture, 52)}
                alt={product.name}
                width={52}
                height={52}
                preview={false}
                className="object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <CameraOutlined />
              </span>
            </button>
          </Tooltip>
          <div className="min-w-0">
            <Link to={`/product-list/edit/${product.id}`}>
              <Typography.Text
                strong
                className="block !text-inherit hover:!text-indigo-600"
              >
                {product.name}
              </Typography.Text>
            </Link>
            {product.sku && (
              <Typography.Text type="secondary" className="block font-mono text-xs">
                {product.sku}
              </Typography.Text>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {product.categories?.length ? (
                product.categories.map((c) => (
                  <Tag key={c.id} className="!mr-0" bordered={false}>
                    {c.name}
                  </Tag>
                ))
              ) : (
                <Typography.Text type="secondary" className="text-xs">
                  No category
                </Typography.Text>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (value: ProductStatus) => (
        <Tooltip title={PRODUCT_STATUS_META[value].description}>
          <Tag color={PRODUCT_STATUS_META[value].color} className="!mr-0">
            {PRODUCT_STATUS_META[value].label}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Price",
      key: "price",
      align: "right",
      width: 110,
      render: (_, product) => {
        const discount = Number(product.discountPercentage) || 0;
        if (!discount) return formatMoney(product.salePrice);
        return (
          <div className="flex flex-col items-end">
            <Typography.Text strong>
              {formatMoney(product.salePrice)}
            </Typography.Text>
            <span className="flex items-center gap-1">
              <Typography.Text type="secondary" delete className="text-xs">
                {formatMoney(product.basePrice)}
              </Typography.Text>
              <Tag color="green" bordered={false} className="!mr-0 text-xs">
                -{discount}%
              </Tag>
            </span>
          </div>
        );
      },
    },
    {
      title: "Stock",
      dataIndex: "stock",
      align: "right",
      width: 110,
      render: (stock: number, product) => (
        <div className="flex flex-col items-end">
          {stock <= 0 ? (
            <Tag color="red" bordered={false} className="!mr-0">
              Out of stock
            </Tag>
          ) : stock <= LOW_STOCK ? (
            <Tag color="orange" bordered={false} className="!mr-0">
              {stock} left
            </Tag>
          ) : (
            <Typography.Text>{stock}</Typography.Text>
          )}
          <Typography.Text type="secondary" className="text-xs">
            {product.soldCount} sold
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: 90,
      render: (_, product) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Link to={`/product-list/edit/${product.id}`}>
              <Button type="text" icon={<EditOutlined />} aria-label="Edit" />
            </Link>
          </Tooltip>
          <Popconfirm
            title="Delete product"
            description={
              <span className="block max-w-[260px]">
                "{product.name}" will disappear from the shop and this list.
                Existing orders keep their copy of it.
              </span>
            }
            onConfirm={() => onDelete(product)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${product.name}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  const columns = useResponsiveColumns(baseColumns);

  return (
    <>
      <Helmet title="Products">
        <></>
      </Helmet>
      <PageHeader
        title="Products"
        description="Manage your catalogue, prices and stock."
        extra={
          <Link to="create">
            <Button type="primary" icon={<PlusOutlined />}>
              New product
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-60"
          />
          <div className="contents">
            <Select
              allowClear
              placeholder="Category"
              value={categoryId}
              onChange={(v) => updateParams({ categoryId: v, page: undefined })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              className="w-[calc(50%-4px)] sm:w-40"
              showSearch
              optionFilterProp="label"
            />
            <Select
              allowClear
              placeholder="Status"
              value={status}
              onChange={(v) => updateParams({ status: v, page: undefined })}
              options={PRODUCT_STATUSES.map((s) => ({
                value: s,
                label: PRODUCT_STATUS_META[s].label,
              }))}
              className="w-[calc(50%-4px)] sm:w-32"
            />
            <Select
              allowClear
              placeholder="Stock"
              value={stockLevel}
              onChange={(v) => updateParams({ stockLevel: v, page: undefined })}
              options={[
                { value: "low", label: `Low stock (≤ ${LOW_STOCK})` },
                { value: "out", label: "Out of stock" },
              ]}
              className="w-[calc(50%-4px)] sm:w-40"
            />
            <Select
              value={sort}
              onChange={(v) =>
                updateParams({ sort: v === "newest" ? undefined : v, page: undefined })
              }
              options={PRODUCT_SORT_OPTIONS.map((o) => ({ ...o }))}
              className="w-[calc(50%-4px)] sm:ml-auto sm:w-44"
            />
          </div>
        </div>
        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-2">
            <Typography.Text strong>{selected.length} selected</Typography.Text>
            <Select
              size="small"
              placeholder="Set status"
              value={null}
              disabled={bulkBusy}
              onChange={(value: ProductStatus) => bulkStatus(value)}
              options={PRODUCT_STATUSES.map((value) => ({
                value,
                label: PRODUCT_STATUS_META[value].label,
              }))}
              className="w-32"
            />
            <Popconfirm
              title={`Delete ${selected.length} product(s)?`}
              description="They will disappear from the shop and this list."
              onConfirm={bulkDelete}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<DeleteOutlined />} loading={bulkBusy}>
                Delete
              </Button>
            </Popconfirm>
            <Button size="small" type="text" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}
        <Table
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (keys) => setSelected(keys as string[]),
          }}
          columns={columns}
          dataSource={result?.data ?? []}
          loading={loading}
          scroll={{ x: "max-content" }}
          size="middle"
          locale={{
            emptyText: hasFilters
              ? "No products match these filters"
              : "No products yet",
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: result?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} ${total === 1 ? "product" : "products"}`,
            onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          }}
        />
      </Card>
      <ProductPictureModal
        product={pictureFor}
        onClose={() => setPictureFor(undefined)}
        onUploaded={() => load()}
      />
    </>
  );
};

export default ProductList;
