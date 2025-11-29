import React, { useRef } from 'react';
import { MediaItem } from '../types';
import { X, Upload, Image as ImageIcon, Film } from 'lucide-react';

interface MediaUploaderProps {
  media: MediaItem[];
  onMediaChange: (newMedia: MediaItem[]) => void;
  onAnalyzeReq?: (file: File) => void;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ media, onMediaChange, onAnalyzeReq }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newMediaItems: MediaItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        type: file.type.startsWith('video') ? 'video' : 'image',
        url: URL.createObjectURL(file),
        file: file,
      }));

      // Trigger analysis on the first image if requested and it's an image
      if (onAnalyzeReq && newMediaItems.length > 0) {
        const firstImage = newMediaItems.find(m => m.type === 'image');
        if (firstImage && firstImage.file) {
          onAnalyzeReq(firstImage.file);
        }
      }

      onMediaChange([...media, ...newMediaItems]);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (id: string) => {
    onMediaChange(media.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {media.map((item) => (
          <div key={item.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            {item.type === 'image' ? (
              <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <video src={item.url} className="w-full h-full object-cover" controls />
            )}
            <button
              type="button"
              onClick={() => removeMedia(item.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
               {item.type === 'image' ? <ImageIcon size={10} /> : <Film size={10} />}
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-indigo-600"
        >
          <Upload size={24} className="mb-2" />
          <span className="text-xs font-medium">Add Media</span>
        </button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*"
        multiple
      />
    </div>
  );
};