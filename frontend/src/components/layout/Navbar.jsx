import {
  CalendarDays,
  Menu
} from "lucide-react";

import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
  return (
    <header className="h-24 bg-white border-b border-gray-200 flex items-center justify-between px-8">

      {/* Left */}
      <div className="flex items-center gap-5">

        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Menu size={24} />
        </button>

        <div>

          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="text-gray-500">
            Welcome back! Here's your restaurant performance overview.
          </p>

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-4">

        <button className="flex items-center gap-2 border rounded-xl px-4 py-2 hover:bg-gray-50">

          <CalendarDays size={18} />

          <span>
            May 2026
          </span>

        </button>

        <NotificationBell />

        <ProfileDropdown />

      </div>

    </header>
  );
}