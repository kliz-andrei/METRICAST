import { Bell } from "lucide-react";

export default function NotificationBell() {
  return (
    <button className="relative p-2 rounded-xl hover:bg-gray-100 transition">
      <Bell size={22} className="text-gray-600" />

      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
        3
      </span>
    </button>
  );
}