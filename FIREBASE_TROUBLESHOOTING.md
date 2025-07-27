# Firebase Authentication Troubleshooting Guide

## 🚨 Current Error: `auth/operation-not-allowed`

This error occurs when Email/Password authentication is not enabled in your Firebase project.

## 🔧 Quick Fix Steps

### Step 1: Enable Email/Password Authentication

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `bulk-buy-platform`

2. **Navigate to Authentication**
   - Click on "Authentication" in the left sidebar
   - Click on "Sign-in method" tab

3. **Enable Email/Password**
   - Find "Email/Password" in the list of providers
   - Click on it to open settings
   - **Toggle the "Enable" switch to ON**
   - Make sure "Email/Password" is checked
   - Optionally enable "Email link (passwordless sign-in)"
   - Click "Save"

### Step 2: Verify Configuration

Your Firebase config in `src/lib/firebase.ts` looks correct:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCXVqfsvEwVoQVXCO8lXYbpmlHEC0P2HGM",
  authDomain: "bulk-buy-platform.firebaseapp.com",
  projectId: "bulk-buy-platform",
  storageBucket: "bulk-buy-platform.firebasestorage.app",
  messagingSenderId: "1036939171085",
  appId: "1:1036939171085:web:d8c29a973702141b990c44"
};
```

### Step 3: Test the Fix

1. **Use the Firebase Test Component**
   - Navigate to the FirebaseTest component in your app
   - Try the "Test Register" and "Test Login" buttons
   - This will help verify the fix worked

2. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for any remaining authentication errors
   - The error should disappear after enabling Email/Password auth

## 🧪 Testing Steps

### Test Registration
```javascript
// This should work after enabling Email/Password auth
const userCredential = await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
console.log('User created:', userCredential.user.uid);
```

### Test Login
```javascript
// This should work after enabling Email/Password auth
const userCredential = await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
console.log('User logged in:', userCredential.user.uid);
```

## 🔍 Additional Troubleshooting

### If the error persists:

1. **Check Firebase Project Settings**
   - Go to Project Settings (gear icon)
   - Verify your project ID matches: `bulk-buy-platform`
   - Check that your app is properly registered

2. **Verify API Key**
   - Ensure the API key in your config is correct
   - Check if there are any restrictions on the API key

3. **Check Authentication Rules**
   - Go to Authentication → Settings
   - Verify no domain restrictions are blocking your localhost

4. **Clear Browser Cache**
   - Clear browser cache and cookies
   - Try in an incognito/private window

### Common Issues:

- **Wrong Project**: Make sure you're in the correct Firebase project
- **API Key Restrictions**: Check if your API key has domain restrictions
- **Network Issues**: Ensure you have internet connectivity
- **Browser Extensions**: Disable ad blockers or security extensions temporarily

## ✅ Success Indicators

After fixing the issue, you should see:

1. ✅ No more `auth/operation-not-allowed` errors in console
2. ✅ Registration works with test email/password
3. ✅ Login works with existing users
4. ✅ FirebaseTest component shows success messages
5. ✅ Your app's login/register forms work properly

## 🆘 Still Having Issues?

If the problem persists after following these steps:

1. **Check Firebase Console Logs**
   - Go to Authentication → Users
   - Look for any failed authentication attempts

2. **Verify Project Configuration**
   - Double-check all Firebase config values
   - Ensure the project is properly set up

3. **Contact Support**
   - Check Firebase documentation
   - Use Firebase support channels

## 📱 Alternative: Use Firebase Emulator

For development, you can use Firebase Emulator:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize emulator
firebase init emulators

# Start emulator
firebase emulators:start
```

This will give you a local Firebase environment for testing without affecting production. 