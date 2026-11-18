import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CategoryForm, { CategoryFormValues } from "./CategoryForm";

const CreateCategory = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: CategoryFormValues) => {
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.post("/category", values);
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
        submitText="Create category"
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default CreateCategory;
