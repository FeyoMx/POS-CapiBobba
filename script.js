// Importa solo los módulos de Firestore que necesita este script
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Importa los módulos de autenticación de Firebase
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";


// Accede a las instancias globales de Firebase que se inicializaron en index.html
const db = window.db;
const auth = window.auth; // Acceder a la instancia de auth
let currentUserId = window.currentUserId;
let currentUserEmail = window.currentUserEmail; // Nuevo: para almacenar el email
let isAuthReady = window.isAuthReady;
const appId = window.appId;

// --- IMPORTANTE: CONFIGURACIÓN DE SEGURIDAD EN FIRESTORE ---
// Recuerda que tu API Key está expuesta en el cliente.
// Asegúrate de que tus reglas de seguridad de Firestore (en la consola de Firebase)
// sean EXTREMADAMENTE estrictas para prevenir accesos no autorizados a tus datos.
// Las reglas correctas son:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // NUEVA RUTA PARA VENTAS GLOBALES
    match /artifacts/{appId}/public/dailySales/{saleId} {
      allow read, write: if request.auth != null; // Cualquier usuario autenticado puede leer/escribir
    }
    // RUTA PARA DATOS PRIVADOS DE USUARIO (se mantiene si se necesita)
    match /artifacts/{appId}/users/{userId}/{documents=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/
// Siempre adapta estas reglas a la lógica de tu aplicación.


// In-memory data storage for the POS system
let menuItems = [];
let availableToppings = [];
let currentTransaction = [];
let dailySales = [];
let editingSaleDocId = null;

let currentDrinkBeingCustomized = null;

// DOM Elements
const menuGrid = document.getElementById('menuGrid');
const transactionList = document.getElementById('transactionList');
const transactionTotalElement = document.getElementById('transactionTotal');
const completeSaleButton = document.getElementById('completeSaleButton');
const clearTransactionButton = document.getElementById('clearTransactionButton');
const whatsappConfirmationButton = document.getElementById('whatsappConfirmationButton');
const dailySalesList = document.getElementById('dailySalesList');
const messageModalOverlay = document.getElementById('messageModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalCloseButton = document.getElementById('modalCloseButton');

// Confirmation Modal Elements
const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmYesButton = document.getElementById('confirmYesButton');
const confirmNoButton = document.getElementById('confirmNoButton');

// Topping Modal Elements
const toppingSelectionOverlay = document.getElementById('toppingSelectionOverlay');
const toppingDrinkNameElement = document.getElementById('toppingDrinkName');
const toppingsModalGrid = document.getElementById('toppingsModalGrid');
const confirmToppingsButton = document.getElementById('confirmToppingsButton');
const noToppingsButton = document.getElementById('noToppingsButton');
const cancelToppingsButton = document.getElementById('cancelToppingsButton');
const drinkQuantityInput = document.getElementById('drinkQuantity');
const decrementQuantityButton = document.getElementById('decrementQuantity');
const incrementQuantityButton = document.getElementById('incrementQuantity');
const toppingModalTotalPriceElement = document.getElementById('toppingModalTotalPrice');

// Filter Elements
const toggleFilterCheckbox = document.getElementById('toggleFilterCheckbox');
const salesFilterControlsContainer = document.getElementById('salesFilterControlsContainer');
const startDateInput = document.getElementById('startDateInput');
const endDateInput = document.getElementById('endDateInput');
const applyFilterButton = document.getElementById('applyFilterButton');
const clearFilterButton = document.getElementById('clearFilterButton');

let isFilterEnabled = false;

// Report Elements
const dailyReportButton = document.getElementById('dailyReportButton');
const weeklyReportButton = document.getElementById('weeklyReportButton');
const monthlyReportButton = document.getElementById('monthlyReportButton');
const reportContent = document.getElementById('reportContent');

// --- NUEVOS ELEMENTOS DOM para Autenticación ---
const userStatusElement = document.getElementById('userStatus');
const authButton = document.getElementById('authButton');
const authModalOverlay = document.getElementById('authModalOverlay');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const registerEmailInput = document.getElementById('registerEmail');
const registerPasswordInput = document.getElementById('registerPassword');
const showLoginTabButton = document.getElementById('showLoginTab');
const showRegisterTabButton = document.getElementById('showRegisterTab');
const closeAuthModalButton = document.getElementById('closeAuthModal');


// --- Funciones de Utilidad para Accesibilidad ---

/**
 * Traps focus within a given element, ensuring keyboard navigation stays within the modal.
 * @param {HTMLElement} element The element to trap focus within (e.g., a modal content div).
 */
function trapFocus(element) {
    const focusableEls = element.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusableEl = focusableEls[0];
    const lastFocusableEl = focusableEls[focusableEls.length - 1];

    if (!firstFocusableEl) return;

    setTimeout(() => {
        firstFocusableEl.focus();
    }, 100);

    element.addEventListener('keydown', function(e) {
        const isTabPressed = (e.key === 'Tab' || e.keyCode === 9);

        if (!isTabPressed) {
            return;
        }

        if (e.shiftKey) { // if Shift + Tab
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus(); // Loop to the last element
                e.preventDefault();
            }
        } else { // if just Tab
            if (document.activeElement === lastFocusableEl) {
                firstFocusableEl.focus(); // Loop to the first element
                e.preventDefault();
            }
        }
    });
}

let lastFocusedElement = null;

/**
 * Displays a custom modal message to the user.
 * @param {string} title The title of the message.
 * @param {string} message The content of the message.
 */
function showMessage(title, message) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModalOverlay.classList.add('show');
    trapFocus(messageModalOverlay.querySelector('.modal-content'));
}

