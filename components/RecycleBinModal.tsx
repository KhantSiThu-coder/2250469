import React from 'react';
import { ShoppingItem } from '../types';
import { TRANSLATIONS, Language } from '../constants';
import { X, Trash2, RotateCcw, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  onEmptyBin: () => void;
  lang?: Language;
  currencySymbol?: string;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  items,
  onRestore,
  onDeletePermanent,
  onEmptyBin,
  lang = 'en',
  currencySymbol = '¥'
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] transform transition-all">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.recycleBin}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500 text-center">
              <Trash2 size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{t.noTrashItems}</p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm mb-4">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{t.trashTip}</p>
               </div>

              {items.map((item) => {
                const coverMedia = item.media.length > 0 ? item.media[0] : null;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                      {coverMedia ? (
                        coverMedia.type === 'image' ? (
                          <img src={coverMedia.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <video src={coverMedia.url} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.price !== null ? `${currencySymbol}${item.price.toLocaleString()}` : '-'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRestore(item.id)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title={t.restore}
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => onDeletePermanent(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title={t.deletePermanently}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            <button
              onClick={() => {
                if(window.confirm(t.confirmDelete)) onEmptyBin();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {t.emptyBin}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
