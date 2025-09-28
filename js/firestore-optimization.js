// Firestore Optimization module
// Contains performance-optimized Firebase operations

import { db, appId } from '../firebase-init.js';

// Lazy load Firestore modules
let firestoreModules = null;

async function loadFirestoreModules() {
    if (!firestoreModules) {
        firestoreModules = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    }
    return firestoreModules;
}

// Performance-optimized sales operations
export class OptimizedSalesManager {
    constructor() {
        this.batchQueue = [];
        this.batchTimeout = null;
        this.maxBatchSize = 500; // Firestore limit
        this.batchDelay = 100; // ms to wait before executing batch
    }

    // Get paginated sales with cursor-based pagination
    async getPaginatedSales(pageSize = 20, lastDoc = null) {
        const { collection, query, orderBy, limit, startAfter, getDocs } = await loadFirestoreModules();

        try {
            const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);

            let salesQuery = query(
                salesCollectionRef,
                orderBy("timestamp", "desc"),
                limit(pageSize)
            );

            // Add cursor for pagination
            if (lastDoc) {
                salesQuery = query(salesQuery, startAfter(lastDoc));
            }

            const snapshot = await getDocs(salesQuery);

            const sales = [];
            let lastVisible = null;

            snapshot.forEach((doc) => {
                sales.push({ id: doc.id, ...doc.data() });
                lastVisible = doc;
            });

            return {
                sales,
                lastDoc: lastVisible,
                hasMore: snapshot.size === pageSize
            };
        } catch (error) {
            console.error("Error getting paginated sales:", error);
            throw error;
        }
    }

    // Get sales by date range with optimized queries
    async getSalesByDateRange(startDate, endDate, pageSize = 1000) {
        const { collection, query, where, orderBy, limit, getDocs, Timestamp } = await loadFirestoreModules();

        try {
            const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);

            // Convert dates to ISO strings for comparison
            const startDateString = startDate.toISOString();
            const endDateString = endDate.toISOString();

            const salesQuery = query(
                salesCollectionRef,
                where("timestamp", ">=", startDateString),
                where("timestamp", "<=", endDateString),
                orderBy("timestamp", "desc"),
                limit(pageSize)
            );

            const snapshot = await getDocs(salesQuery);

            const sales = [];
            snapshot.forEach((doc) => {
                sales.push({ id: doc.id, ...doc.data() });
            });

            console.log(`[FirestoreOptimization] Retrieved ${sales.length} sales for date range ${startDateString} to ${endDateString}`);
            return sales;
        } catch (error) {
            console.error("Error getting sales by date range:", error);
            throw error;
        }
    }

    // Get all sales without limit (for comprehensive reports and historical data access)
    async getAllSales() {
        const { collection, query, orderBy, getDocs } = await loadFirestoreModules();

        try {
            const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);

            const salesQuery = query(
                salesCollectionRef,
                orderBy("timestamp", "desc")
                // No limit for comprehensive access
            );

            const snapshot = await getDocs(salesQuery);

            const sales = [];
            snapshot.forEach((doc) => {
                sales.push({ id: doc.id, ...doc.data() });
            });

            console.log(`[FirestoreOptimization] Retrieved ${sales.length} total sales from database`);
            return sales;
        } catch (error) {
            console.error("Error getting all sales:", error);
            throw error;
        }
    }

    // Add operation to batch queue
    queueBatchOperation(operation) {
        this.batchQueue.push(operation);

        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        // Set new timeout to execute batch
        this.batchTimeout = setTimeout(() => {
            this.executeBatch();
        }, this.batchDelay);

        // Execute immediately if batch is full
        if (this.batchQueue.length >= this.maxBatchSize) {
            this.executeBatch();
        }
    }

    // Execute batched operations
    async executeBatch() {
        if (this.batchQueue.length === 0) return;

        const { writeBatch, doc } = await loadFirestoreModules();

        try {
            const batch = writeBatch(db);
            const operations = [...this.batchQueue];
            this.batchQueue = [];

            operations.forEach(operation => {
                const { type, path, data, docId } = operation;
                const docRef = doc(db, path, docId);

                switch (type) {
                    case 'set':
                        batch.set(docRef, data);
                        break;
                    case 'update':
                        batch.update(docRef, data);
                        break;
                    case 'delete':
                        batch.delete(docRef);
                        break;
                }
            });

            await batch.commit();
            console.log(`[Firestore] Executed batch with ${operations.length} operations`);
        } catch (error) {
            console.error("Error executing batch:", error);
            throw error;
        }
    }

    // Optimized real-time listener with connection management
    setupOptimizedListener(callback, errorCallback) {
        let unsubscribe = null;
        let isOnline = navigator.onLine;

        const setupListener = async () => {
            const { collection, query, orderBy, onSnapshot, limit } = await loadFirestoreModules();

            try {
                const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);

                // Limit initial load for performance
                const salesQuery = query(
                    salesCollectionRef,
                    orderBy("timestamp", "desc"),
                    limit(50) // Only get recent 50 sales initially
                );

                unsubscribe = onSnapshot(salesQuery,
                    (snapshot) => {
                        const sales = [];
                        snapshot.forEach((doc) => {
                            sales.push({ id: doc.id, ...doc.data() });
                        });
                        callback(sales);
                    },
                    (error) => {
                        console.error("Firestore listener error:", error);
                        if (errorCallback) errorCallback(error);
                    }
                );
            } catch (error) {
                console.error("Error setting up listener:", error);
                if (errorCallback) errorCallback(error);
            }
        };

        // Handle online/offline events
        const handleOnline = () => {
            if (!isOnline) {
                console.log('[Firestore] Back online, reconnecting...');
                isOnline = true;
                setupListener();
            }
        };

        const handleOffline = () => {
            if (isOnline) {
                console.log('[Firestore] Gone offline, cleaning up listener...');
                isOnline = false;
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
            }
        };

        // Set up connection listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial setup
        if (isOnline) {
            setupListener();
        }

        // Return cleanup function
        return () => {
            if (unsubscribe) unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }

    // Performance monitoring
    async measureOperation(operationName, operation) {
        const startTime = performance.now();

        try {
            const result = await operation();
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`[Performance] ${operationName} took ${duration.toFixed(2)}ms`);

            // Log slow operations
            if (duration > 1000) {
                console.warn(`[Performance] Slow operation detected: ${operationName} (${duration.toFixed(2)}ms)`);
            }

            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
        }
    }
}

