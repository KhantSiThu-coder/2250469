import React, { useState, useEffect } from 'react';
import { ShoppingItem, ItemStatus } from './types';
import { ItemForm } from './components/ItemForm';
import { ItemCard } from './components/ItemCard';
import { 
  Plus, Search, ShoppingBag, Utensils, Coffee, Shirt, Monitor, 
  MoreHorizontal, ListFilter, SlidersHorizontal, Grid3X3, Grid2X2, RectangleHorizontal, 
  CheckCircle2, AlertCircle, PackageCheck
} from 'lucide-react';

const CATEGORIES = ['Cooking Ingredients', 'Food & Drinks', 'Clothing', 'Electronics', 'Others'];

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

type CardSize = 'small' | 'medium' | 'large';

const App: React.FC = () => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<ItemStatus[]>([]);
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({min: '', max: ''});
  
  // View State
  const [cardSize, setCardSize] = useState<CardSize>('medium');

  useEffect(() => {
    // In a real app, load from localStorage/DB here.
  }, []);

  const handleAddItem = (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const newItem: ShoppingItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    setIsFormOpen(false);
  };

  const handleUpdateItem = (itemData: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    if (!editingItem) return;
    setItems((prev) => 
      prev.map((item) => item.id === editingItem.id ? { ...item, ...itemData } : item)
    );
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const toggleItemStatus = (id: string, currentStatus: string) => {
    const newStatus: ItemStatus = currentStatus === 'to-buy' ? 'in-stock' : 'to-buy';
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const toggleStatusFilter = (status: ItemStatus) => {
    setActiveStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const filteredItems = items.filter((item) => {
    // 1. Text Search
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.store && item.store.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 2. Category Filter (Sidebar)
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    // 3. Status Filter (Top Bar)
    // If no statuses selected, show all. Otherwise check if item status is in list.
    const matchesStatus = activeStatuses.length === 0 || activeStatuses.includes(item.status);

    // 4. Price Filter
    let matchesPrice = true;
    if (isPriceFilterActive) {
      const p = item.price;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      
      if (p === null) {
        // Decide how to handle unknown price. Currently excluding if filter is active.
        // Or we could strictly say it doesn't match a numeric range.
        matchesPrice = false; 
      } else {
        matchesPrice = p >= min && p <= max;
      }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

  const categoriesToShow = selectedCategory === 'All' ? CATEGORIES : [selectedCategory];

  // Dynamic grid columns based on cardSize
  const getGridClasses = () => {
    switch (cardSize) {
      case 'small': return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
      case 'medium': return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
      case 'large': return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar / Mobile Tab Bar */}
      <div className="bg-white border-r border-gray-200 md:w-64 flex-shrink-0 flex md:flex-col justify-start p-2 md:p-4 fixed md:relative bottom-0 w-full z-20 md:h-screen shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:shadow-none overflow-x-auto md:overflow-visible">
        <div className="hidden md:flex items-center gap-2 mb-8 px-2 text-indigo-600">
          <ShoppingBag size={28} />
          <h1 className="text-2xl font-bold tracking-tight">SmartShop</h1>
        </div>

        <nav className="flex md:flex-col gap-2 w-max md:w-full px-2 md:px-0 pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex-none flex items-center gap-2 p-3 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === 'All' 
                ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <ListFilter size={20} />
            <span className="text-sm">All Items</span>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 md:hidden"></div>
          <div className="h-px w-full bg-gray-200 my-2 hidden md:block"></div>

          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-none flex items-center gap-2 p-3 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-indigo-50 text-indigo-600 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {getCategoryIcon(cat)}
              <span className="text-sm">{cat}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0 relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 flex flex-col">
          {/* Top Row: Brand (Mobile) + Search */}
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="md:hidden flex items-center gap-2 text-indigo-600">
              <ShoppingBag size={24} />
            </div>
            
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Filter & View Controls Bar */}
          <div className="px-4 pb-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 mr-auto overflow-x-auto no-scrollbar mask-gradient">
               <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Filter:</span>
               
               {/* Status Filters */}
               <button 
                 onClick={() => toggleStatusFilter('to-buy')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('to-buy') 
                   ? 'bg-indigo-100 border-indigo-200 text-indigo-700' 
                   : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 <CheckCircle2 size={14} /> To Buy
               </button>
               
               <button 
                 onClick={() => toggleStatusFilter('low')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('low') 
                   ? 'bg-orange-100 border-orange-200 text-orange-700' 
                   : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 <AlertCircle size={14} /> Low Stock
               </button>

               <button 
                 onClick={() => toggleStatusFilter('in-stock')}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeStatuses.includes('in-stock') 
                   ? 'bg-green-100 border-green-200 text-green-700' 
                   : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 <PackageCheck size={14} /> In Stock
               </button>

               <div className="w-px h-6 bg-gray-200 mx-1"></div>

               {/* Price Filter Toggle */}
               <button 
                 onClick={() => setIsPriceFilterActive(!isPriceFilterActive)}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   isPriceFilterActive 
                   ? 'bg-blue-100 border-blue-200 text-blue-700' 
                   : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 <SlidersHorizontal size={14} /> Price
               </button>
            </div>

            {/* View Size Controls */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 ml-auto">
              <button 
                onClick={() => setCardSize('small')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'small' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Small View"
              >
                <Grid3X3 size={16} />
              </button>
              <button 
                onClick={() => setCardSize('medium')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'medium' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Medium View"
              >
                <Grid2X2 size={16} />
              </button>
              <button 
                onClick={() => setCardSize('large')}
                className={`p-1.5 rounded-md transition-all ${cardSize === 'large' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Large View"
              >
                <RectangleHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Expandable Price Range Panel */}
          {isPriceFilterActive && (
             <div className="px-4 pb-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
               <span className="text-xs font-semibold text-gray-500">Price Range (¥):</span>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" 
                   value={priceRange.min}
                   onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                   placeholder="Min"
                   className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
                 <span className="text-gray-400">-</span>
                 <input 
                   type="number" 
                   value={priceRange.max}
                   onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                   placeholder="Max"
                   className="w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
             </div>
          )}
        </header>

        {/* Scrollable List */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
              <ShoppingBag size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Try adjusting your filters or search query.</p>
              {items.length === 0 && (
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all"
                >
                  Create First Item
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {categoriesToShow.map((cat) => {
                const categoryItems = filteredItems.filter(i => i.category === cat);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={cat}>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      {getCategoryIcon(cat, 22)}
                      {cat}
                      <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {categoryItems.length}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 ml-4"></div>
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
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Floating Action Button */}
        {!isFormOpen && (
          <button
            onClick={() => { setEditingItem(null); setIsFormOpen(true); }}
            className="fixed right-6 bottom-24 md:bottom-8 z-30 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            aria-label="Add Item"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      {/* Slide-over Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFormOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full transform transition-transform duration-300">
            <ItemForm 
              initialData={editingItem || undefined}
              onSubmit={editingItem ? handleUpdateItem : handleAddItem}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
