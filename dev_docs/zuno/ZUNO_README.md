================================================
FILE: README.md
================================================
# Zuno - Universal Bookkeeping API (WIP)

A unified API that provides a thin layer over multiple ERP systems. Designed to serve as a consistent interface for services like midday.ai to export transactions with attachments from different accounting providers.

## 🚀 Features

- **Unified Interface**: Single API for multiple accounting providers
- **Read-Only Operations**: Thin layer that proxies requests to underlying ERPs
- **Attachment Proxy**: Forward attachment requests to provider APIs
- **OAuth 2.0 Authentication**: Secure authentication for all providers
- **Bulk Operations**: Support for bulk data operations
- **Real-time Sync**: Webhooks and real-time data synchronization
- **Comprehensive Entities**: Support for all major accounting entities

## 🔌 Supported Providers

| Provider | Region | Authentication | Entities | Attachments |
|----------|--------|---------------|----------|-------------|
| **Xero** | Global | OAuth 2.0 | ✅ Full | ✅ Download |
| **Fortnox** | Sweden | OAuth 2.0 | ✅ Full | ✅ Download |
| **QuickBooks** | US, CA, UK, AU | OAuth 2.0 | ✅ Full | ✅ Download |
| **Sage** | UK/EU | OAuth 2.0 | ✅ Full | ✅ Download |

## 📋 Supported Entities

- **Contacts**: Customers and Vendors
- **Products**: Items and Services
- **Transactions**: Invoices, Bills, Payments
- **Accounting**: Accounts, Journal Entries, Expenses
- **Attachments**: Receipts, Invoices, Documents

## 🔐 Authentication

All providers use OAuth 2.0 for secure authentication:

### Step 1: Get Authorization URL
```bash
curl -X POST https://api.zuno.dev/auth/url \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage",
    "scopes": ["full_access"],
    "redirectUri": "https://your-app.com/callback"
  }'
```

### Step 2: Exchange Code for Token
```bash
curl -X POST https://api.zuno.dev/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "sage",
    "code": "authorization_code_from_callback"
  }'
```

## 📖 API Examples

### Sage Business Cloud Accounting

#### Authentication
```javascript
// Get authorization URL
const authResponse = await fetch('/auth/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'sage',
    scopes: ['full_access'],
    redirectUri: 'https://your-app.com/callback'
  })
});

// Exchange code for token
const tokenResponse = await fetch('/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'sage',
    code: 'authorization_code'
  })
});
```

#### Fetch Customers
```javascript
const customers = await fetch('/customers?provider=sage', {
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Create Invoice
```javascript
const invoice = await fetch('/invoices?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'customer-123',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    lineItems: [{
      description: 'Consulting services',
      quantity: 10,
      unitPrice: 150.00
    }]
  })
});
```

#### Download Attachments
```javascript
// Get invoice attachments
const attachments = await fetch('/attachments?provider=sage&entityType=invoice&entityId=inv-123', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Download specific attachment
const fileStream = await fetch(`/attachments/att-456/download?provider=sage`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Xero

#### Authentication
```javascript
const authResponse = await fetch('/auth/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'xero',
    scopes: ['accounting.transactions', 'accounting.attachments'],
    redirectUri: 'https://your-app.com/callback'
  })
});
```

#### Fetch Invoices with Attachments
```javascript
// Get invoices
const invoices = await fetch('/invoices?provider=xero', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Get attachments for specific invoice
const attachments = await fetch('/attachments?provider=xero&entityType=invoice&entityId=inv-123', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### Fortnox

#### Authentication
```javascript
const authResponse = await fetch('/auth/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'fortnox',
    scopes: ['invoice', 'customer', 'supplier'],
    redirectUri: 'https://your-app.com/callback'
  })
});
```

#### Bulk Export
```javascript
const exportJob = await fetch('/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'fortnox',
    entities: ['invoices', 'customers', 'attachments'],
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  })
});
```

### QuickBooks Online

#### Authentication
```javascript
const authResponse = await fetch('/auth/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'quickbooks',
    scopes: ['com.intuit.quickbooks.accounting'],
    redirectUri: 'https://your-app.com/callback'
  })
});
```

#### Multi-Region Support
```javascript
// US region
const usCustomers = await fetch('/customers?provider=quickbooks&region=US', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// UK region
const ukCustomers = await fetch('/customers?provider=quickbooks&region=UK', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

## 🗂️ Data Models

### Customer
```typescript
interface Customer {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  phone?: PhoneNumber;
  addresses: Address[];
  taxNumber?: string;
  currency: string;
  isActive: boolean;
  balance?: number;
  creditLimit?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  number: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  amountDue: number;
  lineItems: LineItem[];
  createdAt: string;
  updatedAt: string;
}
```

### Attachment
```typescript
interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  downloadUrl: string;
  entityType: 'invoice' | 'bill' | 'expense';
  entityId: string;
  createdAt: string;
  updatedAt: string;
}
```

## 🛠️ Development

### Prerequisites
- Bun (Package manager)
- Node.js 18+
- TypeScript

### Setup
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Deploy to Cloudflare Workers
bun run deploy
```

### Environment Variables
```bash
# Provider Credentials
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret

FORTNOX_CLIENT_ID=your_fortnox_client_id
FORTNOX_CLIENT_SECRET=your_fortnox_client_secret

QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret

SAGE_CLIENT_ID=your_sage_client_id
SAGE_CLIENT_SECRET=your_sage_client_secret

# Database
DATABASE_URL=your_database_url

# Optional: Environment
NODE_ENV=development
```

## 📊 Provider Capabilities

### Sage Business Cloud Accounting
- **Region**: UK and European markets
- **Authentication**: OAuth 2.0
- **Rate Limits**: 1000 requests/hour
- **Entities**: Customers, Suppliers, Invoices, Bills, Items, Accounts, Journal Entries, Expenses, Payments
- **Attachments**: Full support via native API
- **Bulk Operations**: Supported
- **Webhooks**: Available

### Xero
- **Region**: Global
- **Authentication**: OAuth 2.0
- **Rate Limits**: 10,000 requests/day
- **Entities**: Full accounting entity support
- **Attachments**: Download and metadata only
- **Bulk Operations**: Supported
- **Webhooks**: Available

### Fortnox
- **Region**: Sweden
- **Authentication**: OAuth 2.0
- **Rate Limits**: 25 requests/second
- **Entities**: Full Swedish accounting support
- **Attachments**: Full support
- **Bulk Operations**: Supported
- **Webhooks**: Available

### QuickBooks Online
- **Region**: US, Canada, UK, Australia
- **Authentication**: OAuth 2.0
- **Rate Limits**: 500 requests/minute
- **Entities**: Comprehensive US GAAP support
- **Attachments**: Full support
- **Bulk Operations**: Supported
- **Webhooks**: Available

## 🔄 Sync Options

All providers support incremental sync:

```javascript
// Sync customers modified since last sync
const customers = await fetch('/customers?provider=sage&modifiedSince=2024-01-01T00:00:00Z', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Bulk export with date range
const exportJob = await fetch('/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'sage',
    entities: ['invoices', 'customers', 'attachments'],
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    },
    includeAttachments: true
  })
});
```

## 🚦 Rate Limiting

Each provider has different rate limits:

| Provider | Rate Limit | Reset Window |
|----------|------------|--------------|
| Xero | 10,000/day | 24 hours |
| Fortnox | 25/second | 1 second |
| QuickBooks | 500/minute | 1 minute |
| Sage | 1000/hour | 1 hour |

## 🔗 Webhooks

Real-time notifications for data changes:

```javascript
// Register webhook
const webhook = await fetch('/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'sage',
    url: 'https://your-app.com/webhook',
    events: ['invoice.created', 'invoice.updated', 'payment.received']
  })
});
```

## 📈 Monitoring

Health check endpoint:
```bash
curl https://api.zuno.dev/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "providers": ["xero", "fortnox", "quickbooks", "sage"],
  "features": ["attachments", "bulk_export", "real_time_sync", "webhooks"],
  "version": "2.0.0"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@zuno.dev
- Documentation: https://docs.zuno.dev

---

Built with ❤️ for the accounting integration community



================================================
FILE: drizzle.config.ts
================================================
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!
  }
}) 


================================================
FILE: index.ts
================================================
console.log("Hello via Bun!");


================================================
FILE: package.json
================================================
{
  "name": "zuno",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy --minify",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "drizzle-kit": "^0.31.4",
    "drizzle-orm": "^0.44.3",
    "hono": "^4.8.5",
    "@hono/zod-openapi": "^0.16.2",
    "@scalar/hono-api-reference": "^0.9.11"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250715.0",
    "@types/node": "^22.0.0",
    "wrangler": "^4.25.0"
  }
}


================================================
FILE: tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": [
      "ESNext"
    ],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
}


================================================
FILE: wrangler.jsonc
================================================
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "zuno",
  "main": "src/index.ts",
  "compatibility_date": "2025-07-17",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "vars": {
    "ENVIRONMENT": "development",
    "XERO_CLIENT_ID": "placeholder",
    "XERO_CLIENT_SECRET": "placeholder", 
    "REDIRECT_URI": "http://localhost:3000/callback"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "zuno-erp-sync",
      "database_id": "your-database-id-here"
    }
  ],
  "queues": {
    "consumers": [
      {
        "queue": "sync-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "sync-dlq"
      }
    ],
    "producers": [
      {
        "queue": "sync-queue",
        "binding": "SYNC_QUEUE"
      }
    ]
  },
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-namespace-id-here"
    }
  ]
}



================================================
FILE: docs/providers/fortnox.md
================================================
[Empty file]


================================================
FILE: docs/providers/qbo.md
================================================
[Empty file]


================================================
FILE: docs/providers/sage.md
================================================
# Sage Business Cloud Accounting Provider

Sage Business Cloud Accounting is a comprehensive cloud-based accounting solution designed for small and medium-sized businesses, particularly popular in the UK and European markets.

## Overview

- **Provider**: Sage Business Cloud Accounting
- **Region**: UK, Ireland, and European markets
- **Authentication**: OAuth 2.0
- **Base URL**: `https://api.columbus.sage.com`
- **Rate Limits**: 1000 requests per hour
- **Webhook Support**: Yes
- **Bulk Operations**: Supported

## Authentication

### OAuth 2.0 Flow

1. **Authorization URL**:
   ```
   https://www.sageone.com/oauth2/auth
   ```

2. **Token URL**:
   ```
   https://oauth.sageone.com/oauth2/token
   ```

3. **Scopes**:
   - `full_access` - Complete access to all accounting data
   - `read_only` - Read-only access to accounting data

### Example Authentication Flow

```javascript
// Step 1: Get authorization URL
const authUrl = await fetch('/auth/url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'sage',
    scopes: ['full_access'],
    redirectUri: 'https://your-app.com/callback'
  })
});

// Step 2: Exchange code for tokens
const tokens = await fetch('/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'sage',
    code: 'authorization_code_from_callback'
  })
});
```

## Supported Entities

### Core Entities

| Entity | Create | Read | Update | Delete | Notes |
|--------|--------|------|--------|--------|-------|
| **Customers** | ✅ | ✅ | ✅ | ✅ | Full CRUD support |
| **Vendors** | ✅ | ✅ | ✅ | ✅ | Called "Suppliers" in Sage |
| **Invoices** | ✅ | ✅ | ✅ | ✅ | Sales invoices with line items |
| **Bills** | ✅ | ✅ | ✅ | ✅ | Purchase invoices |
| **Items** | ✅ | ✅ | ✅ | ✅ | Products and services |
| **Accounts** | ✅ | ✅ | ✅ | ✅ | Chart of accounts |
| **Expenses** | ✅ | ✅ | ✅ | ✅ | Expense management |
| **Payments** | ✅ | ✅ | ✅ | ✅ | Payment processing |
| **Journal Entries** | ✅ | ✅ | ✅ | ✅ | Manual journal entries |
| **Attachments** | ❌ | ✅ | ❌ | ❌ | Read-only via proxy |

### Attachment Support

Sage supports attachments through their native API:
- **Download**: Direct download via attachment URLs
- **Metadata**: Full attachment metadata including file size, type, description
- **Entity Links**: Attachments linked to invoices, bills, and other entities
- **File Types**: PDF, images, documents

## API Examples

### Customers

