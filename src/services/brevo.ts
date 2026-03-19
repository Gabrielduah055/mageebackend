import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

export async function sendOtpEmail(toEmail: string, toName: string, otp: string): Promise<void> {
  const payload = JSON.stringify({
    sender: { name: 'Magee Salon', email: 'noreply@magee.com' },
    to: [{ email: toEmail, name: toName }],
    subject: 'Your Magee Verification Code',
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8" /></head>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#be123c,#f43f5e);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Magee Salon</h1>
                      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Email Verification</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <p style="margin:0 0 8px;font-size:16px;color:#374151;">Hi <strong>${toName}</strong>,</p>
                      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                        Use the code below to verify your email. It expires in <strong>10 minutes</strong>.
                      </p>
                      <div style="background:#fff1f2;border:2px dashed #fda4af;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                        <p style="margin:0 0 4px;font-size:12px;color:#9f1239;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Verification Code</p>
                        <p style="margin:0;font-size:40px;font-weight:800;color:#be123c;letter-spacing:12px;">${otp}</p>
                      </div>
                      <p style="margin:0;font-size:13px;color:#9ca3af;">
                        If you didn't create an account with Magee Salon, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
                      <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Magee Salon. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  const apiKey = process.env['BREVO_API_KEY'] ?? '';

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
