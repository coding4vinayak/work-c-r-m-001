import nodemailer from 'nodemailer';
import { executeWithCircuitBreaker } from '../utils/circuitBreaker';

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Interface for email options
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Function to send email with circuit breaker protection
export const sendEmail = async (options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Prepare email data for circuit breaker
    const emailData = {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      from: options.from || process.env.SMTP_FROM || 'noreply@abetworks.com'
    };

    // Execute email sending with circuit breaker protection
    const result = await executeWithCircuitBreaker('email', emailData);
    
    // If successful, actually send the email
    const info = await transporter.sendMail({
      from: emailData.from,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Function to send welcome email to new users
export const sendWelcomeEmail = async (to: string, userName: string): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to,
    subject: 'Welcome to ABETWORKS WORKCRM!',
    html: `
      <h1>Welcome, ${userName}!</h1>
      <p>Thank you for joining ABETWORKS WORKCRM. We're excited to have you on board.</p>
      <p>Your account has been successfully created. You can now start managing your customers, leads, and deals.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br/>The ABETWORKS Team</p>
    `
  };

  const result = await sendEmail(emailOptions);
  return result.success;
};

// Function to send notification emails
export const sendNotificationEmail = async (
  to: string, 
  subject: string, 
  message: string
): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to,
    subject,
    html: `<p>${message}</p><p>This is an automated notification from ABETWORKS WORKCRM.</p>`
  };

  const result = await sendEmail(emailOptions);
  return result.success;
};

// Function to send invoice emails
export const sendInvoiceEmail = async (
  to: string,
  invoiceNumber: string,
  amount: number,
  downloadLink: string
): Promise<boolean> => {
  const emailOptions: EmailOptions = {
    to,
    subject: `Invoice ${invoiceNumber} - ABETWORKS WORKCRM`,
    html: `
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Amount: $${amount.toFixed(2)}</p>
      <p>You can view and download your invoice using the link below:</p>
      <a href="${downloadLink}">Download Invoice</a>
      <p>If you have any questions about this invoice, please contact our billing department.</p>
    `
  };

  const result = await sendEmail(emailOptions);
  return result.success;
};