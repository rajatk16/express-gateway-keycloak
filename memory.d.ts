// https://github.com/roccomuso/memorystore/issues/4
declare module 'memorystore' {
  import * as express from 'express';
  import * as expressSession from 'express-session';

  type memorystore = (session: SessionGenerator) => MemoryStoreConstructable;

  type SessionGenerator = (options?: expressSession.SessionOptions) => express.RequestHandler;

  interface MemoryStoreConstructable {
    new (config?: MemoryStoreOptions): MemoryStore;
  }

  class MemoryStore extends expressSession.MemoryStore {
    public touch: (sid: string, session: Express.Session, callback: (err: any) => any) => void;
  }

  interface MemoryStoreOptions {
    checkPeriod?: number;
    max?: number;
    ttl?: (options: any, session: Express.Session, sessionID: string) => number | number;
    dispose?: (key: string, value: any) => void;
    stale?: boolean;
    serializer?: Serializer;
  }

  interface Serializer {
    stringify: (object: any) => string;
    parse: (value: string) => any;
  }

  const fun: memorystore;
  export = fun;
}
