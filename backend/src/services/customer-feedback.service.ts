import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { AppError } from '../lib/errors.js';
import { CustomerFeedbackRepository, type FeedbackDimension, type FeedbackTrendGranularity } from '../repositories/customer-feedback.repository.js';

const headers = ['Date', 'Overall_Satisfaction', 'Food_Satisfaction', 'Service_Satisfaction'];
type FeedbackRow = Record<(typeof headers)[number], string>;
type FeedbackDateFormat = 'DMY' | 'MDY';
const parseDate = (value: string, format: FeedbackDateFormat) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, first, second, year] = match;
  const [day, month] = format === 'DMY' ? [first, second] : [second, first];
  const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() === Number(month) - 1 && parsed.getUTCDate() === Number(day) ? parsed : null;
};
const detectDateFormat = (rows: FeedbackRow[]): FeedbackDateFormat | null => {
  const values = rows.map((row) => row.Date ?? '');
  const dmy = values.every((value) => Boolean(parseDate(value, 'DMY')));
  const mdy = values.every((value) => Boolean(parseDate(value, 'MDY')));
  if (dmy) return 'DMY';
  if (mdy) return 'MDY';
  return null;
};

export class CustomerFeedbackService {
  constructor(private readonly repository = new CustomerFeedbackRepository()) {}
  validate(buffer: Buffer) {
    let rows: FeedbackRow[];
    try { rows = parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true }) as FeedbackRow[]; } catch { throw new AppError(422, 'Customer Feedback CSV could not be parsed.', 'FEEDBACK_INVALID_CSV'); }
    if (!rows.length) throw new AppError(422, 'Customer Feedback CSV is empty.', 'FEEDBACK_EMPTY_FILE');
    const actualHeaders = Object.keys(rows[0] ?? {});
    const missing = headers.filter((header) => !actualHeaders.includes(header));
    if (missing.length) throw new AppError(422, `Missing required Customer Feedback column(s): ${missing.join(', ')}. Required columns are Date, Overall_Satisfaction, Food_Satisfaction, and Service_Satisfaction.`, 'FEEDBACK_MISSING_HEADERS');
    const dateFormat = detectDateFormat(rows);
    const errors = rows.flatMap((row, index) => { const result: Array<{ row: number; field: string; message: string; value: string }> = []; if (!dateFormat || !parseDate(row.Date, dateFormat)) result.push({ row: index + 2, field: 'Date', message: 'Use one consistent DD/MM/YYYY or MM/DD/YYYY format.', value: row.Date }); for (const field of headers.slice(1)) { const value = row[field]; if (!/^\d+$/.test(value ?? '') || Number(value) < 1 || Number(value) > 5) result.push({ row: index + 2, field, message: 'Rating must be an integer from 1 to 5.', value }); } return result; });
    if (errors.length) { const first = errors[0]; throw new AppError(422, `Customer Feedback validation failed at row ${first.row}, ${first.field}: ${first.message} Received “${first.value}”. ${errors.length} error${errors.length === 1 ? '' : 's'} found.`, 'FEEDBACK_VALIDATION_FAILED'); }
    const ratings = rows.map((row) => ({ feedbackDate: parseDate(row.Date, dateFormat!)!, overallSatisfaction: Number(row.Overall_Satisfaction), foodSatisfaction: Number(row.Food_Satisfaction), serviceSatisfaction: Number(row.Service_Satisfaction) }));
    return { ratings, sampleRows: rows.slice(0, 5), totalRows: rows.length, dateRange: { start: ratings.reduce((min, row) => row.feedbackDate < min ? row.feedbackDate : min, ratings[0].feedbackDate), end: ratings.reduce((max, row) => row.feedbackDate > max ? row.feedbackDate : max, ratings[0].feedbackDate) } };
  }
  async preview(buffer: Buffer, filename: string) { const validated = this.validate(buffer); const sourceChecksum = createHash('sha256').update(buffer).digest('hex'); return { filename, sourceChecksum, ...validated, duplicate: Boolean(await this.repository.findImportByChecksum(sourceChecksum)) }; }
  async import(buffer: Buffer, filename: string, actorId: string) { const preview = await this.preview(buffer, filename); if (preview.duplicate) throw new AppError(409, 'This Customer Feedback dataset has already been imported.', 'DUPLICATE_FEEDBACK_IMPORT'); const entry = await this.repository.createImport({ sourceChecksum: preview.sourceChecksum, filename, totalRows: preview.totalRows, createdById: actorId, ratings: preview.ratings }); await this.repository.recordImportAudit(actorId, entry.id, filename, preview.totalRows); return { id: entry.id, filename, importedRows: preview.totalRows, dateRange: preview.dateRange, status: 'READY_FOR_CUSTOMER_TRENDS' }; }
  async overview() { const entry = await this.repository.overview(); if (!entry) return null; return { id: entry.id, records: entry.records, filename: entry.filename, latestImport: entry.completedAt, status: 'READY_FOR_CUSTOMER_TRENDS' }; }
  imports() { return this.repository.imports(); }
  async analytics(startDate?: string, endDate?: string) {
    const parse = (value: string | undefined, end = false) => value ? new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}+08:00`) : undefined;
    const start = parse(startDate);
    const end = parse(endDate, true);
    const result = await this.repository.summary(start, end);
    if (!result.aggregate._count.id) return null;

    const rangeStart = start ?? result.aggregate._min.feedbackDate!;
    const rangeEnd = end ?? result.aggregate._max.feedbackDate!;
    const rangeDays = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1;
    const trendGranularity: FeedbackTrendGranularity = rangeDays <= 31 ? 'daily' : rangeDays <= 180 ? 'weekly' : 'monthly';
    const trends = await this.repository.trend(start, end, trendGranularity);
    const total = result.aggregate._count.id;
    const averages: Record<FeedbackDimension, number | null> = {
      overall: result.aggregate._avg.overallSatisfaction === null ? null : Number(result.aggregate._avg.overallSatisfaction),
      food: result.aggregate._avg.foodSatisfaction === null ? null : Number(result.aggregate._avg.foodSatisfaction),
      service: result.aggregate._avg.serviceSatisfaction === null ? null : Number(result.aggregate._avg.serviceSatisfaction),
    };
    const categories = (Object.keys(result.distributions) as FeedbackDimension[]).map((key) => {
      const counts = new Map(result.distributions[key].map((row) => [row.rating, row.responses]));
      const validResponses = [...counts.values()].reduce((sum, count) => sum + count, 0);
      const distribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        responses: counts.get(rating) ?? 0,
        percent: validResponses ? ((counts.get(rating) ?? 0) / validResponses) * 100 : 0,
      }));
      return { key, average: averages[key], validResponses, distribution };
    });
    const rankedCategories = categories.filter((category) => category.average !== null && category.validResponses > 0)
      .sort((left, right) => right.average! - left.average!);
    return {
      summary: { totalResponses: total, dateRange: { start: result.aggregate._min.feedbackDate, end: result.aggregate._max.feedbackDate } },
      categories,
      highestRatedCategory: rankedCategories[0]?.key ?? null,
      lowestRatedCategory: rankedCategories.at(-1)?.key ?? null,
      trendGranularity,
      trend: trends.map((row) => ({ ...row, responses: Number(row.responses) })),
    };
  }
}
