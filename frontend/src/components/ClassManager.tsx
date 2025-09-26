import React, { useState } from 'react';
import { Plus, X, Edit3, Trash2 } from 'lucide-react';
import { DomainType, UserClass } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { DOMAIN_TYPE_INFO } from '../constants/domains';

interface ClassManagerProps {
  classes: UserClass[];
  activeClass: UserClass | null;
  onCreateClass: (name: string, domainType: DomainType, description?: string) => void;
  onSelectClass: (userClass: UserClass) => void;
  onDeleteClass: (classId: string) => void;
  onEditClass?: (classId: string, name: string, domainType: DomainType, description?: string) => void;
}

export const ClassManager: React.FC<ClassManagerProps> = ({
  classes,
  activeClass,
  onCreateClass,
  onSelectClass,
  onDeleteClass,
  onEditClass,
}) => {
  const { theme } = useTheme();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClass, setEditingClass] = useState<UserClass | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassType, setNewClassType] = useState<DomainType>(DomainType.GENERAL);

  const handleCreateClass = () => {
    if (newClassName.trim()) {
      if (editingClass) {
        onEditClass?.(editingClass.id, newClassName, newClassType);
      } else {
        onCreateClass(newClassName, newClassType);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setNewClassName('');
    setNewClassType(DomainType.GENERAL);
    setShowCreateForm(false);
    setEditingClass(null);
  };

  const handleEditClass = (userClass: UserClass) => {
    setEditingClass(userClass);
    setNewClassName(userClass.name);
    setNewClassType(userClass.domainType);
    setShowCreateForm(true);
  };

  if (showCreateForm) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
          <button
            onClick={resetForm}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-white/10 text-white/60 hover:text-white'
                : 'hover:bg-black/10 text-black/60 hover:text-black'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Class Name
            </label>
            <input
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g., Law 101, Biology Research"
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-black placeholder-gray-500 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Domain Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                const Icon = info.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewClassType(type as DomainType)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 ${
                      newClassType === type
                        ? theme === 'dark'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : theme === 'dark'
                          ? 'border-gray-700 hover:border-gray-600 text-white/60 hover:text-white'
                          : 'border-gray-300 hover:border-gray-400 text-black/60 hover:text-black'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateClass}
          disabled={!newClassName.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 mt-6"
        >
          {editingClass ? 'Update Class' : 'Create Class'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            My Classes
          </h2>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-white/60' : 'text-black/60'
          }`}>
            Organize documents by subject or project
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className={`text-center py-12 ${
          theme === 'dark' ? 'text-white/60' : 'text-black/60'
        }`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
          }`}>
            <Plus className="h-8 w-8" />
          </div>
          <p className="font-medium mb-2">No classes yet</p>
          <p className="text-sm">Create your first class to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map((userClass) => {
            const typeInfo = DOMAIN_TYPE_INFO[userClass.domainType];
            const Icon = typeInfo.icon;
            const isActive = activeClass?.id === userClass.id;

            return (
              <div key={userClass.id}>
                <div
                  onClick={() => onSelectClass(userClass)}
                  className={`relative w-full text-left p-3 rounded-lg transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-blue-500/20 border-2 border-blue-500/50'
                        : 'bg-blue-50 border-2 border-blue-200'
                      : theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-white/10' : 'bg-white'
                      }`}>
                        <Icon className={`h-5 w-5 text-${typeInfo.color}-500`} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-black'
                        }`}>
                          {userClass.name}
                        </div>
                        <div className={`text-xs flex items-center gap-2 ${
                          theme === 'dark' ? 'text-white/60' : 'text-black/60'
                        }`}>
                          <span>{typeInfo.label}</span>
                          <span>•</span>
                          <span>{userClass.documents?.length || 0} docs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClass(userClass);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                          theme === 'dark'
                            ? 'hover:bg-white/20 text-white/60 hover:text-white'
                            : 'hover:bg-black/10 text-black/60 hover:text-black'
                        }`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClass(userClass.id);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                          theme === 'dark'
                            ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                            : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {userClass.description && (
                  <div className={`ml-14 mt-1 text-sm ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    {userClass.description}
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