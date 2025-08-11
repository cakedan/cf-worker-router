import { HttpMethods, RouteRegexps } from './constants';



export function checkHttpMethods(methods: Array<string> | string): Array<string> {
  if (typeof(methods) === 'string') {
    if (methods === '*') {
      methods = Object.values(HttpMethods);
    } else {
      methods = [methods];
    }
  } else if (!Array.isArray(methods)) {
    throw new TypeError('Methods must be a string or a list of strings');
  }
  methods = (methods as Array<string>).map((method) => method.toUpperCase());
  methods = Array.from(new Set(methods)).filter((method) => method in HttpMethods);

  if (!methods.length) {
    throw new TypeError('Methods must contain at least one valid http method');
  }
  return methods.sort();
};

export function extractParameters(
  match: Array<string> | null,
  variables: Array<string>,
  holder: Record<string, string> = {},
): {[key: string]: string} | null {
  if (match && (match.length - 1) === variables.length) {
    return match.slice(1).reduce((parameters, value, i) => {
      parameters[variables[i]] = decodeURIComponent(value);
      return parameters;
    }, holder);
  }
  return null;
};

export function urlToRegexp(url: string): {regexp: RegExp, variables: Array<string>} {
  if (url.startsWith('/')) {
    url = '^*' + url;
  }
  if (!url.startsWith('^')) {
    url = '^' + url;
  }
  const variables: Array<string> = [];
  const regexp = new RegExp(
    url.replace(RouteRegexps.WILDCARD, RouteRegexps.WILDCARD_REPLACEMENT)
      .replace(RouteRegexps.PARAMETER, (match, variable, index) => {
        variables.push(variable);
        const indexAfter = match.length + index;
        if (url.slice(indexAfter, indexAfter + 3) === '...') {
          return RouteRegexps.PARAMETER_WILDCARD_REPLACEMENT;
        } else {
          return RouteRegexps.PARAMETER_REPLACEMENT;
        }
      }).replace(RouteRegexps.PARAMETER_WILDCARD_DOTS, RouteRegexps.PARAMETER_WILDCARD_REPLACEMENT) + RouteRegexps.SLASH_OPTIONAL
  );
  return {regexp, variables};
};


export type RouteHandler = (event: RouterEvent) => Promise<any> | any;

export interface RouteOptions {
  pass?: boolean,
  priority?: number,
}

export class Route {
  readonly handler?: RouteHandler;
  readonly key: string;
  readonly methods: Array<string>;
  readonly regexp: RegExp;
  readonly variables: Array<string>;

  pass: boolean = false;
  priority: number = 0;

  constructor(
    url: string,
    methods: Array<string> | string | RouteHandler,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    if (typeof(methods) === 'function') {
      options = handler as RouteOptions;
      handler = methods as RouteHandler;
      methods = [HttpMethods.GET];
    } else if (typeof(methods) === 'object' && !Array.isArray(methods)) {
      options = methods as RouteOptions;
      methods = [HttpMethods.GET];
    } else {
      if (typeof(handler) === 'object') {
        options = handler as RouteOptions;
      }
      methods = checkHttpMethods(methods);
    }
    options = Object.assign({
      pass: this.pass,
      priority: this.priority,
    }, options) as RouteOptions;

    if (typeof(handler) !== 'function' && !options.pass) {
      throw new TypeError('Handler has to be of function type or options must have pass as true');
    }

    this.handler = handler as RouteHandler;
    this.methods = methods as Array<string>;
    this.pass = options.pass || this.pass;
    this.priority = options.priority || this.priority;

    const {regexp, variables} = urlToRegexp(url);

    this.key = this.methods.join('.') + '#' + regexp;
    this.regexp = regexp;
    this.variables = variables;
  }

  matches(url: string): boolean {
    return !!url.match(this.regexp);
  }

  async handle(event: RouterEvent): Promise<any> {
    const match = event.route.match(this.regexp);
    extractParameters(match, this.variables, event.parameters);
    if (this.handler) {
      return this.handler(event);
    }
  }
}


