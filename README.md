Punto de Venta Capibobba 🧋✨
Este proyecto es un sistema de Punto de Venta (POS) básico diseñado para la tienda de bebidas "Capibobba", enfocado en la gestión de transacciones diarias y la comunicación con el cliente.
Características
 * Menú de Productos Interactivo: Permite seleccionar bebidas y toppings de forma rápida y sencilla.
 * Gestión de Cantidad y Toppings: Al seleccionar una bebida, un modal emergente permite al usuario especificar la cantidad deseada y añadir toppings específicos a esa bebida, facilitando pedidos de múltiples bebidas idénticas con personalizaciones.
 * Transacción en Curso: Muestra un resumen detallado de la venta actual, incluyendo la cantidad de cada producto (con sus toppings asociados) y el total a pagar.
 * Eliminación y Ajuste de Ítems: Permite eliminar ítems de la transacción o decrementar su cantidad si se ha añadido por error.
 * Confirmación de Pedido por WhatsApp: Un botón dedicado genera un mensaje de WhatsApp pre-llenado con el detalle del pedido y las opciones de pago (efectivo/transferencia), listo para enviar al cliente.
 * Registro de Ventas Diarias: Al "Pagar" una transacción, esta se registra en un historial de ventas del día, mostrando la fecha, los ítems vendidos y el total de la venta.
 * Mensajes de Notificación: Utiliza modales personalizados para proporcionar feedback al usuario sobre las acciones realizadas (añadir producto, completar venta, etc.).
 * Diseño Responsivo: Adaptado para funcionar en diferentes tamaños de pantalla.
Tecnologías Utilizadas
 * HTML5: Para la estructura del Punto de Venta.
 * CSS3: Para el diseño visual, incluyendo estilos para los modales y elementos interactivos.
 * JavaScript (Vanilla JS): Para toda la lógica interactiva, gestión de la transacción, manipulación del DOM y la integración con WhatsApp.
Cómo Ejecutar el Proyecto
Este proyecto es una aplicación web de una sola página y no requiere configuraciones complejas ni dependencias de servidor.
 * Clonar el Repositorio:
   git clone <URL_DEL_REPOSITORIO>
cd capibobba-pos

 * Abrir el Archivo:
   Simplemente abre el archivo index.html (o el nombre que le hayas dado al archivo HTML) en tu navegador web preferido.
   open index.html # En macOS
start index.html # En Windows
xdg-open index.html # En Linux

   O arrastra y suelta el archivo index.html directamente en la ventana de tu navegador.
Uso del Punto de Venta
 * Seleccionar Bebida: Haz clic en cualquier bebida en la sección "Menú de Productos".
 * Personalizar Bebida: Se abrirá un modal donde podrás:
   * Seleccionar los toppings deseados haciendo clic en ellos (se resaltarán).
   * Ajustar la cantidad de esa bebida (con esos toppings) usando los botones + y - o introduciendo un número.
   * Haz clic en "Confirmar Selección" para añadirla a la transacción. Si no quieres toppings, haz clic en "Sin Toppings".
 * Gestionar Transacción:
   * Los ítems se añadirán a la sección "Transacción Actual".
   * Puedes hacer clic en el botón "➖" al lado de cada ítem para reducir su cantidad o eliminarlo por completo.
   * El "Total" se actualizará automáticamente.
 * Confirmar Pedido al Cliente:
   * Haz clic en el botón "Confirmación de pedido 📱" para generar un mensaje de WhatsApp con el resumen del pedido y las opciones de pago. Esto abrirá una nueva ventana o pestaña de WhatsApp.
 * Pagar y Registrar Venta:
   * Una vez que la transacción esté lista, haz clic en "Pagar ✅" para registrar la venta en el "Registro de Ventas Diarias" y vaciar la transacción actual.
 * Vaciar Transacción:
   * Si necesitas empezar de nuevo o cancelar la transacción actual sin registrarla, haz clic en "Vaciar Transacción 🗑️".
Posibles Mejoras Futuras
 * Persistencia de Datos: Integrar una base de datos (como Firebase Firestore) para almacenar las ventas diarias de forma permanente, en lugar de solo en la memoria del navegador.
 * Gestión de Inventario: Añadir un sistema para controlar el stock de bebidas y toppings.
 * Reportes Avanzados: Generación de informes de ventas por día, semana, mes, por producto, etc.
 * Funcionalidad de Búsqueda: Permitir buscar productos en el menú.
 * Interfaz de Usuario Mejorada: Añadir más animaciones, transiciones y una experiencia de usuario más pulida.
 * Múltiples Transacciones: Posibilidad de manejar varias transacciones simultáneamente (por ejemplo, para diferentes clientes).
 * Autenticación de Usuario: Proteger el acceso al POS para personal autorizado.
Licencia
Este proyecto está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.
