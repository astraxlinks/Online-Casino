import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Redirect, useLocation } from 'wouter';
import MainLayout from '@/components/layouts/main-layout';
import {
  Card as UICard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Search, 
  UserCog, 
  CoinsIcon, 
  History, 
  Ban, 
  BadgeCheck, 
  ShieldAlert, 
  Info, 
  Coins, 
  RefreshCw,
  Gift,
  Megaphone,
  Settings,
  LifeBuoy,
  Crown,
  MessagesSquare,
  BarChart3,
  Activity,
  Users,
  Key,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/game-utils';

// Define types for ban appeals
type BanAppeal = {
  id: number;
  userId: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  adminId?: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
  };
};

// Component for the users tab
function UsersTab() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  
  // Fetch users data
  const {
    data: usersData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/users', page],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users?page=${page}&limit=10`);
      return await res.json();
    }
  });
  
  // Search users
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['/api/admin/users/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { users: [] };
      const res = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
      return await res.json();
    },
    enabled: searchTerm.length >= 2
  });
  
  // Update admin status mutation
  const updateAdminStatus = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number, isAdmin: boolean }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}/admin-status`, { isAdmin });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User admin status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      setIsAdminDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update admin status: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Ban/unban user mutation
  const updateBanStatus = useMutation({
    mutationFn: async ({ userId, isBanned, banReason }: { userId: number, isBanned: boolean, banReason?: string }) => {
      // For banning, use POST to /api/admin/users/:userId/ban with banReason
      // For unbanning, use POST to /api/admin/users/:userId/unban
      if (isBanned) {
        const res = await apiRequest('POST', `/api/admin/users/${userId}/unban`);
        return await res.json();
      } else {
        // When banning, require a reason
        if (!banReason || banReason.trim().length < 3) {
          throw new Error('Ban reason is required and must be at least 3 characters');
        }
        // Send just the banReason (not the userId, as it's in the URL)
        const res = await apiRequest('POST', `/api/admin/users/${userId}/ban`, { 
          banReason: banReason 
        });
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User ban status updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/search'] });
      setIsBanDialogOpen(false);
      setBanReason(''); // Reset the ban reason
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update ban status: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.length >= 2) {
      refetchSearch();
    }
  };
  
  // Handle user details view
  const handleViewUserDetails = (user: any) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };
  
  // Handle ban dialog
  const handleBanAction = (user: any) => {
    setSelectedUser(user);
    setIsBanDialogOpen(true);
  };
  
  // Handle admin status dialog
  const handleAdminAction = (user: any) => {
    setSelectedUser(user);
    setIsAdminDialogOpen(true);
  };
  
  // Pagination controls
  const handleNextPage = () => {
    if (usersData && page < usersData.pagination.totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  // Users to render (search results or paginated list)
  const usersToRender = searchTerm.length >= 2 && searchResults
    ? searchResults.users
    : usersData?.users || [];
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading users: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username..."
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || searchTerm.length < 2}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersToRender.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                usersToRender.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      {user.username}
                      {user.isOwner && (
                        <Badge className="ml-2 bg-purple-600">Owner</Badge>
                      )}
                      {user.isAdmin && !user.isOwner && (
                        <Badge className="ml-2 bg-blue-600">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(user.balance)}</TableCell>
                    <TableCell>
                      {user.isBanned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUserDetails(user)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        
                        {!user.isOwner && (
                          <Button
                            variant={user.isBanned ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => handleBanAction(user)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Only owner can manage admin privileges */}
                        {!user.isOwner && currentUser?.isOwner && (
                          <Button
                            variant={user.isAdmin ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAdminAction(user)}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Only show pagination for regular listing, not search results */}
          {searchTerm.length < 2 && usersData && usersData.pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing page {page} of {usersData.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= usersData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID</Label>
                  <div className="font-mono">{selectedUser.id}</div>
                </div>
                <div>
                  <Label>Username</Label>
                  <div className="font-semibold">{selectedUser.username}</div>
                </div>
                <div>
                  <Label>Balance</Label>
                  <div className="text-green-600 font-semibold">
                    {formatCurrency(selectedUser.balance)}
                  </div>
                </div>
                <div>
                  <Label>Play Count</Label>
                  <div>{selectedUser.playCount || 0} games</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>
                    {selectedUser.isOwner && (
                      <Badge className="mr-2 bg-purple-600">Owner</Badge>
                    )}
                    {selectedUser.isAdmin && !selectedUser.isOwner && (
                      <Badge className="mr-2 bg-blue-600">Admin</Badge>
                    )}
                    {selectedUser.isBanned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <div>{selectedUser.lastLogin 
                    ? new Date(selectedUser.lastLogin).toLocaleString() 
                    : 'Never'}</div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Ban/Unban Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isBanned ? 'Unban User' : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isBanned
                ? 'Are you sure you want to unban this user? They will regain access to the platform.'
                : 'Are you sure you want to ban this user? They will lose access to the platform.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="font-semibold">{selectedUser.username}</div>
              </div>
              
              {/* Show ban reason input only when banning (not unbanning) */}
              {!selectedUser.isBanned && (
                <div>
                  <Label htmlFor="banReason" className="text-sm font-medium">
                    Ban Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="banReason"
                    placeholder="Please provide a reason for banning this user..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                  {updateBanStatus.error && banReason.trim().length < 3 && (
                    <p className="text-sm text-red-500 mt-1">
                      Ban reason is required and must be at least 3 characters
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsBanDialogOpen(false);
                    setBanReason(''); // Reset the ban reason when closing
                  }}
                  disabled={updateBanStatus.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant={selectedUser.isBanned ? "default" : "destructive"}
                  onClick={() => updateBanStatus.mutate({
                    userId: selectedUser.id,
                    isBanned: selectedUser.isBanned,
                    banReason: banReason
                  })}
                  disabled={updateBanStatus.isPending || (!selectedUser.isBanned && banReason.trim().length < 3)}
                >
                  {updateBanStatus.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedUser.isBanned ? 'Unban User' : 'Ban User'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Admin Status Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.isAdmin ? 'Remove Admin' : 'Make Admin'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isAdmin
                ? 'Are you sure you want to remove admin privileges from this user?'
                : 'Are you sure you want to grant admin privileges to this user?'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="font-semibold">{selectedUser.username}</div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAdminDialogOpen(false)}
                  disabled={updateAdminStatus.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={() => updateAdminStatus.mutate({
                    userId: selectedUser.id,
                    isAdmin: !selectedUser.isAdmin
                  })}
                  disabled={updateAdminStatus.isPending}
                >
                  {updateAdminStatus.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedUser.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for the coins tab
function CoinsTab() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [coinAmount, setCoinAmount] = useState<string>('100');
  const [reason, setReason] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  
  // Search user by username for coin adjustment
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['/api/admin/users/search', username],
    queryFn: async () => {
      if (!username || username.length < 2) return { users: [] };
      const res = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(username)}`);
      return await res.json();
    },
    enabled: username.length >= 2
  });
  
  // Coin transactions history
  const {
    data: transactionsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/coin-transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/coin-transactions?limit=20`);
      return await res.json();
    }
  });
  
  // Adjust user balance mutation
  const adjustBalance = useMutation({
    mutationFn: async ({ 
      userId, 
      amount, 
      reason 
    }: { 
      userId: number, 
      amount: number, 
      reason: string 
    }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/adjust-balance`, {
        amount,
        reason
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'User balance adjusted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coin-transactions'] });
      setIsAdjustDialogOpen(false);
      setCoinAmount('100');
      setReason('');
      setUsername('');
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to adjust balance: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length >= 2) {
      refetchSearch();
    }
  };
  
  // Select user for coin adjustment
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
  };
  
  // Open coin adjustment dialog
  const handleAdjustCoins = () => {
    if (selectedUser) {
      setIsAdjustDialogOpen(true);
    } else {
      toast({
        title: 'Error',
        description: 'Please select a user first',
        variant: 'destructive',
      });
    }
  };
  
  // Handle form submission for coin adjustment
  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }
    
    if (!coinAmount || isNaN(Number(coinAmount))) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason',
        variant: 'destructive',
      });
      return;
    }
    
    adjustBalance.mutate({
      userId: selectedUser.id,
      amount: Number(coinAmount),
      reason: reason.trim()
    });
  };
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading transactions: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <UICard>
          <CardHeader>
            <CardTitle>Adjust User Balance</CardTitle>
            <CardDescription>
              Add or remove coins from a user's account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <form onSubmit={handleSearch} className="flex gap-2 mt-1">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Search by username..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching || username.length < 2}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </form>
                
                {username.length >= 2 && searchResults && searchResults.users && searchResults.users.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                    {searchResults.users.map((user: any) => (
                      <div
                        key={user.id}
                        className={`p-2 cursor-pointer hover:bg-muted flex justify-between items-center ${
                          selectedUser?.id === user.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleSelectUser(user)}
                      >
                        <div>
                          <span className="font-medium">{user.username}</span>
                          {user.isOwner && <Badge className="ml-2 bg-purple-600">Owner</Badge>}
                          {user.isAdmin && !user.isOwner && <Badge className="ml-2 bg-blue-600">Admin</Badge>}
                        </div>
                        <span className="text-green-600">{formatCurrency(user.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {username.length >= 2 && searchResults && searchResults.users && searchResults.users.length === 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No users found with that username
                  </div>
                )}
                
                {selectedUser && (
                  <div className="mt-4 p-3 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Selected User:</span> {selectedUser.username}
                      </div>
                      <span className="text-green-600 font-semibold">{formatCurrency(selectedUser.balance)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={handleAdjustCoins}
                  disabled={!selectedUser}
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Adjust Balance
                </Button>
              </div>
            </div>
          </CardContent>
        </UICard>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Recent Coin Transactions</h3>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!transactionsData || !transactionsData.transactions || transactionsData.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactionsData.transactions.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>{transaction.userId}</TableCell>
                    <TableCell className={
                      transaction.amount > 0 
                        ? "text-green-600 font-medium" 
                        : "text-red-600 font-medium"
                    }>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{transaction.adminId}</TableCell>
                    <TableCell>{transaction.reason}</TableCell>
                    <TableCell>{new Date(transaction.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Adjust Balance Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Balance</DialogTitle>
            <DialogDescription>
              Add or remove coins from {selectedUser?.username}'s account. Use positive numbers to add coins and negative numbers to remove coins.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitAdjustment} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="relative mt-1">
                <Input
                  id="amount"
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  className="pl-8"
                  placeholder="Enter amount..."
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-muted-foreground">$</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Use negative value (e.g. -100) to remove coins
              </p>
            </div>
            
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for this adjustment..."
                className="mt-1"
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAdjustDialogOpen(false)}
                disabled={adjustBalance.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustBalance.isPending}
              >
                {adjustBalance.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for bonuses tab
function BonusesTab() {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("100");
  const [reason, setReason] = useState<string>("Welcome Bonus");
  const [targetType, setTargetType] = useState<string>("all");
  const [minPlayCount, setMinPlayCount] = useState<string>("0");
  const [maxPlayCount, setMaxPlayCount] = useState<string>("1000");
  
  // Send mass bonus mutation
  const sendBonus = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/mass-bonus", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bonus Sent",
        description: `Successfully sent ${data.results.success} of ${data.results.totalUsers} bonus payments`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send bonus: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      amount: parseFloat(amount),
      reason,
      message: reason, // Server expects a message field according to adminMassBonusSchema
      targetType,
      filters: {
        minPlayCount: parseInt(minPlayCount),
        maxPlayCount: parseInt(maxPlayCount),
      }
    };
    
    sendBonus.mutate(data);
  };
  
  return (
    <div>
      <UICard>
        <CardHeader>
          <CardTitle>Send Mass Bonus</CardTitle>
          <CardDescription>
            Send coins to multiple users at once based on criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Bonus Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="w-full"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Users will see this as the reason for receiving coins
                </p>
              </div>
              
              <div>
                <Label htmlFor="targetType">Target Users</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="new">New Users (less than 10 games)</SelectItem>
                    <SelectItem value="active">Active Users (10-100 games)</SelectItem>
                    <SelectItem value="veteran">Veteran Users (over 100 games)</SelectItem>
                    <SelectItem value="custom">Custom Filter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {targetType === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPlayCount">Min Play Count</Label>
                    <Input
                      id="minPlayCount"
                      type="number"
                      value={minPlayCount}
                      onChange={(e) => setMinPlayCount(e.target.value)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPlayCount">Max Play Count</Label>
                    <Input
                      id="maxPlayCount"
                      type="number"
                      value={maxPlayCount}
                      onChange={(e) => setMaxPlayCount(e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={sendBonus.isPending}
            >
              {sendBonus.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Send Bonus
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </UICard>
    </div>
  );
}

// Component for announcements tab
function AnnouncementsTab() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>("60"); // Default 60 seconds
  const [type, setType] = useState<string>("info"); // Default type
  
  // Fetch announcements
  const {
    data: announcements,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/announcements'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/announcements?includeExpired=true');
      return await res.json();
    }
  });
  
  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/announcements", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement Created",
        description: "Your announcement has been created successfully",
      });
      setIsCreateDialogOpen(false);
      refetch();
      
      // Reset form
      setTitle("");
      setMessage("");
      setIsPinned(false);
      setDuration("60");
      setType("info");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create announcement: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: number) => {
      // The server returns 204 No Content on success, which has no body to parse
      await apiRequest("DELETE", `/api/admin/announcements/${id}`);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Announcement Deleted",
        description: "Announcement has been deleted successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete announcement: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      title,
      message,
      isPinned,
      duration: parseInt(duration),
      type
    };
    
    createAnnouncement.mutate(data);
  };
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading announcements: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Announcements</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Megaphone className="mr-2 h-4 w-4" />
          Create Announcement
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements?.announcements && announcements.announcements.length === 0 ? (
            <div className="col-span-2 text-center p-12 border rounded-lg">
              <p className="text-muted-foreground">No announcements yet</p>
            </div>
          ) : (
            announcements?.announcements && announcements.announcements.map((announcement: any) => (
              <UICard key={announcement.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>
                        {new Date(announcement.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    {announcement.isPinned && (
                      <Badge className="h-6">Pinned</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{announcement.message}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    {announcement.expiresAt ? (
                      <>Expires: {new Date(announcement.expiresAt).toLocaleString()}</>
                    ) : (
                      <>Never expires</>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAnnouncement.mutate(announcement.id)}
                    disabled={deleteAnnouncement.isPending}
                  >
                    {deleteAnnouncement.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </Button>
                </CardFooter>
              </UICard>
            ))
          )}
        </div>
      )}
      
      {/* Create Announcement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement for all users. Announcements appear on the site banner.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-24"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="type">Announcement Type</Label>
                <Select
                  value={type}
                  onValueChange={setType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPinned">Pin to top</Label>
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Select
                  value={duration}
                  onValueChange={setDuration}
                  disabled={isPinned}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60 seconds</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="180">3 minutes</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPinned ? "Pinned announcements don't expire" : "How long this announcement will be visible (5-300 seconds)"}
                </p>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAnnouncement.isPending}
              >
                {createAnnouncement.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for game configuration tab
function GameConfigTab() {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string>("slots");
  const [gameConfig, setGameConfig] = useState<any>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Fetch game config
  const {
    data: config,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/game-config', selectedGame],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/game-config/${selectedGame}`);
      return await res.json();
    }
  });
  
  // Update game config mutation
  const updateConfig = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/game-config`, {
        gameType: selectedGame,
        config: data
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: `${selectedGame} configuration has been updated successfully`,
      });
      setIsEditing(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update configuration: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update local state when game selection changes
  useEffect(() => {
    if (config?.config) {
      setGameConfig(config.config);
    }
  }, [config]);
  
  const handleInputChange = (key: string, value: any) => {
    setGameConfig((prev: any) => ({
      ...prev,
      [key]: typeof prev[key] === 'number' ? parseFloat(value) : value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig.mutate(gameConfig);
  };
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading game configuration: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">Game Configuration</h2>
        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slots">Slots</SelectItem>
            <SelectItem value="dice">Dice</SelectItem>
            <SelectItem value="crash">Crash</SelectItem>
            <SelectItem value="roulette">Roulette</SelectItem>
            <SelectItem value="blackjack">Blackjack</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <UICard>
          <CardHeader>
            <CardTitle>
              {selectedGame.charAt(0).toUpperCase() + selectedGame.slice(1)} Settings
            </CardTitle>
            <CardDescription>
              Configure game parameters and odds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <div className="space-y-4">
                {gameConfig && Object.entries(gameConfig).map(([key, value]: [string, any]) => (
                  <div key={key} className="grid grid-cols-2">
                    <div className="font-medium">{key}</div>
                    <div>{value.toString()}</div>
                  </div>
                ))}
                
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-4"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Configuration
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {gameConfig && Object.entries(gameConfig).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      id={key}
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={gameConfig[key]}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      step={typeof value === 'number' ? 0.01 : undefined}
                    />
                  </div>
                ))}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      refetch(); // Reset to original values
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateConfig.isPending}
                  >
                    {updateConfig.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </UICard>
      )}
    </div>
  );
}

// Component for support tickets tab
function SupportTab() {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { user: currentUser } = useAuth();
  
  // Fetch support tickets
  const {
    data: ticketsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/support/tickets', statusFilter, page],
    queryFn: async () => {
      try {
        const status = statusFilter === 'all' ? '' : statusFilter;
        const res = await apiRequest('GET', `/api/admin/support/tickets?status=${status}&page=${page}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching tickets:", error);
        // Return a default structure with an empty tickets array rather than throwing
        return {
          tickets: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0
          }
        };
      }
    }
  });
  
  // Fetch single ticket details
  const {
    data: ticketDetails,
    isLoading: isLoadingTicket,
    refetch: refetchTicket
  } = useQuery({
    queryKey: ['/api/admin/support/tickets/details', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      try {
        const res = await apiRequest('GET', `/api/admin/support/tickets/${selectedTicket.id}`);
        return await res.json();
      } catch (error) {
        console.error("Error fetching ticket details:", error);
        // Return a default structure with the ticket data we already have and an empty messages array
        return {
          ...selectedTicket,
          messages: []
        };
      }
    },
    enabled: !!selectedTicket
  });
  
  // Add reply mutation
  const addReply = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number, message: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/tickets/${ticketId}/reply`, { message, isAdmin: true });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reply Sent",
        description: "Your reply has been added to the ticket",
      });
      setReplyMessage("");
      refetchTicket();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send reply: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update ticket status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number, status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/support/tickets/${ticketId}/status`, { status });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status Updated",
        description: `Ticket status has been updated to ${data.status}`,
      });
      if (selectedTicket) {
        setSelectedTicket({
          ...selectedTicket,
          status: data.status
        });
      }
      refetchTicket();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setIsTicketDialogOpen(true);
  };
  
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket) return;
    
    addReply.mutate({
      ticketId: selectedTicket.id,
      message: replyMessage
    });
  };
  
  const handleStatusChange = (status: string) => {
    if (!selectedTicket) return;
    
    updateStatus.mutate({
      ticketId: selectedTicket.id,
      status
    });
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Open</Badge>;
      case 'in-progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading support tickets: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Support Tickets</h2>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!ticketsData || ticketsData.tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                ticketsData.tickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell>{ticket.id}</TableCell>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell>{ticket.username}</TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {ticketsData && ticketsData.pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing page {page} of {ticketsData.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= ticketsData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Ticket Details Dialog */}
      <Dialog 
        open={isTicketDialogOpen} 
        onOpenChange={(open) => {
          setIsTicketDialogOpen(open);
          if (!open) {
            // Clear state when dialog is closed
            setReplyMessage("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl">
                      Ticket #{selectedTicket.id}: {selectedTicket.subject}
                    </DialogTitle>
                    <DialogDescription>
                      Submitted by {selectedTicket.username}
                    </DialogDescription>
                  </div>
                  <StatusBadge status={selectedTicket.status} />
                </div>
              </DialogHeader>
              
              {isLoadingTicket ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4 py-4">
                    {/* Message history */}
                    <div className="space-y-4">
                      {ticketDetails?.messages.map((message: any) => (
                        <div 
                          key={message.id}
                          className={`p-4 rounded-lg ${
                            message.isAdmin 
                              ? "bg-primary/10 ml-8" 
                              : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">
                              {message.username}
                              {message.isAdmin && (
                                <Badge className="ml-2 bg-blue-600">Admin</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(message.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <p className="whitespace-pre-line">{message.message}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Status controls */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="border-t pt-4">
                        <Label className="mb-2 block">Update Status</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.status !== 'in-progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange('in-progress')}
                              disabled={updateStatus.isPending}
                            >
                              Mark as In Progress
                            </Button>
                          )}
                          
                          {selectedTicket.status !== 'resolved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange('resolved')}
                              disabled={updateStatus.isPending}
                            >
                              Mark as Resolved
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('closed')}
                            disabled={updateStatus.isPending}
                          >
                            Close Ticket
                          </Button>
                          
                          {updateStatus.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Reply form */}
                    {selectedTicket.status !== 'closed' && (
                      <form onSubmit={handleSendReply} className="border-t pt-4">
                        <Label htmlFor="reply" className="mb-2 block">Reply</Label>
                        <Textarea
                          id="reply"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your reply here..."
                          className="w-full h-32 mb-4"
                          required
                        />
                        
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={addReply.isPending || replyMessage.trim() === ''}
                          >
                            {addReply.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              "Send Reply"
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for the subscriptions tab
function SubscriptionsTab() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('bronze');
  const [durationMonths, setDurationMonths] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [removeReason, setRemoveReason] = useState<string>('');
  const [showRemoveDialog, setShowRemoveDialog] = useState<boolean>(false);
  
  // Search users
  const searchUsers = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (username.length >= 2) {
      setIsSearching(true);
      try {
        const res = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(username)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to search users: ${(error as Error).message}`,
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    }
  };
  
  // Select user from search results
  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    setUsername(user.username);
    setSearchResults(null);
    
    // Fetch user's subscription status
    try {
      const res = await apiRequest('GET', `/api/admin/users/${user.id}/subscription`);
      const data = await res.json();
      setUserSubscription(data.subscription);
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setUserSubscription(null);
    }
  };
  
  // Subscribe mutation
  const assignSubscription = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected');
      
      const payload = {
        userId: selectedUser.id,
        tier: subscriptionTier,
        durationMonths: parseInt(durationMonths),
        reason
      };
      
      const res = await apiRequest('POST', '/api/admin/subscriptions/assign', payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Subscription assigned to ${selectedUser?.username} successfully`,
      });
      
      // Reset form
      setSelectedUser(null);
      setUsername('');
      setSubscriptionTier('bronze');
      setDurationMonths('1');
      setReason('');
      setUserSubscription(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to assign subscription: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Remove subscription mutation
  const removeSubscription = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error('No user selected');
      
      const res = await apiRequest(
        'DELETE', 
        `/api/admin/users/${selectedUser.id}/subscription`, 
        { reason: removeReason }
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Subscription removed from ${selectedUser?.username} successfully`,
      });
      
      // Reset form and dialog
      setShowRemoveDialog(false);
      setRemoveReason('');
      setUserSubscription(null);
      
      // Update user's subscription status
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          subscriptionTier: null
        });
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to remove subscription: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    assignSubscription.mutate();
  };
  
  // Handle remove subscription
  const handleRemoveSubscription = () => {
    removeSubscription.mutate();
  };
  
  // Only owner can assign subscriptions
  if (!currentUser?.isOwner) {
    return (
      <div className="text-center p-12 text-muted-foreground">
        <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Owner-Only Feature</h3>
        <p>Only the site owner can assign subscriptions to users.</p>
      </div>
    );
  }
  
  return (
    <div className="grid gap-8">
      <UICard>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2 text-primary" />
            Manage User Subscriptions
          </CardTitle>
          <CardDescription>
            Search for a user to manage their subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchUsername">Username</Label>
              <div className="flex gap-2">
                <Input 
                  id="searchUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Search by username"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && username.length >= 2 && !isSearching) {
                      e.preventDefault();
                      searchUsers();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={searchUsers}
                  disabled={isSearching || username.length < 2}
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              
              {username.length >= 2 && searchResults && searchResults.users && searchResults.users.length > 0 && (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  <div className="p-1">
                    {searchResults.users.map((user: any) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-accent rounded-sm cursor-pointer flex items-center justify-between"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                          </div>
                        </div>
                        {user.subscriptionTier && (
                          <Badge className="ml-2 capitalize">
                            {user.subscriptionTier}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {selectedUser && (
              <div className="border rounded-md p-4 bg-muted/30 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium">{selectedUser.username}</h3>
                    <p className="text-sm text-muted-foreground">User ID: {selectedUser.id}</p>
                  </div>
                  {selectedUser.subscriptionTier ? (
                    <Badge className="capitalize text-sm">{selectedUser.subscriptionTier}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm">No subscription</Badge>
                  )}
                </div>
                
                {userSubscription ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <Badge variant={userSubscription.status === 'active' ? 'default' : 'outline'}>
                          {userSubscription.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Start date:</span>{" "}
                        {new Date(userSubscription.startDate).toLocaleDateString()}
                      </div>
                      {userSubscription.endDate && (
                        <div>
                          <span className="text-muted-foreground">End date:</span>{" "}
                          {new Date(userSubscription.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          Remove Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Subscription</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove the {userSubscription.tier} subscription from {selectedUser.username}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="removeReason">Reason (optional)</Label>
                            <Textarea 
                              id="removeReason"
                              value={removeReason}
                              onChange={(e) => setRemoveReason(e.target.value)}
                              placeholder="Enter reason for subscription removal"
                              className="resize-none"
                            />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleRemoveSubscription}
                            disabled={removeSubscription.isPending}
                          >
                            {removeSubscription.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              'Remove Subscription'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">This user doesn't have an active subscription</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </UICard>
      
      {selectedUser && (
        <UICard>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="h-5 w-5 mr-2 text-primary" />
              Assign Subscription
            </CardTitle>
            <CardDescription>
              Grant a subscription tier to {selectedUser.username} for a specified duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                  <Select 
                    defaultValue={subscriptionTier} 
                    onValueChange={setSubscriptionTier}
                    disabled={assignSubscription.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Duration (months)</Label>
                  <Select 
                    defaultValue={durationMonths} 
                    onValueChange={setDurationMonths}
                    disabled={assignSubscription.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea 
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for subscription assignment"
                  className="resize-none"
                  disabled={assignSubscription.isPending}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={!selectedUser || assignSubscription.isPending}
              >
                {assignSubscription.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning Subscription...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Assign Subscription
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </UICard>
      )}
    </div>
  );
}

// Component for the analytics tab
function AnalyticsTab() {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState('today');
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#747474'];
  
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/analytics', timeframe],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/analytics?timeframe=${timeframe}`);
      return await res.json();
    }
  });
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading analytics: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <UICard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-500 mr-2" />
                  <div className="text-2xl font-bold">{analyticsData?.activeUsers || 0}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {analyticsData?.totalUsers || 0} total users
                </p>
              </CardContent>
            </UICard>
            
            <UICard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Coins Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <CoinsIcon className="h-5 w-5 text-amber-500 mr-2" />
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData?.coinsSpent || 0)}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  In {timeframe === 'today' ? 'the last 24 hours' : timeframe}
                </p>
              </CardContent>
            </UICard>
            
            <UICard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Coins Earned by Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Coins className="h-5 w-5 text-green-500 mr-2" />
                  <div className="text-2xl font-bold">{formatCurrency(analyticsData?.coinsEarned || 0)}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Payout ratio: {analyticsData?.coinsSpent && analyticsData?.coinsEarned ? 
                    `${((analyticsData.coinsEarned / analyticsData.coinsSpent) * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </CardContent>
            </UICard>
            
            <UICard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Most Popular Game</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-purple-500 mr-2" />
                  <div className="text-2xl font-bold capitalize">
                    {analyticsData?.mostPlayedGame?.gameType || 'N/A'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analyticsData?.mostPlayedGame?.count || 0} plays
                </p>
              </CardContent>
            </UICard>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Game Distribution Chart */}
            <UICard className="col-span-1">
              <CardHeader>
                <CardTitle>Game Distribution</CardTitle>
                <CardDescription>Popularity of different games</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {analyticsData?.gameDistribution && analyticsData.gameDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.gameDistribution}
                        dataKey="count"
                        nameKey="gameType"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        label={({ gameType, percent }) => `${gameType}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.gameDistribution.map((entry: {gameType: string, count: number}, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No game data available</p>
                  </div>
                )}
              </CardContent>
            </UICard>
            
            {/* Subscription Stats */}
            <UICard className="col-span-1">
              <CardHeader>
                <CardTitle>Subscription Tiers</CardTitle>
                <CardDescription>Distribution of subscription tiers</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {analyticsData?.subscriptionStats && analyticsData.subscriptionStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.subscriptionStats}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tier" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Users" fill="#8884d8">
                        {analyticsData.subscriptionStats.map((entry: {tier: string, count: number}, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No subscription data available</p>
                  </div>
                )}
              </CardContent>
            </UICard>
            
            {/* Daily New Users */}
            <UICard className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>New User Registrations</CardTitle>
                <CardDescription>Daily new user counts for the past 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {analyticsData?.dailyNewUsers && analyticsData.dailyNewUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analyticsData.dailyNewUsers}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Area type="monotone" dataKey="count" name="New Users" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No user registration data available</p>
                  </div>
                )}
              </CardContent>
            </UICard>
            
            {/* Daily Transactions */}
            <UICard className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Daily Betting Activity</CardTitle>
                <CardDescription>Bets and wins for the past 30 days</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {analyticsData?.dailyTransactions && analyticsData.dailyTransactions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analyticsData.dailyTransactions}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Legend />
                      <Bar dataKey="bets" name="Total Bets" fill="#0088FE" />
                      <Bar dataKey="wins" name="Wins" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No transaction data available</p>
                  </div>
                )}
              </CardContent>
            </UICard>
          </div>
        </>
      )}
    </div>
  );
}

function BanAppealsTab() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  
  // Fetch ban appeals data
  const {
    data: appealsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/ban-appeals', statusFilter, page],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }
      queryParams.append('page', page.toString());
      
      const res = await apiRequest('GET', `/api/admin/ban-appeals?${queryParams.toString()}`);
      return await res.json();
    }
  });
  
  // Respond to appeal mutation
  const respondToAppeal = useMutation({
    mutationFn: async ({ appealId, status, response }: { appealId: number, status: string, response: string }) => {
      const res = await apiRequest('POST', `/api/admin/ban-appeals/${appealId}/respond`, {
        status,
        response
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Response to ban appeal submitted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ban-appeals'] });
      setIsResponseDialogOpen(false);
      setResponseText('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to respond to appeal: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle opening response dialog
  const handleOpenResponseDialog = (appeal: BanAppeal) => {
    setSelectedAppeal(appeal);
    setIsResponseDialogOpen(true);
  };
  
  // Handle response submission
  const handleSubmitResponse = (status: 'approved' | 'rejected') => {
    if (!selectedAppeal) return;
    
    if (responseText.trim().length < 10) {
      toast({
        title: 'Error',
        description: 'Please provide a detailed response (minimum 10 characters)',
        variant: 'destructive',
      });
      return;
    }
    
    respondToAppeal.mutate({
      appealId: selectedAppeal.id,
      status,
      response: responseText
    });
  };
  
  // Pagination controls
  const handleNextPage = () => {
    if (appealsData && appealsData.pagination && page < appealsData.pagination.totalPages) {
      setPage(page + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  // Badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
  };
  
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading ban appeals: {(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ban Appeals</h2>
        
        <div className="flex gap-2 items-center">
          <Label htmlFor="status-filter" className="mr-2">
            Status:
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1); // Reset to first page when filter changes
            }}
          >
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appealsData?.appeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No ban appeals found
                  </TableCell>
                </TableRow>
              ) : (
                appealsData?.appeals.map((appeal: BanAppeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell>{appeal.id}</TableCell>
                    <TableCell>
                      {appeal.user?.username || `User #${appeal.userId}`}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {appeal.reason}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(appeal.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(appeal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResponseDialog(appeal)}
                          disabled={appeal.status !== 'pending'}
                        >
                          <MessagesSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {appealsData && appealsData.pagination && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing page {page} of {appealsData.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= appealsData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Appeal Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Ban Appeal</DialogTitle>
            <DialogDescription>
              Review the appeal and provide a response to the user.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppeal && (
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <div className="font-semibold">
                  {selectedAppeal.user?.username || `User #${selectedAppeal.userId}`}
                </div>
              </div>
              
              <div>
                <Label>Appeal</Label>
                <div className="p-3 bg-muted rounded-md mt-1">
                  {selectedAppeal.reason}
                </div>
              </div>
              
              <div>
                <Label htmlFor="response" className="text-sm font-medium">
                  Your Response <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="response"
                  placeholder="Provide a detailed response to the user's appeal..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="mt-1"
                  rows={5}
                />
                {respondToAppeal.error && responseText.trim().length < 10 && (
                  <p className="text-sm text-red-500 mt-1">
                    Response is required and must be at least 10 characters
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsResponseDialogOpen(false);
                    setResponseText('');
                  }}
                  disabled={respondToAppeal.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSubmitResponse('rejected')}
                  disabled={respondToAppeal.isPending || responseText.trim().length < 10}
                >
                  {respondToAppeal.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Reject Appeal
                </Button>
                <Button
                  variant="default"
                  onClick={() => handleSubmitResponse('approved')}
                  disabled={respondToAppeal.isPending || responseText.trim().length < 10}
                >
                  {respondToAppeal.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Approve & Unban
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component for the passwords tab
function PasswordsTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  // Search users
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['/api/admin/users/search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { users: [] };
      const res = await apiRequest('GET', `/api/admin/users/search?q=${encodeURIComponent(searchTerm)}`);
      return await res.json();
    },
    enabled: searchTerm.length >= 2
  });
  
  // Reset password mutation
  const resetPassword = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number, newPassword: string }) => {
      const res = await apiRequest('POST', `/api/admin/users/${userId}/reset-password`, { newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password has been reset successfully',
      });
      setIsResetDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to reset password: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.length >= 2) {
      refetchSearch();
    }
  };
  
  // Handle reset password dialog
  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setIsResetDialogOpen(true);
  };
  
  // Handle password reset form submission
  const handleSubmitPasswordReset = () => {
    if (!selectedUser) return;
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    
    resetPassword.mutate({
      userId: selectedUser.id,
      newPassword
    });
  };
  
  return (
    <div>
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username..."
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || searchTerm.length < 2}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      
      {isSearching ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!searchResults?.users || searchResults.users.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    {searchTerm.length >= 2 ? "No users found" : "Search for a user to reset their password"}
                  </TableCell>
                </TableRow>
              ) : (
                searchResults.users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      {user.username}
                      {user.isOwner && (
                        <Badge className="ml-2 bg-purple-600">Owner</Badge>
                      )}
                      {user.isAdmin && !user.isOwner && (
                        <Badge className="ml-2 bg-blue-600">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isBanned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(user)}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <div className="font-semibold">{selectedUser.username}</div>
              </div>
              
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Enter new password"
                />
                {newPassword && newPassword.length < 6 && (
                  <p className="text-sm text-red-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsResetDialogOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={resetPassword.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSubmitPasswordReset}
                  disabled={
                    resetPassword.isPending || 
                    !newPassword || 
                    newPassword.length < 6 || 
                    newPassword !== confirmPassword
                  }
                >
                  {resetPassword.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Access check - redirect if not admin
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  if (!user.isAdmin) {
    return <Redirect to="/" />;
  }
  
  // Check if user is an owner (used to restrict certain tabs)
  const isOwner = user.isOwner;
  
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, adjust balances, and monitor system activity
          </p>
          {!isOwner && (
            <p className="text-xs text-amber-500 mt-2">
              Some tabs are only accessible to owners
            </p>
          )}
        </div>
        
        <Tabs defaultValue="analytics" className="w-full">
          <div className="mb-6 overflow-x-auto pb-2">
            <TabsList className="w-auto inline-flex flex-nowrap">
              <TabsTrigger value="analytics" className="flex items-center whitespace-nowrap">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center whitespace-nowrap">
                <UserCog className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="coins" className="flex items-center whitespace-nowrap">
                  <CoinsIcon className="h-4 w-4 mr-2" />
                  Coins
                </TabsTrigger>
              )}
              <TabsTrigger value="transactions" className="flex items-center whitespace-nowrap">
                <History className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="bonuses" className="flex items-center whitespace-nowrap">
                  <Gift className="h-4 w-4 mr-2" />
                  Bonuses
                </TabsTrigger>
              )}
              <TabsTrigger value="announcements" className="flex items-center whitespace-nowrap">
                <Megaphone className="h-4 w-4 mr-2" />
                Announcements
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="gameconfig" className="flex items-center whitespace-nowrap">
                  <Settings className="h-4 w-4 mr-2" />
                  Game Config
                </TabsTrigger>
              )}
              <TabsTrigger value="support" className="flex items-center whitespace-nowrap">
                <LifeBuoy className="h-4 w-4 mr-2" />
                Support
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="subscriptions" className="flex items-center whitespace-nowrap">
                  <Crown className="h-4 w-4 mr-2" />
                  Subscriptions
                </TabsTrigger>
              )}
              <TabsTrigger value="ban-appeals" className="flex items-center whitespace-nowrap">
                <MessagesSquare className="h-4 w-4 mr-2" />
                Ban Appeals
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="passwords" className="flex items-center whitespace-nowrap">
                  <Lock className="h-4 w-4 mr-2" />
                  Passwords
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
          
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="coins">
              <CoinsTab />
            </TabsContent>
          )}
          
          <TabsContent value="transactions">
            <div className="text-center p-12 text-muted-foreground">
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p>Transaction management features will be available soon.</p>
            </div>
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="bonuses">
              <BonusesTab />
            </TabsContent>
          )}
          
          <TabsContent value="announcements">
            <AnnouncementsTab />
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="gameconfig">
              <GameConfigTab />
            </TabsContent>
          )}
          
          <TabsContent value="support">
            <SupportTab />
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="subscriptions">
              <SubscriptionsTab />
            </TabsContent>
          )}
          
          <TabsContent value="ban-appeals">
            <BanAppealsTab />
          </TabsContent>
          
          {isOwner && (
            <TabsContent value="passwords">
              <PasswordsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}