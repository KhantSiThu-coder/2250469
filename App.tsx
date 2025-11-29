import React, { useState, useEffect } from 'react';
import { ShoppingItem, ItemStatus } from './types';
import { ItemForm } from './components/ItemForm';
import { ItemCard } from './components/ItemCard';
import { RecycleBinModal } from './components/RecycleBinModal';
import { loadItemsFromDB, saveItemToDB, deleteItemFromDB, initStoragePersistence, getStorageEstimate } from './services/storage';
import { 
  Plus, Search, ShoppingBag, Utensils, Coffee, Shirt, Monitor, 
  MoreHorizontal, ListFilter, SlidersHorizontal, Grid3X3, Grid2X2, RectangleHorizontal, 
  CheckCircle2, AlertCircle, PackageCheck, Settings, X, Moon, Sun, MonitorSmartphone, Languages,
  Coins, Trash2, Undo2, Database, HardDrive
} from 'lucide-react';
import { TRANSLATIONS, Language, CATEGORY_KEYS, Currency, CURRENCY_OPTIONS } from './constants';

// Helper to get icon for category
const getCategoryIcon = (category: string, size: number = 20) => {
  switch (category) {
    case 'Cooking Ingredients': return <Utensils size={size} />;
    case 'Food & Drinks': return <Coffee size={size} />;
    case 'Clothing': return <Shirt size={size} />;
    case 'Electronics': return <Monitor size={size} />;
    default: return <MoreHorizontal size={size} />;
  }
};

// Helper to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

