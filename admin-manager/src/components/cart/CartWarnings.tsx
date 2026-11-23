import { formatMoney } from "@/constants/order";
import type { CartWarning } from "@/type";
import { Typography } from "antd";

const text = (w: CartWarning) => {
  switch (w.type) {
    case "UNAVAILABLE":
      return "No longer sold, remove it to continue";
    case "OUT_OF_STOCK":
      return "Out of stock, remove it to continue";
    case "NOT_ENOUGH_STOCK":
      return `Only ${w.available} left, lower the quantity`;
    case "PRICE_CHANGED":
      return `Price changed from ${formatMoney(w.previousPrice)} to ${formatMoney(
        w.currentPrice
      )}`;
  }
};

/** One line per cart warning; price changes are a note, the rest block checkout */
const CartWarnings = ({ warnings }: { warnings: CartWarning[] }) => (
  <>
    {warnings.map((w) => (
      <Typography.Text
        key={w.type}
        type={w.type === "PRICE_CHANGED" ? "warning" : "danger"}
        className="block text-xs"
      >
        {text(w)}
      </Typography.Text>
    ))}
  </>
);

export default CartWarnings;
