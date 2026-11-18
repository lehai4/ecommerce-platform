import { HeatMapOutlined } from "@ant-design/icons";

const Logo = ({
  collapsed = false,
  label = "CMS Admin",
  dark = true,
}: {
  collapsed?: boolean;
  label?: string;
  dark?: boolean;
}) => {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-[18px]">
        <HeatMapOutlined />
      </span>
      {!collapsed && (
        <span
          className={`truncate text-[18px] font-semibold tracking-tight ${
            dark ? "text-white" : "text-slate-900"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default Logo;
