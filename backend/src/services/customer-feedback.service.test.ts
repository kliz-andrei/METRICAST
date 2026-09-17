import { describe, expect, it } from 'vitest';
import { CustomerFeedbackService } from './customer-feedback.service.js';

const valid = 'Date,Overall_Satisfaction,Food_Satisfaction,Service_Satisfaction\n05/06/2026,5,4,3\n05/06/2026,4,5,5\n';
describe('CustomerFeedbackService validation', () => {
  it('accepts independent valid feedback rows on the same date', () => expect(new CustomerFeedbackService().validate(Buffer.from(valid)).totalRows).toBe(2));
  it('rejects malformed dates', () => expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace('05/06/2026', '2026-06-05')))).toThrow('validation failed'));
  it('rejects ratings below 1 and above 5', () => { expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',0,4,3')))).toThrow('validation failed'); expect(() => new CustomerFeedbackService().validate(Buffer.from(valid.replace(',5,4,3', ',6,4,3')))).toThrow('validation failed'); });
  it('rejects missing required headers', () => expect(() => new CustomerFeedbackService().validate(Buffer.from('Date,Overall_Satisfaction\n05/06/2026,5'))).toThrow('Missing required Customer Feedback column'));
});
