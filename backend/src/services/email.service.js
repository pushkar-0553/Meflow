import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class EmailService {
  /**
   * Send transactional email using Resend HTTPS API or Console Fallback
   */
  async sendEmail({ to, subject, html, text }) {
    if (env.EMAIL.API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.EMAIL.API_KEY}`,
          },
          body: JSON.stringify({
            from: env.EMAIL.FROM,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            ...(text && { text }),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to dispatch email via Resend API');
        }

        logger.success(`Email dispatched successfully via Resend API to: ${to} (ID: ${data.id})`);
        return { success: true, messageId: data.id, provider: 'resend' };
      } catch (error) {
        logger.error(`Resend API email dispatch failed for ${to}:`, error.message);
        // Fall back to console logger so onboarding isn't blocked if key is invalid
        this.logToConsole({ to, subject, html, error: error.message });
        return { success: false, fallback: true, error: error.message };
      }
    } else {
      // Development Mock Logger
      this.logToConsole({ to, subject, html });
      return { success: true, simulated: true, provider: 'console_mock' };
    }
  }

  logToConsole({ to, subject, html, error = null }) {
    console.log('\n======================================================');
    console.log(`📧 [EMAIL NOTIFICATION SERVICE ${error ? 'FALLBACK' : 'DEV SIMULATION'}]`);
    if (error) console.log(`⚠️  Live API Error: ${error}`);
    console.log(`To:      ${to}`);
    console.log(`From:    ${env.EMAIL.FROM}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------------------');
    // Extract any links for quick CLI clicking
    const linkMatch = html.match(/href="([^"]+)"/);
    if (linkMatch) {
      console.log(`🔗 Primary Link: \x1b[36m${linkMatch[1]}\x1b[0m`);
    }
    console.log('Preview:');
    // Print stripped plain text preview
    const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(cleanText.slice(0, 300) + (cleanText.length > 300 ? '...' : ''));
    console.log('======================================================\n');
  }

  /**
   * Send Employee Invitation with single-use onboarding token link
   */
  async sendInvitationEmail({ to, name, inviteUrl, roleName }) {
    const subject = `Welcome to VCube MeFlow - Set Up Your Account (${roleName})`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <h2 style="color: #1e293b; margin-top: 0;">Welcome to VCube MeFlow 👋</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          You have been invited to join the VCube Digital Marketing Operations platform as a <strong>${roleName}</strong>.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.5;">
          Please click the button below to set up your password and access your daily work dashboard:
        </p>
        <div style="margin: 32px 0;">
          <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Set Up Your Password &rarr;
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This invitation link is valid for <strong>48 hours</strong> and can only be used once.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          If you did not expect this invitation, please contact your administrator.
        </p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordResetEmail({ to, name, resetUrl }) {
    const subject = 'VCube MeFlow - Password Reset Request';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px;">
          Hello <strong>${name}</strong>,
        </p>
        <p style="color: #475569; font-size: 16px;">
          We received a request to reset your password. Click the button below to choose a new password:
        </p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Reset Password &rarr;
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This link will expire in 1 hour. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

export const emailService = new EmailService();

