import { ApiRedirect, DomainHandler, FetchHandler } from '../src';


// match all domains
const main = new DomainHandler();

// example.com/users/1234
// same as addRoute(route, 'GET || ['GET'], function)
main.get('/users/:userId', async ({parameters, query, url, request}) => {
  return parameters;
});

// example.com/redirect/someUrlHere
// same as addRoute(route, '*', function);
main.addRoute('/redirect/:url', async ({parameters}) => {
  return new ApiRedirect(parameters.url);
});

const subDomain = new DomainHandler(':username.example.com');

// some-username.example.com/files/1234
subDomain.get('/files/:fileId', async ({parameters}) => {
  //parameters will now be {username, fileId}
  return parameters;
});

const handler = new FetchHandler();
handler.addDomain(main);
handler.addDomain(subDomain);
addEventListener('fetch', (event) => {
  handler.onFetch(event);
});
