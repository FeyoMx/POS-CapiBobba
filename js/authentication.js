// Authentication module
// Contains all authentication related functions

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { auth } from '../firebase-init.js';
import {
    loginEmailInput,
    loginPasswordInput,
    registerEmailInput,
    registerPasswordInput,
    resetEmailInput,
    userStatusElement,
    authButton
} from './dom-elements.js';
import { showMessage, closeAuthModal, showPasswordResetTab } from './modals.js';

export async function handleLogin(event) {
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

export async function handleRegister(event) {
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

export async function handleLogout() {
    const { showConfirm } = await import('./modals.js');
    showConfirm('Cerrar Sesión', '¿Estás seguro de que quieres cerrar tu sesión?', async () => {
        try {
            await signOut(auth);
            showMessage('Sesión Cerrada', 'Has cerrado sesión correctamente.');
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            showMessage('Error al Cerrar Sesión', `Hubo un problema al cerrar sesión: ${error.message}.`);
        }
    });
}

export async function handlePasswordReset(event) {
    event.preventDefault();
    const email = resetEmailInput.value;

    if (!email) {
        showMessage('Correo Requerido', 'Por favor, introduce tu correo electrónico.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Correo Enviado', `Se ha enviado un enlace de restablecimiento de contraseña a ${email}. Revisa tu bandeja de entrada.`);
        closeAuthModal();
    } catch (error) {
        console.error("Error al enviar correo de restablecimiento:", error);
        let errorMessage = "Error al enviar el correo de restablecimiento.";
        if (error.code === 'auth/user-not-found') {
            errorMessage = "No hay ningún usuario registrado con ese correo electrónico.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "El formato del correo electrónico es inválido.";
        }
        showMessage('Error', errorMessage);
    }
}

export function handleAuthButtonClick() {
    if (auth.currentUser) {
        handleLogout();
    } else {
        import('./modals.js').then(module => {
            module.openAuthModal();
        });
    }
}

export function handleForgotPasswordClick(e) {
    e.preventDefault();
    showPasswordResetTab();
}

export function updateAuthUI(user) {
    if (user) {
        userStatusElement.textContent = `Sesión iniciada como: ${user.email}`;
        authButton.textContent = 'Cerrar Sesión';
    } else {
        userStatusElement.textContent = 'No hay sesión iniciada';
        authButton.textContent = 'Iniciar Sesión / Registrarse';
    }
}