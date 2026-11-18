import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import ProductForm, { ProductFormValues } from "@/components/product/ProductForm";
import { uploadProductPicture } from "@/components/product/uploadProductPicture";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { ProductProps } from "@/type";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CreateProduct = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: ProductFormValues, picture: File | null) => {
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.post<ProductProps>("/product", {
        ...values,
        description: values.description || undefined,
      });
      if (picture) {
        try {
          await uploadProductPicture(axiosAuth, data.id, picture);
        } catch (error) {
          toast.warn(
            `Product created, but the picture failed: ${apiErrorMessage(error)}`
          );
          navigate(`/product-list/edit/${data.urlName}`);
          return;
        }
      }
      toast.success(`"${data.name}" created`);
      navigate("/product-list");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet title="New product">
        <></>
      </Helmet>
      <PageHeader
        title="New product"
        description="Add a product to your catalogue."
        backTo="/product-list"
      />
      <ProductForm
        submitText="Create product"
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default CreateProduct;
