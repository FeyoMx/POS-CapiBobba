// Transaction Logic module
// Contains all transaction and sale related functions with performance optimizations

import { db, auth, appId } from '../firebase-init.js';
import { optimizedSalesManager, connectionManager } from './firestore-optimization.js';
import {
    currentTransaction,
    dailySales,
    editingSaleDocId,
    currentDiscountAmount,
    currentDrinkBeingCustomized,
    availableToppings,
    updateCurrentTransaction,
    updateEditingSaleDocId,
    updateCurrentDiscountAmount,
    updateCurrentDrinkBeingCustomized
} from './data-management.js';
import {
    toppingDrinkNameElement,
    toppingsModalGrid,
    drinkQuantityInput,
    toppingModalTotalPriceElement,
    toppingSelectionOverlay,
    discountInput
} from './dom-elements.js';
import { showMessage, trapFocus, closeDiscountModal } from './modals.js';

export function calculateToppingModalTotalPrice() {
    if (!currentDrinkBeingCustomized) return 0;

    let basePrice = currentDrinkBeingCustomized.price;
    let toppingsPrice = currentDrinkBeingCustomized.selectedToppings.reduce((sum, t) => sum + t.price, 0);
    let quantity = parseInt(drinkQuantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;

    return (basePrice + toppingsPrice) * quantity;
}

export function updateToppingModalTotalPriceDisplay() {
    const total = calculateToppingModalTotalPrice();
    toppingModalTotalPriceElement.textContent = total.toFixed(2);
}

export function openToppingSelectionModal(drinkItem) {
    const lastFocusedElement = document.activeElement;

    updateCurrentDrinkBeingCustomized({
        ...drinkItem,
        selectedToppings: [],
        quantity: 1
    });

    toppingDrinkNameElement.textContent = drinkItem.name;
    toppingsModalGrid.innerHTML = '';
    drinkQuantityInput.value = 1;

    availableToppings.forEach(topping => {
        const toppingItemDiv = document.createElement('div');
        toppingItemDiv.className = 'topping-modal-item';
        toppingItemDiv.dataset.toppingId = topping.id;
        toppingItemDiv.dataset.toppingName = topping.name;
        toppingItemDiv.dataset.toppingPrice = topping.price;
        toppingItemDiv.tabIndex = 0;
        toppingItemDiv.setAttribute('role', 'option');

        toppingItemDiv.innerHTML = `
            <span class="topping-modal-name">${topping.name}</span>
            <span class="topping-modal-price">+$${topping.price.toFixed(2)}</span>
            <button class="add-topping-button" data-action="add" aria-label="Añadir topping ${topping.name}">Añadir ✨</button>
        `;
        toppingItemDiv.addEventListener('click', function(event) {
            if (event.target.tagName === 'BUTTON') {
                return;
            }
            this.querySelector('.add-topping-button').click();
        });
        toppingItemDiv.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.querySelector('.add-topping-button').click();
            }
        });
        toppingsModalGrid.appendChild(toppingItemDiv);
    });

    toppingsModalGrid.querySelectorAll('.add-topping-button').forEach(button => {
        button.addEventListener('click', function() {
            const toppingItemDiv = this.closest('.topping-modal-item');
            const toppingId = toppingItemDiv.dataset.toppingId;
            const toppingName = toppingItemDiv.dataset.toppingName;
            const toppingPrice = parseFloat(toppingItemDiv.dataset.toppingPrice);

            const existingToppingIndex = currentDrinkBeingCustomized.selectedToppings.findIndex(t => t.id === toppingId);

            if (existingToppingIndex === -1) {
                currentDrinkBeingCustomized.selectedToppings.push({ id: toppingId, name: toppingName, price: toppingPrice });
                toppingItemDiv.classList.add('selected');
                this.textContent = 'Quitar ➖';
                this.dataset.action = 'remove';
                this.classList.add('remove');
                this.setAttribute('aria-label', `Quitar topping ${toppingName}`);
            } else {
                currentDrinkBeingCustomized.selectedToppings.splice(existingToppingIndex, 1);
                toppingItemDiv.classList.remove('selected');
                this.textContent = 'Añadir ✨';
                this.dataset.action = 'add';
                this.classList.remove('remove');
                this.setAttribute('aria-label', `Añadir topping ${toppingName}`);
            }
            updateToppingModalTotalPriceDisplay();
        });
    });

    updateToppingModalTotalPriceDisplay();
    toppingSelectionOverlay.classList.add('show');
    trapFocus(toppingSelectionOverlay.querySelector('.topping-selection-content'));
}

