```
# CloudAtlas 🌩️

A lightweight, expressive routing framework for Cloudflare Workers with middleware support and error handling.

## Features
- Intuitive route declaration
- Middleware pipeline (beforeAll/afterAll/route-specific)
- Error handling layers
- Route grouping with shared configuration
- Contextual request/response handling
- Fluent builder-style API

## Installation
```bash
npm install cloud-atlas
```

## Basic Usage
```javascript
import { CloudAtlas } from 'cloud-atlas';

const app = new CloudAtlas();

app.get('/')
    .use(ctx => {
        ctx.body = { message: 'Hello World!' };
    });

export default {
    async fetch(request, env, ctx) {
        return app.handle(request, env, ctx);
    }
};
```

## Fluent Interface Example

```javascript
app.onGET('/orders/:id')
    .ensure(validApiKeyPresent)
    .ensure(validOrderIdFormat)
    .ensure(userIsAuthenticated)
    .attach(fetchUserDetails)
    .attach(loadOrderHistory)
    .do(verifyOrderOwnership)
    .do(applyLoyaltyDiscount)
    .do(formatResponseData)
    .catchAny(handleOrderErrors)
    .catchAny(logTransactionAudit);

app.onPOST('/checkout')
    .ensure(cartNotEmpty)
    .ensure(validShippingAddress)
    .attach(calculateTaxes)
    .attach(reserveInventory)
    .do(processPayment)
    .do(generateReceipt)
    .do(sendConfirmationEmail)
    .catch(Error, 500, 'Server Error')
    .catchAny(rollbackTransaction);
```

**Chain breakdown:**  
✅ Validation → 🔗 Data enrichment → ⚙️ Processing → 🚨 Error handling

Each step in the pipeline:  
- `ensure()`: Validation guards  
- `attach()`: Data loading/transformation  
- `do()`: Core business logic  
- `onError()`: Error handling
- `catchAny()`: Error recovery



## Routing
```javascript
// Simple route
app.post('/users')
    .use(ctx => {
        // Handle user creation
    });

// Route with parameters
app.get('/users/:id')
    .use(ctx => {
        const userId = ctx.params.id;
        // Fetch user logic
    });

// Available methods: get, post, put, delete, patch, options, head
```

## Middleware
```javascript
// Route-specific middleware
app.get('/secure')
    .use(authenticationMiddleware)
    .use(authorizationMiddleware)
    .use(ctx => {
        // Handle secure route
    });

// Group-level middleware
app.group('/api')
    .beforeAll()
    .use(corsMiddleware)
    .use(rateLimiter)
    .get('/data', ctx => { /* ... */ });

// After-all middleware (runs after response)
app.group('/logs')
    .afterAll()
    .use(loggingMiddleware);
```

## Error Handling
```javascript
// Global error handler
app.onError(Error, 500, 'Server Error')
    .onError(NotFoundError, 404, 'Not Found');

// Route-specific error handler
app.get('/risky')
    .onError(RiskyOperationError, 400, 'Bad Request')
    .use(ctx => {
        // Might throw RiskyOperationError
    });
```

## Route Groups
```javascript
app.group('/api/v1')
    .beforeAll()
    .use(versionHeader)
    .use(jsonParser)
    .afterAll()
    .use(responseLogger)
    .get('/users', /* ... */)
    .post('/posts', /* ... */);
```

## Context API
The Context object provides:
```javascript
{
    req,        // Original Request object
    env,        // Worker environment
    ctx,        // Execution context
    headers,    // Response headers
    body,       // Response body
    status,     // HTTP status code
    statusText, // HTTP status text
    path,       // Request path
    method,     // HTTP method
    response()  // Generate final Response
}
```

## Full Example
```javascript
import { CloudAtlas } from 'cloud-atlas';

const app = new CloudAtlas();

// Global middleware
app.group('')
    .beforeAll()
    .use(ctx => {
        console.log(`Request: ${ctx.method} ${ctx.path}`);
    });

// API group
app.group('/api')
    .beforeAll()
    .use(async (ctx, next) => {
        // Authentication
        const token = ctx.req.headers.get('Authorization');
        if (!validToken(token)) throw new AuthError();
        await next();
    })
    .onError(AuthError, 401, 'Unauthorized')
    .get('/user', ctx => {
        ctx.body = { user: getCurrentUser() };
    })
    .post('/data', ctx => {
        // Handle data creation
    });

// Error handling
app.group('')
    .onError(Error, 500, 'Internal Server Error');

export default {
    async fetch(request, env, ctx) {
        return app.handle(request, env, ctx);
    }
};
```

## Additional Notes
- Middleware executes in the order they're added
- Use `beforeAll()` for group-level pre-processing
- Use `afterAll()` for post-processing logic
- Chain methods fluently: `app.get().use().onError()`
- Middleware aliases: `use`, `then`, `where`, `when`, `do`, `and`, `or`

📚 [Full Documentation] | 🐛 [Report Issues] | ✨ [Contribute]
```