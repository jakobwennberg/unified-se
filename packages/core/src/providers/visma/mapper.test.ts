import { describe, it, expect } from 'vitest';
import { mapVismaEntity } from './mapper.js';
import { getVismaConfig } from './config.js';

describe('mapVismaEntity', () => {
  describe('invoice', () => {
    const config = getVismaConfig('invoice');

    it('maps all fields correctly', () => {
      const raw = {
        Id: 'abc-123',
        InvoiceNumber: 1001,
        CustomerId: 'cust-1',
        CustomerNumber: 'C100',
        InvoiceCustomerName: 'Test AB',
        InvoiceDate: '2024-03-15',
        DueDate: '2024-04-15',
        TotalAmount: 12500,
        TotalAmountInvoiceCurrency: 12500,
        RemainingAmount: 0,
        CurrencyCode: 'SEK',
        CreatedUtc: '2024-03-15T08:00:00Z',
        ModifiedUtc: '2024-03-15T10:00:00Z',
      };

      const result = mapVismaEntity(raw, 'invoice', config);

      expect(result.external_id).toBe('1001');
      expect(result.entity_type).toBe('invoice');
      expect(result.provider).toBe('visma');
      expect(result.fiscal_year).toBe(2024);
      expect(result.document_date).toBe('2024-03-15');
      expect(result.due_date).toBe('2024-04-15');
      expect(result.counterparty_number).toBe('C100');
      expect(result.counterparty_name).toBe('Test AB');
      expect(result.amount).toBe(12500);
      expect(result.currency).toBe('SEK');
      expect(result.last_modified).toBe('2024-03-15T10:00:00Z');
      expect(result.content_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.raw_data).toEqual(raw);
    });

    it('derives status: paid (RemainingAmount = 0)', () => {
      const raw = { InvoiceNumber: 1, RemainingAmount: 0 };
      const result = mapVismaEntity(raw, 'invoice', config);
      expect(result.status).toBe('paid');
    });

    it('derives status: unpaid (RemainingAmount > 0)', () => {
      const raw = { InvoiceNumber: 1, RemainingAmount: 5000 };
      const result = mapVismaEntity(raw, 'invoice', config);
      expect(result.status).toBe('unpaid');
    });
  });

  describe('customer', () => {
    const config = getVismaConfig('customer');

    it('maps customer fields with ChangedUtc as last_modified', () => {
      const raw = {
        Id: 'cust-1',
        CustomerNumber: 'C100',
        Name: 'Acme AB',
        EmailAddress: 'info@acme.se',
        CorporateIdentityNumber: '5561234567',
        IsActive: true,
        ChangedUtc: '2024-02-01T08:00:00Z',
      };

      const result = mapVismaEntity(raw, 'customer', config);

      expect(result.external_id).toBe('C100');
      expect(result.counterparty_number).toBe('C100');
      expect(result.counterparty_name).toBe('Acme AB');
      expect(result.last_modified).toBe('2024-02-01T08:00:00Z');
      expect(result.document_date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.status).toBeNull();
    });
  });

  describe('supplier', () => {
    const config = getVismaConfig('supplier');

    it('maps supplier fields', () => {
      const raw = {
        Id: 'sup-1',
        SupplierNumber: 'S200',
        Name: 'Supplier AB',
        ModifiedUtc: '2024-05-10T12:00:00Z',
      };

      const result = mapVismaEntity(raw, 'supplier', config);

      expect(result.external_id).toBe('S200');
      expect(result.counterparty_number).toBe('S200');
      expect(result.counterparty_name).toBe('Supplier AB');
      expect(result.last_modified).toBe('2024-05-10T12:00:00Z');
    });
  });

  describe('supplier_invoice', () => {
    const config = getVismaConfig('supplier_invoice');

    it('maps supplier invoice and derives status', () => {
      const raw = {
        Id: 'si-1',
        InvoiceNumber: 5001,
        SupplierId: 'sup-1',
        SupplierName: 'Supplier AB',
        SupplierNumber: 'S200',
        InvoiceDate: '2024-05-01',
        DueDate: '2024-06-01',
        TotalAmount: 8000,
        CurrencyCode: 'EUR',
        RemainingAmount: 8000,
        ModifiedUtc: '2024-05-01T10:00:00Z',
      };

      const result = mapVismaEntity(raw, 'supplier_invoice', config);

      expect(result.external_id).toBe('5001');
      expect(result.amount).toBe(8000);
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('unpaid');
      expect(result.counterparty_name).toBe('Supplier AB');
    });
  });

  describe('order', () => {
    const config = getVismaConfig('order');

    it('maps order fields and translates status code', () => {
      const raw = {
        Id: 'ord-1',
        Number: 3001,
        CustomerId: 'cust-1',
        OrderDate: '2024-06-15',
        Amount: 15000,
        CurrencyCode: 'SEK',
        Status: 1,
        ModifiedUtc: '2024-06-15T14:00:00Z',
      };

      const result = mapVismaEntity(raw, 'order', config);

      expect(result.external_id).toBe('3001');
      expect(result.document_date).toBe('2024-06-15');
      expect(result.amount).toBe(15000);
      expect(result.status).toBe('active');
      expect(result.fiscal_year).toBe(2024);
    });

    it('handles unknown status code', () => {
      const raw = { Number: 1, Status: 99, OrderDate: '2024-01-01' };
      const result = mapVismaEntity(raw, 'order', config);
      expect(result.status).toBe('status_99');
    });
  });

  describe('company_info', () => {
    const config = getVismaConfig('company_info');

    it('maps company settings as singleton', () => {
      const raw = {
        Name: 'Test AB',
        CorporateIdentityNumber: '5561234567',
        Email: 'info@test.se',
        Phone: '08-1234567',
        Address1: 'Storgatan 1',
        City: 'Stockholm',
        CountryCode: 'SE',
      };

      const result = mapVismaEntity(raw, 'company_info', config);

      expect(result.external_id).toBe('5561234567');
      expect(result.counterparty_name).toBe('Test AB');
      expect(result.last_modified).toBeNull();
    });
  });

  describe('edge cases', () => {
    const config = getVismaConfig('invoice');

    it('extracts fiscal year from document date', () => {
      const raw = { InvoiceNumber: 1, InvoiceDate: '2023-12-31' };
      const result = mapVismaEntity(raw, 'invoice', config);
      expect(result.fiscal_year).toBe(2023);
    });

    it('handles null/missing fields gracefully', () => {
      const raw = {
        InvoiceNumber: 1,
        CustomerNumber: null,
        InvoiceDate: null,
        TotalAmount: null,
      };

      const result = mapVismaEntity(raw, 'invoice', config);
      expect(result.counterparty_number).toBeNull();
      expect(result.document_date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.fiscal_year).toBeNull();
    });

    it('defaults currency to SEK when missing', () => {
      const raw = { InvoiceNumber: 1 };
      const result = mapVismaEntity(raw, 'invoice', config);
      expect(result.currency).toBe('SEK');
    });

    it('generates consistent content hash', () => {
      const raw = { InvoiceNumber: 1, TotalAmount: 100 };
      const r1 = mapVismaEntity(raw, 'invoice', config);
      const r2 = mapVismaEntity(raw, 'invoice', config);
      expect(r1.content_hash).toBe(r2.content_hash);
      expect(r1.content_hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  it('throws for unknown entity type', () => {
    expect(() => getVismaConfig('asset' as any)).toThrow('No Visma config for entity type: asset');
  });
});
