import { HttpMethods } from './constants';

export function checkHttpMethods(methods) {
  if (typeof(methods) === 'string') {
    methods = [methods];
  }
  if (Array.isArray(methods)) {
    methods = Array.from(
      new Set(methods.map((method) => method.toUpperCase()))
    ).filter((method) => HttpMethods[method] || '*');
    if (!methods.length) {
      throw new Error('Please enter at least one valid method');
    }
    if (methods.includes('*') && methods.length > 1 || methods.length === Object.keys(HttpMethods).length) {
      methods = ['*'];
    }
  } else {
    throw new Error('Passed in methods has to be an array or a string');
  }
  return methods.sort();
}


const domainRegexp = /(\w+\.\w+)$/g;
export function routeHasDomain(route) {
  return route.split('/').shift().match(domainRegexp);
}

const RouteRegexps = {
  PARAMETER: /(?:[:*])(\w+)/g,
  PARAMETER_REPLACEMENT: '([^\/]+)',
  SLASH_OPTIONAL: '(?:\/$|$)',
  WILDCARD: /\*/g,
  WILDCARD_REPLACEMENT: '(?:.*)',
};
export function routeToRegexp(route) {
  if (!route.split('/').shift()) {
    route = '*' + route;
  }
  const variables = [];
  const regexp = new RegExp(
    route.replace(RouteRegexps.PARAMETER, (match, variable) => {
      variables.push(variable);
      return RouteRegexps.PARAMETER_REPLACEMENT;
    }).replace(RouteRegexps.WILDCARD, RouteRegexps.WILDCARD_REPLACEMENT) + RouteRegexps.SLASH_OPTIONAL
  );
  return {variables, regexp};
}

export function extractParameters(match, variables, holder) {
  if (!match || match.length - 1 !== variables.length) {return;}
  return match.slice(1).reduce((parameters, value, i) => {
    parameters[variables[i]] = decodeURIComponent(value);
    return parameters;
  }, holder || {});
}
