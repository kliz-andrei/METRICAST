import { ReportsRepository } from '../repositories/reports.repository.js';

export class ReportsService {
  constructor(private readonly repository = new ReportsRepository()) {}

  async metadata() {
    const { range, channels, orderTypes, categories } = await this.repository.metadata();
    return {
      availableDateRange: {
        startDate: range._min.occurredAt?.toISOString().slice(0, 10) ?? null,
        endDate: range._max.occurredAt?.toISOString().slice(0, 10) ?? null
      },
      salesChannels: channels.map(({ salesChannel }) => salesChannel),
      orderTypes: orderTypes.map(({ orderType }) => orderType),
      categories
    };
  }
}