#### List Customers
```javascript
const customers = await fetch('/customers?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Customer
```javascript
const customer = await fetch('/customers?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Acme Corporation',
    displayName: 'Acme Corp',
    email: 'contact@acme.com',
    phone: { number: '+44 20 7123 4567', type: 'work' },
    addresses: [{
      type: 'billing',
      street: '123 Business Street',
      city: 'London',
      state: 'England',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom'
    }],
    taxNumber: 'GB123456789',
    currency: 'GBP',
    creditLimit: 10000
  })
});
```

### Invoices

#### List Invoices
```javascript
const invoices = await fetch('/invoices?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Invoice
```javascript
const invoice = await fetch('/invoices?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'customer-123',
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    currency: 'GBP',
    reference: 'INV-2024-001',
    lineItems: [{
      description: 'Consulting Services',
      quantity: 10,
      unitPrice: 150.00,
      total: 1500.00
    }],
    notes: 'Payment terms: Net 30 days'
  })
});
```

#### Send Invoice
```javascript
const result = await fetch('/invoices/inv-123/send?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    subject: 'Invoice INV-2024-001',
    message: 'Please find attached your invoice.'
  })
});
```

### Vendors (Suppliers)

#### List Vendors
```javascript
const vendors = await fetch('/vendors?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Vendor
```javascript
const vendor = await fetch('/vendors?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Office Supplies Ltd',
    displayName: 'Office Supplies',
    email: 'orders@officesupplies.com',
    phone: { number: '+44 20 7987 6543', type: 'work' },
    addresses: [{
      type: 'billing',
      street: '456 Supply Street',
      city: 'Manchester',
      state: 'England',
      postalCode: 'M1 2AB',
      country: 'United Kingdom'
    }],
    taxNumber: 'GB987654321',
    currency: 'GBP'
  })
});
```

### Bills

#### List Bills
```javascript
const bills = await fetch('/bills?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Bill
```javascript
const bill = await fetch('/bills?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    vendorId: 'vendor-456',
    issueDate: '2024-01-10',
    dueDate: '2024-02-10',
    currency: 'GBP',
    reference: 'BILL-2024-001',
    total: 500.00,
    notes: 'Monthly office supplies'
  })
});
```

### Items

#### List Items
```javascript
const items = await fetch('/items?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Item
```javascript
const item = await fetch('/items?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Business Consultancy',
    code: 'CONS-001',
    description: 'Professional business consulting services',
    unitPrice: 150.00,
    currency: 'GBP',
    unit: 'hour',
    isSold: true,
    isPurchased: false
  })
});
```

### Accounts

#### List Accounts
```javascript
const accounts = await fetch('/accounts?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Account
```javascript
const account = await fetch('/accounts?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Professional Services Income',
    code: '4100',
    description: 'Income from professional consulting services',
    accountType: 'income',
    currency: 'GBP'
  })
});
```

### Expenses

#### List Expenses
```javascript
const expenses = await fetch('/expenses?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Expense
```javascript
const expense = await fetch('/expenses?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 85.50,
    currency: 'GBP',
    date: '2024-01-15',
    description: 'Client lunch meeting',
    categoryId: 'acc-789',
    vendorId: 'vendor-123',
    reference: 'EXP-2024-001'
  })
});
```

### Payments

#### List Payments
```javascript
const payments = await fetch('/payments?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Payment
```javascript
const payment = await fetch('/payments?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'customer-123',
    amount: 1500.00,
    currency: 'GBP',
    date: '2024-01-20',
    reference: 'PAY-2024-001'
  })
});
```

### Journal Entries

#### List Journal Entries
```javascript
const journalEntries = await fetch('/journal-entries?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Create Journal Entry
```javascript
const journalEntry = await fetch('/journal-entries?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2024-01-15',
    reference: 'JE-2024-001',
    description: 'Monthly depreciation adjustment',
    journalRows: [
      {
        accountId: 'acc-100',
        description: 'Depreciation expense',
        debit: 500.00,
        credit: 0
      },
      {
        accountId: 'acc-101',
        description: 'Accumulated depreciation',
        debit: 0,
        credit: 500.00
      }
    ]
  })
});
```

### Attachments

#### List Attachments
```javascript
const attachments = await fetch('/attachments?provider=sage&entityType=invoice&entityId=inv-123', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Get Attachment
```javascript
const attachment = await fetch('/attachments/att-456?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### Download Attachment
```javascript
const fileStream = await fetch('/attachments/att-456/download?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

## Bulk Operations

### Bulk Export
```javascript
const exportJob = await fetch('/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider: 'sage',
    entities: ['customers', 'invoices', 'bills', 'expenses', 'attachments'],
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31'
    },
    includeAttachments: true,
    format: 'json'
  })
});
```

### Bulk Create
```javascript
const result = await fetch('/bulk/customers?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entities: [
      {
        name: 'Customer 1',
        email: 'customer1@example.com',
        currency: 'GBP'
      },
      {
        name: 'Customer 2',
        email: 'customer2@example.com',
        currency: 'GBP'
      }
    ]
  })
});
```

## Error Handling

Sage API returns structured error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid"
      }
    ]
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or expired token
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `DUPLICATE_ENTRY` - Duplicate record

## Rate Limiting

Sage implements rate limiting:
- **Limit**: 1000 requests per hour
- **Reset**: Hourly reset window
- **Headers**: 
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

## Webhooks

Sage supports webhooks for real-time notifications:

### Supported Events
- `invoice.created`
- `invoice.updated`
- `invoice.deleted`
- `customer.created`
- `customer.updated`
- `payment.created`
- `payment.updated`

### Webhook Registration
```javascript
const webhook = await fetch('/webhooks?provider=sage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhook',
    events: ['invoice.created', 'invoice.updated', 'payment.created']
  })
});
```

## Data Mapping

### Sage to Unified Schema

| Sage Field | Unified Field | Notes |
|------------|---------------|-------|
| `contact.name` | `name` | Customer/vendor name |
| `contact.display_name` | `displayName` | Display name |
| `contact.email` | `email` | Email address |
| `contact.telephone` | `phone.number` | Phone number |
| `contact.tax_number` | `taxNumber` | VAT/tax number |
| `sales_invoice.date` | `issueDate` | Invoice date |
| `sales_invoice.due_date` | `dueDate` | Payment due date |
| `sales_invoice.total_amount` | `total` | Total amount |
| `sales_invoice.outstanding_amount` | `amountDue` | Outstanding balance |
| `product.item_code` | `code` | Item code |
| `product.description` | `description` | Item description |
| `product.sales_price` | `unitPrice` | Unit price |

### Currency Handling

Sage primarily uses GBP (British Pounds) but supports multi-currency:
- Default currency: `GBP`
- Supported currencies: `GBP`, `EUR`, `USD`
- Currency conversion: Handled by Sage

## Best Practices

### 1. Error Handling
```javascript
try {
  const response = await fetch('/customers?provider=sage', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Sage API Error:', error);
    throw new Error(error.message);
  }
  
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Request failed:', error);
  throw error;
}
```

### 2. Rate Limit Management
```javascript
const rateLimitInfo = await fetch('/rate-limit?provider=sage', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

const { remaining, reset } = await rateLimitInfo.json();

if (remaining < 10) {
  console.warn('Rate limit approaching, consider slowing down requests');
}
```

### 3. Incremental Sync
```javascript
// Sync data modified since last sync
const lastSync = '2024-01-01T00:00:00Z';
const customers = await fetch(`/customers?provider=sage&modifiedSince=${lastSync}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

### 4. Batch Operations
```javascript
// Process in batches to avoid rate limits
const batchSize = 50;
const allCustomers = [];

for (let i = 0; i < customers.length; i += batchSize) {
  const batch = customers.slice(i, i + batchSize);
  const result = await fetch('/bulk/customers?provider=sage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ entities: batch })
  });
  
  allCustomers.push(...result.success);
  
  // Wait to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## Limitations

1. **Direct Transaction Access**: Sage doesn't provide direct transaction endpoints
2. **Attachment Upload**: Only read-only attachment access (no upload via API)
3. **Historical Data**: Limited historical data access (typically 7 years)
4. **Concurrent Requests**: Limited concurrent request handling
5. **Region Restrictions**: Primarily UK/EU focused

## Support

For Sage-specific issues:
- **Sage Developer Portal**: https://developer.sage.com
- **API Documentation**: https://developer.sage.com/docs
- **Support**: https://support.sage.com

## Migration Guide

### From Sage 50 Desktop
1. Export data from Sage 50
2. Import into Sage Business Cloud
3. Configure API access
4. Test integrations

### From Other Providers
1. Map entities to Sage schema
2. Convert currency to GBP if needed
3. Adjust date formats
4. Test all CRUD operations

This comprehensive documentation should help you integrate with Sage Business Cloud Accounting effectively through the Zuno API. 


================================================
FILE: docs/providers/spiris.md
================================================
[Empty file]


================================================
FILE: src/index.ts
================================================
import { OpenAPIHono } from '@hono/zod-openapi'
 import apiRoutes from './routes/api'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>()

 
app.route('/api/v1', apiRoutes)

app.doc("/openapi", {
  openapi: "3.1.0",
  info: {
    title: "Zuno API",
    version: "1.0.0",
    description: "Unified API for ERP synchronization across multiple providers",
  },
  servers: [{ url: "https://api.zuno.dev" }],
});

app.get(
  "/",
  Scalar({ url: "/openapi", pageTitle: "Midday API", theme: "saturn" }),
);

export default app



================================================
FILE: src/db/schema.ts
================================================
import { sqliteTable, text, integer, blob, index } from 'drizzle-orm/sqlite-core'

// Provider configurations
export const providerConfigs = sqliteTable('provider_configs', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(), // 'xero', 'fortnox', 'qbo'
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'),
  baseUrl: text('base_url'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
}, (table) => ({
  providerTenantIdx: index('provider_tenant_idx').on(table.provider, table.tenantId),
  activeIdx: index('active_idx').on(table.isActive)
}))

// Sync history tracking
export const syncHistory = sqliteTable('sync_history', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  tenantId: text('tenant_id').notNull(),
  entityType: text('entity_type').notNull(), // 'customer', 'invoice', 'transaction', 'attachment'
  operation: text('operation').notNull(), // 'fetch', 'create', 'update', 'delete'
  entityId: text('entity_id'),
  status: text('status').notNull(), // 'pending', 'success', 'failed', 'retry'
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  metadata: text('metadata') // JSON string for additional data
}, (table) => ({
  providerTenantIdx: index('sync_provider_tenant_idx').on(table.provider, table.tenantId),
  statusIdx: index('sync_status_idx').on(table.status),
  entityTypeIdx: index('sync_entity_type_idx').on(table.entityType),
  startedAtIdx: index('sync_started_at_idx').on(table.startedAt)
}))

// Cached entities (for performance and offline capabilities)
export const cachedEntities = sqliteTable('cached_entities', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  tenantId: text('tenant_id').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  externalId: text('external_id').notNull(),
  data: text('data').notNull(), // JSON string of the entity data
  hash: text('hash').notNull(), // For change detection
  lastSyncAt: integer('last_sync_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
}, (table) => ({
  providerTenantEntityIdx: index('cached_provider_tenant_entity_idx').on(table.provider, table.tenantId, table.entityType),
  externalIdIdx: index('cached_external_id_idx').on(table.externalId),
  hashIdx: index('cached_hash_idx').on(table.hash),
  lastSyncIdx: index('cached_last_sync_idx').on(table.lastSyncAt)
}))

// Rate limiting tracking
export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  tenantId: text('tenant_id').notNull(),
  endpoint: text('endpoint').notNull(),
  requestCount: integer('request_count').default(0),
  resetTime: integer('reset_time').notNull(),
  limit: integer('limit').notNull(),
  remaining: integer('remaining').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
}, (table) => ({
  providerTenantEndpointIdx: index('rate_provider_tenant_endpoint_idx').on(table.provider, table.tenantId, table.endpoint),
  resetTimeIdx: index('rate_reset_time_idx').on(table.resetTime)
}))

// Queue jobs tracking
export const queueJobs = sqliteTable('queue_jobs', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  tenantId: text('tenant_id'),
  method: text('method').notNull(),
  args: text('args').notNull(), // JSON string
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  scheduledAt: integer('scheduled_at').notNull(),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  errorMessage: text('error_message'),
  result: text('result'), // JSON string of the result
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
}, (table) => ({
  providerIdx: index('queue_provider_idx').on(table.provider),
  statusIdx: index('queue_status_idx').on(table.status),
  scheduledAtIdx: index('queue_scheduled_at_idx').on(table.scheduledAt),
  retryCountIdx: index('queue_retry_count_idx').on(table.retryCount)
}))

export type ProviderConfig = typeof providerConfigs.$inferSelect
export type NewProviderConfig = typeof providerConfigs.$inferInsert
export type SyncHistory = typeof syncHistory.$inferSelect
export type NewSyncHistory = typeof syncHistory.$inferInsert
export type CachedEntity = typeof cachedEntities.$inferSelect
export type NewCachedEntity = typeof cachedEntities.$inferInsert
export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert
export type QueueJob = typeof queueJobs.$inferSelect
export type NewQueueJob = typeof queueJobs.$inferInsert 


================================================
FILE: src/lib/fileHandler.ts
================================================
import { Attachment } from '../schemas'

// Provider interface for attachment operations (read-only)
export interface AttachmentProvider {
  getAttachments(entityType: string, entityId: string, attachmentType?: string): Promise<Attachment[]>
  getAttachment(id: string): Promise<Attachment>
  downloadAttachment(id: string): Promise<ReadableStream | null>
  getAttachmentMetadata(id: string): Promise<any>
  generateSignedUrl?(attachmentId: string, expiresIn?: number): Promise<string>
  streamAttachment?(attachmentId: string): Promise<ReadableStream>
}

// Attachment proxy handler - forwards read operations to ERP providers
export class AttachmentProxyHandler {
  private providers: Map<string, AttachmentProvider> = new Map()

  constructor(private env: any) {}

  // Register a provider for attachment handling
  registerProvider(name: string, provider: AttachmentProvider) {
    this.providers.set(name, provider)
  }

  // Get attachments for entity from ERP
  async getAttachments(provider: string, entityType: string, entityId: string, attachmentType?: string): Promise<Attachment[]> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    return await providerInstance.getAttachments(entityType, entityId, attachmentType)
  }

  // Get single attachment from ERP
  async getAttachment(provider: string, attachmentId: string): Promise<Attachment> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    return await providerInstance.getAttachment(attachmentId)
  }

  // Download file from ERP via provider
  async downloadFile(provider: string, attachmentId: string): Promise<ReadableStream | null> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    return await providerInstance.downloadAttachment(attachmentId)
  }

  // Get file metadata from ERP
  async getFileMetadata(provider: string, attachmentId: string): Promise<any> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    return await providerInstance.getAttachmentMetadata(attachmentId)
  }

  // Generate signed URL if supported by ERP
  async generateSignedUrl(provider: string, attachmentId: string, expiresIn: number = 3600): Promise<string> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    if (providerInstance.generateSignedUrl) {
      return await providerInstance.generateSignedUrl(attachmentId, expiresIn)
    }

    // Fallback to getting attachment metadata for URL
    const metadata = await this.getFileMetadata(provider, attachmentId)
    return metadata.url || metadata.downloadUrl
  }

  // Proxy streaming for large files
  async streamFile(provider: string, attachmentId: string): Promise<ReadableStream> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }

    if (providerInstance.streamAttachment) {
      return await providerInstance.streamAttachment(attachmentId)
    }

    // Fallback to regular download
    const stream = await this.downloadFile(provider, attachmentId)
    if (!stream) {
      throw new Error('Failed to stream file')
    }
    return stream
  }
}

// Helper function to create attachment proxy handler
export function createFileHandler(env: any): AttachmentProxyHandler {
  return new AttachmentProxyHandler(env)
}

// Export the proxy handler as default
export { AttachmentProxyHandler as default } 


================================================
FILE: src/providers/core.ts
================================================
import { 
  Customer, 
  Vendor, 
  Invoice, 
  Bill, 
  Transaction, 
  Expense, 
  JournalEntry, 
  Payment, 
  Account, 
  Item, 
  Attachment, 
  CompanyInfo, 
  Pagination,
  BulkExport
} from '../schemas'

export interface ProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
  baseUrl?: string
  accessToken?: string
  refreshToken?: string
  tenantId?: string
  apiVersion?: string
  environment?: 'production' | 'sandbox'
}

export interface ProviderAuth {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  tenantId?: string
  scope?: string[]
}

export interface SyncOptions {
  modifiedSince?: Date
  includeArchived?: boolean
  includeDeleted?: boolean
  batchSize?: number
  page?: number
  limit?: number
  cursor?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
  status?: string
  entityId?: string
  entityType?: string
  includeAttachments?: boolean
  includeCustomFields?: boolean
  includeRawData?: boolean
}

export interface SyncResult<T> {
  data: T[]
  pagination?: Pagination
  hasMore: boolean
  cursor?: string
  total?: number
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
  retryAfter?: number
}

export interface WebhookEvent {
  id: string
  type: string
  data: any
  timestamp: Date
  signature?: string
}

export interface ExportJobStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalRecords?: number
  processedRecords?: number
  downloadUrl?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

export abstract class CoreProvider {
  protected config: ProviderConfig
  protected auth?: ProviderAuth
  
  constructor(config: ProviderConfig) {
    this.config = config
  }

  // Authentication methods
  abstract getAuthUrl(scopes: string[]): string
  abstract exchangeCodeForToken(code: string): Promise<ProviderAuth>
  abstract refreshAccessToken(): Promise<ProviderAuth>
  abstract validateAuth(): Promise<boolean>
  abstract revokeAuth(): Promise<void>

  // Company information
  abstract getCompanyInfo(): Promise<CompanyInfo>

  // Account operations (Chart of Accounts)
  abstract getAccounts(options?: SyncOptions): Promise<SyncResult<Account>>
  abstract getAccount(id: string): Promise<Account>
  abstract createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account>
  abstract updateAccount(id: string, account: Partial<Account>): Promise<Account>
  abstract deleteAccount(id: string): Promise<void>

  // Customer operations
  abstract getCustomers(options?: SyncOptions): Promise<SyncResult<Customer>>
  abstract getCustomer(id: string): Promise<Customer>
  abstract createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer>
  abstract updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer>
  abstract deleteCustomer(id: string): Promise<void>

  // Vendor operations
  abstract getVendors(options?: SyncOptions): Promise<SyncResult<Vendor>>
  abstract getVendor(id: string): Promise<Vendor>
  abstract createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor>
  abstract updateVendor(id: string, vendor: Partial<Vendor>): Promise<Vendor>
  abstract deleteVendor(id: string): Promise<void>

  // Item operations
  abstract getItems(options?: SyncOptions): Promise<SyncResult<Item>>
  abstract getItem(id: string): Promise<Item>
  abstract createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item>
  abstract updateItem(id: string, item: Partial<Item>): Promise<Item>
  abstract deleteItem(id: string): Promise<void>

  // Invoice operations
  abstract getInvoices(options?: SyncOptions): Promise<SyncResult<Invoice>>
  abstract getInvoice(id: string): Promise<Invoice>
  abstract createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>
  abstract updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice>
  abstract deleteInvoice(id: string): Promise<void>
  abstract sendInvoice(id: string, options?: { email?: string; subject?: string; message?: string }): Promise<void>

  // Bill operations
  abstract getBills(options?: SyncOptions): Promise<SyncResult<Bill>>
  abstract getBill(id: string): Promise<Bill>
  abstract createBill(bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bill>
  abstract updateBill(id: string, bill: Partial<Bill>): Promise<Bill>
  abstract deleteBill(id: string): Promise<void>

  // Transaction operations
  abstract getTransactions(options?: SyncOptions): Promise<SyncResult<Transaction>>
  abstract getTransaction(id: string): Promise<Transaction>
  abstract createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>
  abstract updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction>
  abstract deleteTransaction(id: string): Promise<void>
  abstract reconcileTransaction(id: string, bankTransactionId: string): Promise<Transaction>

  // Expense operations
  abstract getExpenses(options?: SyncOptions): Promise<SyncResult<Expense>>
  abstract getExpense(id: string): Promise<Expense>
  abstract createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense>
  abstract updateExpense(id: string, expense: Partial<Expense>): Promise<Expense>
  abstract deleteExpense(id: string): Promise<void>
  abstract submitExpense(id: string): Promise<Expense>
  abstract approveExpense(id: string): Promise<Expense>
  abstract rejectExpense(id: string, reason?: string): Promise<Expense>

  // Journal Entry operations
  abstract getJournalEntries(options?: SyncOptions): Promise<SyncResult<JournalEntry>>
  abstract getJournalEntry(id: string): Promise<JournalEntry>
  abstract createJournalEntry(journalEntry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry>
  abstract updateJournalEntry(id: string, journalEntry: Partial<JournalEntry>): Promise<JournalEntry>
  abstract deleteJournalEntry(id: string): Promise<void>
  abstract postJournalEntry(id: string): Promise<JournalEntry>

  // Payment operations
  abstract getPayments(options?: SyncOptions): Promise<SyncResult<Payment>>
  abstract getPayment(id: string): Promise<Payment>
  abstract createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>
  abstract updatePayment(id: string, payment: Partial<Payment>): Promise<Payment>
  abstract deletePayment(id: string): Promise<void>
  abstract processPayment(id: string): Promise<Payment>

  // Attachment operations (read-only)
  abstract getAttachments(entityType: string, entityId: string, attachmentType?: string): Promise<Attachment[]>
  abstract getAttachment(id: string): Promise<Attachment>
  abstract downloadAttachment(id: string): Promise<ReadableStream | null>
  abstract getAttachmentMetadata(id: string): Promise<any>
  
  // Optional attachment methods
  generateSignedUrl?(attachmentId: string, expiresIn?: number): Promise<string>
  streamAttachment?(attachmentId: string): Promise<ReadableStream>

  // Bulk operations
  abstract bulkCreate<T>(entityType: string, entities: T[]): Promise<{ success: T[]; failed: { entity: T; error: string }[] }>
  abstract bulkUpdate<T>(entityType: string, entities: { id: string; data: Partial<T> }[]): Promise<{ success: T[]; failed: { id: string; error: string }[] }>
  abstract bulkDelete(entityType: string, ids: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }>

  // Export operations
  abstract startBulkExport(request: BulkExport): Promise<string> // Returns job ID
  abstract getBulkExportStatus(jobId: string): Promise<ExportJobStatus>
  abstract downloadBulkExport(jobId: string): Promise<ReadableStream>
  abstract cancelBulkExport(jobId: string): Promise<void>

  // Search operations
  abstract searchEntities(entityType: string, query: string, options?: SyncOptions): Promise<SyncResult<any>>
  abstract searchAttachments(query: string, entityType?: string, entityId?: string): Promise<Attachment[]>

  // Webhook operations
  abstract createWebhook(url: string, events: string[]): Promise<{ id: string; secret: string }>
  abstract updateWebhook(id: string, url?: string, events?: string[]): Promise<void>
  abstract deleteWebhook(id: string): Promise<void>
  abstract getWebhooks(): Promise<{ id: string; url: string; events: string[]; active: boolean }[]>
  abstract verifyWebhook(payload: string, signature: string, secret: string): boolean
  abstract processWebhook(payload: WebhookEvent): Promise<void>

  // Reporting operations
  abstract getBalanceSheet(date?: Date, options?: { includeComparison?: boolean }): Promise<any>
  abstract getIncomeStatement(startDate?: Date, endDate?: Date, options?: { includeComparison?: boolean }): Promise<any>
  abstract getCashFlowStatement(startDate?: Date, endDate?: Date): Promise<any>
  abstract getTrialBalance(date?: Date): Promise<any>
  abstract getAgingReport(type: 'receivables' | 'payables', date?: Date): Promise<any>

  // Utility methods
  abstract getRateLimitInfo(): Promise<RateLimitInfo>
  abstract getProviderInfo(): { name: string; version: string; capabilities: string[] }
  abstract validateEntity(entityType: string, data: any): Promise<{ valid: boolean; errors: string[] }>
  abstract transformEntity(entityType: string, data: any, direction: 'to' | 'from'): Promise<any>
  abstract getMetadata(entityType: string): Promise<{ fields: any; relationships: any; actions: string[] }>

  // Helper methods for providers
  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = new URL(endpoint, this.config.baseUrl)
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    if (this.auth?.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.auth.accessToken}`
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url.toString(), requestOptions)

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      if (retryAfter) {
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
        return this.makeRequest(endpoint, method, data, headers)
      }
    }

    // Handle auth errors
    if (response.status === 401 && this.auth?.refreshToken) {
      try {
        await this.refreshAccessToken()
        const updatedHeaders: Record<string, string> = { ...requestHeaders }
        updatedHeaders['Authorization'] = `Bearer ${this.auth.accessToken}`
        return fetch(url.toString(), { ...requestOptions, headers: updatedHeaders })
      } catch (error) {
        throw new Error('Authentication failed and refresh token is invalid')
      }
    }

    return response
  }

  protected handleError(error: any, context?: string): never {
    const message = context ? `${context}: ${error.message}` : error.message
    throw new Error(message)
  }

  protected validateConfig(): void {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Client ID and Client Secret are required')
    }
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
    throw new Error('Max retries exceeded')
  }

  protected generateChecksum(data: string): string {
    // Simple checksum for data integrity
    let checksum = 0
    for (let i = 0; i < data.length; i++) {
      checksum += data.charCodeAt(i)
    }
    return checksum.toString(16)
  }

  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  protected parseDate(dateString: string): Date {
    return new Date(dateString)
  }

  protected sanitizeData(data: any): any {
    // Remove sensitive information before logging
    const sanitized = { ...data }
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth']
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    return sanitized
  }
} 


