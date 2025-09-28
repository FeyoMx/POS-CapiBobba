// WhatsApp Integration module
// Contains WhatsApp messaging functionality

import { currentTransaction, currentDiscountAmount } from './data-management.js';
import { showMessage } from './modals.js';

export function sendWhatsAppConfirmation() {
    if (currentTransaction.length === 0) {
        showMessage('Transacción Vacía', 'No hay productos en la transacción para enviar la confirmación.');
        return;
    }

    const subtotal = currentTransaction.reduce((sum, item) => {
        const toppingsPrice = item.toppings ? item.toppings.reduce((tsum, t) => tsum + t.price, 0) : 0;
        return sum + (item.price + toppingsPrice) * item.quantity;
    }, 0);
    const total = subtotal - currentDiscountAmount;

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

    message += `\nSubtotal: $${subtotal.toFixed(2)}`;
    if (currentDiscountAmount > 0) {
        message += `\nDescuento: -$${currentDiscountAmount.toFixed(2)}`;
    }
    message += `\nTotal de tu pedido: $${total.toFixed(2)}`;
    message += `\n\nTu pago será en efectivo? Te llevo cambio? O si prefieres por transferencia a la siguiente CLABE 722969010305501833`;
    message += `\n\n¡Gracias por tu compra! 💖`;

    const whatsappNumber = "5217711831526";
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