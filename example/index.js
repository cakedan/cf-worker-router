import { ApiError, ApiRedirect, DomainRouter, FetchRouter } from '../src';

const router = new FetchRouter();

addEventListener('fetch', (event) => {
  router.onFetch(event);
});

// same as .route(url, 'GET', handler);
// GET */users/1234
router.route('/users/:userId', async(event) => {
  // automatically converts anything not of Response type to ApiResponse
  return event.parameters;
});

// same as .route(url, ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'], handler)
// ANY-METHOD */proxy/:url
router.route('/proxy/:url', '*', async(event) => {
  if (event.request.headers.get('secret-token') !== 'test') {
    return new ApiError({status: 403});
  }
  // remove our ip from headers
  event.request.headers.delete('cf-connecting-ip');
  event.request.headers.delete('x-real-ip');
  return await fetch(event.parameters.url, event.request);
});

// GET redirect.example.com/:url
router.route('redirect.example.com/:url', async(event) => {
  return new ApiRedirect(event.parameters.url);
});

// GET example.com/string-test/anystringhere
// GET example.com/string-test/anystringhere/andanythingwithslashes
router.route('example.com/string-test/:string...', async(event) => {
  return event.parameters;
});


const subDomain = new DomainRouter(':username.example.com');

// GET some-username.example.com/files/1234
subDomain.get('/files/:fileId', async(event) => {
  // {username, fileId} are the parameters
  return event.parameters;
});

router.addRouter(subDomain);
