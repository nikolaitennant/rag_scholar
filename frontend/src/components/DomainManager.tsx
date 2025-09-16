import React, { useState } from 'react';
import { Plus, GraduationCap, Briefcase, Beaker, Book, Heart, Code, Home, X, Check, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { DomainType, UserDomain } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface DomainManagerProps {
  domains: UserDomain[];
  activeDomain: UserDomain | null;
  onCreateDomain: (name: string, type: DomainType, description?: string) => void;
  onSelectDomain: (domain: UserDomain) => void;
  onDeleteDomain: (domainId: string) => void;
  onEditDomain?: (domainId: string, name: string, type: DomainType, description?: string) => void;
  availableDocuments: { id: string; filename: string }[];
  onAssignDocuments: (domainId: string, documentIds: string[]) => void;
  totalDocumentCount?: number;
}

const DOMAIN_TYPE_INFO = {
  [DomainType.GENERAL]: { icon: Home, label: 'General', color: 'blue' },
  [DomainType.LAW]: { icon: Book, label: 'Law', color: 'amber' },
  [DomainType.SCIENCE]: { icon: Beaker, label: 'Science', color: 'green' },
  [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine', color: 'red' },
  [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business', color: 'purple' },
  [DomainType.HUMANITIES]: { icon: GraduationCap, label: 'Humanities', color: 'pink' },
  [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Computer Science', color: 'cyan' },
};

export const DomainManager: React.FC<DomainManagerProps> = ({
  domains,
  activeDomain,
  onCreateDomain,
  onSelectDomain,
  onDeleteDomain,
  onEditDomain,
  availableDocuments,
  onAssignDocuments,
  totalDocumentCount = 0,
}) => {
  const { theme } = useTheme();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState<UserDomain | null>(null);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainType, setNewDomainType] = useState<DomainType>(DomainType.GENERAL);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const handleCreateDomain = () => {
    if (newDomainName.trim()) {
      if (editingDomain) {
        onEditDomain?.(editingDomain.id, newDomainName, newDomainType);
      } else {
        onCreateDomain(newDomainName, newDomainType);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setNewDomainName('');
    setNewDomainType(DomainType.GENERAL);
    setSelectedDocuments([]);
    setShowCreateForm(false);
    setEditingDomain(null);
  };

  const handleEditDomain = (domain: UserDomain) => {
    setEditingDomain(domain);
    setNewDomainName(domain.name);
    setNewDomainType(domain.type);
    setSelectedDocuments(domain.documents || []);
    setShowCreateForm(true);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  if (showCreateForm) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>{editingDomain ? 'Edit Class' : 'Create New Class'}</h3>
          <button
            onClick={resetForm}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-white/60 hover:text-white hover:bg-white/10' 
                : 'text-black/60 hover:text-black hover:bg-black/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            Class Name
          </label>
          <input
            type="text"
            value={newDomainName}
            onChange={(e) => setNewDomainName(e.target.value)}
            placeholder="e.g., History of Law Class"
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              theme === 'dark'
                ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                : 'bg-black/10 border-black/20 text-black placeholder-black/50'
            }`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            Class Type
          </label>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries({
              [DomainType.GENERAL]: { icon: Home, label: 'General' },
              [DomainType.LAW]: { icon: Book, label: 'Law' },
              [DomainType.SCIENCE]: { icon: Beaker, label: 'Science' },
              [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine' },
              [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business' },
              [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Tech' },
            }).map(([type, info]) => {
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNewDomainType(type as DomainType)}
                  className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                    newDomainType === type
                      ? theme === 'dark'
                        ? 'bg-white/20 text-white'
                        : 'bg-black/20 text-black'
                      : theme === 'dark'
                        ? 'bg-white/5 text-white/70 hover:bg-white/10'
                        : 'bg-black/5 text-black/70 hover:bg-black/10'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {availableDocuments.length > 0 && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-white/80' : 'text-black/80'
            }`}>
              Add Documents (Optional)
            </label>
            <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 ${
              theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
            }`}>
              {availableDocuments.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                    selectedDocuments.includes(doc.id)
                      ? theme === 'dark'
                        ? 'bg-white/10 text-white'
                        : 'bg-black/10 text-black'
                      : theme === 'dark'
                        ? 'text-white/70 hover:bg-white/5'
                        : 'text-black/70 hover:bg-black/5'
                  }`}
                >
                  <span className="truncate">{doc.filename}</span>
                  {selectedDocuments.includes(doc.id) && (
                    <Check className="w-3 h-3 text-green-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleCreateDomain}
          disabled={!newDomainName.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {editingDomain ? 'Update Class' : 'Create Class'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}>Your Classes</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className={`p-1 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-black/60 hover:text-black hover:bg-black/10'
          }`}
          title="Create Class"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {domains.length === 0 ? (
        <div className="text-center py-8">
          <GraduationCap className={`w-12 h-12 mx-auto mb-3 ${
            theme === 'dark' ? 'text-white/30' : 'text-black/30'
          }`} />
          <p className={`text-sm mb-3 ${
            theme === 'dark' ? 'text-white/60' : 'text-black/60'
          }`}>No classes yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className={`text-xs py-1 px-3 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-black/10 hover:bg-black/20 text-black'
            }`}
          >
            Create Your First Class
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map(domain => {
            const typeInfo = DOMAIN_TYPE_INFO[domain.type];
            const Icon = typeInfo.icon;
            const isActive = activeDomain?.id === domain.id;

            return (
              <button
                key={domain.id}
                onClick={() => onSelectDomain(domain)}
                className={`relative w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-white/20 shadow-lg'
                      : 'bg-black/20 shadow-lg'
                    : theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-black/5 hover:bg-black/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${typeInfo.color}-500/20`}>
                      <Icon className={`w-4 h-4 text-${typeInfo.color}-300`} />
                    </div>
                    <div>
                      <div className={`font-medium text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-black'
                      }`}>
                        {domain.name}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-white/60' : 'text-black/60'
                      }`}>
                        {typeInfo.label} • {totalDocumentCount} docs
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDomain(domain);
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        theme === 'dark' 
                          ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                          : 'hover:bg-black/10 text-black/60 hover:text-black'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDomain(domain.id);
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        theme === 'dark' 
                          ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' 
                          : 'hover:bg-red-500/20 text-black/60 hover:text-red-600'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {isActive && (
                      <ChevronRight className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-white/60' : 'text-black/60'
                      }`} />
                    )}
                  </div>
                </div>
                {domain.description && (
                  <p className={`text-xs mt-2 line-clamp-2 ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    {domain.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};