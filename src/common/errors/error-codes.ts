export type ErrorCategory =
  | 'api_error'
  | 'authentication_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error';

interface ErrorDefinition {
  category: ErrorCategory;
  statusCode: number;
  message: string;
}

export const ERROR_CODES: Record<string, ErrorDefinition> = {
  api_key_missing: {
    category: 'authentication_error',
    statusCode: 401,
    message: 'Missing or invalid Authorization header.',
  },
  api_key_invalid: {
    category: 'authentication_error',
    statusCode: 401,
    message: 'The API key provided is not valid.',
  },
  idempotency_key_conflict: {
    category: 'idempotency_error',
    statusCode: 409,
    message: 'Idempotency key already used with a different request body.',
  },
  payout_not_found: {
    category: 'invalid_request_error',
    statusCode: 404,
    message: 'No payout found with the given ID.',
  },
  payout_invalid_status: {
    category: 'invalid_request_error',
    statusCode: 400,
    message: 'Payout is not in the expected status for this operation.',
  },
  invalid_request_body: {
    category: 'invalid_request_error',
    statusCode: 400,
    message: 'The request body is invalid.',
  },
  webhook_url_required: {
    category: 'invalid_request_error',
    statusCode: 400,
    message: 'The url field is required.',
  },
  webhook_signature_invalid: {
    category: 'authentication_error',
    statusCode: 401,
    message: 'Invalid webhook signature.',
  },
  internal_error: {
    category: 'api_error',
    statusCode: 500,
    message: 'An unexpected error occurred.',
  },
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    public readonly category: ErrorCategory,
    message: string,
    public readonly param?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromCode(code: string, param?: string, messageOverride?: string) {
    const def = ERROR_CODES[code];
    if (!def) {
      return new ApiError(
        'internal_error',
        500,
        'api_error',
        'An unexpected error occurred.',
      );
    }
    return new ApiError(
      code,
      def.statusCode,
      def.category,
      messageOverride ?? def.message,
      param,
    );
  }

  toResponse() {
    return {
      error: {
        category: this.category,
        code: this.code,
        message: this.message,
        ...(this.param && { param: this.param }),
        doc_url: `https://docs.yourapi.com/errors/${this.code}`,
      },
    };
  }
}
