import { ConfigProvider, theme } from "antd";

export const BRAND = {
  primary: "#4f46e5",
  siderBg: "#0f172a",
  siderItemHover: "#1e293b",
};

const ConfigProviderTheme = ({
  children,
  config,
  role,
}: {
  children: React.ReactNode;
  config: string;
  role: string;
}) => {
  const isDark = role === "ADMIN" && config === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: BRAND.primary,
          colorInfo: BRAND.primary,
          borderRadius: 8,
          borderRadiusLG: 12,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorBgLayout: isDark ? "#0b0f19" : "#f5f6fa",
        },
        components: {
          Layout: {
            siderBg: BRAND.siderBg,
            headerHeight: 64,
            headerPadding: "0 24px",
          },
          Menu: {
            darkItemBg: BRAND.siderBg,
            darkSubMenuItemBg: BRAND.siderBg,
            darkItemSelectedBg: BRAND.primary,
            darkItemHoverBg: BRAND.siderItemHover,
            itemHeight: 44,
            itemMarginInline: 12,
            itemBorderRadius: 8,
          },
          Card: {
            paddingLG: 24,
          },
          Table: {
            headerBorderRadius: 8,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default ConfigProviderTheme;
