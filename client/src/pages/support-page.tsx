import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layouts/main-layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Redirect } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  MessageSquare, 
  Send, 
  Plus, 
  Clock, 
  CheckCircle, 
  HelpCircle, 
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Type for support ticket
interface Ticket {
  id: number;
  userId: number;
  username: string;
  subject: string;
  status: string; // 'open' | 'in-progress' | 'closed'
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// Type for ticket message
interface Message {
  id: number;
  userId: number;
  username: string;
  message: string;
  isAdmin: boolean;
  timestamp: string;
}

function SupportPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Fetch user's tickets
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['/api/support/tickets'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/support/tickets');
      return await res.json();
    }
  });

  // Create new ticket mutation
  const createTicket = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const res = await apiRequest('POST', '/api/support/tickets', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ticket Created',
        description: 'Your support ticket has been submitted successfully.',
      });
      setNewTicketOpen(false);
      setSubject('');
      setMessage('');
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create ticket: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Reply to ticket mutation
  const replyTicket = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number; message: string }) => {
      const res = await apiRequest('POST', `/api/support/tickets/${ticketId}/reply`, { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reply Sent',
        description: 'Your reply has been added to the ticket',
      });
      setReply('');
      refetch();
      // Refresh ticket details
      if (selectedTicket) {
        viewTicketDetails(selectedTicket.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to send reply: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Close ticket mutation
  const closeTicket = useMutation({
    mutationFn: async (ticketId: number) => {
      const res = await apiRequest('PATCH', `/api/support/tickets/${ticketId}/close`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ticket Closed',
        description: 'The support ticket has been closed',
      });
      refetch();
      // Update selected ticket
      if (selectedTicket) {
        viewTicketDetails(selectedTicket.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to close ticket: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // View ticket details
  const viewTicketDetails = async (ticketId: number) => {
    try {
      const res = await apiRequest('GET', `/api/support/tickets/${ticketId}`);
      const data = await res.json();
      setSelectedTicket(data);
      setTicketDetailsOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load ticket details',
        variant: 'destructive',
      });
    }
  };

  // Handle new ticket submission
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both subject and message',
        variant: 'destructive',
      });
      return;
    }
    createTicket.mutate({ subject, message });
  };

  // Handle reply submission
  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) {
      return;
    }
    replyTicket.mutate({ ticketId: selectedTicket.id, message: reply });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Open</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">In Progress</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground">Get help with your account or game issues</p>
        </div>
        <Button onClick={() => setNewTicketOpen(true)} className="gap-2">
          <Plus size={16} />
          <span>New Ticket</span>
        </Button>
      </div>

      {/* Ticket List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Your Support Tickets
          </CardTitle>
          <CardDescription>
            View and manage your support conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket: Ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{formatDate(ticket.updatedAt)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => viewTicketDetails(ticket.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-lg font-medium">No Support Tickets</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                You haven't created any support tickets yet
              </p>
              <Button onClick={() => setNewTicketOpen(true)}>Create Your First Ticket</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue in detail and our team will help you resolve it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Please provide details about your issue..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewTicketOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Ticket #{selectedTicket.id}: {selectedTicket.subject}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </DialogTitle>
                <DialogDescription>
                  Created on {formatDate(selectedTicket.createdAt)}
                </DialogDescription>
              </DialogHeader>
              
              {/* Messages */}
              <div className="py-4 space-y-4">
                {selectedTicket.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-3 rounded-lg ${
                      msg.isAdmin 
                        ? 'bg-primary/10 ml-8' 
                        : 'bg-muted/50 mr-8'
                    }`}
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        {msg.isAdmin ? 'Support Team' : msg.username}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
              
              {/* Reply form */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleReply} className="border-t pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reply">Your Reply</Label>
                      <Textarea
                        id="reply"
                        placeholder="Type your message here..."
                        rows={3}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-4">
                    {(
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => closeTicket.mutate(selectedTicket.id)}
                        disabled={closeTicket.isPending}
                      >
                        {closeTicket.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Close Ticket
                      </Button>
                    )}
                    <Button type="submit" disabled={!reply.trim() || replyTicket.isPending}>
                      {replyTicket.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="border-t pt-4 text-center py-3">
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 mb-2">
                    This ticket is closed
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    You cannot respond to this ticket as it has been closed.
                    Create a new ticket if you need further assistance.
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SupportPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <MainLayout>
      <SupportPageContent />
    </MainLayout>
  );
}