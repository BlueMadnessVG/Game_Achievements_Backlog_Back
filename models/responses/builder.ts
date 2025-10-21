import { safeParse } from "valibot";
import { BaseResponseSchema, type BaseResponse } from "../schemas/base";

type Metadata = Record<string, unknown> & {
  timestamp: string;
  version: string;
  source?: string;
};

export class ResponseBuilder<T = unknown> {
  private data: T;
  private metadata: Metadata;

  constructor(data: T) {
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      version: "1.0",
    };
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.metadata = { ...this.metadata, ...metadata } as Metadata;
    return this;
  }

  build(): BaseResponse {
    const response: BaseResponse = {
      success: true as const,
      data: this.data,
      metadata: this.metadata,
    };

    const result = safeParse(BaseResponseSchema, response);
    if (!result.success) {
      throw new Error("Invalid response structure");
    }

    return response;
  }

  static error(code: string, message: string, details?: unknown) {
    const errorResponse = {
      success: false as const,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    };

    return errorResponse;
  }
}
