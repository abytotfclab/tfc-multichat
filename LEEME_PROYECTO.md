# 🚀 PROYECTO: TFC MultiChat Streamer (McCarthy) - BITÁCORA DE DESARROLLO

Este archivo contiene el estado actual y los próximos pasos para la profesionalización de la aplicación.

## 📋 ESTADO ACTUAL (Funciones Implementadas)
1.  **Integración Multi-Plataforma:** Lectura de chat en tiempo real de Twitch, TikTok y YouTube.
2.  **Sistema TTS (Voz) Premium:**
    *   Filtros granulares por plataforma y rol (Mod, VIP, Sub, Everyone).
    *   **Comando Prioritario `!s`:** Los mods pueden saltarse todos los filtros para avisos urgentes.
    *   Selector de Voces del Sistema (Top 5) con previsualización.
3.  **Sorteos Duales:**
    *   Modo Rifa (Comando configurable).
    *   Modo Adivinar (Palabra oculta con sistema de pistas y revelación de letras).
4.  **Inspección de Usuarios:** Capacidad de ver el historial de mensajes de cualquier viewer al hacer clic en su avatar/nombre.
5.  **Diseño:** Interfaz "Stark ADN" (oscuro, neones, transparente y portable).

## 🛠 TECH STACK
*   **Core:** Electron + Vite.
*   **Frontend:** React + Zustand (Estado).
*   **Conectores:** tmi.js (Twitch), tiktok-live-connector (TikTok).

## 🎯 PRÓXIMOS OBJETIVOS (Profesionalización)

### 1. Sistema de Licenciamiento (Seguridad)
*   Implementar **HWID Binding**: Vincular cada copia de la app al hardware único del PC del comprador.
*   Crear sistema de **Llaves de Activación** (Validation Handshake) para evitar que compartan el ZIP.
*   Evaluar backend ligero (Firebase o similar) para gestionar las llaves.

### 2. Auto-Updater (Mantenimiento)
*   Configurar `electron-updater` con GitHub Releases.
*   Permitir actualizaciones silenciosas para que el cliente siempre tenga la última versión sin descargar nuevos ZIPs manualmente.

---

**Nota para Antigravity:** Al cargar este proyecto en un nuevo chat, analiza la carpeta `src/store/useChatStore.js` para la lógica central y `electron/main/index.js` para los servicios de conexión. Estamos listos para empezar con el sistema de seguridad (HWID). 🛡️🔐🏁
