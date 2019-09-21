export * from './constants';
export * from './responses';
export * from './routers';

import { CloudflareWorkerGlobalScope } from 'types-cloudflare-worker';
declare const globalThis: CloudflareWorkerGlobalScope;

import * as Constants from './constants';
import * as Responses from './responses';
import * as Routers from './routers';

(<any> globalThis).CFWorkerRouter = {...Constants, ...Responses, ...Routers};
