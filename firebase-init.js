// Importa los módulos necesarios de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- REEMPLAZA ESTO CON TU CONFIGURACIÓN DE FIREBASE REAL ---
const firebaseConfig = {
    apiKey: "AIzaSyAmp_Ymyc9j06jLK2WV_F8Ow5b8UBc2O0U", // Asegúrate de que tus reglas de seguridad de Firestore sean MUY ESTRICTAS.
    authDomain: "pos-capibobba.firebaseapp.com",
    projectId: "pos-capibobba",
    storageBucket: "pos-capibobba.firebasestorage.app",
    messagingSenderId: "1016686030608",
    appId: "1:1016686030608:web:7b28ce00d347ce32403f95",
    measurementId: "G-GZY0B5FBQZ",
};
// --- FIN DE LA CONFIGURACIÓN DE FIREBASE ---

// Variables para almacenar las instancias de Firebase.
// Se exportan para que otros módulos (como script.js) puedan usarlas.
export let app;
export let auth;
export let db;
export let currentUserId = null;
export let currentUserEmail = null;

// Usar projectId como appId para la colección de artefactos si no se define uno específico
export const appId = firebaseConfig.projectId || 'capibobba-pos-app';

// Creamos una promesa que se resolverá cuando la autenticación de Firebase esté lista.
// Esto evita problemas de "race condition" donde script.js intenta usar auth antes de que esté inicializado.
export const authReady = new Promise((resolve) => {
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // onAuthStateChanged es el listener perfecto para saber cuándo está listo.
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                currentUserEmail = user.email || 'Anónimo';
                console.log("Firebase: Usuario autenticado. UID:", user.uid, "Email:", currentUserEmail);
            } else {
                currentUserId = null;
                currentUserEmail = null;
                console.log("Firebase: No hay usuario autenticado. Se requiere inicio de sesión/registro.");
            }
            // Resolvemos la promesa y despachamos el evento para cualquier script no modular que pueda estar escuchando.
            resolve(user);
            document.dispatchEvent(new Event('firebaseAuthReady'));
        });
    } else {
        console.error("Firebase: firebaseConfig no está completo o es inválido. La persistencia no funcionará.");
        // Rechazamos la promesa si la configuración es mala.
        resolve(null); // O reject(new Error(...))
        document.dispatchEvent(new Event('firebaseAuthReady'));
    }
});