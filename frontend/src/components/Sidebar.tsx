import React, { useState } from 'react';
import { Settings, Plus, Trash, RefreshCw } from 'lucide-react';
import { DomainType, DomainConfig } from '../types';

const DOMAIN_CONFIG: Record<DomainType, DomainConfig> = {
  [DomainType.GENERAL]: { icon: 'General', color: '#4A90E2' },
  [DomainType.LAW]: { icon: 'Law', color: '#8B4513' },
  [DomainType.SCIENCE]: { icon: 'Science', color: '#2E7D32' },
  [DomainType.MEDICINE]: { icon: 'Medicine', color: '#D32F2F' },
  [DomainType.BUSINESS]: { icon: 'Business', color: '#FF6F00' },
  [DomainType.HUMANITIES]: { icon: 'Humanities', color: '#6A1B9A' },
  [DomainType.COMPUTER_SCIENCE]: { icon: 'Computer Science', color: '#00897B' },
};

interface SidebarProps {
  currentDomain: DomainType;
  onDomainChange: (domain: DomainType) => void;
  collections: string[];
  activeCollection: string;
  onCollectionChange: (collection: string) => void;
  onCreateCollection: (name: string) => Promise<void>;
  sessionId: string;
  messageCount: number;
  onClearChat: () => void;
  onNewSession: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDomain,
  onDomainChange,
  collections,
  activeCollection,
  onCollectionChange,
  onCreateCollection,
  sessionId,
  messageCount,
  onClearChat,
  onNewSession,
}) => {
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateCollection(newCollectionName);
      setNewCollectionName('');
      setShowCreateCollection(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">RAG Scholar</h2>
          <p className="text-sm text-gray-600 mt-1">
            Advanced Research Assistant
          </p>
        </div>
      </div>

      {/* Domain Selection */}
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Research Domain</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DOMAIN_CONFIG).map(([domain, config]) => (
            <button
              key={domain}
              onClick={() => onDomainChange(domain as DomainType)}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                currentDomain === domain
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
              style={
                currentDomain === domain 
                  ? { backgroundColor: config.color }
                  : {}
              }
            >
              {config.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Collections</h3>
            <button
              onClick={() => setShowCreateCollection(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Create Collection"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showCreateCollection && (
            <div className="mb-3 p-3 bg-white rounded-lg border">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-2"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCollection()}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || isCreating}
                  className="btn-primary text-xs flex-1 py-1 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateCollection(false);
                    setNewCollectionName('');
                  }}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {collections.map((collection) => (
              <button
                key={collection}
                onClick={() => onCollectionChange(collection)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCollection === collection
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                {collection}
              </button>
            ))}
            {collections.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-2">
                No collections yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="p-4 border-t">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Session</h3>
        
        <div className="flex space-x-2 mb-3">
          <button
            onClick={onClearChat}
            className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center space-x-1"
            disabled={messageCount === 0}
          >
            <Trash className="w-3 h-3" />
            <span>Clear</span>
          </button>
          <button
            onClick={onNewSession}
            className="btn-secondary flex-1 text-xs py-2 flex items-center justify-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        <div className="bg-white p-3 rounded-lg border">
          <div className="text-xs text-gray-500 mb-1">Session ID</div>
          <div className="text-xs font-mono text-gray-700">
            {sessionId.substring(0, 8)}...
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {messageCount} messages
          </div>
        </div>
      </div>

      {/* Special Commands */}
      <div className="p-4 border-t">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Commands</h3>
        <div className="space-y-2 text-xs">
          <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-200">
            <code className="text-blue-700 font-medium">remember:</code>
            <div className="text-gray-600">Save fact permanently</div>
          </div>
          <div className="bg-green-50 p-2 rounded border-l-2 border-green-200">
            <code className="text-green-700 font-medium">role:</code>
            <div className="text-gray-600">Set AI persona</div>
          </div>
          <div className="bg-purple-50 p-2 rounded border-l-2 border-purple-200">
            <code className="text-purple-700 font-medium">memo:</code>
            <div className="text-gray-600">Session note</div>
          </div>
        </div>
      </div>
    </div>
  );
};