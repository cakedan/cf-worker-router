import { RequestHandler } from './requesthandler';
import { ApiError } from './responses';

export class EventHandler {
  constructor() {
    this.domains = {};
  }

  addDomain(domain, handler) {
    if (!(handler instanceof RequestHandler)) {
      throw new Error('Handler needs to be a request handler type');
    }
    if (this.hasDomain(domain)) {
      throw new Error(`Domain already registed: ${domain}`);
    }
    this.domains[domain] = handler;
  }

  hasDomain(domain) {
    return (domain in this.domains);
  }

  onFetch(event) {
    event.respondWith(this.onRequest(event.request));
  }

  async onRequest(request) {
    try {
      const url = new URL(request.url);
      if (this.hasDomain(url.host)) {
        return await this.domains[url.host].onRequest(request);
      } else {
        return new ApiError({metadata: {error: 'Unknown Host'}});
      }
    } catch(e) {
      return new ApiError({metadata: {error: String(e)}});
    }
  }
}
