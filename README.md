# Cloudflare Worker Router
easier cloudflare request routing

## Example Usage
```js
import { ApiResponse, ApiError, EventHandler, RequestHandler, RequestBlueprint } from './src';

const mainBlueprint = new RequestBlueprint('main');
mainBlueprint.addPath('/', async (parameters, url, request) => {
  return new ApiResponse('woo');
});
mainBlueprint.addPath('/error/:message', async (parameters, url, request) => {
  return new ApiError({metadata: {customMessage: parameters.message});
  // returns {"status":404,"code":0,"message":"Not Found","customMessage":"whatever-text-you-have"}
});

const requestHandler = new RequestHandler();
requestHandler.addBlueprint(mainBlueprint);

const handler = new EventHandler();
handler.addDomain('example.com', requestHandler);
addEventListener('fetch', (event) => handler.onFetch(event));
```