================================================
FILE: src/providers/fortnox.ts
================================================
import { CoreProvider, ProviderConfig, ProviderAuth, SyncOptions, SyncResult, RateLimitInfo } from './core'
import { 
  Customer, 
  Vendor, 
  Item, 
  Invoice, 
  Bill, 
  Transaction, 
  Expense, 
  JournalEntry, 
  Payment, 
  Account, 
  Attachment, 
  CompanyInfo,
  BulkExport 
} from '../schemas'

export class FortnoxProvider extends CoreProvider {
  private baseUrl = 'https://api.fortnox.se/3'
  
  constructor(config: ProviderConfig) {
    super(config)
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    }
  }

  getAuthUrl(scopes: string[]): string {
    // Fortnox uses a different OAuth2 flow
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || '',
      scope: scopes.join(' '),
      state: crypto.randomUUID()
    })
    
    return `https://apps.fortnox.se/oauth-v1/auth?${params.toString()}`
  }

  async exchangeCodeForToken(code: string): Promise<ProviderAuth> {
    const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri || ''
      })
    })

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
  }

  async refreshAccessToken(): Promise<ProviderAuth> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch('https://apps.fortnox.se/oauth-v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.auth.refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    const newAuth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
    
    this.setAuth(newAuth)
    return newAuth
  }

  async validateAuth(): Promise<boolean> {
    if (!this.auth?.accessToken) {
      return false
    }

    try {
      const response = await this.request('/companyinformation')
      return response.ok
    } catch {
      return false
    }
  }

  // Transform data to unified format
  private transformCustomer(fortnoxCustomer: any): Customer {
    return {
      id: fortnoxCustomer.CustomerNumber,
      name: fortnoxCustomer.Name,
      displayName: fortnoxCustomer.Name,
      email: fortnoxCustomer.Email,
      website: fortnoxCustomer.WWW,
      phone: fortnoxCustomer.Phone1 ? {
        number: fortnoxCustomer.Phone1,
        type: 'work' as any
      } : undefined,
      addresses: [{
        type: 'billing' as any,
        street: fortnoxCustomer.Address1,
        street2: fortnoxCustomer.Address2,
        city: fortnoxCustomer.City,
        postalCode: fortnoxCustomer.ZipCode,
        country: fortnoxCustomer.Country
      }].filter(addr => addr.street || addr.city),
      taxNumber: fortnoxCustomer.OrganisationNumber,
      currency: fortnoxCustomer.Currency || 'SEK',
      paymentTerms: fortnoxCustomer.TermsOfPayment,
      isActive: fortnoxCustomer.Active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private transformVendor(fortnoxSupplier: any): Vendor {
    return {
      id: fortnoxSupplier.SupplierNumber,
      name: fortnoxSupplier.Name,
      displayName: fortnoxSupplier.Name,
      email: fortnoxSupplier.Email,
      website: fortnoxSupplier.WWW,
      phone: fortnoxSupplier.Phone1 ? {
        number: fortnoxSupplier.Phone1,
        type: 'work' as any
      } : undefined,
      addresses: [{
        type: 'billing' as any,
        street: fortnoxSupplier.Address1,
        street2: fortnoxSupplier.Address2,
        city: fortnoxSupplier.City,
        postalCode: fortnoxSupplier.ZipCode,
        country: fortnoxSupplier.Country
      }].filter(addr => addr.street || addr.city),
      taxNumber: fortnoxSupplier.OrganisationNumber,
      currency: fortnoxSupplier.Currency || 'SEK',
      paymentTerms: fortnoxSupplier.TermsOfPayment,
      isActive: fortnoxSupplier.Active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private transformInvoice(fortnoxInvoice: any): Invoice {
    return {
      id: fortnoxInvoice.DocumentNumber,
      number: fortnoxInvoice.DocumentNumber,
      customerId: fortnoxInvoice.CustomerNumber,
      customerName: fortnoxInvoice.CustomerName,
      issueDate: fortnoxInvoice.InvoiceDate,
      dueDate: fortnoxInvoice.DueDate,
      status: this.mapInvoiceStatus(fortnoxInvoice.Cancelled, fortnoxInvoice.Booked),
      currency: fortnoxInvoice.Currency || 'SEK',
      subtotal: fortnoxInvoice.Net,
      taxTotal: fortnoxInvoice.Tax,
      total: fortnoxInvoice.Total,
      amountDue: fortnoxInvoice.Balance,
      reference: fortnoxInvoice.YourReference,
      lineItems: fortnoxInvoice.InvoiceRows?.map((row: any) => ({
        id: row.RowId,
        itemId: row.ArticleNumber,
        description: row.Description,
        quantity: row.DeliveredQuantity,
        unitPrice: row.Price,
        discount: row.Discount,
        total: row.Total,
        taxAmount: row.VAT,
        accountId: row.AccountNumber
      })) || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private mapInvoiceStatus(cancelled: boolean, booked: boolean): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void' {
    if (cancelled) return 'cancelled'
    if (!booked) return 'draft'
    return 'sent'
  }

  // Helper methods to transform our data to Fortnox format
  private customerToFortnox(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      Name: customer.name,
      Email: customer.email,
      WWW: customer.website,
      Phone1: customer.phone?.number,
      Address1: customer.addresses?.[0]?.street,
      Address2: customer.addresses?.[0]?.street2,
      City: customer.addresses?.[0]?.city,
      ZipCode: customer.addresses?.[0]?.postalCode,
      Country: customer.addresses?.[0]?.country,
      OrganisationNumber: customer.taxNumber,
      Currency: customer.currency || 'SEK',
      TermsOfPayment: customer.paymentTerms,
      Active: customer.isActive !== false
    }
  }

  private vendorToFortnox(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      Name: vendor.name,
      Email: vendor.email,
      WWW: vendor.website,
      Phone1: vendor.phone?.number,
      Address1: vendor.addresses?.[0]?.street,
      Address2: vendor.addresses?.[0]?.street2,
      City: vendor.addresses?.[0]?.city,
      ZipCode: vendor.addresses?.[0]?.postalCode,
      Country: vendor.addresses?.[0]?.country,
      OrganisationNumber: vendor.taxNumber,
      Currency: vendor.currency || 'SEK',
      TermsOfPayment: vendor.paymentTerms,
      Active: vendor.isActive !== false
    }
  }

  private invoiceToFortnox(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): any {
    return {
      CustomerNumber: invoice.customerId,
      InvoiceDate: invoice.issueDate,
      DueDate: invoice.dueDate,
      Currency: invoice.currency || 'SEK',
      YourReference: invoice.reference,
      Comments: invoice.notes,
      InvoiceRows: invoice.lineItems?.map(item => ({
        ArticleNumber: item.itemId,
        Description: item.description,
        DeliveredQuantity: item.quantity,
        Price: item.unitPrice,
        Discount: item.discount,
        AccountNumber: item.accountId
      })) || []
    }
  }

  // Company Info
  async getCompanyInfo(): Promise<CompanyInfo> {
    const response = await this.request('/companyinformation')
    if (!response.ok) {
      throw new Error(`Failed to get company info: ${response.statusText}`)
    }

    const data = await response.json() as any
    const company = data.CompanyInformation

    return {
      id: company.OrganisationNumber,
      name: company.CompanyName,
      legalName: company.CompanyName,
      email: company.Email,
      phone: company.Phone,
      addresses: [{
        type: 'billing' as any,
        street: company.Address1,
        street2: company.Address2,
        city: company.City,
        postalCode: company.ZipCode,
        country: company.Country
      }].filter(addr => addr.street || addr.city),
      taxNumber: company.OrganisationNumber,
      baseCurrency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  // Account operations
  async getAccounts(options?: SyncOptions): Promise<SyncResult<Account>> {
    const response = await this.request('/accounts')
    if (!response.ok) {
      throw new Error(`Failed to get accounts: ${response.statusText}`)
    }

    const data = await response.json() as any
    const accounts = data.Accounts.map((acc: any) => ({
      id: acc.Number,
      name: acc.Description,
      code: acc.Number,
      description: acc.Description,
      accountType: this.mapAccountType(acc.Number),
      isActive: acc.Active,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    return {
      data: accounts,
      hasMore: false,
      pagination: {
        page: 1,
        limit: accounts.length,
        total: accounts.length,
        hasNext: false
      }
    }
  }

  private mapAccountType(accountNumber: string): 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'accounts_receivable' | 'accounts_payable' | 'bank' | 'credit_card' | 'current_asset' | 'fixed_asset' | 'other_asset' | 'current_liability' | 'long_term_liability' | 'cost_of_goods_sold' | 'other_income' | 'other_expense' {
    const num = parseInt(accountNumber)
    if (num >= 1000 && num <= 1999) return 'asset'
    if (num >= 2000 && num <= 2999) return 'liability'
    if (num >= 3000 && num <= 3999) return 'income'
    if (num >= 4000 && num <= 7999) return 'expense'
    if (num >= 8000 && num <= 8999) return 'other_expense'
    return 'other_asset'
  }

  async getAccount(id: string): Promise<Account> {
    const response = await this.request(`/accounts/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to get account: ${response.statusText}`)
    }

    const data = await response.json() as any
    const acc = data.Account

    return {
      id: acc.Number,
      name: acc.Description,
      code: acc.Number,
      description: acc.Description,
      accountType: this.mapAccountType(acc.Number),
      isActive: acc.Active,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const fortnoxAccount = {
      Number: account.code,
      Description: account.name,
      Active: account.isActive !== false
    }

    const response = await this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ Account: fortnoxAccount })
    })

    if (!response.ok) {
      throw new Error(`Failed to create account: ${response.statusText}`)
    }

    const data = await response.json() as any
    const acc = data.Account

    return {
      id: acc.Number,
      name: acc.Description,
      code: acc.Number,
      description: acc.Description,
      accountType: this.mapAccountType(acc.Number),
      isActive: acc.Active,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateAccount(id: string, account: Partial<Account>): Promise<Account> {
    const fortnoxAccount: any = {}
    
    if (account.name) fortnoxAccount.Description = account.name
    if (account.isActive !== undefined) fortnoxAccount.Active = account.isActive

    const response = await this.request(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Account: fortnoxAccount })
    })

    if (!response.ok) {
      throw new Error(`Failed to update account: ${response.statusText}`)
    }

    const data = await response.json() as any
    const acc = data.Account

    return {
      id: acc.Number,
      name: acc.Description,
      code: acc.Number,
      description: acc.Description,
      accountType: this.mapAccountType(acc.Number),
      isActive: acc.Active,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async deleteAccount(id: string): Promise<void> {
    const response = await this.request(`/accounts/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete account: ${response.statusText}`)
    }
  }

  // Customer operations (Full CRUD)
  async getCustomers(options?: SyncOptions): Promise<SyncResult<Customer>> {
    const params = new URLSearchParams()
    
    if (options?.includeArchived === false) {
      params.append('filter', 'active')
    }

    const response = await this.request(`/customers?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get customers: ${response.statusText}`)
    }

    const data = await response.json() as any
    const customers = data.Customers.map(this.transformCustomer.bind(this))

    return {
      data: customers,
      hasMore: false,
      pagination: {
        page: 1,
        limit: customers.length,
        total: customers.length,
        hasNext: false
      }
    }
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.request(`/customers/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get customer: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformCustomer(data.Customer)
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const fortnoxCustomer = this.customerToFortnox(customer)

    const response = await this.request('/customers', {
      method: 'POST',
      body: JSON.stringify({ Customer: fortnoxCustomer })
    })

    if (!response.ok) {
      throw new Error(`Failed to create customer: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformCustomer(data.Customer)
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    const fortnoxCustomer: any = {}
    
    if (customer.name) fortnoxCustomer.Name = customer.name
    if (customer.email) fortnoxCustomer.Email = customer.email
    if (customer.website) fortnoxCustomer.WWW = customer.website
    if (customer.phone?.number) fortnoxCustomer.Phone1 = customer.phone.number
    if (customer.addresses?.[0]) {
      const addr = customer.addresses[0]
      if (addr.street) fortnoxCustomer.Address1 = addr.street
      if (addr.street2) fortnoxCustomer.Address2 = addr.street2
      if (addr.city) fortnoxCustomer.City = addr.city
      if (addr.postalCode) fortnoxCustomer.ZipCode = addr.postalCode
      if (addr.country) fortnoxCustomer.Country = addr.country
    }
    if (customer.taxNumber) fortnoxCustomer.OrganisationNumber = customer.taxNumber
    if (customer.currency) fortnoxCustomer.Currency = customer.currency
    if (customer.paymentTerms) fortnoxCustomer.TermsOfPayment = customer.paymentTerms
    if (customer.isActive !== undefined) fortnoxCustomer.Active = customer.isActive

    const response = await this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Customer: fortnoxCustomer })
    })

    if (!response.ok) {
      throw new Error(`Failed to update customer: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformCustomer(data.Customer)
  }

  async deleteCustomer(id: string): Promise<void> {
    const response = await this.request(`/customers/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete customer: ${response.statusText}`)
    }
  }

  // Vendor operations (Full CRUD)
  async getVendors(options?: SyncOptions): Promise<SyncResult<Vendor>> {
    const params = new URLSearchParams()
    
    if (options?.includeArchived === false) {
      params.append('filter', 'active')
    }

    const response = await this.request(`/suppliers?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get vendors: ${response.statusText}`)
    }

    const data = await response.json() as any
    const vendors = data.Suppliers.map(this.transformVendor.bind(this))

    return {
      data: vendors,
      hasMore: false,
      pagination: {
        page: 1,
        limit: vendors.length,
        total: vendors.length,
        hasNext: false
      }
    }
  }

  async getVendor(id: string): Promise<Vendor> {
    const response = await this.request(`/suppliers/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get vendor: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformVendor(data.Supplier)
  }

  async createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const fortnoxSupplier = this.vendorToFortnox(vendor)

    const response = await this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ Supplier: fortnoxSupplier })
    })

    if (!response.ok) {
      throw new Error(`Failed to create vendor: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformVendor(data.Supplier)
  }

  async updateVendor(id: string, vendor: Partial<Vendor>): Promise<Vendor> {
    const fortnoxSupplier: any = {}
    
    if (vendor.name) fortnoxSupplier.Name = vendor.name
    if (vendor.email) fortnoxSupplier.Email = vendor.email
    if (vendor.website) fortnoxSupplier.WWW = vendor.website
    if (vendor.phone?.number) fortnoxSupplier.Phone1 = vendor.phone.number
    if (vendor.addresses?.[0]) {
      const addr = vendor.addresses[0]
      if (addr.street) fortnoxSupplier.Address1 = addr.street
      if (addr.street2) fortnoxSupplier.Address2 = addr.street2
      if (addr.city) fortnoxSupplier.City = addr.city
      if (addr.postalCode) fortnoxSupplier.ZipCode = addr.postalCode
      if (addr.country) fortnoxSupplier.Country = addr.country
    }
    if (vendor.taxNumber) fortnoxSupplier.OrganisationNumber = vendor.taxNumber
    if (vendor.currency) fortnoxSupplier.Currency = vendor.currency
    if (vendor.paymentTerms) fortnoxSupplier.TermsOfPayment = vendor.paymentTerms
    if (vendor.isActive !== undefined) fortnoxSupplier.Active = vendor.isActive

    const response = await this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Supplier: fortnoxSupplier })
    })

    if (!response.ok) {
      throw new Error(`Failed to update vendor: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformVendor(data.Supplier)
  }

  async deleteVendor(id: string): Promise<void> {
    const response = await this.request(`/suppliers/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete vendor: ${response.statusText}`)
    }
  }

  // Item operations (Full CRUD)
  async getItems(options?: SyncOptions): Promise<SyncResult<Item>> {
    const response = await this.request('/articles')
    
    if (!response.ok) {
      throw new Error(`Failed to get items: ${response.statusText}`)
    }

    const data = await response.json() as any
    const items = data.Articles.map((article: any) => ({
      id: article.ArticleNumber,
      name: article.Description,
      code: article.ArticleNumber,
      description: article.Description,
      unitPrice: article.PurchasePrice || article.SalesPrice,
      currency: 'SEK',
      isActive: article.Active,
      isSold: true,
      isPurchased: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    return {
      data: items,
      hasMore: false,
      pagination: {
        page: 1,
        limit: items.length,
        total: items.length,
        hasNext: false
      }
    }
  }

  async getItem(id: string): Promise<Item> {
    const response = await this.request(`/articles/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get item: ${response.statusText}`)
    }

    const data = await response.json() as any
    const article = data.Article

    return {
      id: article.ArticleNumber,
      name: article.Description,
      code: article.ArticleNumber,
      description: article.Description,
      unitPrice: article.PurchasePrice || article.SalesPrice,
      currency: 'SEK',
      isActive: article.Active,
      isSold: true,
      isPurchased: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    const fortnoxArticle = {
      ArticleNumber: item.code,
      Description: item.name,
      PurchasePrice: item.unitPrice,
      SalesPrice: item.unitPrice,
      Active: item.isActive !== false
    }

    const response = await this.request('/articles', {
      method: 'POST',
      body: JSON.stringify({ Article: fortnoxArticle })
    })

    if (!response.ok) {
      throw new Error(`Failed to create item: ${response.statusText}`)
    }

    const data = await response.json() as any
    const article = data.Article

    return {
      id: article.ArticleNumber,
      name: article.Description,
      code: article.ArticleNumber,
      description: article.Description,
      unitPrice: article.PurchasePrice || article.SalesPrice,
      currency: 'SEK',
      isActive: article.Active,
      isSold: true,
      isPurchased: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateItem(id: string, item: Partial<Item>): Promise<Item> {
    const fortnoxArticle: any = {}
    
    if (item.name) fortnoxArticle.Description = item.name
    if (item.unitPrice) {
      fortnoxArticle.PurchasePrice = item.unitPrice
      fortnoxArticle.SalesPrice = item.unitPrice
    }
    if (item.isActive !== undefined) fortnoxArticle.Active = item.isActive

    const response = await this.request(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Article: fortnoxArticle })
    })

    if (!response.ok) {
      throw new Error(`Failed to update item: ${response.statusText}`)
    }

    const data = await response.json() as any
    const article = data.Article

    return {
      id: article.ArticleNumber,
      name: article.Description,
      code: article.ArticleNumber,
      description: article.Description,
      unitPrice: article.PurchasePrice || article.SalesPrice,
      currency: 'SEK',
      isActive: article.Active,
      isSold: true,
      isPurchased: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async deleteItem(id: string): Promise<void> {
    const response = await this.request(`/articles/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete item: ${response.statusText}`)
    }
  }

  // Invoice operations (Full CRUD)
  async getInvoices(options?: SyncOptions): Promise<SyncResult<Invoice>> {
    const params = new URLSearchParams()
    
    if (options?.modifiedSince) {
      params.append('lastmodified', options.modifiedSince.toISOString().split('T')[0])
    }

    const response = await this.request(`/invoices?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get invoices: ${response.statusText}`)
    }

    const data = await response.json() as any
    const invoices = data.Invoices.map(this.transformInvoice.bind(this))

    return {
      data: invoices,
      hasMore: false,
      pagination: {
        page: 1,
        limit: invoices.length,
        total: invoices.length,
        hasNext: false
      }
    }
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await this.request(`/invoices/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get invoice: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformInvoice(data.Invoice)
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const fortnoxInvoice = this.invoiceToFortnox(invoice)

    const response = await this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify({ Invoice: fortnoxInvoice })
    })

    if (!response.ok) {
      throw new Error(`Failed to create invoice: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformInvoice(data.Invoice)
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const fortnoxInvoice: any = {}
    
    if (invoice.customerId) fortnoxInvoice.CustomerNumber = invoice.customerId
    if (invoice.issueDate) fortnoxInvoice.InvoiceDate = invoice.issueDate
    if (invoice.dueDate) fortnoxInvoice.DueDate = invoice.dueDate
    if (invoice.currency) fortnoxInvoice.Currency = invoice.currency
    if (invoice.reference) fortnoxInvoice.YourReference = invoice.reference
    if (invoice.notes) fortnoxInvoice.Comments = invoice.notes
    if (invoice.lineItems) {
      fortnoxInvoice.InvoiceRows = invoice.lineItems.map(item => ({
        ArticleNumber: item.itemId,
        Description: item.description,
        DeliveredQuantity: item.quantity,
        Price: item.unitPrice,
        Discount: item.discount,
        AccountNumber: item.accountId
      }))
    }

    const response = await this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Invoice: fortnoxInvoice })
    })

    if (!response.ok) {
      throw new Error(`Failed to update invoice: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformInvoice(data.Invoice)
  }

  async deleteInvoice(id: string): Promise<void> {
    const response = await this.request(`/invoices/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete invoice: ${response.statusText}`)
    }
  }

  async sendInvoice(id: string, options?: { email?: string; subject?: string; message?: string }): Promise<void> {
    // Fortnox has a specific endpoint for sending invoices
    const response = await this.request(`/invoices/${id}/email`, {
      method: 'GET' // Fortnox uses GET to send invoices
    })

    if (!response.ok) {
      throw new Error(`Failed to send invoice: ${response.statusText}`)
    }
  }

  // Bill operations (Full CRUD)
  async getBills(options?: SyncOptions): Promise<SyncResult<Bill>> {
    const response = await this.request('/supplierinvoices')
    
    if (!response.ok) {
      throw new Error(`Failed to get bills: ${response.statusText}`)
    }

    const data = await response.json() as any
    const bills = data.SupplierInvoices?.map((invoice: any) => ({
      id: invoice.GivenNumber,
      number: invoice.InvoiceNumber,
      vendorId: invoice.SupplierNumber,
      vendorName: invoice.SupplierName,
      issueDate: invoice.InvoiceDate,
      dueDate: invoice.DueDate,
      status: invoice.Cancelled ? 'cancelled' as any : 'sent' as any,
      currency: invoice.Currency || 'SEK',
      subtotal: invoice.Net,
      taxTotal: invoice.VAT,
      total: invoice.Total,
      amountDue: invoice.Balance,
      reference: invoice.YourReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) || []

    return {
      data: bills,
      hasMore: false,
      pagination: {
        page: 1,
        limit: bills.length,
        total: bills.length,
        hasNext: false
      }
    }
  }

  async getBill(id: string): Promise<Bill> {
    const response = await this.request(`/supplierinvoices/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get bill: ${response.statusText}`)
    }

    const data = await response.json() as any
    const invoice = data.SupplierInvoice

    return {
      id: invoice.GivenNumber,
      number: invoice.InvoiceNumber,
      vendorId: invoice.SupplierNumber,
      vendorName: invoice.SupplierName,
      issueDate: invoice.InvoiceDate,
      dueDate: invoice.DueDate,
      status: invoice.Cancelled ? 'cancelled' as any : 'sent' as any,
      currency: invoice.Currency || 'SEK',
      subtotal: invoice.Net,
      taxTotal: invoice.VAT,
      total: invoice.Total,
      amountDue: invoice.Balance,
      reference: invoice.YourReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async createBill(bill: Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bill> {
    const fortnoxBill = {
      SupplierNumber: bill.vendorId,
      InvoiceNumber: bill.number,
      InvoiceDate: bill.issueDate,
      DueDate: bill.dueDate,
      Currency: bill.currency || 'SEK',
      YourReference: bill.reference,
      Total: bill.total
    }

    const response = await this.request('/supplierinvoices', {
      method: 'POST',
      body: JSON.stringify({ SupplierInvoice: fortnoxBill })
    })

    if (!response.ok) {
      throw new Error(`Failed to create bill: ${response.statusText}`)
    }

    const data = await response.json() as any
    const invoice = data.SupplierInvoice

    return {
      id: invoice.GivenNumber,
      number: invoice.InvoiceNumber,
      vendorId: invoice.SupplierNumber,
      vendorName: invoice.SupplierName,
      issueDate: invoice.InvoiceDate,
      dueDate: invoice.DueDate,
      status: invoice.Cancelled ? 'cancelled' as any : 'sent' as any,
      currency: invoice.Currency || 'SEK',
      subtotal: invoice.Net,
      taxTotal: invoice.VAT,
      total: invoice.Total,
      amountDue: invoice.Balance,
      reference: invoice.YourReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateBill(id: string, bill: Partial<Bill>): Promise<Bill> {
    const fortnoxBill: any = {}
    
    if (bill.vendorId) fortnoxBill.SupplierNumber = bill.vendorId
    if (bill.number) fortnoxBill.InvoiceNumber = bill.number
    if (bill.issueDate) fortnoxBill.InvoiceDate = bill.issueDate
    if (bill.dueDate) fortnoxBill.DueDate = bill.dueDate
    if (bill.currency) fortnoxBill.Currency = bill.currency
    if (bill.reference) fortnoxBill.YourReference = bill.reference
    if (bill.total) fortnoxBill.Total = bill.total

    const response = await this.request(`/supplierinvoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ SupplierInvoice: fortnoxBill })
    })

    if (!response.ok) {
      throw new Error(`Failed to update bill: ${response.statusText}`)
    }

    const data = await response.json() as any
    const invoice = data.SupplierInvoice

    return {
      id: invoice.GivenNumber,
      number: invoice.InvoiceNumber,
      vendorId: invoice.SupplierNumber,
      vendorName: invoice.SupplierName,
      issueDate: invoice.InvoiceDate,
      dueDate: invoice.DueDate,
      status: invoice.Cancelled ? 'cancelled' as any : 'sent' as any,
      currency: invoice.Currency || 'SEK',
      subtotal: invoice.Net,
      taxTotal: invoice.VAT,
      total: invoice.Total,
      amountDue: invoice.Balance,
      reference: invoice.YourReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async deleteBill(id: string): Promise<void> {
    const response = await this.request(`/supplierinvoices/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete bill: ${response.statusText}`)
    }
  }

  // Transaction operations (Limited support)
  async getTransactions(options?: SyncOptions): Promise<SyncResult<Transaction>> {
    // Fortnox doesn't have a direct transactions endpoint
    return {
      data: [],
      hasMore: false,
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        hasNext: false
      }
    }
  }

  async getTransaction(id: string): Promise<Transaction> {
    throw new Error('Transaction retrieval not supported by Fortnox')
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    throw new Error('Direct transaction creation not supported by Fortnox')
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    throw new Error('Direct transaction updates not supported by Fortnox')
  }

  async deleteTransaction(id: string): Promise<void> {
    throw new Error('Direct transaction deletion not supported by Fortnox')
  }

  async reconcileTransaction(id: string, bankTransactionId: string): Promise<Transaction> {
    throw new Error('Transaction reconciliation not supported by Fortnox')
  }

  // Expense operations (Limited support)
  async getExpenses(options?: SyncOptions): Promise<SyncResult<Expense>> {
    // Fortnox doesn't have a direct expenses endpoint
    return {
      data: [],
      hasMore: false,
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        hasNext: false
      }
    }
  }

  async getExpense(id: string): Promise<Expense> {
    throw new Error('Expense retrieval not supported by Fortnox')
  }

  async createExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    throw new Error('Direct expense creation not supported by Fortnox')
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    throw new Error('Direct expense updates not supported by Fortnox')
  }

  async deleteExpense(id: string): Promise<void> {
    throw new Error('Direct expense deletion not supported by Fortnox')
  }

  async submitExpense(id: string): Promise<Expense> {
    throw new Error('Expense submission not supported by Fortnox')
  }

  async approveExpense(id: string): Promise<Expense> {
    throw new Error('Expense approval not supported by Fortnox')
  }

  async rejectExpense(id: string, reason?: string): Promise<Expense> {
    throw new Error('Expense rejection not supported by Fortnox')
  }

  // Journal Entry operations (Full CRUD)
  async getJournalEntries(options?: SyncOptions): Promise<SyncResult<JournalEntry>> {
    const response = await this.request('/vouchers')
    
    if (!response.ok) {
      throw new Error(`Failed to get journal entries: ${response.statusText}`)
    }

    const data = await response.json() as any
    const journalEntries = data.Vouchers?.map((voucher: any) => ({
      id: voucher.VoucherNumber,
      number: voucher.VoucherNumber,
      date: voucher.TransactionDate,
      description: voucher.Description,
      reference: voucher.ReferenceNumber,
      status: 'posted' as any,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) || []

    return {
      data: journalEntries,
      hasMore: false,
      pagination: {
        page: 1,
        limit: journalEntries.length,
        total: journalEntries.length,
        hasNext: false
      }
    }
  }

  async getJournalEntry(id: string): Promise<JournalEntry> {
    const response = await this.request(`/vouchers/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get journal entry: ${response.statusText}`)
    }

    const data = await response.json() as any
    const voucher = data.Voucher

    return {
      id: voucher.VoucherNumber,
      number: voucher.VoucherNumber,
      date: voucher.TransactionDate,
      description: voucher.Description,
      reference: voucher.ReferenceNumber,
      status: 'posted' as any,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async createJournalEntry(journalEntry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
    const fortnoxVoucher = {
      TransactionDate: journalEntry.date,
      Description: journalEntry.description,
      ReferenceNumber: journalEntry.reference,
      VoucherRows: journalEntry.journalRows?.map(row => ({
        Account: row.accountId,
        Debit: row.debit,
        Credit: row.credit,
        Description: row.description
      })) || []
    }

    const response = await this.request('/vouchers', {
      method: 'POST',
      body: JSON.stringify({ Voucher: fortnoxVoucher })
    })

    if (!response.ok) {
      throw new Error(`Failed to create journal entry: ${response.statusText}`)
    }

    const data = await response.json() as any
    const voucher = data.Voucher

    return {
      id: voucher.VoucherNumber,
      number: voucher.VoucherNumber,
      date: voucher.TransactionDate,
      description: voucher.Description,
      reference: voucher.ReferenceNumber,
      status: 'posted' as any,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateJournalEntry(id: string, journalEntry: Partial<JournalEntry>): Promise<JournalEntry> {
    const fortnoxVoucher: any = {}
    
    if (journalEntry.date) fortnoxVoucher.TransactionDate = journalEntry.date
    if (journalEntry.description) fortnoxVoucher.Description = journalEntry.description
    if (journalEntry.reference) fortnoxVoucher.ReferenceNumber = journalEntry.reference
    if (journalEntry.journalRows) {
      fortnoxVoucher.VoucherRows = journalEntry.journalRows.map(row => ({
        Account: row.accountId,
        Debit: row.debit,
        Credit: row.credit,
        Description: row.description
      }))
    }

    const response = await this.request(`/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ Voucher: fortnoxVoucher })
    })

    if (!response.ok) {
      throw new Error(`Failed to update journal entry: ${response.statusText}`)
    }

    const data = await response.json() as any
    const voucher = data.Voucher

    return {
      id: voucher.VoucherNumber,
      number: voucher.VoucherNumber,
      date: voucher.TransactionDate,
      description: voucher.Description,
      reference: voucher.ReferenceNumber,
      status: 'posted' as any,
      currency: 'SEK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const response = await this.request(`/vouchers/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error(`Failed to delete journal entry: ${response.statusText}`)
    }
  }

  async postJournalEntry(id: string): Promise<JournalEntry> {
    // Fortnox vouchers are automatically posted when created
    return this.getJournalEntry(id)
  }

  // Payment operations (Limited support)
  async getPayments(options?: SyncOptions): Promise<SyncResult<Payment>> {
    // Fortnox doesn't have a direct payments endpoint
    return {
      data: [],
      hasMore: false,
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        hasNext: false
      }
    }
  }

  async getPayment(id: string): Promise<Payment> {
    throw new Error('Payment retrieval not supported by Fortnox')
  }

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    throw new Error('Direct payment creation not supported by Fortnox')
  }

  async updatePayment(id: string, payment: Partial<Payment>): Promise<Payment> {
    throw new Error('Direct payment updates not supported by Fortnox')
  }

  async deletePayment(id: string): Promise<void> {
    throw new Error('Direct payment deletion not supported by Fortnox')
  }

  async processPayment(id: string): Promise<Payment> {
    throw new Error('Payment processing not supported by Fortnox')
  }

  // Attachment operations (Limited support)
  async getAttachments(entityType: string, entityId: string, attachmentType?: string): Promise<Attachment[]> {
    // Fortnox has limited attachment support
    return []
  }

  async getAttachment(id: string): Promise<Attachment> {
    throw new Error('Direct attachment retrieval not supported by Fortnox API')
  }

  async downloadAttachment(id: string): Promise<ReadableStream | null> {
    throw new Error('Attachment download not supported by Fortnox API')
  }

  async getAttachmentMetadata(id: string): Promise<any> {
    throw new Error('Attachment metadata not supported by Fortnox API')
  }

  // Bulk operations
  async bulkCreate<T>(entityType: string, entities: T[]): Promise<{ success: T[]; failed: { entity: T; error: string }[] }> {
    const success: T[] = []
    const failed: { entity: T; error: string }[] = []

    for (const entity of entities) {
      try {
        let result: any
        switch (entityType) {
          case 'customers':
            result = await this.createCustomer(entity as any)
            break
          case 'vendors':
            result = await this.createVendor(entity as any)
            break
          case 'invoices':
            result = await this.createInvoice(entity as any)
            break
          case 'items':
            result = await this.createItem(entity as any)
            break
          default:
            throw new Error(`Bulk creation not supported for entity type: ${entityType}`)
        }
        success.push(result)
      } catch (error) {
        failed.push({ entity, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return { success, failed }
  }

  async bulkUpdate<T>(entityType: string, entities: { id: string; data: Partial<T> }[]): Promise<{ success: T[]; failed: { id: string; error: string }[] }> {
    const success: T[] = []
    const failed: { id: string; error: string }[] = []

    for (const { id, data } of entities) {
      try {
        let result: any
        switch (entityType) {
          case 'customers':
            result = await this.updateCustomer(id, data as any)
            break
          case 'vendors':
            result = await this.updateVendor(id, data as any)
            break
          case 'invoices':
            result = await this.updateInvoice(id, data as any)
            break
          case 'items':
            result = await this.updateItem(id, data as any)
            break
          default:
            throw new Error(`Bulk update not supported for entity type: ${entityType}`)
        }
        success.push(result)
      } catch (error) {
        failed.push({ id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return { success, failed }
  }

  async bulkDelete(entityType: string, ids: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
    const success: string[] = []
    const failed: { id: string; error: string }[] = []

    for (const id of ids) {
      try {
        switch (entityType) {
          case 'customers':
            await this.deleteCustomer(id)
            break
          case 'vendors':
            await this.deleteVendor(id)
            break
          case 'invoices':
            await this.deleteInvoice(id)
            break
          case 'items':
            await this.deleteItem(id)
            break
          default:
            throw new Error(`Bulk deletion not supported for entity type: ${entityType}`)
        }
        success.push(id)
      } catch (error) {
        failed.push({ id, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    return { success, failed }
  }

  // Export operations
  async startBulkExport(request: BulkExport): Promise<string> {
    const jobId = crypto.randomUUID()
    // In a real implementation, this would queue a job
    return jobId
  }

  async getExportStatus(jobId: string): Promise<any> {
    return {
      jobId,
      status: 'completed',
      progress: 100
    }
  }

  async getExportResult(jobId: string): Promise<any> {
    throw new Error('Export result retrieval not implemented yet')
  }

  async getRateLimitInfo(): Promise<RateLimitInfo> {
    return {
      remaining: 25,
      reset: new Date(Date.now() + 5000),
      limit: 25
    }
  }

  getProviderInfo(): { name: string; version: string; capabilities: string[] } {
    return {
      name: 'Fortnox',
      version: '3.0',
      capabilities: ['customers', 'vendors', 'invoices', 'bills', 'accounts', 'items', 'journal_entries', 'full_crud']
    }
  }
} 


================================================
FILE: src/providers/manager.ts
================================================
import { CoreProvider, ProviderConfig, ProviderAuth, SyncOptions, ExportJobStatus } from './core'
import { 
  Customer, 
  Vendor, 
  Invoice, 
  Bill, 
  Transaction, 
  Expense, 
  JournalEntry, 
  Payment, 
  Account, 
  Item, 
  Attachment, 
  CompanyInfo,
  BulkExport 
} from '../schemas'

export interface QueueJob {
  id: string
  provider: string
  method: string
  args: any[]
  retry: number
  maxRetries: number
  scheduledAt: Date
  tenantId?: string
  priority?: 'low' | 'normal' | 'high'
  metadata?: Record<string, any>
}

export interface ProviderRegistry {
  [key: string]: new (config: ProviderConfig) => CoreProvider
}

export class ProviderManager {
  private providers: Map<string, CoreProvider> = new Map()
  private registry: ProviderRegistry = {}
  private queue?: any // Cloudflare Queue - will be typed properly when CF types are available
  private exportJobs: Map<string, ExportJobStatus> = new Map()

  constructor(private env: any) {
    this.queue = env.SYNC_QUEUE
  }

  // Provider registration
  registerProvider(name: string, providerClass: new (config: ProviderConfig) => CoreProvider) {
    this.registry[name] = providerClass
  }

  // Provider initialization
  async initializeProvider(name: string, config: ProviderConfig): Promise<CoreProvider> {
    const ProviderClass = this.registry[name]
    if (!ProviderClass) {
      throw new Error(`Provider ${name} not registered`)
    }

    const provider = new ProviderClass(config)
    this.providers.set(name, provider)
    return provider
  }

  getProvider(name: string): CoreProvider | undefined {
    return this.providers.get(name)
  }

  // Queue management
  async enqueueJob(job: Omit<QueueJob, 'id' | 'scheduledAt' | 'retry'>): Promise<string> {
    const queueJob: QueueJob = {
      ...job,
      id: crypto.randomUUID(),
      scheduledAt: new Date(),
      retry: 0
    }

    if (this.queue) {
      await this.queue.send(queueJob)
    } else {
      // Fallback to direct execution in development
      await this.processJob(queueJob)
    }

    return queueJob.id
  }

  async processJob(job: QueueJob): Promise<any> {
    const provider = this.getProvider(job.provider)
    if (!provider) {
      throw new Error(`Provider ${job.provider} not found`)
    }

    try {
      const method = (provider as any)[job.method]
      if (typeof method !== 'function') {
        throw new Error(`Method ${job.method} not found on provider ${job.provider}`)
      }

      const result = await method.apply(provider, job.args)
      return result
    } catch (error) {
      if (job.retry < job.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.retry) * 1000
        const retryJob = {
          ...job,
          retry: job.retry + 1,
          scheduledAt: new Date(Date.now() + delay)
        }
        
        if (this.queue) {
          await this.queue.send(retryJob, { delaySeconds: delay / 1000 })
        }
      }
      throw error
    }
  }

  // ======================
  // COMPANY INFO METHODS
  // ======================

  async getCompanyInfo(provider: string, useQueue = false): Promise<CompanyInfo> {
    if (useQueue) {
      await this.enqueueJob({
        provider,
        method: 'getCompanyInfo',
        args: [],
        maxRetries: 3
      })
      throw new Error('Job queued - use webhook or polling to get result')
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getCompanyInfo()
  }

  // ======================
  // ACCOUNT METHODS
  // ======================

  async getAccounts(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getAccounts',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getAccounts(options)
  }

  async getAccount(provider: string, id: string, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getAccount',
        args: [id],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getAccount(id)
  }

  async createAccount(provider: string, account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createAccount',
        args: [account],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createAccount(account)
  }

  // ======================
  // CUSTOMER METHODS
  // ======================

  async getCustomers(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getCustomers',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getCustomers(options)
  }

  async getCustomer(provider: string, id: string, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getCustomer',
        args: [id],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getCustomer(id)
  }

  async createCustomer(provider: string, customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createCustomer',
        args: [customer],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createCustomer(customer)
  }

  // ======================
  // VENDOR METHODS
  // ======================

  async getVendors(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getVendors',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getVendors(options)
  }

  async createVendor(provider: string, vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createVendor',
        args: [vendor],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createVendor(vendor)
  }

  // ======================
  // INVOICE METHODS
  // ======================

  async getInvoices(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getInvoices',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getInvoices(options)
  }

  async getInvoice(provider: string, id: string, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getInvoice',
        args: [id],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getInvoice(id)
  }

  async createInvoice(provider: string, invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createInvoice',
        args: [invoice],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createInvoice(invoice)
  }

  // ======================
  // TRANSACTION METHODS
  // ======================

  async getTransactions(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getTransactions',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getTransactions(options)
  }

  async createTransaction(provider: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createTransaction',
        args: [transaction],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createTransaction(transaction)
  }

  // ======================
  // EXPENSE METHODS
  // ======================

  async getExpenses(provider: string, options?: SyncOptions, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'getExpenses',
        args: [options],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getExpenses(options)
  }

  async createExpense(provider: string, expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'createExpense',
        args: [expense],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createExpense(expense)
  }

  // ======================
  // ATTACHMENT METHODS
  // ======================

  async getAttachments(entityType: string, entityId: string, attachmentType?: string, useQueue = false): Promise<Attachment[]> {
    // For now, we'll implement a generic attachment retrieval
    // In a real implementation, this would be provider-specific
    return []
  }

  // Upload attachment method removed - using proxy pattern instead

  // ======================
  // BULK EXPORT METHODS
  // ======================

  async enqueueBulkExport(request: BulkExport): Promise<string> {
    const jobId = crypto.randomUUID()
    
    // Create export job status
    const exportJob: ExportJobStatus = {
      id: jobId,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.exportJobs.set(jobId, exportJob)
    
    // Queue the export job
    await this.enqueueJob({
      provider: request.provider,
      method: 'startBulkExport',
      args: [request],
      maxRetries: 1, // Don't retry bulk exports
      priority: 'low' // Bulk exports are low priority
    })
    
    return jobId
  }

  async getBulkExportStatus(jobId: string): Promise<ExportJobStatus> {
    const job = this.exportJobs.get(jobId)
    if (!job) {
      throw new Error(`Export job ${jobId} not found`)
    }
    
    return job
  }

  async downloadBulkExport(jobId: string): Promise<ReadableStream> {
    const job = this.exportJobs.get(jobId)
    if (!job) {
      throw new Error(`Export job ${jobId} not found`)
    }
    
    if (job.status !== 'completed') {
      throw new Error(`Export job ${jobId} is not completed`)
    }
    
    // In a real implementation, this would download from storage
    throw new Error('Download not implemented yet')
  }

  // ======================
  // BATCH OPERATIONS
  // ======================

  async batchSync(provider: string, entityTypes: string[], options?: SyncOptions): Promise<{ [entityType: string]: any }> {
    const results: { [entityType: string]: any } = {}
    
    const jobs = entityTypes.map(entityType => ({
      provider,
      method: `get${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`,
      args: [options],
      maxRetries: 3
    }))
    
    // Execute all jobs in parallel
    const promises = jobs.map(job => this.enqueueJob(job))
    const jobIds = await Promise.all(promises)
    
    // For now, return the job IDs
    // In a real implementation, you'd wait for completion or use webhooks
    entityTypes.forEach((entityType, index) => {
      results[entityType] = { jobId: jobIds[index] }
    })
    
    return results
  }

  async batchCreate<T>(provider: string, entityType: string, entities: T[], useQueue = false): Promise<any> {
    if (useQueue) {
      return this.enqueueJob({
        provider,
        method: 'bulkCreate',
        args: [entityType, entities],
        maxRetries: 3
      })
    }
    
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.bulkCreate(entityType, entities)
  }

  // ======================
  // UTILITY METHODS
  // ======================

  async validateProvider(provider: string): Promise<boolean> {
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      return false
    }
    
    try {
      return await providerInstance.validateAuth()
    } catch (error) {
      return false
    }
  }

  async getProviderCapabilities(provider: string): Promise<string[]> {
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.getProviderInfo().capabilities
  }

  async healthCheck(): Promise<{ [provider: string]: boolean }> {
    const results: { [provider: string]: boolean } = {}
    
    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.validateAuth()
      } catch (error) {
        results[name] = false
      }
    }
    
    return results
  }

  // ======================
  // SEARCH METHODS
  // ======================

  async searchEntities(provider: string, entityType: string, query: string, options?: SyncOptions): Promise<any> {
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.searchEntities(entityType, query, options)
  }

  // ======================
  // WEBHOOK METHODS
  // ======================

  async createWebhook(provider: string, url: string, events: string[]): Promise<{ id: string; secret: string }> {
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    return providerInstance.createWebhook(url, events)
  }

  async processWebhook(provider: string, payload: any, signature: string): Promise<void> {
    const providerInstance = this.getProvider(provider)
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not found`)
    }
    
    // In a real implementation, you'd validate the signature and process the webhook
    await providerInstance.processWebhook(payload)
  }

  // ======================
  // CLEANUP METHODS
  // ======================

  async cleanup(): Promise<void> {
    // Clear expired export jobs
    const now = new Date()
    for (const [jobId, job] of this.exportJobs.entries()) {
      const ageInHours = (now.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60)
      if (ageInHours > 24) { // Remove jobs older than 24 hours
        this.exportJobs.delete(jobId)
      }
    }
    
    // Clear provider instances (they'll be recreated as needed)
    this.providers.clear()
  }

  getStats(): { 
    providers: number
    activeExportJobs: number
    completedExportJobs: number
    failedExportJobs: number
  } {
    const exportJobsArray = Array.from(this.exportJobs.values())
    
    return {
      providers: this.providers.size,
      activeExportJobs: exportJobsArray.filter(job => job.status === 'processing').length,
      completedExportJobs: exportJobsArray.filter(job => job.status === 'completed').length,
      failedExportJobs: exportJobsArray.filter(job => job.status === 'failed').length
    }
  }
} 


================================================
FILE: src/providers/xero.ts
================================================
import { CoreProvider, ProviderConfig, ProviderAuth, SyncOptions, SyncResult, RateLimitInfo } from './core'
import { Customer, Invoice, Transaction, Attachment } from '../schemas'

export class XeroProvider extends CoreProvider {
  private baseUrl = 'https://api.xero.com/api.xro/2.0'
  
  constructor(config: ProviderConfig) {
    super(config)
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    }
  }

  getAuthUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || '',
      scope: scopes.join(' '),
      state: crypto.randomUUID()
    })
    
    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
  }

  async exchangeCodeForToken(code: string): Promise<ProviderAuth> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri || ''
      })
    })

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
  }

  async refreshAccessToken(): Promise<ProviderAuth> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.auth.refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json() as any
    
    const newAuth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    }
    
    this.setAuth(newAuth)
    return newAuth
  }

  async validateAuth(): Promise<boolean> {
    if (!this.auth?.accessToken) {
      return false
    }

    try {
      const response = await this.makeRequest('/Organisation')
      return response.ok
    } catch {
      return false
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.auth?.accessToken) {
      throw new Error('No access token available')
    }

    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.auth.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (response.status === 401) {
      // Try to refresh token
      await this.refreshAccessToken()
      
      // Retry the request
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.auth.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
    }

    return response
  }

  private transformXeroCustomer(xeroCustomer: any): Customer {
    return {
      id: xeroCustomer.ContactID,
      name: xeroCustomer.Name,
      email: xeroCustomer.EmailAddress,
      phone: xeroCustomer.Phones?.[0]?.PhoneNumber,
      address: xeroCustomer.Addresses?.[0] ? {
        street: xeroCustomer.Addresses[0].AddressLine1,
        city: xeroCustomer.Addresses[0].City,
        state: xeroCustomer.Addresses[0].Region,
        postalCode: xeroCustomer.Addresses[0].PostalCode,
        country: xeroCustomer.Addresses[0].Country
      } : undefined,
      taxNumber: xeroCustomer.TaxNumber,
      currency: xeroCustomer.DefaultCurrency || 'USD',
      isActive: xeroCustomer.ContactStatus === 'ACTIVE',
      createdAt: xeroCustomer.CreatedDateUTC || new Date().toISOString(),
      updatedAt: xeroCustomer.UpdatedDateUTC || new Date().toISOString()
    }
  }

  async getCustomers(options?: SyncOptions): Promise<SyncResult<Customer>> {
    const params = new URLSearchParams()
    
    if (options?.modifiedSince) {
      params.append('If-Modified-Since', options.modifiedSince.toISOString())
    }
    
    if (options?.includeArchived) {
      params.append('includeArchived', 'true')
    }

    const response = await this.makeRequest(`/Contacts?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get customers: ${response.statusText}`)
    }

    const data = await response.json() as any
    const customers = data.Contacts.map(this.transformXeroCustomer)

    return {
      data: customers,
      hasMore: false, // Xero doesn't use cursor-based pagination in this example
      pagination: {
        page: 1,
        limit: customers.length,
        total: customers.length,
        hasNext: false
      }
    }
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.makeRequest(`/Contacts/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get customer: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformXeroCustomer(data.Contacts[0])
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const xeroCustomer = {
      Name: customer.name,
      EmailAddress: customer.email,
      Phones: customer.phone ? [{ PhoneType: 'DEFAULT', PhoneNumber: customer.phone }] : [],
      Addresses: customer.address ? [{
        AddressType: 'STREET',
        AddressLine1: customer.address.street,
        City: customer.address.city,
        Region: customer.address.state,
        PostalCode: customer.address.postalCode,
        Country: customer.address.country
      }] : []
    }

    const response = await this.makeRequest('/Contacts', {
      method: 'POST',
      body: JSON.stringify({ Contacts: [xeroCustomer] })
    })

    if (!response.ok) {
      throw new Error(`Failed to create customer: ${response.statusText}`)
    }

    const data = await response.json() as any
    return this.transformXeroCustomer(data.Contacts[0])
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    // Similar implementation to createCustomer but with PUT method
    throw new Error('Not implemented yet')
  }

  async deleteCustomer(id: string): Promise<void> {
    // Xero doesn't support deletion, only archiving
    throw new Error('Xero does not support customer deletion, only archiving')
  }

  // Placeholder implementations for other methods
  async getInvoices(options?: SyncOptions): Promise<SyncResult<Invoice>> {
    throw new Error('Not implemented yet')
  }

  async getInvoice(id: string): Promise<Invoice> {
    throw new Error('Not implemented yet')
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    throw new Error('Not implemented yet')
  }

  async updateInvoice(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    throw new Error('Not implemented yet')
  }

  async deleteInvoice(id: string): Promise<void> {
    throw new Error('Not implemented yet')
  }

  async getTransactions(options?: SyncOptions): Promise<SyncResult<Transaction>> {
    throw new Error('Not implemented yet')
  }

  async getTransaction(id: string): Promise<Transaction> {
    throw new Error('Not implemented yet')
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    throw new Error('Not implemented yet')
  }

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    throw new Error('Not implemented yet')
  }

  async deleteTransaction(id: string): Promise<void> {
    throw new Error('Not implemented yet')
  }

  async getAttachments(entityType: string, entityId: string, attachmentType?: string): Promise<Attachment[]> {
    let endpoint = ''
    
    switch (entityType) {
      case 'invoice':
        endpoint = `/Invoices/${entityId}/Attachments`
        break
      case 'bill':
        endpoint = `/Bills/${entityId}/Attachments`
        break
      case 'expense':
        endpoint = `/ExpenseClaims/${entityId}/Attachments`
        break
      case 'transaction':
        endpoint = `/BankTransactions/${entityId}/Attachments`
        break
      default:
        throw new Error(`Attachments not supported for entity type: ${entityType}`)
    }

    const response = await this.request(endpoint)
    
    if (!response.ok) {
      throw new Error(`Failed to get attachments: ${response.statusText}`)
    }

    const data = await response.json() as any
    return data.Attachments?.map((att: any) => ({
      id: att.AttachmentID,
      filename: att.FileName,
      originalFilename: att.FileName,
      mimeType: att.MimeType,
      size: att.ContentLength,
      url: att.Url,
      downloadUrl: att.Url,
      entityType: entityType as any,
      entityId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) || []
  }

  async getAttachment(id: string): Promise<Attachment> {
    // Xero doesn't have a direct attachment endpoint, need to search through entities
    throw new Error('Direct attachment retrieval not supported by Xero API')
  }

  async downloadAttachment(id: string): Promise<ReadableStream | null> {
    // This would need to be implemented based on Xero's attachment download API
    const response = await this.request(`/Attachments/${id}/Content`)
    
    if (!response.ok) {
      return null
    }

    return response.body
  }

  async getAttachmentMetadata(id: string): Promise<any> {
    const response = await this.request(`/Attachments/${id}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get attachment metadata: ${response.statusText}`)
    }

    return await response.json()
  }

  async getRateLimitInfo(): Promise<RateLimitInfo> {
    // Xero rate limits are typically in response headers
    return {
      remaining: 100,
      reset: new Date(Date.now() + 60000),
      limit: 100
    }
  }

  getProviderInfo(): { name: string; version: string; capabilities: string[] } {
    return {
      name: 'Xero',
      version: '2.0',
      capabilities: ['customers', 'invoices', 'transactions', 'attachments']
    }
  }
} 


================================================
FILE: src/routes/api.ts
================================================
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { ProviderManager } from '../providers/manager'
import { XeroProvider } from '../providers/xero'
import { FortnoxProvider } from '../providers/fortnox'
import { QuickBooksProvider } from '../providers/quickbooks'
import { SageProvider } from '../providers/sage'
 import { 
  CustomerSchema, 
  VendorSchema,
  InvoiceSchema, 
  BillSchema,
  TransactionSchema,
  ExpenseSchema,
  JournalEntrySchema,
  PaymentSchema,
  AccountSchema,
  ItemSchema,
  AttachmentSchema,
  CompanyInfoSchema,
  BulkExportSchema,
  PaginationSchema,
  ApiRequestSchema
} from '../schemas'

const app = new OpenAPIHono<{ Bindings: CloudflareBindings }>()

// Initialize provider manager and file handler
let providerManager: ProviderManager
 
// Middleware to initialize provider manager and file handler
app.use('*', async (c, next) => {
  if (!providerManager) {
    providerManager = new ProviderManager(c.env)
    providerManager.registerProvider('xero', XeroProvider)
   providerManager.registerProvider('fortnox', FortnoxProvider)
  providerManager.registerProvider('quickbooks', QuickBooksProvider)
  providerManager.registerProvider('sage', SageProvider)
  }

 

  await next()
})

// Error response schema
const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
})

// Success response schemas
const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})

// ======================
// AUTHENTICATION ROUTES
// ======================

// Authentication - Get OAuth URL
const getAuthUrlRoute = createRoute({
  method: 'post',
  path: '/auth/url',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
            scopes: z.array(z.string()),
            redirectUri: z.string().url().optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            authUrl: z.string().url(),
            state: z.string(),
            provider: z.string()
          })
        }
      },
      description: 'Authentication URL generated'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request'
    }
  },
  summary: 'Get OAuth authorization URL',
  tags: ['Authentication']
})

app.openapi(getAuthUrlRoute, async (c) => {
  const { provider, scopes, redirectUri } = await c.req.json()
  
  const providerInstance = await providerManager.initializeProvider(provider, {
    clientId: c.env.XERO_CLIENT_ID || 'placeholder',
    clientSecret: c.env.XERO_CLIENT_SECRET || 'placeholder',
    redirectUri: redirectUri || c.env.REDIRECT_URI || 'http://localhost:3000/callback'
  })
  
  const authUrl = providerInstance.getAuthUrl(scopes)
  const state = crypto.randomUUID()
  
  return c.json({
    authUrl,
    state,
    provider
  })
})

// Authentication - Exchange code for tokens
const exchangeTokenRoute = createRoute({
  method: 'post',
  path: '/auth/token',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
            code: z.string(),
            state: z.string().optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            accessToken: z.string(),
            refreshToken: z.string().optional(),
            expiresAt: z.string().optional(),
            tenantId: z.string().optional(),
            provider: z.string()
          })
        }
      },
      description: 'Tokens exchanged successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request'
    }
  },
  summary: 'Exchange authorization code for tokens',
  tags: ['Authentication']
})

