import AxiosJWTInstance from "@/InstanceAxios";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { pictureUrl } from "@/lib/image";
import type { ProductProps } from "@/type";
import {
  DeleteOutlined,
  HolderOutlined,
  LoadingOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Popconfirm, Spin, Tag, Tooltip, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { MAX_IMAGE_SIZE } from "./ImagePicker";

export const MAX_PRODUCT_IMAGES = 10;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Tile = { key: string; src: string };

type Props = {
  /** Saved product: changes go straight to the API */
  product?: ProductProps;
  onProductChange?: (product: ProductProps) => void;
  /** New product: files are kept here and uploaded after it is created */
  pending?: File[];
  onPendingChange?: (files: File[]) => void;
};

/** Gallery editor: add several images, drag to reorder (first = cover), delete. */
const ProductImagesManager = ({
  product,
  onProductChange,
  pending = [],
  onPendingChange,
}: Props) => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragFrom, setDragFrom] = useState<number>();
  const [dragOver, setDragOver] = useState<number>();
  const isSaved = !!product;

  const pendingUrls = useMemo(
    () => pending.map((file) => URL.createObjectURL(file)),
    [pending]
  );
  useEffect(
    () => () => pendingUrls.forEach((url) => URL.revokeObjectURL(url)),
    [pendingUrls]
  );

  const tiles: Tile[] = isSaved
    ? (product.images ?? []).map((image) => ({
        key: image.id,
        src: pictureUrl(image.url, 160),
      }))
    : pending.map((file, index) => ({
        key: `${file.name}-${index}`,
        src: pendingUrls[index],
      }));

  const canAdd = tiles.length < MAX_PRODUCT_IMAGES;

  const validFiles = (list: FileList | null): File[] => {
    const files = Array.from(list ?? []);
    const ok = files.filter((file) => {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: please choose a JPG, PNG, WEBP or GIF image`);
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: image must be smaller than 3MB`);
        return false;
      }
      return true;
    });
    const room = MAX_PRODUCT_IMAGES - tiles.length;
    if (ok.length > room) {
      toast.warn(`Only ${room} more image(s) can be added (max ${MAX_PRODUCT_IMAGES})`);
    }
    return ok.slice(0, room);
  };

  const run = async (action: () => Promise<{ data: ProductProps }>) => {
    setBusy(true);
    try {
      const { data } = await action();
      onProductChange?.(data);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const add = (list: FileList | null) => {
    const files = validFiles(list);
    if (!files.length) return;
    if (!isSaved) {
      onPendingChange?.([...pending, ...files]);
      return;
    }
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    run(() =>
      axiosAuth.post(`/product/${product.id}/images`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  };

  const remove = (index: number) => {
    if (!isSaved) {
      onPendingChange?.(pending.filter((_, i) => i !== index));
      return;
    }
    run(() => axiosAuth.delete(`/product/${product.id}/images/${tiles[index].key}`));
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    if (!isSaved) {
      const next = [...pending];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onPendingChange?.(next);
      return;
    }
    const ids = tiles.map((t) => t.key);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    run(() =>
      axiosAuth.patch(`/product/${product.id}/images/order`, { imageIds: ids })
    );
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <Spin spinning={busy} indicator={<LoadingOutlined />}>
        <div
          className="grid grid-cols-3 gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            // Files dropped from the computer
            if (e.dataTransfer.files?.length) {
              e.preventDefault();
              add(e.dataTransfer.files);
            }
          }}
        >
          {tiles.map((tile, index) => (
            <div
              key={tile.key}
              draggable={!busy}
              onDragStart={() => setDragFrom(index)}
              onDragEnter={() => setDragOver(index)}
              onDragEnd={() => {
                if (dragFrom !== undefined && dragOver !== undefined) {
                  move(dragFrom, dragOver);
                }
                setDragFrom(undefined);
                setDragOver(undefined);
              }}
              className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-black/[0.03] ${
                dragOver === index && dragFrom !== index
                  ? "border-indigo-500 ring-2 ring-indigo-500/30"
                  : "border-black/5"
              } ${dragFrom === index ? "opacity-40" : ""}`}
            >
              <img
                src={tile.src}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              {index === 0 && (
                <Tag color="geekblue" className="!absolute left-1 top-1 !mr-0 text-[10px]">
                  Cover
                </Tag>
              )}
              <HolderOutlined className="absolute bottom-1 left-1 rounded bg-white/80 p-0.5 text-xs text-slate-600 opacity-0 group-hover:opacity-100" />
              <Popconfirm
                title="Delete this image?"
                description={isSaved ? "It is also removed from storage." : undefined}
                onConfirm={() => remove(index)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <button
                  type="button"
                  aria-label="Delete image"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-500 opacity-0 shadow transition-opacity group-hover:opacity-100"
                >
                  <DeleteOutlined className="text-xs" />
                </button>
              </Popconfirm>
            </div>
          ))}
          {canAdd && (
            <Tooltip title="JPG, PNG, WEBP or GIF · up to 3MB each">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-slate-500 transition-colors hover:border-indigo-500 hover:text-indigo-500"
              >
                <PlusOutlined />
                <span className="text-xs">Add images</span>
              </button>
            </Tooltip>
          )}
        </div>
      </Spin>
      <Typography.Text type="secondary" className="mt-2 block text-xs">
        {tiles.length}/{MAX_PRODUCT_IMAGES} · Drag to reorder, the first image is the
        cover. You can also drop files here.
      </Typography.Text>
    </div>
  );
};

export default ProductImagesManager;
