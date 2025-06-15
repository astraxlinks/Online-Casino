import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, InfoIcon, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export function AnnouncementBanner() {
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Fetch active announcements
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/announcements'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/announcements');
        return await res.json();
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
        return []; // Return empty array on error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Only retry once on failure
    retryDelay: 5000, // Wait 5 seconds before retrying
  });

  const announcements: Announcement[] = data || [];
  
  // If there are multiple announcements, rotate through them
  useEffect(() => {
    if (announcements.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 5000); // Rotate every 5 seconds
    
    return () => clearInterval(interval);
  }, [announcements.length]);

  // Reset dismissed state when announcements change
  useEffect(() => {
    setIsDismissed(false);
  }, [announcements]);

  // If no announcements or all dismissed, don't render anything
  if (isLoading || isDismissed || announcements.length === 0) return null;

  const activeAnnouncement = announcements[activeAnnouncementIndex];
  
  const getBgColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-700';
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 border-green-200 dark:border-green-700';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-50 to-amber-100 dark:from-yellow-900/40 dark:to-amber-800/40 border-yellow-200 dark:border-yellow-700';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 border-red-200 dark:border-red-700';
      default:
        return 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-blue-200 dark:border-blue-700';
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'warning':
        return 'text-amber-800 dark:text-amber-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 drop-shadow-md" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 drop-shadow-md" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 drop-shadow-md" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 drop-shadow-md" />;
      default:
        return <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 drop-shadow-md" />;
    }
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 120, damping: 14 }}
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
        >
          <div className={`w-full px-4 py-3 shadow-lg ${getBgColor(activeAnnouncement.type)} border-l-4 ${
            activeAnnouncement.type === 'info' ? 'border-blue-500 dark:border-blue-400' :
            activeAnnouncement.type === 'success' ? 'border-green-500 dark:border-green-400' :
            activeAnnouncement.type === 'warning' ? 'border-yellow-500 dark:border-yellow-400' :
            'border-red-500 dark:border-red-400'
          } bg-opacity-95 backdrop-blur-md`}>
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-grow">
                <div className={`flex-shrink-0 p-2.5 rounded-full shadow-sm ${
                  activeAnnouncement.type === 'info' ? 'bg-blue-200/50 dark:bg-blue-900/50' : 
                  activeAnnouncement.type === 'success' ? 'bg-green-200/50 dark:bg-green-900/50' : 
                  activeAnnouncement.type === 'warning' ? 'bg-yellow-200/50 dark:bg-yellow-900/50' : 
                  'bg-red-200/50 dark:bg-red-900/50'
                }`}>
                  {getIcon(activeAnnouncement.type)}
                </div>
                <div className="flex-grow">
                  <h3 className={`font-bold text-base ${getTextColor(activeAnnouncement.type)}`}>
                    {activeAnnouncement.title}
                  </h3>
                  <p className={`text-sm mt-0.5 font-medium opacity-90 ${getTextColor(activeAnnouncement.type)}`}>
                    {activeAnnouncement.message}
                  </p>
                </div>
                {announcements.length > 1 && (
                  <div className="flex items-center space-x-1.5 mr-4">
                    {announcements.map((_, index) => (
                      <span
                        key={index}
                        className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                          index === activeAnnouncementIndex 
                            ? `scale-110 ${
                                activeAnnouncement.type === 'info' ? 'bg-blue-500 dark:bg-blue-400' :
                                activeAnnouncement.type === 'success' ? 'bg-green-500 dark:bg-green-400' :
                                activeAnnouncement.type === 'warning' ? 'bg-yellow-500 dark:bg-yellow-400' :
                                'bg-red-500 dark:bg-red-400'
                              }`
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`p-0 h-8 w-8 rounded-full shadow-sm hover:shadow-md transition-all ${
                  activeAnnouncement.type === 'info' ? 'bg-blue-100/70 dark:bg-blue-800/30 hover:bg-blue-200/80 dark:hover:bg-blue-800/50' : 
                  activeAnnouncement.type === 'success' ? 'bg-green-100/70 dark:bg-green-800/30 hover:bg-green-200/80 dark:hover:bg-green-800/50' : 
                  activeAnnouncement.type === 'warning' ? 'bg-yellow-100/70 dark:bg-yellow-800/30 hover:bg-yellow-200/80 dark:hover:bg-yellow-800/50' : 
                  'bg-red-100/70 dark:bg-red-800/30 hover:bg-red-200/80 dark:hover:bg-red-800/50'
                } ${getTextColor(activeAnnouncement.type)}`}
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}