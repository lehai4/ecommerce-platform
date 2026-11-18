import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Category } from "@/type";
import { Button, Card, Result, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CategoryForm, { CategoryFormValues } from "./CategoryForm";

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [category, setCategory] = useState<Category>();
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    axiosAuth
      .get<Category>(`/category/id/${id}`)
      .then(({ data }) => setCategory(data))
      .catch(() => setNotFound(true));
  }, [id]);

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    try {
      // Only send the slug when the admin changed it
      const body =
        values.slug && values.slug !== category?.slug
          ? values
          : { name: values.name };
      const { data } = await axiosAuth.patch(`/category/${id}`, body);
      toast.success(`"${data.name}" saved`);
      navigate("/category");
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
        title="Category not found"
        extra={
          <Link to="/category">
            <Button type="primary">Back to categories</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Helmet title="Edit category">
        <></>
      </Helmet>
      <PageHeader
        title="Edit category"
        description={category?.name}
        backTo="/category"
      />
      {category ? (
        <CategoryForm
          isEdit
          initialValues={{ name: category.name, slug: category.slug }}
          submitText="Save changes"
          submitting={submitting}
          onSubmit={onSubmit}
        />
      ) : (
        <Card className="max-w-2xl">
          <Skeleton active />
        </Card>
      )}
    </>
  );
};

export default EditCategory;
