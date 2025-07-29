import { Request } from 'express';

export class MockRequest {
  public headers: Record<string, string> = {};
  public query: Record<string, any> = {};
  public params: Record<string, any> = {};
  public user: any = {};

  setOrganizerInToken(organizerId: string) {
    this.user = { organizerId };
    return this;
  }

  setOrganizerInHeader(organizerId: string) {
    this.headers['x-organizer-id'] = organizerId;
    return this;
  }

  setOrganizerInQuery(organizerId: string) {
    this.query.organizerId = organizerId;
    return this;
  }

  setOrganizerInParams(organizerId: string) {
    this.params.organizerId = organizerId;
    return this;
  }

  clear() {
    this.headers = {};
    this.query = {};
    this.params = {};
    this.user = {};
    return this;
  }
}

export class MockResponse {
  private headers: Record<string, string> = {};
  private statusCode: number = 200;

  set = jest.fn((headers: Record<string, string>) => {
    Object.assign(this.headers, headers);
    return this;
  });

  status = jest.fn((code: number) => {
    this.statusCode = code;
    return this;
  });

  getHeaders() {
    return this.headers;
  }

  getStatus() {
    return this.statusCode;
  }

  clear() {
    this.headers = {};
    this.statusCode = 200;
    this.set.mockClear();
    this.status.mockClear();
    return this;
  }
}
