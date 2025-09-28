// Modals and Accessibility module
// Contains all modal and accessibility related functions

import {
    messageModalOverlay,
    modalTitle,
    modalMessage,
    confirmModalOverlay,
    confirmTitle,
    confirmMessage,
    authModalOverlay,
    loginForm,
    registerForm,
    passwordResetForm,
    loginEmailInput,
    registerEmailInput,
    resetEmailInput,
    showLoginTabButton,
    showRegisterTabButton,
    showPasswordResetTabButton,
    discountModalOverlay,
    discountInput,
    toppingSelectionOverlay
} from './dom-elements.js';

import { currentDiscountAmount } from './data-management.js';

let lastFocusedElement = null;
let onConfirmCallback = null;

export function trapFocus(element) {
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

        if (e.shiftKey) {
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableEl) {
                firstFocusableEl.focus();
                e.preventDefault();
            }
        }
    });
}

export function showMessage(title, message) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    messageModalOverlay.classList.add('show');
    trapFocus(messageModalOverlay.querySelector('.modal-content'));
}

export function hideMessage() {
    messageModalOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

export function showConfirm(title, message, callback) {
    lastFocusedElement = document.activeElement;
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    onConfirmCallback = callback;
    confirmModalOverlay.classList.add('show');
    trapFocus(confirmModalOverlay.querySelector('.modal-content'));
}

export function hideConfirm() {
    confirmModalOverlay.classList.remove('show');
    onConfirmCallback = null;
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

export function executeConfirmCallback() {
    if (onConfirmCallback) {
        onConfirmCallback();
    }
}

export function cancelToppingSelection() {
    import('./data-management.js').then(module => {
        module.updateCurrentDrinkBeingCustomized(null);
    });
    toppingSelectionOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

export function openAuthModal(initialTab = 'login') {
    lastFocusedElement = document.activeElement;
    authModalOverlay.classList.add('show');
    trapFocus(authModalOverlay.querySelector('.modal-content'));

    if (initialTab === 'register') {
        showRegisterTab();
    } else if (initialTab === 'reset') {
        showPasswordResetTab();
    } else {
        showLoginTab();
    }
}

export function closeAuthModal() {
    authModalOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

export function showLoginTab() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    passwordResetForm.classList.add('hidden');
    showLoginTabButton.classList.add('active');
    showRegisterTabButton.classList.remove('active');
    showPasswordResetTabButton.classList.remove('active');
    loginEmailInput.focus();
}

export function showRegisterTab() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    passwordResetForm.classList.add('hidden');
    showRegisterTabButton.classList.add('active');
    showLoginTabButton.classList.remove('active');
    showPasswordResetTabButton.classList.remove('active');
    registerEmailInput.focus();
}

export function showPasswordResetTab() {
    passwordResetForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    showPasswordResetTabButton.classList.add('active');
    showLoginTabButton.classList.remove('active');
    showRegisterTabButton.classList.remove('active');
    resetEmailInput.focus();
}

export function openDiscountModal() {
    lastFocusedElement = document.activeElement;
    discountInput.value = currentDiscountAmount > 0 ? currentDiscountAmount.toFixed(2) : '';
    discountModalOverlay.classList.add('show');
    trapFocus(discountModalOverlay.querySelector('.modal-content'));
}

export function closeDiscountModal() {
    discountModalOverlay.classList.remove('show');
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}