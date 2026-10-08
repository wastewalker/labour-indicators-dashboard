import 'server-only';
import { createIndicatorsApi } from './client';

/**
 * The one API instance the app uses. Importing this from a client component
 * fails the build ('server-only'), which keeps the backend URL off the browser.
 */
export const api = createIndicatorsApi(process.env.INDICATORS_API_URL ?? 'http://localhost:3000');
