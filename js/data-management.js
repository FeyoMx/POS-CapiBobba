// Data Management module
// Contains all data initialization and state management

// In-memory data storage for the POS system
export let menuItems = [];
export let availableToppings = [];
export let currentTransaction = [];
export let dailySales = [];
export let editingSaleDocId = null;
export let currentDiscountAmount = 0;
export let currentDrinkBeingCustomized = null;
export let isFilterEnabled = false;

// Variable para almacenar la función de desuscripción de onSnapshot
export let unsubscribeFromSales = null;

export function initializeData() {
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
        { id: 'water-tamarindo', name: 'Frappé Tamarindo (Agua)', price: 75, type: 'drink' },
        { id: 'water-cereza', name: 'Frappé Cereza (Agua)', price: 75, type: 'drink' },
        { id: 'water-banana', name: 'Frappé Banana (Agua)', price: 75, type: 'drink' },
        // Frappés base leche
        { id: 'milk-choco-mexicano', name: 'Frappé Chocolate Mexicano (Leche)', price: 75, type: 'drink' },
        { id: 'milk-taro', name: 'Frappé Taro (Leche)', price: 75, type: 'drink' },
        { id: 'milk-mazapan', name: 'Frappé Mazapán (Leche)', price: 75, type: 'drink' },
        { id: 'milk-chai', name: 'Frappé Chai (Leche)', price: 75, type: 'drink' },
        { id: 'milk-mocha', name: 'Frappé Mocha (Leche)', price: 75, type: 'drink' },
        { id: 'milk-cookies-cream', name: 'Frappé Cookies & Cream (Leche)', price: 75, type: 'drink' },
        { id: 'milk-crema-irlandesa', name: 'Frappé Crema Irlandesa (Leche)', price: 75, type: 'drink' },
        { id: 'milk-matcha', name: 'Frappé Matcha (Leche)', price: 75, type: 'drink' },
        { id: 'milk-pay-de-limon', name: 'Frappé Pay de Limon (Leche)', price: 75, type: 'drink' },
        { id: 'milk-algodon-azucar', name: 'Frappé Algodón de Azúcar (Leche)', price: 75, type: 'drink' },
        // Bebidas Calientes
        { id: 'hot-chocolate', name: 'Chocolate Caliente', price: 60, type: 'drink' },
        { id: 'hot-taro', name: 'Taro Caliente', price: 60, type: 'drink' },
        { id: 'hot-mazapan', name: 'Mazapán Caliente', price: 60, type: 'drink' },
        { id: 'hot-chai', name: 'Chai Caliente', price: 60, type: 'drink' },
        { id: 'hot-mocha', name: 'Mocha Caliente', price: 60, type: 'drink' },
        { id: 'hot-cookies-cream', name: 'Cookies & Cream Caliente', price: 60, type: 'drink' },
        { id: 'hot-crema-irlandesa', name: 'Crema Irlandesa Caliente', price: 60, type: 'drink' },
        { id: 'hot-matcha', name: 'Matcha Caliente', price: 60, type: 'drink' },
        // Promociones
        { id: 'promo-fresas-crema', name: 'Frappé Fresas con Crema (Temporada)', price: 75, type: 'drink' },
        { id: 'promo-chamoyada', name: 'Chamoyada (Temporada)', price: 80, type: 'drink' },
        { id: 'promo-yogurtada', name: 'Yogurtada (Temporada)', price: 80, type: 'drink' },
    ];

    availableToppings = [
        { id: 'topping-frutos-rojos', name: 'Perlas explosivas de frutos rojos', price: 10 },
        { id: 'topping-manzana-verde', name: 'Perlas explosivas de manzana verde', price: 10 },
        { id: 'topping-litchi', name: 'Perlas explosivas de litchi', price: 10 },
        { id: 'topping-arcoiris', name: 'Jelly arcoiris', price: 10 },
        { id: 'topping-cristal', name: 'Perlas Cristal', price: 10 },
        { id: 'topping-tapioca-extra', name: 'Extra Tapioca', price: 10 },
    ];
}

// Utility functions for data manipulation
export function updateCurrentTransaction(transaction) {
    currentTransaction = transaction;
}

export function updateDailySales(sales) {
    dailySales = sales;
}

export function updateEditingSaleDocId(id) {
    editingSaleDocId = id;
}

export function updateCurrentDiscountAmount(amount) {
    currentDiscountAmount = amount;
}

export function updateCurrentDrinkBeingCustomized(drink) {
    currentDrinkBeingCustomized = drink;
}

export function updateIsFilterEnabled(enabled) {
    isFilterEnabled = enabled;
}

export function updateUnsubscribeFromSales(unsubscribeFn) {
    unsubscribeFromSales = unsubscribeFn;
}