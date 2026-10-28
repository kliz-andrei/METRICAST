import { describe, expect, it, vi } from 'vitest';
import { CustomerFeedbackService } from './customer-feedback.service.js';

const valid = 'Date,Overall_Satisfaction,Food_Satisfaction,Service_Satisfaction\n05/06/2026,5,4,3\n05/06/2026,4,5,5\n';
describe('CustomerFeedbackService validation', () => {
  it('accepts independent valid feedback rows on the same date', () => expect(new CustomerFeedbackService().validate(Buffer.from(valid)).totalRows).toBe(2));
  it('accepts a consistent MM/DD/YYYY feedback file', () => expect(new CustomerFeedbackService().validate(Buffer.from(valid.replaceAll('05/06/2026', '06/13/2026'))).totalRows).toBe(2));
  it('rejects malformed dates', () => expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace('05/06/2026', '2026-06-05')))).toThrow('validation failed'));
  it('rejects mixed date formats with the failing row and field in the message', () => expect(() => new CustomerFeedbackService().validate(Buffer.from('Date,Overall_Satisfaction,Food_Satisfaction,Service_Satisfaction\n13/06/2026,5,4,3\n06/13/2026,4,5,5\n'))).toThrow('row 2, Date'));
  it('rejects ratings below 1 and above 5', () => { expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',0,4,3')))).toThrow('validation failed'); expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',6,4,3')))).toThrow('validation failed'); });
  it('rejects missing required headers', () => expect(() => new CustomerFeedbackService().validate(Buffer.from('Date,Overall_Satisfaction\n05/06/2026,5'))).toThrow('Missing required Customer Feedback column'));
});

describe('CustomerFeedbackService status and duplicate feedback imports', () => {
  it('returns an empty status when no feedback import exists', async () => {
    const service = new CustomerFeedbackService({ overview: vi.fn(async () => null) } as never);
    await expect(service.overview()).resolves.toBeNull();
  });

  it('rejects a duplicate feedback file before creating ratings', async () => {
    const repository = { findImportByChecksum: vi.fn(async () => ({ id: 'existing-import' })) };
    const service = new CustomerFeedbackService(repository as never);
    await expect(service.import(Buffer.from(valid), 'Customer Feedback.csv', 'actor-id')).rejects.toMatchObject({ statusCode: 409, code: 'DUPLICATE_FEEDBACK_IMPORT' });
  });
});

describe('CustomerFeedbackService category analytics', () => {
  it('returns separate averages, response counts, and rating distributions for every survey question', async () => {
    const date = new Date('2026-06-05T00:00:00.000Z');
    const repository = {
      summary: vi.fn(async () => ({
        aggregate: {
          _count: { id: 3 },
          _avg: { overallSatisfaction: 4, foodSatisfaction: 14 / 3, serviceSatisfaction: 3 },
          _min: { feedbackDate: date },
          _max: { feedbackDate: date },
        },
        distributions: {
          overall: [{ rating: 3, responses: 1 }, { rating: 4, responses: 1 }, { rating: 5, responses: 1 }],
          food: [{ rating: 4, responses: 1 }, { rating: 5, responses: 2 }],
          service: [{ rating: 1, responses: 1 }, { rating: 3, responses: 2 }],
        },
      })),
      trend: vi.fn(async () => [{ date: '2026-06-05', overall: 4, food: 14 / 3, service: 3, responses: BigInt(3) }]),
    };
    const result = await new CustomerFeedbackService(repository as never).analytics('2026-06-01', '2026-06-30');

    expect(result?.summary.totalResponses).toBe(3);
    expect(result?.categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'overall', average: 4, validResponses: 3 }),
      expect.objectContaining({ key: 'food', average: 14 / 3, validResponses: 3 }),
      expect.objectContaining({ key: 'service', average: 3, validResponses: 3 }),
    ]));
    const foodFive = result?.categories.find((category) => category.key === 'food')?.distribution.find((row) => row.rating === 5);
    expect(foodFive?.responses).toBe(2);
    expect(foodFive?.percent).toBeCloseTo(200 / 3, 10);
    expect(result?.highestRatedCategory).toBe('food');
    expect(result?.lowestRatedCategory).toBe('service');
  });
});
