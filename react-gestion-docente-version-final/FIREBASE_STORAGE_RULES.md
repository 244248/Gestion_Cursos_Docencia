# Configuración de Reglas de Firebase Storage

Para que la subida de fotos de perfil funcione correctamente, necesitas configurar las reglas de Firebase Storage.

## Pasos para configurar las reglas:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `gestioncursodocente`
3. Ve a **Storage** en el menú lateral
4. Haz clic en la pestaña **Rules** (Reglas)
5. Reemplaza las reglas actuales con las siguientes:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir lectura y escritura de fotos de perfil de administradores
    match /admin-profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Permitir lectura y escritura de fotos de perfil de docentes
    match /docente-profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regla por defecto: denegar todo lo demás
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Haz clic en **Publish** (Publicar)

## Explicación de las reglas:

- **`allow read`**: Permite que cualquier usuario autenticado pueda leer las imágenes
- **`allow write`**: Solo permite que el usuario dueño de la carpeta pueda subir/modificar sus propias imágenes
- **`request.auth.uid == userId`**: Verifica que el UID del usuario autenticado coincida con el userId en la ruta

## Nota de seguridad:

Estas reglas permiten que cualquier usuario autenticado pueda leer las fotos de perfil, pero solo el dueño puede modificarlas. Si quieres restringir más el acceso, puedes ajustar las reglas según tus necesidades.


