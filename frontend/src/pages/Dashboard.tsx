import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import UserList from '../components/UserList';
import GroupList from '../components/GroupList';
import CreateGroupModal from '../components/CreateGroupModal';

interface User {
  id: string;
  email?: string;
  phone_number?: string;
  full_name?: string;
  profile_picture?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  group_picture?: string;
  created_by: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  // Fetch users and groups on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch users
        const usersResponse = await axios.get('/api/users');
        setUsers(usersResponse.data.users);
        
        // Fetch groups
        const groupsResponse = await axios.get('/chat/groups');
        setGroups(groupsResponse.data.groups);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle create group
  const handleCreateGroup = async (groupData: { name: string; description?: string }) => {
    try {
      const response = await axios.post('/chat/groups', groupData);
      setGroups([...groups, response.data]);
      toast.success('Group created successfully!');
      setIsCreateGroupModalOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };
  
  return (
    <WebSocketProvider>
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
            {activeTab === 'groups' && (
              <button
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="btn btn-primary flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Group
              </button>
            )}
          </div>
          
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'groups'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Groups
                </button>
              </nav>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'users' ? (
                <UserList users={users.filter(u => u.id !== user?.id)} />
              ) : (
                <GroupList groups={groups} />
              )}
            </>
          )}
        </div>
        
        <CreateGroupModal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
          onCreateGroup={handleCreateGroup}
        />
      </Layout>
    </WebSocketProvider>
  );
};

export default Dashboard; 