/**
 * Hides the custom modal message and restores focus.
 */
function hideMessage() {
    messageModalOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

let onConfirmCallback = null;

/**
 * Displays a custom confirmation modal to the user.
 * @param {string} title The title of the confirmation.
 * @param {string} message The confirmation message.
 * @param {function} callback The function to execute if the user confirms.
 */
function showConfirm(title, message, callback) {
    lastFocusedElement = document.activeElement;
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    onConfirmCallback = callback;
    confirmModalOverlay.classList.add('show');
    trapFocus(confirmModalOverlay.querySelector('.modal-content'));
}

/**
 * Hides the custom confirmation modal and restores focus.
 */
function hideConfirm() {
    confirmModalOverlay.classList.remove('show');
    onConfirmCallback = null;
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

/**
 * Closes the topping selection modal and discards any current customization.
 */
function cancelToppingSelection() {
    currentDrinkBeingCustomized = null;
    toppingSelectionOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

/**
 * Opens the authentication modal.
 */
function openAuthModal() {
    lastFocusedElement = document.activeElement;
    authModalOverlay.classList.add('show');
    trapFocus(authModalOverlay.querySelector('.modal-content'));
}

/**
 * Closes the authentication modal.
 */
function closeAuthModal() {
    authModalOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

/**
 * Switches the active tab in the authentication modal to login.
 */
function showLoginTab() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    showLoginTabButton.classList.add('active');
    showRegisterTabButton.classList.remove('active');
    loginEmailInput.focus(); // Set focus to email input
}

/**
 * Switches the active tab in the authentication modal to register.
 */
function showRegisterTab() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    showRegisterTabButton.classList.add('active');
    showLoginTabButton.classList.remove('active');
    registerEmailInput.focus(); // Set focus to email input
}


// --- Data Initialization ---
/**
 * Initializes the menu items and available toppings.
 */
function initializeData() {
    menuItems = [
        // Frappés base agua
        { id: 'water-litchi', name: 'Frappé Litchi (Agua)', price: 75, type: 'drink' },
        { id: 'water-fresa', name: 'Frappé Fresa (Agua)', price: 75, type: 'drink' },
        { id: 'water-blueberry', name: 'Frappé Blueberry (Agua)', price: 75, type: 'drink' },
        { id: 'water-mango', name: 'Frappé Mango (Agua)', price: 75, type: 'drink' },
        { id: 'water-pina-colada', name: 'Frappé Piña Colada (Agua)', price: 75, type: 'drink' },
        { id: 'water-maracuya', name: 'Frappé Maracuyá (Agua)', price: 75, type: 'drink' },
        { id: 'water-guanabana', name: 'Frappé Guanábana (Agua)', price: 75, type: 'drink' },
        { id: 'water-sandia', name: 'Frappé Sandía (Agua)', price: 75, type: 'drink' },
        // Frappés base leche
        { id: 'milk-choco-mexicano', name: 'Frappé Chocolate Mexicano (Leche)', price: 75, type: 'drink' },
        { id: 'milk-taro', name: 'Frappé Taro (Leche)', price: 75, type: 'drink' },
        { id: 'milk-mazapan', name: 'Frappé Mazapán (Leche)', price: 75, type: 'drink' },
        { id: 'milk-chai', name: 'Frappé Chai (Leche)', price: 75, type: 'drink' },
        { id: 'milk-mocha', name: 'Frappé Mocha (Leche)', price: 75, type: 'drink' },
        { id: 'milk-cookies-cream', name: 'Frappé Cookies & Cream (Leche)', price: 75, type: 'drink' },
        { id: 'milk-crema-irlandesa', name: 'Frappé Crema Irlandesa (Leche)', price: 75, type: 'drink' },
        { id: 'milk-matcha', name: 'Frappé Matcha (Leche)', price: 75, type: 'drink' },
        // Bebidas Calientes
        { id: 'hot-chocolate', name: 'Chocolate Caliente', price: 60, type: 'drink' },
        { id: 'hot-taro', name: 'Taro Caliente', price: 60, type: 'drink' },
        { id: 'hot-mazapan', name: 'Mazapán Caliente', price: 60, type: 'drink' },
        { id: 'hot-chai', name: 'Chai Caliente', price: 60, type: 'drink' },
        { id: 'hot-mocha', name: 'Mocha Caliente', price: 60, type: 'drink' },
        { id: 'hot-cookies-cream', name: 'Cookies & Cream Caliente', price: 60, type: 'drink' },
        { id: 'hot-crema-irlandesa', name: 'Crema Irlandesa Caliente', price: 60, type: 'drink' },
        { id: 'hot-matcha', name: 'Matcha Caliente', price: 60, type: 'drink' },
        // Promociones (tratadas como bebidas por ahora)
        { id: 'promo-fresas-crema', name: 'Frappé Fresas con Crema (Temporada)', price: 75, type: 'drink' },
    ];

    // Define available toppings separately
    availableToppings = [
        { id: 'topping-frutos-rojos', name: 'Perlas explosivas de frutos rojos', price: 10 },
        { id: 'topping-manzana-verde', name: 'Perlas explosivas de manzana verde', price: 10 },
        { id: 'topping-litchi', name: 'Perlas explosivas de litchi', price: 10 },
        { id: 'topping-arcoiris', name: 'Jelly arcoiris', price: 10 },
    ];
}

// --- UI Rendering Functions ---

/**
 * Renders all menu items (drinks) in the menu grid.
 */
function renderMenu() {
    menuGrid.innerHTML = '';
    menuItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `menu-item ${item.type}`;
        itemDiv.dataset.itemId = item.id;
        itemDiv.tabIndex = 0;
        itemDiv.setAttribute('role', 'button');
        itemDiv.setAttribute('aria-label', `Seleccionar ${item.name} por $${item.price.toFixed(2)}`);

        itemDiv.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${item.price.toFixed(2)}</span>
        `;
        itemDiv.addEventListener('click', () => openToppingSelectionModal(item));
        itemDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openToppingSelectionModal(item);
            }
        });
        menuGrid.appendChild(itemDiv);
    });
}

/**
 * Updates the transaction list and total display in the UI.
 */
function updateTransactionDisplay() {
    transactionList.innerHTML = '';
    let total = 0;

    if (currentTransaction.length === 0) {
        transactionList.innerHTML = '<li role="listitem" style="text-align: center; color: var(--text-gray);">¡Añade productos para empezar!</li>';
    } else {
        currentTransaction.forEach(item => {
            const li = document.createElement('li');
            li.className = 'transaction-item';
            li.setAttribute('role', 'listitem');

            let toppingsDisplay = '';
            let toppingsPrice = 0;
            if (item.toppings && item.toppings.length > 0) {
                toppingsDisplay = `<span class="item-toppings-display">(+ ${item.toppings.map(t => t.name).join(', ')})</span>`;
                toppingsPrice = item.toppings.reduce((sum, t) => sum + t.price, 0);
            }

            const itemSubtotal = (item.price + toppingsPrice) * item.quantity;
            total += itemSubtotal;

            li.innerHTML = `
                <div class="item-info">
                    <span class="item-qty-name">${item.quantity}x ${item.name}</span>
                    ${toppingsDisplay}
                </div>
                <span class="item-total-price">$${itemSubtotal.toFixed(2)}</span>
                <button class="remove-item-btn" data-transaction-line-id="${item.transactionLineId}" aria-label="Remover ${item.quantity} ${item.name} de la transacción">➖</button>
            `;
            transactionList.appendChild(li);
        });
    }

    transactionTotalElement.textContent = `Total: $${total.toFixed(2)}`;

    if (editingSaleDocId) {
        completeSaleButton.textContent = 'Actualizar Venta ✅';
        clearTransactionButton.textContent = 'Cancelar Edición ❌';
    } else {
        completeSaleButton.textContent = 'Pagar ✅';
        clearTransactionButton.textContent = 'Vaciar Transacción 🗑️';
    }

    transactionList.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const transactionLineIdToRemove = event.target.dataset.transactionLineId;
            decrementItemQuantity(transactionLineIdToRemove);
        });
    });
}

/**
 * Renders the list of completed daily sales from the `dailySales` array or a filtered array.
 * @param {Array} salesToRender Optional array of sales to render. Defaults to `dailySales`.
 */
function renderDailySales(salesToRender = dailySales) {
    dailySalesList.innerHTML = '';
    if (salesToRender.length === 0) {
        dailySalesList.innerHTML = '<li role="listitem" style="text-align: center; color: var(--text-gray);">No hay ventas registradas hoy.</li>';
        return;
    }

    const sortedSales = [...salesToRender].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedSales.forEach((sale, index) => {
        const saleItemDiv = document.createElement('li');
        saleItemDiv.className = 'sale-item';
        saleItemDiv.setAttribute('role', 'listitem');

        const saleDate = new Date(sale.timestamp).toLocaleString();
        let saleDetailsHtml = '<ul role="list">';
        sale.items.forEach(item => {
            let toppingsDetail = '';
            let toppingsPrice = 0;
            if (item.toppings && item.toppings.length > 0) {
                toppingsDetail = ` (+ ${item.toppings.map(t => t.name).join(', ')})`;
                toppingsPrice = item.toppings.reduce((sum, t) => sum + t.price, 0);
            }
            saleDetailsHtml += `<li role="listitem">${item.quantity}x ${item.name}${toppingsDetail} ($${(item.price + toppingsPrice).toFixed(2)} c/u)</li>`;
        });
        saleDetailsHtml += '</ul>';

        // Display who made the sale if available
        const recordedBy = sale.userEmail ? `Registrado por: ${sale.userEmail}` : '';

        saleItemDiv.innerHTML = `
            <div class="sale-header">
                <span>Venta #${sortedSales.length - index}</span>
                <span>${saleDate}</span>
            </div>
            <div class="sale-details">
                ${saleDetailsHtml}
                ${recordedBy ? `<p class="sale-recorded-by">${recordedBy}</p>` : ''}
            </div>
            <div class="sale-total">Total Venta: $${sale.total.toFixed(2)}</div>
            <div class="sale-actions" role="group" aria-label="Acciones para la venta">
                <button class="sale-action-btn edit" data-sale-id="${sale.id}" aria-label="Editar venta #${sortedSales.length - index}">✏️</button>
                <button class="sale-action-btn delete" data-sale-id="${sale.id}" aria-label="Eliminar venta #${sortedSales.length - index}">🗑️</button>
            </div>
        `;
        dailySalesList.appendChild(saleItemDiv);
    });

    dailySalesList.querySelectorAll('.sale-action-btn.edit').forEach(button => {
        button.addEventListener('click', (event) => {
            editSale(event.target.dataset.saleId);
        });
    });
    dailySalesList.querySelectorAll('.sale-action-btn.delete').forEach(button => {
        button.addEventListener('click', (event) => {
            const saleIdToDelete = event.target.dataset.saleId;
            showConfirm('Confirmar Eliminación', '¿Estás seguro de que quieres eliminar esta venta del historial?', () => {
                deleteSale(saleIdToDelete);
            });
        });
    });
}

// --- Transaction Logic Functions ---

/**
 * Calculates the total price for the current drink being customized in the modal.
 * @returns {number} The calculated total price.
 */
function calculateToppingModalTotalPrice() {
    if (!currentDrinkBeingCustomized) return 0;

    let basePrice = currentDrinkBeingCustomized.price;
    let toppingsPrice = currentDrinkBeingCustomized.selectedToppings.reduce((sum, t) => sum + t.price, 0);
    let quantity = parseInt(drinkQuantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) quantity = 1;

    return (basePrice + toppingsPrice) * quantity;
}

/**
 * Updates the total price display in the topping modal.
 */
function updateToppingModalTotalPriceDisplay() {
    const total = calculateToppingModalTotalPrice();
    toppingModalTotalPriceElement.textContent = total.toFixed(2);
}


/**
 * Opens the topping selection modal for a given drink.
 * @param {object} drinkItem The drink object to customize.
 */
function openToppingSelectionModal(drinkItem) {
    lastFocusedElement = document.activeElement;

    currentDrinkBeingCustomized = {
        ...drinkItem,
        selectedToppings: [],
        quantity: 1
    };

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

/**
 * Adds the customized drink (with its selected toppings and quantity) to the transaction.
 */
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
        
        showMessage('Producto Añadido', `Se añadieron ${quantity}x ${currentDrinkBeingCustomized.name} a la transacción.`);

        currentDrinkBeingCustomized = null;
        toppingSelectionOverlay.classList.remove('show');
        if (lastFocusedElement) lastFocusedElement.focus();
        updateTransactionDisplay();
    }
}

/**
 * Decrements the quantity of an item in the current transaction, or removes it if quantity is 1.
 * @param {string} transactionLineId The unique ID of the transaction line item to decrement/remove.
 */
function decrementItemQuantity(transactionLineId) {
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
        updateTransactionDisplay();
    }
}


/**
 * Completes the current sale and adds it to daily sales (Firestore)
 * Or updates an existing sale if in editing mode.
 */
async function completeSale() {
    if (currentTransaction.length === 0) {
        showMessage('Transacción Vacía', 'No hay productos en la transacción para completar la venta.');
        return;
    }

    // Asegurarse de que Firebase esté listo y haya un User ID VÁLIDO
    if (!window.isAuthReady || !window.db || !window.currentUserId) {
        console.error("Firebase: DB o User ID no están listos o la autenticación falló.", { isAuthReady: window.isAuthReady, db: window.db, currentUserId: window.currentUserId });
        
        let errorMessage = 'No hay una sesión de usuario activa. Por favor, inicia sesión o regístrate para guardar ventas.';
        if (!window.isAuthReady) {
            errorMessage = 'La inicialización de Firebase no ha finalizado. Por favor, espera un momento o recarga la página.';
        }
        showMessage('Error de Autenticación', errorMessage);
        return;
    }

    console.log("Attempting to save sale. Current User ID:", window.currentUserId, "Email:", window.currentUserEmail);

    const total = parseFloat(transactionTotalElement.textContent.replace('Total: $', ''));

    const saleData = {
        timestamp: new Date().toISOString(),
        items: JSON.parse(JSON.stringify(currentTransaction)),
        total: total,
        userId: window.currentUserId, // Guardar el UID del usuario que realizó la compra
        userEmail: window.currentUserEmail // Guardar el email del usuario (o 'Anónimo' si es anónimo)
    };

    try {
        // CAMBIO CLAVE: Apuntar a la colección pública
        const salesCollectionRef = collection(window.db, `artifacts/${window.appId}/public/dailySales`);

        if (editingSaleDocId) {
            const saleDocRef = doc(salesCollectionRef, editingSaleDocId);
            await setDoc(saleDocRef, saleData, { merge: false });
            console.log("Document updated with ID: ", editingSaleDocId);
            showMessage('Venta Actualizada', `Venta por $${total.toFixed(2)} actualizada con éxito en la base de datos.`);
            editingSaleDocId = null;
        } else {
            const docRef = await addDoc(salesCollectionRef, saleData);
            console.log("Document written with ID: ", docRef.id);
            showMessage('Venta Registrada', `Venta por $${total.toFixed(2)} registrada con éxito en la base de datos.`);
        }
        
        currentTransaction = [];
        updateTransactionDisplay();
    } catch (error) {
        console.error("Error saving document to Firestore: ", error);
        if (error.code === 'permission-denied') {
            showMessage('Error de Permisos', 'No tienes permisos para realizar esta operación. Por favor, verifica las reglas de seguridad de Firestore y tu estado de autenticación.');
        } else {
            showMessage('Error al Guardar Venta', `Hubo un problema al guardar la venta: ${error.message}.`);
        }
    }
}

/**
 * Clears the current transaction and exits editing mode if active.
 */
function clearTransaction() {
    if (currentTransaction.length === 0 && !editingSaleDocId) {
        showMessage('Transacción Vacía', 'La transacción ya está vacía.');
        return;
    }

    showConfirm('Confirmar Vaciado', '¿Estás seguro de que quieres vaciar la transacción actual?', () => {
        currentTransaction = [];
        editingSaleDocId = null;
        updateTransactionDisplay();
        showMessage('Transacción Vaciada', 'Todos los productos han sido eliminados de la transacción.');
    });
}

// --- Functions for Editing/Deleting Sales ---

/**
 * Deletes a sale from Firestore.
 * @param {string} saleId The ID of the sale document to delete.
 */
async function deleteSale(saleId) {
    if (!window.isAuthReady || !window.db || !window.currentUserId) {
        showMessage('Error de Autenticación', 'Firebase no está listo o el ID de usuario no está disponible.');
        return;
    }

    try {
        // CAMBIO CLAVE: Apuntar a la colección pública para eliminar
        const saleDocRef = doc(window.db, `artifacts/${window.appId}/public/dailySales`, saleId);
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

/**
 * Loads a sale into the current transaction for editing.
 * @param {string} saleId The ID of the sale document to edit.
 */
function editSale(saleId) {
    // NOTA: Para editar una venta, la aplicación debe tener acceso a todas las ventas (globales).
    // La lógica actual de `dailySales` ya contiene todas las ventas cargadas por el listener global.
    const saleToEdit = dailySales.find(sale => sale.id === saleId);
    if (saleToEdit) {
        currentTransaction = JSON.parse(JSON.stringify(saleToEdit.items));
        editingSaleDocId = saleId;
        updateTransactionDisplay();
        showMessage('Modo Edición', `Editando venta #${dailySales.findIndex(s => s.id === saleId) + 1}. Realiza cambios y haz clic en "Actualizar Venta".`);
    } else {
        showMessage('Venta No Encontrada', 'No se pudo encontrar la venta para editar.');
    }
}

// --- Functions for Filtering Sales ---
/**
 * Applies a date filter to the daily sales list and re-renders it.
 */
function applySalesFilter() {
    if (!isFilterEnabled) {
        renderDailySales(dailySales); 
        return;
    }

    const startDateStr = startDateInput.value;
    const endDateStr = endDateInput.value;

    if (!startDateStr && !endDateStr) {
        showMessage('Filtro Vacío', 'Por favor, selecciona al menos una fecha para filtrar.');
        renderDailySales(dailySales);
        return;
    }

    let filtered = [...dailySales];

    if (startDateStr) {
        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0); 
        filtered = filtered.filter(sale => new Date(sale.timestamp) >= startDate);
    }

    if (endDateStr) {
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999); 
        filtered = filtered.filter(sale => new Date(sale.timestamp) <= endDate);
    }
    
    if (filtered.length === 0) {
        showMessage('Sin Resultados', 'No se encontraron ventas para el rango de fechas seleccionado.');
    } else {
        showMessage('Filtro Aplicado', `Mostrando ${filtered.length} ventas.`);
    }
    renderDailySales(filtered);
}

