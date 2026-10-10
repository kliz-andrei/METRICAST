import { Prisma } from '@prisma/client';
import { prisma } from '../database/client.js';
import {
  SalesAnalyticsRepository,
  salesWhere,
  type SalesFilter,
} from '../repositories/sales-analytics.repository.js';

export type { SalesFilter } from '../repositories/sales-analytics.repository.js';

const where = salesWhere;
const n=(v:unknown)=>Number(v??0);
export class SalesAnalyticsService {
  constructor(private readonly repository = new SalesAnalyticsRepository()) {}

  async summary(f:SalesFilter){const r=await prisma.transaction.aggregate({where:where(f),_sum:{grossSales:true,netSales:true,discountAmount:true,serviceCharge:true},_avg:{netSales:true},_count:{id:true}});return{grossSales:n(r._sum.grossSales),netSales:n(r._sum.netSales),totalDiscounts:n(r._sum.discountAmount),serviceCharges:n(r._sum.serviceCharge),averageOrderValue:n(r._avg.netSales),totalTransactions:r._count.id};}
  async channel(f:SalesFilter){return (await prisma.transaction.groupBy({by:['salesChannel'],where:where(f),_sum:{netSales:true},_count:{id:true}})).map(x=>({salesChannel:x.salesChannel,netSales:n(x._sum.netSales),transactions:x._count.id}));}
  async orderType(f:SalesFilter){return (await prisma.transaction.groupBy({by:['orderType'],where:where(f),_sum:{netSales:true},_count:{id:true}})).map(x=>({orderType:x.orderType,netSales:n(x._sum.netSales),transactions:x._count.id}));}
  async discountDistribution(f:SalesFilter){const rows=await this.repository.discountDistribution(f);const categories=new Map<string,{discountAmount:number;transactionCount:number}>();for(const row of rows){const discountType=row.discountType?.trim()||'Unclassified';const current=categories.get(discountType)??{discountAmount:0,transactionCount:0};current.discountAmount+=n(row._sum.discountAmount);current.transactionCount+=row._count.id;categories.set(discountType,current);}const totalDiscountAmount=[...categories.values()].reduce((sum,row)=>sum+row.discountAmount,0);const totalDiscountTransactions=[...categories.values()].reduce((sum,row)=>sum+row.transactionCount,0);const data=[...categories].map(([discountType,row])=>({discountType,...row,contribution:totalDiscountAmount?(row.discountAmount/totalDiscountAmount)*100:0})).sort((left,right)=>right.discountAmount-left.discountAmount);return{data,totalDiscountAmount,totalDiscountTransactions};}
  async dayOfWeek(f: SalesFilter) { const rows = await this.repository.weekdayAnalysis(f); const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; const total = rows.reduce((sum, row) => sum + n(row.totalSales), 0); return names.map((day, index) => { const row = rows.find((value) => value.weekday === index + 1); const sales = n(row?.totalSales); const transactions = n(row?.transactions); const guests = n(row?.guests); const occurrences = n(row?.occurrences); return { day, weekday: index + 1, totalSales: sales, transactions, guests, occurrences, averageSalesPerOccurrence: occurrences ? sales / occurrences : null, averageTransactionsPerOccurrence: occurrences ? transactions / occurrences : null, averageGuestsPerOccurrence: occurrences ? guests / occurrences : null, averageOrderValue: transactions ? sales / transactions : null, revenuePerGuest: guests ? sales / guests : null, contribution: total ? (sales / total) * 100 : 0 }; }); }
  async bucket(f:SalesFilter,unit:'day'|'month'|'hour'){
    if(unit==='hour'){const rows=await this.repository.hourlyBuckets(f);const byHour=new Map(rows.map(row=>[Number(row.hour),row]));return Array.from({length:24},(_,hour)=>{const row=byHour.get(hour);return{hour:String(hour).padStart(2,'0'),sales:n(row?.sales),grossSales:n(row?.grossSales),transactions:n(row?.transactions)};});}
    const rows=await prisma.$queryRaw<{bucket:string;sales:Prisma.Decimal;grossSales:Prisma.Decimal;transactions:bigint}[]>`SELECT ${unit==='month'?Prisma.sql`TO_CHAR("occurredAt" AT TIME ZONE 'Asia/Manila', 'YYYY-MM')`:Prisma.sql`TO_CHAR("occurredAt" AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`} AS bucket, SUM("netSales") AS sales, SUM("grossSales") AS "grossSales", COUNT(DISTINCT id) AS transactions FROM transactions WHERE "deletedAt" IS NULL ${f.startDate?Prisma.sql`AND "occurredAt">=${new Date(`${f.startDate}T00:00:00+08:00`)}`:Prisma.empty} ${f.endDate?Prisma.sql`AND "occurredAt"<=${new Date(`${f.endDate}T23:59:59.999+08:00`)}`:Prisma.empty} ${f.salesChannels?.length?Prisma.sql`AND "salesChannel" IN (${Prisma.join(f.salesChannels)})`:f.salesChannel?Prisma.sql`AND "salesChannel"=${f.salesChannel}`:Prisma.empty} ${f.orderType?Prisma.sql`AND "orderType"=${f.orderType}`:Prisma.empty} GROUP BY bucket ORDER BY bucket`;return rows.map(r=>({date:r.bucket,sales:n(r.sales),grossSales:n(r.grossSales),transactions:n(r.transactions)}));}
}
