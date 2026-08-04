import BrandSection from "../../components/branding/BrandSection";
import LoginForm from "../../components/auth/LoginForm";
import "./Login.css";

function Login() {
  return (
    <div className="flex h-screen overflow-hidden">

      <div className="w-[45%]">
        <BrandSection />
      </div>

      <div className="w-[55%]">
        <LoginForm />
      </div>

    </div>
  );
}

export default Login;