import * as Constants from './constants';
import * as Helpers from './helpers';
import * as Responses from './responses';
import * as Routers from './routers';

export { Helpers };
export * from './constants';
export { RouteHandler, RouteOptions } from './helpers';
export * from './responses';
export * from './routers';

import { CloudflareWorkerGlobalScope } from 'types-cloudflare-worker';
declare const self: CloudflareWorkerGlobalScope;

Object.assign(self || {}, {
  CFWorkerRouter: {...Constants, ...Responses, ...Routers, Helpers},
});
