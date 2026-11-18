import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  /** Path to go back to; `-1` goes back in history. Omit to hide the button. */
  backTo?: string | -1;
};

const PageHeader = ({ title, description, extra, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {backTo !== undefined && (
          <Button
            aria-label="Back"
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              backTo === -1 ? navigate(-1) : navigate(backTo as string)
            }
          />
        )}
        <div className="min-w-0">
          <Typography.Title level={3} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {description && (
            <Typography.Text type="secondary">{description}</Typography.Text>
          )}
        </div>
      </div>
      {extra && <div className="flex flex-wrap items-center gap-2">{extra}</div>}
    </div>
  );
};

export default PageHeader;
