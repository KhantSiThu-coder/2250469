import React, { useState, useEffect } from 'react';
import { ShoppingItem, MediaItem, ItemStatus } from '../types';
import { MediaUploader } from './MediaUploader';
import { analyzeItemImage } from '../services/geminiService';
import { Loader2, Sparkles, Save, X, Trash2 } from 'lucide-react';
import { TRANSLATIONS, Language, CATEGORY_KEYS, Currency } from '../constants';

interface ItemFormProps {
  initialData?: Partial<ShoppingItem>;
  onSubmit: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  lang?: Language;
  currencyCode?: Currency;
  currencySymbol?: string;
}

export const ItemForm: React.FC<ItemFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel, 
  onDelete,
  lang = 'en', 
  currencyCode = 'JPY',
  currencySymbol = '¥' 
}) => {
  const t = TRANSLATIONS[lang];
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || CATEGORY_KEYS[0]);
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [isPriceUnknown, setIsPriceUnknown] = useState(initialData?.price === null);
  const [store, setStore] = useState(initialData?.store || '');
  const [isStoreUnknown, setIsStoreUnknown] = useState(initialData?.store === null);
  const [status, setStatus] = useState<ItemStatus>(initialData?.status || 'to-buy');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [media, setMedia] = useState<MediaItem[]>(initialData?.media || []);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
     if (initialData?.category && !CATEGORY_KEYS.includes(initialData.category)) {
       setCategory('Others');
     }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      category,
      price: isPriceUnknown ? null : (parseFloat(price) || 0),
      store: isStoreUnknown ? null : store,
      status,
      notes,
      media,
    });
  };

  const handleAutoFill = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeItemImage(file, currencyCode);
      setName(result.name);
      
      const matchedCat = CATEGORY_KEYS.find(c => c.toLowerCase() === result.category.toLowerCase()) || 'Others';
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
    <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {initialData ? t.edit : t.create}
        </h2>
        <div className="flex items-center gap-2">
          {initialData?.id && onDelete && (
            <button 
              type="button" 
              onClick={() => {
                // Ensure ID exists before deletion attempt
                if (initialData.id) {
                   onDelete(initialData.id);
                   // Do not call onCancel() here; parent handles closing on successful delete
                }
              }} 
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors cursor-pointer"
              title={t.delete}
            >
              <Trash2 size={20} />
            </button>
          )}
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Media Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.mediaTitle}</label>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 mb-4 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
            <p>{t.uploadTip}</p>
          </div>
          <MediaUploader 
            media={media} 
            onMediaChange={setMedia} 
            onAnalyzeReq={handleAutoFill}
            lang={lang}
          />
          {isAnalyzing && (
            <div className="mt-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm animate-pulse">
              <Loader2 size={16} className="animate-spin" />
              <span>{t.analyzing}</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.nameLabel}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g., Milk, Batteries"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.catLabel}</label>
             <select
               value={category}
               onChange={(e) => setCategory(e.target.value)}
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             >
               {CATEGORY_KEYS.map(cat => (
                 <option key={cat} value={cat}>{t.categories[cat as keyof typeof t.categories] || cat}</option>
               ))}
             </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.priceLabel} ({currencySymbol})</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isPriceUnknown}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="unknownPrice" className="ml-2 text-sm text-gray-700 dark:text-gray-300 select-none">{t.dontKnow}</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.storeLabel}</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  disabled={isStoreUnknown}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={isStoreUnknown ? "-" : "e.g., Supermarket, Online"}
                />
              </div>
              <div className="flex items-center h-[42px]">
                <input
                  type="checkbox"
                  id="unknownStore"
                  checked={isStoreUnknown}
                  onChange={(e) => {
                    setIsStoreUnknown(e.target.checked);
                    if (e.target.checked) setStore('');
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="unknownStore" className="ml-2 text-sm text-gray-700 dark:text-gray-300 select-none">{t.dontKnow}</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.statusLabel}</label>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setStatus('to-buy')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'to-buy' 
                    ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.toBuy}
              </button>
              <button
                type="button"
                onClick={() => setStatus('low')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'low' 
                    ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.low}
              </button>
              <button
                type="button"
                onClick={() => setStatus('in-stock')}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  status === 'in-stock' 
                    ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.inStock}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.noteLabel}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Size, color, quantity, etc."
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
        >
          <Save size={20} />
          {t.save}
        </button>
      </div>
    </form>
  );
};
