export default function ChartCard({
  title,
  children,
}) {
  return (
    <div className="bg-white rounded-3xl shadow-md p-6 border border-gray-100">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-xl font-bold text-slate-800">
          {title}
        </h2>

        <select className="border rounded-xl px-3 py-2 text-sm">

          <option>Daily</option>

          <option>Weekly</option>

          <option>Monthly</option>

        </select>

      </div>

      {children}

    </div>
  );
}