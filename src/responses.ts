import { HttpStatusCodes } from './constants';


export class ApiResponse extends Response {
  constructor(body: any, options: ResponseInit = {}) {
    options = Object.assign({}, options);
    options.headers = Object.assign({'content-type': 'application/json'}, options.headers);
    if (!options.status) {
      options.status = 200;
    }
    if (options.statusText === undefined && options.status in HttpStatusCodes) {
      options.statusText = HttpStatusCodes[options.status];
    }

    switch ((options.headers as any)['content-type']) {
      case 'application/json': {
        body = JSON.stringify(body);
      }; break;
    }
    super(body, options);
  }
}


export interface ApiErrorInit extends ResponseInit {
  code?: number,
  message?: string,
  metadata?: object,
}

export class ApiError extends ApiResponse {
  constructor(options: ApiErrorInit = {}) {
    options = Object.assign({status: 400, code: 0}, options);

    const status = options.status!;
    if (status < 400 || 600 <= status) {
      throw new Error('Invalid Status Code, Errors should be equal to or between 400 and 599.');
    }
    if (options.statusText === undefined && status in HttpStatusCodes) {
      options.statusText = HttpStatusCodes[status];
    }
    if (options.message === undefined) {
      options.message = options.statusText;
    }

    const body = Object.assign({}, options.metadata, {
      code: options.code,
      message: options.message,
      status: options.status,
    });
    super(body, options);
  }
}


export class ApiRedirect extends ApiResponse {
  constructor(url: string, options: ResponseInit = {}) {
    options = Object.assign({status: 302}, options);

    const status = options.status!;
    if (status < 300 || 400 <= status) {
      throw new Error('Invalid Status Code, Redirects should be equal to or between 300 and 399.');
    }
    options.headers = Object.assign({}, options.headers, {location: url});
    super(undefined, options);
  }
}