/**
 * Clears the date filter inputs and re-renders all daily sales.
 */
function clearSalesFilter() {
    startDateInput.value = '';
    endDateInput.value = '';
    renderDailySales(dailySales); 
    showMessage('Filtro Limpiado', 'Se muestran todas las ventas.');
}


// --- WhatsApp Integration ---
/**
 * Generates and opens a WhatsApp message with the current transaction details.
 */
function sendWhatsAppConfirmation() {
    if (currentTransaction.length === 0) {
        showMessage('Transacción Vacía', 'No hay productos en la transacción para enviar la confirmación.');
        return;
    }

    const total = parseFloat(transactionTotalElement.textContent.replace('Total: $', ''));
    let message = "¡Hola! Tu pedido de Capibobba ha sido confirmado:\n\n";
    let itemNumber = 1;

    currentTransaction.forEach(item => {
        let toppingsDetail = '';
        let itemTotalPricePerUnit = item.price;
        if (item.toppings && item.toppings.length > 0) {
            toppingsDetail = ` con ${item.toppings.map(t => t.name).join(', ')}`;
            itemTotalPricePerUnit += item.toppings.reduce((sum, t) => sum + t.price, 0);
        }
        message += `${itemNumber}. ${item.quantity}x ${item.name}${toppingsDetail} ($${(itemTotalPricePerUnit * item.quantity).toFixed(2)})\n`;
        itemNumber++;
    });

    message += `\nTotal de tu pedido: $${total.toFixed(2)}`;
    message += `\n\nTu pago será en efectivo? Te llevo cambio? O si prefieres por transferencia a la siguiente CLABE 722968010305501833`;
    message += `\n\n¡Gracias por tu compra! 💖`;

    const whatsappNumber = "5217712794633"; // WhatsApp number for Capibobba
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    const newWindow = window.open(whatsappUrl, '_blank');

    if (newWindow === null || typeof newWindow === 'undefined' || newWindow.closed) {
        console.error("Popup blocked or window could not be opened for WhatsApp.");
        showMessage('Error al Abrir WhatsApp', 'Parece que tu navegador bloqueó la ventana emergente. Por favor, permite pop-ups para enviar la confirmación por WhatsApp.');
    } else {
        showMessage('Confirmación Enviada', 'Se ha generado el mensaje de WhatsApp. Por favor, revisa la ventana emergente.');
    }
}


