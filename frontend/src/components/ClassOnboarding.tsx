import React, { useState } from 'react';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { DomainType } from '../types';
import { DOMAIN_TYPE_INFO } from '../constants/domains';

interface ClassOnboardingProps {
  onCreateClass: (name: string, type: DomainType, description: string) => Promise<void>;
  onSkip?: () => void;
}

export const ClassOnboarding: React.FC<ClassOnboardingProps> = ({
  onCreateClass,
  onSkip,
}) => {
  const [step, setStep] = useState<'welcome' | 'create'>('welcome');
  const [formData, setFormData] = useState({
    name: '',
    type: null as DomainType | null,
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.name || !formData.type) return;

    setIsCreating(true);
    try {
      await onCreateClass(formData.name, formData.type, formData.description);
      // Component will unmount after successful creation
    } catch (error) {
      console.error('Failed to create class:', error);
      alert('Failed to create class. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content Card */}
      <div
        className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {step === 'welcome' ? (
          /* Welcome Step */
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BookOpen className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to RAG Scholar
            </h1>

            {/* Subtitle */}
            <p className="text-white/70 text-base mb-8 leading-relaxed">
              To get started, you'll need to create your first class. Classes help you organize your documents and conversations by subject.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Organize by Subject</h3>
                  <p className="text-white/60 text-xs mt-1">
                    Keep your documents and chats organized by class or topic
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Specialized AI Context</h3>
                  <p className="text-white/60 text-xs mt-1">
                    Get more accurate responses tailored to your class domain
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Easy Switching</h3>
                  <p className="text-white/60 text-xs mt-1">
                    Quickly switch between classes from any screen
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setStep('create')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] text-white font-semibold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow flex items-center justify-center space-x-2"
            >
              <span>Create Your First Class</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* Create Class Step */
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Create a Class</h2>
              <p className="text-white/60 text-sm">
                Tell us about the subject you want to study
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
              {/* Class Name */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Biology 101, Constitutional Law"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
                  disabled={isCreating}
                />
              </div>

              {/* Domain Type */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Domain Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DOMAIN_TYPE_INFO).map(([key, info]) => {
                    const Icon = info.icon;
                    const isSelected = formData.type === key;
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          setFormData({ ...formData, type: key as DomainType })
                        }
                        disabled={isCreating}
                        className={`p-3 rounded-xl flex flex-col items-center space-y-1 transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] shadow-lg shadow-purple-500/30'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                        <span className="text-white text-xs text-center leading-tight">
                          {info.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add a brief description..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/40 border border-white/10 focus:border-white/30 focus:outline-none transition-colors resize-none"
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCreate}
                disabled={!formData.name || !formData.type || isCreating}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] text-white font-semibold text-base shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isCreating ? 'Creating...' : 'Create Class'}
              </button>

              {onSkip && (
                <button
                  onClick={onSkip}
                  disabled={isCreating}
                  className="w-full py-3 px-6 rounded-xl text-white/60 hover:text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
