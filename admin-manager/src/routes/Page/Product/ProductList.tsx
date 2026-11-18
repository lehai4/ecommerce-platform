import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import ProductPictureModal from "@/components/product/ProductPictureModal";
import { formatMoney } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import { ProductProps } from "@/type";
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
  Space,
  Table,
  TableColumnsType,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 10;
const LOW_STOCK = 5;

const ProductList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [products, setProducts] = useState<ProductProps[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [search] = useDebounce(query.trim(), 400);
  const [pictureFor, setPictureFor] = useState<ProductProps>();

  const fetchPage = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const { data } = await axiosAuth.get<ProductProps[]>("/product", {
        params: {
          page: pageToLoad,
          offset: PAGE_SIZE,
          productName: search || undefined,
        },
      });
      setProducts((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageToLoad);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, [search]);

  const onDelete = async (product: ProductProps) => {
    try {
      await axiosAuth.delete(`/product/${product.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success(`"${product.name}" deleted`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const baseColumns: TableColumnsType<ProductProps> = [
    {
      title: "Product",
      key: "product",
      render: (_, product) => (
        <div className="flex items-center gap-3 min-w-[240px]">
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
            <Link to={`/product-list/edit/${product.urlName}`}>
              <Typography.Text strong className="block !text-inherit hover:!text-indigo-600">
                {product.name}
              </Typography.Text>
            </Link>
            <div className="mt-1 flex flex-wrap gap-1">
              {product.categories?.length ? (
                product.categories.map((c) => (
                  <Tag key={c.id ?? c.name} className="!mr-0" bordered={false}>
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
      title: "Price",
      key: "price",
      align: "right",
      width: 140,
      render: (_, product) => {
        const base = Number(product.basePrice);
        const discount = Number(product.discountPercentage) || 0;
        if (!discount) return formatMoney(base);
        return (
          <div className="flex flex-col items-end">
            <Typography.Text strong>
              {formatMoney(base * (1 - discount / 100))}
            </Typography.Text>
            <span className="flex items-center gap-1">
              <Typography.Text type="secondary" delete className="text-xs">
                {formatMoney(base)}
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
      width: 120,
      render: (stock: number) =>
        stock <= 0 ? (
          <Tag color="red" bordered={false} className="!mr-0">
            Out of stock
          </Tag>
        ) : stock <= LOW_STOCK ? (
          <Tag color="orange" bordered={false} className="!mr-0">
            {stock} left
          </Tag>
        ) : (
          <Typography.Text>{stock}</Typography.Text>
        ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: 110,
      render: (_, product) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Link to={`/product-list/edit/${product.urlName}`}>
              <Button type="text" icon={<EditOutlined />} aria-label="Edit" />
            </Link>
          </Tooltip>
          <Popconfirm
            title="Delete product"
            description={`Delete "${product.name}"? This cannot be undone.`}
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
        <div className="mb-4 max-w-sm">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={products}
          loading={loading && products.length === 0}
          pagination={false}
          scroll={{ x: "max-content" }}
          size="middle"
          locale={{
            emptyText: search ? "No products match your search" : "No products yet",
          }}
        />
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <Button loading={loading} onClick={() => fetchPage(page + 1)}>
              Load more
            </Button>
          </div>
        )}
      </Card>
      <ProductPictureModal
        product={pictureFor}
        onClose={() => setPictureFor(undefined)}
        onUploaded={(updated) =>
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          )
        }
      />
    </>
  );
};

export default ProductList;
