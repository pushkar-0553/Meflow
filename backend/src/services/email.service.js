import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class EmailService {
  /**
   * Validate standard email address format
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Strip HTML tags to produce a clean plain-text fallback
   */
  stripHtml(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Core transactional email sender using Brevo (formerly Sendinblue) v3 HTTPS API
   * Endpoint: POST https://api.brevo.com/v3/smtp/email
   * Authentication: api-key header
   */
  async sendEmail({ to, subject, html, text, recipientName = null }) {
    // 1. Input Validation
    const recipientEmails = Array.isArray(to) ? to : [to];
    const validRecipients = recipientEmails
      .map((item) => (typeof item === 'string' ? item.trim() : item?.email?.trim()))
      .filter((email) => this.isValidEmail(email));

    if (validRecipients.length === 0) {
      logger.error('Brevo EmailService: No valid recipient email addresses provided.');
      return {
        success: false,
        error: 'Invalid recipient email address.',
        provider: 'brevo',
      };
    }

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return {
        success: false,
        error: 'Email subject is required.',
        provider: 'brevo',
      };
    }

    if (!html && !text) {
      return {
        success: false,
        error: 'Email content (HTML or plain text) is required.',
        provider: 'brevo',
      };
    }

    const htmlContent = html || `<p>${text}</p>`;
    const textContent = text || this.stripHtml(htmlContent);

    // 2. Format Brevo Recipient Array
    const brevoTo = validRecipients.map((email) => ({
      email,
      name: recipientName || email.split('@')[0],
    }));

    // 3. Dispatch via Brevo HTTPS API if API Key is configured
    const apiKey = env.BREVO.API_KEY || env.EMAIL.API_KEY;

    if (apiKey) {
      try {
        const payload = {
          sender: {
            name: env.BREVO.SENDER_NAME || 'VCube MeFlow',
            email: env.BREVO.SENDER_EMAIL || 'notifications@vcube.com',
          },
          to: brevoTo,
          subject: subject.trim(),
          htmlContent,
          textContent,
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage = data.message || data.code || `HTTP ${response.status} ${response.statusText}`;
          logger.error(`Brevo API error for [${validRecipients.join(', ')}]: ${errorMessage}`);
          this.logToConsole({ to: validRecipients, subject, html: htmlContent, error: errorMessage });
          return {
            success: false,
            fallback: true,
            error: errorMessage,
            provider: 'brevo',
          };
        }

        const messageId = data.messageId || 'dispatched';
        logger.success(`Email dispatched successfully via Brevo to [${validRecipients.join(', ')}] (MessageId: ${messageId})`);
        return {
          success: true,
          messageId,
          provider: 'brevo',
        };
      } catch (error) {
        logger.error(`Brevo HTTPS dispatch exception for [${validRecipients.join(', ')}]:`, error.message);
        this.logToConsole({ to: validRecipients, subject, html: htmlContent, error: error.message });
        return {
          success: false,
          fallback: true,
          error: error.message,
          provider: 'brevo',
        };
      }
    } else {
      // 4. Safe Local Development / CI Mock Logger
      this.logToConsole({ to: validRecipients, subject, html: htmlContent });
      return {
        success: true,
        simulated: true,
        provider: 'console_mock',
      };
    }
  }

  /**
   * Local Console Logger for local development & fallback inspection
   */
  logToConsole({ to, subject, html, error = null }) {
    console.log('\n======================================================');
    console.log(`📧 [BREVO TRANSACTIONAL EMAIL ${error ? 'FALLBACK SIMULATION' : 'DEV SIMULATION'}]`);
    if (error) console.log(`⚠️  Provider Notice: ${error}`);
    console.log(`To:      ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`From:    ${env.BREVO.SENDER_NAME} <${env.BREVO.SENDER_EMAIL}>`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------------------');
    const linkMatch = html.match(/href="([^"]+)"/);
    if (linkMatch) {
      console.log(`🔗 Action Link: \x1b[36m${linkMatch[1]}\x1b[0m`);
    }
    const cleanText = this.stripHtml(html);
    console.log('Preview:');
    console.log(cleanText.slice(0, 300) + (cleanText.length > 300 ? '...' : ''));
    console.log('======================================================\n');
  }

  /**
   * Send Employee Invitation with single-use onboarding token link
   */
  async sendInvitationEmail({ to, name, inviteUrl, roleName }) {
    const subject = `Welcome to VCube MeFlow - Set Up Your Account (${roleName})`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VCube MeFlow</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 36px; height: 36px; line-height: 36px; border-radius: 10px; background: #2563eb; color: #ffffff; text-align: center; font-weight: 900; font-size: 18px;">V</div>
                          <span style="color: #ffffff; font-size: 18px; font-weight: 800; margin-left: 10px; vertical-align: middle; letter-spacing: -0.5px;">VCube MeFlow</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Welcome aboard, ${name}! 👋</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                      You have been invited to join the VCube Digital Marketing Operations workspace as a <strong style="color: #1e293b;">${roleName}</strong>.
                    </p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
                      Your personal workspace allows you to claim available tasks, track video production stages, submit proofs, and collaborate with your team.
                    </p>
                    <div style="text-align: left; margin: 0 0 32px;">
                      <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                        Set Up Your Account &rarr;
                      </a>
                    </div>
                    <div style="padding: 16px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                        ⏱️ <strong>Security Notice:</strong> This invitation link is unique to you, expires in <strong>48 hours</strong>, and can only be used once.
                      </p>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                      If the button above does not work, copy and paste this URL into your browser:<br />
                      <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      VCube MeFlow Operations Platform • Sent securely via Brevo
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      recipientName: name,
    });
  }

  /**
   * Send 6-Digit Password Reset 2-Factor OTP Verification Email via Brevo
   */
  async sendResetOtpEmail({ to, name, otp }) {
    const subject = `VCUBE MediaFlow — Your Verification Code: ${otp}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F8F8F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F8F7; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #EAEAEA; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                <tr>
                  <td style="padding: 28px 32px; background: #171717; border-bottom: 3px solid #FF6B00;">
                    <div style="font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">
                      <span style="color: #FF6B00;">VCUBE</span> MediaFlow
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="color: #171717; font-size: 20px; font-weight: 800; margin: 0 0 12px;">Password Recovery Code</h2>
                    <p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                      Hello <strong>${name}</strong>,<br>
                      We received a request to verify your account and reset your password for VCUBE MediaFlow.
                    </p>
                    <div style="background-color: #FFF7ED; border: 2px dashed #FF6B00; border-radius: 14px; padding: 24px; text-align: center; margin: 0 0 24px;">
                      <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #EA580C; margin-bottom: 8px;">6-Digit Verification Code</span>
                      <span style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #171717;">${otp}</span>
                    </div>
                    <p style="color: #737373; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
                      ⏱️ This code expires in <strong>5 minutes</strong> and allows up to 5 verification attempts.
                    </p>
                    <p style="color: #A3A3A3; font-size: 12px; line-height: 1.5; margin: 0;">
                      If you did not request this, you can safely ignore this email; your account remains secure.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; background-color: #F8F8F7; border-top: 1px solid #EAEAEA; text-align: center;">
                    <p style="color: #A3A3A3; font-size: 11px; margin: 0;">
                      VCUBE MediaFlow Security • Sent via Brevo
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      recipientName: name,
    });
  }

  /**
   * Send Password Reset Email with secure 1-hour expiration token
   */
  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const subject = 'VCube MeFlow - Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                <tr>
                  <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9; background: #0f172a;">
                    <span style="color: #ffffff; font-size: 18px; font-weight: 800;">VCube MeFlow</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Password Reset Request</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
                      We received a request to reset your password for your VCube MeFlow account. Click the button below to choose a new password:
                    </p>
                    <div style="text-align: left; margin: 0 0 32px;">
                      <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">
                        Reset Password &rarr;
                      </a>
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 24px;">
                      ⏱️ This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      VCube MeFlow • Security & Authentication Service
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      recipientName: name,
    });
  }

  /**
   * Protected Admin Test Email utility to verify Brevo connectivity
   */
  async sendTestEmail({ to, requestedBy = 'Administrator' }) {
    const subject = 'VCube MeFlow - Brevo Transactional Email Integration Test';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #10b981; margin-top: 0;">✅ Brevo Email Delivery Operational!</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          This test email confirms that your <strong>Brevo (formerly Sendinblue) Transactional HTTPS API</strong> integration is working correctly in VCube MeFlow.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #475569; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Sender Name:</strong> ${env.BREVO.SENDER_NAME}</p>
          <p style="margin: 4px 0;"><strong>Sender Email:</strong> ${env.BREVO.SENDER_EMAIL}</p>
          <p style="margin: 4px 0;"><strong>Triggered By:</strong> ${requestedBy}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">
          All employee invitations, onboarding tokens, and password reset notifications will now be dispatched via Brevo.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
