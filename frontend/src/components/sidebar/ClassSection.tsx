import React, { useState } from 'react';
import { Plus, GraduationCap, Edit3, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { DomainType, UserClass, Document } from '../../types';
import { DOMAIN_TYPE_INFO } from '../../constants/domains';

interface ClassSectionProps {
  classes: UserClass[];
  activeClass: UserClass | null;
  onCreateClass: (name: string, domainType: DomainType, description?: string, selectedDocuments?: string[]) => void;
  onEditClass?: (classId: string, name: string, domainType: DomainType, description?: string) => void;
  onSelectClass: (userClass: UserClass) => void;
  onDeleteClass: (classId: string) => void;
  availableDocuments: { id: string; filename: string }[];
  onAssignDocuments: (classId: string, documentIds: string[]) => void;
  documents: Document[];
}

export const ClassSection: React.FC<ClassSectionProps> = ({
  classes,
  activeClass,
  onCreateClass,
  onEditClass,
  onSelectClass,
  onDeleteClass,
  availableDocuments,
  onAssignDocuments,
  documents,
}) => {
  const { theme } = useTheme();

  // Create class form state
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassType, setNewClassType] = useState<DomainType>(DomainType.GENERAL);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  // Edit class form state
  const [editingClass, setEditingClass] = useState<UserClass | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassType, setEditingClassType] = useState<DomainType>(DomainType.GENERAL);
  const [editingClassDocuments, setEditingClassDocuments] = useState<string[]>([]);
  const [isEditingClass, setIsEditingClass] = useState(false);


  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}>Your Classes</h3>
        <button
          onClick={() => setShowCreateClassForm(!showCreateClassForm)}
          className={`p-1 rounded-lg transition-colors ${
            showCreateClassForm
              ? theme === 'dark'
                ? 'bg-white/20 text-white'
                : 'bg-black/20 text-black'
              : theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-black/60 hover:text-black hover:bg-black/10'
          }`}
          title="Create Class"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Create Class Form */}
      {showCreateClassForm && (
        <div className={`mb-4 p-3 rounded-lg border ${
          theme === 'dark'
            ? 'bg-white/5 border-white/20'
            : 'bg-black/5 border-black/20'
        }`}>
          <div className="space-y-3">
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Class name (e.g., History 101)"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                  : 'bg-black/10 border-black/20 text-black placeholder-black/50'
              }`}
            />

            <div className="grid grid-cols-3 gap-1">
              {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                const Icon = info.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewClassType(type as DomainType)}
                    className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center justify-center space-y-1 h-16 ${
                      newClassType === type
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

            {/* Document Selection */}
            {availableDocuments.length > 0 && (
              <div>
                <label className={`block text-xs font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/80' : 'text-black/80'
                }`}>
                  Assign Documents (Optional)
                </label>
                <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 ${
                  theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/30'
                }`}>
                  {availableDocuments.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedDocuments(prev =>
                          prev.includes(doc.id)
                            ? prev.filter(id => id !== doc.id)
                            : [...prev, doc.id]
                        );
                      }}
                      className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                        selectedDocuments.includes(doc.id)
                          ? theme === 'dark'
                            ? 'bg-white/15 text-white'
                            : 'bg-black/15 text-black'
                          : theme === 'dark'
                            ? 'text-white/70 hover:bg-white/10'
                            : 'text-black/70 hover:bg-black/10'
                      }`}
                    >
                      <span className="truncate">{doc.filename}</span>
                      {selectedDocuments.includes(doc.id) && (
                        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                      )}
                    </button>
                  ))}
                </div>
                {selectedDocuments.length > 0 && (
                  <div className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-black/60'
                  }`}>
                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (newClassName.trim()) {
                    onCreateClass(newClassName, newClassType, undefined, selectedDocuments.length > 0 ? selectedDocuments : undefined);
                    setNewClassName('');
                    setNewClassType(DomainType.GENERAL);
                    setSelectedDocuments([]);
                    setShowCreateClassForm(false);
                  }
                }}
                disabled={!newClassName.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
              >
                Create Class
              </button>
              <button
                onClick={() => {
                  setShowCreateClassForm(false);
                  setNewClassName('');
                  setNewClassType(DomainType.GENERAL);
                  setSelectedDocuments([]);
                }}
                className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                  theme === 'dark'
                    ? 'text-white/60 hover:text-white/80 hover:bg-white/10'
                    : 'text-black/60 hover:text-black/80 hover:bg-black/10'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="text-center py-8">
          <GraduationCap className={`w-12 h-12 mx-auto mb-3 ${
            theme === 'dark' ? 'text-white/30' : 'text-black/30'
          }`} />
          <p className={`text-sm mb-3 ${
            theme === 'dark' ? 'text-white/60' : 'text-black/60'
          }`}>No classes yet</p>
          <button
            onClick={() => setShowCreateClassForm(true)}
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
          {classes.map((userClass) => {
            const isActive = activeClass?.id === userClass.id;
            return (
              <div key={userClass.id}>
                <div
                  className={`w-full p-3 rounded-lg transition-all relative ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20'
                        : 'bg-gradient-to-r from-blue-50 to-purple-50'
                      : theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                        : 'bg-white/20 hover:bg-white/30 border border-transparent'
                  } ${
                    isActive ? 'ring-2 ring-blue-400/30' : ''
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l-lg"></div>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectClass(userClass);
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="flex-1 text-left"
                    >
                      <div>
                        <h3 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          {userClass.name}
                        </h3>
                        <p className={`text-xs mt-1 truncate ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                          {DOMAIN_TYPE_INFO[userClass.domainType]?.shortLabel || userClass.domainType} • {documents.filter(doc => doc.assigned_classes?.includes(userClass.id)).length} docs
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClass(userClass);
                          setEditingClassName(userClass.name);
                          setEditingClassType(userClass.domainType);
                          // Initialize with documents that are actually assigned to this class
                          const actuallyAssignedDocs = documents
                            .filter(doc => doc.assigned_classes?.includes(userClass.id))
                            .map(doc => doc.id);
                          setEditingClassDocuments(actuallyAssignedDocs);
                        }}
                        className={`transition-colors ${
                          theme === 'dark'
                            ? 'text-white/60 hover:text-white/80'
                            : 'text-black/60 hover:text-black/80'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClass(userClass.id);
                        }}
                        className={`transition-colors ${
                          theme === 'dark'
                            ? 'text-white/60 hover:text-red-400'
                            : 'text-black/60 hover:text-red-600'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Form - Show below the specific class being edited */}
                {editingClass?.id === userClass.id && (
                  <div className={`mt-2 p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/20'
                      : 'bg-black/5 border-black/20'
                  }`}>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingClassName}
                        onChange={(e) => setEditingClassName(e.target.value)}
                        placeholder="Class name (e.g., History 101)"
                        className={`w-full border rounded-lg px-3 py-2 text-sm ${
                          theme === 'dark'
                            ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                            : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                        }`}
                      />

                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                          const Icon = info.icon;
                          return (
                            <button
                              key={type}
                              onClick={() => setEditingClassType(type as DomainType)}
                              className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center justify-center space-y-1 h-16 ${
                                editingClassType === type
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

                      {/* Document Selection */}
                      {availableDocuments.length > 0 && (
                        <div>
                          <label className={`block text-xs font-medium mb-2 ${
                            theme === 'dark' ? 'text-white/80' : 'text-black/80'
                          }`}>
                            Assign Documents (Optional)
                          </label>
                          <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 ${
                            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/30'
                          }`}>
                            {availableDocuments.map(doc => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => {
                                  setEditingClassDocuments(prev =>
                                    prev.includes(doc.id)
                                      ? prev.filter(id => id !== doc.id)
                                      : [...prev, doc.id]
                                  );
                                }}
                                className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                                  editingClassDocuments.includes(doc.id)
                                    ? theme === 'dark'
                                      ? 'bg-white/15 text-white'
                                      : 'bg-black/15 text-black'
                                    : theme === 'dark'
                                      ? 'text-white/70 hover:bg-white/10'
                                      : 'text-black/70 hover:bg-black/10'
                                }`}
                              >
                                <span className="truncate">{doc.filename}</span>
                                {editingClassDocuments.includes(doc.id) && (
                                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                                )}
                              </button>
                            ))}
                          </div>
                          {editingClassDocuments.length > 0 && (
                            <div className={`text-xs mt-1 ${
                              theme === 'dark' ? 'text-white/60' : 'text-black/60'
                            }`}>
                              {editingClassDocuments.length} document{editingClassDocuments.length !== 1 ? 's' : ''} selected
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            if (editingClassName.trim() && !isEditingClass) {
                              setIsEditingClass(true);
                              try {
                                // First update the domain details, then assign documents
                                onEditClass?.(editingClass.id, editingClassName, editingClassType);
                                // Wait a bit longer to ensure React state updates complete
                                await new Promise(resolve => setTimeout(resolve, 100));
                                await onAssignDocuments(editingClass.id, editingClassDocuments);
                                // Clear edit state after all operations complete
                                setEditingClass(null);
                                setEditingClassName('');
                                setEditingClassType(DomainType.GENERAL);
                                setEditingClassDocuments([]);
                              } finally {
                                setIsEditingClass(false);
                              }
                            }
                          }}
                          disabled={!editingClassName.trim() || isEditingClass}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                          {isEditingClass && (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          )}
                          {isEditingClass ? 'Updating...' : 'Update Class'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingClass(null);
                            setEditingClassName('');
                            setEditingClassType(DomainType.GENERAL);
                            setEditingClassDocuments([]);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            theme === 'dark'
                              ? 'text-white/60 hover:text-white/80 hover:bg-white/10'
                              : 'text-black/60 hover:text-black/80 hover:bg-black/10'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};