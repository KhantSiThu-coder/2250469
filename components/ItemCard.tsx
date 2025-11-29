import React from 'react';
import { ShoppingItem } from '../types';
import { MapPin, Check, ShoppingCart, Trash2 } from 'lucide-react';

interface ItemCardProps {
  item: ShoppingItem;
  onStatusToggle: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
  onClick: (item: ShoppingItem) => void;
  size?: 'small' | 'medium' | 'large';
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onStatusToggle, onDelete, onClick, size = 'medium' }) => {
  const coverMedia = item.media.length > 0 ? item.media[0] : null;

  const getStatusBadge = () => {
    const baseClasses = "rounded-md font-semibold backdrop-blur-md text-white shadow-sm";
    const sizeClasses = size === 'small' ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
    
    switch (item.status) {
      case 'to-buy':
        return <span className={`${baseClasses} ${sizeClasses} bg-indigo-500/90`}>To Buy</span>;
      case 'in-stock':
        return <span className={`${baseClasses} ${sizeClasses} bg-green-500/90`}>In Stock</span>;
      case 'low':
        return <span className={`${baseClasses} ${sizeClasses} bg-orange-500/90`}>Low</span>;
    }
  };

  const getActionButton = () => {
    const isToBuy = item.status === 'to-buy';
    const Label = isToBuy ? "Mark Bought" : "Add to List";
    const Icon = isToBuy ? Check : ShoppingCart;
    const baseColor = isToBuy ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100";
    
    if (size === 'small') {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onStatusToggle(item.id, item.status); }}
          className={`w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${baseColor}`}
          title={Label}
        >
          <Icon size={14} />
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.stopPropagation(); onStatusToggle(item.id, item.status); }}
        className={`w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${baseColor}`}
      >
        <Icon size={16} /> {Label}
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col h-full`}>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        className="absolute top-2 right-2 z-20 p-1.5 bg-white/80 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 size={14} />
      </button>

      <div onClick={() => onClick(item)} className="cursor-pointer flex-1">
        <div className={`w-full bg-gray-100 relative overflow-hidden ${size === 'large' ? 'aspect-video' : 'aspect-[4/3]'}`}>
          {coverMedia ? (
             coverMedia.type === 'image' ? (
              <img src={coverMedia.url} alt={item.name} className="w-full h-full object-cover" />
             ) : (
               <video src={coverMedia.url} className="w-full h-full object-cover" />
             )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingCart size={size === 'small' ? 24 : 32} />
            </div>
          )}
          
          {item.media.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
              +{item.media.length - 1}
            </div>
          )}
          
          <div className="absolute top-2 left-2 z-10">
            {getStatusBadge()}
          </div>
        </div>

        <div className={`${size === 'small' ? 'p-2' : 'p-4'}`}>
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className={`font-semibold text-gray-900 line-clamp-1 ${size === 'large' ? 'text-lg' : 'text-sm'}`}>
              {item.name}
            </h3>
            <span className={`font-medium whitespace-nowrap ${
              item.price === null ? 'text-gray-400 italic text-xs' : 'text-gray-900'
            } ${size === 'large' ? 'text-base' : 'text-sm'}`}>
              {item.price !== null ? `¥${item.price.toLocaleString()}` : 'Unk.'}
            </span>
          </div>
          
          {/* Hide secondary details on small cards to keep them clean */}
          {size !== 'small' && (
            <>
              <div className="space-y-1">
                {item.store && (
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin size={12} className="mr-1.5" />
                    <span className="truncate">{item.store}</span>
                  </div>
                )}
              </div>
              
              {item.notes && (
                 <p className={`mt-2 text-xs text-gray-500 line-clamp-2 italic border-l-2 border-gray-200 pl-2 ${size === 'large' ? 'line-clamp-4' : ''}`}>
                   {item.notes}
                 </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`${size === 'small' ? 'px-2 pb-2' : 'px-4 pb-4'} pt-0 mt-auto`}>
        {getActionButton()}
      </div>
    </div>
  );
};
