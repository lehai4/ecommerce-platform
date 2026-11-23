import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Category } from "@/type";
import { Button, Card, Result, Skeleton } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import CategoryForm, {
  CategoryFormValues,
  CategoryImageChange,
} from "./CategoryForm";
import { saveCategoryImage } from "./saveCategoryImage";

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

  const initialValues = useMemo<CategoryFormValues | undefined>(
    () =>
      category && {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        parentId: category.parentId ?? undefined,
      },
    [category]
  );

  const onSubmit = async (
    values: CategoryFormValues,
    image: CategoryImageChange
  ) => {
    if (!category) return;
    setSubmitting(true);
    try {
      // Only send the slug when the admin changed it
      const { slug, ...rest } = values;
      const body = slug && slug !== category.slug ? values : rest;
      const { data } = await axiosAuth.patch(`/category/${category.id}`, body);
      await saveCategoryImage(axiosAuth, category.id, image);
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
          categoryId={category.id}
          initialValues={initialValues}
          currentImage={category.image}
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
