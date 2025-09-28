import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface FeedbackData {
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string;
}

export const sendFeedback = async (feedbackData: FeedbackData): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    const feedbackDoc = {
      type: feedbackData.type,
      message: feedbackData.message.trim(),
      email: feedbackData.email?.trim() || null,
      // User information
      userId: currentUser?.uid || null,
      userEmail: currentUser?.email || null,
      userDisplayName: currentUser?.displayName || null,
      // Metadata
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      status: 'new', // Can be: new, in_progress, resolved, closed
      // Browser/device info for debugging
      userAgent: navigator.userAgent,
      url: window.location.href,
      platform: navigator.platform,
    };

    // Add to Firestore collection
    const docRef = await addDoc(collection(db, 'feedback'), feedbackDoc);

    console.log('Feedback sent successfully with ID:', docRef.id);

    return;
  } catch (error) {
    console.error('Error sending feedback:', error);
    throw new Error('Failed to send feedback. Please try again.');
  }
};

// Helper function to get feedback for admin dashboard (if needed)
export const getFeedbackList = async () => {
  // This would be for admin use only - implement if needed
  // For now, you can view feedback directly in Firebase Console
  throw new Error('Admin functionality not implemented yet');
};