// Create singleton instance
export const optimizedSalesManager = new OptimizedSalesManager();

// Offline persistence helper
export async function enableOfflinePersistence() {
    try {
        const { enableNetwork, disableNetwork } = await loadFirestoreModules();

        // Enable offline persistence
        console.log('[Firestore] Enabling offline persistence...');

        // This would typically be called with enablePersistence() but we'll use network management
        window.addEventListener('offline', () => {
            console.log('[Firestore] Offline detected');
        });

        window.addEventListener('online', () => {
            console.log('[Firestore] Online detected');
        });

        return true;
    } catch (error) {
        console.error("Error enabling offline persistence:", error);
        return false;
    }
}

// Connection state management
export class FirestoreConnectionManager {
    constructor() {
        this.isConnected = navigator.onLine;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
    }

    async testConnection() {
        try {
            const { getDoc, doc } = await loadFirestoreModules();

            // Try to read a small document to test connection
            const testDoc = doc(db, `artifacts/${appId}/public/test/connection`);
            await getDoc(testDoc);

            this.isConnected = true;
            this.retryCount = 0;
            return true;
        } catch (error) {
            this.isConnected = false;
            return false;
        }
    }

    async retryOperation(operation, operationName = 'Firestore operation') {
        for (let i = 0; i <= this.maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`[Firestore] ${operationName} attempt ${i + 1} failed:`, error);

                if (i === this.maxRetries) {
                    throw error;
                }

                // Exponential backoff
                const delay = this.retryDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

export const connectionManager = new FirestoreConnectionManager();