import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get tracer from OpenTelemetry
  const tracer = trace.getTracer('abetworks-workcrm');

  // Start a new span for this request
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.user_agent': req.get('User-Agent') || 'unknown',
      'http.client_ip': req.ip,
      'tenant.id': (req as any).tenant?.id || 'unknown',
      'user.id': (req as any).user?.id || 'anonymous'
    }
  });

  // Store the span in the request context
  (req as any).span = span;

  // Capture the original res.end function
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Set span attributes based on response
    span.setAttributes({
      'http.status_code': res.statusCode,
    });

    // Set span status based on response code
    if (res.statusCode >= 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`
      });
    } else if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.UNSET, // Client errors are typically not considered errors in the server span
      });
    } else {
      span.setStatus({
        code: SpanStatusCode.OK,
      });
    }

    // End the span
    span.end();

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

// Helper function to get current span
export const getCurrentSpan = (req: Request) => {
  return (req as any).span;
};

// Helper function to add attributes to the current span
export const addSpanAttribute = (req: Request, key: string, value: string | number | boolean) => {
  const span = getCurrentSpan(req);
  if (span) {
    span.setAttribute(key, value);
  }
};

// Helper function to add event to the current span
export const addSpanEvent = (req: Request, name: string, attributes?: { [key: string]: string | number | boolean }) => {
  const span = getCurrentSpan(req);
  if (span) {
    span.addEvent(name, attributes);
  }
};