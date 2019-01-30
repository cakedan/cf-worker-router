export class ApiResponse extends Response {
  constructor(body, options) {
    options = Object.assign({}, options);
    options.headers = Object.assign({}, options.headers, {'content-type': 'application/json'});
    super(JSON.stringify(body), options);
  }
}

export class ApiError extends ApiResponse {
  constructor(options) {
    options = Object.assign({status: 400, code: 0, message: 'Bad Request'}, options);
    const body = Object.assign({}, options.metadata, {
      status: options.status,
      code: options.code,
      message: options.message,
    });
    super(body, options);
  }
}
