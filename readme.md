# CloudAtlas

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
npm install cloud-atlas@git+https://github.com/petetheman/cloud-atlas.git#main
```

## Basic Usage
```javascript
import { CloudAtlas, Context } from 'cloud-atlas';

const app = new CloudAtlas();

app.group('orders')
    .catchWith(OrderError, handleOrderErrors)    
    .catch(LicenseError, 403, 'You are not authorized to access this resource.');
    .catchWith(Error, logTransactionAudit);

    .beforeAll()
    .ensure(validApiKeyPresent)
    .ensure(validOrderIdFormat)
    .ensure(userIsAuthenticated)
    
    .onGET('/orders/:id')    
    .attach(fetchUserDetails)
    .attach(loadOrderHistory)
    .do(verifyOrderOwnership)
    .do(applyLoyaltyDiscount)
    .do(formatResponseData)
    

export default app.config();
```
First off all, order matters. Middleware is executed in the order it is defined, except for `app.beforeAll()`, which is executed before any routes in the group, `app.afterAll()`, which is executed after any routes in the group, and `app.catchWith()`, which is executed in the case of an error.

- `app.group()` creates a new group of routes with a shared configuration.
- `app.beforeAll()` defines middleware that will be run before any routes in the group.
- `app.afterAll()` defines middleware that will be run after any routes in the group, also in the case of an error.
- `app.catchWith()` defines middleware that will be run if an error occurs. Is either defined on the group or the route, whichever is defined last. `app.catch()` is an special case of this that sends a response with a status code and message.
- `app.onGET()` defines a route for GET requests.
- `app.onPOST()` defines a route for POST requests.
- `app.onDELETE()` defines a route for DELETE requests.
- `app.onPUT()` defines a route for PUT requests.
- `app.onPATCH()` defines a route for PATCH requests.
- `app.onOPTIONS()` defines a route for OPTIONS requests.
- `app.onHEAD()` defines a route for HEAD requests.
- `app.use()` uses middleware in a route. This method has many aliases, including `then`, `where`, `when`, `do`, `and`, `or`, `include`, `require`, `ensure`, `attach`.


## Middleware
Middleware functions are defined as functions that take a context and a next function. The next function is used to call the next middleware in the chain.

```javascript
const middleware = async (con, next) => {
    console.log('Middleware function called');
    con.res.body = {message: 'Hello, World!'};
    await next();
    console.log('Middleware function complete');
};
```

## Context
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

## Response
The response is sent to the client using the `con.res` object. It is sent at the end of the middleware chain.


## Cloudflare Workers
To have a Cloudflare Worker use this framework, you need to create a `wrangler.toml` file in the root of your project.

1. Create a `wrangler.toml` file in the root of your project.
```toml
name = "your-worker-name"
type = "javascript"
compatibility_flags = ["nodejs_compat"]
main = "src/index.js"
```

2. Export the `app.config()` function as the default export.

```javascript
export default app.config();
```

3. Deploy your worker to Cloudflare using the `wrangler deploy` command.


