// ... (código anterior de script.js) ...

function addCustomizedDrinkToTransaction() {
    if (currentDrinkBeingCustomized) {
        const quantity = parseInt(drinkQuantityInput.value, 10);
        if (isNaN(quantity) || quantity < 1) {
            showMessage('Cantidad Inválida', 'Por favor, introduce una cantidad válida (mínimo 1).');
            return;
        }

        currentDrinkBeingCustomized.quantity = quantity;

        const toppingIds = currentDrinkBeingCustomized.selectedToppings.map(t => t.id).sort().join(',');
        const uniqueKey = `${currentDrinkBeingCustomized.id}-${toppingIds}`;

        const existingTransactionItemIndex = currentTransaction.findIndex(item => {
            const existingToppingIds = item.toppings ? item.toppings.map(t => t.id).sort().join(',') : '';
            return item.id === currentDrinkBeingCustomized.id && existingToppingIds === toppingIds;
        });

        if (existingTransactionItemIndex > -1) {
            currentTransaction[existingTransactionItemIndex].quantity += quantity;
        } else {
            const transactionItem = {
                ...currentDrinkBeingCustomized,
                toppings: [...currentDrinkBeingCustomized.selectedToppings],
                transactionLineId: uniqueKey
            };
            delete transactionItem.selectedToppings;
            currentTransaction.push(transactionItem);
        }

        // CORRECCIÓN: Mover el showMessage ANTES de limpiar currentDrinkBeingCustomized
        showMessage('Producto Añadido', `Se añadieron ${quantity}x ${currentDrinkBeingCustomized.name} a la transacción.`);

        currentDrinkBeingCustomized = null; // Limpiar después de usarlo en showMessage
        toppingSelectionOverlay.classList.remove('show');
        if (lastFocusedElement) lastFocusedElement.focus();
    }
}

// ... (resto del código de script.js) ...

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    renderMenu();
    updateTransactionDisplay();
    
    // Escuchar el evento personalizado que indica que Firebase Auth está listo
    document.addEventListener('firebaseAuthReady', () => {
        // Actualizar las variables locales con los valores globales una vez que estén disponibles
        currentUserId = window.currentUserId;
        isAuthReady = window.isAuthReady;
        
        if (isAuthReady && window.db && currentUserId && appId) {
            console.log("POS Script: Firebase Auth está listo. Configurando listener de Firestore.");
            console.log("POS Script: ID de Usuario Actual:", currentUserId);
            
            const salesCollectionRef = collection(window.db, `artifacts/${appId}/users/${currentUserId}/dailySales`);
            const q = query(salesCollectionRef, orderBy("timestamp", "desc"));

            onSnapshot(q, (snapshot) => {
                dailySales = [];
                snapshot.forEach((doc) => {
                    dailySales.push({ id: doc.id, ...doc.data() });
                });
                console.log("Firestore: Ventas diarias actualizadas.", dailySales);
                
                if (isFilterEnabled) {
                    applySalesFilter();
                } else {
                    renderDailySales();
                }
            }, (error) => {
                console.error("Firestore: Error al obtener ventas diarias:", error);
                if (error.code === 'permission-denied') {
                    showMessage('Error de Permisos', 'No tienes permisos para cargar las ventas diarias. Por favor, verifica las reglas de seguridad de Firestore y tu estado de autenticación.');
                } else {
                    showMessage('Error de Sincronización', `No se pudieron cargar las ventas diarias desde la base de datos: ${error.message}.`);
                }
            });
        } else {
            console.warn("POS Script: Firebase o ID de usuario no listos, no se puede configurar el listener de Firestore. Mostrando solo datos locales.");
            renderDailySales();
            // Mostrar un mensaje al usuario si la autenticación falló al inicio
            // CORRECCIÓN: Solo mostrar si isAuthReady es false (indicando un fallo real de auth)
            if (!isAuthReady) { 
                showMessage('Problema de Autenticación', 'No se pudo establecer la conexión con la base de datos. Las ventas no se guardarán. Por favor, recarga la página o verifica la configuración de autenticación anónima en Firebase.');
            }
        }
    });
});
