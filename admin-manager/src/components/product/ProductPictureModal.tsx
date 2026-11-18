import AxiosJWTInstance from "@/InstanceAxios";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import type { ProductProps } from "@/type";
import { Modal } from "antd";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ImagePicker from "./ImagePicker";
import { uploadProductPicture } from "./uploadProductPicture";

type Props = {
  product?: ProductProps;
  onClose: () => void;
  onUploaded: (product: ProductProps) => void;
};

/** Quick picture change from the product list */
const ProductPictureModal = ({ product, onClose, onUploaded }: Props) => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setFile(null), [product?.id]);

  const onOk = async () => {
    if (!product || !file) return;
    setSaving(true);
    try {
      const updated = await uploadProductPicture(axiosAuth, product.id, file);
      onUploaded(updated);
      toast.success("Picture updated");
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={product ? `Picture · ${product.name}` : "Picture"}
      open={!!product}
      onCancel={onClose}
      onOk={onOk}
      okText="Upload"
      okButtonProps={{ disabled: !file, loading: saving }}
      destroyOnClose
    >
      <ImagePicker
        value={file}
        currentUrl={product?.picture ? pictureUrl(product.picture, 400) : undefined}
        onChange={setFile}
        height={260}
      />
    </Modal>
  );
};

export default ProductPictureModal;
