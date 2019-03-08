import { ApiError, ApiResponse } from './responses';
import { Router, RouterEvent } from './helpers';


export class FetchRouter extends Router {
  constructor(options) {
    super();
    options = Object.assign({
      showServerError: true,
    }, options);

    this.showServerError = !!options.showServerError;
  }

  addRouter(router) {
    this.routes.add(router);
  }

  _beforeResponse(response, event) {
    if (typeof(this.beforeResponse) === 'function') {
      const newResponse = this.beforeResponse(response, event);
      if (newResponse) {
        if (newResponse instanceof Response) {
          response = newResponse;
        } else {
          response = new ApiResponse(newResponse);
        }
      }
    }
    return response;
  }

  onFetch(fetchEvent) {
    const event = new RouterEvent(fetchEvent);

    let routes = this.routes.findAll(event.route);
    if (!routes.length) {
      const response = this._beforeResponse(new ApiError({status: 404}), event);
      return fetchEvent.respondWith(response);
    }

    routes = routes.filter((route) => route.methods.includes(event.method));
    if (!routes.length) {
      const response = this._beforeResponse(new ApiError({status: 405}), event);
      return fetchEvent.respondWith(response);
    }

    const route = routes.shift();
    if (!route.pass) {
      return fetchEvent.respondWith(this.onRoute(event, route));
    }
  }

  async onRoute(event, route) {
    let response;
    try {
      response = await route.handle(event);
      if (!(response instanceof Response)) {
        response = new ApiResponse(response);
      }
    } catch(error) {
      const options = {status: 500};
      if (this.showServerError) {
        options.metadata = {error: String(error)};
      }
      response = new ApiError(options);
    }
    return this._beforeResponse(response, event);
  }
}


export class DomainRouter extends Router {
  constructor(domain = '*', key) {
    super();
    this.domain = domain;
    this.key = key || domain;
  }

  route(url, methods, handler, options) {
    if (Array.isArray(url)) {
      for (let x of url) {
        if (!x.startsWith('/')) {
          throw new TypeError('DomainRouter routes need to be paths!');
        }
        super.route.call(this, this.domain + x, methods, handler, options);
      }
    } else {
      super.route.call(this, this.domain + url, methods, handler, options);
    }
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

  route(url, methods, handler, options) {
    if (Array.isArray(url)) {
      for (let x of url) {
        super.route.call(this, this.path + x, methods, handler, options);
      }
    } else {
      super.route.call(this, this.path + url, methods, handler, options);
    }
  }
}