// --- New Reporting Functions ---

/**
 * Helper function to format a date object into 'YYYY-MM-DD' string.
 * @param {Date|string} date The date object or string to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Helper function to get the Monday of the week for a given date.
 * @param {Date|string} date The date object or string.
 * @returns {Date} A Date object representing the Monday of that week at 00:00:00.
 */
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Normalize to start of day
    return monday;
}

/**
 * Generates a daily sales report based on the `dailySales` data.
 * @returns {Array<object>} An array of objects with `period` (date) and `total`.
 */
function generateDailyReport() {
    const dailyTotals = new Map();

    dailySales.forEach(sale => {
        const saleDate = formatDate(sale.timestamp);
        const currentTotal = dailyTotals.get(saleDate) || 0;
        dailyTotals.set(saleDate, currentTotal + sale.total);
    });

    const report = Array.from(dailyTotals.entries()).map(([date, total]) => ({
        period: date,
        total: total
    }));

    report.sort((a, b) => new Date(a.period) - new Date(b.period));
    return report;
}

/**
 * Generates a weekly sales report based on the `dailySales` data.
 * @returns {Array<object>} An array of objects with `period` (week start date) and `total`.
 */
function generateWeeklyReport() {
    const weeklyTotals = new Map();

    dailySales.forEach(sale => {
        const mondayOfWeek = getMondayOfWeek(sale.timestamp);
        const weekKey = formatDate(mondayOfWeek);
        const currentTotal = weeklyTotals.get(weekKey) || 0;
        weeklyTotals.set(weekKey, currentTotal + sale.total);
    });

    const report = Array.from(weeklyTotals.entries()).map(([weekStart, total]) => ({
        period: `Semana del ${weekStart}`,
        total: total
    }));

    report.sort((a, b) => new Date(a.period.replace('Semana del ', '')) - new Date(b.period.replace('Semana del ', '')));
    return report;
}

