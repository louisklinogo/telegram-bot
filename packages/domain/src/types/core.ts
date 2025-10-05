/** Core shared types (provider-agnostic) */

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  validation_errors?: ValidationError[];
}