export function addCustomizedDrinkToTransaction() {
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

        showMessage('Producto Añadido', `Se añadieron ${quantity}x ${currentDrinkBeingCustomized.name} a la transacción.`);

        updateCurrentDrinkBeingCustomized(null);
        toppingSelectionOverlay.classList.remove('show');

        const updateTransactionDisplay = async () => {
            const { updateTransactionDisplay } = await import('./ui-rendering.js');
            updateTransactionDisplay();
        };
        updateTransactionDisplay();
    }
}

export function decrementItemQuantity(transactionLineId) {
    const itemIndex = currentTransaction.findIndex(item => item.transactionLineId === transactionLineId);

    if (itemIndex > -1) {
        if (currentTransaction[itemIndex].quantity > 1) {
            currentTransaction[itemIndex].quantity--;
            showMessage('Cantidad Actualizada', `Cantidad de ${currentTransaction[itemIndex].name} reducida.`);
        } else {
            const removedItemName = currentTransaction[itemIndex].name;
            currentTransaction.splice(itemIndex, 1);
            showMessage('Producto Eliminado', `${removedItemName} ha sido eliminado de la transacción.`);
        }

        import('./ui-rendering.js').then(module => {
            module.updateTransactionDisplay();
        });
    }
}

export function applyDiscount() {
    const amount = parseFloat(discountInput.value);

    if (isNaN(amount) || amount < 0) {
        showMessage('Valor Inválido', 'Por favor, ingresa un monto de descuento válido y positivo.');
        return;
    }

    const subtotal = currentTransaction.reduce((sum, item) => {
        const toppingsPrice = item.toppings ? item.toppings.reduce((tsum, t) => tsum + t.price, 0) : 0;
        return sum + (item.price + toppingsPrice) * item.quantity;
    }, 0);

    if (amount > subtotal) {
        showMessage('Descuento Excesivo', `El descuento ($${amount.toFixed(2)}) no puede ser mayor que el subtotal ($${subtotal.toFixed(2)}).`);
        return;
    }

    updateCurrentDiscountAmount(amount);

    import('./ui-rendering.js').then(module => {
        module.updateTransactionDisplay();
    });

    closeDiscountModal();
    showMessage('Descuento Aplicado', `Se ha aplicado un descuento de $${amount.toFixed(2)}.`);
}

export function removeDiscount() {
    if (currentDiscountAmount > 0) {
        updateCurrentDiscountAmount(0);

        import('./ui-rendering.js').then(module => {
            module.updateTransactionDisplay();
        });

        showMessage('Descuento Eliminado', 'Se ha quitado el descuento de la transacción.');
    }
    closeDiscountModal();
}

