#!/usr/bin/env node
/** Print a production EMOCARE_API_SECRET. Run: npm run secret:api */
import { randomBytes } from 'node:crypto';
console.log(randomBytes(32).toString('base64url'));
