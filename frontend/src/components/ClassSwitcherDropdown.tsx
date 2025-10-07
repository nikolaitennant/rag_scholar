import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Check, X } from 'lucide-react';
import { UserClass } from '../types';
import { DOMAIN_TYPE_INFO } from '../constants/domains';

interface ClassSwitcherDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: UserClass | null;
  userClasses: UserClass[];
  onSelectClass: (classItem: UserClass) => void;
  onCreateClass: () => void;
}

export const ClassSwitcherDropdown: React.FC<ClassSwitcherDropdownProps> = ({
  isOpen,
  onClose,
  activeClass,
  userClasses,
  onSelectClass,
  onCreateClass,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          border: '0.5px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Switch Class</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Classes List */}
        <div className="max-h-96 overflow-y-auto">
          {userClasses.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-white/60 text-sm mb-4">No classes yet</p>
              <button
                onClick={() => {
                  onClose();
                  onCreateClass();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] text-white font-medium text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow"
              >
                Create Your First Class
              </button>
            </div>
          ) : (
            <div className="py-2">
              {userClasses.map((classItem) => {
                const isActive = activeClass?.id === classItem.id;
                const typeInfo = DOMAIN_TYPE_INFO[classItem.domainType];
                const Icon = typeInfo?.icon;

                return (
                  <button
                    key={classItem.id}
                    onClick={() => {
                      onSelectClass(classItem);
                      onClose();
                    }}
                    className="w-full px-5 py-3 flex items-center space-x-3 hover:bg-white/5 active:bg-white/10 transition-colors"
                  >
                    {/* Icon */}
                    {Icon && (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, #6D5FFD 0%, #9E78FF 100%)'
                            : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Class Info */}
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-white font-medium text-sm truncate">
                        {classItem.name}
                      </h3>
                      <p className="text-white/50 text-xs mt-0.5">
                        {typeInfo?.label || classItem.domainType}
                      </p>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="flex-shrink-0">
                        <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Create New Class Button */}
        {userClasses.length > 0 && (
          <div className="border-t border-white/10 p-3">
            <button
              onClick={() => {
                onClose();
                onCreateClass();
              }}
              className="w-full py-3 px-4 rounded-xl flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Plus className="w-5 h-5 text-white/80" />
              <span className="text-white font-medium text-sm">New Class</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
