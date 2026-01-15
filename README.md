
```md
# Veritix Backend

Veritix Backend is the core **server-side application** powering the Veritix ticketing platform.  
It provides secure, scalable, and blockchain-anchored APIs for managing events, ticketing flows, authentication, payments, scans, analytics, and integrations with the **Stellar ecosystem**.

The backend implements business logic, smart contract orchestration data workflows, and security controls — all designed to support Veritix’s decentralized ticketing vision.

---

## Overview

Veritix is a blockchain-powered ticketing platform that uses decentralized technologies to eliminate fraud, double-spending, and unauthorized reselling.  
The backend is built with **NestJS (TypeScript)** and leverages **Stellar** for secure on-chain anchoring of ticket metadata and transaction proofs.

Key responsibilities include:
- Event & ticket lifecycle APIs  
- Authentication & role-based access control  
- Payment and revenue logic  
- Ticket scanning & validation endpoints  
- Audit-ready blockchain anchoring  
- Reporting & analytics  
- Integration with other Veritix clients (Web, Mobile)  

---


## Repository Contents

```

veritix-backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── events/
│   │   ├── tickets/
│   │   ├── users/
│   │   └── analytics/
├── test/
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md

````

---

## Getting Started

### Requirements
- Node.js 18+  
- npm, yarn, or pnpm  
- PostgreSQL (or other supported SQL database)  
- Stellar network access (testnet or mainnet)  

### Install Dependencies

```bash
git clone https://github.com/Lead-Studios/veritix-backend.git
cd veritix-backend
npm install
````

### Environment

Create `.env` based on `.env.example` and fill in:

```
DATABASE_URL=postgres://...
JWT_SECRET=...
STELLAR_NETWORK=testnet
STELLAR_SECRET=...
STELLAR_PUBLIC_KEY=...
```

### Run in Dev Mode

```bash
npm run start:dev
```

Server starts at `http://localhost:3000`.

---

## Core Features

### Event & Ticket Management

* CRUD APIs for events and tickets
* Organizer controls (pricing, limits, capacity)

### Authentication

* JWT auth with role-based access control
* Admin, organizer, attendee roles

### Payments & Revenue

* Integrated payment processing
* Revenue share calculation rules

### Ticket Validation

* QR code generation/validation
* On-chain metadata verification

### Analytics & Reporting

* Ticket scans and usage metrics
* Sales and event performance

### 🔗 Stellar Integration

* Anchor important events on Stellar
* Store ticket proofs & audit trail

---

## Contract Integration

Veritix uses a companion smart-contract repository: **veritix-contract**. This repo contains the on-chain contract logic (e.g., for decentralized ticket rules, transfers, anchoring logic) that interacts with the backend.
You can find it at:

🔗 [https://github.com/Lead-Studios/veritix-contract](https://github.com/Lead-Studios/veritix-contract) ([GitHub][1])

Clone and build it alongside the backend to coordinate contract deployments and backend anchoring logic.

---

## Testing

```bash
npm test
```

Includes unit and integration tests using Jest.

## Contribution

We welcome contributions!
Please open issues and pull requests for improvements, bugs, and feature requests.

Before contributing:

* Read `CONTRIBUTING.md` if present
* Follow existing code structure and formatting
* Write tests for new features

---


[1]: https://github.com/Lead-Studios/veritix-contract "GitHub - Lead-Studios/veritix-contract"
