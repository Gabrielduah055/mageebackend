import { BrevoClient } from '@getbrevo/brevo';

const brevo = new BrevoClient({
    apiKey: process.env['BREVO_API_KEY'] ?? '',
    timeoutInSeconds: 30,
    maxRetries: 3,
});

export default brevo;
