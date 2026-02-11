# Overview

### What is API.1?

API.1 is your single connection point for seamlessly accessing customer data from various accounting systems. We eliminate the need for intricate integrations and cumbersome file services, empowering you to focus on what matters most – your business.

### Key Components:

* The API: Your direct gateway to unified customer data.
* Onboarding Flow: A simple, customizable process for inviting and integrating your customers.
* File.1: Our intelligent service for effortless file uploads and parsing.

### Unlock Unprecedented Benefits:

* Connect Once, Access All: With a single connection to API.1, you gain access to a multitude of customer accounting systems. Zwapgrid handles all the complexities, including data mapping, system knowledge, regulatory compliance, maintenance, and authentication.
* Accelerate Market Expansion: Effortlessly expand into new markets or enhance your offerings as we continuously add new systems and file formats to our platform.
* Automate Key Processes: Our solution is ideal for:
  * Financial Institutions: Streamline factoring, credit assessments, and automate accounting processes, especially for invoice data.
  * Payment Solution Providers: Seamlessly automate the accounting of payouts.

### The Simple Path to Data Access:

1. Sign Up: Join the Zwapgrid platform.
2. Consent & Invite: Create a Consent and invite your customer.
3. Customer Connects: Your customer connects their accounting system (or uploads files).
4. Access Your Data: Instantly access unified data through the Accounting API.

<figure><img src="https://2802285108-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FQCvVWgo58AdpQJMipzpD%2Fuploads%2F2SIZ9RCd3rTmOgl42fbI%2Fflow.1.png?alt=media&#x26;token=f7521e9c-0e78-48b4-9b8a-3b4e9f25910c" alt=""><figcaption></figcaption></figure>

### Technical Overview:

API.1 features a robust structure with two main components:

* **Consent API**: For efficient management of customer consents.
* **Accounting API**: For secure retrieval of data from customer accounting systems.

Our user-friendly onboarding flow guides your customers through a quick and intuitive three-screen process to enable data sharing. Once consent is established and the customer's system is connected, fetching data via the Accounting API is effortless.


# Systems in the grid

These systems and functionality are available through the API.1.

Missing any systems? Get in touch at <hello@zwapgrid.com>

**Legend:**

* ✅ = Implemented
* 🔵 = Backlog / In Progress
* ❌ = Will not implement (unsupported or deprecated)

#### Accounting API functionality

