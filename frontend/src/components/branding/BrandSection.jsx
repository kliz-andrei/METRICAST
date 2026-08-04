import restaurantBg from "../../assets/images/restaurant-bg.jpg";
import FeatureCard from "../cards/FeatureCard";

import {
  Activity,
  TrendingUp,
  Users,
  PieChart,
} from "lucide-react";

function BrandSection() {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-cover bg-center brightness-75"
      style={{
        backgroundImage: `url(${restaurantBg})`,
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-950/90 via-green-950/80 to-black/90" />
      <div className="absolute inset-0 bg-green-900/30" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.18),transparent_65%)]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between px-10 py-10">

        {/* ================= HERO ================= */}
        <div>

          {/* Logo */}
          <h1 className="text-6xl font-black tracking-tight leading-none drop-shadow-lg">
            <span className="text-white">METRI</span>
            <span className="text-emerald-400">CAST</span>
          </h1>

          {/* Accent Line */}
          <div className="mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400" />

          {/* Heading */}
          <h2 className="mt-5 text-4xl font-extrabold leading-tight text-white">
            KPI Dashboard
            <br />
            <span className="text-emerald-400">&</span>{" "}
            Sales Forecasting
          </h2>

          {/* Description */}
          <p className="mt-5 max-w-xl text-lg leading-8 text-gray-200">
            Transform your restaurant data into actionable insights.
            Monitor performance, analyze trends, and forecast sales
            for smarter business decisions.
          </p>

        </div>

        {/* ================= FEATURES ================= */}
        <div className="grid grid-cols-2 gap-5">

          <FeatureCard
            icon={<Activity size={30} />}
            title="Business KPIs"
            description="Track essential business metrics."
          />

          <FeatureCard
            icon={<TrendingUp size={30} />}
            title="Sales Forecasting"
            description="Predict future sales trends."
          />

          <FeatureCard
            icon={<Users size={30} />}
            title="Customer Insights"
            description="Understand customer behavior."
          />

          <FeatureCard
            icon={<PieChart size={30} />}
            title="Data Analytics"
            description="Make smarter decisions."
          />

        </div>

      </div>
    </div>
  );
}

export default BrandSection;