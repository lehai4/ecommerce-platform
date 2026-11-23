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
  Rate,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCart } from "@/hook/useCart";
import ProductReviews from "@/components/review/ProductReviews";


const ProductDetailSlug = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { add, loading: cartLoading } = useCart();
  const [product, setProduct] = useState<ProductProps>();
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState(0);
  const gallery = (product?.images ?? []).map((image) => image.url);

  const onChange = (value: number | null) => {
    setQuantity(value as number);
  };
  const handleAddToCart = async () => {
    if (!product) return;
    if (await add(product.id, quantity || 1)) {
      toast.success("Added to cart");
    }
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
  }, [params.name]);
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
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl bg-slate-50">
                <Image.PreviewGroup
                  items={(gallery.length ? gallery : [product.picture]).map((url) =>
                    pictureUrl(url)
                  )}
                >
                  <Image
                    width="100%"
                    src={pictureUrl(gallery[activeImage] ?? product.picture, 600)}
                    alt={product.name}
                    className="aspect-square object-cover"
                  />
                </Image.PreviewGroup>
              </div>
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                        index === activeImage
                          ? "border-indigo-500"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Show image ${index + 1}`}
                    >
                      <img
                        src={pictureUrl(url, 64)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
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
              {!!product.ratingCount && (
                <a href="#reviews" className="mt-2 flex items-center gap-2">
                  <Rate disabled allowHalf value={product.ratingAverage} className="!text-sm" />
                  <Typography.Text type="secondary">
                    {product.ratingAverage?.toFixed(1)} · {product.ratingCount} review
                    {product.ratingCount === 1 ? "" : "s"}
                  </Typography.Text>
                </a>
              )}
              <Statistic
                value={product.salePrice ?? product.basePrice}
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
                  max={Math.max(1, Math.min(100, product.stock))}
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
                  loading={cartLoading}
                  disabled={!inStock}
                  block
                >
                  Add to cart
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      {product && (
        <div id="reviews">
          <ProductReviews productId={product.id} />
        </div>
      )}
    </>
  );
};

export default ProductDetailSlug;
