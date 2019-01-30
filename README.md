# Cloudflare Worker Router
easier cloudflare request routing

## Example Usage
```js
import { ApiResponse, ApiError, EventHandler, RequestHandler, RequestBlueprint } from './src';

const mainBlueprint = new RequestBlueprint('main');
// example.com || example.com/
mainBlueprint.addPath('/', async (parameters, url, request) => {
  return new ApiResponse('woo');
});
// example.com/error/whatever-text-you-want
mainBlueprint.addPath('/error/:message', async (parameters, url, request) => {
  return new ApiError({metadata: {customMessage: parameters.message});
  // returns {"status":400,"code":0,"message":"Bad Request","customMessage":"whatever-text-you-have"}
});

const specialBlueprint = new RequestBlueprint('special', '/special');
// example.com/special/test
specialBlueprint.addPath('/test', async (parameters, url, request) => {
  return new ApiResponse('special test');
});

const requestHandler = new RequestHandler();
requestHandler.addBlueprint(mainBlueprint);
requestHandler.addBlueprint(specialBlueprint);

const handler = new EventHandler();
handler.addDomain('example.com', requestHandler);
addEventListener('fetch', (event) => handler.onFetch(event));
```