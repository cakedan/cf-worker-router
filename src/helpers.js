import { HttpMethods } from './constants';

function checkHttpMethods(methods) {
  if (typeof(methods) === 'string') {
    if (methods === '*') {
      methods = Object.values(HttpMethods);
    } else {
      methods = [methods];
    }
  } else if (!Array.isArray(methods)) {
    throw new TypeError('Methods must be a string or a list of strings');
  }
  methods = new Set(methods.map((method) => method.toUpperCase()));
  methods = Array.from(methods).filter((method) => HttpMethods[method]);
  if (!methods.length) {
    throw new TypeError('Methods must contain at least one valid http method');
  }
  return methods.sort();
};

const RouteRegexps = {
  PARAMETER: /(?:[:*])(\w+)/g,
  PARAMETER_REPLACEMENT: '([^\/]+)',
  PARAMETER_WILDCARD_DOTS: /(?:\(\.\*\))(\.{3})/g,
  PARAMETER_WILDCARD_REPLACEMENT: '(.*)',
  SLASH_OPTIONAL: '(?:\/$|$)',
  WILDCARD: /\*/g,
  WILDCARD_REPLACEMENT: '(?:.*)',
};
function urlToRegexp(url) {
  if (url.startsWith('/')) {
    url = '^*' + url;
  }
  if (!url.startsWith('^')) {
    url = '^' + url;
  }
  const variables = [];
  const regexp = new RegExp(
    url
      .replace(RouteRegexps.WILDCARD, RouteRegexps.WILDCARD_REPLACEMENT)
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

function extractParameters(match, variables, holder) {
  if (!match || match.length - 1 !== variables.length) {return;}
  return match.slice(1).reduce((parameters, value, i) => {
    parameters[variables[i]] = decodeURIComponent(value);
    return parameters;
  }, holder || {});
};


export class Route {
  constructor(url, methods, handler, options) {
    if (typeof(methods) === 'function') {
      options = handler;
      handler = methods;
      methods = [HttpMethods.GET];
    } else if (typeof(methods) === 'object' && !Array.isArray(methods)) {
      options = methods;
      methods = [HttpMethods.GET];
    } else {
      if (typeof(handler) === 'object') {
        options = handler;
      }
      methods = checkHttpMethods(methods);
    }
    options = Object.assign({
      pass: false,
      priority: 0,
    }, options);

    if (typeof(handler) !== 'function' && !options.pass) {
      throw new TypeError('Handler has to be of function type');
    }

    this.methods = methods;
    this.handler = handler;

    this.pass = options.pass;
    this.priority = options.priority;

    const {regexp, variables} = urlToRegexp(url);

    this.key = this.methods.join('.') + '#' + regexp;
    this.regexp = regexp;
    this.variables = variables;
  }

  matches(url) {
    return url.match(this.regexp);
  }

  async handle(event) {
    const match = event.route.match(this.regexp);
    extractParameters(match, this.variables, event.parameters);
    return this.handler(event);
  }
}

export class RouteMap extends Map {
  constructor() {
    super(...arguments);
    this.routers = new Map();
  }

  add(route) {
    if (route instanceof Route) {
      if (this.has(route.key)) {
        throw new TypeError(`Route ${route.key} already exists`);
      }
      this.set(route.key, route);
    } else if (route instanceof Router) {
      if (route.key === undefined) {
        throw new TypeError('Router must have a key');
      }
      if (this.routers.has(route.key)) {
        throw new TypeError(`Router with key ${route.key} already exists`);
      }
      this.routers.set(route.key, route);
    } else {
      throw new TypeError('Route must be of type Route or Router');
    }
  }

  findAll(url) {
    const routes = [];
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
    return routes.flat()
      .sort((x, y) => y.key.length - x.key.length)
      .sort((x, y) => y.priority - x.priority);
  }
}

export class Router {
  constructor() {
    this.routes = new RouteMap();
  }

  route(url, methods, handler, options) {
    if (Array.isArray(url)) {
      for (let x of url) {
        this.routes.add(new Route(x, methods, handler, options));
      }
    } else {
      this.routes.add(new Route(url, methods, handler, options));
    }
  }

  delete(url, handler, options) {
    return this.route(url, [HttpMethods.DELETE], handler, options);
  }

  get(url, handler, options) {
    return this.route(url, [HttpMethods.GET], handler, options);
  }

  head(url, handler, options) {
    return this.route(url, [HttpMethods.HEAD], handler, options);
  }

  options(url, handler, options) {
    return this.route(url, [HttpMethods.OPTIONS], handler, options);
  }

  post(url, handler, options) {
    return this.route(url, [HttpMethods.POST], handler, options);
  }

  put(url, handler, options) {
    return this.route(url, [HttpMethods.PUT], handler, options);
  }
}

export class RouterEvent {
  constructor(event) {
    this.fetchEvent = event;
    this.url = new URL(event.request.url);
    this.parameters = {};

    this.route = this.url.hostname + (this.url.pathname).replace(/^\/+/, '/');

    this._request = null;
  }

  get ip() {
    return this.event.request.headers.get('cf-connecting-ip') || this.event.request.headers.get('x-real-ip');
  }

  get ipv4() {
    return this.event.request.headers.get('x-real-ip');
  }

  get method() {
    return this.originalRequest.method;
  }

  get query() {
    return this.url.searchParams;
  }

  get originalRequest() {
    return this.fetchEvent.request;
  }

  get request() {
    if (this._request) {
      return this._request;
    } else {
      return this._request = new Request(this.originalRequest);
    }
  }

  pass() {
    return fetch((this._request) ? this._request : this.originalRequest);
  }
}
