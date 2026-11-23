import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { formatDateTime } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import type { Paginated, Review, ReviewStatus } from "@/type";
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  MessageOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Image,
  Input,
  Modal,
  Rate,
  Select,
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

const PAGE_SIZE = 20;

/** Moderate customer reviews: hide, show and answer */
const ReviewList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const status = (params.get("status") as ReviewStatus) || undefined;
  const rating = params.get("rating") || undefined;
  const replied = params.get("replied") || undefined;
  const [query, setQuery] = useState(params.get("search") ?? "");
  const [search] = useDebounce(query.trim(), 400);

  const [result, setResult] = useState<Paginated<Review>>();
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState<Review>();
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

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
      .get<Paginated<Review>>("/review/admin", {
        params: {
          page,
          offset: PAGE_SIZE,
          status,
          rating,
          replied,
          search: params.get("search") || undefined,
        },
      })
      .then(({ data }) => setResult(data))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [page, status, rating, replied, params.get("search")]);

  useEffect(load, [load]);

  useEffect(() => {
    if ((params.get("search") ?? "") !== search) {
      updateParams({ search: search || undefined, page: undefined });
    }
  }, [search]);

  /** Put the saved fields back in the row, keeping the joined product/user */
  const patchRow = (updated: Review) =>
    setResult((prev) =>
      prev && {
        ...prev,
        data: prev.data.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      }
    );

  const toggle = async (review: Review) => {
    const next: ReviewStatus = review.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
    try {
      const { data } = await axiosAuth.patch<Review>(`/review/${review.id}/status`, {
        status: next,
      });
      patchRow(data);
      toast.success(next === "HIDDEN" ? "Review hidden" : "Review visible again");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const saveReply = async () => {
    if (!replying) return;
    setSaving(true);
    try {
      const { data } = await axiosAuth.patch<Review>(`/review/${replying.id}/reply`, {
        reply: replyText.trim() || null,
      });
      patchRow(data);
      toast.success(replyText.trim() ? "Reply saved" : "Reply removed");
      setReplying(undefined);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<Review> = [
    {
      title: "Product",
      key: "product",
      width: 240,
      render: (_, r) =>
        r.product && (
          <Link
            to={`/product-list/edit/${r.product.id}`}
            className="flex items-center gap-3 min-w-[200px]"
          >
            <Image
              src={pictureUrl(r.product.picture)}
              width={40}
              height={40}
              preview={false}
              className="rounded-md object-cover"
            />
            <Typography.Text className="line-clamp-2">{r.product.name}</Typography.Text>
          </Link>
        ),
    },
    {
      title: "Review",
      key: "review",
      render: (_, r) => (
        <div className="flex min-w-[260px] flex-col gap-1">
          <Rate disabled value={r.rating} className="!text-sm" />
          {r.comment ? (
            <Typography.Paragraph className="!mb-0" ellipsis={{ rows: 3, expandable: true }}>
              {r.comment}
            </Typography.Paragraph>
          ) : (
            <Typography.Text type="secondary" italic>
              No comment
            </Typography.Text>
          )}
          {r.reply && (
            <div className="mt-1 rounded-md border-l-2 border-indigo-400 bg-indigo-500/5 px-3 py-1.5 text-[13px]">
              <Typography.Text type="secondary" className="text-xs">
                Shop reply
              </Typography.Text>
              <Typography.Paragraph className="!mb-0" ellipsis={{ rows: 2, expandable: true }}>
                {r.reply}
              </Typography.Paragraph>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      width: 200,
      render: (_, r) => (
        <div className="flex flex-col">
          {r.user ? (
            <Link to={`/customer/${r.user.id}`}>{r.user.name || r.user.email}</Link>
          ) : (
            <Typography.Text type="secondary">Deleted account</Typography.Text>
          )}
          {r.order && (
            <Link to={`/order/${r.order.id}`} className="text-xs">
              {r.order.code}
            </Link>
          )}
          <Typography.Text type="secondary" className="text-xs">
            {formatDateTime(r.createdAt)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      render: (s: ReviewStatus) =>
        s === "VISIBLE" ? <Tag color="green">Visible</Tag> : <Tag>Hidden</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 96,
      fixed: "right",
      render: (_, r) => (
        <div className="flex gap-1">
          <Tooltip title={r.reply ? "Edit reply" : "Reply"}>
            <Button
              type="text"
              icon={<MessageOutlined />}
              aria-label="Reply"
              onClick={() => {
                setReplyText(r.reply ?? "");
                setReplying(r);
              }}
            />
          </Tooltip>
          <Tooltip title={r.status === "VISIBLE" ? "Hide from the shop" : "Show in the shop"}>
            <Button
              type="text"
              icon={r.status === "VISIBLE" ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              aria-label={r.status === "VISIBLE" ? "Hide" : "Show"}
              onClick={() => toggle(r)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Helmet title="Reviews">
        <></>
      </Helmet>
      <PageHeader
        title="Reviews"
        description="Reviews customers wrote after receiving their orders. Hidden reviews don't count in the product rating."
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search comment, product or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            allowClear
            placeholder="Stars"
            value={rating}
            onChange={(v) => updateParams({ rating: v, page: undefined })}
            options={[5, 4, 3, 2, 1].map((n) => ({
              value: String(n),
              label: `${n} star${n > 1 ? "s" : ""}`,
            }))}
            className="w-[calc(33%-6px)] sm:w-32"
          />
          <Select
            allowClear
            placeholder="Status"
            value={status}
            onChange={(v) => updateParams({ status: v, page: undefined })}
            options={[
              { value: "VISIBLE", label: "Visible" },
              { value: "HIDDEN", label: "Hidden" },
            ]}
            className="w-[calc(33%-6px)] sm:w-32"
          />
          <Select
            allowClear
            placeholder="Reply"
            value={replied}
            onChange={(v) => updateParams({ replied: v, page: undefined })}
            options={[
              { value: "no", label: "Not answered" },
              { value: "yes", label: "Answered" },
            ]}
            className="w-[calc(33%-6px)] sm:w-40"
          />
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={result?.data}
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: result?.total,
            showSizeChanger: false,
            showTotal: (total) => `${total} reviews`,
            onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          }}
        />
      </Card>

      <Modal
        title="Reply to review"
        open={!!replying}
        onCancel={() => setReplying(undefined)}
        onOk={saveReply}
        okText="Save reply"
        okButtonProps={{ loading: saving }}
      >
        {replying && (
          <div className="mb-3 flex flex-col gap-1">
            <Rate disabled value={replying.rating} className="!text-sm" />
            <Typography.Text type="secondary">
              {replying.comment || "No comment"}
            </Typography.Text>
          </div>
        )}
        <Input.TextArea
          rows={4}
          maxLength={1000}
          showCount
          autoFocus
          placeholder="Your answer, shown under the review. Leave empty to remove it."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default ReviewList;
