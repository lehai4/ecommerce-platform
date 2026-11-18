import { CloudUploadOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";

export const MAX_IMAGE_SIZE = 3 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type ImagePickerProps = {
  /** Newly chosen file (not uploaded yet) */
  value?: File | null;
  /** Picture already saved on the product */
  currentUrl?: string;
  onChange: (file: File | null) => void;
  height?: number;
};

/** Pick an image with preview. Uploading is done by the caller. */
const ImagePicker = ({ value, currentUrl, onChange, height = 220 }: ImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : undefined),
    [value]
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const shown = previewUrl ?? currentUrl;

  const pick = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Please choose a JPG, PNG, WEBP or GIF image");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be smaller than 3MB");
      return;
    }
    onChange(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {shown ? (
        <div className="flex flex-col gap-3">
          <div
            className="overflow-hidden rounded-xl border border-black/5 bg-black/[0.03]"
            style={{ height }}
          >
            <img src={shown} alt="Product" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<SwapOutlined />} onClick={() => inputRef.current?.click()}>
              {value ? "Choose another" : "Change image"}
            </Button>
            {value && (
              <Button danger icon={<DeleteOutlined />} onClick={() => onChange(null)}>
                {currentUrl ? "Keep current image" : "Remove"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 text-center transition-colors hover:border-indigo-500"
          style={{ height }}
        >
          <CloudUploadOutlined className="text-[34px] text-indigo-500" />
          <Typography.Text strong>Click or drop an image here</Typography.Text>
          <Typography.Text type="secondary">JPG, PNG, WEBP or GIF · up to 3MB</Typography.Text>
        </button>
      )}
    </div>
  );
};

export default ImagePicker;
