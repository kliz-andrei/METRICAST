import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#FAFAF8] via-white to-green-50 p-10">

      {/* ================= Background ================= */}

      {/* Main Glow */}
      <div className="absolute -top-52 -right-52 w-[650px] h-[650px] rounded-full bg-green-200 blur-[140px] opacity-30"></div>

      <div className="absolute -bottom-52 left-0 w-[500px] h-[500px] rounded-full bg-emerald-200 blur-[130px] opacity-25"></div>

      {/* Radial Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.08),transparent_70%)]"></div>

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#14532d 1px, transparent 1px),
            linear-gradient(90deg,#14532d 1px,transparent 1px)
          `,
          backgroundSize: "42px 42px",
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 100%)",
        }}
      ></div>

      {/* Decorative Circles */}
      <div className="absolute top-24 right-24 w-24 h-24 rounded-full border border-green-200 opacity-40"></div>

      <div className="absolute bottom-24 left-16 w-16 h-16 rounded-full border border-green-300 opacity-30"></div>

      {/* Floating Dots */}
      <div className="absolute top-1/4 right-14 w-3 h-3 rounded-full bg-green-400 opacity-60"></div>

      <div className="absolute bottom-32 right-24 w-2 h-2 rounded-full bg-green-500 opacity-60"></div>

      <div className="absolute top-2/3 left-12 w-2 h-2 rounded-full bg-green-300 opacity-50"></div>

      {/* ================= Login Card ================= */}

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl border border-white/70 shadow-[0_30px_80px_rgba(0,0,0,0.15)] backdrop-blur-sm px-10 py-8">

        {/* Header */}
        <div className="text-center mb-8">

          <h1 className="text-5xl font-extrabold text-green-950">
            Welcome Back!
          </h1>

          <p className="mt-2 text-gray-500 text-lg">
            Sign in to your METRICAST account
          </p>

        </div>

        {/* Email */}

        <div className="mb-5">

          <label className="block mb-2 font-semibold text-gray-800">
            Email Address
          </label>

          <div className="flex items-center h-14 rounded-2xl border border-gray-200 px-5 transition focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100">

            <Mail
              size={20}
              className="text-gray-400 mr-4"
            />

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-transparent outline-none text-base"
            />

          </div>

        </div>

        {/* Password */}

        <div>

          <label className="block mb-2 font-semibold text-gray-800">
            Password
          </label>

          <div className="flex items-center h-14 rounded-2xl border border-gray-200 px-5 transition focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-100">

            <Lock
              size={20}
              className="text-gray-400 mr-4"
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="w-full bg-transparent outline-none text-base"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-green-700 transition"
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>

          </div>

        </div>

        {/* Remember */}

        <div className="flex items-center justify-between mt-6 mb-6">

          <label className="flex items-center gap-3">

            <input
              type="checkbox"
              className="accent-green-700"
            />

            <span className="text-base">
              Remember Me
            </span>

          </label>

          <button className="font-semibold text-green-700 hover:underline">

            Forgot Password?

          </button>

        </div>

        {/* Login */}

        <button className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-green-900 text-white font-semibold text-lg hover:bg-green-800 transition-all duration-300 hover:shadow-lg hover:shadow-green-900/30">

          <LogIn size={20} />

          Log In

        </button>

        {/* Divider */}

        <div className="flex items-center my-6">

          <div className="flex-1 border-t border-gray-300"></div>

          <span className="mx-4 text-gray-400">
            or
          </span>

          <div className="flex-1 border-t border-gray-300"></div>

        </div>

        {/* Google */}

        <button className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl border border-gray-300 font-semibold hover:bg-gray-50 transition">

          Continue with Google

        </button>

        {/* Footer */}

        <p className="text-center text-gray-500 mt-6">

          Don't have an account?{" "}

          <span className="text-green-700 font-semibold cursor-pointer hover:underline">

            Contact Administrator

          </span>

        </p>

      </div>

    </div>
  );
}

export default LoginForm;