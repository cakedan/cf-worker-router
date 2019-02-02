import { ApiError, ApiResponse } from './responses';
import { Router, RouterEvent } from './helpers';


export class FetchRouter extends Router {
  addRouter(router) {
    this.routes.add(router);
  }

  onFetch(event) {
    event.respondWith(this.onFetchEvent(event));
  }

  async onFetchEvent(fetchEvent) {
    try {
      const event = new RouterEvent(fetchEvent);
      let routes = this.routes.findAll(event.route);
      if (!routes.length) {
        return new ApiError({status: 404});
      }
      routes = routes.filter((route) => route.methods.includes(event.method));
      if (!routes.length) {
        return new ApiError({status: 405});
      }

      const route = routes.shift();
      const response = await route.handle(event);
      if (response instanceof Response) {
        return response;
      } else {
        return new ApiResponse(response);
      }
    } catch(error) {
      return new ApiError({status: 500, metadata: {error: String(error)}});
    }
  }
}


export class DomainRouter extends Router {
  constructor(domain = '*', key) {
    super();
    this.domain = domain;
    this.key = key || domain;
  }

  route(url, methods, handler) {
    if (!url.startsWith('/')) {
      throw new TypeError('DomainRouter routes need to be paths!');
    }
    super.route.call(this, this.domain + url, methods, handler);
  }

  addBlueprint(blueprint) {
    if (!(blueprint instanceof BlueprintRouter)) {
      throw new TypeError('Blueprint must be of type BlueprintRouter');
    }
    this.routes.add(blueprint);
  }
}


export class BlueprintRouter extends Router {
  constructor(path = '', key) {
    super();
    this.path = path;
    this.key = key || path;
  }

  route(url, methods, handler) {
    super.route.call(this, this.path + url, methods, handler);
  }
}