app.openapi(exchangeTokenRoute, async (c) => {
  const { provider, code } = await c.req.json()
  
  const providerInstance = await providerManager.initializeProvider(provider, {
    clientId: c.env.XERO_CLIENT_ID || 'placeholder',
    clientSecret: c.env.XERO_CLIENT_SECRET || 'placeholder'
  })
  
  const auth = await providerInstance.exchangeCodeForToken(code)
  
  return c.json({
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: auth.expiresAt?.toISOString(),
    tenantId: auth.tenantId,
    provider
  })
})

// ======================
// COMPANY INFO ROUTES
// ======================

const getCompanyInfoRoute = createRoute({
  method: 'get',
  path: '/company-info',
  request: {
    query: ApiRequestSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CompanyInfoSchema,
            provider: z.string()
          })
        }
      },
      description: 'Company information retrieved successfully'
    }
  },
  summary: 'Get company information',
  tags: ['Company']
})

app.openapi(getCompanyInfoRoute, async (c) => {
  const { provider } = c.req.valid('query')
  
  const companyInfo = await providerManager.getCompanyInfo(provider)
  
  return c.json({
    success: true,
    data: companyInfo,
    provider
  })
})

// ======================
// ACCOUNT ROUTES
// ======================

const getAccountsRoute = createRoute({
  method: 'get',
  path: '/accounts',
  request: {
    query: ApiRequestSchema.extend({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      accountType: z.enum(['asset', 'liability', 'equity', 'income', 'expense']).optional(),
      isActive: z.coerce.boolean().optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(AccountSchema),
            pagination: PaginationSchema,
            provider: z.string()
          })
        }
      },
      description: 'Accounts retrieved successfully'
    }
  },
  summary: 'Get chart of accounts',
  tags: ['Accounts']
})

