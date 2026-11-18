import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import {
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Table,
  TableColumnsType,
  Tooltip,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 10;

type CategoryRow = {
  id: string;
  name: string;
  _count?: { products: number };
};

const CategoryList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [search] = useDebounce(query.trim(), 400);

  const fetchPage = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const { data } = await axiosAuth.get<CategoryRow[]>("/category", {
        params: {
          page: pageToLoad,
          offset: PAGE_SIZE,
          categoryName: search || undefined,
        },
      });
      setCategories((prev) => (pageToLoad === 1 ? data : [...prev, ...data]));
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

  const onDelete = async (category: CategoryRow) => {
    try {
      await axiosAuth.delete(`/category/${category.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast.success(`"${category.name}" deleted`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const baseColumns: TableColumnsType<CategoryRow> = [
    {
      title: "Category",
      dataIndex: "name",
      render: (name: string, category) => (
        <Link
          to={`/category/edit/${category.name}`}
          className="flex items-center gap-3 min-w-[200px]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
            <FolderOutlined />
          </span>
          <Typography.Text strong className="!text-inherit">
            {name}
          </Typography.Text>
        </Link>
      ),
    },
    {
      title: "Products",
      key: "products",
      align: "right",
      width: 140,
      render: (_, category) => {
        const count = category._count?.products ?? 0;
        return (
          <Typography.Text type={count ? undefined : "secondary"}>
            {count} {count === 1 ? "product" : "products"}
          </Typography.Text>
        );
      },
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: 110,
      render: (_, category) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Link to={`/category/edit/${category.name}`}>
              <Button type="text" icon={<EditOutlined />} aria-label="Edit" />
            </Link>
          </Tooltip>
          <Popconfirm
            title="Delete category"
            description={
              category._count?.products
                ? `"${category.name}" has ${category._count.products} product(s). They will stay but lose this category.`
                : `Delete "${category.name}"?`
            }
            onConfirm={() => onDelete(category)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${category.name}`}
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
      <Helmet title="Categories">
        <></>
      </Helmet>
      <PageHeader
        title="Categories"
        description="Group products so customers can find them faster."
        extra={
          <Link to="create">
            <Button type="primary" icon={<PlusOutlined />}>
              New category
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="mb-4 max-w-sm">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={categories}
          loading={loading && categories.length === 0}
          pagination={false}
          scroll={{ x: "max-content" }}
          size="middle"
          locale={{
            emptyText: search
              ? "No categories match your search"
              : "No categories yet",
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
    </>
  );
};

export default CategoryList;