/**
 * Generates a monthly sales report based on the `dailySales` data.
 * @returns {Array<object>} An array of objects with `period` (month) and `total`.
 */
function generateMonthlyReport() {
    const monthlyTotals = new Map();

    dailySales.forEach(sale => {
        const d = new Date(sale.timestamp);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const currentTotal = monthlyTotals.get(monthKey) || 0;
        monthlyTotals.set(monthKey, currentTotal + sale.total);
    });

    const report = Array.from(monthlyTotals.entries()).map(([month, total]) => ({
        period: month,
        total: total
    }));

    report.sort((a, b) => a.period.localeCompare(b.period));
    return report;
}

/**
 * Renders the selected sales report in the report content area.
 * @param {string} reportType The type of report to render ('daily', 'weekly', 'monthly').
 */
function renderReport(reportType) {
    let reportData = [];
    let reportTitle = '';

    if (dailySales.length === 0) {
        reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No hay ventas registradas para generar informes.</p>';
        return;
    }

    switch (reportType) {
        case 'daily':
            reportData = generateDailyReport();
            reportTitle = 'Informe de Ventas Diario';
            break;
        case 'weekly':
            reportData = generateWeeklyReport();
            reportTitle = 'Informe de Ventas Semanal';
            break;
        case 'monthly':
            reportData = generateMonthlyReport();
            reportTitle = 'Informe de Ventas Mensual';
            break;
        default:
            reportContent.innerHTML = '<p style="text-align: center; color: var(--text-gray);">Selecciona un tipo de informe para ver los resultados.</p>';
            return;
    }

    let reportHtml = `<h3>${reportTitle}</h3>`;
    if (reportData.length > 0) {
        reportHtml += '<ul role="list">';
        reportData.forEach(item => {
            reportHtml += `<li role="listitem"><span>${item.period}</span><span>$${item.total.toFixed(2)}</span></li>`;
        });
        reportHtml += '</ul>';
    } else {
        reportHtml += '<p style="text-align: center; color: var(--text-gray);">No hay datos para este informe.</p>';
    }
    reportContent.innerHTML = reportHtml;
}


