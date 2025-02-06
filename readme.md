```
# CloudAtlas 🌩️

A lightweight, expressive routing framework for Cloudflare Workers with middleware support and error handling.

## Features
- Intuitive route declaration
- Error handling layers
- Route grouping with shared configuration
- Contextual request/response handling
- Fluent builder-style API

## Installation
```bash
npm install git+https://github.com/petetheman/cloud-atlas.git
```

## Basic Usage
```javascript
import { CloudAtlas, Context } from 'cloud-atlas';

const app = new CloudAtlas();

app.onGET('/orders/:id')
    .ensure(validApiKeyPresent)
    .ensure(validOrderIdFormat)
    .ensure(userIsAuthenticated)
    .attach(fetchUserDetails)
    .attach(loadOrderHistory)
    .do(verifyOrderOwnership)
    .do(applyLoyaltyDiscount)
    .do(formatResponseData)
    .catchWith(OrderError, handleOrderErrors)    
    .catch(LicenseError, 403, 'You are not authorized to access this resource.');
    .catchWith(Error, logTransactionAudit);

export default {
    async fetch(request, env, ctx) {
        return app.handle(new Context(request, env, ctx));
    }
};
```
