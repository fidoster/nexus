/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize plain text input (remove all HTML tags)
 * Use for: user queries, feedback, names, etc.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
};

/**
 * Sanitize HTML content (allow safe HTML tags)
 * Use for: rich text content, formatted responses
 */
export const sanitizeHTML = (html: string): string => {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export const sanitizeURL = (url: string): string => {
  if (!url) return '';

  const sanitized = DOMPurify.sanitize(url);

  // Block dangerous protocols
  if (sanitized.match(/^(javascript|data|vbscript):/i)) {
    return '';
  }

  return sanitized;
};

/**
 * Validate and sanitize email addresses
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';

  const sanitized = sanitizeInput(email).toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
};

/**
 * Sanitize JSON input
 */
export const sanitizeJSON = (jsonString: string): string => {
  if (!jsonString) return '{}';

  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch (error) {
    console.error('Invalid JSON input:', error);
    return '{}';
  }
};
