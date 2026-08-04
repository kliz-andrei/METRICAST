const products = [
  {
    rank: 1,
    product: "Caesar Salad",
    qty: 18,
    revenue: "₱5,430",
  },
  {
    rank: 2,
    product: "Iced Americano",
    qty: 21,
    revenue: "₱6,120",
  },
  {
    rank: 3,
    product: "Beef Salpicao",
    qty: 27,
    revenue: "₱8,450",
  },
  {
    rank: 4,
    product: "Carbonara",
    qty: 31,
    revenue: "₱9,130",
  },
  {
    rank: 5,
    product: "Grilled Liempo",
    qty: 39,
    revenue: "₱10,480",
  },
];

export default function LowProductsTable() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6">

      <h2 className="text-xl font-bold text-slate-800 mb-6">
        📉 Low Performing Products
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

              <td className="py-4 text-right font-semibold text-red-600">

                {item.revenue}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}