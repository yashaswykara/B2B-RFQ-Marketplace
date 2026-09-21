TradeDesk RFQ Marketplace
TradeDesk is a full-stack B2B RFQ (Request for Quotation) marketplace where buyers create requirements and suppliers submit quotations.

Features
* Buyer and Supplier accounts
* JWT authentication
* Secure password hashing
* Buyer RFQ management
* Supplier RFQ search
* Multiple quotations per RFQ
* Buyer quotation comparison
* Accept and reject quotations
* Automatic rejection of other quotations after acceptance
* Supplier quotation status tracking

Technology Stack
* Node.js
* Express.js
* MongoDB
* Mongoose
* Vanilla JavaScript
* HTML
* CSS

How It Works
Buyer → RFQ → Quotations ← Suppliers
1. A buyer creates an RFQ.
2. Suppliers view open RFQs.
3. Suppliers submit quotations.
4. The buyer compares quotations.
5. The buyer accepts one quotation.
6. The RFQ status changes to `AWARDED.
7. The accepted quotation becomes `ACCEPTED.
8. All other quotations become `REJECTED.

Requirements

* Node.js 18 or higher
* npm
* MongoDB running locally or MongoDB Atlas

Installation
Clone the repository:
bash
git clone <repository-url>
cd <project-folder>
npm install

Create a .env file in the project root:
env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/rfq_marketplace
JWT_SECRET=your-long-random-secret
CORS_ORIGIN=http://localhost:3000

Make sure MongoDB is running before starting the application.
Run the Project
Start the application:
bash
npm start
Open the application at:
http://localhost:3000(local host)


Main User Roles
Buyer
* Create and manage RFQs
* View received quotations
* Compare quotations
* Accept or reject quotations

Supplier
* Browse open RFQs
* Submit quotations
* View submitted quotations
* Track quotation statuses

Main API Endpoints
 Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/change-password

RFQs
POST   /api/rfqs
GET    /api/rfqs
GET    /api/rfqs/my
GET    /api/rfqs/:id


Project Structure
public/                  Frontend files
server/                  Express backend
server/models/           MongoDB models
server/routes/           API routes
server/middleware/       Authentication and error handling
server/utils/            Validation and response helpers


