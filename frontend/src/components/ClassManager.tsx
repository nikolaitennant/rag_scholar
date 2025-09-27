import React, { useState } from 'react';
import { Plus, X, Edit3, Trash2, BookOpen } from 'lucide-react';
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
      <div className="p-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-6 animate-fade-in duration-500 ease-out">
        <div className="bg-[#1C1C1E] bg-white/5 rounded-[20px] p-6 backdrop-blur-lg border border-white/10" style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
        }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
            <button
              onClick={resetForm}
              className={`p-2 rounded-full transition-all duration-200 active:scale-95 hover:bg-white/5 ${
                theme === 'dark'
                  ? 'text-white/60 hover:text-white'
                  : 'text-black/60 hover:text-black'
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
                className={`w-full px-4 py-3 rounded-2xl border transition-all duration-200 bg-[#2C2C2E]/70 border-white/10 text-white placeholder-gray-400 focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 ${
                  theme === 'dark'
                    ? 'bg-[#2C2C2E]/70 border-white/10 text-white placeholder-gray-400 focus:border-purple-500/60'
                    : 'bg-white/10 border-black/10 text-black placeholder-black/50 focus:border-purple-500/60'
                } focus:outline-none backdrop-blur-sm`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                Domain Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                  const Icon = info.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setNewClassType(type as DomainType)}
                      className={`aspect-square p-4 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-2 active:scale-95 hover:bg-white/5 ${
                        newClassType === type
                          ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/30 border-2 border-purple-500/60 text-purple-300 ring-2 ring-purple-500/30'
                          : theme === 'dark'
                            ? 'bg-[#2C2C2E]/50 border border-white/10 text-white/60 hover:text-white backdrop-blur-sm'
                            : 'bg-white/10 border border-black/10 text-black/60 hover:text-black backdrop-blur-sm'
                      }`}
                    >
                      <Icon className="h-[20px] w-[20px]" />
                      <span className="text-[13px] font-medium text-center">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateClass}
            disabled={!newClassName.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-4 rounded-full transition-all duration-200 disabled:opacity-50 mt-6 active:scale-95"
            style={{
              background: !newClassName.trim() ? 'rgba(147, 51, 234, 0.3)' : 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)'
            }}
          >
            {editingClass ? 'Update Class' : 'Create Class'}
          </button>
        </div>
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
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center gap-2 font-medium active:scale-95"
        >
          <Plus className="h-4 w-4" />
          New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-8 space-y-4 animate-fade-in duration-500 ease-out">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#2C2C2E]/70 backdrop-blur-sm flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white/60" />
          </div>
          <div>
            <p className="font-medium text-white mb-1">No classes yet</p>
            <p className="text-gray-400 text-sm mb-4">Create your first class to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-200 font-medium active:scale-95 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Class
            </button>
          </div>
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
                        ? 'bg-violet-500/20 border-2 border-violet-500/50'
                        : 'bg-violet-50 border-2 border-violet-200'
                      : theme === 'dark'
                        ? 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`h-5 w-5 text-${typeInfo.color}-500`} />
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
                        className={`opacity-0 group-hover:opacity-100 transition-colors ${
                          theme === 'dark'
                            ? 'text-white/60 hover:text-white'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClass(userClass.id);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-colors ${
                          theme === 'dark'
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-red-600 hover:text-red-700'
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