<table data-header-hidden data-full-width="true"><thead><tr><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr></thead><tbody><tr><td>Entity</td><td>API.1 Functionality</td><td>Fortnox</td><td>Bjorn Lunden</td><td>Visma Spiris</td><td>Tripletex</td><td>Visma e-conomic</td><td>Billy</td><td>Visma Dinero</td><td>Procountor</td><td>Visma Netvisor</td><td>Microsoft Business Central</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices/GET/api/v1/consents/{consentId}/salesinvoices">GET /salesinvoices</a></td><td>Retrieves a list of sales invoices</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices/GET/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}">GET /salesinvoices/{id}</a></td><td>Retrieves a specific sales invoice by ID</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---attachments/GET/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/attachments">GET /salesinvoices/{id}/attachments</a></td><td>Retrieves a list of attachments for a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---attachments/GET/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/attachments/{attachmentId}">GET /salesinvoices/{id}/attachments/{attachmentId}</a></td><td>Retrieves a specific attachment for a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---attachments/GET/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/attachments/printable">GET /salesinvoices/{id}/printable</a></td><td>Retrieves a printable version of a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---payments/GET/api/v1/consents/{consentId}/salesinvoices/payments">GET /salesinvoices/payments</a></td><td>Retrieves a list of payments for a specific sales invoice</td><td>✅</td><td>❌</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---payments/GET/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/payments">GET /salesinvoices/{id}/payments</a></td><td>Retrieves a list of payments for a specific sales invoice</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---notes/POST/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/notes">POST /salesinvoices/{id}/notes</a></td><td>Adds a note to a specific sales invoice</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices/POST/api/v1/consents/{consentId}/salesinvoices">POST /salesinvoices</a></td><td>Creates a new sales invoice</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---attachments/POST/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/attachments">POST /salesinvoices/{id}/attachments</a></td><td>Adds an attachment to a specific sales invoice</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/sales-invoices---payments/POST/api/v1/consents/{consentId}/salesinvoices/{salesInvoiceId}/payments">POST /salesinvoices/{id}/payments</a></td><td>Posts a payment for a specific sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices/GET/api/v1/consents/{consentId}/supplierinvoices">GET /supplierinvoices</a></td><td>Retrieves a list of supplier invoices</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices/GET/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}">GET /supplierinvoices/{id}</a></td><td>Retrieves a specific supplier invoice by ID</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---attachments/GET/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}/attachments">GET /supplierinvoices/{id}/attachments</a></td><td>Retrieves a list of attachments for a supplier invoice</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---attachments/GET/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}/attachments/{attachmentId}">GET /supplierinvoices/{id}/attachments/{attachmentId}</a></td><td>Retrieves a specific attachment for a supplier invoice</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---payments/GET/api/v1/consents/{consentId}/supplierinvoices/payments">GET /supplierinvoices/payments</a></td><td>Retrieves a list of payments for a specific supplier invoice</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---payments/GET/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}/payments">GET /supplierinvoices/{id}/payments</a></td><td>Retrieves a list of payments for a specific supplier invoice</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---payments/POST/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}/payments">POST /supplierinvoices/{id}/payments</a></td><td>Posts a payment for a specific supplier invoice</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices/POST/api/v1/consents/{consentId}/supplierinvoices">POST /supplierinvoices</a></td><td>Creates a new supplier invoice</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/supplier-invoices---attachments/POST/api/v1/consents/{consentId}/supplierinvoices/{supplierInvoiceId}/attachments">POST /supplierinvoices/{id}/attachments</a></td><td>Adds an attachment to a specific supplier invoice</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/suppliers/GET/api/v1/consents/{consentId}/suppliers">GET /suppliers</a></td><td>Retrieves a list of suppliers</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/suppliers/GET/api/v1/consents/{consentId}/suppliers/{supplierId}">GET /suppliers/{id}</a></td><td>Retrieves a specific supplier by ID</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/customers/GET/api/v1/consents/{consentId}/customers">GET /customers</a></td><td>Retrieves a list of customers</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/customers/GET/api/v1/consents/{consentId}/customers/{customerId}">GET /customers/{id}</a></td><td>Retrieve a specific customer by ID</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/journals/GET/api/v1/consents/{consentId}/journals">POST /journals</a></td><td>Creates a new journal entry</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/journals---attachments/POST/api/v1/consents/{consentId}/journals/{journalId}/attachments">POST /journals/{id}/attachments</a></td><td>Adds an attachment to a specific journal entry</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/journals/GET/api/v1/consents/{consentId}/journals">GET /journals</a></td><td>Retrieves a list of journal entries</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/journals/GET/api/v1/consents/{consentId}/journals/{journalId}">GET /journals/{id}</a></td><td>Retrieves a specific journal entry by ID</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/journals---attachments/GET/api/v1/consents/{consentId}/journals/{journalId}/attachments/{attachmentId}">GET /journals/{id}/attachments/{attachmentId}</a></td><td>Retrieves a specific attachment for a journal entry</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/account-balances/GET/api/v1/consents/{consentId}/accountbalances">GET /account balances (deprecated)</a></td><td>Retrieves account balances (<mark style="color:red;">deprecated</mark>)</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>✅</td><td>❌</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/accounting-accounts/GET/api/v1/consents/{consentId}/accountingaccounts">GET /accountingAccounts</a></td><td>Retrieves a list of accounting accounts</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/balance-sheet/GET/api/v1/consents/{consentId}/balancesheet">GET /balanceSheet</a></td><td>Retrieves balance sheet reports</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/income-statement/GET/api/v1/consents/{consentId}/incomestatement">GET /incomeStatement</a></td><td>Retrieves income statement reports</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/trial-balances/GET/api/v2/consents/{consentId}/trialbalances">GET /trialbalances/v2</a></td><td>Retrieves trial balances (version 2)</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/trial-balances/GET/api/v1/consents/{consentId}/trialbalances">GET /trialbalances/v1 (deprecated)</a></td><td>Retrieves trial balances (version 1, <mark style="color:red;">deprecated</mark>)</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/accounting-periods/GET/api/v1/consents/{consentId}/accountingperiods">GET /accountingPeriods</a></td><td>Retrieves a list of accounting periods</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>✅</td><td>🔵</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/financial-dimensions/GET/api/v1/consents/{consentId}/financialdimensions">GET /financialDimensions</a></td><td>Retrieves financial dimensions</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td><a href="https://apidocs.zwapgrid.com/accounting-api#tag/company-information/GET/api/v1/consents/{consentId}/companyinformation">GET /companyInformation</a></td><td>Retrieves information about the company</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr></tbody></table>

