import { formatMoney } from "@/constants/order";
import { useCart } from "@/hook/useCart";
import { pictureUrl } from "@/lib/image";
import { CloseOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Badge, Button, Empty, Image, List, Popover, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartWarnings from "./CartWarnings";

/** Cart button in the storefront header */
const CartPopover = () => {
  const { cart, remove, clear, loading } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = cart?.items ?? [];

  const content =
    items.length > 0 ? (
      <div className="w-[340px] max-w-[85vw]">
        <List
          itemLayout="horizontal"
          dataSource={items}
          className="max-h-[50vh] overflow-y-auto"
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  type="text"
                  size="small"
                  aria-label={`Remove ${item.name}`}
                  icon={<CloseOutlined />}
                  disabled={loading}
                  onClick={() => remove(item.productId)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Image
                    src={pictureUrl(item.picture, 56)}
                    preview={false}
                    width={56}
                    height={56}
                    className="rounded-md object-cover"
                  />
                }
                title={
                  <Link
                    to={`/product-detail/${item.urlName}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.name}
                  </Link>
                }
                description={
                  <div className="flex flex-col">
                    <span>
                      {item.quantity} × {formatMoney(item.unitPrice)}
                    </span>
                    <CartWarnings warnings={item.warnings} />
                  </div>
                }
              />
            </List.Item>
          )}
        />
        <div className="mt-1 flex items-center justify-between border-t border-black/5 pt-3">
          <Typography.Text type="secondary">Total</Typography.Text>
          <Typography.Text strong className="text-[16px]">
            {formatMoney(cart?.total ?? 0)}
          </Typography.Text>
        </div>
        <div className="mt-3 flex gap-2">
          <Button block danger disabled={loading} onClick={clear}>
            Clear cart
          </Button>
          <Button
            block
            type="primary"
            onClick={() => {
              setOpen(false);
              navigate("/checkout");
            }}
          >
            Checkout
          </Button>
        </div>
      </div>
    ) : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Your cart is empty"
        className="w-[240px]"
      />
    );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      title="Shopping cart"
      content={content}
    >
      <Badge count={cart?.itemCount ?? 0} size="small">
        <Button
          type="text"
          aria-label="Cart"
          icon={<ShoppingCartOutlined className="text-[18px]" />}
        />
      </Badge>
    </Popover>
  );
};

export default CartPopover;
