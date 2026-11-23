import { formatDateTime } from "@/constants/order";
import { getProductReviews } from "@/redux/api";
import type { ProductReviews as ProductReviewsData } from "@/type";
import { Card, Empty, List, Pagination, Progress, Rate, Segmented, Typography } from "antd";
import { useEffect, useState } from "react";

const PAGE_SIZE = 5;

/** Rating summary and the visible reviews of one product */
const ProductReviews = ({ productId }: { productId: string }) => {
  const [data, setData] = useState<ProductReviewsData>();
  const [rating, setRating] = useState<number>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProductReviews(productId, { rating, page, offset: PAGE_SIZE })
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [productId, rating, page]);

  const summary = data?.summary;

  return (
    <Card title="Customer reviews" className="mt-6">
      {summary && summary.count === 0 && !rating ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No reviews yet. Customers can review after their order is delivered."
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-3">
          {summary && (
            <div className="flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <span className="text-[40px] font-semibold leading-none">
                  {summary.average.toFixed(1)}
                </span>
                <Typography.Text type="secondary">out of 5</Typography.Text>
              </div>
              <Rate disabled allowHalf value={summary.average} />
              <Typography.Text type="secondary">
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </Typography.Text>
              <div className="mt-2 flex flex-col gap-1">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count =
                    summary.distribution.find((d) => d.rating === stars)?.count ?? 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-[13px]">
                      <span className="w-12 shrink-0">{stars} star</span>
                      <Progress
                        percent={summary.count ? (count / summary.count) * 100 : 0}
                        showInfo={false}
                        size="small"
                        strokeColor="#4f46e5"
                        className="!m-0 flex-1"
                      />
                      <span className="w-6 shrink-0 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="md:col-span-2">
            <Segmented
              className="mb-3"
              value={rating ?? 0}
              onChange={(v) => {
                setRating(Number(v) || undefined);
                setPage(1);
              }}
              options={[
                { value: 0, label: "All" },
                ...[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n}★` })),
              ]}
            />
            <List
              loading={loading}
              dataSource={data?.data}
              locale={{ emptyText: "No reviews with this rating" }}
              renderItem={(review) => (
                <List.Item>
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-3">
                      <Typography.Text strong>{review.author}</Typography.Text>
                      <Rate disabled value={review.rating} className="!text-xs" />
                      <Typography.Text type="secondary" className="text-xs">
                        {formatDateTime(review.createdAt)}
                      </Typography.Text>
                    </div>
                    {review.comment && (
                      <Typography.Paragraph className="!mb-0">{review.comment}</Typography.Paragraph>
                    )}
                    {review.reply && (
                      <div className="mt-1 rounded-md border-l-2 border-indigo-400 bg-indigo-500/5 px-3 py-1.5 text-[13px]">
                        <Typography.Text type="secondary" className="text-xs">
                          Reply from the shop
                        </Typography.Text>
                        <Typography.Paragraph className="!mb-0">{review.reply}</Typography.Paragraph>
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
            />
            {data && data.total > PAGE_SIZE && (
              <Pagination
                className="mt-3 text-right"
                size="small"
                current={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onChange={setPage}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProductReviews;
