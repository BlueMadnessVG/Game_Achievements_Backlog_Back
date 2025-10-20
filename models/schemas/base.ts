import {
  any,
  boolean,
  literal,
  object,
  optional,
  string,
  unknown,
  type InferOutput,
} from "valibot";

export const BaseResponseSchema = object({
  success: boolean(),
  data: unknown(),
  metadata: object({
    timestamp: string(),
    version: string(),
    source: optional(string()),
  }),
});

export const ErrorResponseSchema = object({
  success: literal(false),
  error: object({
    code: string(),
    message: string(),
    details: optional(any()),
    timestamp: string(),
  }),
});

export type BaseResponse = InferOutput<typeof BaseResponseSchema>;
export type ErrorResponse = InferOutput<typeof ErrorResponseSchema>;