app.openapi(getAccountsRoute, async (c) => {
  const query = c.req.valid('query')
  const { provider, page, limit, accountType, isActive, ...options } = query
  
  const result = await providerManager.getAccounts(provider, {
    ...options,
    page,
    limit,
    accountType,
    isActive
  })
  
  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    provider
  })
})

const createAccountRoute = createRoute({
  method: 'post',
  path: '/accounts',
  request: {
    query: z.object({
            provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
    }),
    body: {
      content: {
        'application/json': {
          schema: AccountSchema.omit({ id: true, createdAt: true, updatedAt: true })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AccountSchema,
            provider: z.string()
          })
        }
      },
      description: 'Account created successfully'
    }
  },
  summary: 'Create account',
  tags: ['Accounts']
})

app.openapi(createAccountRoute, async (c) => {
  const { provider } = c.req.valid('query')
  const accountData = c.req.valid('json')
  
  const account = await providerManager.createAccount(provider, accountData)
  
  return c.json({
    success: true,
    data: account,
    provider
  }, 201)
})

// ======================
// CUSTOMER ROUTES
// ======================

const getCustomersRoute = createRoute({
  method: 'get',
  path: '/customers',
  request: {
    query: ApiRequestSchema.extend({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      isActive: z.coerce.boolean().optional(),
      search: z.string().optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(CustomerSchema),
            pagination: PaginationSchema,
            provider: z.string()
          })
        }
      },
      description: 'Customers retrieved successfully'
    }
  },
  summary: 'Get customers',
  tags: ['Customers']
})

