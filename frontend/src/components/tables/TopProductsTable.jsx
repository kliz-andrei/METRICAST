const products = [
  {
    rank: 1,
    product: "Truffle Pasta",
    qty: 412,
    revenue: "₱126,420",
  },
  {
    rank: 2,
    product: "Balete Burger",
    qty: 395,
    revenue: "₱118,360",
  },
  {
    rank: 3,
    product: "Four Cheese Pizza",
    qty: 372,
    revenue: "₱109,250",
  },
  {
    rank: 4,
    product: "Chicken Alfredo",
    qty: 341,
    revenue: "₱98,620",
  },
  {
    rank: 5,
    product: "Mango Graham",
    qty: 315,
    revenue: "₱87,150",
  },
];

export default function TopProductsTable() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6">

      <h2 className="text-xl font-bold text-slate-800 mb-6">
        🏆 Top 5 Best Selling Products
      </h2>

      <table className="w-full">

        <thead>

          <tr className="border-b text-left text-gray-500">

            <th className="pb-3">Rank</th>

            <th className="pb-3">Product</th>

            <th className="pb-3">Qty</th>

            <th className="pb-3 text-right">
              Revenue
            </th>

          </tr>

        </thead>

        <tbody>

          {products.map((item) => (

            <tr
              key={item.rank}
              className="border-b last:border-none"
            >

              <td className="py-4 font-semibold">

                #{item.rank}

              </td>

              <td className="py-4">

                {item.product}

              </td>

              <td className="py-4">

                {item.qty}

              </td>

              <td className="py-4 text-right font-semibold text-green-700">

                {item.revenue}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}