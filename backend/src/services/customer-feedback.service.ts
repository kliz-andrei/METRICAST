import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { AppError } from '../lib/errors.js';
import { CustomerFeedbackRepository, type FeedbackTrendGranularity } from '../repositories/customer-feedback.repository.js';

const headers = ['Date', 'Overall_Satisfaction', 'Food_Satisfaction', 'Service_Satisfaction'];
type FeedbackRow = Record<(typeof headers)[number], string>;
const parseDate = (value: string) => { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim()); if (!match) return null; const [, day, month, year] = match; const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`); return parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() === Number(month) - 1 && parsed.getUTCDate() === Number(day) ? parsed : null; };

export class CustomerFeedbackService {
  constructor(private readonly repository = new CustomerFeedbackRepository()) {}
  validate(buffer: Buffer) {
    let rows: FeedbackRow[];
    try { rows = parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true }) as FeedbackRow[]; } catch { throw new AppError(422, 'Customer Feedback CSV could not be parsed.', 'FEEDBACK_INVALID_CSV'); }
    if (!rows.length) throw new AppError(422, 'Customer Feedback CSV is empty.', 'FEEDBACK_EMPTY_FILE');
    const actualHeaders = Object.keys(rows[0] ?? {});
    const missing = headers.filter((header) => !actualHeaders.includes(header));
    if (missing.length) throw new AppError(422, `Missing required Customer Feedback column(s): ${missing.join(', ')}.`, 'FEEDBACK_MISSING_HEADERS');
    const errors = rows.flatMap((row, index) => { const result: Array<{ row: number; field: string; message: string; value: string }> = []; if (!parseDate(row.Date)) result.push({ row: index + 2, field: 'Date', message: 'Use DD/MM/YYYY.', value: row.Date }); for (const field of headers.slice(1)) { const value = row[field]; if (!/^\d+$/.test(value ?? '') || Number(value) < 1 || Number(value) > 5) result.push({ row: index + 2, field, message: 'Rating must be an integer from 1 to 5.', value }); } return result; });
    if (errors.length) { console.error('CUSTOMER FEEDBACK VALIDATION ERRORS', errors.slice(0, 30)); throw new AppError(422, `Customer Feedback validation failed with ${errors.length} error(s).`, 'FEEDBACK_VALIDATION_FAILED'); }
    const ratings = rows.map((row) => ({ feedbackDate: parseDate(row.Date)!, overallSatisfaction: Number(row.Overall_Satisfaction), foodSatisfaction: Number(row.Food_Satisfaction), serviceSatisfaction: Number(row.Service_Satisfaction) }));
    return { ratings, sampleRows: rows.slice(0, 5), totalRows: rows.length, dateRange: { start: ratings.reduce((min, row) => row.feedbackDate < min ? row.feedbackDate : min, ratings[0].feedbackDate), end: ratings.reduce((max, row) => row.feedbackDate > max ? row.feedbackDate : max, ratings[0].feedbackDate) } };
  }
  async preview(buffer: Buffer, filename: string) { const validated = this.validate(buffer); const sourceChecksum = createHash('sha256').update(buffer).digest('hex'); return { filename, sourceChecksum, ...validated, duplicate: Boolean(await this.repository.findImportByChecksum(sourceChecksum)) }; }
  async import(buffer: Buffer, filename: string, actorId: string) { const preview = await this.preview(buffer, filename); if (preview.duplicate) throw new AppError(409, 'This Customer Feedback dataset has already been imported.', 'DUPLICATE_FEEDBACK_IMPORT'); const entry = await this.repository.createImport({ sourceChecksum: preview.sourceChecksum, filename, totalRows: preview.totalRows, createdById: actorId, ratings: preview.ratings }); await this.repository.recordImportAudit(actorId, entry.id, filename, preview.totalRows); return { id: entry.id, filename, importedRows: preview.totalRows, dateRange: preview.dateRange, status: 'READY_FOR_CUSTOMER_TRENDS' }; }
  async overview() { const entry = await this.repository.overview(); if (!entry) return null; return { id: entry.id, records: entry._count.ratings, filename: entry.filename, latestImport: entry.completedAt, status: 'READY_FOR_CUSTOMER_TRENDS' }; }
  imports() { return this.repository.imports(); }
  async delete(id: string, actorId: string) { const deleted = await this.repository.deleteImport(id, actorId); if (!deleted) throw new AppError(404, 'Customer Feedback import not found.', 'NOT_FOUND'); return deleted; }
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
    const counts = new Map(result.distribution.map((row) => [row.overallSatisfaction, row._count.id]));
    const total = result.aggregate._count.id;
    const satisfiedCount = (counts.get(4) ?? 0) + (counts.get(5) ?? 0);
    const neutralCount = counts.get(3) ?? 0;
    const dissatisfiedCount = (counts.get(1) ?? 0) + (counts.get(2) ?? 0);
    const segment = (count: number) => ({ count, percent: total ? (count / total) * 100 : 0 });
    return {
      summary: { totalResponses: total, averageOverallSatisfaction: Number(result.aggregate._avg.overallSatisfaction), averageFoodSatisfaction: Number(result.aggregate._avg.foodSatisfaction), averageServiceSatisfaction: Number(result.aggregate._avg.serviceSatisfaction), satisfied: segment(satisfiedCount), neutral: segment(neutralCount), dissatisfied: segment(dissatisfiedCount), dateRange: { start: result.aggregate._min.feedbackDate, end: result.aggregate._max.feedbackDate } },
      distribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, responses: counts.get(rating) ?? 0, percent: total ? ((counts.get(rating) ?? 0) / total) * 100 : 0 })),
      trendGranularity,
      trend: trends.map((row) => ({ ...row, responses: Number(row.responses) })),
    };
  }
}