app.openapi(getCustomersRoute, async (c) => {
  const query = c.req.valid('query')
  const { provider, page, limit, isActive, search, ...options } = query
  
  const result = await providerManager.getCustomers(provider, {
    ...options,
    page,
    limit,
    isActive,
    search
  })
  
  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    provider
  })
})

const createCustomerRoute = createRoute({
  method: 'post',
  path: '/customers',
  request: {
    query: z.object({
        provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
    }),
    body: {
      content: {
        'application/json': {
          schema: CustomerSchema.omit({ id: true, createdAt: true, updatedAt: true })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: CustomerSchema,
            provider: z.string()
          })
        }
      },
      description: 'Customer created successfully'
    }
  },
  summary: 'Create customer',
  tags: ['Customers']
})

app.openapi(createCustomerRoute, async (c) => {
  const { provider } = c.req.valid('query')
  const customerData = c.req.valid('json')
  
  const customer = await providerManager.createCustomer(provider, customerData)
  
  return c.json({
    success: true,
    data: customer,
    provider
  }, 201)
})

// ======================
// VENDOR ROUTES
// ======================

const getVendorsRoute = createRoute({
  method: 'get',
  path: '/vendors',
  request: {
    query: ApiRequestSchema.extend({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      isActive: z.coerce.boolean().optional(),
      search: z.string().optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(VendorSchema),
            pagination: PaginationSchema,
            provider: z.string()
          })
        }
      },
      description: 'Vendors retrieved successfully'
    }
  },
  summary: 'Get vendors',
  tags: ['Vendors']
})

