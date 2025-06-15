import { Request, Response, Express } from 'express';
import { storage } from './storage';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';
import { passwordResetSchema, forgotPasswordSchema } from '@shared/schema';
import { Resend } from 'resend';

// Initialize Resend email service
const resend = new Resend(process.env.RESEND_API_KEY);

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Hash a password for secure storage
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Forgot password handler - initiates password reset flow
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    // Validate request
    const { username } = forgotPasswordSchema.parse(req.body);
    
    // Find the user
    const user = await storage.getUserByUsername(username);
    
    // If user doesn't exist, still return a success message to prevent username enumeration
    if (!user) {
      return res.status(200).json({ 
        message: "If a user with that username exists, a password reset link has been sent to their email." 
      });
    }
    
    // Check if the user has an email
    if (!user.email) {
      return res.status(400).json({ 
        message: "This account doesn't have an email address. Please contact support." 
      });
    }
    
    // Generate a random token
    const token = randomBytes(32).toString('hex');
    
    // Store the token in the database with expiry (24 hours)
    await storage.createPasswordResetToken(user.id, token, 24);
    
    // Create reset link
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    
    // Send email with reset link
    const { data, error } = await resend.emails.send({
      from: 'password-reset@ragebet.co',
      to: user.email,
      subject: 'Reset Your Rage Bet Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #5465FF;">Rage Bet Password Reset</h2>
          <p>Hello ${user.username},</p>
          <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #5465FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="background-color: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${resetLink}</p>
          <p>This link will expire in 24 hours.</p>
          <p>The Rage Bet Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending reset email:', error);
      return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }
    
    res.status(200).json({ 
      message: "If a user with that username exists, a password reset link has been sent to their email." 
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
}

/**
 * Verify a reset token
 */
export async function verifyResetToken(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing token' });
    }
    
    // Check if token exists and is valid
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(404).json({ message: 'Token not found or already used' });
    }
    
    // Check if token is expired
    const now = new Date();
    const expiry = new Date(resetToken.expiresAt);
    
    if (now > expiry) {
      return res.status(400).json({ message: 'Token has expired. Please request a new password reset.' });
    }
    
    // Check if token has been used
    if (resetToken.isUsed) {
      return res.status(400).json({ message: 'This token has already been used. Please request a new password reset.' });
    }
    
    // Token is valid
    res.status(200).json({ message: 'Token is valid', userId: resetToken.userId });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
}

/**
 * Reset password handler - completes password reset flow
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing token' });
    }
    
    // Validate request body
    const { password } = passwordResetSchema.parse(req.body);
    
    // Get the token from database
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(404).json({ message: 'Token not found or already used' });
    }
    
    // Check if token is expired
    const now = new Date();
    const expiry = new Date(resetToken.expiresAt);
    
    if (now > expiry) {
      return res.status(400).json({ message: 'Token has expired. Please request a new password reset.' });
    }
    
    // Check if token has been used
    if (resetToken.isUsed) {
      return res.status(400).json({ message: 'This token has already been used. Please request a new password reset.' });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await storage.updateUserPassword(resetToken.userId, hashedPassword);
    
    // Mark the token as used
    await storage.markPasswordResetTokenAsUsed(resetToken.id);
    
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
}

/**
 * Update email for user
 */
export async function updateEmail(req: any, res: Response) {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    
    // Update the user's email
    await storage.updateUserEmail(req.user!.id, email);
    
    res.status(200).json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
}

/**
 * Set up password reset routes
 */
export function setupPasswordResetRoutes(app: Express) {
  app.post('/api/forgot-password', forgotPassword);
  app.get('/api/verify-reset-token', verifyResetToken);
  app.post('/api/reset-password', resetPassword);
  app.post('/api/update-email', updateEmail);
}