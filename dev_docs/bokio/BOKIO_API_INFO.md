
# Welcome

Welcome to the Bokio API!

The Bokio API allows developers to integrate their applications with Bokio's accounting platform. With the API, you can automate various accounting tasks, retrieve financial data, and perform actions on behalf of Bokio companies.

## Public and private integrations

<SummaryToTypesOfIntegrations />

## APIs

Bokio aims to be a multi-tenant platform that supports various tenant types, allowing access to multiple Bokio companies through our API.

<SummaryOfAPIs />

## Getting Started

To get started with the Bokio API, you will need to set up an integration and obtain secrets. Depending on the [type of integration](https://docs.bokio.se/docs/public-private-integrations) you are building the process for this will look quite different. For detailed information on how to authenticate, make requests, and handle responses, take a look at the Getting started guides.

* For Private integrations, checkout [Getting started with Private integration](https://docs.bokio.se/docs/getting-started-private)
* For Public integrations, checkout [Getting started with Public Integrations](https://docs.bokio.se/docs/getting-started-public)

## API Reference

The Bokio API provides a comprehensive set of endpoints for interacting with the Bokio platform. You can find detailed information about each endpoint in the [API Reference](https://docs.bokio.se/reference/overview).

## Terms

By using the API, you are accepting the <Anchor label="terms" target="_blank" href="https://docs.bokio.se/page/terms/">terms</Anchor>.

<br />

<SupportAndCommunityNotice />




# Bookkeeping in Bokio

Bookkeeping in Bokio is both simple and automated so that even those who have no previous experience in bookkeeping can do it themselves. With our accounting templates, you don't have to keep track of accounts, debit, credit or calculate VAT.

Each transaction involves two or more related accounts. When a user creates or updates a record in Bokio, the value of one account increases while an equivalent value decreases in a corresponding account. For example:

* When a business makes a sale, its "Cash" account rises by the profit from that sale, while the income account that records sales revenue also increases by this amount.
* When a business pays rent, the "Cash" account decreases by the payment amount, while the "Rent or Lease" expense account increases by that same amount.

Here's how to get started:

1. **Sync Bank Transactions**: Bokio allows integration with your bank, either with an external connection or the Bokio Företagskonto. Syncing bank transactions simplifies bookkeeping, as data is pre-filled, and automatic suggestions streamline the process, reducing the need for manual adjustments and reconciliation.
2. **Upload Documents**: You can upload receipts, invoices, and other documents via the Bokio app, computer, or email to ensure they are linked to the correct transactions. Bokio also provides a "Receipt inbox" for emailing documents directly to your account.
3. **Post Transactions**: Bokio’s templates automatically manage transaction details, so you don't have to select accounts or calculate VAT. Automatic suggestions help you book transactions with a click. If no suggestions are available, you can search for **templates** or **create custom rules** to automate future recordings.
4. **Match and Check Transactions**: Bokio can automatically match payments with existing invoices, and it offers previews and edits to ensure accuracy. Bokio Business Account users benefit from even greater automation, where supplier and customer invoice payments are matched and posted automatically.

For any unrecorded documents, you can book directly from the Uploaded or To Do sections.

Read more : [https://www.bokio.se/hjalp/bokforing/att-bokfora-i-bokio/hur-bokfor-man-i-bokio/](https://www.bokio.se/hjalp/bokforing/att-bokfora-i-bokio/hur-bokfor-man-i-bokio/)

## Journal entries

In Bokio, journal entries are used to record all financial transactions of a company. Each journal entry consists of multiple items that affect different accounts. An item in a journal entry will either debit or credit an account from the chart of accounts. The sum of debits must always equal the sum of credits to maintain the accounting equation. This ensures that the books are balanced and accurate.

A chart of accounts is a structured list of all the financial accounts a business uses for tracking its transactions. It’s organized into four main categories: Assets, Liabilities, Income, and Costs, which make up the foundation of a company's accounting system. Each account has a unique number that helps identify the type of transaction it represents, with the first digit generally indicating its main category.

In Sweden, many companies use the BAS Chart of Accounts as a standard, which organizes accounts consistently across businesses, making it easier to understand and compare financial records. For example, in the BAS system:

* 1XXX accounts cover Assets like cash and accounts receivable.
* 2XXX accounts represent Liabilities and Equity.
* 3XXX accounts handle Revenue, such as sales.
* 4XXX to 8XXX cover various types of costs, from materials to personnel and interest costs.

In accounting, **debit** and **credit** are terms used to record changes in accounts.

**Assets:** Increase with Debit, Decrease with Credit\
**Equity & Liabilities:** Increase with Credit, Decrease with Debit\
**Income:** Increase with Credit, Decrease with Debit\
**Cost (Expenses):** Increase with Debit, Decrease with Credit

You should create a journal entry via API on an account that is supported by Bokio. If you try to create a journal entry using an account which is not supported by Bokio (not in its chart of accounts), you will receive an error message. We will support adding custom accounts (apart from the chart of accounts) soon in our APIs.

## Uploads

You can upload files to your company in Bokio. Regardless of how you upload your document, it ends up on the **Uploaded** page. Here you can also see the documentation that has already been posted. All documents that have not yet been recorded are also shown in your **To Do** list.

On the **Uploaded** page, you have the option to directly book, add payment, manage as expenditure, etc.

Using the API, you can upload PDF documents or image files to your company in Bokio.



# Invoicing in Bokio

In Bokio's invoice function, you can easily and conveniently create invoices and send them directly to your customers.

* Invoice directly via email to both Swedish and foreign customers
* Automatic check-off (if you have Bokio business account) and bookkeeping
* Manage invoices such as sending reminders or crediting invoices

To create an invoice in Bokio, start by going to the "Invoices" section in the left menu and clicking on "New invoice." You can customize your invoice layout, including adding your company logo and changing colors. If you are creating your first invoice, you will need to enter payment details for domestic and possibly international payments. You can choose to invoice customers in Sweden or abroad. Next, add products or services to the invoice, along with their details such as price, VAT rate, and unit. You can also add extra text lines for additional payment methods or information. Customize the terms and conditions, including payment due dates and late payment interest. Choose a delivery method, such as email, PDF, or e-invoice, and send it to the customer. Once sent, you can track the invoice's status and see if payment has been received, with automatic accounting if using a Bokio Business Account.

In Bokio's invoicing service, there is no limit to how many invoices you can send. You can create an unlimited number of customers and invoices.

If the customer has not paid the invoice by the due date, you can send a reminder with any fees directly from the invoice in Bokio. You can choose to just write a message to the customer that the invoice should be paid, or add a reminder fee.

<br />

## Customer

When you create a new customer, you can choose whether it is a Company or a Private Customer. If you choose Company Customer, you can import your customer's information directly from Allabolag.se. When the company details are fetched from Allabolag.se, it automatically fills in the required fields.

Once you have filled in your customer and billing information, you can also choose to add up to 3 contact persons for the same customer. Your default contact will be pre-selected when you create your invoice, but you can easily change the contact person for each invoice.

## Items

To invoice your customers in Bokio, you can easily create items for both goods and services. These can be managed under the "Items" section in the main menu, where you can also see an overview of what you're invoicing your customers.

Enter the quantity, price, VAT rate, and whether it's a goods or service. You can also select the unit for the product or service. You can also choose an account number to record the item, making bookkeeping more accurate and organized.

## Register payment of an invoice

If you use a Bokio Business Account and Bankgiro number to invoice and collect payments, the invoice will automatically be marked as paid when the customer pays, so you don’t have to manually register the payment. You can also set up notifications to get alerts on your phone or in Bokio when an invoice is paid.

If you don't have a Bokio Business Account or any other bank connected,  the invoice needs to be marked as paid when payment has been received. To do this, go to the invoice, click on "Register payment" in the top right corner, and enter the amount paid and the account it was paid into (usually your company’s bank account, using account 1930). You can manage your payment accounts from settings.

Make sure to select the correct date the money was deposited, and you can use the arrows or calendar to pick the correct date.

## Settlements

Settlements is a process of marking an invoice as paid by matching received payments, either fully or partially, and updating your accounts accordingly. Any differences (like fees, or rounding) can also be adjusted during settlement.

#### Currency rounding

Any rounding differences will automatically be recorded to account 3740 (Penny and krona adjustments).

#### Confirmed bad debt

This option is used when it’s certain that an invoice won’t be paid. The unpaid amount will be recorded to account 6351 (Confirmed losses on accounts receivable).

#### Bank fee

This option is used when a bank fee is deducted from a received payment (e.g., via PayPal). The fee will be recorded to account 6570 (Bank charges).

#### Balance adjustments

This option is used for correcting discrepancies on invoices without affecting bookkeeping.

## Credit note

When an invoice is credited, the original invoice is credited and a new invoice is created: a credit note. This credit note is sent to the customer. In Bokio, you can choose to credit an existing invoice. You can select which line items to credit. To partially credit, you can adjust the quantity of items.

<br />

## Quote

A quote is a precursor to an invoice. A quote is used to share an offer to your customer for a product or service. It usually includes a description of the product or job to be done, price, payment and delivery terms.

In Bokio's quotes, the validity period must also be stated so that the buyer knows how long the offer is valid.



# Public vs Private Integrations

Explaining the difference between Public and private integrations

The Bokio API distinguish between two types of integration.

* For integration that are specific to one company it's possible to use [Private integration](#private-integrations).
* Integrations that are for multiple companies should use [Public integrations](#public-integrations). This can for example be a CRM system, commerce system or integration platform.

**Key differences**

| Feature                                 | Public Integrations                                                                                                                                                                          | Private Integrations                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Availability                            | Available to all users                                                                                                                                                                       | Specific to one company                                                                                   |
| Limitation on Usage                     | No restrictions on # of tenants                                                                                                                                                              | 1 company                                                                                                 |
| Price plan requirements for Company API | Companies must have the Integrations (API) feature in their price plan. See <Anchor label="price plans" target="_blank" href="https://www.bokio.se/priser">price plans</Anchor>  for details | Private integrations are included in Premium, Business and Plus plans but limited to 5000 requests/month. |
| Security                                | OAuth 2.0                                                                                                                                                                                    | Integration Token from Bokio app                                                                          |
| APIs                                    | General API and Company API                                                                                                                                                                  | Company API                                                                                               |

## Private Integrations

Private integrations in Bokio are designed for use by a single company. These integrations can be set up directly by the company. Security for private integrations is managed through an Integration Token, which is generated within the Bokio app. This token allows the integration to access the company's data securely. Companies can set up multiple private integrations and each private integration can be assigned the permissions necessary. This can help avoid giving an integration more permissions than it should.

Private integrations are ideal for company-specific use cases where the integration needs to interact with internal systems or processes. Since these integrations are not available to other users, they can be tailored to meet the unique requirements of the company.

### How Private Integrations Work in Bokio

#### Integration Token

To create a private integration, the company adds a private integration from within the Bokio app. When the private integration has been added the Integration token is available. This token is used to authenticate API requests and ensures that only authorized applications can access the company's data.

<Image alt="Integration token in app" border={false} src="https://files.readme.io/7ce8a7778d08fb2cef3c3530f74b3dbbc3181d9382d216b63d2c7fa153fcc529-integrationtokeninapp.png" />

#### Custom Use Cases

Private integrations can be customized to address specific business needs. For example, a company might develop an integration to automate data entry, synchronize financial records with other systems, or generate custom reports. The flexibility of private integrations allows companies to optimize their workflows and improve efficiency.

### Example Workflow

1. **Generate Integration Token**: The company generates an Integration Token from within the Bokio app.
2. **Configure Integration**: The company configures the integration to use the Integration Token for authentication.
3. **Access Data**: The integration uses the token to make authenticated API requests to Bokio and access the company's data.

## Public Integrations

<InDevelopmentNotice />

<br />

Public integrations in Bokio are designed to be available to all integrations. The difference to Private Integrations is that Public integrations are available to integrations that can be used by multiple companies. For example, a CRM system or a commerce system or an integration platform. There might also be additional functionality available for public integrations. The public integrations also have access to all APIs, some of the might be restricted or require additional permissions.

Public integrations need to be added through the developer portal. The developer portal will be introduced at a later date. In the meantime, there is limited availability for some partners to get early access.

Security for public integrations is handled through OAuth 2.0, ensuring secure access to data. The different types of APIs use different OAuth 2.0 grants:

* **GeneralAPI**: OAuth 2.0 Client credentials grant
* **CompanyAPI**: OAuth 2.0 Authorization code grant

<br />

### How Public Integrations Work in Bokio

#### Developer Portal

To create a public integration, developers need to register their application in the Bokio Developer Portal. This portal provides the necessary tools to help developers integrate their applications with Bokio. The registration process involves providing essential details about the application, such as its name, description, and the specific permissions it requires.

> 📘 Early access
>
> There's a limited availability for some partners to get early access before the Developer portal is introduced.
>
> Please reach out to [support@bokio.se](mailto:support@bokio.se)  if you are interested.

<br />

#### Security through OAuth

Bokio uses OAuth to handle security for public integrations. OAuth is a standard protocol that allows secure authorization from third-party applications without sharing user credentials. When a user wants to connect their Bokio account with a third-party application, they are redirected to Bokio to log in and authorize the application. This process ensures that the third-party application can access the user's data securely.

The OAuth flow involves several steps:

1. **Authorization Request**: The third-party application redirects the user to Bokio's authorization endpoint.
2. **User Login and Consent**: The user logs in to Bokio and grants permission to the third-party application.
3. **Authorization Code**: Bokio redirects the user back to the third-party application with an authorization code.
4. **Token Exchange**: The third-party application exchanges the authorization code for an access token by making a request to Bokio's token endpoint.
5. **Access Token Usage**: The access token is used to make authenticated API requests to Bokio on behalf of the user.

#### No Limitation on Usage

Public integrations in Bokio are not limited to a specific company. This means that once an integration is developed and registered, it can be used by any number of companies that wish to connect their Bokio companies with the third-party application. This flexibility allows developers to create scalable solutions that can cater to a wide range of businesses.

### Example Workflow

1. **Register Application**: A developer registers their application in the Bokio Developer Portal and obtains the necessary credentials (Client ID and Client Secret).
2. **OAuth Authorization**: The application redirects the user to Bokio's OAuth authorization URL. The user logs in to Bokio and grants permission to the application. Bokio then redirects the user back to the application with an authorization code.
3. **Token Exchange**: The application exchanges the authorization code for an access token by making a request to Bokio's token endpoint. The access token is used to make authenticated API requests to Bokio on behalf of the user.
4. **Access Data**: The application uses the access token to request data from Bokio's API.

By following these steps, developers can create robust public integrations that enhance the functionality of Bokio for their users. For more details, see [Getting started with Public Integrations](https://docs.bokio.se/docs/getting-started-public).



# Testing your integration

This guide will explain how you can test your integration in Bokio.

Testing your integration in a test company is important for several reasons:

* **Protect your real financial data:** Changes made through the API will affect your accounting records. Using a test company keeps your actual business data safe.
* **Avoid accounting errors:** Since the API is in beta, unexpected behaviors could create accounting mistakes in your real accounting.
* **Learn safely:** You can experiment freely without worrying about consequences to your official financial records.
* **Prepare for implementation:** Once you're confident everything works as expected, you can apply the same processes to your real company.

## How to Test the Bokio API in a Test Company

**Step 1: Create a Test Company**

* Log in to your Bokio account.
* After logging in, click the company name in the top left and click on **Create a test company**, then fill in the details to set it up.
* To learn more about setting up your test company, check out the [guide](https://www.bokio.se/hjalp/komma-igang/skapa-ett-konto/skapa-testbolag/).

**Step 2: Generate API keys**

* Visit Integrations under Additional services in the left menu.
* Here you can now create and manage your API keys for private integrations.

**Step 3: Conduct Your Testing**

* Start with basic API calls to understand the response formats.
* Gradually test more complex scenarios.
* Document any unexpected behaviors or errors.

**Step 4: Review Results**

* Check that the API operations are correctly reflected in your test company's records.
* Verify that calculations and entries match your expectations.

Once you're satisfied with how everything works in your test environment, you'll be better prepared to implement the integration with your actual company.



# Getting Started with the Invoice API

This guide demonstrates a real-life use case of the Bokio API where **Aurora Works** sends an invoice to a customer **John Doe**.

## Bokio API Workflow: Creating and Managing an Invoice

This guide outlines a practical workflow using Bokio’s API for creating, publishing, and bookkeeping an invoice, including handling discounts, payments, and bank fee settlements.

The workflow covers:

1. Create or ensure the customer exists
2. Create an invoice
3. Add a discount via a line item
4. Publish the invoice
5. Bookkeep the invoice
6. Create bank fees write off (settlement)
7. Bookkeep bank fees write off (settlement)
8. Create payment of the invoice
9. Bookkeep the payment

***

## 1. Create or Ensure Customer Exists

Before an invoice is created, a customer record must exist. If the customer does not exist, create a new one; otherwise, retrieve an existing customer.

**Endpoint:**
`POST` [Customer](https://docs.bokio.se/reference/post-customer#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/customers \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
    "type": "company",
    "address": {
      "line1": "Älvsborgsvägen 10",
      "city": "Göteborg",
      "postalCode": "123 45",
      "country": "SE"
    },
    "name": "John Doe",
    "vatNumber": "SE1234567890",
    "orgNumber": "123456-7890",
    "paymentTerms": "30"
  }'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
    "id": "1e087e2f-0d8a-4f0f-8af3-870c1735e269",
    "name": "John Doe",
    "type": "company",
    "vatNumber": "SE1234567890",
    "orgNumber": "123456-7890",
    "paymentTerms": "30",
    "contactsDetails": [],
    "address": {
      "line1": "Älvsborgsvägen 10",
      "line2": null,
      "city": "Göteborg",
      "postalCode": "123 45",
      "country": "SE"
    },
    "language": "sv"
  }
  ```
</details>

The response includes the `customer ID`, which is required for creating invoices.
If the customer already exists, perform a `GET` [Customer](https://docs.bokio.se/reference/get-customers-customerid#/) and search by name or email (e.g., `name==John Doe`) to retrieve the corresponding ID.

<Image border={false} src="https://files.readme.io/29b192274d64454a3e037765f845e325e0c00297ac30778568f1e9d93a8795cf-Screenshot_2025-10-30_at_14.36.14.png" />

<br />

***

## 2. Create the invoice with items

**Endpoint:**
`POST` [invoice](https://docs.bokio.se/reference/post-invoice#/)

In this step, an invoice is created for the customer, referencing their `customer ID` from the previous step. The example below shows Aurora Works invoicing John Doe for consultancy services.

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
  "type": "invoice",
  "customerRef": { "id": "1e087e2f-0d8a-4f0f-8af3-870c1735e269" },
  "currency": "SEK",
  "currencyRate": 1,
  "lineItems": [
    {
      "itemType": "salesItem",
      "productType": "goods",
      "unitType": "hour",
      "quantity": 180,
      "description": "Consultancy services",
      "unitPrice": 290,
      "taxRate": 25
    }
  ],
  "invoiceDate": "2024-10-10",
  "dueDate": "2024-10-10"
  }'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
    "id": "5ce81018-2e14-4688-8de8-bfca14d8014e",
    "type": "invoice",
    "customerRef": {
      "id": "1e087e2f-0d8a-4f0f-8af3-870c1735e269",
      "name": "John Doe"
    },
    "invoiceNumber": null,
    "currency": "SEK",
    "currencyRate": 1,
    "totalAmount": 65250,
    "totalTax": 13050,
    "paidAmount": 0,
    "status": "draft",
    "invoiceDate": "2024-10-10",
    "dueDate": "2024-10-10",
    "lineItems": [
      {
        "id": 18320626,
        "description": "Consultancy services",
        "quantity": 180,
        "unitPrice": 290,
        "taxRate": 25
      }
    ]
  }
  ```
</details>

The response returns the `invoice ID`, which is required for the following steps.

<Image border={false} src="https://files.readme.io/dc713c2475b940582cf7bedef6fda614f25e49f700b1b3c4b74136530a0c05d9-Screenshot_2025-10-30_at_14.52.23.png" />

<br />

***

## 3. Add Discount

Bokio does not currently support per-item discounts directly. To apply a discount, add a new line item with a negative unit price.

**Endpoint:**
`POST` [Add line item to invoice](https://docs.bokio.se/reference/post-invoice-lineitem#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/line-items \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
  "itemType": "salesItem",
  "productType": "goods",
  "unitType": "hour",
  "quantity": 1,
  "description": "New User Discount",
  "unitPrice": -500,
  "taxRate": 25,
  "bookkeepingAccountNumber": 3730
  }'
  ```
</details>

This negative line represents a discount of 500 SEK. The account `3730` is commonly used for discounts but can be adjusted according to internal bookkeeping policies.

<Image border={false} src="https://files.readme.io/28b21a7a722de0e3d1613bbed661d637ba77ebf3d9b6c43fd3c70efeb44c473b-Screenshot_2025-10-30_at_15.16.26.png" />

***

## 4. Publish the Invoice

After all details have been reviewed, the invoice can be published. This action issues the invoice and makes it visible to the customer.

**Endpoint:**
`POST` [Publish invoice](https://docs.bokio.se/reference/post-invoices-invoiceid-publish#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/publish \
     --header 'accept: application/json'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
  "id": "5ce81018-2e14-4688-8de8-bfca14d8014e",
  "status": "published",
  "invoiceNumber": "2024-1001",
  "publishedDateTime": "2024-10-10T10:30:00Z"
  }
  ```
</details>

***

## 5. Bookkeep the invoice

To record (bookkeep) the invoice, use the `invoiceId` and `companyId` from previous steps. Bokio automatically handles bookkeeping accounts based on the line item setup. The discount line (500 SEK, account 3730) is included during posting.

**Endpoint:**
`POST` [Bookkeep invoice](https://docs.bokio.se/reference/record-invoice-with-id#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST   
  --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/record
  --header 'accept: application/json'
  ```
</details>

<Image border={false} src="https://files.readme.io/837327c9c8a7a3b3cd6be6e27f7d33cafa1157fa8c14a1fd055d3c9a5046e0c1-Screenshot_2025-10-30_at_16.03.59.png" />

***

## 6. Create payment of the invoice

Once payment is received, it can be registered using the payment endpoint. In this example, payment was received on **1 November** for the total amount, deposited into an additional business account (`1940`).

**Endpoint:**
`POST` [Create payment](https://docs.bokio.se/reference/post-invoice-payment#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/payments \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
  "date": "2024-11-01",
  "sumBaseCurrency": 64609.5,
  "bookkeepingAccountNumber": 1940
  }'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
    "id": "6c76d197-77a0-424e-88e6-df56de576da1",
    "invoiceId": "5ce81018-2e14-4688-8de8-bfca14d8014e",
    "date": "2024-11-01",
    "sumBaseCurrency": 64609.5,
    "bookkeepingAccountNumber": 1940,
    "journalEntryRef": null
  }
  ```
</details>

At this stage, the payment is recorded but not yet bookkept.

<Image border={false} src="https://files.readme.io/09e9dd41519ec7c472d341d34026cb4632e4d65b06788478f94f4e29245e54dd-image.png" />

***

## 7. Bookkeep payment of the invoice

To finalize bookkeeping, use the `payment ID` from the previous response. This ensures that the accounts receivable are cleared and the payment is properly reflected in the bank account (1940).

**Endpoint:**
`POST` [Record payment](https://docs.bokio.se/reference/record-invoice-payment-with-id#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/payments/<paymentId>/record \
     --header 'accept: application/json'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
  "id": "6c76d197-77a0-424e-88e6-df56de576da1",
  "invoiceId": "5ce81018-2e14-4688-8de8-bfca14d8014e",
  "date": "2024-11-01",
  "sumBaseCurrency": 64609.5,
  "bookkeepingAccountNumber": 1940,
  "journalEntryRef": {
    "id": "1f899268-5be1-45f0-8179-944f3adf892a"
  }
  }
  ```
</details>

After this step, the payment is fully recorded and linked to its corresponding journal entry in the bookkeeping system.

<Image border={false} src="https://files.readme.io/ce55a541d46977b430646b8d8296c4599218f3355ff745548ca9144eb2b78b43-Screenshot_2025-10-31_at_11.06.27.png" />

<br />

## 8. Create bank fees write off (settlement)

Bank fees or currency adjustments can be added by creating a settlement of type `bankFee`.

**Endpoint:**
`POST` [Create settlement](https://docs.bokio.se/reference/post-invoice-settlement#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/settlements \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
  "type": "bankFee",
  "invoiceSettlementDetails": {
    "reason": "bankFee",
    "date": "2024-10-15",
    "sumBaseCurrency": 15.5
  }
  }'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response
  {
    "id": "56ff70d2-6e32-4f14-acf9-4288efc44952",
    "type": "bankFee",
    "invoiceId": "5ce81018-2e14-4688-8de8-bfca14d8014e",
    "invoiceSettlementDetails": {
      "date": "2024-10-15",
      "sumBaseCurrency": 15.5
    },
    "journalEntryRef": null
  }
  ```
</details>

At this stage, the settlement is created but not yet recorded in bookkeeping.

<Image border={false} src="https://files.readme.io/7e7fea31fc8a065119cd5d3c6e0f19c58976163910ad6a6197e01e1134cacb73-image.png" />

***

## 9. Record bank fees write off (settlement)

Once the settlement is created, it must be bookkept to adjust the accounts receivable. For bank fees, the system currently uses account `6570` (Bank charges). This can be customized in future implementations.

**Endpoint:**
`POST` [Record settlement](https://docs.bokio.se/reference/record-invoice-settlement-with-id#/)

<details>
  <summary>Click to view request </summary>

  ```json Request
  curl --request POST \
     --url https://api.bokio.se/v1/companies/<companyId>/invoices/<invoiceId>/settlements/<settlementId>/record \
     --header 'accept: application/json'
  ```
</details>

<details>
  <summary>Click to view response </summary>

  ```json Response

  {
  "id": "56ff70d2-6e32-4f14-acf9-4288efc44952",
  "type": "bankFee",
  "invoiceId": "5ce81018-2e14-4688-8de8-bfca14d8014e",
  "invoiceSettlementDetails": {
    "date": "2024-10-15",
    "sumBaseCurrency": 15.5
  },
  "journalEntryRef": {
    "id": "2d0e6bf9-31e0-4884-ae6b-9b35cff1ef49"
  }
  }
  ```
</details>

<Image border={false} src="https://files.readme.io/a47e373bcaff78fd60a2d2b00771de11c7160fab772c718e644afe79f18b71f8-Screenshot_2025-10-31_at_10.51.46.png" />

***



# Getting started with Public Integrations

This guide will help you get started with vendor integrations (Public Integrations) for the Bokio API.

For [Public Integrations](doc:public-private-integrations.md#public-integrations) the workflow for getting setup is:

* Sign up for a Bokio developer account and integration
* Create an integration
* Copy `client id` and `client secret`
* Make API token request
* Make an API request

## Step 1: Sign up for a Bokio developer account and integration

To access the Bokio API, you need to sign up for a developer account and create an integration. At this early stage the developer accounts are created upon requests to Bokio after discussion on the integration you want to build.

## Step 2: Copy `client_id` and `client_secret`

With the integration created we will share `client_id` and `client_secret` through one-time links. These will later be used to authenticate using the OAuth grants. Make sure to store these values securely and avoid keeping them on local machines.

> ❗It's critical that you store integration secrets securely. Do not keep secret on local files or in source control. If you suspect a secret could have been accessed illegitimately, please revoke the secret in the developer portal.

## Step 3: Accessing the General API

With the `client_id` and `client_secret` it's possible to retrieve tokens for the General API through the Client Credentials Grant.

```http
GET https://api.bokio.se/v1/token HTTP 1.1
Authorization: Basic Base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded
Accept: application/json

grant_type=client_credentials
```

Now we can start making request to the General API. For example, checking connections for our app.

```http
GET https://api.bokio.se/v1/connections HTTP 1.1
Accept: application/json
Authorization: Bearer NbV3MZS7R1ApJwTyHq8XkLf4PGd9OuE5CiQn2BgKrDzFvYm
```

## Step 4: Accessing the Company API

The Company API contains all operations that can be done through the API on behalf of a Company tenant. Each access token is restricted to one tenant.

Start by having the user agent navigate in a browser to Bokio using a request similar to:

```http
GET https://api.bokio.se/v1/authorize?client_id=ed56c798-0ac8-4700-abd9-3dac99f7eca1&redirect_uri=https%3A%2F%2Fhost%2Fcallback&scope=accounting%20invoices&state=somerandomvalue&response_type=code HTTP 1.1
```

<Image border={false} src="https://files.readme.io/979555ed4c7f05839f226c83301852432a43d7206cbceb0441ff3313e8553686-image.png" />

<br />

```http
302 https://host/callback?code=id2-4IE6ACIT5yIMB2ae5zVV4PrisE5-8q_ehKfezK4&state=somerandomvalue HTTP 1.1
```

> ⚠️ Validate state parameter
>
> Please not that before proceeding you must validate the state parameter. By doing so you help users avoid CSRF (Client Side Request Forgery) attacks.

Now that you have the `code` you can make a request to retrieve the access\_token and refresh\_token.

```http
POST https://api.bokio.se/v1/token HTTP 1.1
Authorization: Basic Base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=code&code=id2-4IE6ACIT5yIMB2ae5zVV4PrisE5-8q_ehKfezK4
```

If the request is successful the response will contain a json similar to the one below.

```json
{
  "tenant_id": "1be29990-f977-4a62-bb03-f0e126e685d0",
  "tenant_type": "company",
  "access_token": "tffNhGDZ1FCpEWMkHduTA9FBnvNptzWSUfIlbcBHpdG5YJL",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "RpV4TYS8Z1KnJHpAqPJzXtl5QDl6OuK6NrQJk2FfLrGzKiM"
}
```

Now we can start working with company data. For example by doing the following request:

```http
GET https://api.bokio.se/v1/companies/1be29990-f977-4a62-bb03-f0e126e685d0/journal-entries?page=1&pageSize=50 HTTP 1.1
Accept: application/json
Authorization: Bearer tffNhGDZ1FCpEWMkHduTA9FBnvNptzWSUfIlbcBHpdG5YJL
```



# Getting started with Private Integrations

This guide will help you get started with company specific integrations (Private Integrations) for the Bokio API.

For [Private Integrations](doc:public-private-integrations.md#private-integrations) the workflow for getting setup is:

* Create a Private Integration in a Bokio company
* Obtain the Integration token and companyId
* Make an API request

## Step 1: Create a Private integration in Bokio

Go to [API Tokens](https://app.bokio.se/settings-r/private-integrations) and select the company that you want to create a Private integration on. Click the `Create Private Integration` button to create a new integration.

<br />

## Step 2: Obtain the Integration token and companyId

Now that you have a Private Integration you can copy the Integration token.

<Image alt="Private integrations in Bokio" border={false} src="https://files.readme.io/d7455d67e95494b50feb37cd4fdb116a010e3670614fcd443a7a5c0f7cf220f3-image.png" />

<br />

<Callout icon="❗" theme="error">
  It's critical that you store the Integration token securely. Do not keep the token on local files or in source control. If you suspect a token could have been accessed illegitimately, please revoke the access by deleting the Private integration and creating a new one.
</Callout>

## Step 3: Make an API request

```http
GET v1/companies/{companyId}/journal-entries HTTP/1.1
HOST: api.bokio.se
Accept: application/json
Authorization: Bearer UVTMjU2VjI6MUI2blk0OGViQlBESHgyTHJHV2RXRjh6UDRwL2IyQWVBVk9ybjNNSythNE9hZGxNNzlmdTNhak1rdnlsNjJzWkdrQ1IyT1NKSktadlRpbFdnczRwQVJrRkJDOFpqaU40TGdIbk5PdE5uTWd4a0xwUWI4WGs3dG1UYk5CMzhDNDZqVEh0N2dqWnV2anpFNW8vcDBJejFmcWdDUmdtTHZkV3ZsNkJUSHFhU3l3UWdlbDZ6eHZDS2l2U055YWpCN2phV1pwaDJXY0NoMnpkL3pCSUZkdTI5REhHbWUxS0FDMDc1ZStiSlR2cGtpdz0=
```

```json
{
  "id": "a419cf69-db6f-4de9-992c-b1a60942a443",
  "title": "Invoice 1234",
  "date": "2024-10-10",
  "journalEntryNumber": "V342",
  "items": [
      {
          "id": "575c2348-a8af-4de7-9243-1c880d2fa947",
          "debit": 200,
          "credit": 0,
          "account": 1930
      },
      {
          "id": "e07aca65-6b47-4aaa-9766-1b0e306dbd6b",
          "debit": 0,
          "credit": 40,
          "account": 3011
      },
      {
          "id": "29e64516-b34f-4299-8193-a0bd29c5c99c",
          "debit": 0,
          "credit": 160,
          "account": 2611
      }
  ]
}

```

# Bokio API Integration Guide

> **Note:** The Bokio API is currently in Beta. Breaking changes may be introduced without notice during the Beta period. Please reach out to support@bokio.se or join the [Developer community](https://bokio.typeform.com/to/auadk1P0) for feedback and questions.

## Table of Contents

1. [Overview](#overview)
2. [API Architecture](#api-architecture)
3. [Integration Types](#integration-types)
4. [Authentication](#authentication)
5. [API Versioning](#api-versioning)
6. [Scopes](#scopes)
7. [Rate Limits](#rate-limits)
8. [Pagination](#pagination)
9. [Filtering](#filtering)
10. [Metadata](#metadata)
11. [Date and Time](#date-and-time)
12. [Error Handling](#error-handling)
13. [Company API Reference](#company-api-reference)
14. [General API Reference](#general-api-reference)
15. [Common Workflows](#common-workflows)
16. [Best Practices](#best-practices)
17. [Troubleshooting](#troubleshooting)

---

## Overview

The Bokio API allows developers to integrate their applications with Bokio's Swedish accounting platform. With the API, you can automate various accounting tasks, retrieve financial data, and perform actions on behalf of Bokio companies.

**Base URL:** `https://api.bokio.se/v1`

**Key Capabilities:**
- Create and manage journal entries (bookkeeping)
- Upload and manage receipts and documents
- Create, publish, and record invoices
- Manage customers and items
- Access fiscal year data and SIE file exports
- Handle credit notes and payments
- Process bank payments (elevated permissions required)

---

## API Architecture

Bokio's API is split into two distinct APIs:

### Company API
Used for making requests related to a specific company. Allows you to:
- Retrieve company information
- Manage accounts and bookkeeping
- Access financial data specific to a company
- All endpoints prefixed with `/companies/{companyId}/`

### General API
Provides public integration operations related to the Bokio platform:
- Obtaining access tokens (OAuth 2.0)
- Refreshing tokens
- Managing connections

| API | Purpose | Authentication |
|-----|---------|----------------|
| Company API | Company-specific operations | Bearer Token (Private) or OAuth Access Token (Public) |
| General API | Integration management, OAuth | OAuth 2.0 Client Credentials |

---

## Integration Types

Bokio distinguishes between two types of integrations:

### Private Integrations

**Purpose:** Designed for use by a single company.

**Characteristics:**
- Set up directly within the Bokio app
- Security managed through an Integration Token
- Limited to 1 company per integration
- Included in Premium, Business, and Plus plans
- Limited to 5,000 requests/month
- Only access to Company API

**Setup Workflow:**
1. Navigate to **Settings > API Tokens** in the Bokio app
2. Click **Create Token** to generate an Integration Token
3. Copy and securely store the token
4. Use the token as a Bearer token in API requests

**Example Request:**
```http
GET https://api.bokio.se/v1/companies/{companyId}/journal-entries HTTP/1.1
Authorization: Bearer YOUR_INTEGRATION_TOKEN
Accept: application/json
```

### Public Integrations

**Purpose:** Available to multiple companies (e.g., CRM systems, commerce platforms, integration platforms).

**Characteristics:**
- Registered through the Bokio Developer Portal
- Security handled through OAuth 2.0
- No limitation on number of companies
- Access to both General API and Company API
- Companies must have the Integrations (API) feature in their price plan

> **Note:** Public integrations are currently in limited availability. Contact support@bokio.se for early access.

**Setup Workflow:**
1. Register application in the Bokio Developer Portal
2. Obtain `client_id` and `client_secret`
3. Implement OAuth 2.0 authorization flow
4. Use access tokens for API requests

### Comparison Table

| Feature | Public Integrations | Private Integrations |
|---------|---------------------|----------------------|
| Availability | Available to all users | Specific to one company |
| Limitation on Usage | No restrictions on tenants | 1 company |
| Price Plan Requirements | Companies need Integrations (API) feature | Premium, Business, Plus (5000 req/month) |
| Security | OAuth 2.0 | Integration Token |
| APIs | General API + Company API | Company API only |

---

## Authentication

All APIs use Bearer token as the authorization mechanism, but the token origin differs by integration type.

### Private Integration Authentication

Use the Integration Token generated in the Bokio app:

```http
GET https://api.bokio.se/v1/companies/{companyId}/invoices HTTP/1.1
Authorization: Bearer {integration_token}
Accept: application/json
```

### Public Integration Authentication

#### Step 1: Access General API (Client Credentials Grant)

```http
POST https://api.bokio.se/v1/token HTTP/1.1
Authorization: Basic {Base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded
Accept: application/json

grant_type=client_credentials
```

**Response:**
```json
{
  "access_token": "NbV3MZS7R1ApJwTyHq8XkLf4PGd9OuE5CiQn2BgKrDzFvYm",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Step 2: Access Company API (Authorization Code Grant)

**2a. Redirect user to authorization:**
```http
GET https://api.bokio.se/v1/authorize?
  client_id={client_id}&
  redirect_uri={encoded_redirect_uri}&
  scope=invoices:read%20invoices:write&
  state={random_state_value}&
  response_type=code HTTP/1.1
```

**2b. User authenticates and grants permission**

**2c. Handle callback with authorization code:**
```
https://your-app.com/callback?code={authorization_code}&state={state_value}
```

> ⚠️ **Security:** Always validate the `state` parameter to prevent CSRF attacks.

**2d. Exchange code for tokens:**
```http
POST https://api.bokio.se/v1/token HTTP/1.1
Authorization: Basic {Base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={authorization_code}&redirect_uri={redirect_uri}
```

**Response:**
```json
{
  "tenant_id": "1be29990-f977-4a62-bb03-f0e126e685d0",
  "tenant_type": "company",
  "access_token": "tffNhGDZ1FCpEWMkHduTA9FBnvNptzWSUfIlbcBHpdG5YJL",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "RpV4TYS8Z1KnJHpAqPJzXtl5QDl6OuK6NrQJk2FfLrGzKiM"
}
```

#### Refreshing Tokens

```http
POST https://api.bokio.se/v1/token HTTP/1.1
Authorization: Basic {Base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh_token}
```

### Security Best Practices

- Store `client_secret` and tokens securely (never in source control or local files)
- If a secret is compromised, revoke it immediately in the developer portal
- Validate the `state` parameter in OAuth callbacks
- Use HTTPS for all API communications
- Regenerate tokens if you suspect unauthorized access

---

## API Versioning

The Bokio API uses URL-based versioning:

**Current Version:** `v1`

**Base URL:** `https://api.bokio.se/v1`

- Version is included in the URL path
- Breaking changes will result in a new version number
- Deprecated versions will be announced with migration timelines
- Check the [Changelog](https://docs.bokio.se/changelog) for version updates

---

## Scopes

Scopes provide fine-grained permission control, allowing integrations to request only the specific access they need.

### Scope Naming Pattern

Scopes follow the pattern: `{resource}:{action}`

Example: `journal-entries:read`, `invoices:write`

### Requesting Multiple Scopes

Combine scopes in a space-delimited string:
```
journal-entries:read journal-entries:write invoices:read
```

### Available Scopes

| Resource | Read Scope | Write Scope | Description |
|----------|------------|-------------|-------------|
| Journal Entries | `journal-entries:read` | `journal-entries:write` | Access to accounting journal entries |
| Uploads | `uploads:read` | `uploads:write` | Access to uploaded documents and files |
| Invoices | `invoices:read` | `invoices:write` | Access to invoices |
| Credit Notes | `credit-notes:read` | `credit-notes:write` | Access to credit notes |
| Customers | `customers:read` | `customers:write` | Access to customer information |
| Items | `items:read` | `items:write` | Access to invoice line items and products |
| SIE Files | `sie:read` | — | Read-only access to SIE export files |
| Fiscal Years | `fiscal-years:read` | — | Read-only access to fiscal year information |
| Chart of Accounts | `chart-of-accounts:read` | — | Read-only access to chart of accounts |
| Company Information | `company-information:read` | — | Read-only access to company details |

### Elevated Scopes

Elevated scopes require explicit approval from Bokio and are only available for public integrations:

| Resource | Read Scope | Write Scope | Description |
|----------|------------|-------------|-------------|
| Bank Payments | `bank-payments:read-limited` | `bank-payments:write` | Access to bank payments |

**Requirements for Elevated Scopes:**
- Public integration only
- Partnership contract with Bokio
- Security review approval

### Best Practices

1. **Principle of Least Privilege:** Only request scopes absolutely necessary
2. **Separate Read/Write Access:** Consider if write access is truly needed
3. **Regular Review:** Periodically review scope requirements as functionality evolves

---

## Rate Limits

Bokio applies rate limits to ensure API stability and fair usage.

**Rate Limit Response:**
- Status Code: `429 Too Many Requests`
- The request was not processed as rate limits have been surpassed

**Private Integration Limits:**
- 5,000 requests per month (included in Premium, Business, Plus plans)

**Handling Rate Limits:**
1. Implement exponential backoff when receiving 429 responses
2. Cache responses where appropriate
3. Batch operations where possible
4. Monitor your usage patterns

---

## Pagination

List endpoints in the Bokio API support pagination through query parameters.

### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number (1-indexed) | 1 |
| `pageSize` | integer | Number of items per page | Varies by endpoint |

### Example Request

```http
GET https://api.bokio.se/v1/companies/{companyId}/journal-entries?page=1&pageSize=50 HTTP/1.1
Authorization: Bearer {token}
Accept: application/json
```

### Response Structure

Paginated responses typically include:
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 50,
  "totalPages": 10,
  "totalCount": 487
}
```

### Best Practices

- Start with a reasonable page size (e.g., 50-100)
- Iterate through pages until you've retrieved all needed data
- Consider caching results to reduce API calls

---

## Filtering

The Bokio API supports powerful filtering through the `query` parameter in GET requests.

### Basic Syntax

```
GET /api/resource?query=property operator value
```

### Supported Operators

| Operator | Explanation | Number | String | Date/DateTime |
|----------|-------------|--------|--------|---------------|
| `==` | Equals | ✅ | ✅ | ✅ |
| `!=` | Not equals | ✅ | ✅ | ✅ |
| `>` | Greater than | ✅ | ❌ | ✅ |
| `<` | Less than | ✅ | ❌ | ✅ |
| `>=` | Greater than or equal | ✅ | ❌ | ✅ |
| `<=` | Less than or equal | ✅ | ❌ | ✅ |
| `~` | Contains (case-sensitive) | ❌ | ✅ | ❌ |
| `&&` | AND (combine conditions) | — | — | — |
| `\|\|` | OR (alternative conditions) | — | — | — |

### URL Encoding

> ⚠️ **Important:** Always URL-encode filter queries!

| Character | Encoded |
|-----------|---------|
| Space | `%20` |
| Equals | `%3D` |
| Ampersand | `%26` |
| Pipe | `%7C` |

### Examples

**String Filtering:**
```
# Exact match
GET /api/customers?query=name==John%20Doe

# Contains
GET /api/customers?query=name~John

# Not equal
GET /api/invoices?query=status!=draft
```

**Number Filtering:**
```
# Greater than
GET /api/invoices?query=totalAmount>500

# Range
GET /api/invoices?query=totalAmount>=100&&totalAmount<=1000
```

**Date Filtering:**
```
# Exact date
GET /api/invoices?query=dueDate==2025-01-15

# Date range
GET /api/invoices?query=invoiceDate>=2025-01-01&&invoiceDate<2025-02-01
```

**Combined Filters:**
```
# AND conditions
GET /api/invoices?query=status==pending&&totalAmount>100&&dueDate<2025-12-31

# OR conditions
GET /api/invoices?query=status==published||status==paid
```

**Metadata Filtering:**
```
GET /api/invoices?query=metadata.externalId==EXT-12345
```

---

## Metadata

The metadata field allows you to attach custom key-value data to Bokio objects.

**Currently Supported On:**
- Invoices (create operation)

### Structure

```json
{
  "metadata": {
    "externalId": "EXT-12345",
    "source": "CRM-System",
    "customField": "custom-value"
  }
}
```

### Constraints

| Constraint | Limit |
|------------|-------|
| Maximum keys per object | 10 |
| Maximum key length | 25 characters |
| Value storage | Stored as strings |

### Filtering by Metadata

Use the `metadata.` prefix in queries:
```
GET /api/invoices?query=metadata.externalId==EXT-12345
```

### Best Practices

**Ideal Use Cases:**
- Storing references to your own systems
- Tracking integration-specific states
- Maintaining non-sensitive contextual information

**Do NOT Store:**
- Sensitive personal information
- Financial credentials
- Passwords or API keys
- Personal identification numbers

> **Note:** Bokio does not use or process metadata internally. This information is not displayed to users within the Bokio application.

---

## Date and Time

### Date Format

Use ISO 8601 date format: `YYYY-MM-DD`

**Examples:**
- `2025-01-29`
- `2024-12-31`

### DateTime Format

Use ISO 8601 datetime format with timezone:

**Examples:**
- `2025-01-29T14:30:00Z` (UTC)
- `2025-01-29T15:30:00+01:00` (with timezone offset)

### Common Date Fields

| Field | Format | Description |
|-------|--------|-------------|
| `invoiceDate` | `YYYY-MM-DD` | Date the invoice was issued |
| `dueDate` | `YYYY-MM-DD` | Payment due date |
| `date` | `YYYY-MM-DD` | Transaction/entry date |
| `publishedDateTime` | ISO 8601 | When invoice was published |
| `createdAt` | ISO 8601 | Record creation timestamp |

---

## Error Handling

The Bokio API returns standard HTTP status codes and structured error responses.

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200 OK` | Request successful |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid request (validation error, operation not allowed) |
| `401 Unauthorized` | Authentication required or invalid |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server error |

### Error Response Structure

All errors include:
```json
{
  "message": "Human-readable error description",
  "code": "error-code",
  "bokioErrorId": "uuid-for-support-reference"
}
```

### Common Error Codes

#### `not-found` (404)
```json
{
  "message": "The requested resource was not found",
  "code": "not-found",
  "bokioErrorId": "2f3fa960-3def-45ce-8cf3-28d33ac76fd7"
}
```

#### `validation-error` (400)
Includes an `errors` array with field-level details using JSON Pointer notation:
```json
{
  "message": "Validation failed with 1 error",
  "code": "validation-error",
  "bokioErrorId": "2ddf3c8f-c83a-4eb2-a28f-8f6f50425947",
  "errors": [
    {
      "field": "#/lineItems/0/taxRate",
      "message": "The tax rate field must be one of the following values: 0%, 6%, 12%, or 25%"
    }
  ]
}
```

#### `operation-not-allowed` (400)
Returned when an operation cannot be performed (e.g., updating a published invoice):
```json
{
  "message": "Cannot update a published invoice",
  "code": "operation-not-allowed",
  "bokioErrorId": "..."
}
```

#### `limit-exceeded` (400)
Returned when file size or other limits are exceeded:
```json
{
  "message": "File size exceeds maximum allowed",
  "code": "limit-exceeded",
  "bokioErrorId": "..."
}
```

#### `internal-server-error` (500)
```json
{
  "message": "An unexpected error occurred",
  "code": "internal-server-error",
  "bokioErrorId": "2f3fa960-3def-45ce-8cf3-28d33ac76fd7"
}
```

### JSON Pointer for Field Errors

Validation errors use JSON Pointer notation to identify specific fields:
- `#/lineItems/0/quantity` → First line item's quantity field
- `#/lineItems/1/taxRate` → Second line item's tax rate field
- `#/customerRef/id` → Customer reference ID field

---

## Company API Reference

All Company API endpoints are prefixed with: `/companies/{companyId}/`

### Company Information

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/companies/{companyId}` | Retrieve company information | `company-information:read` |

### Journal Entries

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/journal-entries` | Create a journal entry | `journal-entries:write` |
| GET | `/journal-entries` | List journal entries | `journal-entries:read` |
| GET | `/journal-entries/{journalId}` | Get a journal entry | `journal-entries:read` |
| POST | `/journal-entries/{journalId}/reverse` | Reverse a journal entry | `journal-entries:write` |

### Uploads

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/uploads` | Add an upload (multipart/form-data) | `uploads:write` |
| GET | `/uploads` | List uploads | `uploads:read` |
| GET | `/uploads/{uploadId}` | Get an upload | `uploads:read` |
| GET | `/uploads/{uploadId}/download` | Download file data | `uploads:read` |

### Customers

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/customers` | Create a customer | `customers:write` |
| GET | `/customers` | List customers | `customers:read` |
| GET | `/customers/{customerId}` | Get a customer | `customers:read` |
| PUT | `/customers/{customerId}` | Update a customer | `customers:write` |
| DELETE | `/customers/{customerId}` | Delete a customer | `customers:write` |

### Invoices

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/invoices` | Create an invoice | `invoices:write` |
| GET | `/invoices` | List invoices | `invoices:read` |
| GET | `/invoices/{invoiceId}` | Get an invoice | `invoices:read` |
| PUT | `/invoices/{invoiceId}` | Update an invoice (draft only) | `invoices:write` |
| POST | `/invoices/{invoiceId}/line-items` | Add a line item | `invoices:write` |
| POST | `/invoices/{invoiceId}/publish` | Publish an invoice | `invoices:write` |
| POST | `/invoices/{invoiceId}/record` | Bookkeep an invoice | `invoices:write` |
| POST | `/invoices/{invoiceId}/credit` | Create a credit note | `invoices:write` |

### Invoice Attachments

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/invoices/{invoiceId}/attachments` | Add attachment | `invoices:write` |
| GET | `/invoices/{invoiceId}/attachments` | List attachments | `invoices:read` |
| GET | `/invoices/{invoiceId}/attachments/{attachmentId}` | Get attachment | `invoices:read` |
| DELETE | `/invoices/{invoiceId}/attachments/{attachmentId}` | Delete attachment | `invoices:write` |
| GET | `/invoices/{invoiceId}/attachments/{attachmentId}/download` | Download attachment | `invoices:read` |

### Invoice Payments

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/invoices/{invoiceId}/payments` | Create a payment | `invoices:write` |
| GET | `/invoices/{invoiceId}/payments` | List payments | `invoices:read` |
| GET | `/invoices/{invoiceId}/payments/{paymentId}` | Get a payment | `invoices:read` |
| DELETE | `/invoices/{invoiceId}/payments/{paymentId}` | Delete a payment | `invoices:write` |
| POST | `/invoices/{invoiceId}/payments/{paymentId}/record` | Bookkeep payment | `invoices:write` |

### Invoice Settlements

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/invoices/{invoiceId}/settlements` | Create a settlement | `invoices:write` |
| GET | `/invoices/{invoiceId}/settlements` | List settlements | `invoices:read` |
| GET | `/invoices/{invoiceId}/settlements/{settlementId}` | Get a settlement | `invoices:read` |
| DELETE | `/invoices/{invoiceId}/settlements/{settlementId}` | Delete a settlement | `invoices:write` |
| POST | `/invoices/{invoiceId}/settlements/{settlementId}/record` | Bookkeep settlement | `invoices:write` |

### Items

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/items` | Create an item | `items:write` |
| GET | `/items` | List items | `items:read` |
| GET | `/items/{itemId}` | Get an item | `items:read` |
| PUT | `/items/{itemId}` | Update an item | `items:write` |
| DELETE | `/items/{itemId}` | Delete an item | `items:write` |

### Fiscal Years & SIE Files

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/fiscal-years` | List fiscal years | `fiscal-years:read` |
| GET | `/fiscal-years/{fiscalYearId}` | Get a fiscal year | `fiscal-years:read` |
| GET | `/fiscal-years/{fiscalYearId}/sie-file` | Download SIE file | `sie:read` |

### Credit Notes

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/credit-notes` | List credit notes | `credit-notes:read` |
| GET | `/credit-notes/{creditNoteId}` | Get a credit note | `credit-notes:read` |
| PUT | `/credit-notes/{creditNoteId}` | Update a credit note | `credit-notes:write` |
| POST | `/credit-notes/{creditNoteId}/publish` | Publish a credit note | `credit-notes:write` |
| POST | `/credit-notes/{creditNoteId}/record` | Bookkeep credit note | `credit-notes:write` |

### Chart of Accounts

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| GET | `/chart-of-accounts` | List accounts | `chart-of-accounts:read` |
| GET | `/chart-of-accounts/{accountNumber}` | Get specific account | `chart-of-accounts:read` |

### Bank Payments (Elevated Scope)

| Method | Endpoint | Description | Scope |
|--------|----------|-------------|-------|
| POST | `/bank-payments` | Create a bank payment | `bank-payments:write` |
| GET | `/bank-payments` | List bank payments | `bank-payments:read-limited` |
| GET | `/bank-payments/{bankPaymentId}` | Get a bank payment | `bank-payments:read-limited` |

> **Note:** Bank payments require elevated scopes and are only available for approved public integrations.

---

## General API Reference

The General API handles OAuth authentication and connection management.

### Authorization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/token` | Obtain or refresh access token |
| GET | `/authorize` | Initiate OAuth authorization flow |

### Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/connections` | List integration connections |
| GET | `/connections/{connectionId}` | Get a specific connection |
| DELETE | `/connections/{connectionId}` | Remove a connection |

---

## Common Workflows

### Invoice Workflow

A complete invoice workflow typically follows these steps:

```
1. Create Customer (if not exists)
   POST /companies/{companyId}/customers
   
2. Create Invoice
   POST /companies/{companyId}/invoices
   
3. Add Additional Line Items (if needed)
   POST /companies/{companyId}/invoices/{invoiceId}/line-items
   
4. Publish Invoice
   POST /companies/{companyId}/invoices/{invoiceId}/publish
   
5. Bookkeep Invoice
   POST /companies/{companyId}/invoices/{invoiceId}/record
   
6. Create Payment (when payment received)
   POST /companies/{companyId}/invoices/{invoiceId}/payments
   
7. Bookkeep Payment
   POST /companies/{companyId}/invoices/{invoiceId}/payments/{paymentId}/record
```

### Creating a Customer

```json
POST /companies/{companyId}/customers

{
  "type": "company",
  "name": "Acme Corporation",
  "vatNumber": "SE1234567890",
  "orgNumber": "123456-7890",
  "paymentTerms": "30",
  "address": {
    "line1": "Storgatan 1",
    "city": "Stockholm",
    "postalCode": "111 22",
    "country": "SE"
  }
}
```

**Customer Types:**
- `company` - Business customer
- `private` - Individual customer

### Creating an Invoice

```json
POST /companies/{companyId}/invoices

{
  "type": "invoice",
  "customerRef": {
    "id": "customer-uuid"
  },
  "currency": "SEK",
  "currencyRate": 1,
  "invoiceDate": "2025-01-29",
  "dueDate": "2025-02-28",
  "lineItems": [
    {
      "itemType": "salesItem",
      "productType": "goods",
      "unitType": "hour",
      "quantity": 10,
      "description": "Consulting services",
      "unitPrice": 1000,
      "taxRate": 25
    }
  ],
  "metadata": {
    "externalId": "EXT-12345"
  }
}
```

**Invoice Types:**
- `invoice` - Standard invoice
- `cash` - Cash invoice

**Tax Rates (Swedish VAT):**
- `25` - Standard rate
- `12` - Reduced rate (food, hotels)
- `6` - Reduced rate (books, newspapers)
- `0` - Zero rate (exports, etc.)

### Adding a Discount

Bokio doesn't support per-item discounts directly. Use a negative line item:

```json
POST /companies/{companyId}/invoices/{invoiceId}/line-items

{
  "itemType": "salesItem",
  "productType": "goods",
  "unitType": "st",
  "quantity": 1,
  "description": "New Customer Discount",
  "unitPrice": -500,
  "taxRate": 25,
  "bookkeepingAccountNumber": 3730
}
```

### Recording a Payment

```json
POST /companies/{companyId}/invoices/{invoiceId}/payments

{
  "date": "2025-02-15",
  "sumBaseCurrency": 12500,
  "bookkeepingAccountNumber": 1930
}
```

**Common Payment Accounts:**
- `1930` - Bank account (default)
- `1940` - Additional bank account
- `1910` - Cash account

### Creating a Bank Fee Settlement

```json
POST /companies/{companyId}/invoices/{invoiceId}/settlements

{
  "type": "bankFee",
  "invoiceSettlementDetails": {
    "reason": "bankFee",
    "date": "2025-02-15",
    "sumBaseCurrency": 15.50
  }
}
```

**Settlement Types:**
- `bankFee` - Bank charges (posts to account 6570)
- `currency` - Currency adjustments

---

## Best Practices

### Security

1. **Never expose tokens in client-side code**
2. **Store secrets in secure environment variables**
3. **Use HTTPS for all API communications**
4. **Implement proper token refresh logic**
5. **Validate OAuth state parameters**

### Performance

1. **Use pagination for large datasets**
2. **Implement caching where appropriate**
3. **Batch related operations**
4. **Use filtering to reduce response sizes**
5. **Monitor rate limit usage**

### Error Handling

1. **Always check HTTP status codes**
2. **Log `bokioErrorId` for support requests**
3. **Implement exponential backoff for rate limits**
4. **Handle validation errors gracefully**
5. **Provide meaningful error messages to users**

### Data Integrity

1. **Validate data before sending**
2. **Use appropriate tax rates for Sweden**
3. **Ensure journal entries balance (debits = credits)**
4. **Use correct date formats (ISO 8601)**
5. **Reference existing customers before creating invoices**

---

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Token expired → Refresh the token
- Invalid token → Regenerate in Bokio app
- Wrong integration type → Check authentication method

**403 Forbidden**
- Insufficient scope → Request additional permissions
- Integration not approved → Contact Bokio support
- Old token format → Generate new token

**404 Not Found**
- Invalid companyId → Verify company ID from URL
- Resource doesn't exist → Check resource ID
- Wrong endpoint → Verify URL path

**400 Validation Error**
- Check the `errors` array for field-specific issues
- Verify tax rates are valid (0, 6, 12, 25)
- Ensure required fields are provided
- Check date formats

**429 Rate Limited**
- Implement exponential backoff
- Reduce request frequency
- Cache responses where possible

### Getting Help

- **Documentation:** [docs.bokio.se](https://docs.bokio.se)
- **Email:** support@bokio.se
- **Developer Community:** [Join the community](https://bokio.typeform.com/to/auadk1P0)
- **Changelog:** [docs.bokio.se/changelog](https://docs.bokio.se/changelog)

---

## Appendix: Swedish Accounting Context

### BAS Chart of Accounts

Bokio uses the Swedish BAS standard chart of accounts. Common account ranges:

| Range | Category |
|-------|----------|
| 1xxx | Assets |
| 2xxx | Liabilities & Equity |
| 3xxx | Revenue |
| 4xxx | Cost of Goods Sold |
| 5xxx-6xxx | Operating Expenses |
| 7xxx | Personnel Costs |
| 8xxx | Financial Items |

### Common Accounts

| Account | Description |
|---------|-------------|
| 1510 | Accounts Receivable |
| 1930 | Bank Account |
| 1940 | Additional Bank Account |
| 2610 | Output VAT 25% |
| 2620 | Output VAT 12% |
| 2630 | Output VAT 6% |
| 3010 | Sales of Goods |
| 3040 | Sales of Services |
| 3730 | Discounts Given |
| 6570 | Bank Charges |

### SIE Files

SIE (Standard Import Export) is the Swedish standard format for exchanging accounting data. Use the SIE file download endpoint to export data for accountants, auditors, or other systems.

---

*Last updated: January 2026*

*This document is based on Bokio API v1 Beta documentation. Check the official documentation for the latest updates.*