/**
 * Input Validation using Zod
 * 
 * Centralized validation schemas for all API inputs
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'

export * from './auth'
export * from './betting'
export * from './financial'

/**
 * Standard validation error response
 */
export interface ValidationError {
  error: string
  message: string
  messages?: string[] // All unique error messages
  details?: z.ZodIssue[]
}

/**
 * Parse and validate request body with Zod schema
 * Returns parsed data or NextResponse with error
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse<ValidationError> }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      // Format all unique error messages
      const messages = [...new Set(result.error.errors.map(formatZodError))]
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Validation failed',
            message: messages[0], // Primary message
            messages, // All unique messages
            details: result.error.errors,
          },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request', message: 'Request body must be valid JSON', messages: ['Request body must be valid JSON'] },
        { status: 400 }
      ),
    }
  }
}

/**
 * Format a Zod error into a user-friendly message
 */
function formatZodError(error: z.ZodIssue): string {
  const field = error.path.join('.')

  switch (error.code) {
    case 'invalid_type':
      if (error.received === 'undefined') {
        return `${field || 'Field'} is required`
      }
      return `${field || 'Field'} must be a ${error.expected}`

    case 'too_small':
      if (error.type === 'string') {
        return `${field || 'Field'} must be at least ${error.minimum} characters`
      }
      if (error.type === 'number') {
        return `${field || 'Field'} must be at least ${error.minimum}`
      }
      if (error.type === 'array') {
        return `${field || 'Field'} must have at least ${error.minimum} items`
      }
      return error.message

    case 'too_big':
      if (error.type === 'string') {
        return `${field || 'Field'} must be at most ${error.maximum} characters`
      }
      if (error.type === 'number') {
        return `${field || 'Field'} must be at most ${error.maximum}`
      }
      return error.message

    case 'invalid_string':
      if (error.validation === 'email') {
        return 'Invalid email format'
      }
      return error.message

    case 'invalid_enum_value':
      return `${field || 'Field'} must be one of: ${error.options.join(', ')}`

    default:
      return error.message
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse<ValidationError> } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const firstError = result.error.errors[0]
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Validation failed',
          message: formatZodError(firstError),
          details: result.error.errors,
        },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}

