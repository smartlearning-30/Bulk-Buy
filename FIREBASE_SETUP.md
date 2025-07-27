# Firebase Setup Guide for Bulk Buy Platform

## 🚀 Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `bulk-buy-platform`
4. Enable Google Analytics (optional)
5. Click "Create project"

## 🔧 Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" authentication
3. Click "Save"

## 📊 Step 3: Set up Firestore Database

1. Go to "Firestore Database" → "Create database"
2. Choose "Start in test mode" (we'll add security rules later)
3. Select a location (choose closest to your users)
4. Click "Done"

## 🔐 Step 4: Configure Security Rules

1. Go to "Firestore Database" → "Rules"
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read orders, authenticated users can create
    match /groupOrders/{orderId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.supplierId == request.auth.uid || 
         request.auth.token.role == 'admin');
    }
    
    // Participants can be read by order participants, created by authenticated users
    match /participants/{participantId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.vendorId == request.auth.uid || 
         resource.data.supplierId == request.auth.uid);
    }
  }
}
```

## ⚙️ Step 5: Get Firebase Config

1. Go to "Project settings" (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → "Web"
4. Register app with name: "Bulk Buy Platform"
5. Copy the config object

## 🔑 Step 6: Update Firebase Config

1. Open `src/lib/firebase.ts`
2. Replace the placeholder config with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 📦 Step 7: Install Dependencies

```bash
npm install firebase
```

## 🎯 Step 8: Initialize Database Collections

The app will automatically create these collections when used:
- `users` - User profiles and authentication data
- `groupOrders` - Group order information
- `participants` - Vendor participation in orders

## 🔄 Step 9: Test the Integration

1. Start the development server: `npm run dev`
2. Try registering a new user
3. Create a group order as a supplier
4. Join an order as a vendor
5. Verify real-time updates work

## 🛡️ Step 10: Production Security (Optional)

For production, update Firestore rules to be more restrictive:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // More restrictive rules for production
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /groupOrders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.token.role == 'supplier';
      allow update: if request.auth != null && 
        (resource.data.supplierId == request.auth.uid);
      allow delete: if false; // Prevent deletion
    }
    
    match /participants/{participantId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.token.role == 'vendor';
      allow update: if request.auth != null && 
        resource.data.vendorId == request.auth.uid;
      allow delete: if request.auth != null && 
        resource.data.vendorId == request.auth.uid;
    }
  }
}
```

## 📱 Step 11: Enable Real-time Features

The app includes:
- ✅ Real-time order updates
- ✅ Live participant tracking
- ✅ Instant notifications
- ✅ Offline support

## 🎉 You're Ready!

Your Firebase backend is now set up and integrated with the bulk buy platform. The app will:
- Store all data in Firestore
- Handle authentication with Firebase Auth
- Provide real-time updates
- Work offline with data synchronization

## 🔍 Troubleshooting

**Common Issues:**
1. **Config errors**: Double-check your Firebase config
2. **Permission denied**: Check Firestore security rules
3. **Auth errors**: Ensure Email/Password auth is enabled
4. **Real-time not working**: Check network connectivity

**Need Help?**
- Check Firebase Console for error logs
- Verify all collections are created
- Test with Firebase Emulator for local development 