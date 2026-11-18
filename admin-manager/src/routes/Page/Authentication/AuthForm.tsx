import { useLocation } from "react-router-dom";
import Login from "./Login";
import Register from "./Register/Register";

const AuthForm = () => {
  const path = useLocation();
  return (
    <div className="w-full max-w-[420px]">
      {path.pathname === "/auth/register" ? <Register /> : <Login />}
    </div>
  );
};

export default AuthForm;
