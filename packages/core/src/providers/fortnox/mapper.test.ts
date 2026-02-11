import { describe, it, expect } from 'vitest';
import { mapFortnoxEntity } from './mapper.js';
import { getFortnoxConfig } from './config.js';

describe('mapFortnoxEntity', () => {
  describe('invoice', () => {
    const config = getFortnoxConfig('invoice');

    it('maps all fields correctly', () => {
      const raw = {
        DocumentNumber: '1001',
        CustomerNumber: 'C100',
        CustomerName: 'Test AB',
        InvoiceDate: '2024-03-15',
        DueDate: '2024-04-15',
        Total: 12500,
        Currency: 'SEK',
        Cancelled: false,
        Booked: true,
        Sent: true,
        Balance: 0,
        '@LastModified': '2024-03-15T10:00:00Z',
      };

      const result = mapFortnoxEntity(raw, 'invoice', config);

      expect(result.external_id).toBe('1001');
      expect(result.entity_type).toBe('invoice');
      expect(result.provider).toBe('fortnox');
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

    it('derives status: cancelled', () => {
      const raw = { DocumentNumber: '1', Cancelled: true, Booked: false, Sent: false, Balance: 5000 };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.status).toBe('cancelled');
    });

    it('derives status: paid (Balance = 0, Booked)', () => {
      const raw = { DocumentNumber: '1', Cancelled: false, Booked: true, Sent: true, Balance: 0 };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.status).toBe('paid');
    });

    it('derives status: booked', () => {
      const raw = { DocumentNumber: '1', Cancelled: false, Booked: true, Sent: false, Balance: 5000 };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.status).toBe('booked');
    });

    it('derives status: sent', () => {
      const raw = { DocumentNumber: '1', Cancelled: false, Booked: false, Sent: true, Balance: 5000 };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.status).toBe('sent');
    });

    it('derives status: draft', () => {
      const raw = { DocumentNumber: '1', Cancelled: false, Booked: false, Sent: false, Balance: 5000 };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.status).toBe('draft');
    });
  });

  describe('customer', () => {
    const config = getFortnoxConfig('customer');

    it('maps customer fields', () => {
      const raw = {
        CustomerNumber: 'C100',
        Name: 'Acme AB',
        Email: 'info@acme.se',
        OrganisationNumber: '5561234567',
        '@LastModified': '2024-02-01T08:00:00Z',
      };

      const result = mapFortnoxEntity(raw, 'customer', config);

      expect(result.external_id).toBe('C100');
      expect(result.counterparty_number).toBe('C100');
      expect(result.counterparty_name).toBe('Acme AB');
      expect(result.document_date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.status).toBeNull();
    });
  });

  describe('supplier', () => {
    const config = getFortnoxConfig('supplier');

    it('maps supplier fields', () => {
      const raw = { SupplierNumber: 'S200', Name: 'Supplier AB' };
      const result = mapFortnoxEntity(raw, 'supplier', config);

      expect(result.external_id).toBe('S200');
      expect(result.counterparty_number).toBe('S200');
      expect(result.counterparty_name).toBe('Supplier AB');
    });
  });

  describe('supplier_invoice', () => {
    const config = getFortnoxConfig('supplier_invoice');

    it('maps supplier invoice and derives status', () => {
      const raw = {
        GivenNumber: '5001',
        SupplierNumber: 'S200',
        SupplierName: 'Supplier AB',
        InvoiceDate: '2024-05-01',
        DueDate: '2024-06-01',
        Total: 8000,
        Currency: 'EUR',
        Cancelled: false,
        Booked: true,
        Balance: 8000,
      };

      const result = mapFortnoxEntity(raw, 'supplier_invoice', config);

      expect(result.external_id).toBe('5001');
      expect(result.amount).toBe(8000);
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('booked');
    });
  });

  describe('invoice_payment', () => {
    const config = getFortnoxConfig('invoice_payment');

    it('maps payment fields', () => {
      const raw = {
        Number: '10',
        InvoiceNumber: '1001',
        Amount: 12500,
        PaymentDate: '2024-04-01',
        Currency: 'SEK',
      };

      const result = mapFortnoxEntity(raw, 'invoice_payment', config);
      expect(result.external_id).toBe('10');
      expect(result.amount).toBe(12500);
      expect(result.document_date).toBe('2024-04-01');
    });
  });

  describe('employee', () => {
    const config = getFortnoxConfig('employee');

    it('maps employee fields', () => {
      const raw = { EmployeeId: 'E001', FullName: 'Anna Svensson' };
      const result = mapFortnoxEntity(raw, 'employee', config);

      expect(result.external_id).toBe('E001');
      expect(result.counterparty_name).toBe('Anna Svensson');
    });
  });

  describe('asset', () => {
    const config = getFortnoxConfig('asset');

    it('maps asset fields', () => {
      const raw = {
        Number: 'A001',
        Description: 'Office Furniture',
        AcquisitionValue: 25000,
        AcquisitionDate: '2023-06-15',
      };

      const result = mapFortnoxEntity(raw, 'asset', config);
      expect(result.external_id).toBe('A001');
      expect(result.amount).toBe(25000);
      expect(result.document_date).toBe('2023-06-15');
      expect(result.fiscal_year).toBe(2023);
    });
  });

  describe('company_info', () => {
    const config = getFortnoxConfig('company_info');

    it('maps company info fields', () => {
      const raw = {
        OrganizationNumber: '5561234567',
        CompanyName: 'Test AB',
        Address: 'Storgatan 1',
        City: 'Stockholm',
      };

      const result = mapFortnoxEntity(raw, 'company_info', config);
      expect(result.external_id).toBe('5561234567');
      expect(result.counterparty_name).toBe('Test AB');
    });
  });

  describe('edge cases', () => {
    const config = getFortnoxConfig('invoice');

    it('defaults currency to SEK when missing', () => {
      const raw = { DocumentNumber: '1' };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.currency).toBe('SEK');
    });

    it('handles null fields gracefully', () => {
      const raw = {
        DocumentNumber: '1',
        CustomerNumber: null,
        InvoiceDate: null,
        Total: null,
      };

      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.counterparty_number).toBeNull();
      expect(result.document_date).toBeNull();
      expect(result.amount).toBeNull();
      expect(result.fiscal_year).toBeNull();
    });

    it('extracts fiscal year from document date', () => {
      const raw = { DocumentNumber: '1', InvoiceDate: '2023-12-31' };
      const result = mapFortnoxEntity(raw, 'invoice', config);
      expect(result.fiscal_year).toBe(2023);
    });
  });
});
