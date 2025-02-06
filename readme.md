```
# CloudAtlas 🌩️

A tiny, expressive routing framework for Cloudflare Workers with middleware support and error handling.

## Features
- Intuitive route declaration
- Error handling layers
- Route grouping with shared configuration
- Contextual request/response handling
- Fluent builder-style API
- Small footprint, about 100 lines of code

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

export default app.config();
```

Middleware functions are defined as functions that take a context and a next function. The next function is used to call the next middleware in the chain.

```javascript
const middleware = async (ctx, next) => {
    console.log('Middleware function called');
    await next();
    console.log('Middleware function complete');
};
```

The Context object is passed to each middleware function and contains the request, environment, and execution context.

```javascript
{
    req: Request, // Cloudflare request object
    env: any, // Cloudflare environment
    ctx: ExecutionContext, // Cloudflare execution context
    params: { [key: string]: string }, // Route parameters
    res: { body: any, status: number, statusText: string, headers: { [key: string]: string } } // Response object
}
```


