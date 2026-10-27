# Mi Plata — cómo publicarla e instalarla en tu iPhone

## 1. Subir a GitHub (una sola vez, ~10 min desde el PC)
1. Entra a github.com con tu cuenta → **New repository**.
2. Nombre: `mi-plata`. Visibilidad: **Public** (GitHub Pages gratis lo necesita; tus datos NO van ahí, solo el código).
3. En el repo: **Add file → Upload files** y arrastra TODO el contenido de esta carpeta
   (`index.html`, `sw.js`, `manifest.webmanifest`, la carpeta `icons`). → **Commit changes**.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
5. En 1–2 minutos queda en: `https://TU-USUARIO.github.io/mi-plata/`

## 2. Instalar en el iPhone
1. Abre ese enlace en **Safari** (no en Chrome).
2. Toca **Compartir** → **Agregar a inicio** → **Agregar**.
3. Ábrela siempre desde el ícono. Funciona sin internet.

## 3. Primeros pasos en la app
- **Cuentas**: edita Efectivo / Banco / Ahorros con su saldo inicial, o crea Nequi, tarjeta, etc.
- **Ajustes → Bloqueo con PIN**, y luego activa **Face ID**.
- **Ajustes → Crear respaldo** cada cierto tiempo y guárdalo en Archivos / iCloud.

## Importante sobre tus datos
Se guardan solo dentro de la app en el iPhone. Si borras la app de la pantalla de inicio
se borran también sus datos: haz respaldo antes. Para pasarte a otro celular: respaldo → restaurar.

## Actualizaciones
Cuando cambiemos algo, se reemplaza el `index.html` en GitHub (y se sube la versión en `sw.js`).
Tus datos no se tocan.

## Seguridad (v1.1)
- Sin servidor ni conexiones externas: una política CSP bloquea cualquier envío de datos fuera de la app.
- Respaldos cifrados con AES-256-GCM (clave derivada con PBKDF2-SHA256, 310.000 iteraciones). El PIN y Face ID nunca van en el respaldo.
- PIN de 4 o 6 dígitos con límite de intentos: tras 5 fallos, espera de 30 s que se duplica (máx. 15 min).
- Restaurar valida cada registro y descarta lo que no tenga forma correcta.
- Recomendado: activa 2FA en tu cuenta de GitHub, porque desde aquí se publica el código de la app.
- (v1.1.1) El JavaScript vive en `app.js` y la CSP no permite scripts en línea (`script-src 'self'`, `script-src-attr 'none'`): aunque un texto se colara sin escapar, el navegador no ejecuta código inyectado.
- (v1.2.0) Pantalla de privacidad al salir de la app y bloqueo configurable (de inmediato por defecto).
- (v1.2.0) El modo sin internet no se rompe con un 404 temporal de GitHub; con señal mala abre la copia guardada a los 3 s.
- (v1.2.0) Guardado robusto: usa la copia más reciente y aparta los datos ilegibles en vez de borrarlos.
- (v1.2.0) CSV protegido contra inyección de fórmulas en Excel; la app no se deja cargar dentro de otras páginas (iframe).

## Publicar una versión nueva
Cambia el número de versión en tres sitios: `VERSION` en `sw.js`, `APP_VERSION` en `app.js` y `app.js?v=` en `index.html`.