export async function completeSale() {
    if (currentTransaction.length === 0) {
        showMessage('Transacción Vacía', 'No hay productos en la transacción para completar la venta.');
        return;
    }

    const saleBeingEdited = editingSaleDocId ? dailySales.find(s => s.id === editingSaleDocId) : null;
    const existingAddress = saleBeingEdited ? saleBeingEdited.direccion : '';
    const address = prompt("Por favor, introduce la dirección de entrega (deja en blanco si no aplica):", existingAddress || '');

    if (address === null) {
        showMessage('Operación Cancelada', 'La venta no fue completada ni actualizada.');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        console.error("Firebase: No hay usuario autenticado para guardar la venta.");
        showMessage('Error de Autenticación', 'No hay una sesión de usuario activa. Por favor, inicia sesión o regístrate para guardar ventas.');
        return;
    }

    console.log("Attempting to save sale. Current User ID:", user.uid, "Email:", user.email);

    const subtotal = currentTransaction.reduce((sum, item) => {
        const toppingsPrice = item.toppings ? item.toppings.reduce((tsum, t) => tsum + t.price, 0) : 0;
        return sum + (item.price + toppingsPrice) * item.quantity;
    }, 0);
    const total = subtotal - currentDiscountAmount;

    const saleData = {
        timestamp: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(currentTransaction)),
        subtotal: subtotal,
        discountAmount: currentDiscountAmount,
        total: total,
        userId: user.uid,
        userEmail: user.email || 'Anónimo',
        direccion: address
    };

    try {
        // Use optimized sales manager with performance monitoring
        await optimizedSalesManager.measureOperation('Complete Sale', async () => {
            // Retry operation with connection management
            return connectionManager.retryOperation(async () => {
                // Lazy load Firestore modules for performance
                const { collection, addDoc, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

                const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);

                if (editingSaleDocId) {
                    const saleDocRef = doc(salesCollectionRef, editingSaleDocId);
                    await setDoc(saleDocRef, saleData, { merge: false });
                    console.log("Document updated with ID: ", editingSaleDocId);
                    showMessage('Venta Actualizada', `Venta por $${total.toFixed(2)} actualizada con éxito en la base de datos.`);
                    updateEditingSaleDocId(null);
                } else {
                    const docRef = await addDoc(salesCollectionRef, saleData);
                    console.log("Document written with ID: ", docRef.id);
                    showMessage('Venta Registrada', `Venta por $${total.toFixed(2)} registrada con éxito en la base de datos.`);
                }
            }, 'Complete Sale');
        });

        updateCurrentTransaction([]);
        updateCurrentDiscountAmount(0);

        import('./ui-rendering.js').then(module => {
            module.updateTransactionDisplay();
        });
    } catch (error) {
        console.error("Error saving document to Firestore: ", error);
        if (error.code === 'permission-denied') {
            showMessage('Error de Permisos', 'No tienes permisos para realizar esta operación. Por favor, verifica las reglas de seguridad de Firestore y tu estado de autenticación.');
        } else {
            showMessage('Error al Guardar Venta', `Hubo un problema al guardar la venta: ${error.message}.`);
        }
    }
}

export function clearTransaction() {
    if (currentTransaction.length === 0 && !editingSaleDocId) {
        showMessage('Transacción Vacía', 'La transacción ya está vacía.');
        return;
    }

    import('./modals.js').then(module => {
        module.showConfirm('Confirmar Vaciado', '¿Estás seguro de que quieres vaciar la transacción actual?', () => {
            updateCurrentTransaction([]);
            updateCurrentDiscountAmount(0);
            updateEditingSaleDocId(null);

            import('./ui-rendering.js').then(uiModule => {
                uiModule.updateTransactionDisplay();
            });

            showMessage('Transacción Vaciada', 'Todos los productos han sido eliminados de la transacción.');
        });
    });
}

export async function deleteSale(saleId) {
    const user = auth.currentUser;
    if (!user) {
        showMessage('Error de Autenticación', 'Debes iniciar sesión para eliminar ventas.');
        return;
    }

    try {
        // Lazy load Firestore modules for performance
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        const saleDocRef = doc(db, `artifacts/${appId}/public/data/dailySales`, saleId);
        await deleteDoc(saleDocRef);
        console.log("Document successfully deleted with ID: ", saleId);
        showMessage('Venta Eliminada', 'La venta ha sido eliminada del historial.');
    } catch (error) {
        console.error("Error removing document: ", error);
        if (error.code === 'permission-denied') {
            showMessage('Error de Permisos', 'No tienes permisos para eliminar esta venta. Por favor, verifica las reglas de seguridad de Firestore y tu estado de autenticación.');
        } else {
            showMessage('Error al Eliminar Venta', `Hubo un problema al eliminar la venta: ${error.message}.`);
        }
    }
}

export function editSale(saleId) {
    const saleToEdit = dailySales.find(sale => sale.id === saleId);
    if (saleToEdit) {
        updateCurrentTransaction(JSON.parse(JSON.stringify(saleToEdit.items)));
        updateCurrentDiscountAmount(saleToEdit.discountAmount || 0);
        updateEditingSaleDocId(saleId);

        import('./ui-rendering.js').then(module => {
            module.updateTransactionDisplay();
        });

        showMessage('Modo Edición', `Editando venta #${dailySales.findIndex(s => s.id === saleId) + 1}. Realiza cambios y haz clic en "Actualizar Venta".`);
    } else {
        showMessage('Venta No Encontrada', 'No se pudo encontrar la venta para editar.');
    }
}