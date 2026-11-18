import { pictureUrl } from "@/lib/image";
import Helmet from "@/components/Helmet";
import { getProductByName } from "@/redux/api";
import { ProductProps } from "@/type";
import {
  Button,
  Card,
  Divider,
  Image,
  InputNumber,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch } from "@/hook/useHookRedux";
import { AddToCart } from "@/redux/slice/cartSlice";


const ProductDetailSlug = () => {
  const params = useParams();
  const navigate = useNavigate();
  const dispath = useAppDispatch();
  const [product, setProduct] = useState<ProductProps>();
  const [quantity, setQuantity] = useState<number>(1);
  const handleReview = () => {
    toast.info("Thanks you because seen product!");
  };

  const onChange = (value: number | null) => {
    setQuantity(value as number);
  };
  const handleAddToCart = () => {
    dispath(
      AddToCart({
        ...product,
        quantity: quantity,
      })
    );
    toast.success("Add Product to Cart sucessfully!");
  };
  useEffect(() => {
    let mounted = true;
    getProductByName({ name: params.name as string }).then((items) => {
      if (mounted) {
        setProduct(items.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);
  const inStock = !!product?.stock && product.stock > 0;

  return (
    <>
      <Helmet title={`ProductDetail-${product?.name ?? ""}`}>
        <></>
      </Helmet>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        className="!px-0 mb-4"
      >
        Back to products
      </Button>
      {!product ? (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <Card>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl bg-slate-50">
              <Image
                width="100%"
                src={pictureUrl(product.picture, 600)}
                alt={product.name}
                className="aspect-square object-cover"
              />
            </div>
            <div className="flex flex-col">
              <Space size={[8, 8]} wrap className="mb-3">
                {product.categories && product.categories.length > 0 ? (
                  product.categories.map((item, i) => (
                    <Tag key={i} color="geekblue">
                      {item.name}
                    </Tag>
                  ))
                ) : (
                  <Tag>No category</Tag>
                )}
                <Tag color={inStock ? "green" : "red"}>
                  {inStock ? "In stock" : "Out of stock"}
                </Tag>
              </Space>
              <Typography.Title level={2} style={{ margin: 0 }}>
                {product.name}
              </Typography.Title>
              <Statistic
                value={product.basePrice}
                precision={2}
                prefix="$"
                valueStyle={{ fontSize: 30, fontWeight: 700, color: "#4f46e5" }}
                className="my-4"
              />
              <Typography.Paragraph type="secondary" className="text-[15px]">
                {product.description}
              </Typography.Paragraph>
              <Divider />
              <div className="flex items-center gap-3 mb-6">
                <Typography.Text strong>Quantity</Typography.Text>
                <InputNumber
                  size="large"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={onChange}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  block
                >
                  Add to cart
                </Button>
                <Button
                  size="large"
                  icon={<StarOutlined />}
                  onClick={handleReview}
                  block
                >
                  Review
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default ProductDetailSlug;
