import { Button, Result } from "antd";
import { useNavigate, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError() as any;
  const navigate = useNavigate();
  const is404 = error?.status === 404;

  return (
    <div id="error-page" className="flex min-h-[60vh] items-center justify-center p-6">
      <Result
        status={is404 ? "404" : "error"}
        title={is404 ? "Page not found" : "Something went wrong"}
        subTitle={error?.statusText || error?.message}
        extra={[
          <Button key="back" onClick={() => navigate(-1)}>
            Go back
          </Button>,
          <Button key="home" type="primary" onClick={() => navigate("/")}>
            Home
          </Button>,
        ]}
      />
    </div>
  );
}
