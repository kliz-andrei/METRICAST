import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Wallet,
} from "lucide-react";

import StatCard from "../../components/cards/StatCard";
import ChartCard from "../../components/cards/ChartCard";

import SalesTrendChart from "../../components/charts/SalesTrendChart";
import CategoryChart from "../../components/charts/CategoryChart";
import PaymentChart from "../../components/charts/PaymentChart";

import TopProductsTable from "../../components/tables/TopProductsTable";
import LowProductsTable from "../../components/tables/LowProductsTable";

export default function Dashboard() {
  return (
    <div className="space-y-8">

      {/* ================= KPI CARDS ================= */}

      <div className="grid grid-cols-4 gap-6">

        <StatCard
          title="Total Sales"
          value="₱1,248,530"
          change="+18.6%"
          icon={<DollarSign size={28} />}
          color="bg-green-600"
        />

        <StatCard
          title="Transactions"
          value="2,453"
          change="+12.4%"
          icon={<ShoppingCart size={28} />}
          color="bg-blue-600"
        />

        <StatCard
          title="Average Order"
          value="₱509.21"
          change="+5.7%"
          icon={<Receipt size={28} />}
          color="bg-orange-500"
        />

        <StatCard
          title="Gross Profit"
          value="₱523,841"
          change="+16.2%"
          icon={<Wallet size={28} />}
          color="bg-violet-600"
        />

      </div>

      {/* ================= SALES TREND + FORECAST ================= */}

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2">

          <ChartCard title="Sales Trend">

            <SalesTrendChart />

          </ChartCard>

        </div>

        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">

          <h2 className="text-2xl font-bold">
            Sales Forecast
          </h2>

          <h1 className="mt-4 text-5xl font-bold text-green-700">
            ₱186,750
          </h1>

          <p className="mt-2 text-gray-500">
            Expected sales for the next 7 days
          </p>

          <div className="mt-8 h-52 rounded-2xl bg-gradient-to-br from-green-50 to-white flex items-center justify-center text-gray-500">

            Forecast Chart

          </div>

        </div>

      </div>

      {/* ================= CATEGORY + PAYMENT ================= */}

      <div className="grid grid-cols-2 gap-6">

        <ChartCard title="Sales by Category">

          <CategoryChart />

        </ChartCard>

        <ChartCard title="Sales by Payment Method">

          <PaymentChart />

        </ChartCard>

      </div>

      {/* ================= PRODUCTS ================= */}

      <div className="grid grid-cols-2 gap-6">

        <TopProductsTable />

        <LowProductsTable />

      </div>

    </div>
  );
}