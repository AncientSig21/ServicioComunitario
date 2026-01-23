# 🧪 Instrucciones para Ejecutar el Test de RLS

## Método 1: Desde la Página Web (Recomendado)

1. **Asegúrate de que el servidor esté corriendo:**
   ```bash
   npm run dev
   ```

2. **Abre tu navegador y ve a:**
   ```
   http://localhost:3000/test-rls
   ```

3. **Inicia sesión** con cualquier usuario (usuario normal, conserje o admin)

4. **Haz clic en el botón "🚀 Ejecutar Pruebas RLS"**

5. **Revisa los resultados** que aparecerán en la página

## Método 2: Desde la Consola del Navegador

1. **Abre la aplicación** en tu navegador (http://localhost:3000)

2. **Inicia sesión** con cualquier usuario

3. **Abre la consola del navegador:**
   - Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
   - O `Cmd+Option+I` (Mac)
   - Ve a la pestaña "Console"

4. **Ejecuta el siguiente comando:**
   ```javascript
   runRLSTests()
   ```

5. **Revisa los resultados** en la consola

## Método 3: Desde el Código (Para Desarrolladores)

Si quieres ejecutarlo programáticamente desde otro componente:

```typescript
import { testRLSPolicies } from '../utils/testRLSPolicies';
import { useAuth } from '../hooks/useAuth';

// En tu componente:
const { user } = useAuth();

const handleTest = async () => {
  const results = await testRLSPolicies(user);
  console.log('Resultados:', results);
};
```

## Qué Verifica el Script

El script prueba las siguientes políticas RLS:

1. **SELECT**: 
   - ✅ Usuarios normales solo ven sus propias solicitudes
   - ✅ Administradores ven todas las solicitudes
   - ✅ Conserjes ven solicitudes de su condominio

2. **INSERT**: 
   - ✅ Usuarios solo pueden crear solicitudes para sí mismos
   - ✅ El estado inicial debe ser 'pendiente'

3. **UPDATE**: 
   - ✅ Usuarios solo pueden actualizar sus solicitudes pendientes
   - ✅ Responsables pueden actualizar solicitudes asignadas
   - ✅ Administradores pueden actualizar cualquier solicitud

4. **DELETE**: 
   - ✅ Solo administradores pueden eliminar solicitudes
   - ✅ Usuarios normales NO pueden eliminar

## Resultados Esperados

### Si todo está correcto:
- ✅ Todas las pruebas deberían pasar (100%)
- ✅ Verás mensajes como "✅ Correcto: RLS bloqueó..."
- ✅ El resumen mostrará "🎉 ¡Todas las políticas RLS están funcionando correctamente!"

### Si hay problemas:
- ❌ Algunas pruebas fallarán
- ⚠️ Verás mensajes de error específicos
- El script te indicará qué política necesita revisión

## Solución de Problemas

### Error: "No hay usuario autenticado"
- **Solución**: Inicia sesión primero antes de ejecutar las pruebas

### Error: "Cannot read property 'id' of null"
- **Solución**: Asegúrate de que el usuario tenga todos los campos necesarios (id, nombre, rol, condominio_id)

### Las pruebas fallan pero las políticas están creadas
- **Solución**: Verifica que:
  1. Las funciones auxiliares existan (`get_current_user_id`, `is_admin`, `is_conserje`)
  2. RLS esté habilitado en la tabla `solicitudes_mantenimiento`
  3. El campo `auth_uid` esté configurado en la tabla `usuarios`

## Notas Importantes

- El script crea solicitudes de prueba que pueden quedar en la base de datos
- Si quieres limpiar las solicitudes de prueba, puedes eliminarlas manualmente desde la página de mantenimiento (si eres admin)
- Las pruebas son seguras y no afectan datos importantes
- Puedes ejecutar las pruebas múltiples veces sin problemas

## Próximos Pasos

Después de ejecutar las pruebas:

1. Si todas pasan: ✅ Las políticas RLS están funcionando correctamente
2. Si algunas fallan: Revisa los mensajes de error y ajusta las políticas en Supabase
3. Si necesitas ayuda: Revisa los detalles expandibles en la página de resultados

