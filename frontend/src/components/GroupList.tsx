import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description?: string;
  group_picture?: string;
  created_by: string;
  created_at: string;
}

interface GroupListProps {
  groups: Group[];
}

const GroupList: React.FC<GroupListProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No groups found</p>
        <p className="text-gray-500 mt-2">Create a new group to start chatting</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {groups.map((group) => (
          <li key={group.id}>
            <Link
              to={`/group/${group.id}`}
              className="block hover:bg-gray-50 transition duration-150"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {group.group_picture ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={group.group_picture}
                        alt={group.name}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary-100 flex items-center justify-center">
                        <span className="text-secondary-600 font-medium">
                          {group.name[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {group.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary-100 text-secondary-800">
                          Group
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      {group.description ? (
                        <span className="truncate">{group.description}</span>
                      ) : (
                        <span className="truncate">No description</span>
                      )}
                      <span className="mx-1">•</span>
                      <span>
                        Created {format(new Date(group.created_at), 'MMM d, yyyy')}
                      </span>
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

export default GroupList; 