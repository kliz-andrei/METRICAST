import { describe, expect, it, vi } from 'vitest';
import { CustomerFeedbackService } from './customer-feedback.service.js';

const valid = 'Date,Overall_Satisfaction,Food_Satisfaction,Service_Satisfaction\n05/06/2026,5,4,3\n05/06/2026,4,5,5\n';
describe('CustomerFeedbackService validation', () => {
  it('accepts independent valid feedback rows on the same date', () => expect(new CustomerFeedbackService().validate(Buffer.from(valid)).totalRows).toBe(2));
  it('rejects malformed dates', () => expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace('05/06/2026', '2026-06-05')))).toThrow('validation failed'));
  it('rejects ratings below 1 and above 5', () => { expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',0,4,3')))).toThrow('validation failed'); expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',6,4,3')))).toThrow('validation failed'); });
  it('rejects missing required headers', () => expect(() => new CustomerFeedbackService().validate(Buffer.from('Date,Overall_Satisfaction\n05/06/2026,5'))).toThrow('Missing required Customer Feedback column'));
});

describe('CustomerFeedbackService deletion', () => {
  it('delegates an import deletion and preserves its reported record count', async () => {
    const repository = { deleteImport: vi.fn(async () => ({ id: 'd3b07384-d9a5-4f9d-8b79-5ad4b7b31f50', removedRatings: 3 })) };
    const service = new CustomerFeedbackService(repository as never);
    await expect(service.delete('d3b07384-d9a5-4f9d-8b79-5ad4b7b31f50', 'actor-id')).resolves.toEqual({ id: 'd3b07384-d9a5-4f9d-8b79-5ad4b7b31f50', removedRatings: 3 });
    expect(repository.deleteImport).toHaveBeenCalledWith('d3b07384-d9a5-4f9d-8b79-5ad4b7b31f50', 'actor-id');
  });

  it('rejects a deletion for a missing feedback import', async () => {
    const service = new CustomerFeedbackService({ deleteImport: vi.fn(async () => null) } as never);
    await expect(service.delete('d3b07384-d9a5-4f9d-8b79-5ad4b7b31f50', 'actor-id')).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('delegates deleting all customer feedback only to the feedback repository operation', async () => {
    const repository = { deleteAll: vi.fn(async () => ({ removedImports: 2, removedRatings: 7 })) };
    const service = new CustomerFeedbackService(repository as never);
    await expect(service.deleteAll('actor-id')).resolves.toEqual({ removedImports: 2, removedRatings: 7 });
    expect(repository.deleteAll).toHaveBeenCalledWith('actor-id');
  });
});
