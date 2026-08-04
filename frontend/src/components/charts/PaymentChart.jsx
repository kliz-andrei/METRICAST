import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Cash", value: 612420 },
  { name: "Card", value: 478250 },
  { name: "GCash", value: 97540 },
  { name: "Maya", value: 60320 },
];

const COLORS = [
  "#15803D",
  "#2563EB",
  "#F59E0B",
  "#8B5CF6",
];

export default function PaymentChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>

        <Pie
          data={data}
          innerRadius={65}
          outerRadius={95}
          dataKey="value"
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={COLORS[index]}
            />
          ))}
        </Pie>

        <Tooltip />

        <Legend
          verticalAlign="bottom"
          height={36}
        />

      </PieChart>
    </ResponsiveContainer>
  );
}