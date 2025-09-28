import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Edit2, Save, X, User as UserIcon } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { ImageCropModal } from './ImageCropModal';
import { ProfileImageModal } from './ProfileImageModal';

interface ProfilePageProps {
  onBack: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const { user, userProfile, updateUserProfile, updateDisplayName, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: userProfile?.profile?.bio || '',
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setTempImageUrl(imageDataUrl);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      setIsSaving(true);
      await updateUserProfile({ profile_image: croppedImageUrl });
      await refreshUser();
      setSaveMessage('Profile photo updated successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile image:', error);
      setSaveMessage('Failed to update profile photo');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Update display name if changed
      if (formData.displayName !== user?.displayName) {
        await updateDisplayName(formData.displayName);
      }

      // Update profile bio if changed
      if (formData.bio !== userProfile?.profile?.bio) {
        await updateUserProfile({ bio: formData.bio });
      }

      await refreshUser();
      setIsEditing(false);
      setSaveMessage('Profile updated successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSaveMessage('Failed to update profile');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: user?.displayName || '',
      bio: userProfile?.profile?.bio || '',
    });
    setIsEditing(false);
  };

  return (
    <>
      <div
        className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-4"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          paddingTop: '8px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
        }}
      >
      {/* Profile Photo Section */}
      <div className="text-center py-4">
        <button
          onClick={() => setShowImageModal(true)}
          className="w-32 h-32 rounded-full overflow-hidden bg-white/10 hover:opacity-80 transition-all duration-200 group relative mx-auto shadow-lg"
        >
          {userProfile?.profile?.profile_image || user?.photoURL ? (
            <img
              src={userProfile?.profile?.profile_image || user?.photoURL || ''}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UserIcon className="w-12 h-12 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </button>
        <p className="ios-caption text-white/60 mt-3">Tap to view photo</p>
      </div>

      {/* Display Name */}
      <div className="px-2 py-1">
        <label className="ios-caption text-white/70 font-medium block mb-1">Display Name</label>
        <input
          type="text"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="Add display name"
          className="w-full border-none outline-none bg-transparent rounded-full px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
          style={{
            fontSize: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />
      </div>

      {/* Bio */}
      <div className="px-2 py-1">
        <label className="ios-caption text-white/70 font-medium block mb-1">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell others about yourself..."
          rows={4}
          className="w-full border-none outline-none bg-transparent rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 resize-none"
          style={{
            fontSize: '16px',
            lineHeight: '1.4',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        />
      </div>

      {/* Save Button */}
      <div className="pt-2 flex justify-center">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full ios-body font-medium transition-all duration-200 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Save Profile'
          )}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-2xl text-center ios-body font-medium ${
          saveMessage.includes('success')
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      </div>

      {/* Profile Image Modal */}
      <ProfileImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onChangePhoto={() => fileInputRef.current?.click()}
        imageUrl={userProfile?.profile?.profile_image || user?.photoURL || ''}
        userName={user?.displayName || user?.email || 'User'}
        showChangeButton={true}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        onCropComplete={handleCropComplete}
        imageUrl={tempImageUrl}
      />
    </>
  );
};