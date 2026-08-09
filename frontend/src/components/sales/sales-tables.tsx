import { useQuery } from '@tanstack/react-query';
import { useSalesFilters } from '../../contexts/sales-filters-context';
import { useDailySales } from '../../hooks/use-sales-analytics';
import { api } from '../../services/api-client';
import { EmptyState, ErrorState, LoadingSkeleton } from '../ui/states';

type Transaction = {
  id: string;
  invoiceNo: string;
  occurredAt: string;
  netSales: string | number;
};

type TransactionResponse = {
  transactions: Transaction[];
};

const money = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function SalesDays({ lowest = false }: { lowest?: boolean }) {
  const { filters } = useSalesFilters();
  const query = useDailySales(filters);
  const rows = [...(query.data ?? [])]
    .sort((left, right) => lowest ? left.sales - right.sales : right.sales - left.sales)
    .slice(0, 10);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <h3 className="mb-3 font-semibold">{lowest ? 'Lowest Sales Days' : 'Top Sales Days'}</h3>
      {query.isLoading ? <LoadingSkeleton className="h-48" /> : query.isError ? <ErrorState message="Unable to load sales days." /> : rows.length ? <table className="w-full text-sm"><tbody>{rows.map((row) => <tr key={row.date} className="border-t"><td className="py-2">{row.date}</td><td>{row.transactions} transactions</td><td className="text-right">{money(row.sales)}</td></tr>)}</tbody></table> : <EmptyState title="No sales data available for the selected filters." />}
    </div>
  );
}

export function SalesTables() {
  const { filters } = useSalesFilters();
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'sales-analytics', filters, 1],
    queryFn: async () => (await api.get<{ data: TransactionResponse }>('/transactions', {
      params: {
        page: 1,
        pageSize: 20,
        sortBy: 'netSales',
        sortOrder: 'desc',
        startDate: filters.startDate,
        endDate: filters.endDate,
        salesChannel: filters.salesChannel,
        salesChannels: filters.salesChannels?.length ? filters.salesChannels.join(',') : undefined,
        orderType: filters.orderType,
      },
    })).data.data,
  });
  const transactions = transactionsQuery.data?.transactions ?? [];

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SalesDays />
      <SalesDays lowest />
      <div className="rounded-2xl border bg-white p-5 xl:col-span-2">
        <h3 className="mb-3 font-semibold">Top 20 Transactions by Net Sales</h3>
        {transactionsQuery.isLoading ? <LoadingSkeleton className="h-48" /> : transactionsQuery.isError ? <ErrorState message="Unable to load transactions." /> : transactions.length ? <table className="w-full text-sm"><thead><tr><th className="text-left">Invoice</th><th className="text-left">Date</th><th className="text-right">Net Sales</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-t"><td className="py-2">{transaction.invoiceNo}</td><td>{new Date(transaction.occurredAt).toLocaleDateString()}</td><td className="text-right">{money(Number(transaction.netSales))}</td></tr>)}</tbody></table> : <EmptyState title="No transactions available for the selected filters." />}
      </div>
    </div>
  );
}
