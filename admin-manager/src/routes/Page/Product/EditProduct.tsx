import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import ProductForm, { ProductFormValues } from "@/components/product/ProductForm";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Paginated, ProductProps, StockMovement } from "@/type";
import StockHistoryTable from "@/components/stock/StockHistoryTable";
import { Button, Card, Result, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [product, setProduct] = useState<ProductProps>();
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Last stock changes; reloads when the stock changes (Adjust)
  useEffect(() => {
    if (!product) return;
    setHistoryLoading(true);
    axiosAuth
      .get<Paginated<StockMovement>>("/stock/movements", {
        params: { productId: product.id, offset: 10 },
      })
      .then(({ data }) => setHistory(data.data))
      .catch(() => undefined)
      .finally(() => setHistoryLoading(false));
  }, [product?.id, product?.stock]);

  useEffect(() => {
    axiosAuth
      .get<ProductProps>(`/product/id/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setNotFound(true));
  }, [id]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!product) return;
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.patch<ProductProps>(
        `/product/${product.id}`,
        values
      );
      toast.success(`"${data.name}" saved`);
      navigate("/product-list");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <Result
        status="404"
        title="Product not found"
        extra={
          <Link to="/product-list">
            <Button type="primary">Back to products</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Helmet title="Edit product">
        <></>
      </Helmet>
      <PageHeader
        title="Edit product"
        description={product?.name}
        backTo="/product-list"
      />
      {product ? (
        <ProductForm
          product={product}
          submitText="Save changes"
          submitting={submitting}
          onSubmit={onSubmit}
          onProductChange={setProduct}
        />
      ) : null}
      {product ? (
        <Card
          title="Stock history"
          extra={<Link to={`/inventory?productId=${product.id}`}>See all</Link>}
          className="mt-6"
          styles={{ body: { padding: 0 } }}
        >
          <StockHistoryTable
            data={history}
            loading={historyLoading}
            hideProduct
            pagination={false}
          />
        </Card>
      ) : (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      )}
    </>
  );
};

export default EditProduct;
