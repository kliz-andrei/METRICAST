import { api } from './api-client';
export type SalesFilters={startDate?:string;endDate?:string;salesChannel?:string;orderType?:string};
export type SalesSummary={grossSales:number;netSales:number;totalDiscounts:number;serviceCharges:number;averageOrderValue:number;totalTransactions:number};
export type SalesBucket={date?:string;hour?:string;sales:number;transactions:number};
export type SalesDistribution={salesChannel?:string;orderType?:string;netSales:number;transactions:number};
const query=(filters:SalesFilters)=>Object.fromEntries(Object.entries(filters).filter(([,value])=>value));
const get=<T>(path:string,filters:SalesFilters)=>api.get<{data:T}>(path,{params:query(filters)}).then(response=>response.data.data);
export const salesAnalyticsApi={summary:(f:SalesFilters)=>get<SalesSummary>('/sales/summary',f),daily:(f:SalesFilters)=>get<SalesBucket[]>('/sales/daily',f),monthly:(f:SalesFilters)=>get<SalesBucket[]>('/sales/monthly',f),hourly:(f:SalesFilters)=>get<SalesBucket[]>('/sales/hourly',f),channel:(f:SalesFilters)=>get<SalesDistribution[]>('/sales/channel',f),orderType:(f:SalesFilters)=>get<SalesDistribution[]>('/sales/order-type',f)};