app.openapi(getVendorsRoute, async (c) => {
  const query = c.req.valid('query')
  const { provider, page, limit, isActive, search, ...options } = query
  
  const result = await providerManager.getVendors(provider, {
    ...options,
    page,
    limit,
    isActive,
    search
  })
  
  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    provider
  })
})

const createVendorRoute = createRoute({
  method: 'post',
  path: '/vendors',
  request: {
    query: z.object({
        provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
    }),
    body: {
      content: {
        'application/json': {
          schema: VendorSchema.omit({ id: true, createdAt: true, updatedAt: true })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: VendorSchema,
            provider: z.string()
          })
        }
      },
      description: 'Vendor created successfully'
    }
  },
  summary: 'Create vendor',
  tags: ['Vendors']
})

app.openapi(createVendorRoute, async (c) => {
  const { provider } = c.req.valid('query')
  const vendorData = c.req.valid('json')
  
  const vendor = await providerManager.createVendor(provider, vendorData)
  
  return c.json({
    success: true,
    data: vendor,
    provider
  }, 201)
})

// ======================
// INVOICE ROUTES
// ======================

const getInvoicesRoute = createRoute({
  method: 'get',
  path: '/invoices',
  request: {
    query: ApiRequestSchema.extend({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void']).optional(),
      customerId: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(InvoiceSchema),
            pagination: PaginationSchema,
            provider: z.string()
          })
        }
      },
      description: 'Invoices retrieved successfully'
    }
  },
  summary: 'Get invoices',
  tags: ['Invoices']
})

app.openapi(getInvoicesRoute, async (c) => {
  const query = c.req.valid('query')
  const { provider, page, limit, status, customerId, dateFrom, dateTo, ...options } = query
  
  const result = await providerManager.getInvoices(provider, {
    ...options,
    page,
    limit,
    status,
    customerId,
    dateFrom,
    dateTo
  })
  
  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    provider
  })
})

const createInvoiceRoute = createRoute({
  method: 'post',
  path: '/invoices',
  request: {
    query: z.object({
        provider: z.enum(['xero', 'fortnox', 'quickbooks', 'sage']),
    }),
    body: {
      content: {
        'application/json': {
          schema: InvoiceSchema.omit({ id: true, createdAt: true, updatedAt: true })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: InvoiceSchema,
            provider: z.string()
          })
        }
      },
      description: 'Invoice created successfully'
    }
  },
  summary: 'Create invoice',
  tags: ['Invoices']
})

app.openapi(createInvoiceRoute, async (c) => {
  const { provider } = c.req.valid('query')
  const invoiceData = c.req.valid('json')
  
  const invoice = await providerManager.createInvoice(provider, invoiceData)
  
  return c.json({
    success: true,
    data: invoice,
    provider
  }, 201)
})

// ======================
// TRANSACTION ROUTES
// ======================

const getTransactionsRoute = createRoute({
  method: 'get',
  path: '/transactions',
  request: {
    query: ApiRequestSchema.extend({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      type: z.enum(['payment', 'receipt', 'transfer', 'adjustment', 'deposit', 'withdrawal', 'charge', 'refund']).optional(),
      accountId: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(TransactionSchema),
            pagination: PaginationSchema,
            provider: z.string()
          })
        }
      },
      description: 'Transactions retrieved successfully'
    }
  },
  summary: 'Get transactions',
  tags: ['Transactions']
})

app.openapi(getTransactionsRoute, async (c) => {
  const query = c.req.valid('query')
  const { provider, page, limit, type, accountId, dateFrom, dateTo, ...options } = query
  
  const result = await providerManager.getTransactions(provider, {
    ...options,
    page,
    limit,
    type,
    accountId,
    dateFrom,
    dateTo
  })
  
  return c.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    provider
  })
})

