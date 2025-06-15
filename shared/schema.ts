import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("10000").notNull(),
  playCount: integer("play_count").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isOwner: boolean("is_owner").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
  lastRewardDate: timestamp("last_reward_date"),
  currentLoginStreak: integer("current_login_streak").default(0).notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  bannedBy: integer("banned_by"),
  subscriptionTier: text("subscription_tier").default("none"), // none, bronze, silver, gold
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"), // active, inactive, past_due, canceled, etc.
  subscriptionEndsAt: timestamp("subscription_ends_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameType: text("game_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  multiplier: decimal("multiplier", { precision: 10, scale: 4 }).notNull(),
  payout: decimal("payout", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isWin: boolean("is_win").notNull(),
  metadata: text("metadata"),
  gameData: text("game_data"),
});

export const coinTransactions = pgTable("coin_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Positive for adding coins, negative for removing
  reason: text("reason").notNull(),
  adminId: integer("admin_id").notNull(), // Admin who performed the action, or 0 for system (purchases)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount in USD
  coins: decimal("coins", { precision: 10, scale: 2 }).notNull(), // Number of coins purchased
  stripeSessionId: text("stripe_session_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const loginRewards = pgTable("login_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  day: integer("day").notNull(), // Day number in the streak (1-30)
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Reward amount in coins
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tier: text("tier").notNull(), // bronze, silver, gold
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  status: text("status").notNull(), // active, canceled, past_due, etc.
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  priceId: text("price_id").notNull(), // Stripe price ID
  priceAmount: decimal("price_amount", { precision: 10, scale: 2 }).notNull(), // Price in USD
  metadata: text("metadata"), // Any additional details as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const banAppeals = pgTable("ban_appeals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(), // User's explanation for the appeal
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  adminResponse: text("admin_response"), // Admin's response to the appeal
  adminId: integer("admin_id"), // Admin who responded to the appeal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  timestamp: true,
});

export const insertCoinTransactionSchema = createInsertSchema(coinTransactions).omit({
  id: true,
  timestamp: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoginRewardSchema = createInsertSchema(loginRewards).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Admin operation schemas
export const adminUserUpdateSchema = z.object({
  isAdmin: z.boolean().optional(),
  isOwner: z.boolean().optional(),
  isBanned: z.boolean().optional(),
});

export const adminBanUserSchema = z.object({
  banReason: z.string().min(3).max(500),
});

export const banAppealSchema = z.object({
  reason: z.string().min(10).max(1000).describe("Explain why your ban should be lifted"),
});

export const adminBanAppealResponseSchema = z.object({
  appealId: z.number(),
  status: z.enum(['approved', 'rejected']),
  response: z.string().min(3).max(500),
});

export const adminCoinAdjustmentSchema = z.object({
  username: z.string(),
  amount: z.number(), // Can be negative for removing coins
  reason: z.string().min(1).max(500),
});

// Schema for sending mass bonus to all users
export const adminMassBonusSchema = z.object({
  amount: z.number().positive().min(1).max(10000),
  reason: z.string().min(3).max(200),
  message: z.string().min(3).max(200),
  targetType: z.enum(['all', 'new', 'active', 'veteran', 'custom']).optional().default('all'),
  filters: z.object({
    minPlayCount: z.number().int().min(0).optional(),
    maxPlayCount: z.number().int().min(0).optional(),
  }).optional(),
});

// Schema for system announcements
export const adminAnnouncementSchema = z.object({
  title: z.string().min(3).max(100),
  message: z.string().min(3).max(500),
  type: z.enum(['info', 'warning', 'success', 'error']),
  duration: z.number().int().min(5).max(3600).default(30), // Display duration in seconds
  isPinned: z.boolean().default(false), // Whether to pin the announcement
  targetUserIds: z.array(z.number()).optional(), // Optional array of user IDs to target with this announcement
});

// Schema for game configuration updates
export const adminGameConfigSchema = z.object({
  gameType: z.enum(['slots', 'dice', 'crash', 'roulette', 'blackjack', 'plinko']),
  config: z.record(z.any()), // Game-specific configuration as key-value pairs
});

// Schema for admin assigning subscription to user
export const adminAssignSubscriptionSchema = z.object({
  userId: z.number(),
  tier: z.enum(['bronze', 'silver', 'gold']),
  durationMonths: z.number().min(1).max(12),
  reason: z.string().min(3).max(100)
});

// Schema for coin purchase packages
export const coinPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  coins: z.number().int().positive(),
  price: z.number().positive(), // Price in USD
  discount: z.number().min(0).max(100).optional(), // Optional discount percentage
  featured: z.boolean().default(false),
});

// Schema for creating a payment intent
export const createPaymentIntentSchema = z.object({
  packageId: z.string(),
});

