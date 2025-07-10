import React, { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-primary-600">
            Chat App
          </Link>
          
          <div className="relative">
            <button
              type="button"
              className="flex items-center focus:outline-none"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 text-sm font-medium">
                    {user?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </span>
                )}
              </div>
              <span className="ml-2 text-gray-700">{user?.full_name || user?.email || user?.phone_number}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-1 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Chat Application. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout; 