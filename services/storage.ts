import { ShoppingItem, MediaItem } from '../types';

const DB_NAME = 'SmartShopDB';
const STORE_NAME = 'items';
const DB_VERSION = 1;

/**
 * Open (or create) the IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("IndexedDB error: " + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with 'id' as the key
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Request Persistent Storage
 * This asks the browser to treat this origin's storage as critical
 * and not evict it when disk space is low.
 */
export const initStoragePersistence = async (): Promise<boolean> => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      return true;
    }
    const granted = await navigator.storage.persist();
    return granted;
  }
  return false;
};

/**
 * Get Storage Estimation
 * Returns usage and quota in bytes.
 */
export const getStorageEstimate = async (): Promise<{usage: number, quota: number} | null> => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return null;
};

/**
 * Save a single item (inserts or updates)
 * We store the 'file' object (Blob) directly in IndexedDB
 */
export const saveItemToDB = async (item: ShoppingItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // We must clone the item to avoid mutating the state reference
    // We strip the 'url' property because blob: URLs are temporary and expire on refresh.
    // We rely on the 'file' property (Blob/File) to regenerate URLs on load.
    const itemToStore = {
      ...item,
      media: item.media.map(m => ({
        id: m.id,
        type: m.type,
        // Store the actual file binary
        file: m.file 
      }))
    };

    const request = store.put(itemToStore);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete an item from the DB
 */
export const deleteItemFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Load all items from the DB
 * Re-creates ephemeral blob URLs from the stored files
 */
export const loadItemsFromDB = async (): Promise<ShoppingItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result as any[]; // Raw data from DB
      
      // Revive the items by creating new Blob URLs for the stored files
      const revivedItems: ShoppingItem[] = items.map(item => ({
        ...item,
        media: (item.media || []).map((m: any) => ({
          ...m,
          // Generate a new display URL from the stored File/Blob
          url: m.file ? URL.createObjectURL(m.file) : ''
        }))
      }));

      // Sort by creation date (newest first)
      revivedItems.sort((a, b) => b.createdAt - a.createdAt);
      resolve(revivedItems);
    };
    request.onerror = () => reject(request.error);
  });
};
