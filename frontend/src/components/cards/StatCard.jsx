import { TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  change,
  icon,
  color = "bg-green-600",
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">

      <div className="flex justify-between items-start">

        <div>

          <p className="text-sm text-gray-500">
            {title}
          </p>

          <h2 className="text-3xl font-bold text-gray-900 mt-2">
            {value}
          </h2>

          <div className="flex items-center gap-1 mt-3 text-green-600 text-sm font-medium">

            <TrendingUp size={16} />

            {change}

          </div>

        </div>

        <div
          className={`${color} w-14 h-14 rounded-xl flex items-center justify-center text-white`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}