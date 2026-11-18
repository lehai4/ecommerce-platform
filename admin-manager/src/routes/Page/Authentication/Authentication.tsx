import imgAuthen from "@/assets/image/authentication.png";
import Logo from "@/components/Logo";
import AuthForm from "./AuthForm";

const Authentication = () => {
  return (
    <div className="min-h-full grid lg:grid-cols-2 bg-white">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-12 text-white">
        <Logo label="CMS" />
        <div className="flex flex-col items-center gap-10">
          <img
            src={imgAuthen}
            alt="Management illustration"
            className="w-full max-w-[440px] drop-shadow-2xl"
          />
          <div className="text-center max-w-[420px]">
            <h2 className="text-[30px] font-semibold leading-tight">
              System Management
            </h2>
            <p className="mt-3 text-indigo-100">
              Manage products, categories and purchases in one place.
            </p>
          </div>
        </div>
        <p className="text-sm text-indigo-200">© CMS Mini Project</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-12 sm:px-8 bg-slate-50 lg:bg-white">
        <AuthForm />
      </main>
    </div>
  );
};

export default Authentication;
