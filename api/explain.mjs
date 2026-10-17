import { createHostedExplainer } from '../deployment/handler.mjs';

// Vercel's Node.js Web handler. The API key is read only inside this function.
export const POST = createHostedExplainer();
