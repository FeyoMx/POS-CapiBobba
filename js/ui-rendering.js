// UI Rendering module
// Contains all UI rendering and display functions

import {
    menuGrid,
    transactionList,
    transactionTotalElement,
    subtotalDisplay,
    discountDisplay,
    completeSaleButton,
    clearTransactionButton,
    dailySalesList,
    startDateInput,
    endDateInput
} from './dom-elements.js';
import {
    menuItems,
    currentTransaction,
    dailySales,
    editingSaleDocId,
    currentDiscountAmount,
    isFilterEnabled
} from './data-management.js';
import { openToppingSelectionModal, decrementItemQuantity, deleteSale, editSale } from './transaction-logic.js';
import { showMessage, showConfirm } from './modals.js';

export function renderMenu() {
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

export function updateTransactionDisplay() {
    transactionList.innerHTML = '';
    let subtotal = 0;

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
            subtotal += itemSubtotal;

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

    const finalDiscountAmount = Math.min(subtotal, currentDiscountAmount);
    const total = subtotal - finalDiscountAmount;

    subtotalDisplay.textContent = `Subtotal: $${subtotal.toFixed(2)}`;

    if (finalDiscountAmount > 0) {
        discountDisplay.textContent = `Descuento: -$${finalDiscountAmount.toFixed(2)}`;
        discountDisplay.classList.remove('hidden');
    } else {
        discountDisplay.classList.add('hidden');
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

export function renderDailySales(salesToRender = dailySales) {
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

        let totalSummaryHtml = '';
        if (sale.discountAmount && sale.discountAmount > 0) {
            totalSummaryHtml = `
                <p class="sale-subtotal">Subtotal: $${sale.subtotal.toFixed(2)}</p>
                <p class="sale-discount">Descuento: -$${sale.discountAmount.toFixed(2)}</p>
                <div class="sale-total">Total Venta: $${sale.total.toFixed(2)}</div>
            `;
        } else {
            totalSummaryHtml = `<div class="sale-total">Total Venta: $${sale.total.toFixed(2)}</div>`;
        }

        const recordedBy = sale.userEmail ? `Registrado por: ${sale.userEmail}` : '';
        const addressDisplay = sale.direccion ? `<p class="sale-address"><strong>Dirección:</strong> ${sale.direccion}</p>` : '';

        saleItemDiv.innerHTML = `
            <div class="sale-header">
                <span>Venta #${sortedSales.length - index}</span>
                <span>${saleDate}</span>
            </div>
            <div class="sale-details">
                ${saleDetailsHtml}
                ${addressDisplay}
                ${recordedBy ? `<p class="sale-recorded-by">${recordedBy}</p>` : ''}
            </div>
            ${totalSummaryHtml}
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

export function applySalesFilter() {
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

export function clearSalesFilter() {
    startDateInput.value = '';
    endDateInput.value = '';
    renderDailySales(dailySales);
    showMessage('Filtro Limpiado', 'Se muestran todas las ventas.');
}