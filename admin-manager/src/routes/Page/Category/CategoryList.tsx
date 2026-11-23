import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import { slugify } from "@/lib/slugify";
import type { CategoryNode } from "@/type";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

type Row = Omit<CategoryNode, "children"> & { children?: Row[] };

/** antd shows an expand arrow for any `children` array, so drop empty ones */
const toRows = (nodes: CategoryNode[]): Row[] =>
  nodes.map(({ children, ...node }) =>
    children.length ? { ...node, children: toRows(children) } : node
  );

/** Keeps matching categories and the parents leading to them */
const filterTree = (rows: Row[], term: string): Row[] =>
  rows.flatMap((row) => {
    const children = row.children ? filterTree(row.children, term) : [];
    const matches =
      slugify(row.name).includes(term) || row.slug.includes(term);
    if (!matches && !children.length) return [];
    return [{ ...row, children: children.length ? children : undefined }];
  });

const allKeys = (rows: Row[]): string[] =>
  rows.flatMap((r) => (r.children ? [r.id, ...allKeys(r.children)] : []));

const CategoryList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [tree, setTree] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    axiosAuth
      .get<CategoryNode[]>("/category/tree")
      .then(({ data }) => {
        const rows = toRows(data);
        setTree(rows);
        setExpanded(allKeys(rows));
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const term = slugify(query);
  const rows = useMemo(() => (term ? filterTree(tree, term) : tree), [tree, term]);

  const onDelete = async (category: Row) => {
    try {
      await axiosAuth.delete(`/category/${category.id}`);
      toast.success(`"${category.name}" deleted`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const baseColumns: TableColumnsType<Row> = [
    {
      title: "Category",
      dataIndex: "name",
      render: (name: string, category) => (
        <Link
          to={`/category/edit/${category.id}`}
          className="inline-flex items-center gap-3 min-w-[200px] align-middle"
        >
          {category.image ? (
            <img
              src={pictureUrl(category.image, 36)}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FolderOutlined />
            </span>
          )}
          <span className="min-w-0">
            <Typography.Text strong className="block !text-inherit">
              {name}
            </Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              /{category.slug}
            </Typography.Text>
          </span>
        </Link>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      responsive: ["xl"],
      render: (description?: string | null) =>
        description ? (
          <Typography.Paragraph
            type="secondary"
            className="!mb-0 max-w-[360px]"
            ellipsis={{ rows: 2, tooltip: description }}
          >
            {description}
          </Typography.Paragraph>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Products",
      key: "products",
      align: "right",
      width: 120,
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
      width: 130,
      render: (_, category) => (
        <Space size={4}>
          <Tooltip title="Add sub-category">
            <Link to={`/category/create?parentId=${category.id}`}>
              <Button type="text" icon={<PlusOutlined />} aria-label="Add sub-category" />
            </Link>
          </Tooltip>
          <Tooltip title="Edit">
            <Link to={`/category/edit/${category.id}`}>
              <Button type="text" icon={<EditOutlined />} aria-label="Edit" />
            </Link>
          </Tooltip>
          <Popconfirm
            title="Delete category"
            description={
              <span className="block max-w-[260px]">
                Delete "{category.name}"?
                {category._count?.products
                  ? ` Its ${category._count.products} product(s) stay but lose this category.`
                  : ""}
                {category.children?.length
                  ? " Its sub-categories move to the top level."
                  : ""}
              </span>
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
          dataSource={rows}
          loading={loading}
          pagination={false}
          scroll={{ x: "max-content" }}
          size="middle"
          expandable={{
            expandedRowKeys: term ? allKeys(rows) : expanded,
            onExpandedRowsChange: (keys) => setExpanded(keys as string[]),
            indentSize: 28,
          }}
          locale={{
            emptyText: term ? "No categories match your search" : "No categories yet",
          }}
        />
      </Card>
    </>
  );
};

export default CategoryList;
