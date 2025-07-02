Punto de Venta Capibobba 🧋✨
Este es un sistema de punto de venta (POS) progresivo (PWA) diseñado para Capibobba, una tienda de bebidas. Permite gestionar ventas, personalizar pedidos con toppings, generar reportes y ahora incluye autenticación de usuarios y registro de ventas global.
🚀 Características Principales
 * PWA (Progressive Web App): Instalable en dispositivos móviles y de escritorio para una experiencia de aplicación nativa.
 * Gestión de Menú: Visualización clara de los productos disponibles con sus precios.
 * Transacciones en Tiempo Real: Añade productos a la transacción actual, ajusta cantidades y calcula el total.
 * Personalización de Bebidas: Modal interactivo para seleccionar toppings y ajustar la cantidad de cada bebida.
 * Registro de Ventas Diarias: Historial de todas las ventas completadas, con la capacidad de ver quién realizó la venta.
 * Edición y Eliminación de Ventas: Posibilidad de modificar o borrar ventas registradas (requiere autenticación).
 * Filtro de Ventas por Fecha: Filtra el historial de ventas por rangos de fechas específicos.
 * Reportes de Ventas: Genera informes diarios, semanales y mensuales para un análisis rápido.
 * Confirmación de Pedido por WhatsApp: Genera un mensaje pre-llenado con los detalles del pedido para enviar al cliente.
 * Autenticación de Usuarios (Firebase Authentication):
   * Registro e Inicio de Sesión: Los usuarios pueden crear cuentas con correo electrónico y contraseña.
   * Cierre de Sesión: Gestión de la sesión de usuario.
   * Recuperación de Contraseña: Envío de correos electrónicos para restablecer contraseñas olvidadas.
   * Sesión Persistente: Los usuarios permanecen logueados entre visitas.
 * Registro de Ventas Global (Firestore):
   * Todas las ventas registradas por cualquier usuario autenticado son visibles para todos los demás usuarios autenticados en tiempo real. Esto permite una vista consolidada de las operaciones.
   * Cada venta registra el correo electrónico del usuario que la realizó para fines de auditoría.
 * Diseño Responsivo: Interfaz optimizada para su uso en dispositivos móviles y de escritorio.
✨ Mejoras Recientes
Las siguientes funcionalidades y arreglos han sido implementados en las últimas actualizaciones:
 * Autenticación de Usuarios (Email/Password):
   * Se eliminó la autenticación anónima por defecto al cargar la aplicación. Ahora, al iniciar, se solicita al usuario iniciar sesión o registrarse.
   * Implementación completa de registro, inicio de sesión y cierre de sesión con Firebase Email/Password Authentication.
   * La interfaz de usuario muestra el estado de la sesión (ej. "Sesión iniciada como: usuario@ejemplo.com").
 * Recuperación de Contraseña:
   * Se añadió un enlace "¿Olvidaste tu contraseña?" en el modal de autenticación.
   * Funcionalidad para que los usuarios puedan solicitar un correo de restablecimiento de contraseña a su email registrado.
 * Registro de Ventas Global:
   * Cambio Crítico en Firestore: La colección de ventas ahora se almacena en una ruta pública (artifacts/{appId}/public/data/dailySales) en Firestore.
   * Reglas de Seguridad Actualizadas: Las reglas de seguridad de Firestore han sido modificadas para permitir que cualquier usuario autenticado (no solo el que registró la venta) pueda leer y escribir en esta colección global.
   * Todas las operaciones (añadir, editar, eliminar, leer) ahora interactúan con esta colección global.
 * Mejoras en la Interfaz de Usuario (UI/UX):
   * Modal de Selección de Toppings Responsivo: El modal de personalización de bebidas se ajusta mejor a diferentes tamaños de pantalla móvil.
   * Botones del Modal de Toppings Mejorados: Los botones "Confirmar Selección", "Sin Toppings" y "Cancelar" en el modal de toppings son ahora más grandes, con mayor padding y espaciado, y se adaptan mejor a la pantalla móvil para facilitar su uso.
 * Estructura de Archivos:
   * Se ha confirmado la estructura de archivos, con la carpeta images ubicada en el directorio raíz del proyecto para almacenar recursos como el apple-touch-icon.png.
🛠️ Tecnologías Utilizadas
 * HTML5: Estructura de la aplicación.
 * CSS3: Estilos y diseño responsivo.
 * JavaScript (ES6+): Lógica interactiva del frontend.
 * Firebase:
   * Firestore: Base de datos NoSQL para el almacenamiento de datos de ventas en tiempo real.
   * Firebase Authentication: Gestión de usuarios (registro, inicio de sesión, recuperación de contraseña).
 * PWA: manifest.json y service-worker.js para la funcionalidad sin conexión y la instalabilidad.
📦 Estructura del Proyecto
Capibobba-POS/
├── index.html              # Estructura principal de la aplicación
├── style.css               # Estilos globales y responsivos
├── script.js               # Lógica principal de la aplicación (menú, transacciones, Firebase)
├── manifest.json           # Manifiesto de la PWA
├── service-worker.js       # Service Worker para funcionalidad offline
└── images/                 # Carpeta para imágenes y activos
    └── capibobba-icon-192x192.png # Ícono de la aplicación para PWA

🚀 Cómo Ejecutar el Proyecto
 * Clona el Repositorio:
   git clone https://github.com/FeyoMX/POS-CapiBobba.git
cd POS-CapiBobba

 * Configuración de Firebase:
   * Crea un proyecto en Firebase Console.
   * Habilita Firestore Database y Firebase Authentication (especialmente el método Email/Password).
   * Actualiza tus reglas de seguridad de Firestore con las reglas proporcionadas en la sección "Reglas de Seguridad para Firestore (Ventas Globales - Corrección)" de este README para permitir el acceso global a las ventas.
   * Obtén tu configuración de Firebase (apiKey, authDomain, projectId, etc.) desde la configuración de tu proyecto en Firebase Console y pégala en el script.js dentro del <head> de index.html.
 * Despliegue:
   * Puedes desplegarlo fácilmente usando GitHub Pages. Sube tus archivos a un repositorio de GitHub y habilita GitHub Pages en la configuración de tu repositorio.
🔒 Reglas de Seguridad de Firestore (Actualizadas)
Es CRÍTICO que configures estas reglas en tu consola de Firebase para asegurar el correcto funcionamiento y la seguridad de tus datos:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Regla para la colección de ventas globales
    // Cualquier usuario autenticado (request.auth != null) puede leer y escribir aquí.
    match /artifacts/{appId}/public/data/dailySales/{saleId} {
      allow read, write: if request.auth != null;
    }

    // Regla para datos privados de usuario (si los añades en el futuro)
    // Solo el usuario autenticado cuyo UID coincida con {userId} puede leer y escribir.
    match /artifacts/{appId}/users/{userId}/{documents=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Regla de denegación por defecto para cualquier otra ruta no especificada.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

¡Esperamos que este sistema de punto de venta sea de gran utilidad para Capibobba!
