/**
 * Simple Test Function - Verify Vercel deployment works
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('✅ Test function invoked successfully');

  return res.status(200).json({
    message: 'Test function working',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}
