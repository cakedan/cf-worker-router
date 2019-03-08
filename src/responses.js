import { HttpStatusCodes } from './constants';


export class ApiResponse extends Response {
  constructor(body, options) {
    options = Object.assign({}, options);
    options.headers = Object.assign({}, options.headers, {'content-type': 'application/json'});
    if (options.statusText === undefined) {
      options.statusText = HttpStatusCodes[options.status] || null;
    }
    super(JSON.stringify(body), options);
  }
}


export class ApiError extends ApiResponse {
  constructor(options) {
    options = Object.assign({status: 400, code: 0}, options);
    if (options.status < 400 || 600 <= options.status) {
      throw new Error('Invalid Status Code, Errors should be equal to or between 400 and 599.');
    }

    if (options.statusText === undefined) {
      options.statusText = HttpStatusCodes[options.status] || null;
    }
    if (options.message === undefined) {
      options.message = options.statusText;
    }

    const body = Object.assign({}, options.metadata, {
      status: options.status,
      code: options.code,
      message: options.message,
    });
    super(body, options);
  }
}


export class ApiRedirect extends ApiResponse {
  constructor(url, options) {
    options = Object.assign({status: 302}, options);
    if (options.status < 300 || 400 <= options.status) {
      throw new Error('Invalid Status Code, Redirects should be equal to or between 300 and 399.');
    }
    options.headers = Object.assign({}, options.headers, {location: url});
    super(undefined, options);
  }
}
