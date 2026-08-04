import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Food", value: 812345 },
  { name: "Beverages", value: 236780 },
  { name: "Alcohol", value: 156420 },
  { name: "Desserts", value: 42985 },
];

const COLORS = [
  "#15803D",
  "#2563EB",
  "#F59E0B",
  "#8B5CF6",
];

export default function CategoryChart() {
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