Clases del Panel de Administración (Dashboard)
Layout Principal:

.dashboard: Contenedor maestro que estructura la vista en una cuadrícula (Grid) responsiva de dos columnas (barra lateral y contenido principal).

Barra Lateral (Sidebar):

.sidebar: Barra lateral fija con efecto glassmorphism que contiene la navegación y el cierre de sesión.

.sidebar-header: Cabecera de la barra lateral destinada al logotipo o título del sistema.

.sidebar-nav: Contenedor flexible que agrupa todos los enlaces de navegación del menú.

.sidebar-footer: Sección inferior de la barra lateral para ubicar acciones de salida.

.logout-btn: Botón estilizado con alertas visuales para la acción de cerrar sesión.

Contenido Principal y Barra Superior (Top-Bar):

.main-content: Contenedor de la columna derecha que apila la barra superior y el área de contenido.

.top-bar: Barra de navegación superior fija que contiene el título de la vista, acciones rápidas y perfil.

.top-actions: Contenedor para botones de acción rápida (notificaciones, ajustes).

.icon-btn: Botón cuadrado e interactivo para los iconos de la barra superior.

.divider: Línea vertical decorativa y semitransparente para separar elementos de la barra superior.

Perfil de Usuario:

.user-profile: Contenedor que agrupa el avatar y la información del usuario conectado.

.user-avatar-wrapper: Marco circular contenedor del avatar o icono por defecto.

.user-avatar: Imagen real del perfil del usuario con ajuste de escala (object-fit).

.user-default-icon: Icono predeterminado de usuario cuando no se proporciona una imagen de avatar.

.user-info: Bloque de texto que muestra el nombre de usuario y su rol.

.muted: Texto atenuado para información secundaria (como el rol del usuario).

Área Dinámica:

.content-area: Contenedor con espaciado interior (padding) donde se renderizan dinámicamente los componentes hijos a través del <router-outlet>.