# Cómo restaurar el backup (antes de API tipo de cambio)

Se creó un **punto de restauración** antes de implementar la API de tipo de cambio (dólar Venezuela).

## Qué se guardó

- **Commit:** `448bf91` — "Backup: punto de restauracion antes de implementar API tipo de cambio (dolar Venezuela)"
- **Etiqueta (tag):** `backup-pre-api-dolar`
- **Rama de respaldo:** `backup/pre-api-dolar`

## Cómo volver a este punto si algo sale mal

### Opción 1: Deshacer cambios y dejar la rama actual en el estado del backup

Si estás en `desarrollo-local` y quieres que todo vuelva a como estaba en el backup (descartando los cambios posteriores a la API):

```bash
git reset --hard backup-pre-api-dolar
```

**Cuidado:** Esto borra todos los commits y cambios no guardados posteriores al backup en la rama actual.

### Opción 2: Solo ver el código del backup (sin cambiar tu rama)

Para revisar archivos tal como estaban en el backup:

```bash
git show backup-pre-api-dolar:ruta/del/archivo
```

O cambiar temporalmente a ese estado (modo “detached HEAD”):

```bash
git checkout backup-pre-api-dolar
```

Para volver a tu rama de trabajo:

```bash
git checkout desarrollo-local
```

### Opción 3: Trabajar desde la rama de respaldo

Si quieres seguir desarrollando desde el estado del backup en una rama aparte:

```bash
git checkout backup/pre-api-dolar
```

Ahí tendrás el proyecto exactamente como en el momento del backup. Puedes crear desde aquí una nueva rama para seguir trabajando.

---

**Fecha del backup:** generado antes de implementar la API de tipo de cambio Venezuela (monto de pagos en tiempo real).
