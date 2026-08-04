import { ChevronDown } from "lucide-react";

export default function ProfileDropdown() {
  return (
    <button className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-100 transition">

      <img
        src="/admin.jpg"
        alt="Admin"
        className="w-10 h-10 rounded-full object-cover"
      />

      <div className="text-left">
        <p className="font-semibold text-gray-800">
          Administrator
        </p>

        <p className="text-sm text-gray-500">
          Admin
        </p>
      </div>

      <ChevronDown
        size={18}
        className="text-gray-500"
      />

    </button>
  );
}