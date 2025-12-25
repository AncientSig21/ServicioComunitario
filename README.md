# Biblioteca Virtual / Virtual Library

![Biblioteca Virtual](public/Biblioteca.JPG)

> 📸 **More screenshots and images available in the `public/` folder**  
> 📸 **Más capturas de pantalla e imágenes disponibles en la carpeta `public/`**

[English](#english) | [Español](#español)



---

## 🇺🇸 English

### Virtual Library - University

Digital library management system developed with React, TypeScript, and Supabase.

#### 🚀 Features

- **Physical and digital book management**
- **Reservation and loan system**
- **Access to theses and research projects**
- **Administration panel**
- **User authentication**
- **Overdue control system**

#### 🛠️ Technologies

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Routing:** React Router DOM
- **Animations:** Framer Motion

#### 📋 Requirements

- Node.js 18+
- npm or yarn
- Supabase account

#### ⚙️ Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd biblioteca-virtual
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_API_KEY=your_api_key_here
   VITE_PROJECT_URL_SUPABASE=your_project_url_here
   ```

4. **Run in development:**
   ```bash
   npm run dev
   ```

#### 🗄️ Database Structure

The project uses the following tables in Supabase:
- `usuarios` - User information
- `Libros` - Book catalog
- `libros_autores` - Book-author relationship
- `libros_fisicos` - Physical book inventory
- `libros_virtuales` - Digital files
- `ordenes` - Loan and reservation system
- `tesis` - Research projects

#### 📱 Functionality

**For Students/Faculty:**
- Explore book catalog
- Reserve physical books
- Access digital theses
- View loan history
- Advanced search system

**For Administrators:**
- Statistics panel
- Book management
- Loan reports
- User control

#### 🔧 Available Scripts

- `npm run dev` - Development server
- `npm run build` - Build for production
- `npm run preview` - Production preview
- `npm run lint` - Code verification

#### 🐛 Troubleshooting

**Supabase Configuration Error:**
If you see a configuration error message:
1. Verify that the `.env` file exists
2. Confirm that environment variables are correct
3. Restart the development server

**Connection Issues:**
- Check your internet connection
- Confirm that Supabase credentials are valid
- Check browser console for specific errors

#### 📄 License

This project is for internal university use.

---

## 🇪🇸 Español

### Biblioteca Virtual - Universidad

Sistema de gestión de biblioteca digital desarrollado con React, TypeScript y Supabase.

#### 🚀 Características

- **Gestión de libros físicos y digitales**
- **Sistema de reservas y préstamos**
- **Acceso a tesis y proyectos de investigación**
- **Panel de administración**
- **Autenticación de usuarios**
- **Control de morosidad**

#### 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Routing:** React Router DOM
- **Animaciones:** Framer Motion

#### 📋 Requisitos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase

#### ⚙️ Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd biblioteca-virtual
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crear un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_API_KEY=tu_api_key_aqui
   VITE_PROJECT_URL_SUPABASE=tu_url_del_proyecto_aqui
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

#### 🗄️ Estructura de la Base de Datos

El proyecto utiliza las siguientes tablas en Supabase:
- `usuarios` - Información de usuarios
- `Libros` - Catálogo de libros
- `libros_autores` - Relación libros-autores
- `libros_fisicos` - Inventario de libros físicos
- `libros_virtuales` - Archivos digitales
- `ordenes` - Sistema de préstamos y reservas
- `tesis` - Proyectos de investigación

#### 📱 Funcionalidades

**Para Estudiantes/Docentes:**
- Explorar catálogo de libros
- Reservar libros físicos
- Acceder a tesis digitales
- Ver historial de préstamos
- Sistema de búsqueda avanzada

**Para Administradores:**
- Panel de estadísticas
- Gestión de libros
- Reportes de préstamos
- Control de usuarios

#### 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run preview` - Vista previa de producción
- `npm run lint` - Verificar código

#### 🐛 Solución de Problemas

**Error de configuración de Supabase:**
Si ves un mensaje de error de configuración:
1. Verifica que el archivo `.env` existe
2. Confirma que las variables de entorno son correctas
3. Reinicia el servidor de desarrollo

**Problemas de conexión:**
- Verifica tu conexión a internet
- Confirma que las credenciales de Supabase son válidas
- Revisa la consola del navegador para errores específicos

#### 📄 Licencia

Este proyecto es de uso interno para la universidad.

---

## 🌐 Quick Navigation / Navegación Rápida

[⬆️ Back to top / Volver arriba](#biblioteca-virtual--virtual-library) 