// This file provides basic type declarations for pg module
// The official @types/pg should be used when available
declare module 'pg' {
  export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    rowCount: number | null;
    command: string;
    oid: number;
    fields: FieldDef[];
  }

  export interface QueryResultRow {
    [column: string]: any;
  }

  export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }

  export interface PoolConfig {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: boolean | object;
  }

  export interface PoolClient {
    query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}