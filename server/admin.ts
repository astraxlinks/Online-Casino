import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, ownerMiddleware, hashPassword } from "./auth";
import { 
  adminUserUpdateSchema, 
  adminCoinAdjustmentSchema,
  adminMassBonusSchema,
  adminAnnouncementSchema,
  adminGameConfigSchema,
  adminAssignSubscriptionSchema,
  adminBanUserSchema,
  adminBanAppealResponseSchema,
  banAppealSchema
} from "@shared/schema";
import { z } from "zod";

/**
 * Password reset schema for admin
 */
const adminPasswordResetSchema = z.object({
  newPassword: z.string().min(6).max(50)
});

/**
 * Set up admin-related API routes
 */
export function setupAdminRoutes(app: Express) {
  console.log("Setting up admin API routes...");
  
  // === ANALYTICS ENDPOINTS ===
  
  // Get analytics data
  app.get("/api/admin/analytics", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { timeframe } = req.query;
      let startDate;
      const endDate = new Date();
      
      // Set time range based on timeframe
      switch(timeframe) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0); // Default to today
      }
      
      // Get active users count (users who logged in during the timeframe)
      const activeUsers = await storage.getActiveUsersCount(startDate, endDate);
      
      // Get total user count
      const totalUsers = await storage.getUserCount();
      
      // Get total coins spent and earned during the timeframe
      const coinsSpent = await storage.getCoinsSpent(startDate, endDate);
      const coinsEarned = await storage.getCoinsEarned(startDate, endDate);
      
      // Get most played game
      const mostPlayedGame = await storage.getMostPlayedGame(startDate, endDate);
      
      // Get game distribution
      const gameDistribution = await storage.getGameDistribution(startDate, endDate);
      
      // Get daily new users for past 30 days
      const dailyNewUsers = await storage.getDailyNewUsers();
      
      // Get daily transactions for past 30 days
      const dailyTransactions = await storage.getDailyTransactions();
      
      // Get subscription stats
      const subscriptionStats = await storage.getSubscriptionStats();
      
      res.json({
        activeUsers,
        totalUsers,
        coinsSpent,
        coinsEarned,
        mostPlayedGame,
        gameDistribution,
        dailyNewUsers,
        dailyTransactions,
        subscriptionStats,
        timeframe: timeframe || 'today'
      });
    } catch (error) {
      console.error("Error in analytics endpoint:", error);
      res.status(500).json({ message: "Failed to get analytics data" });
    }
  });

  // === USER MANAGEMENT ENDPOINTS ===
  
  // Get all users (admin only)
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Support pagination
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      
      // Get users with pagination
      const users = await storage.getAllUsers(limit, offset);
      
      // Get total user count for pagination
      const totalUsers = await storage.getUserCount();
      
      // Remove passwords from user objects before sending
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({
        users: safeUsers,
        pagination: {
          page,
          limit,
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch users", error: errorMessage });
    }
  });
  
  // Search users by username (admin only)
  app.get("/api/admin/users/search", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const searchTerm = req.query.q as string;
      
      if (!searchTerm || searchTerm.length < 2) {
        return res.status(400).json({ message: "Search term must be at least 2 characters" });
      }
      
      const users = await storage.searchUsers(searchTerm);
      
      // Remove passwords from user objects before sending
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({ users: safeUsers });
    } catch (error) {
      console.error("Error searching users:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to search users", error: errorMessage });
    }
  });

  // Update user admin status (owner only)
  app.patch("/api/admin/users/:userId/admin-status", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate request body against schema
      const updateData = adminUserUpdateSchema.parse(req.body);
      
      // Prevent owner from modifying their own status
      if (userId === req.user?.id) {
        return res.status(403).json({ message: "Cannot modify your own admin status" });
      }
      
      // Update user admin status
      const updatedUser = await storage.updateUserAdminStatus(userId, updateData);
      
      // Remove password from user object before sending
      const { password, ...safeUser } = updatedUser;
      
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error updating user admin status:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update user admin status", error: errorMessage });
    }
  });
  
  // Ban or unban a user (admin only)
  app.post("/api/admin/users/:userId/ban", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate request body against schema
      const banData = adminBanUserSchema.parse(req.body);
      
      // Prevent admin from banning themselves
      if (userId === req.user?.id) {
        return res.status(403).json({ message: "Cannot ban yourself" });
      }
      
      // Ban the user with reason
      const updatedUser = await storage.banUser(userId, req.user!.id, banData.banReason);
      
      // Remove password from user object before sending
      const { password, ...safeUser } = updatedUser;
      
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error banning user:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to ban user", error: errorMessage });
    }
  });
  
  // Unban a user (admin only)
  app.post("/api/admin/users/:userId/unban", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Unban the user
      const updatedUser = await storage.unbanUser(userId);
      
      // Remove password from user object before sending
      const { password, ...safeUser } = updatedUser;
      
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Error unbanning user:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to unban user", error: errorMessage });
    }
  });

  // === COIN MANAGEMENT ENDPOINTS ===
  
  // Adjust user balance (admin only)
  app.post("/api/admin/users/:userId/adjust-balance", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate request body
      const { amount, reason } = adminCoinAdjustmentSchema.omit({ username: true }).parse(req.body);
      
      // Make sure target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Adjust user balance
      const updatedUser = await storage.adjustUserBalance(
        userId,
        amount,
        req.user!.id,
        reason
      );
      
      // Remove password from user object before sending
      const { password, ...safeUser } = updatedUser;
      
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error adjusting user balance:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to adjust user balance", error: errorMessage });
    }
  });
  
  // Get coin transaction history (admin only)
  app.get("/api/admin/coin-transactions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const transactions = await storage.getCoinTransactions(userId, limit);
      
      res.json({ transactions });
    } catch (error) {
      console.error("Error fetching coin transactions:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch coin transactions", error: errorMessage });
    }
  });
  
  // Get user transactions (admin only)
  app.get("/api/admin/users/:userId/transactions", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Make sure target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const transactions = await storage.getUserTransactions(userId, limit);
      
      res.json({ transactions });
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch user transactions", error: errorMessage });
    }
  });

  // === MASS BONUS ENDPOINTS ===
  
  // Send bonus to all users (admin only)
  app.post("/api/admin/mass-bonus", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      // Validate request body
      const bonusData = adminMassBonusSchema.parse(req.body);
      
      // Get all users - up to 1000 users
      const allUsers = await storage.getAllUsers(1000, 0);
      const adminId = req.user!.id;
      
      // Track success and failures
      const results = {
        success: 0,
        failed: 0,
        totalUsers: 0,
        targetedUsers: [] as number[] // Keep track of who received the bonus
      };
      
      // Filter users based on targetType and filters
      let targetUsers = [...allUsers];
      
      // Filter users based on the targetType if specified
      if (bonusData.targetType) {
        switch (bonusData.targetType) {
          case 'new':
            targetUsers = targetUsers.filter(user => user.playCount < 10);
            break;
          case 'active':
            targetUsers = targetUsers.filter(user => user.playCount >= 10 && user.playCount <= 100);
            break;
          case 'veteran':
            targetUsers = targetUsers.filter(user => user.playCount > 100);
            break;
          case 'custom':
            if (bonusData.filters) {
              const { minPlayCount, maxPlayCount } = bonusData.filters;
              if (minPlayCount !== undefined) {
                targetUsers = targetUsers.filter(user => user.playCount >= minPlayCount);
              }
              if (maxPlayCount !== undefined) {
                targetUsers = targetUsers.filter(user => user.playCount <= maxPlayCount);
              }
            }
            break;
          // 'all' case - keep all users
        }
      }
      
      results.totalUsers = targetUsers.length;
      
      // Apply bonus to filtered users
      for (const user of targetUsers) {
        try {
          // Skip banned users
          if (user.isBanned) continue;
          
          // Add bonus to user's balance
          await storage.adjustUserBalance(
            user.id,
            bonusData.amount,
            adminId,
            bonusData.reason
          );
          
          results.success++;
          results.targetedUsers.push(user.id); // Track who received the bonus
        } catch (err) {
          console.error(`Failed to add bonus to user ${user.id}:`, err);
          results.failed++;
        }
      }
      
      // Store the announcement about the bonus
      const announcement = {
        title: "Bonus coins added!",
        message: bonusData.message,
        type: "success" as const,
        duration: 3600, // 1 hour in seconds
        isPinned: true,
        targetUserIds: results.targetedUsers // Only show to users who received the bonus
      };
      
      await storage.createAnnouncement(announcement, adminId);
      
      res.json({ 
        message: "Mass bonus processed", 
        results 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error processing mass bonus:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to process mass bonus", error: errorMessage });
    }
  });
  
  // === ANNOUNCEMENTS ENDPOINTS ===
  
  // Create an announcement (admin only)
  app.post("/api/admin/announcements", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Validate request body
      const announcementData = adminAnnouncementSchema.parse(req.body);
      
      // Create announcement
      const announcement = await storage.createAnnouncement(announcementData, req.user!.id);
      
      res.status(201).json({ announcement });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error creating announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to create announcement", error: errorMessage });
    }
  });
  
  // Get all announcements (admin only)
  app.get("/api/admin/announcements", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const announcements = await storage.getAnnouncements(true); // Include expired
      
      res.json({ announcements });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch announcements", error: errorMessage });
    }
  });
  
  // Delete an announcement (admin only)
  app.delete("/api/admin/announcements/:announcementId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const announcementId = parseInt(req.params.announcementId);
      
      await storage.deleteAnnouncement(announcementId);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to delete announcement", error: errorMessage });
    }
  });
  
  // === GAME CONFIG ENDPOINTS ===
  
  // Get current game configuration (admin only)
  app.get("/api/admin/game-config/:gameType", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const gameType = req.params.gameType;
      
      // Validate game type
      if (!['slots', 'dice', 'crash', 'roulette', 'blackjack'].includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }
      
      const config = await storage.getGameConfig(gameType);
      
      res.json({ config });
    } catch (error) {
      console.error("Error fetching game config:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch game config", error: errorMessage });
    }
  });
  
  // Update game configuration (admin only)
  app.patch("/api/admin/game-config", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      // Validate request body
      const configData = adminGameConfigSchema.parse(req.body);
      
      // Update game configuration
      const updatedConfig = await storage.updateGameConfig(
        configData.gameType,
        configData.config
      );
      
      res.json({ config: updatedConfig });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error updating game config:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update game config", error: errorMessage });
    }
  });
  
  // === SUPPORT INBOX ENDPOINTS ===
  
  // Get all support tickets (admin only)
  app.get("/api/admin/support", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const tickets = await storage.getSupportTickets(status, page, limit);
      
      res.json({ tickets });
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch support tickets", error: errorMessage });
    }
  });
  
  // Get a specific support ticket (admin only)
  app.get("/api/admin/support/:ticketId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch support ticket", error: errorMessage });
    }
  });
  
  // Reply to a support ticket (admin only)
  app.post("/api/admin/support/:ticketId/reply", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Reply message is required" });
      }
      
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      // Add reply to the ticket
      const updatedTicket = await storage.addSupportTicketReply(
        ticketId,
        req.user!.id,
        message,
        true // isAdmin
      );
      
      res.json({ ticket: updatedTicket });
    } catch (error) {
      console.error("Error replying to support ticket:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to reply to support ticket", error: errorMessage });
    }
  });
  
  // Update support ticket status (admin only)
  app.patch("/api/admin/support/:ticketId/status", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { status } = req.body;
      
      if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Valid status is required (open, in-progress, resolved, closed)" });
      }
      
      const ticket = await storage.updateSupportTicketStatus(ticketId, status);
      
      if (!ticket) {
        return res.status(404).json({ message: "Support ticket not found" });
      }
      
      res.json({ ticket });
    } catch (error) {
      console.error("Error updating support ticket status:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update support ticket status", error: errorMessage });
    }
  });
  
  // === SUBSCRIPTION MANAGEMENT ENDPOINTS ===
  
  // Assign subscription to user (owner only)
  app.post("/api/admin/subscriptions/assign", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      // Validate request body
      const subscriptionData = adminAssignSubscriptionSchema.parse(req.body);
      
      // Verify target user exists
      const targetUser = await storage.getUser(subscriptionData.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create subscription with owner's privileges
      const subscription = await storage.assignSubscriptionToUser(
        subscriptionData.userId,
        subscriptionData.tier,
        subscriptionData.durationMonths,
        req.user!.id,
        subscriptionData.reason
      );
      
      res.status(201).json({ 
        message: `Successfully assigned ${subscriptionData.tier} subscription to ${targetUser.username} for ${subscriptionData.durationMonths} month(s)`,
        subscription 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error assigning subscription:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to assign subscription", error: errorMessage });
    }
  });
  
  // Get user's current subscription (admin only)
  app.get("/api/admin/users/:userId/subscription", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Verify target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's subscription
      const subscription = await storage.getUserSubscription(userId);
      
      res.json({ 
        user: {
          id: targetUser.id,
          username: targetUser.username,
          subscriptionTier: targetUser.subscriptionTier
        },
        subscription: subscription ? {
          ...subscription,
          active: subscription.status === 'active'
        } : null
      });
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch user subscription", error: errorMessage });
    }
  });

  // Remove a user's subscription (owner only)
  app.delete("/api/admin/users/:userId/subscription", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Verify target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's active subscription
      const subscription = await storage.getUserSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({ message: "User has no active subscription" });
      }
      
      // Add reason to audit trail
      const { reason } = req.body;
      const auditReason = reason || "Removed by owner";
      
      // Cancel the subscription
      const updatedSubscription = await storage.cancelSubscription(subscription.id);
      
      // Record this action in coin transactions for audit trail
      await storage.createCoinTransaction({
        userId,
        amount: "0", // No coins directly affected
        reason: `Subscription removed by owner: ${auditReason}`,
        adminId: req.user!.id
      });
      
      // No announcement will be created for subscription removal as requested
      
      res.json({ 
        message: `Successfully removed subscription from ${targetUser.username}`,
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error("Error removing subscription:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to remove subscription", error: errorMessage });
    }
  });
  
  // === PASSWORD MANAGEMENT ENDPOINTS ===
  
  // Reset user password (owner only)
  app.post("/api/admin/users/:userId/reset-password", authMiddleware, ownerMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Make sure target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate request data
      const { newPassword } = adminPasswordResetSchema.parse(req.body);
      
      // Hash the new password - reuse the function from auth.ts
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      const updatedUser = await storage.updateUserPassword(userId, hashedPassword);
      
      // Remove password from user object before sending
      const { password, ...safeUser } = updatedUser;
      
      res.json({ 
        user: safeUser,
        message: "Password reset successful" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error resetting user password:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to reset user password", error: errorMessage });
    }
  });

  // === BAN MANAGEMENT ENDPOINTS ===
  
  // Get all banned users (admin only)
  app.get("/api/admin/banned-users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      
      const bannedUsers = await storage.getBannedUsers(limit, offset);
      
      // Remove passwords from user objects before sending
      const safeBannedUsers = bannedUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({ users: safeBannedUsers });
    } catch (error) {
      console.error("Error fetching banned users:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch banned users", error: errorMessage });
    }
  });
  
  // Get all ban appeals (admin only)
  app.get("/api/admin/ban-appeals", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      
      const appeals = await storage.getBanAppeals(status, limit, offset);
      
      res.json({ appeals });
    } catch (error) {
      console.error("Error fetching ban appeals:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch ban appeals", error: errorMessage });
    }
  });
  
  // Respond to a ban appeal (admin only)
  app.post("/api/admin/ban-appeals/:appealId/respond", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const appealId = parseInt(req.params.appealId);
      
      // Validate request body with adjusted schema data
      const responseData = {
        appealId, // Include appealId from URL params
        ...req.body
      };
      
      // Validate the complete data
      const validatedData = adminBanAppealResponseSchema.parse(responseData);
      
      // Update the appeal with admin response
      const updatedAppeal = await storage.respondToBanAppeal(
        appealId,
        req.user!.id,
        validatedData.status,
        validatedData.response
      );
      
      res.json({ appeal: updatedAppeal });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      
      console.error("Error responding to ban appeal:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to respond to ban appeal", error: errorMessage });
    }
  });
}