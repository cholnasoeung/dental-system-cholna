declare module "oracledb" {
  export const OUT_FORMAT_OBJECT: number;
  export const BIND_OUT: number;
  export const NUMBER: number;

  export interface PoolAttributes {
    user?: string;
    password?: string;
    connectString?: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }

  export interface ExecuteOptions {
    outFormat?: number;
    autoCommit?: boolean;
  }

  export interface ExecuteResult<T = unknown> {
    rows?: T[];
    outBinds?: Record<string, unknown>;
  }

  export interface BindParameter {
    dir?: number;
    type?: number;
    val?: unknown;
  }

  export interface Connection {
    execute<T = unknown>(
      sql: string,
      bindParams?: unknown[] | Record<string, unknown | BindParameter>,
      options?: ExecuteOptions,
    ): Promise<ExecuteResult<T>>;
    close(): Promise<void>;
  }

  export interface Pool {
    getConnection(): Promise<Connection>;
  }

  export function createPool(config: PoolAttributes): Promise<Pool>;

  const oracledb: {
    BIND_OUT: number;
    NUMBER: number;
    OUT_FORMAT_OBJECT: number;
    createPool: typeof createPool;
  };

  export default oracledb;
}
