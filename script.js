// Main application script - now modularized
// Import Firebase modules
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { db, auth, appId } from './firebase-init.js';

// Import modularized functionality
import { initializeData, updateDailySales, updateUnsubscribeFromSales, updateIsFilterEnabled } from './js/data-management.js';
import { renderMenu, updateTransactionDisplay, renderDailySales, applySalesFilter, clearSalesFilter } from './js/ui-rendering.js';
import { handleLogin, handleRegister, handlePasswordReset, handleAuthButtonClick, handleForgotPasswordClick, updateAuthUI } from './js/authentication.js';
import { completeSale, clearTransaction, applyDiscount, removeDiscount, addCustomizedDrinkToTransaction, updateToppingModalTotalPriceDisplay } from './js/transaction-logic.js';
import { renderReport } from './js/reports.js';
import { sendWhatsAppConfirmation } from './js/whatsapp.js';
import { hideMessage, hideConfirm, executeConfirmCallback, showLoginTab, showRegisterTab, showPasswordResetTab, closeAuthModal, openDiscountModal, closeDiscountModal, showMessage } from './js/modals.js';
import {
    completeSaleButton, clearTransactionButton, whatsappConfirmationButton, modalCloseButton,
    confirmYesButton, confirmNoButton, applyDiscountButton, cancelDiscountButton,
    confirmDiscountButton, removeDiscountButton, confirmToppingsButton, noToppingsButton,
    cancelToppingsButton, decrementQuantityButton, incrementQuantityButton, drinkQuantityInput,
    applyFilterButton, clearFilterButton, toggleFilterCheckbox, salesFilterControlsContainer,
    dailyReportButton, weeklyReportButton, monthlyReportButton, authButton, closeAuthModalButton,
    showLoginTabButton, showRegisterTabButton, showPasswordResetTabButton, loginForm,
    registerForm, passwordResetForm, forgotPasswordLink, backToLoginFromResetButton
} from './js/dom-elements.js';

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
    match /artifacts/{appId}/public/data/dailySales/{saleId} { // CAMBIO AQUÍ: Añadido '/data'
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

// --- Event Listeners ---
completeSaleButton.addEventListener('click', completeSale);
clearTransactionButton.addEventListener('click', clearTransaction);
whatsappConfirmationButton.addEventListener('click', sendWhatsAppConfirmation);
modalCloseButton.addEventListener('click', hideMessage);

// Confirmation Modal Buttons
confirmYesButton.addEventListener('click', () => {
    executeConfirmCallback();
    hideConfirm();
});
confirmNoButton.addEventListener('click', hideConfirm);

// Discount Modal Buttons
applyDiscountButton.addEventListener('click', openDiscountModal);
cancelDiscountButton.addEventListener('click', closeDiscountModal);
confirmDiscountButton.addEventListener('click', applyDiscount);
removeDiscountButton.addEventListener('click', removeDiscount);

// Topping Modal Event Listeners
confirmToppingsButton.addEventListener('click', addCustomizedDrinkToTransaction);
noToppingsButton.addEventListener('click', function() {
    import('./js/data-management.js').then(module => {
        if (module.currentDrinkBeingCustomized) {
            module.updateCurrentDrinkBeingCustomized({
                ...module.currentDrinkBeingCustomized,
                selectedToppings: []
            });
            addCustomizedDrinkToTransaction();
        }
    });
});
cancelToppingsButton.addEventListener('click', () => {
    import('./js/modals.js').then(module => {
        module.cancelToppingSelection();
    });
});

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
    const isFilterEnabled = toggleFilterCheckbox.checked;
    updateIsFilterEnabled(isFilterEnabled);

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
authButton.addEventListener('click', handleAuthButtonClick);
closeAuthModalButton.addEventListener('click', closeAuthModal);
showLoginTabButton.addEventListener('click', showLoginTab);
showRegisterTabButton.addEventListener('click', showRegisterTab);
showPasswordResetTabButton.addEventListener('click', showPasswordResetTab);
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
passwordResetForm.addEventListener('submit', handlePasswordReset);
forgotPasswordLink.addEventListener('click', handleForgotPasswordClick);
backToLoginFromResetButton.addEventListener('click', showLoginTab);

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    renderMenu();
    updateTransactionDisplay();
});

// El listener onAuthStateChanged es el punto de entrada principal para la lógica
// que depende de la autenticación. Se dispara al cargar la página y cada vez
// que el estado de autenticación del usuario cambia (inicio/cierre de sesión).
onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);

    if (user) {
        // --- Usuario está autenticado ---
        console.log("Auth state changed: User is logged in.", user.uid);

        // Configurar el listener de Firestore para obtener las ventas en tiempo real.
        const salesCollectionRef = collection(db, `artifacts/${appId}/public/data/dailySales`);
        const q = query(salesCollectionRef, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dailySales = [];
            snapshot.forEach((doc) => {
                dailySales.push({ id: doc.id, ...doc.data() });
            });
            console.log("Firestore: Ventas diarias actualizadas.", dailySales);

            updateDailySales(dailySales);

            // Re-renderizar la lista de ventas, aplicando el filtro si está activo.
            import('./js/data-management.js').then(module => {
                if (module.isFilterEnabled) {
                    applySalesFilter();
                } else {
                    renderDailySales();
                }
            });
        }, (error) => {
            console.error("Firestore: Error al obtener ventas diarias:", error);
            if (error.code === 'permission-denied') {
                showMessage('Error de Permisos', 'No tienes permisos para cargar las ventas diarias. Por favor, inicia sesión con una cuenta válida.');
                updateDailySales([]);
                renderDailySales();
            } else {
                showMessage('Error de Sincronización', `No se pudieron cargar las ventas diarias desde la base de datos: ${error.message}.`);
            }
        });

        updateUnsubscribeFromSales(unsubscribe);
    } else {
        // --- No hay usuario autenticado ---
        console.log("Auth state changed: User is logged out.");

        // Desuscribir el listener de Firestore ya que no hay usuario.
        import('./js/data-management.js').then(module => {
            if (module.unsubscribeFromSales) {
                module.unsubscribeFromSales();
                updateUnsubscribeFromSales(null);
                console.log("Firestore: Listener desuscrito porque no hay usuario autenticado.");
            }
        });

        // Limpiar los datos en memoria y en la UI.
        updateDailySales([]);
        renderDailySales();
    }
});