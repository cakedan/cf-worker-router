# Cloudflare Worker Router
easier cloudflare request routing

## Example Usage
Two ways of adding the router
```js
import { FetchRouter } from 'cf-worker-router';

const router = new FetchRouter();

addEventListener('fetch', (event) => {
  router.onFetch(event);
});
```

or

```ts
import { FetchRouter } from 'cf-worker-router';

const router = new FetchRouter();

// this is the only way to get the environmental variables found in event.environment
// this is also the only way to get access to R2 storage, event.environment.R2_BUCKET
export default {
  fetch(request: Request, env: Record<string, any>, context: ExecutionContext) {
    return router.onFetch(request, env, context);
  }
}
```

```js
import { ApiError, ApiRedirect, DomainRouter, FetchRouter } from 'cf-worker-router';

const router = new FetchRouter();

// export the cloudflare event listener
export default {
  fetch(request, env, context) {
    return router.onFetch(request, env, context);
  }
}

// after every response, modify it (like setting CORS headers)
// is optional
router.beforeResponse = (response, event) => {
  // create a new Response instance, incase it's immutable like from a fetch request
  response = new Response(response.body, response);
  response.headers.set('access-control-allow-headers', 'Content-Type, X-Some-Header');
  response.headers.set('access-control-allow-methods', '*');
  response.headers.set('access-control-allow-origin', event.url.origin || '*');
  return response;
};


// same as .route(url, 'GET', handler);
// GET */users/1234
router.route('/users/:userId', async (event) => {
  // automatically converts anything not of Response type to ApiResponse
  return event.parameters;
});

// same as .route(url, ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'], handler)
// ANY-METHOD */proxy/:url
router.route('/proxy/:url', '*', async (event) => {
  if (event.request.headers.get('secret-token') !== 'test') {
    return new ApiError({status: 403});
  }
  // remove our ip from headers
  event.request.headers.delete('cf-connecting-ip');
  event.request.headers.delete('x-real-ip');
  return await fetch(event.parameters.url, event.request);
});

// GET redirect.example.com/:url
router.route('redirect.example.com/:url', async (event) => {
  return new ApiRedirect(event.parameters.url);
});

// GET example.com/string-test/anystringhere
// GET example.com/string-test/anystringhere/andanythingwithslashes
router.route('example.com/string-test/:string...', async (event) => {
  return event.parameters;
});

// GET example.club/pass
// passes it onto original destination, doesn't call `event.respondWith()`
router.route('example.com/pass', {pass: true});


const subDomain = new DomainRouter(':username.example.com');
router.addRouter(subDomain);

// GET some-username.example.com/files/1234
subDomain.get('/files/:fileId', async (event) => {
  // {username, fileId} are the parameters
  return event.parameters;
});

```

## Example Usage w/ Minified Version
```js
// Copy and Paste ./min/router.min.js at the top of the file
// !function(e){...

// We put our library in self.CFWorkerRouter
const { ApiError, ApiRedirect, DomainRouter, FetchRouter } = CFWorkerRouter;

const router = new FetchRouter();

// add the cloudflare event listener
export default {
  fetch(request, env, context) {
    return router.onFetch(request, env, context);
  }
}

// after every response, modify it (like setting CORS headers)
// is optional
router.beforeResponse = (response, event) => {
  // create a new Response instance, incase it's immutable like from a fetch request
  response = new Response(response.body, response);
  response.headers.set('access-control-allow-headers', 'Content-Type, X-Some-Header');
  response.headers.set('access-control-allow-methods', '*');
  response.headers.set('access-control-allow-origin', event.url.origin || '*');
  return response;
};


// same as .route(url, 'GET', handler);
// GET */users/1234
router.route('/users/:userId', async (event) => {
  // automatically converts anything not of Response type to ApiResponse
  return event.parameters;
});

// same as .route(url, ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'], handler)
// ANY-METHOD */proxy/:url
router.route('/proxy/:url', '*', async (event) => {
  if (event.request.headers.get('secret-token') !== 'test') {
    return new ApiError({status: 403});
  }
  // remove our ip from headers
  event.request.headers.delete('cf-connecting-ip');
  event.request.headers.delete('x-real-ip');
  return await fetch(event.parameters.url, event.request);
});

// GET redirect.example.com/:url
router.route('redirect.example.com/:url', async (event) => {
  return new ApiRedirect(event.parameters.url);
});

// GET example.com/string-test/anystringhere
// GET example.com/string-test/anystringhere/andanythingwithslashes
router.route('example.com/string-test/:string...', async (event) => {
  return event.parameters;
});

// GET example.club/pass
// passes it onto original destination, doesn't call `event.respondWith()`
router.route('example.com/pass', {pass: true});


const subDomain = new DomainRouter(':username.example.com');
router.addRouter(subDomain);

// GET some-username.example.com/files/1234
subDomain.get('/files/:fileId', async (event) => {
  // {username, fileId} are the parameters
  return event.parameters;
});

```
