import React, { useState, useEffect } from 'react';
import { ShoppingItem, MediaItem, ItemStatus } from '../types';
import { MediaUploader } from './MediaUploader';
import { analyzeItemImage } from '../services/geminiService';
import { Loader2, Sparkles, Save, X } from 'lucide-react';

interface ItemFormProps {
  initialData?: Partial<ShoppingItem>;
  onSubmit: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const CATEGORIES = ['Cooking Ingredients', 'Food & Drinks', 'Clothing', 'Electronics', 'Others'];

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || 'Cooking Ingredients');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [isPriceUnknown, setIsPriceUnknown] = useState(initialData?.price === null);
  const [store, setStore] = useState(initialData?.store || '');
  const [status, setStatus] = useState<ItemStatus>(initialData?.status || 'to-buy');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media || []);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
     if (initialData?.category && !CATEGORIES.includes(initialData.category)) {
       setCategory('Others');
     }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      price: isPriceUnknown ? null : (parseFloat(price) || 0),
      store,
      status,
      notes,
      media,
    });
  };

  const handleAutoFill = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeItemImage(file);
      setName(result.name);
      
      const matchedCat = CATEGORIES.find(c => c.toLowerCase() === result.category.toLowerCase()) || 'Others';
      setCategory(matchedCat);
      
      if (result.price !== null) {
        setPrice(result.price.toString());
        setIsPriceUnknown(false);
      } else {
        setPrice('');
        setIsPriceUnknown(true);
      }

      if (result.notes) {
        setNotes((prev) => prev ? `${prev}\nAI Note: ${result.notes}` : result.notes);
      }
    } catch (err) {
      console.error("Failed to analyze image", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800">
          {initialData ? 'Edit Item' : 'New Item'}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Media Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos & Videos</label>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-sm text-blue-800 flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
            <p>Upload a photo to automatically fill details using AI!</p>
          </div>
          <MediaUploader 
            media={media} 
            onMediaChange={setMedia} 
            onAnalyzeReq={handleAutoFill} 
          />
          {isAnalyzing && (
            <div className="mt-2 flex items-center gap-2 text-indigo-600 text-sm animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing image with Gemini...</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="e.g., Milk, Batteries"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
             <select
               value={category}
               onChange={(e) => setCategory(e.target.value)}
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
             >
               {CATEGORIES.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (¥)</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isPriceUnknown}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder={isPriceUnknown ? "-" : "0"}
                />
              </div>
              <div className="flex items-center h-[42px]">
                 <input 
                  type="checkbox" 
                  id="unknownPrice" 
                  checked={isPriceUnknown}
                  onChange={(e) => {
                    setIsPriceUnknown(e.target.checked);
                    if (e.target.checked) setPrice('');
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="unknownPrice" className="ml-2 text-sm text-gray-700 select-none">Don't know</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store / Location</label>
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., Supermarket, Online"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatus('to-buy')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'to-buy' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                To Buy
              </button>
              <button
                type="button"
                onClick={() => setStatus('low')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'low' 
                    ? 'bg-white text-orange-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Low
              </button>
              <button
                type="button"
                onClick={() => setStatus('in-stock')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'in-stock' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                In Stock
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Size, color, quantity, etc."
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t bg-gray-50">
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          Save Item
        </button>
      </div>
    </form>
  );
};
