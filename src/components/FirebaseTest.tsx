import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const FirebaseTest = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const testLogin = async () => {
    try {
      setStatus('Testing login...');
      setError('');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setStatus(`Login successful! User ID: ${userCredential.user.uid}`);
    } catch (err: any) {
      setError(`Login failed: ${err.code} - ${err.message}`);
      setStatus('Login failed');
    }
  };

  const testRegister = async () => {
    try {
      setStatus('Testing registration...');
      setError('');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setStatus(`Registration successful! User ID: ${userCredential.user.uid}`);
    } catch (err: any) {
      setError(`Registration failed: ${err.code} - ${err.message}`);
      setStatus('Registration failed');
    }
  };

  const testConnection = () => {
    setStatus('Firebase connection test...');
    setError('');
    
    if (auth) {
      setStatus('Firebase Auth is initialized successfully');
    } else {
      setError('Firebase Auth is not initialized');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Firebase Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email:</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Password:</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password123"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline">
            Test Connection
          </Button>
          <Button onClick={testRegister} variant="outline">
            Test Register
          </Button>
          <Button onClick={testLogin}>
            Test Login
          </Button>
        </div>

        {status && (
          <Alert>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Current Error:</strong> auth/operation-not-allowed</p>
          <p><strong>Solution:</strong> Enable Email/Password authentication in Firebase Console</p>
          <p><strong>Steps:</strong></p>
          <ol className="list-decimal list-inside ml-2">
            <li>Go to Firebase Console</li>
            <li>Select your project</li>
            <li>Authentication → Sign-in method</li>
            <li>Enable Email/Password</li>
            <li>Save changes</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}; 