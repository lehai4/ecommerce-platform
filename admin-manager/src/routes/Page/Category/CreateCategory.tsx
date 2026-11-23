import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import CategoryForm, {
  CategoryFormValues,
  CategoryImageChange,
} from "./CategoryForm";
import { saveCategoryImage } from "./saveCategoryImage";

const CreateCategory = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [submitting, setSubmitting] = useState(false);

  // "Add sub-category" in the list pre-selects the parent
  const initialValues = useMemo<CategoryFormValues>(
    () => ({ name: "", parentId: params.get("parentId") || undefined }),
    [params]
  );

  const onSubmit = async (
    values: CategoryFormValues,
    image: CategoryImageChange
  ) => {
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.post("/category", values);
      try {
        await saveCategoryImage(axiosAuth, data.id, image);
      } catch (error) {
        toast.warn(`Category created, but the image failed: ${apiErrorMessage(error)}`);
        navigate(`/category/edit/${data.id}`);
        return;
      }
      toast.success(`"${data.name}" created`);
      navigate("/category");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet title="New category">
        <></>
      </Helmet>
      <PageHeader
        title="New category"
        description="Add a category to group your products."
        backTo="/category"
      />
      <CategoryForm
        initialValues={initialValues}
        submitText="Create category"
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default CreateCategory;
