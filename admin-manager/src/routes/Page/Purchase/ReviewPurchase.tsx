import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { Purchase } from "@/type";
import { Card, Descriptions, Skeleton, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

const money = (value?: string | number) =>
  Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const ReviewPurchase = () => {
  const params = useParams();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [purchase, setPurchase] = useState<Purchase>();

  useEffect(() => {
    (async () => {
      await axiosAuth({
        method: "GET",
        url: `/purchase/${params.id}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
      })
        .then((response) => {
          setPurchase(response.data);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    })();
  }, []);

  const copyable = (value?: string) =>
    value ? (
      <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>
    ) : (
      "—"
    );

  return (
    <>
      <Helmet title="ReviewPurchase">
        <></>
      </Helmet>
      <PageHeader
        title="Purchase details"
        description={purchase ? `Order ${purchase.id}` : undefined}
        backTo="/purchase"
      />
      {!purchase ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Order" className="xl:col-span-2">
            <Descriptions
              column={{ xs: 1, sm: 1, md: 2 }}
              labelStyle={{ width: 140 }}
              items={[
                { key: "product", label: "Product", children: purchase.product?.name },
                { key: "customer", label: "Customer", children: purchase.user?.email },
                { key: "amount", label: "Quantity", children: purchase.amount },
                {
                  key: "total",
                  label: "Total price",
                  children: (
                    <Typography.Text strong>
                      {money(purchase.totalPrice)}
                    </Typography.Text>
                  ),
                },
                {
                  key: "created",
                  label: "Created",
                  children: new Date(purchase.createdAt).toLocaleString(),
                },
                { key: "id", label: "Order ID", children: copyable(purchase.id) },
                { key: "userId", label: "User ID", children: copyable(purchase.userId) },
                {
                  key: "productId",
                  label: "Product ID",
                  children: copyable(purchase.productId),
                },
              ]}
            />
          </Card>
          <Card title="Customer review">
            {purchase.reviewNote === null && purchase.reviewComment === null ? (
              <Typography.Text type="secondary">
                The customer has not reviewed this purchase yet.
              </Typography.Text>
            ) : (
              <div className="flex flex-col gap-3">
                {purchase.reviewNote !== null && (
                  <div>
                    <Tag color="gold" className="text-[14px] px-2 py-0.5">
                      {purchase.reviewNote}
                    </Tag>
                  </div>
                )}
                <Typography.Paragraph className="!mb-0">
                  {purchase.reviewComment ?? (
                    <Typography.Text type="secondary">No comment</Typography.Text>
                  )}
                </Typography.Paragraph>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default ReviewPurchase;