#### Platform functionality

<table data-full-width="true"><thead><tr><th>Entity</th><th>API.1 Functionality</th><th>Fortnox</th><th>Bjorn Lunden </th><th>Visma eAccounting </th><th>Visma e-conomic</th><th>Billy</th><th>Visma Dinero </th><th>Procountor</th><th>Visma Netvisor</th><th>Tripletex</th><th>Microsoft Business Central</th></tr></thead><tbody><tr><td><strong>Platform</strong></td><td><a href="connection-management/zwapgrid-managed-connection">Zwapgrid-managed connection to systems</a></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td></td><td><a href="connection-management/client-managed-connection">Client-managed connection to systems</a></td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>✅</td></tr><tr><td></td><td>Custom scope selection for Zwapgrid conncetion</td><td>✅</td><td>❌</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>🔵</td><td>❌</td></tr><tr><td></td><td><p><a href="https://apidocs.zwapgrid.com/accounting-api#tag/proxy1">Proxy.1</a></p><p><a href="https://docs.zwapgrid.com/proxy.1/overview">Additional information</a></p></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>🔵</td><td>🔵</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr></tbody></table>

#### File.1 functionality

<table data-full-width="true"><thead><tr><th>Entity</th><th>API.1 Functionality</th><th>Peppol (BIS Billing 3.0 - UBL Invoice)</th><th>Svefaktura 1.0</th><th>Finvoice 3.0 PDF</th><th>ASIX (single &#x26; multi file formats)</th></tr></thead><tbody><tr><td><strong>File.1 Functionality</strong></td><td>GET a list of sales invoices</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td></td><td>GET a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td></td><td>GET attachments for a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td></td><td>GET an attachment for a sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr><tr><td></td><td>GET a printable sales invoice</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr></tbody></table>

# Terminology

| Term              | Meaning                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Client        | You are The Client. You invite Your Customer to Consent to share data from their Accounting System. You can then consume this data using API.1.                         |
| Your Customer     | Your Customer can connect their Accounting Systems and share their data with The Client.                                                                                |
| Your System       | This is your platform - the public-facing or internal software system(s) you develop and use within your organization.                                                  |
| Consent           | Consent is the link between Your Customer in Your Platform and the connection to their Accounting System through API.1.                                                 |
| Consent ID        | A Consent ID is a unique GUID generated when you create a Consent. You can then use it when inviting Your Customer to connect so that you can consume data using API.1. |
| Accounting System | An Accounting System is a software system that helps organizations automate and manage accounting for optimal performance.                                              |
| Client Portal     | This is where you can manage The Client - here you can manage the Onboarding Flow and API Key creation, for example.                                                    |
| Onboarding Flow   | This is the platform that Zwapgrid has developed to enable Your Customer to log in and connect to their Accounting System.                                              |
| API.1             | API.1 is the set of APIs that are used by The Client to access the data from the Accounting System that Your Customer uses.                                             |
| API Key           | The API Key is your access to API.1 APIs. You create and manage API Keys in the Client Portal.                                                                          |
| One-Time Code     | A unique code that is generated and used together with the Onboarding Flow, in order to ensure that only Your Customer can access a created Consent.                    |

# Terminology

| Term              | Meaning                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Client        | You are The Client. You invite Your Customer to Consent to share data from their Accounting System. You can then consume this data using API.1.                         |
| Your Customer     | Your Customer can connect their Accounting Systems and share their data with The Client.                                                                                |
| Your System       | This is your platform - the public-facing or internal software system(s) you develop and use within your organization.                                                  |
| Consent           | Consent is the link between Your Customer in Your Platform and the connection to their Accounting System through API.1.                                                 |
| Consent ID        | A Consent ID is a unique GUID generated when you create a Consent. You can then use it when inviting Your Customer to connect so that you can consume data using API.1. |
| Accounting System | An Accounting System is a software system that helps organizations automate and manage accounting for optimal performance.                                              |
| Client Portal     | This is where you can manage The Client - here you can manage the Onboarding Flow and API Key creation, for example.                                                    |
| Onboarding Flow   | This is the platform that Zwapgrid has developed to enable Your Customer to log in and connect to their Accounting System.                                              |
| API.1             | API.1 is the set of APIs that are used by The Client to access the data from the Accounting System that Your Customer uses.                                             |
| API Key           | The API Key is your access to API.1 APIs. You create and manage API Keys in the Client Portal.                                                                          |
| One-Time Code     | A unique code that is generated and used together with the Onboarding Flow, in order to ensure that only Your Customer can access a created Consent.                    |

# API Keys

In order to access API.1, you must first create an API Key. You can create an API Key in the Client Portal.

When you use API.1 APIs, you must pass the following as an HTTP header:

```
x-api-key: apikey
```

API keys can be created with the following time frames:

* 30 Days
* 90 Days
* 365 Days

{% hint style="warning" %}
We encourage you to refresh your API keys regularly as a security best-practice.
{% endhint %}

### API Key Security

Zwapgrid does not store your API Key, so you must copy the key after creation and limit who has access to see the key.

Your API Key should not be used to make calls to API.1 from software such as web browsers or from other applications that risk exposing the API Key publicly.

{% hint style="danger" %}
It is your responsibility to keep your API Keys safe.
{% endhint %}

# Onboard Your Customer

To integrate Your Customer with API.1, you must first use the Consent API to create a Consent - you then use the generated Consent ID in order to invite Your Customer to share data from their Accounting System using the Onboarding Flow.

Once Your Customer has accepted the Consent you can use API.1 to consume data from their Accounting System from within Your Platform.

<figure><img src="https://2802285108-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FQCvVWgo58AdpQJMipzpD%2Fuploads%2FESx11Y3EckJ3D08lLbnF%2Fflow.1.png?alt=media&#x26;token=1a61edbf-e689-4dff-bd9b-f061b377760d" alt=""><figcaption></figcaption></figure>

# Access Your Customer Data

Once Your Customer has successfully completed the Onboarding Flow, and granted Consent to you The Client to access their data, you can see that their Consent status will have changed. You will now be able to use the Consent ID when calling API.1 in order to retrieve data from Your Customer's Accounting System.

You must use the Consent ID, along with the API Key that you have acquired in order to access any API.1 endpoint and filter/list invoices.

There are more details on this in the [API Reference](https://docs.zwapgrid.com/reference/) section of our documentation.

# Overview

{% hint style="info" %}
**What is Consent?**

Consent is the link between your Your Customer in Your Platform and the connection to their Accounting System through API.1.
{% endhint %}

What this means is that you create a Consent (and generate a Consent ID) which you use to:

* **Invite your Customer** to connect their Accounting System

and then

* Connect to API.1 to **fetch their data** and access it in Your Platform

# Create Consent

{% hint style="info" %}
**How do you create Consent?**

The Client can create Consent using API.1 before you invite Your Customer to the Onboarding Flow to share data from their Accounting System.
{% endhint %}

### Create a consent using API.1

The Client must use API.1 to create a Consent which will generate a Consent ID.

### Onboarding Flow

The Client must direct Your Customer to the Onboarding Flow requesting Consent to access data from their Accounting System.

Your Customer will use the Onboarding Flow to connect to their Accounting System.

<figure><img src="https://2802285108-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FQCvVWgo58AdpQJMipzpD%2Fuploads%2FuzYb61tKBoDNTRO9jVjC%2Fflow.1.png?alt=media&#x26;token=359f2e81-ba46-4b6e-a48c-59f8cc332042" alt=""><figcaption></figcaption></figure>

# Grant Consent

{% hint style="info" %}
**How does Your Customer grant Consent?**

Your Customer uses the Onboarding Flow to authorize a connection to their Accounting System so that The Client can access their data using API.1.
{% endhint %}

### Your Customer grants Consent to access their data

* Your Customer is prompted to Consent to share data between their Accounting System and Your Platform using API.1.
* The customer must then connect to their Accounting System in order to begin sharing their data through API.1.

# Consent Status

Consent can have one of the following statuses:

### Created

The initial status of a Consent - it has this status as soon as it is created and has not yet been accepted by Your Customer.

{% hint style="info" %}
If a Consent is Created but not Accepted, it will be removed in 30 days.
{% endhint %}

### Accepted

The status of a Consent once Your Customer has completed the Onboarding Flow and connected their Accounting System. You can now call API.1 to get their data and use it in Your Platform.

{% hint style="info" %}
If a Consent is Accepted, it will remain in this state unless it is Revoked, Deleted or becomes Inactive.
{% endhint %}

### Revoked

The status of a Consent that has been revoked via the Consent API or from the Client Portal. It is not possible to access data via API.1.

{% hint style="info" %}
If a Consent is Revoked, it will be removed in 180 days.
{% endhint %}

### Inactive

The status of a Consent that no longer has an active connection. This could be because Your Customer has removed access via their Accounting System, for example. It is not possible to access data via API.1.

{% hint style="info" %}
If a Consent is Inactive, it will be removed in 180 days.
{% endhint %}

# Overview

{% hint style="info" %}
**What is the Onboarding Flow?**

The Onboarding Flow is how a Client invites Your Customer to connect to their Accounting System to share their data.
{% endhint %}

The Onboarding Flow is available at <https://onboarding.zwapgrid.com> using a valid Consent ID and One-Time Code.

# Onboarding Flow

To establish a connection and retrieve data from Your Customer's Accounting System, you must invite them to use the Onboarding Flow.

### Ways to embed the Onboarding Flow

#### Embed it within Your Platform

You can embed the Onboarding Flow in an iframe, so that you can control the look and feel of the size of the Onboarding Flow, and have control over the area outside the iframe in whatever way you wish.

#### Redirect to the Onboarding Flow

You can redirect your customer to the Onboarding Flow from Our Platform, and once they are finished it can automatically redirect back to Your Platform.

#### Direct Link

If you want to share a link to the Onboarding Flow with your customer (e.g. via an email) you must first direct them to Your Platform from where you should create a new Consent and generate a One-Time Code, and then redirect your customer to the Onboarding Flow.

{% hint style="danger" %}
You should not share a direct link to the Onboarding Flow except from within Your Platform. If you share a direct link via another method (e.g. email), the One-Time Code could expire, or be become invalidated by email scanners or thumbnail previews, causing unexpected behaviour.
{% endhint %}

### Parameters

#### One-Time Code (required)

Used to authenticate Your Customer.

```
https://onboarding.zwapgrid.com/consent/<Consent ID>/?otc=<one-time-code>
```

#### Redirect back to Your Platform (optional)

If you wish to let your Your Customer return to Your Platform at the end of the Onboarding Flow, you can do so by including the query parameter `redirecturl` in the URL.

```
https://onboarding.zwapgrid.com/consent/<Consent ID>/?otc=<one-time-code>&redirecturl=<url>
```

#### Control the redirect delay (optional)

You can control whether we redirect automatically back to Your Platform, and how long to wait for this to happen, using `redirectdelay` in the URL.

```
https://onboarding.zwapgrid.com/consent/<Consent ID>/?otc=<one-time-code>&redirecturl=<url>&redirectdelay=<delay-in-seconds>
```

# Connection Management

Zwapgrid provides robust and flexible solutions for connecting to your customers' systems, enabling seamless data exchange. We offer support for two primary approaches to establishing these connections. Your ability to configure system settings and the level of management provided by Zwapgrid will depend on your specific [pricing tier](https://www.zwapgrid.com/pricing) and the support within each system.

# Overview

{% hint style="info" %}
**What is the Client Portal?**

The Client Portal is where you manage The Client experience. It provides API Key management, management ofConsent and the ability to customise the Onboarding Flow.
{% endhint %}

You can access the Client Portal at <https://clients.zwapgrid.com/> with a valid login.

### What can I do from the Client Portal?

We are constantly developing new features for the Client Portal.

### Current Functionality

| Area                     | Feature                         | Status            |
| ------------------------ | ------------------------------- | ----------------- |
| **API Keys**             | Generate Test API Key           | Available         |
|                          | Generate Production API Key     | Available         |
|                          | Delete API Keys                 | Available         |
|                          |                                 |                   |
| **Consent**              | List Consent                    | Available         |
|                          | Revoke Consent                  | Available         |
|                          | Delete Consent                  | Available         |
|                          | Edit Consent Name               | Available         |
|                          | Search Consent                  | Under Development |
|                          |                                 |                   |
| **Branding**             | Add Logo                        | Available         |
|                          | Update Logo                     | Available         |
|                          | Update Company Website          | Available         |
|                          | Update Company Name             | Available         |
|                          | Configure Available ERP Systems | Available         |
|                          | Configure Brand Colours         | Under Development |
|                          |                                 |                   |
| **System Configuration** | Configure Fortnox               | Under Development |
|                          | Configure File.1                | Available         |
|                          |                                 |                   |
| User Management          |                                 |                   |
|                          | List Users                      | Available         |
|                          | Invite User                     | Available         |
|                          | Delrte User                     | Available         |

# Consents

Here you can see a list of all the Consents that have been created for your Client, and you can toggle the [Environment](https://docs.zwapgrid.com/client-portal/environments) to see the corresponding Consents.

You can see additional information for the consent such as:

* Name
* Created Date
* Status
* Connected System

We also offer the following functionality:

* Edit a Consent Name&#x20;
* Revoke a Consent
* Delete a Consent

{% hint style="info" %}
We regularly purge consents that are not active, according to certain time limits
{% endhint %}

| Created | Inactive | Revoked  | Deleted     |
| ------- | -------- | -------- | ----------- |
| 30 days | 180 days | 180 days | Immediately |

# Branding

The Client Portal offers the ability to configure the Onboarding Flow with various options.

These are:

* Your Company
  * &#x20;Change your company Display Name
  * Change your company URL (used when clicking on your logo in the Onboarding Flow)
* ERP Systems
  * Toggle which systems you wish to support in the Onboarding Flow.
* Customise User Onboarding
  * Upload a logo to display in the Onboarding Flow.

# API Keys

API Keys are essential when making requests via API.1. You can create API Keys for our [environments](https://docs.zwapgrid.com/client-portal/environments) and it is possible to set a descriptive name (to help you remember) and an expiry. We currently support the following expiry limits:

* 30 days
* 90 days
* 365 days

{% hint style="info" %}
We recommend that you use an expiry limit that is as short as possible, recycle API Keys regularly and share them with as few individuals as necessary.
{% endhint %}

When&#x20;

# API Keys

API Keys are essential when making requests via API.1. You can create API Keys for our [environments](https://docs.zwapgrid.com/client-portal/environments) and it is possible to set a descriptive name (to help you remember) and an expiry. We currently support the following expiry limits:

* 30 days
* 90 days
* 365 days

{% hint style="info" %}
We recommend that you use an expiry limit that is as short as possible, recycle API Keys regularly and share them with as few individuals as necessary.
{% endhint %}

When&#x20;

# API Keys

API Keys are essential when making requests via API.1. You can create API Keys for our [environments](https://docs.zwapgrid.com/client-portal/environments) and it is possible to set a descriptive name (to help you remember) and an expiry. We currently support the following expiry limits:

* 30 days
* 90 days
* 365 days

{% hint style="info" %}
We recommend that you use an expiry limit that is as short as possible, recycle API Keys regularly and share them with as few individuals as necessary.
{% endhint %}

When&#x20;

# Production

{% hint style="info" %}
To create Production consents via the API, you must use a Production API Key
{% endhint %}

This environment is used for development against API.1 in the production environment of Your Platform.

This environment enables you to integrate with a production version of the Onboarding Flow and allows you to create and manage actual Consent for Your Customer.

# Overview

Zwapgrid's API.1 is a unified API designed to simplify and standardize access to customer data from various accounting systems. It acts as a single connection point, eliminating the need for businesses to build and maintain complex, individual integrations with multiple accounting platforms.

### Key Purpose and Benefits

The primary goal of API.1 is to enable businesses to effortlessly access real-time accounting data from their customers, streamlining financial processes and enhancing data-driven insights. Key benefits include:

* **Unified Data Access:** Connects to a multitude of accounting systems (e.g., Microsoft Business Central) and provides standardized data through one unified schema, eliminating inconsistencies.
* **Simplified Integrations:** Removes the complexity of intricate integrations, allowing businesses to focus on their core operations rather than data mapping, system knowledge, or regulatory compliance.
* **Easy Customer Onboarding:** Features a simple, customizable onboarding flow that allows customers to securely connect and authorize data sharing with just a few clicks.
* **Scalability and Reliability:** Engineered for performance and reliability, handling growing data demands with enterprise-grade uptime and robust security.
* **Accelerated Market Expansion:** Facilitates expansion into new markets by continuously adding new systems and file formats to the platform.
* **Automation of Key Processes:** Ideal for financial institutions (streamlining credit assessments, factoring) and payment solution providers (automating accounting of payouts).

### How it Works

API.1 operates on a straightforward principle:

1. **Invite Customer:** The client (your business) invites their customer to securely connect and share their accounting data.
2. **Customer Connects:** The customer goes through a guided onboarding flow, choosing their accounting system and granting consent for data sharing by signing into their system.
3. **Access Data:** Once consent is established and the customer's system is connected, the client can access real-time accounting data through API.1.

# Overview

{% hint style="info" %}
**What is File.1?**

File.1 is a system for allowing the upload and correction of PDF files such as invoices.
{% endhint %}

File.1 is available at <https://fileone.zwapgrid.com> using a valid Consent ID and One-Time Code.
