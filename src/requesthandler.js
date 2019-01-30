import { ApiError } from './responses';

const pathToRegexp = require('path-to-regexp');

export class RequestHandler {
  constructor() {
    this.blueprints = new Map();
  }

  addBlueprint(blueprint) {
    if (!(blueprint instanceof RequestBlueprint)) {
      throw new Error('Blueprint must be of RequestBlueprint type');
    }
    this.blueprints.set(blueprint.name, blueprint);
  }

  async onRequest(request) {
    const url = new URL(request.url);
    for (let [name, blueprint] of this.blueprints) {
      const result = blueprint.checkPath(url.pathname);
      if (result) {
        const newRequest = new Request(request);
        newRequest.headers.delete('cf-connecting-ip');
        newRequest.headers.delete('x-real-ip');
        return await result.handler(result.parameters, url, newRequest);
      }
    }
    return new ApiError({status: 404, message: 'Not Found'});
  }
}

export class RequestBlueprint {
  constructor(name, path) {
    this.name = name;
    this.path = path || '';

    this.regexs = new Map();
  }

  addPath(path, handler) {
    path = this.path + path;
    const keys = [];
    const regexp = pathToRegexp(path, keys);
    this.regexs.set(path, {regexp, keys, handler});
  }

  checkPath(pathname) {
    for (let [path, stored] of this.regexs) {
      const results = stored.regexp.exec(pathname);
      if (results) {
        const parameters = {};
        for (let i in stored.keys) {
          const key = stored.keys[i];
          parameters[key.name] = results[parseInt(i) + 1];
        }
        return {parameters, handler: stored.handler};
      }
    }
  }
}