// Schema for subscription plans
export const subscriptionPlanSchema = z.object({
  id: z.string(),
  tier: z.enum(['bronze', 'silver', 'gold']),
  name: z.string(),
  price: z.number().positive(),
  priceId: z.string(), // Stripe price ID
  features: z.array(z.string()),
  description: z.string(),
  coinReward: z.number().int().positive(), // Daily coin reward
  multiplier: z.number().positive().optional(), // Win multiplier (if applicable)
});

// Schema for creating/updating a subscription
export const manageSubscriptionSchema = z.object({
  tier: z.enum(['bronze', 'silver', 'gold']),
});

export const insertBanAppealSchema = createInsertSchema(banAppeals).omit({
  id: true,
  status: true,
  adminResponse: true,
  adminId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertCoinTransaction = z.infer<typeof insertCoinTransactionSchema>;
export type CoinTransaction = typeof coinTransactions.$inferSelect;
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
export type AdminBanUser = z.infer<typeof adminBanUserSchema>;
export type BanAppeal = z.infer<typeof banAppealSchema>;
export type AdminBanAppealResponse = z.infer<typeof adminBanAppealResponseSchema>;
export type InsertBanAppeal = z.infer<typeof insertBanAppealSchema>;
export type BanAppealType = typeof banAppeals.$inferSelect;
export type AdminCoinAdjustment = z.infer<typeof adminCoinAdjustmentSchema>;
export type AdminMassBonus = z.infer<typeof adminMassBonusSchema>;
export type AdminAnnouncement = z.infer<typeof adminAnnouncementSchema>;
export type AdminGameConfig = z.infer<typeof adminGameConfigSchema>;
export type AdminAssignSubscription = z.infer<typeof adminAssignSubscriptionSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertLoginReward = z.infer<typeof insertLoginRewardSchema>;
export type LoginReward = typeof loginRewards.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type CoinPackage = z.infer<typeof coinPackageSchema>;
export type CreatePaymentIntent = z.infer<typeof createPaymentIntentSchema>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type ManageSubscription = z.infer<typeof manageSubscriptionSchema>;

// Game related schemas
export const betSchema = z.object({
  amount: z.number().positive().min(1).max(10000), // Max bet of 10,000 coins
});

export const slotsPayoutSchema = z.object({
  symbols: z.array(z.array(z.string())), // 2D array for 3x3 grid
  multiplier: z.number(),
  payout: z.number(),
  isWin: z.boolean(),
  winningLines: z.array(z.array(z.number())).optional(), // Winning line coordinates
});

export const diceRollSchema = z.object({
  target: z.number().int().min(1).max(100),
  result: z.number().int().min(1).max(100),
  multiplier: z.number(),
  payout: z.number(),
  isWin: z.boolean()
});

export const crashGameSchema = z.object({
  crashPoint: z.number(),
  cashoutPoint: z.number().optional(),
  multiplier: z.number(),
  payout: z.number(),
  isWin: z.boolean()
});

export const plinkoPinSchema = z.object({
  row: z.number(),
  position: z.number()
});

export const plinkoPathSchema = z.object({
  row: z.number(), 
  position: z.number()
});

export const plinkoGameSchema = z.object({
  risk: z.enum(['low', 'medium', 'high']),
  rows: z.number().int().min(8).max(16),
  pins: z.array(z.array(plinkoPinSchema)).optional(),
  path: z.array(plinkoPathSchema),
  multiplier: z.number(),
  payout: z.number(),
  isWin: z.boolean(),
  landingPosition: z.number().int().min(0),
  multipliers: z.array(z.number()).optional(),
});

// Roulette bet types
export const rouletteBetTypeSchema = z.enum([
  'straight', // Single number (35:1)
  'split', // Two numbers (17:1)
  'street', // Three numbers (11:1)
  'corner', // Four numbers (8:1)
  'line', // Six numbers (5:1)
  'dozen', // 12 numbers (2:1) - first, second, or third dozen
  'column', // 12 numbers (2:1) - 1st, 2nd, or 3rd column
  'even', // Even numbers (1:1)
  'odd', // Odd numbers (1:1)
  'red', // Red numbers (1:1)
  'black', // Black numbers (1:1)
  'low', // 1-18 (1:1)
  'high', // 19-36 (1:1)
]);

export const singleBetSchema = z.object({
  amount: z.number().positive().min(1).max(10000), // Max bet of 10,000 coins
  type: rouletteBetTypeSchema,
  numbers: z.array(z.number().int().min(0).max(36)), // Array of numbers being bet on (can be a single number, or multiple)
});

export const rouletteBetSchema = z.object({
  bets: z.array(singleBetSchema),
});

export const rouletteResultSchema = z.object({
  spin: z.number().int().min(0).max(36), // The number that the ball landed on
  color: z.enum(['red', 'black', 'green']), // Color of the pocket
  multiplier: z.number(),
  payout: z.number(),
  isWin: z.boolean(),
  metadata: z.string().optional() // For storing additional data
});

// Blackjack schemas
export const cardSchema = z.object({
  suit: z.enum(['hearts', 'diamonds', 'clubs', 'spades']),
  value: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']),
  hidden: z.boolean().optional(),
});

export const blackjackActionSchema = z.enum([
  'hit',
  'stand',
  'double',
  'split',
  'surrender',
  'insurance'
]);

export const blackjackHandSchema = z.object({
  cards: z.array(cardSchema),
  value: z.number().int(),
  isBusted: z.boolean().optional(),
  isSplit: z.boolean().optional(),
  isBlackjack: z.boolean().optional(),
  isSurrendered: z.boolean().optional(),
  bet: z.number().optional(),
});

export const blackjackStateSchema = z.object({
  playerHands: z.array(blackjackHandSchema),
  dealerHand: blackjackHandSchema,
  currentHandIndex: z.number().int().min(0).optional(),
  status: z.enum(['betting', 'player-turn', 'dealer-turn', 'complete']),
  insurance: z.number().optional(),
  allowedActions: z.array(blackjackActionSchema).optional(),
  result: z.enum(['win', 'lose', 'push', 'blackjack', 'surrender']).optional(),
  payout: z.number().optional(),
  isComplete: z.boolean().optional(),
});

export const blackjackBetSchema = z.object({
  amount: z.number().positive().min(1).max(10000), // Max bet of 10,000 coins
  action: blackjackActionSchema.optional(),
  handIndex: z.number().int().min(0).optional(),
});

// Poker schemas
export const pokerHandTypeSchema = z.enum([
  'high-card',
  'pair',
  'two-pair',
  'three-of-a-kind',
  'straight',
  'flush',
  'full-house',
  'four-of-a-kind',
  'straight-flush',
  'royal-flush'
]);

export const pokerActionSchema = z.enum([
  'check',
  'bet',
  'call',
  'raise',
  'fold',
  'all-in'
]);

export const pokerPlayerSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  chips: z.number().int().min(0),
  cards: z.array(cardSchema).optional(),
  bet: z.number().int().min(0).optional(),
  action: pokerActionSchema.optional(),
  isActive: z.boolean().optional(),
  hasFolded: z.boolean().optional(),
  isAllIn: z.boolean().optional(),
});

