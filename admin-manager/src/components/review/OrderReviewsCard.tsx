import AxiosJWTInstance from "@/InstanceAxios";
import { pictureUrl } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Order, Review, ReviewToWrite } from "@/type";
import { Button, Card, Image, Input, Modal, Rate, Typography } from "antd";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Target = { productId: string; productName: string; review?: Review };

/** Let the customer review the products of a delivered order */
const OrderReviewsCard = ({ order }: { order: Order }) => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [mine, setMine] = useState<{ reviews: Review[]; toReview: ReviewToWrite[] }>();
  const [target, setTarget] = useState<Target>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    axiosAuth
      .get<{ reviews: Review[]; toReview: ReviewToWrite[] }>("/review/mine")
      .then(({ data }) => setMine(data))
      .catch(() => undefined);

  useEffect(() => {
    load();
  }, [order.id]);

  const open = (t: Target) => {
    setRating(t.review?.rating ?? 5);
    setComment(t.review?.comment ?? "");
    setTarget(t);
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const body = { rating, comment: comment.trim() || undefined };
      if (target.review) {
        await axiosAuth.patch(`/review/${target.review.id}`, body);
      } else {
        await axiosAuth.post("/review", {
          ...body,
          orderId: order.id,
          productId: target.productId,
        });
      }
      toast.success("Thanks for your review!");
      setTarget(undefined);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // One row per product still in the catalog
  const rows = order.items
    .filter((item) => item.productId)
    .map((item) => ({
      item,
      review: mine?.reviews.find(
        (r) => r.orderId === order.id && r.productId === item.productId
      ),
      canWrite: !!mine?.toReview.some(
        (t) => t.orderId === order.id && t.productId === item.productId
      ),
    }));

  if (rows.length === 0) return null;

  return (
    <Card title="Review your items">
      <div className="flex flex-col divide-y divide-black/5">
        {rows.map(({ item, review, canWrite }) => (
          <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Image
              src={pictureUrl(item.productPicture)}
              width={40}
              height={40}
              preview={false}
              className="rounded-md object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Typography.Text ellipsis>{item.productName}</Typography.Text>
              {review ? (
                <span className="flex items-center gap-2">
                  <Rate disabled value={review.rating} className="!text-xs" />
                  {review.status === "HIDDEN" && (
                    <Typography.Text type="secondary" className="text-xs">
                      Hidden by the shop
                    </Typography.Text>
                  )}
                </span>
              ) : (
                <Typography.Text type="secondary" className="text-xs">
                  Not reviewed yet
                </Typography.Text>
              )}
            </div>
            {review ? (
              <Button
                size="small"
                onClick={() =>
                  open({ productId: item.productId!, productName: item.productName, review })
                }
              >
                Edit
              </Button>
            ) : (
              canWrite && (
                <Button
                  size="small"
                  type="primary"
                  onClick={() =>
                    open({ productId: item.productId!, productName: item.productName })
                  }
                >
                  Write review
                </Button>
              )
            )}
          </div>
        ))}
      </div>

      <Modal
        title={target?.productName}
        open={!!target}
        onCancel={() => setTarget(undefined)}
        onOk={save}
        okText={target?.review ? "Save" : "Post review"}
        okButtonProps={{ loading: saving }}
      >
        <div className="mb-3 flex items-center gap-3">
          <Rate value={rating} onChange={(v) => setRating(v || 1)} />
          <Typography.Text type="secondary">{rating} / 5</Typography.Text>
        </div>
        <Input.TextArea
          rows={4}
          maxLength={1000}
          showCount
          placeholder="What did you like or dislike? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </Card>
  );
};

export default OrderReviewsCard;
