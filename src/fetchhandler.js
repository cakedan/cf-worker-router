import { ApiError, ApiResponse } from './responses';


class FetchRequest {
  constructor(request) {
    this.request = request;
    this.url = new URL(request.url);
    this.parameters = {};

    this.route = (this.url.pathname).replace(/^\/+/, '/');
  }

  get method() {
    return this.request.method;
  }

  get ip() {
    return this.request.headers.get('cf-connecting-ip') || this.request.headers.get('x-real-ip');
  }

  get query() {
    return this.url.searchParams;
  }
}

export class FetchHandler {
  constructor() {
    this.domains = [];
  }

  addDomain(handler) {
    this.domains.push(handler);
    this.domains.sort((x, y) => y.domain.toString().length - x.domain.toString().length);
  }

  addRoute(route, methods, handler) {

  }

  onFetch(event) {
    event.respondWith(this.onRequest(event.request));
  }

  async onRequest(request) {
    try {
      request = new FetchRequest(request);
      for (let domainHandler of this.domains) {
        if (domainHandler.matches(request)) {
          let response = await domainHandler.onRequest(request);
          if (!(response instanceof Response)) {
            response = new ApiResponse(response);
          }
          return response;
        }
      }
      return new ApiError({status: 404, message: 'Unknown Host'});
    } catch(e) {
      return new ApiError({status: 500, metadata: {error: String(e)}});
    }
  }
}
