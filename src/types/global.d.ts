declare global {
  interface PaginationMeta {
    total: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }

  interface AbstractResponse<T> {
    message: string;
    timestamp: Date | string;
    data?: T;
    traceId?: string;
    meta?: Record<string, unknown> | PaginationMeta;
  }
}

export {};