type CardSize = 'small' | 'medium' | 'large';
type Theme = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  
  // Settings State
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('system');
  const [currency, setCurrency] = useState<Currency>('JPY');
  
  // Storage Stats
  const [storageStats, setStorageStats] = useState<{usage: number, quota: number} | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<ItemStatus[]>([]);
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({min: '', max: ''});
  
  // View State
  const [cardSize, setCardSize] = useState<CardSize>('medium');

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

  const t = TRANSLATIONS[language];
  const currencySymbol = CURRENCY_OPTIONS.find(c => c.value === currency)?.symbol || '¥';

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load items from IndexedDB and Request Persistence
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Request persistent storage
        await initStoragePersistence();
        
        const storedItems = await loadItemsFromDB();
        
        // Filter out items that have been in trash for > 30 days
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const validItems = storedItems.filter(item => {
          if (!item.deletedAt) return true;
          if (Date.now() - item.deletedAt > THIRTY_DAYS_MS) {
            // Cleanup: remove very old items from DB entirely
            deleteItemFromDB(item.id).catch(console.error);
            return false;
          }
          return true;
        });

        setItems(validItems);
      } catch (error) {
        console.error("Failed to load items from DB:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Update storage stats when settings open
  useEffect(() => {
    if (isSettingsOpen) {
      getStorageEstimate().then(setStorageStats);
    }
  }, [isSettingsOpen]);

  const handleAddItem = async (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const newItem: ShoppingItem = {
      ...itemData,
      id: generateId(),
      createdAt: Date.now(),
    };
    
    // Update UI immediately
    setItems((prev) => [newItem, ...prev]);
    setIsFormOpen(false);

    // Persist to DB
    try {
      await saveItemToDB(newItem);
    } catch (e) {
      console.error("Failed to save item:", e);
      alert("Failed to save to device storage.");
    }
  };

  const handleUpdateItem = async (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    if (!editingItem) return;
    
    // Optimistic Update
    const updatedItem = { ...editingItem, ...itemData };
    
    setItems((prev) => 
      prev.map((item) => item.id === editingItem.id ? updatedItem : item)
    );
    setEditingItem(null);
    setIsFormOpen(false);

    // Persist to DB
    try {
      await saveItemToDB(updatedItem);
    } catch (e) {
      console.error("Failed to update item:", e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    console.log("Moving item to trash:", id);
    
    // 1. Find the item to update it
    const itemToDelete = items.find(i => i.id === id);
    if (!itemToDelete) return;

    const deletedItem = { ...itemToDelete, deletedAt: Date.now() };

    // 2. Update State
    setItems((prev) => 
      prev.map((i) => i.id === id ? deletedItem : i)
    );
    
    // 3. Update DB
    await saveItemToDB(deletedItem);

    // Store ID for undo
    setLastDeletedId(id);
    
    // Show feedback toast
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);

    // Close form if open
    if (editingItem && editingItem.id === id) {
      setEditingItem(null);
      setIsFormOpen(false);
    }
  };

  const handleRestoreItem = async (id: string) => {
    const itemToRestore = items.find(i => i.id === id);
    if (!itemToRestore) return;

    const restoredItem = { ...itemToRestore, deletedAt: undefined };

    setItems((prev) => 
      prev.map((i) => i.id === id ? restoredItem : i)
    );
    
    await saveItemToDB(restoredItem);
  };

  const handleUndoDelete = () => {
    if (lastDeletedId) {
      handleRestoreItem(lastDeletedId);
      setShowToast(false);
      setLastDeletedId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItemFromDB(id);
  };

  const handleEmptyBin = async () => {
    const itemsToDelete = items.filter(i => i.deletedAt);
    setItems((prev) => prev.filter((i) => !i.deletedAt));
    
    // Delete all trash items from DB
    for (const item of itemsToDelete) {
      await deleteItemFromDB(item.id);
    }
  };

  const toggleItemStatus = async (id: string, currentStatus: string) => {
    const newStatus: ItemStatus = currentStatus === 'to-buy' ? 'in-stock' : 'to-buy';
    
    const item = items.find(i => i.id === id);
    if (item) {
      const updatedItem = { ...item, status: newStatus };
      setItems((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));
      await saveItemToDB(updatedItem);
    }
  };

  const toggleStatusFilter = (status: ItemStatus) => {
    setActiveStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const filteredItems = items.filter((item) => {
    // Exclude deleted items - This checks if deletedAt is truthy (number > 0)
    if (item.deletedAt) return false;

    // 1. Text Search
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.store && item.store.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Category Filter (Sidebar)
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    // 3. Status Filter (Top Bar)
    const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(item.status);

    // 4. Price Filter
    let matchesPrice = true;
    if (isPriceFilterActive) {
      const p = item.price;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      
      if (p === null) {
        matchesPrice = false; 
      } else {
        matchesPrice = p >= min && p <= max;
      }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

  const trashItems = items.filter(item => item.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));

  const categoriesToShow = selectedCategory === 'All' ? CATEGORY_KEYS : [selectedCategory];

  // Dynamic grid columns based on cardSize
  const getGridClasses = () => {
    switch (cardSize) {
      case 'small': return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
      case 'medium': return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case 'large': return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-indigo-600 dark:text-indigo-400">
           <Database size={40} className="animate-bounce" />
           <p className="font-medium">Loading your list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row font-sans text-gray-900 dark:text-white transition-colors duration-200">
      {/* Sidebar / Mobile Tab Bar */}
      <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 md:w-64 flex-shrink-0 flex md:flex-col justify-start p-2 md:p-4 fixed md:relative bottom-0 w-full z-20 md:h-screen shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:shadow-none overflow-x-auto md:overflow-visible transition-colors duration-200">
        <div className="hidden md:flex items-center gap-2 mb-8 px-2 text-indigo-600 dark:text-indigo-400">
          <ShoppingBag size={28} />
          <h1 className="text-2xl font-bold tracking-tight">{t.appName}</h1>
        </div>

        <nav className="flex md:flex-col gap-2 w-max md:w-full px-2 md:px-0 pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex-none flex items-center gap-2 p-3 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === 'All' 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ListFilter size={20} />
            <span className="text-sm">{t.all}</span>
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 md:hidden"></div>
          <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-2 hidden md:block"></div>

          {CATEGORY_KEYS.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-none flex items-center gap-2 p-3 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {getCategoryIcon(cat)}
              <span className="text-sm">{t.categories[cat as keyof typeof t.categories] || cat}</span>
            </button>
          ))}
        </nav>

        {/* Settings Button (Desktop: Bottom, Mobile: Top Right in Header) */}
        <div className="hidden md:block mt-auto">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <Settings size={20} />
            <span className="text-sm">{t.settings}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0 relative">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 flex flex-col transition-colors duration-200">
          {/* Top Row: Brand (Mobile) + Search */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="md:hidden flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <ShoppingBag size={24} />
            </div>
            
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder={t.search} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Filter & View Controls Bar */}
          <div className="px-4 pb-3 flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-2 mr-auto overflow-x-auto no-scrollbar mask-gradient">
               <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">{t.filter}</span>
               
               {/* Status Filters */}
               <button 
                 onClick={() => toggleStatusFilter('to-buy')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('to-buy') 
                   ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300' 
                   : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                 }`}
               >
                 <CheckCircle2 size={14} /> {t.toBuy}
               </button>
               
               <button 
                 onClick={() => toggleStatusFilter('low')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('low') 
                   ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800 dark:text-orange-300' 
                   : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                 }`}
               >
                 <AlertCircle size={14} /> {t.low}
               </button>

               <button 
                 onClick={() => toggleStatusFilter('in-stock')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('in-stock') 
                   ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/40 dark:border-green-800 dark:text-green-300' 
                   : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                 }`}
               >
                 <PackageCheck size={14} /> {t.inStock}
               </button>

               <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

               {/* Price Filter Toggle */}
               <button 
                 onClick={() => setIsPriceFilterActive(!isPriceFilterActive)}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   isPriceFilterActive 
                   ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300' 
                   : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                 }`}
               >
                 <SlidersHorizontal size={14} /> {t.price}
               </button>
            </div>

            {/* View Size Controls */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 ml-auto">
              <button 
                onClick={() => setCardSize('small')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'small' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Small View"
              >
                <Grid3X3 size={16} />
              </button>
              <button 
                onClick={() => setCardSize('medium')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'medium' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Medium View"
              >
                <Grid2X2 size={16} />
              </button>
              <button 
                onClick={() => setCardSize('large')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'large' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title="Large View"
              >
                <RectangleHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Expandable Price Range Panel */}
          {isPriceFilterActive && (
             <div className="px-4 pb-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
               <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.priceRange} ({currencySymbol}):</span>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" 
                   value={priceRange.min}
                   onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                   placeholder={t.min}
                   className="w-20 px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white"
                 />
                 <span className="text-gray-400">-</span>
                 <input 
                   type="number" 
                   value={priceRange.max}
                   onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                   placeholder={t.max}
                   className="w-20 px-2 py-1 text-sm border dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white"
                 />
               </div>
             </div>
          )}
        </header>

        {/* Scrollable List */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
          {filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center min-h-[300px]">
              <ShoppingBag size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">{t.noItems}</p>
              <p className="text-sm">{t.emptyState}</p>
              {items.filter(i => !i.deletedAt).length === 0 && (
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 dark:shadow-none transition-all"
                >
                  {t.createFirst}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8 flex-1">
              {categoriesToShow.map((cat) => {
                const categoryItems = filteredItems.filter(i => i.category === cat);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={cat}>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                      {getCategoryIcon(cat, 22)}
                      {t.categories[cat as keyof typeof t.categories] || cat}
                      <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {categoryItems.length}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-4"></div>
                    </h2>
                    <div className={`grid gap-4 md:gap-6 ${getGridClasses()}`}>
                      {categoryItems.map((item) => (
                        <ItemCard 
                          key={item.id} 
                          item={item} 
                          size={cardSize}
                          onStatusToggle={toggleItemStatus}
                          onDelete={handleDeleteItem}
                          onClick={(i) => { setEditingItem(i); setIsFormOpen(true); }}
                          lang={language}
                          currencySymbol={currencySymbol}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 py-8 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800">
            <p>{t.footerCreatedBy} <span className="font-semibold text-gray-900 dark:text-gray-200">Khant Si Thu</span>.</p>
            <p className="mt-1">
              {t.footerEmailPrompt}{" "}
              <a 
                href="mailto:khantsithu.1999.work@gmail.com" 
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline decoration-2 underline-offset-2"
              >
                {t.footerClickHere}
              </a>
            </p>
          </footer>
        </main>

        {/* Floating Action Button */}
        {!isFormOpen && !isSettingsOpen && (
          <button
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="fixed right-6 bottom-24 md:bottom-8 z-30 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            aria-label="Add Item"
          >
            <Plus size={24} />
          </button>
        )}

        {/* Undo Notification Toast */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-5 py-3 rounded-xl shadow-xl z-[100] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
            <span className="font-medium">{t.itemMovedToTrash}</span>
            <div className="h-4 w-px bg-white/20 dark:bg-black/20"></div>
            <button 
              onClick={handleUndoDelete} 
              className="flex items-center gap-1.5 text-indigo-400 dark:text-indigo-600 font-bold hover:underline"
            >
              <Undo2 size={16} />
              {t.undo}
            </button>
          </div>
        )}
      </div>

      {/* Slide-over Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFormOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl h-full transform transition-transform duration-300">
            <ItemForm 
              initialData={editingItem || undefined}
              onSubmit={editingItem ? handleUpdateItem : handleAddItem}
              onCancel={() => setIsFormOpen(false)}
              onDelete={handleDeleteItem}
              lang={language}
              currencyCode={currency}
              currencySymbol={currencySymbol}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <Settings className="text-indigo-600 dark:text-indigo-400" />
                {t.settings}
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Storage Stats */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                   <HardDrive size={16} />
                   {t.storage}
                 </label>
                 <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                    {storageStats ? (
                      <>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {formatBytes(storageStats.usage)} {t.used}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">
                            {formatBytes(storageStats.quota)} {t.available}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.min((storageStats.usage / storageStats.quota) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </>
                    ) : (
                      <div className="h-6 w-full animate-pulse bg-gray-200 dark:bg-gray-600 rounded"></div>
                    )}
                 </div>
              </div>

              {/* Language Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Languages size={16} />
                  {t.language}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="zh">中文</option>
                  <option value="my">မြန်မာ</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              {/* Currency Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Coins size={16} />
                  {t.currency}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Theme Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MonitorSmartphone size={16} />
                  {t.theme}
                </label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      theme === 'light' 
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Sun size={18} />
                    {t.light}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      theme === 'dark' 
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Moon size={18} />
                    {t.dark}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      theme === 'system' 
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <MonitorSmartphone size={18} />
                    {t.system}
                  </button>
                </div>
              </div>

              {/* Recycle Bin Button */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                 <button
                   onClick={() => {
                     setIsSettingsOpen(false);
                     setIsRecycleBinOpen(true);
                   }}
                   className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors group"
                 >
                   <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                     <Trash2 size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                     <span className="text-sm font-medium">{t.openRecycleBin}</span>
                   </div>
                   <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 text-xs flex items-center justify-center text-gray-600 dark:text-gray-300">
                      {trashItems.length}
                   </div>
                 </button>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        items={trashItems}
        onRestore={handleRestoreItem}
        onDeletePermanent={handlePermanentDelete}
        onEmptyBin={handleEmptyBin}
        lang={language}
        currencySymbol={currencySymbol}
      />
    </div>
  );
};

export default App;
