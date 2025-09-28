#!/bin/bash

# Deploy Firestore security rules
echo "Deploying Firestore security rules..."

# Make sure you're logged in to Firebase
firebase login

# Deploy the rules
firebase deploy --only firestore:rules

echo "Firestore security rules deployed successfully!"
echo ""
echo "📧 Your feedback system is now ready!"
echo ""
echo "To test the feedback system:"
echo "1. Login to your app"
echo "2. Go to Settings → Help → Send Feedback"
echo "3. Fill out the form and submit"
echo "4. Check your Firebase Console → Firestore → feedback collection"
echo ""
echo "To view feedback as an admin:"
echo "1. Go to Firebase Console"
echo "2. Navigate to Firestore Database"
echo "3. Open the 'feedback' collection"
echo "4. You'll see all submitted feedback with user info and timestamps"