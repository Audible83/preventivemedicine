import { Request, Response, NextFunction } from 'express';

/**
 * Strip HTML tags from a string value.
 * Preserves the text content while removing all HTML/XML elements.
 */
function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/**
 * Recursively sanitize all string values in an object/array.
 * Strips HTML tags from every string leaf.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripHtmlTags(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

/**
 * Express middleware that sanitizes request body, query, and params:
 * - Strips HTML tags from all string values
 * - Validates Content-Type header on requests with a body (POST, PUT, PATCH)
 */
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Validate Content-Type on requests that carry a body
  const methodsWithBody = ['POST', 'PUT', 'PATCH'];
  if (methodsWithBody.includes(req.method)) {
    const contentType = req.headers['content-type'];

    // Allow requests without a body (e.g., empty POST for logout)
    // But if there IS a body, content-type must be valid
    if (
      req.body &&
      Object.keys(req.body).length > 0 &&
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('multipart/form-data') &&
      !contentType.includes('application/x-www-form-urlencoded')
    ) {
      res.status(415).json({ error: 'Unsupported Content-Type' });
      return;
    }
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const val = req.query[key];
      if (typeof val === 'string') {
        req.query[key] = stripHtmlTags(val);
      }
    }
  }

  // Sanitize route params
  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = stripHtmlTags(req.params[key]);
      }
    }
  }

  next();
}
