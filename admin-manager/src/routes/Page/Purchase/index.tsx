import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import TableList from "@/components/TableList";
import LinearLoading from "@/components/loading/linear";
import { useAppSelector } from "@/hook/useHookRedux";
import { getAllPurchase } from "@/redux/api";
import { DataTypePurchase } from "@/type";
import {
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Popconfirm,
  PopconfirmProps,
  Space,
  Tag,
  TableColumnsType,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const PurChase = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });

  const [page, setPage] = useState(1);

  const [idDelete, setIdDelete] = useState<string>("");
  const [purchase, setPurchase] = useState<DataTypePurchase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isHasMore, setIsHasMore] = useState<boolean>(true);

  const confirm: PopconfirmProps["onConfirm"] = async () => {
    try {
      await axiosAuth({
        method: "DELETE",
        url: `/purchase/${idDelete}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}`,
        },
      });
      const purchase = await getAllPurchase({ user });
      setPurchase(purchase);
      toast.success("Delete purchase successfully!");
    } catch (e) {
      toast.error("Delete purchase failed!");
    }
  };

  const cancel: PopconfirmProps["onCancel"] = () => {
    message.error("No Delete");
  };

  const renderId = (value: string) => (
    <Typography.Text
      type="secondary"
      style={{ width: 140 }}
      ellipsis={{ tooltip: value }}
      copyable={{ text: value }}
    >
      {value}
    </Typography.Text>
  );

  const columns: TableColumnsType<DataTypePurchase> = [
    {
      title: "Order",
      dataIndex: "id",
      width: 170,
      render: renderId,
    },
    {
      title: "Customer",
      dataIndex: "user",
      render: (user: { email: string }, record) => (
        <div className="min-w-[180px]">
          <Typography.Text className="block">{user?.email}</Typography.Text>
          <Typography.Text
            type="secondary"
            className="text-xs"
            style={{ maxWidth: 160 }}
            ellipsis={{ tooltip: record.userId }}
          >
            {record.userId}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Product",
      dataIndex: "product",
      render: (product: { name: string }, record) => (
        <div className="min-w-[160px]">
          <Typography.Text strong className="block">
            {product?.name}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            className="text-xs"
            style={{ maxWidth: 160 }}
            ellipsis={{ tooltip: record.productId }}
          >
            {record.productId}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Qty",
      dataIndex: "amount",
      align: "right",
      width: 80,
    },
    {
      title: "Total",
      dataIndex: "totalPrice",
      align: "right",
      width: 120,
      render: (totalPrice: string) => (
        <Typography.Text strong>
          {Number(totalPrice).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </Typography.Text>
      ),
    },
    {
      title: "Review",
      dataIndex: "reviewNote",
      width: 200,
      render: (reviewNote: string | null, record) =>
        reviewNote !== null ? (
          <div style={{ maxWidth: 200 }}>
            <Tag color="gold">{reviewNote}</Tag>
            {record.reviewComment && (
              <Typography.Paragraph
                type="secondary"
                className="!mb-0 text-xs"
                ellipsis={{ rows: 1, tooltip: record.reviewComment }}
              >
                {record.reviewComment}
              </Typography.Paragraph>
            )}
          </div>
        ) : (
          <Typography.Text type="secondary">No review</Typography.Text>
        ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 170,
      render: (createdAt: string) => (
        <Typography.Text type="secondary">
          {new Date(createdAt).toLocaleString()}
        </Typography.Text>
      ),
    },
    {
      title: "Actions",
      dataIndex: "",
      key: "x",
      align: "right",
      fixed: "right",
      width: 150,
      render: (e: DataTypePurchase) => (
        <Space>
          <Link to={`/purchase/${e.id}`}>
            <Button icon={<EyeOutlined />}>View</Button>
          </Link>
          <Popconfirm
            title="Delete purchase"
            description="Are you sure you want to delete this purchase?"
            onConfirm={confirm}
            onCancel={cancel}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              aria-label="Delete purchase"
              onClick={() => setIdDelete(e.id)}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dataSource: any[] = purchase?.map((t) => {
    return {
      key: t.id,
      id: t.id,
      userId: t.userId,
      productId: t.productId,
      amount: t.amount,
      totalPrice: t.totalPrice,
      reviewNote: t.reviewNote,
      reviewComment: t.reviewComment,
      createdAt: t.createdAt,
      user: t.user,
      product: t.product,
    };
  });


  const onScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    if (scrollTop + clientHeight === scrollHeight && isHasMore) {
      setLoading(true);
      setPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    setTimeout(async () => {
      await axiosAuth({
        method: "GET",
        url: `/purchase/admin?page=${page}&offset=10`,
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
        },
      })
        .then((response) => {
          response.data.length === 0
            ? setIsHasMore(false)
            : setPurchase([...purchase, ...response.data]);
          setLoading(false);
        })
        .catch((error) => {
          toast.error(error.message);
        });
    }, 3000);
  }, [page]);

  return (
    <>
      <Helmet title="PurchaseList">
        <></>
      </Helmet>
      <PageHeader
        title="Purchases"
        description="Orders placed by customers and their reviews."
      />
      <Card>
        <TableList
          columns={columns}
          dataSource={dataSource}
          handleScroll={onScroll}
        />
        {loading && <LinearLoading />}
      </Card>
    </>
  );
};

export default PurChase;
