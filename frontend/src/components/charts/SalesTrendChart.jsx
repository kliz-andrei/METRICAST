import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "May 1", sales: 32000 },
  { day: "May 3", sales: 42000 },
  { day: "May 5", sales: 28000 },
  { day: "May 7", sales: 51000 },
  { day: "May 9", sales: 39000 },
  { day: "May 11", sales: 61000 },
  { day: "May 13", sales: 47000 },
  { day: "May 15", sales: 55000 },
  { day: "May 17", sales: 42000 },
  { day: "May 19", sales: 64000 },
  { day: "May 21", sales: 52000 },
  { day: "May 23", sales: 70000 },
  { day: "May 25", sales: 61000 },
  { day: "May 27", sales: 76000 },
  { day: "May 29", sales: 68000 },
  { day: "May 31", sales: 82000 },
];

export default function SalesTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={330}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />

        <XAxis
          dataKey="day"
          tick={{ fill: "#64748B", fontSize: 12 }}
        />

        <YAxis
          tick={{ fill: "#64748B", fontSize: 12 }}
        />

        <Tooltip />

        <Line
          type="monotone"
          dataKey="sales"
          stroke="#15803D"
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}