// --- Funciones de Autenticación ---

/**
 * Handles user login with email and password.
 * @param {Event} event The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage('Inicio de Sesión Exitoso', `Bienvenido de nuevo, ${email}!`);
        closeAuthModal();
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        let errorMessage = "Error al iniciar sesión. Por favor, verifica tus credenciales.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Correo electrónico o contraseña incorrectos.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "El formato del correo electrónico es inválido.";
        }
        showMessage('Error de Inicio de Sesión', errorMessage);
    }
}

/**
 * Handles user registration with email and password.
 * @param {Event} event The form submission event.
 */
async function handleRegister(event) {
    event.preventDefault();
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;

    if (password.length < 6) {
        showMessage('Contraseña Débil', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage('Registro Exitoso', `Cuenta creada para ${email}! Has iniciado sesión automáticamente.`);
        closeAuthModal();
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        let errorMessage = "Error al registrarse.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Este correo electrónico ya está registrado.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "El formato del correo electrónico es inválido.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
        }
        showMessage('Error de Registro', errorMessage);
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    showConfirm('Cerrar Sesión', '¿Estás seguro de que quieres cerrar tu sesión?', async () => {
        try {
            await signOut(auth);
            showMessage('Sesión Cerrada', 'Has cerrado sesión correctamente.');
            // onAuthStateChanged se encargará de actualizar la UI
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            showMessage('Error al Cerrar Sesión', `Hubo un problema al cerrar sesión: ${error.message}.`);
        }
    });
}


// --- Event Listeners ---
completeSaleButton.addEventListener('click', completeSale);
clearTransactionButton.addEventListener('click', clearTransaction);
whatsappConfirmationButton.addEventListener('click', sendWhatsAppConfirmation);
modalCloseButton.addEventListener('click', hideMessage);

// Confirmation Modal Buttons
confirmYesButton.addEventListener('click', () => {
    if (onConfirmCallback) {
        onConfirmCallback();
    }
    hideConfirm();
});
confirmNoButton.addEventListener('click', hideConfirm);


// Topping Modal Event Listeners
confirmToppingsButton.addEventListener('click', addCustomizedDrinkToTransaction);
noToppingsButton.addEventListener('click', function() {
    if (currentDrinkBeingCustomized) {
        currentDrinkBeingCustomized.selectedToppings = [];
        addCustomizedDrinkToTransaction();
    }
});
cancelToppingsButton.addEventListener('click', cancelToppingSelection);

// Quantity control buttons in topping modal
decrementQuantityButton.addEventListener('click', () => {
    let quantity = parseInt(drinkQuantityInput.value, 10);
    if (quantity > 1) {
        drinkQuantityInput.value = quantity - 1;
        updateToppingModalTotalPriceDisplay();
    }
});

incrementQuantityButton.addEventListener('click', () => {
    let quantity = parseInt(drinkQuantityInput.value, 10);
    drinkQuantityInput.value = quantity + 1;
    updateToppingModalTotalPriceDisplay();
});

drinkQuantityInput.addEventListener('change', () => {
    let quantity = parseInt(drinkQuantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
        drinkQuantityInput.value = 1;
    }
    updateToppingModalTotalPriceDisplay();
});

// Filter Event Listeners
applyFilterButton.addEventListener('click', applySalesFilter);
clearFilterButton.addEventListener('click', clearSalesFilter);

toggleFilterCheckbox.addEventListener('change', () => {
    isFilterEnabled = toggleFilterCheckbox.checked;
    const switchLabel = toggleFilterCheckbox.closest('.switch');
    if (switchLabel) {
        switchLabel.setAttribute('aria-checked', isFilterEnabled);
    }

    if (isFilterEnabled) {
        salesFilterControlsContainer.classList.remove('hidden');
        showMessage('Filtro Activado', 'Ahora puedes filtrar las ventas por fecha.');
        applySalesFilter();
    } else {
        salesFilterControlsContainer.classList.add('hidden');
        clearSalesFilter();
        showMessage('Filtro Desactivado', 'Se muestran todas las ventas.');
    }
});

dailyReportButton.addEventListener('click', () => renderReport('daily'));
weeklyReportButton.addEventListener('click', () => renderReport('weekly'));
monthlyReportButton.addEventListener('click', () => renderReport('monthly'));

// --- Event Listeners para Autenticación ---
authButton.addEventListener('click', () => {
    if (auth.currentUser) { // Si hay un usuario logueado
        handleLogout();
    } else { // Si no hay usuario logueado
        openAuthModal();
    }
});
closeAuthModalButton.addEventListener('click', closeAuthModal);
showLoginTabButton.addEventListener('click', showLoginTab);
showRegisterTabButton.addEventListener('click', showRegisterTab);
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);


