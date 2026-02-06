export const validation = {
  // Validar formato de email
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validar contraseña (mínimo 6 caracteres)
  isValidPassword(password: string): boolean {
    return password.length >= 6;
  },

  // Validar que el campo no esté vacío
  isNotEmpty(value: string): boolean {
    return value.trim().length > 0;
  },

  // Validar que las contraseñas coincidan
  passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  },

  // Obtener mensaje de error para email
  getEmailError(email: string): string | null {
    if (!email) return 'El email es requerido';
    if (!this.isValidEmail(email)) return 'Formato de email inválido';
    return null;
  },

  // Obtener mensaje de error para contraseña
  getPasswordError(password: string): string | null {
    if (!password) return 'La contraseña es requerida';
    if (!this.isValidPassword(password)) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  },

  // Obtener mensaje de error para confirmar contraseña
  getConfirmPasswordError(password: string, confirmPassword: string): string | null {
    if (!confirmPassword) return 'Confirma tu contraseña';
    if (!this.passwordsMatch(password, confirmPassword)) return 'Las contraseñas no coinciden';
    return null;
  },

  // Obtener mensaje de error para nombre
  getNombreError(nombre: string): string | null {
    if (!nombre) return 'El nombre es requerido';
    if (!this.isNotEmpty(nombre)) return 'El nombre no puede estar vacío';
    return null;
  },

  // Obtener mensaje de error para escuela
  getEscuelaError(escuela: string): string | null {
    if (!escuela) return 'Selecciona tu especialidad';
    return null;
  }
}; 