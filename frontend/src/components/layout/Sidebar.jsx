import {
  LayoutDashboard,
  BarChart3,
  Package,
  Users,
  TrendingUp,
  FileText,
  Database,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    active: true,
  },
  {
    title: "Sales Analytics",
    icon: BarChart3,
  },
  {
    title: "Product Analytics",
    icon: Package,
  },
  {
    title: "Customer Analytics",
    icon: Users,
  },
  {
    title: "Sales Forecast",
    icon: TrendingUp,
  },
  {
    title: "Reports",
    icon: FileText,
  },
  {
    title: "Data Management",
    icon: Database,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

function Sidebar() {
  return (
    <aside className="w-72 bg-gradient-to-b from-[#062B1F] via-[#083624] to-[#062B1F] text-white flex flex-col shadow-2xl">

      {/* Logo */}

      <div className="flex flex-col items-center text-center px-8 pt-8">

    <img
        src="/utb-logo.png"
        alt="Under the Balete"
        className="w-24 h-24 object-contain mb-6"
    />

    <h1 className="text-4xl font-black tracking-wide">
        <span className="text-white">METRI</span>
        <span className="text-emerald-400">CAST</span>
    </h1>

    <p className="text-sm text-green-200 mt-2 leading-relaxed">
        KPI Dashboard & Sales Forecasting
    </p>

    </div>

      {/* Navigation */}

      <nav className="mt-10 flex-1 px-4">

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.title}
              className={`w-full flex items-center gap-4 rounded-xl px-5 py-4 mb-2 transition-all duration-300

              ${
                item.active
                  ? "bg-green-700 shadow-lg"
                  : "hover:bg-green-900/60"
              }`}
            >
              <Icon size={21} />

              <span className="font-medium">
                {item.title}
              </span>

            </button>
          );
        })}
      </nav>

      {/* Footer */}

      <div className="border-t border-green-800 p-5">

        <div className="flex items-center gap-3">

          <img
            src="https://i.pravatar.cc/80"
            alt="avatar"
            className="w-12 h-12 rounded-full border-2 border-green-400"
          />

          <div>

            <h3 className="font-semibold">
              Admin User
            </h3>

            <p className="text-green-300 text-sm">
              Administrator
            </p>

          </div>

        </div>

        <button className="mt-5 w-full flex items-center justify-center gap-3 rounded-xl border border-green-700 py-3 hover:bg-green-800 transition">

          <LogOut size={18} />

          Logout

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;