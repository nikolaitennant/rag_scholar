import React, { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  imageUrl: string;
}

interface Point {
  x: number;
  y: number;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Helper function to create cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to square
  const size = 400;
  canvas.width = size;
  canvas.height = size;

  // Create circular clip
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL('image/jpeg', 0.9);
};

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  imageUrl
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onCropAreaComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsLoading(true);
      const croppedImageUrl = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCropComplete(croppedImageUrl);
      onClose();
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setIsLoading(false);
    }
  }, [croppedAreaPixels, imageUrl, onCropComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Frosted glass backdrop */}
      <div
        className="absolute inset-0 bg-white/10"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(60px) saturate(180%) brightness(0.3)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%) brightness(0.3)'
        }}
      />

      {/* Modal */}
      <div
        className="relative rounded-3xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          background: 'rgba(28, 28, 30, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-medium text-white">Crop Photo</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="relative h-80">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropAreaComplete}
            style={{
              containerStyle: {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              },
              cropAreaStyle: {
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-full transition-all duration-200 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveImage}
            disabled={isLoading || !croppedAreaPixels}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};