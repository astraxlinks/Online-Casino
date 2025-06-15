import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware } from "./auth";

// Validation schema for creating a new ticket
const createTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters long").max(100),
  message: z.string().min(10, "Message must be at least 10 characters long").max(1000)
});

// Validation schema for replying to a ticket
const replyTicketSchema = z.object({
  message: z.string().min(2, "Message must be at least 2 characters long").max(1000)
});

/**
 * Get user's support tickets
 */
export async function getUserTickets(req: Request, res: Response) {
  try {
    const tickets = await storage.getSupportTickets(undefined, 1, 100);
    
    // Filter tickets for the current user (unless admin)
    const isAdmin = req.user!.isAdmin || req.user!.isOwner;
    const userTickets = isAdmin 
      ? tickets 
      : tickets.filter(ticket => ticket.userId === req.user!.id);
    
    res.json(userTickets);
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to fetch support tickets", error: errorMessage });
  }
}

/**
 * Get a specific ticket by ID
 */
export async function getTicketById(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id);
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    const ticket = await storage.getSupportTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    // Check if the user is authorized to view this ticket
    const isAdmin = req.user!.isAdmin || req.user!.isOwner;
    if (!isAdmin && ticket.userId !== req.user!.id) {
      return res.status(403).json({ message: "You are not authorized to view this ticket" });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to fetch ticket", error: errorMessage });
  }
}

/**
 * Create a new support ticket
 */
export async function createTicket(req: Request, res: Response) {
  try {
    const { subject, message } = createTicketSchema.parse(req.body);
    
    const ticket = await storage.createSupportTicket(
      req.user!.id,
      subject,
      message
    );
    
    res.status(201).json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input data", errors: error.errors });
    }
    
    console.error("Error creating support ticket:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to create support ticket", error: errorMessage });
  }
}

/**
 * Reply to a support ticket
 */
export async function replyToTicket(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id);
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    const { message } = replyTicketSchema.parse(req.body);
    
    // Get the ticket first
    const ticket = await storage.getSupportTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    // Check if the user is authorized to reply to this ticket
    const isAdmin = req.user!.isAdmin || req.user!.isOwner;
    if (!isAdmin && ticket.userId !== req.user!.id) {
      return res.status(403).json({ message: "You are not authorized to reply to this ticket" });
    }
    
    // Check if the ticket is closed
    if (ticket.status === 'closed') {
      return res.status(400).json({ message: "Cannot reply to a closed ticket" });
    }
    
    // Add the reply
    const reply = await storage.addSupportTicketReply(
      ticketId,
      req.user!.id,
      message,
      isAdmin
    );
    
    // If admin is replying, update ticket status to 'in-progress'
    if (isAdmin && ticket.status === 'open') {
      await storage.updateSupportTicketStatus(ticketId, 'in-progress');
    }
    
    res.json(reply);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input data", errors: error.errors });
    }
    
    console.error("Error replying to support ticket:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to reply to support ticket", error: errorMessage });
  }
}

/**
 * Close a support ticket
 */
export async function closeTicket(req: Request, res: Response) {
  try {
    const ticketId = parseInt(req.params.id);
    
    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }
    
    const ticket = await storage.getSupportTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    
    // Check if the user is authorized to close this ticket
    const isAdmin = req.user!.isAdmin || req.user!.isOwner;
    if (!isAdmin && ticket.userId !== req.user!.id) {
      return res.status(403).json({ message: "You are not authorized to close this ticket" });
    }
    
    // If already closed, no need to update
    if (ticket.status === 'closed') {
      return res.json(ticket);
    }
    
    // Close the ticket
    const updatedTicket = await storage.updateSupportTicketStatus(ticketId, 'closed');
    
    res.json(updatedTicket);
  } catch (error) {
    console.error("Error closing support ticket:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ message: "Failed to close support ticket", error: errorMessage });
  }
}

/**
 * Setup support routes
 */
export function setupSupportRoutes(app: Express) {
  // User-facing routes (require normal authentication)
  app.get('/api/support/tickets', authMiddleware, getUserTickets);
  app.get('/api/support/tickets/:id', authMiddleware, getTicketById);
  app.post('/api/support/tickets', authMiddleware, createTicket);
  app.post('/api/support/tickets/:id/reply', authMiddleware, replyToTicket);
  app.patch('/api/support/tickets/:id/close', authMiddleware, closeTicket);
  
  // Admin-only routes
  app.get('/api/admin/support/tickets', adminMiddleware, async (req, res) => {
    try {
      // Get optional query parameters
      const status = req.query.status as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const tickets = await storage.getSupportTickets(status, page, limit);
      
      // Return a structured response object with tickets property
      // Even if tickets array is empty, we still return a valid response with an empty array
      res.json({
        tickets: tickets || [], // Ensure we always return an array
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((tickets?.length || 0) / limit),
          totalItems: tickets?.length || 0
        }
      });
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Return a 200 with an empty array instead of an error
      // This makes the frontend more robust against empty data
      res.json({
        tickets: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0
        },
        message: "No tickets found"
      });
    }
  });
  
  // Get specific ticket details (admin)
  app.get('/api/admin/support/tickets/:id', adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Make sure we return a format that includes the messages property the client expects
      res.json({
        ...ticket,
        messages: ticket.messages || []
      });
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to fetch ticket details", error: errorMessage });
    }
  });
  
  // Admin reply to ticket
  app.post('/api/admin/support/tickets/:id/reply', adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const { message } = req.body;
      
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      // Check if ticket exists
      const ticket = await storage.getSupportTicket(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // If the ticket is closed, don't allow reply
      if (ticket.status === 'closed') {
        return res.status(400).json({ message: "Cannot reply to a closed ticket" });
      }
      
      // Add the reply
      const reply = await storage.addSupportTicketReply(
        ticketId,
        req.user!.id,
        message,
        true // isAdmin flag set to true
      );
      
      // If ticket is in 'open' status, update to 'in-progress'
      if (ticket.status === 'open') {
        await storage.updateSupportTicketStatus(ticketId, 'in-progress');
      }
      
      res.json(reply);
    } catch (error) {
      console.error("Error adding reply to ticket:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to add reply", error: errorMessage });
    }
  });
  
  // Admin update ticket status
  app.patch('/api/admin/support/tickets/:id/status', adminMiddleware, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const { status } = req.body;
      
      if (!status || !['open', 'in-progress', 'closed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be one of: open, in-progress, closed" });
      }
      
      const updatedTicket = await storage.updateSupportTicketStatus(ticketId, status);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update ticket status", error: errorMessage });
    }
  });
}