import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import ProductForm, { ProductFormValues } from "@/components/product/ProductForm";
import { uploadProductPicture } from "@/components/product/uploadProductPicture";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { ProductProps } from "@/type";
import { Button, Card, Result, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const EditProduct = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [product, setProduct] = useState<ProductProps>();
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosAuth
      .get<ProductProps>(`/product/${name}`)
      .then(({ data }) => setProduct(data))
      .catch(() => setNotFound(true));
  }, [name]);

  const onSubmit = async (values: ProductFormValues, picture: File | null) => {
    if (!product) return;
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.patch<ProductProps>(
        `/product/${product.id}`,
        values
      );
      if (picture) {
        await uploadProductPicture(axiosAuth, product.id, picture);
      }
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
        />
      ) : (
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      )}
    </>
  );
};

export default EditProduct;