export class RouteMap extends Map<string, Route> {
  readonly routers = new Map<string, Router>();

  add(route: Route | Router): void {
    if (route instanceof Route) {
      if (this.has(route.key)) {
        throw new TypeError(`Route ${route.key} already exists`);
      }
      this.set(route.key, route);
    } else if (route instanceof Router) {
      const router = route;

      if (!router.key) {
        throw new TypeError('Router must have a key');
      }
      if (this.routers.has(router.key)) {
        throw new TypeError(`Router with key ${router.key} already exists`);
      }
      this.routers.set(router.key, router);
    } else {
      throw new TypeError('Route must be of type Route or Router');
    }
  }

  findAll(url: string): Array<Route> {
    const routes: Array<Array<Route> | Route> = [];
    for (let route of this.values()) {
      if (route.matches(url)) {
        routes.push(route);
      }
    }
    for (let router of this.routers.values()) {
      const found = router.routes.findAll(url);
      if (found.length) {
        routes.push(found);
      }
    }
    return <Array<Route>> routes.flat()
      .sort((x, y) => y.key.length - x.key.length)
      .sort((x, y) => y.priority - x.priority);
  }
}


export class Router {
  readonly routes = new RouteMap();

  key: null | string = null;

  route(
    url: Array<string> | string,
    methods: Array<string> | string | RouteHandler,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ): this {
    if (Array.isArray(url)) {
      for (let x of url) {
        this.routes.add(new Route(x, methods, handler, options));
      }
    } else {
      this.routes.add(new Route(url, methods, handler, options));
    }
    return this;
  }

  delete(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.DELETE], handler, options);
  }

  get(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.GET], handler, options);
  }

  head(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.HEAD], handler, options);
  }

  options(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.OPTIONS], handler, options);
  }

  post(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.POST], handler, options);
  }

  put(
    url: Array<string> | string,
    handler?: RouteHandler | RouteOptions,
    options: RouteOptions = {},
  ) {
    return this.route(url, [HttpMethods.PUT], handler, options);
  }
}



export class RouterEvent {
  readonly fetchEvent: FetchEvent | null = null;
  readonly route: string;
  readonly url: URL;

  _originalRequest: null | Request = null;
  _request: null | Request = null;
  context: null | ExecutionContext = null;
  environment: Record<string, any> = {};
  parameters: {[key: string]: any} = {};

  constructor(event: FetchEvent | Request, env?: Record<string, any>, context?: ExecutionContext) {
    if (event instanceof Request) {
      this._originalRequest = event as Request;
    } else if (event instanceof FetchEvent) {
      this.fetchEvent = event as FetchEvent;
    }

    if (env) {
      this.environment = env;
    }
    if (context) {
      this.context = context;
    }

    this.url = new URL(this.originalRequest.url);
    this.route = this.url.hostname + (this.url.pathname).replace(/^\/+/, '/');
  }

  get headers(): Headers {
    return this.originalRequest.headers;
  }

  get ip(): string {
    return this.headers.get('cf-connecting-ip') || this.headers.get('x-real-ip') || '';
  }

  get ipv4(): string {
    return this.headers.get('x-real-ip') || '';
  }

  get method(): string {
    return this.originalRequest.method;
  }

  get originalRequest(): Request {
    if (this.fetchEvent) {
      return this.fetchEvent.request;
    }
    if (this._originalRequest) {
      return this._originalRequest;
    }
    throw new Error('Invalid FetchEvent or Request was passed in.');
  }

  get query(): URLSearchParams {
    return this.url.searchParams;
  }

  get request(): Request {
    if (this._request) {
      return this._request;
    }
    return this._request = new Request(this.originalRequest);
  }

  respondWith(response: any): any {
    if (this.fetchEvent) {
      return this.fetchEvent.respondWith(response);
    }
    return Promise.resolve(response);
  }

  pass(): Promise<Response> {
    return fetch((this._request) ? this._request : this.originalRequest);
  }
}
