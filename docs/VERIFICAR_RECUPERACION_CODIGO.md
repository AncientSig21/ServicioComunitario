# How to verify recovery-by-code functionality

After running the SQL scripts (`eliminar_preguntas_seguridad.sql` and `agregar_codigo_recuperacion.sql`), follow these steps to confirm everything works.

---

## 1. Register a new user and get the recovery code

1. Open your app and go to **Register** (create account page).
2. Fill in the form (name, email, password, etc.) and submit.
3. After a successful registration you should see an **alert** that includes:
   - A message that an admin will review the request.
   - **Your recovery code** (e.g. `AB3K9X2P`).
   - A note that the admin can also see this code in the Residentes section.
4. **Copy or write down this code** (you’ll use it in step 3).

If you don’t see the code in the alert, the registration flow is not saving/showing it yet — check that the latest frontend and `agregar_codigo_recuperacion.sql` are deployed.

---

## 2. (Optional) Check in Supabase that the code was saved

1. In **Supabase** go to **Table Editor** → table **`usuarios`**.
2. Find the user you just created (e.g. by email).
3. Check the **`codigo_recuperacion`** column: it should contain the same 8-character code you saw in the alert.

If the column is empty, the insert is not including `codigo_recuperacion` — check RegisterPage and that the column exists (from `agregar_codigo_recuperacion.sql`).

---

## 3. Reset password using the recovery code

1. Log out (or use an incognito window).
2. Go to **Login** and click **“¿Olvidaste tu contraseña?”** (or the link to the forgot-password page).
3. **Step 1 – Email:** Enter the **same email** you used to register and continue.
4. **Step 2 – Code:** Enter the **recovery code** you saved from the registration alert (same characters, no spaces).
5. **Step 3 – New password:** Enter a new password and confirm it, then submit.
6. You should see a **success message** (e.g. “Contraseña actualizada” or similar).

If you get “Código de recuperación incorrecto” or “Usuario no encontrado”, double-check email and code. If the app says the user has no recovery code, the RPC `reset_password_con_codigo` may be missing or the user has no `codigo_recuperacion` in the DB (step 2).

---

## 4. Log in with the new password

1. Go back to **Login**.
2. Sign in with the **same email** and the **new password** you just set.
3. You should be able to enter the app.

This confirms that the password was actually updated.

---

## 5. Admin: see the recovery code in Residentes

1. Log in as an **administrator**.
2. Go to **Admin** → **Residentes** (or the Residents section in your menu).
3. In the residents table you should see a column **“Código recuperación”** with the 8-character code for each resident who has one (or “—” if empty).
4. Click **“Cambiar Estado”** (or similar) for one resident to open the edit modal.
5. In the modal you should see a line **“Código de recuperación: XXXXXXXX”** (or “—”).

This confirms that admins can see and copy the code to give to a resident who lost it.

---

## Quick checklist

| Step | What to do | Expected result |
|------|------------|------------------|
| 1 | Register new user | Alert shows recovery code; you save it. |
| 2 | (Optional) Supabase → `usuarios` | `codigo_recuperacion` has the same code. |
| 3 | Forgot password → email → code → new password | Success message. |
| 4 | Login with new password | Login works. |
| 5 | Admin → Residentes | Column “Código recuperación” and code in modal. |

If any step fails, check:  
- That both SQL scripts were run (no preguntas_seguridad, column and RPC for code).  
- That the app build includes the latest RegisterPage and ForgotPasswordPage.  
- Browser console and Supabase logs for errors.
