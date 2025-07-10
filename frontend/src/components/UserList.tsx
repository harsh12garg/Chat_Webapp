import React from 'react';
import { Link } from 'react-router-dom';

interface User {
  id: string;
  email?: string;
  phone_number?: string;
  full_name?: string;
  profile_picture?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface UserListProps {
  users: User[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No users found</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              to={`/chat/${user.id}`}
              className="block hover:bg-gray-50 transition duration-150"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {user.profile_picture ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={user.profile_picture}
                        alt={user.full_name || 'User'}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {user.full_name?.[0] || user.email?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || user.email || user.phone_number}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      {user.email && (
                        <span className="truncate">{user.email}</span>
                      )}
                      {user.email && user.phone_number && (
                        <span className="mx-1">•</span>
                      )}
                      {user.phone_number && (
                        <span className="truncate">{user.phone_number}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 