// --- Initial Setup ---
// Variable para almacenar la función de desuscripción de onSnapshot
let unsubscribeFromSales = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    renderMenu();
    updateTransactionDisplay();
    
    // Escuchar el evento personalizado que indica que Firebase Auth está listo
    document.addEventListener('firebaseAuthReady', () => {
        // Actualizar las variables locales con los valores globales una vez que estén disponibles
        currentUserId = window.currentUserId;
        currentUserEmail = window.currentUserEmail;
        isAuthReady = window.isAuthReady;

        // Actualizar el estado del usuario en la UI
        if (currentUserEmail) {
            userStatusElement.textContent = `Sesión iniciada como: ${currentUserEmail}`;
            authButton.textContent = 'Cerrar Sesión';
        } else {
            userStatusElement.textContent = 'No hay sesión iniciada';
            authButton.textContent = 'Iniciar Sesión / Registrarse';
        }
        
        // Lógica para el listener de Firestore:
        // Si hay un usuario autenticado y Firebase está listo, configurar el listener.
        if (isAuthReady && window.db && currentUserId && appId) {
            console.log("POS Script: Firebase Auth está listo. Configurando listener de Firestore.");
            console.log("POS Script: ID de Usuario Actual:", currentUserId);
            
            // Si ya hay un listener activo, desuscribirse primero para evitar duplicados
            if (unsubscribeFromSales) {
                unsubscribeFromSales();
                console.log("Firestore: Listener anterior desuscrito.");
            }

            // CAMBIO CLAVE: Apuntar a la colección pública para el listener
            const salesCollectionRef = collection(window.db, `artifacts/${appId}/public/dailySales`);
            const q = query(salesCollectionRef, orderBy("timestamp", "desc"));

            // Suscribirse al listener y guardar la función de desuscripción
            unsubscribeFromSales = onSnapshot(q, (snapshot) => {
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
                    // Si hay un error de permisos, limpiar las ventas y mostrar un mensaje
                    showMessage('Error de Permisos', 'No tienes permisos para cargar las ventas diarias. Por favor, inicia sesión con una cuenta válida.');
                    dailySales = []; // Limpiar ventas si hay error de permisos
                    renderDailySales(); // Renderizar lista vacía
                } else {
                    showMessage('Error de Sincronización', `No se pudieron cargar las ventas diarias desde la base de datos: ${error.message}.`);
                }
            });
        } else {
            // Si no hay usuario autenticado o Firebase no está listo, desuscribir el listener si existe
            if (unsubscribeFromSales) {
                unsubscribeFromSales();
                unsubscribeFromSales = null; // Resetear la variable
                console.log("Firestore: Listener desuscrito porque no hay usuario autenticado.");
            }
            dailySales = []; // Limpiar las ventas en memoria
            renderDailySales(); // Renderizar la lista vacía (vacía porque no hay datos de usuario)

            // Mostrar el modal de autenticación si no hay usuario autenticado al inicio
            if (isAuthReady && !currentUserId) { // isAuthReady es true si la verificación inicial terminó
                openAuthModal();
                showMessage('¡Bienvenido!', 'Por favor, inicia sesión o regístrate para empezar a usar el punto de venta y guardar tus ventas.');
            } else if (!isAuthReady) {
                 // Esto cubre el caso de que firebaseConfig sea inválido o haya un problema mayor
                showMessage('Problema de Inicialización', 'No se pudo inicializar Firebase. Las ventas no se guardarán. Por favor, recarga la página.');
            }
        }
    });
});
