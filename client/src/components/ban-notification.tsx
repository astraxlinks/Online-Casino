import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { banAppealSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

type BanStatus = {
  isBanned: boolean;
  banReason?: string;
  bannedAt?: string;
  appeal?: {
    id: number;
    status: string;
    reason: string;
    adminResponse?: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export function BanNotification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appealReason, setAppealReason] = useState("");
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Query to check if user is banned
  const { data: banStatus, isLoading } = useQuery<BanStatus>({
    queryKey: ["/api/user/ban-status"],
    queryFn: async () => {
      if (!user) return { isBanned: false };
      const response = await apiRequest("GET", "/api/user/ban-status");
      return await response.json();
    },
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Mutation to submit ban appeal
  const appealMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", "/api/user/ban-appeal", { reason });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/ban-status"] });
      setAppealSubmitted(true);
      setShowAppealForm(false);
      toast({
        title: "Appeal Submitted",
        description: "Your ban appeal has been submitted and will be reviewed by an administrator.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Appeal Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle appeal submission
  const handleSubmitAppeal = () => {
    try {
      // Validate appeal reason
      banAppealSchema.parse({ reason: appealReason });
      appealMutation.mutate(appealReason);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Appeal",
          description: "Please provide a detailed reason for your appeal (10-500 characters).",
          variant: "destructive",
        });
      }
    }
  };

  // If user is not banned or data is loading, don't show anything
  if (isLoading || !banStatus || !banStatus.isBanned) {
    return null;
  }

  // User has an existing appeal
  if (banStatus.appeal) {
    const { appeal } = banStatus;
    
    return (
      <AlertDialog open={true}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Account Banned
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-medium">Your account has been banned.</p>
              <p><strong>Reason:</strong> {banStatus.banReason || "Violation of terms of service"}</p>
              <p><strong>Banned on:</strong> {new Date(banStatus.bannedAt!).toLocaleString()}</p>
              <div className="mt-4 p-3 border rounded bg-muted">
                <p className="font-medium mb-2">Ban Appeal Status: {appeal.status.toUpperCase()}</p>
                <p><strong>Submitted:</strong> {new Date(appeal.createdAt).toLocaleString()}</p>
                {appeal.status === 'approved' && (
                  <p className="text-green-600 font-medium mt-2">
                    Your appeal has been approved! The ban will be lifted shortly.
                  </p>
                )}
                {appeal.status === 'rejected' && appeal.adminResponse && (
                  <div className="mt-2">
                    <p className="font-medium text-red-600">Your appeal was rejected.</p>
                    <p><strong>Admin Response:</strong> {appeal.adminResponse}</p>
                  </div>
                )}
                {appeal.status === 'pending' && (
                  <p className="text-amber-600 font-medium mt-2">
                    Your appeal is currently under review by our moderation team.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Removed the "Understood" button to make the notification unremovable */}
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // User is banned but hasn't submitted an appeal yet
  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Account Banned
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="font-medium">Your account has been banned.</p>
            <p><strong>Reason:</strong> {banStatus.banReason || "Violation of terms of service"}</p>
            <p><strong>Banned on:</strong> {new Date(banStatus.bannedAt!).toLocaleString()}</p>
            
            {!appealSubmitted && !showAppealForm && (
              <div className="mt-4">
                <p>If you believe this was a mistake, you can submit an appeal for review.</p>
                <Button 
                  variant="outline" 
                  className="mt-2" 
                  onClick={() => setShowAppealForm(true)}
                >
                  Submit Appeal
                </Button>
              </div>
            )}
            
            {showAppealForm && (
              <div className="mt-4 space-y-3">
                <p className="font-medium">Please explain why you believe this ban should be removed:</p>
                <Textarea
                  placeholder="Provide details about why you think this ban was a mistake..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center space-x-2 pt-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleSubmitAppeal}
                    disabled={appealMutation.isPending}
                  >
                    {appealMutation.isPending ? "Submitting..." : "Submit Appeal"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAppealForm(false)}
                    disabled={appealMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {appealSubmitted && (
              <div className="mt-4 p-3 border rounded bg-green-50 text-green-700">
                <p className="font-medium">Your appeal has been submitted!</p>
                <p>Our moderation team will review your appeal and make a decision soon.</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Removed the "Understood" button to make the notification unremovable */}
      </AlertDialogContent>
    </AlertDialog>
  );
}