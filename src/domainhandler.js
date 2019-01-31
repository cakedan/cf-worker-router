import { HttpMethods } from './constants';
import { ApiError } from './responses';
import { checkHttpMethods, extractParameters, routeToRegexp } from './utils';


export class DomainHandler {
  constructor(domain = '') {
    const {regexp, variables} = routeToRegexp(domain);
    this.domain = regexp;
    this.variables = variables;
    this.routes = new Map();
  }

  addRoute(route, methods, handler) {
    if (typeof(methods) === 'function') {
      handler = methods;
      methods = ['*'];
    }
    if (typeof(handler) !== 'function') {
      throw new Error('Handler must be a function!');
    }
    methods = checkHttpMethods(methods);
    const {regexp, variables} = routeToRegexp(route);
    route = methods.join('#') + '#' + regexp;
    this.routes.set(route, {handler, methods, regexp, variables});
  }

  findRouteMatch(request) {
    for (let route of this.routes.values()) {
      if (!route.methods.includes(request.method) && !route.methods.includes('*')) {
        continue;
      }
      const match = request.route.match(route.regexp);
      if (!match) {
        continue;
      }
      extractParameters(match, route.variables, request.parameters);
      return route;
    }
  }

  removeRoute(route, methods = ['*']) {
    methods = checkHttpMethods(methods);
    const {regexp} = routeToRegexp(route);
    route = methods.join('#') + '#' + regexp;
    this.routes.delete(route);
  }

  delete(route, handler) {
    return this.addRoute(route, [HttpMethods.DELETE], handler);
  }

  get(route, handler) {
    return this.addRoute(route, [HttpMethods.GET], handler);
  }

  head(route, handler) {
    return this.addRoute(route, [HttpMethods.HEAD], handler);
  }

  options(route, handler) {
    return this.addRoute(route, [HttpMethods.OPTIONS], handler);
  }

  post(route, handler) {
    return this.addRoute(route, [HttpMethods.POST], handler);
  }

  put(route, handler) {
    return this.addRoute(route, [HttpMethods.PUT], handler);
  }

  matches(request) {
    const match = request.url.hostname.match(this.domain);
    if (!match) {
      return false;
    }
    extractParameters(match, this.variables, request.parameters);
    return true;
  }

  async onRequest(request) {
    const route = this.findRouteMatch(request);
    if (!route) {
      return new ApiError({status: 404});
    }
    return route.handler(request);
  }
}