export const pokerGameStateSchema = z.object({
  players: z.array(pokerPlayerSchema),
  communityCards: z.array(cardSchema),
  pot: z.number().int().min(0),
  currentBet: z.number().int().min(0),
  currentPlayer: z.number().int().min(0).optional(),
  dealerPosition: z.number().int().min(0),
  stage: z.enum(['pre-flop', 'flop', 'turn', 'river', 'showdown']),
  results: z.record(z.string(), z.object({
    handType: pokerHandTypeSchema,
    bestHand: z.array(cardSchema),
    winAmount: z.number().optional()
  })).optional(),
});

export type SlotsPayout = z.infer<typeof slotsPayoutSchema>;
export type DiceRoll = z.infer<typeof diceRollSchema>;
export type CrashGame = z.infer<typeof crashGameSchema>;
export type PlinkoPin = z.infer<typeof plinkoPinSchema>;
export type PlinkoPath = z.infer<typeof plinkoPathSchema>;
export type PlinkoGame = z.infer<typeof plinkoGameSchema>;
export type RouletteBetType = z.infer<typeof rouletteBetTypeSchema>;
export type SingleBet = z.infer<typeof singleBetSchema>;
export type RouletteBet = z.infer<typeof rouletteBetSchema>;
export type RouletteResult = z.infer<typeof rouletteResultSchema>;
export type Card = z.infer<typeof cardSchema>;
export type BlackjackAction = z.infer<typeof blackjackActionSchema>;
export type BlackjackHand = z.infer<typeof blackjackHandSchema>;
export type BlackjackBet = z.infer<typeof blackjackBetSchema>;
export type BlackjackState = z.infer<typeof blackjackStateSchema>;
export type PokerHandType = z.infer<typeof pokerHandTypeSchema>;
export type PokerAction = z.infer<typeof pokerActionSchema>;
export type PokerPlayer = z.infer<typeof pokerPlayerSchema>;
export type PokerGameState = z.infer<typeof pokerGameStateSchema>;

// Support Tickets

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // open, in-progress, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

// Password reset functionality
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

export const forgotPasswordSchema = z.object({
  username: z.string().min(1),
});

export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