// ======================
// ATTACHMENT ROUTES
// ======================

const uploadAttachmentRoute = createRoute({
  method: 'post',
  path: '/attachments/upload',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File),
            entityType: z.enum(['invoice', 'customer', 'transaction', 'expense', 'bill', 'receipt', 'journal_entry']),
            entityId: z.string(),
            attachmentType: z.enum(['receipt', 'invoice', 'contract', 'supporting_document', 'other']).optional(),
            description: z.string().optional(),
            isPublic: z.coerce.boolean().default(false),
          })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AttachmentSchema,
            message: z.string()
          })
        }
      },
      description: 'File uploaded successfully'
    }
  },
  summary: 'Upload attachment',
  tags: ['Attachments']
})

app.openapi(uploadAttachmentRoute, async (c) => {
  const formData = await c.req.parseBody()
  const file = formData.file as File
  const entityType = formData.entityType as string
  const entityId = formData.entityId as string
  const attachmentType = formData.attachmentType as string
  const description = formData.description as string
  const isPublic = formData.isPublic === 'true'
  
  const upload = {
    file,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    entityType,
    entityId,
    attachmentType,
    description,
    isPublic,
  }
  
  const attachment = await fileHandler.uploadFile(upload)
  
  return c.json({
    success: true,
    data: attachment,
    message: 'File uploaded successfully'
  }, 201)
})

const getAttachmentsRoute = createRoute({
  method: 'get',
  path: '/attachments',
  request: {
    query: z.object({
      entityType: z.enum(['invoice', 'customer', 'transaction', 'expense', 'bill', 'receipt', 'journal_entry']),
      entityId: z.string(),
      attachmentType: z.enum(['receipt', 'invoice', 'contract', 'supporting_document', 'other']).optional(),
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(AttachmentSchema),
            count: z.number()
          })
        }
      },
      description: 'Attachments retrieved successfully'
    }
  },
  summary: 'Get attachments for entity',
  tags: ['Attachments']
})

app.openapi(getAttachmentsRoute, async (c) => {
  const { entityType, entityId, attachmentType } = c.req.valid('query')
  
  const attachments = await providerManager.getAttachments(entityType, entityId, attachmentType)
  
  return c.json({
    success: true,
    data: attachments,
    count: attachments.length
  })
})

// ======================
// BULK EXPORT ROUTES
// ======================

const bulkExportRoute = createRoute({
  method: 'post',
  path: '/export/bulk',
  request: {
    body: {
      content: {
        'application/json': {
          schema: BulkExportSchema
        }
      }
    }
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            jobId: z.string(),
            status: z.literal('queued'),
            provider: z.string(),
            entityTypes: z.array(z.string()),
            timestamp: z.string(),
            estimatedCompletion: z.string().optional()
          })
        }
      },
      description: 'Bulk export job queued successfully'
    }
  },
  summary: 'Bulk export bookkeeping data',
  tags: ['Export']
})

app.openapi(bulkExportRoute, async (c) => {
  const exportRequest = c.req.valid('json')
  
  const jobId = await providerManager.enqueueBulkExport(exportRequest)
  
  return c.json({
    jobId,
    status: 'queued' as const,
    provider: exportRequest.provider,
    entityTypes: exportRequest.entityTypes,
    timestamp: new Date().toISOString(),
    estimatedCompletion: new Date(Date.now() + (exportRequest.entityTypes.length * 60000)).toISOString()
  }, 202)
})

// ======================
// HEALTH CHECK
// ======================

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('healthy'),
            timestamp: z.string(),
            providers: z.array(z.string()),
            features: z.array(z.string()),
            version: z.string()
          })
        }
      },
      description: 'Service health status'
    }
  },
  summary: 'Health check',
  tags: ['Health']
})

app.openapi(healthRoute, (c) => {
  return c.json({
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    providers: ['xero', 'fortnox', 'quickbooks', 'sage'],
    features: ['attachments', 'bulk_export', 'real_time_sync', 'webhooks'],
    version: '2.0.0'
  })
})

export default app 


================================================
FILE: src/schemas/index.ts
================================================
import { z } from 'zod'

// Base schemas
export const BaseEntitySchema = z.object({
  id: z.string(),
  externalId: z.string().optional(), // Provider-specific ID
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime().optional(),
  remoteWasDeleted: z.boolean().optional(),
})

// Address schema (reusable)
export const AddressSchema = z.object({
  type: z.enum(['billing', 'shipping', 'mailing']).optional(),
  street: z.string().optional(),
  street2: z.string().optional(), 
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})

// Phone number schema
export const PhoneNumberSchema = z.object({
  type: z.enum(['home', 'work', 'mobile', 'fax']).optional(),
  number: z.string(),
  isPrimary: z.boolean().optional(),
})

// Enhanced attachment schema with comprehensive file support
export const AttachmentSchema = BaseEntitySchema.extend({
  filename: z.string(),
  originalFilename: z.string().optional(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
  downloadUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  entityType: z.enum(['invoice', 'customer', 'transaction', 'expense', 'bill', 'receipt', 'journal_entry']),
  entityId: z.string(),
  attachmentType: z.enum(['receipt', 'invoice', 'contract', 'supporting_document', 'other']).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  uploadedBy: z.string().optional(),
  checksum: z.string().optional(), // For file integrity
  metadata: z.record(z.any()).optional(), // Provider-specific metadata
})

// Account schema for chart of accounts
export const AccountSchema = BaseEntitySchema.extend({
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  accountType: z.enum([
    'asset', 'liability', 'equity', 'income', 'expense',
    'accounts_receivable', 'accounts_payable', 'bank', 'credit_card',
    'current_asset', 'fixed_asset', 'other_asset', 'current_liability',
    'long_term_liability', 'cost_of_goods_sold', 'other_income', 'other_expense'
  ]),
  parentAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
  currentBalance: z.number().optional(),
  currency: z.string().default('USD'),
  taxCode: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
})

// Enhanced customer schema
export const CustomerSchema = BaseEntitySchema.extend({
  name: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  phone: PhoneNumberSchema.optional(),
  phoneNumbers: z.array(PhoneNumberSchema).optional(),
  addresses: z.array(AddressSchema).optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  taxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  currency: z.string().default('USD'),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().optional(),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  balance: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

// Vendor/Supplier schema
export const VendorSchema = BaseEntitySchema.extend({
  name: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  phone: PhoneNumberSchema.optional(),
  phoneNumbers: z.array(PhoneNumberSchema).optional(),
  addresses: z.array(AddressSchema).optional(),
  billingAddress: AddressSchema.optional(),
  taxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  currency: z.string().default('USD'),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  balance: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

// Item/Product schema
export const ItemSchema = BaseEntitySchema.extend({
  name: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  type: z.enum(['inventory', 'non_inventory', 'service', 'bundle']),
  unitPrice: z.number().optional(),
  unitOfMeasure: z.string().optional(),
  quantityOnHand: z.number().optional(),
  reorderPoint: z.number().optional(),
  assetAccountId: z.string().optional(),
  incomeAccountId: z.string().optional(),
  expenseAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  taxCode: z.string().optional(),
  customFields: z.record(z.any()).optional(),
})

// Enhanced invoice schema with attachments
export const InvoiceSchema = BaseEntitySchema.extend({
  number: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void']),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  subtotal: z.number(),
  taxAmount: z.number(),
  discountAmount: z.number().optional(),
  total: z.number(),
  amountPaid: z.number().optional(),
  amountDue: z.number().optional(),
  paymentTerms: z.string().optional(),
  reference: z.string().optional(),
  poNumber: z.string().optional(),
  notes: z.string().optional(),
  privateNotes: z.string().optional(),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  lineItems: z.array(z.object({
    id: z.string(),
    itemId: z.string().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    discount: z.number().optional(),
    total: z.number(),
    taxRate: z.number().optional(),
    taxAmount: z.number().optional(),
    accountId: z.string().optional(),
    trackingCategories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.string(),
    })).optional(),
  })),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Bill schema (for vendor bills)
export const BillSchema = BaseEntitySchema.extend({
  number: z.string(),
  vendorId: z.string(),
  vendorName: z.string(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  status: z.enum(['draft', 'open', 'paid', 'overdue', 'cancelled', 'void']),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  subtotal: z.number(),
  taxAmount: z.number(),
  discountAmount: z.number().optional(),
  total: z.number(),
  amountPaid: z.number().optional(),
  amountDue: z.number().optional(),
  reference: z.string().optional(),
  poNumber: z.string().optional(),
  notes: z.string().optional(),
  privateNotes: z.string().optional(),
  lineItems: z.array(z.object({
    id: z.string(),
    itemId: z.string().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    discount: z.number().optional(),
    total: z.number(),
    taxRate: z.number().optional(),
    taxAmount: z.number().optional(),
    accountId: z.string().optional(),
    trackingCategories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.string(),
    })).optional(),
  })),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Enhanced transaction schema with attachments and reconciliation
export const TransactionSchema = BaseEntitySchema.extend({
  type: z.enum(['payment', 'receipt', 'transfer', 'adjustment', 'deposit', 'withdrawal', 'charge', 'refund']),
  reference: z.string().optional(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  date: z.string().datetime(),
  accountId: z.string(),
  accountName: z.string(),
  toAccountId: z.string().optional(), // For transfers
  toAccountName: z.string().optional(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  contactName: z.string().optional(),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
  status: z.enum(['pending', 'cleared', 'reconciled', 'voided']),
  reconciliationStatus: z.enum(['unreconciled', 'reconciled', 'suggested']).optional(),
  reconciliationDate: z.string().datetime().optional(),
  bankTransactionId: z.string().optional(),
  checkNumber: z.string().optional(),
  memo: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  trackingCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    value: z.string(),
  })).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Expense schema
export const ExpenseSchema = BaseEntitySchema.extend({
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  date: z.string().datetime(),
  description: z.string(),
  reference: z.string().optional(),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
  employeeId: z.string().optional(),
  employeeName: z.string().optional(),
  accountId: z.string(),
  accountName: z.string(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  billable: z.boolean().default(false),
  reimbursable: z.boolean().default(false),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid']),
  paymentMethod: z.enum(['cash', 'credit_card', 'bank_transfer', 'check', 'other']).optional(),
  receiptRequired: z.boolean().default(true),
  notes: z.string().optional(),
  taxAmount: z.number().optional(),
  taxRate: z.number().optional(),
  tags: z.array(z.string()).optional(),
  trackingCategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    value: z.string(),
  })).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Journal Entry schema
export const JournalEntrySchema = BaseEntitySchema.extend({
  number: z.string(),
  date: z.string().datetime(),
  description: z.string(),
  reference: z.string().optional(),
  status: z.enum(['draft', 'posted', 'void']),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  lineItems: z.array(z.object({
    id: z.string(),
    accountId: z.string(),
    accountName: z.string(),
    description: z.string().optional(),
    debitAmount: z.number().optional(),
    creditAmount: z.number().optional(),
    trackingCategories: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.string(),
    })).optional(),
  })),
  totalDebit: z.number(),
  totalCredit: z.number(),
  notes: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Payment schema
export const PaymentSchema = BaseEntitySchema.extend({
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  date: z.string().datetime(),
  reference: z.string().optional(),
  paymentMethod: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'online', 'other']),
  accountId: z.string(),
  accountName: z.string(),
  customerId: z.string().optional(),
  vendorId: z.string().optional(),
  contactName: z.string().optional(),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
  status: z.enum(['pending', 'cleared', 'bounced', 'cancelled']),
  checkNumber: z.string().optional(),
  memo: z.string().optional(),
  fees: z.number().optional(),
  notes: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  customFields: z.record(z.any()).optional(),
})

// Company info schema
export const CompanyInfoSchema = BaseEntitySchema.extend({
  name: z.string(),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: PhoneNumberSchema.optional(),
  website: z.string().url().optional(),
  addresses: z.array(AddressSchema).optional(),
  taxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  baseCurrency: z.string().default('USD'),
  fiscalYearStart: z.string().optional(),
  timeZone: z.string().optional(),
  logo: z.string().url().optional(),
  industry: z.string().optional(),
  employees: z.number().optional(),
  customFields: z.record(z.any()).optional(),
})

// Enhanced provider-specific metadata
export const ProviderMetadataSchema = z.object({
  provider: z.enum(['xero', 'fortnox', 'quickbooks']),
  externalId: z.string(),
  lastSyncAt: z.string().datetime().optional(),
  syncHash: z.string().optional(),
  version: z.string().optional(),
  rawData: z.record(z.any()).optional(), // Store original provider data
  customFields: z.record(z.any()).optional(),
})

// Enhanced API Request/Response schemas
export const ApiRequestSchema = z.object({
    provider: z.enum(['xero', 'fortnox', 'quickbooks']),
    includeAttachments: z.boolean().default(false),
  includeCustomFields: z.boolean().default(false),
  includeRawData: z.boolean().default(false),
})

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().optional(),
  hasNext: z.boolean().optional(),
  cursor: z.string().optional(),
})

// Bulk export request schema
export const BulkExportSchema = z.object({
    provider: z.enum(['xero', 'fortnox', 'quickbooks']),
    entityTypes: z.array(z.enum(['customers', 'vendors', 'invoices', 'bills', 'transactions', 'expenses', 'accounts', 'items', 'journal_entries', 'payments'])),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }).optional(),
  includeAttachments: z.boolean().default(true),
  includeCustomFields: z.boolean().default(false),
  includeRawData: z.boolean().default(false),
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  batchSize: z.number().min(1).max(1000).default(100),
})

// Export types
export type Customer = z.infer<typeof CustomerSchema>
export type Vendor = z.infer<typeof VendorSchema>
export type Item = z.infer<typeof ItemSchema>
export type Invoice = z.infer<typeof InvoiceSchema>
export type Bill = z.infer<typeof BillSchema>
export type Transaction = z.infer<typeof TransactionSchema>
export type Expense = z.infer<typeof ExpenseSchema>
export type JournalEntry = z.infer<typeof JournalEntrySchema>
export type Payment = z.infer<typeof PaymentSchema>
export type Account = z.infer<typeof AccountSchema>
export type Attachment = z.infer<typeof AttachmentSchema>
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>
export type ProviderMetadata = z.infer<typeof ProviderMetadataSchema>

export type ApiRequest = z.infer<typeof ApiRequestSchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type BulkExport = z.infer<typeof BulkExportSchema>
export type Address = z.infer<typeof AddressSchema>
export type PhoneNumber = z.infer<typeof PhoneNumberSchema> 


================================================
FILE: .cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc
================================================
---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.


