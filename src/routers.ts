import { ApiError, ApiErrorInit, ApiResponse } from './responses';
import { Router, RouteHandler, RouteOptions, Route, RouterEvent } from './helpers';


export interface FetchRouterOptions {
  showServerError?: boolean,
}

export class FetchRouter extends Router {
  showServerError: boolean = true;

  beforeResponse?: (response: Response, event: RouterEvent) => any;

  constructor(options: FetchRouterOptions = {}) {
    super();
    options = Object.assign({showServerError: this.showServerError}, options);

    this.showServerError = !!options.showServerError;
  }

  addRouter(router: Router) {
    this.routes.add(router);
  }

  _beforeResponse(response: Response, event: RouterEvent): Response {
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

  onFetch(fetchEvent: FetchEvent) {
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

    const route = <Route> routes.shift();
    if (!route.pass) {
      return fetchEvent.respondWith(this.onRoute(event, route));
    }
  }

  async onRoute(event: RouterEvent, route: Route): Promise<Response> {
    let response: Response;
    try {
      response = await route.handle(event);
      if (!(response instanceof Response)) {
        response = new ApiResponse(response);
      }
    } catch(error) {
      const options: ApiErrorInit = {status: 500};
      if (this.showServerError) {
        options.metadata = {error: String(error)};
      }
      response = new ApiError(options);
    }
    return this._beforeResponse(response, event);
  }
}

export class DomainRouter extends Router {
  readonly domain: string;

  constructor(domain: string = '*', key?: string) {
    super();
    this.domain = domain;
    this.key = key || domain;
  }

  route(
    url: Array<string> | string,
    methods: Array<string> | string | RouteHandler,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ): this {
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
    return this;
  }

  addBlueprint(blueprint: BlueprintRouter): this {
    if (!(blueprint instanceof BlueprintRouter)) {
      throw new TypeError('Blueprint must be of type BlueprintRouter');
    }
    this.routes.add(blueprint);
    return this;
  }
}

export class BlueprintRouter extends Router {
  readonly path: string;

  constructor(path: string = '', key?: string) {
    super();
    this.path = path;
    this.key = key || path;
  }

  route(
    url: Array<string> | string,
    methods: Array<string> | string | RouteHandler,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ): this {
    if (Array.isArray(url)) {
      for (let x of url) {
        super.route.call(this, this.path + x, methods, handler, options);
      }
    } else {
      super.route.call(this, this.path + url, methods, handler, options);
    }
    return this;
  }
}
