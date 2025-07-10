import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// API base URL
const API_URL = 'http://localhost:8000';

// Types
interface User {
  id: string;
  email?: string;
  phone_number?: string;
  full_name?: string;
  profile_picture?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<User>;
  logout: () => void;
  sendOtp: (contact: string, contactType: 'email' | 'phone') => Promise<void>;
  verifyOtp: (contact: string, otp: string) => Promise<void>;
  resetPassword: (contact: string, otp: string, newPassword: string, confirmPassword: string) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

interface RegisterData {
  email?: string;
  phone_number?: string;
  full_name?: string;
  password: string;
  confirm_password: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Check if user is authenticated
  const isAuthenticated = !!token;
  
  // Configure axios defaults
  axios.defaults.baseURL = API_URL;
  
  // Set auth token for all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);
  
  // Load user data
  const loadUser = useCallback(async () => {
    if (token) {
      try {
        const response = await axios.get('/api/users/me');
        setUser(response.data);
        return response.data;
      } catch (error: any) {
        console.error('Failed to load user:', error);
        
        // If token is invalid or expired, clear it
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
        
        return null;
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      return null;
    }
  }, [token]);
  
  // Load user data on mount if token exists
  useEffect(() => {
    loadUser();
  }, [loadUser]);
  
  // Login function
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Use form data format for OAuth2 authentication
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await axios.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { access_token, token_type, user_id } = response.data;
      
      // Store token and set axios default header
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Load user data
      await loadUser();
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        toast.error('Account not verified. Please verify your account first.');
      } else {
        toast.error(error.response?.data?.detail || 'Login failed. Please try again.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Register function
  const register = async (userData: RegisterData): Promise<User> => {
    try {
      setIsLoading(true);
      const response = await axios.post('/auth/register', userData);
      toast.success('Registration successful! Please verify your account.');
      return response.data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully!');
  };
  
  // Send OTP function
  const sendOtp = async (contact: string, contactType: 'email' | 'phone') => {
    try {
      setIsLoading(true);
      await axios.post('/auth/send-otp', { contact, contact_type: contactType });
      toast.success(`OTP sent to your ${contactType}!`);
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      toast.error(error.response?.data?.detail || 'Failed to send OTP. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify OTP function
  const verifyOtp = async (contact: string, otp: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('/auth/verify-otp', { contact, otp });
      
      // If verification returns a token, store it
      if (response.data && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        setToken(response.data.access_token);
        
        // Load user data
        await loadUser();
      }
      
      toast.success('OTP verified successfully!');
      return response.data;
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      toast.error(error.response?.data?.detail || 'OTP verification failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset password function
  const resetPassword = async (contact: string, otp: string, newPassword: string, confirmPassword: string) => {
    try {
      setIsLoading(true);
      await axios.post('/auth/reset-password', {
        contact,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      toast.success('Password reset successfully!');
    } catch (error: any) {
      console.error('Password reset failed:', error);
      toast.error(error.response?.data?.detail || 'Password reset failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    try {
      setIsLoading(true);
      const response = await axios.put('/api/users/me', userData);
      setUser(response.data);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update failed:', error);
      toast.error(error.response?.data?.detail || 'Profile update failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Context value
  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    sendOtp,
    verifyOtp,
    resetPassword,
    updateProfile
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 