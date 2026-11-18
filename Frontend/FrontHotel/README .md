::: {align="center"}
# Ultimate Hotel Software --- UHS

### Plataforma integral de gestión hotelera con atención tradicional y flujos digitales de autoservicio

![Java](https://img.shields.io/badge/Java-17%20%7C%2021-orange?logo=openjdk&logoColor=white)
![Spring
Boot](https://img.shields.io/badge/Spring%20Boot-Backend-6DB33F?logo=springboot&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-Standalone%20%7C%20Signals-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-UI-1572B6?logo=css3&logoColor=white)

**Proyecto Integrador --- Programación IV**\
**Tecnicatura Universitaria en Programación \| UTN --- Facultad Regional
Mar del Plata**
:::

------------------------------------------------------------------------

## 📌 Descripción del proyecto

**Ultimate Hotel Software (UHS)** es un sistema de gestión hotelera
diseñado para centralizar y simplificar las operaciones administrativas
y de atención al huésped.

La plataforma contempla dos modalidades de interacción:

-   **Atención tradicional:** permite al personal del hotel administrar
    reservas, registrar huéspedes, gestionar ingresos y egresos,
    controlar habitaciones, procesar pagos y atender solicitudes.
-   **Flujo digital de autoservicio:** brinda a los huéspedes
    funcionalidades para registrarse, consultar disponibilidad,
    gestionar sus reservas y acceder a información relacionada con su
    estadía.

El objetivo es integrar los procesos operativos del establecimiento en
una única aplicación, mejorar la trazabilidad de la información y
ofrecer una experiencia de uso clara tanto para el personal como para
los huéspedes.

## 🏗️ Arquitectura y tecnologías

UHS se plantea como una aplicación **Full Stack** organizada en dos
grandes capas: un backend encargado de la lógica de negocio y
persistencia, y un frontend responsable de la interfaz y la interacción
con los usuarios.

### Backend

  -----------------------------------------------------------------------
  Tecnología                          Responsabilidad
  ----------------------------------- -----------------------------------
  **Java 17 / 21**                    Lenguaje de programación de la
                                      lógica de servidor. La versión
                                      definitiva debe coincidir con la
                                      configurada en el proyecto.

  **Spring Boot**                     Configuración y ejecución de la
                                      aplicación backend y exposición de
                                      servicios HTTP.

  **Spring Security**                 Seguridad y control de acceso a los
                                      recursos de la aplicación.

  **JWT (JSON Web Token)**            Autenticación basada en tokens para
                                      las solicitudes protegidas.

  **Spring Data JPA**                 Acceso y persistencia de datos
                                      mediante entidades y repositorios.

  **Hibernate**                       Implementación ORM utilizada
                                      habitualmente junto con JPA.

  **MySQL**                           Motor de base de datos relacional.

  **Maven**                           Gestión de dependencias y ciclo de
                                      construcción, si el backend utiliza
                                      Maven.
  -----------------------------------------------------------------------

> **Nota de configuración:** el código backend y su archivo de
> construcción no forman parte del material fuente adjunto para esta
> documentación. Las tecnologías anteriores corresponden al stack
> definido para el proyecto y deben verificarse contra el `pom.xml` y la
> configuración real antes de publicar versiones concretas.

### Frontend

  -----------------------------------------------------------------------
  Tecnología                          Responsabilidad
  ----------------------------------- -----------------------------------
  **Angular**                         Framework para la construcción de
                                      la aplicación web.

  **TypeScript**                      Lenguaje principal de la capa de
                                      presentación.

  **Standalone Components**           Organización modular de la interfaz
                                      sin depender de NgModules
                                      tradicionales.

  **Angular Signals**                 Gestión reactiva del estado de los
                                      componentes mediante `signal()` y
                                      `computed()`.

  **Angular Control Flow**            Renderizado condicional e iterativo
                                      mediante `@if`, `@for` y `@switch`.

  **Angular Router**                  Navegación entre páginas y módulos
                                      de la aplicación.

  **HttpClient / RxJS**               Comunicación HTTP con el backend y
                                      tratamiento de flujos asíncronos.

  **CSS3**                            Estilos, diseño adaptable y
                                      composición visual de la interfaz.

  **Bootstrap Icons / Font Awesome**  Recursos gráficos e iconografía
                                      utilizados en las vistas.
  -----------------------------------------------------------------------

La interfaz incorpora una estética basada en tarjetas translúcidas
(*Glassmorphism*), superficies y contrastes visuales, componentes
reutilizables y adaptación a distintos tamaños de pantalla. La
implementación utiliza hojas CSS propias para personalizar las vistas.

## 🧩 Módulos principales del sistema

Los siguientes módulos se identifican a partir de los componentes,
modelos y servicios presentes en el frontend.

### 1. Gestión de usuarios y cuentas

-   Registro, consulta, edición y administración de usuarios.
-   Diferenciación de perfiles mediante roles.
-   Asociación de huéspedes con reservas.
-   Consulta de cuentas vinculadas a las estadías.
-   Visualización de importes, pagos realizados y saldos pendientes.

**Roles identificados en los modelos del frontend:**

-   `ADMIN`
-   `RECEPCIONIST`
-   `HOUSEKEEPING`
-   `MAINTENANCE`
-   `RELIEF_STAFF`
-   `GUEST`

### 2. Resumen de cuenta y gestión de pagos

El módulo de cuentas permite consultar el detalle económico de una
estadía y mantener un historial de las operaciones registradas.

Entre sus funcionalidades se encuentran:

-   Desglose de cargos de estadía y consumos adicionales.
-   Aplicación de ajustes porcentuales, incluidos descuentos.
-   Cálculo del total actualizado y del saldo pendiente.
-   Registro y consulta del historial de pagos.
-   Referencia o comprobante de la transacción.
-   Generación de un recibo mediante la función de impresión del
    navegador.

**Medios de pago identificados en el código:**

  Código          Medio
  --------------- --------------------
  `CASH`          Efectivo
  `CREDIT_CARD`   Tarjeta de crédito
  `DEBIT_CARD`    Tarjeta de débito
  `TRANSFER`      Transferencia

> La billetera virtual no aparece como método independiente en las
> opciones del formulario inspeccionado. Si el negocio la contempla,
> puede documentarse como una modalidad de transferencia o incorporarse
> como un medio específico en el modelo y backend.

### 3. Reservas, disponibilidad y check-in

Este módulo acompaña el ciclo de reserva desde la búsqueda inicial hasta
el ingreso del huésped.

-   Consulta de disponibilidad según fechas y cantidad de huéspedes.
-   Visualización de habitaciones disponibles, capacidad, tipo y precio
    por noche.
-   Cálculo del costo estimado según la duración de la estadía.
-   Selección de habitación y preparación de los datos de reserva.
-   Registro y consulta de reservas.
-   Asociación de reservas con huéspedes registrados.
-   Gestión del proceso de check-in.
-   Consulta de estadías y reservas pendientes.
-   Generación y lectura de códigos QR en los flujos que los utilizan.
-   Procesamiento de reservas con condición de *No-Show* desde el flujo
    de gestión correspondiente.

### 4. Gestión de habitaciones y tipos de habitación

Permite administrar el inventario de habitaciones y sus características.

-   Alta, consulta, modificación y eliminación de habitaciones.
-   Administración de tipos de habitación.
-   Definición de capacidad, descripción y precio por noche.
-   Consulta de estado y disponibilidad.
-   Visualización de imágenes asociadas a las habitaciones.
-   Galería de imágenes para consultar los detalles de cada habitación.

### 5. Consumos y atenciones al cuarto

El módulo de atención al cuarto permite registrar y administrar
solicitudes de productos o servicios durante la estadía.

-   Registro de consumos asociados a una reserva.
-   Selección de ítems y cantidades.
-   Consulta de atenciones pendientes y registradas.
-   Marcado de solicitudes como entregadas.
-   Eliminación de registros cuando corresponde.
-   Notificación interna de cambios para actualizar las vistas.
-   Integración de los consumos con el resumen de cuenta.

### 6. Catálogo de ítems

Centraliza los productos y servicios que pueden ofrecerse al huésped.

-   Alta, edición y eliminación de ítems.
-   Administración de información descriptiva y precios.
-   Carga y consulta de imágenes asociadas.
-   Disponibilidad de los ítems para su utilización en las atenciones al
    cuarto.

### 7. Comentarios y reseñas

Incluye funcionalidades para registrar y consultar comentarios de los
huéspedes.

-   Formulario para la carga de comentarios.
-   Listado y consulta de reseñas.
-   Acceso a las opiniones desde las vistas correspondientes.

### 8. Gestión de empleados

Contempla la administración del personal del establecimiento.

-   Alta de empleados.
-   Consulta del listado.
-   Edición de información.
-   Organización de la información del personal para las tareas
    operativas.

### 9. Panel de control --- Inicio

El panel de inicio funciona como punto de acceso a las operaciones del
sistema y organiza la navegación hacia los módulos disponibles según el
perfil del usuario.

La interfaz diferencia las opciones disponibles para huéspedes y
personal administrativo, de recepción y operación.

## 📁 Estructura de directorios

El proyecto se organiza conceptualmente como un **monorepositorio**, con
separación entre frontend y backend. El material fuente adjunto permite
identificar en detalle la estructura Angular; la estructura interna del
backend debe ajustarse a los paquetes reales del repositorio.

``` text
Ultimate-Hotel-Software/
│
├── Backend/
│   └── [Proyecto Spring Boot]
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/
│       │   │   │   └── [paquete raíz]/
│       │   │   │       ├── controller/
│       │   │   │       ├── service/
│       │   │   │       ├── repository/
│       │   │   │       ├── model/
│       │   │   │       ├── dto/
│       │   │   │       └── config/
│       │   │   └── resources/
│       │   │       └── application.properties
│       │   └── test/
│       └── pom.xml
│
├── Frontend/
│   └── FrontHotel/
│       ├── src/
│       │   └── app/
│       │       ├── components/
│       │       │   ├── account-detail/
│       │       │   ├── account-list/
│       │       │   ├── availability/
│       │       │   ├── booking-form/
│       │       │   ├── booking-list/
│       │       │   ├── check-in-list/
│       │       │   ├── comment/
│       │       │   ├── employee/
│       │       │   ├── inicio/
│       │       │   ├── item/
│       │       │   ├── payment-list/
│       │       │   ├── room/
│       │       │   ├── room-attention/
│       │       │   ├── room-attention-global-list/
│       │       │   └── user/
│       │       │
│       │       ├── core/
│       │       │   ├── guards/
│       │       │   ├── interceptors/
│       │       │   └── services/
│       │       │
│       │       ├── models/
│       │       ├── pages/
│       │       │   ├── dashboard/
│       │       │   ├── landing/
│       │       │   ├── login/
│       │       │   └── register/
│       │       │
│       │       ├── app.component.ts
│       │       ├── app.config.ts
│       │       └── app.routes.ts
│       │
│       ├── angular.json
│       ├── package.json
│       └── tsconfig.json
│
└── README.md
```

### Organización del frontend

  -----------------------------------------------------------------------
  Directorio                          Propósito
  ----------------------------------- -----------------------------------
  `components/`                       Componentes de presentación y
                                      formularios organizados por módulo
                                      funcional.

  `core/services/`                    Servicios responsables de la
                                      comunicación HTTP y coordinación de
                                      datos.

  `core/guards/`                      Protección de rutas según las
                                      condiciones de acceso.

  `core/interceptors/`                Interceptación y configuración de
                                      solicitudes HTTP, incluida la
                                      autenticación.

  `models/`                           Interfaces y tipos TypeScript para
                                      solicitudes y respuestas DTO.

  `pages/`                            Páginas principales, como landing,
                                      login, registro y dashboard.

  `app.routes.ts`                     Definición de rutas de navegación.

  `app.config.ts`                     Configuración global de la
                                      aplicación Angular.
  -----------------------------------------------------------------------

## ⚙️ Configuración y ejecución local

### Requisitos previos

Antes de iniciar el proyecto, es necesario contar con:

-   **Java JDK 17 o 21**, según la versión configurada en el backend.
-   **Maven**, si el proyecto no incluye Maven Wrapper.
-   **Node.js** y **npm**, en versiones compatibles con el Angular
    utilizado.
-   **Angular CLI**.
-   **MySQL Server**.
-   Un editor o IDE, por ejemplo IntelliJ IDEA y Visual Studio Code.

### 1. Clonar el repositorio

``` bash
git clone <URL_DEL_REPOSITORIO>
cd Ultimate-Hotel-Software
```

### 2. Configurar la base de datos

Iniciar el servidor MySQL y crear la base de datos que utilizará el
backend.

``` sql
CREATE DATABASE ultimate_hotel_software;
```

Configurar las credenciales y los parámetros de conexión en el archivo
`application.properties` del backend.

Ejemplo orientativo:

``` properties
spring.datasource.url=jdbc:mysql://localhost:3306/ultimate_hotel_software
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

> Los nombres de la base de datos, las variables de entorno y la
> estrategia de generación del esquema deben coincidir con la
> configuración real del backend. No se deben publicar credenciales
> personales en el repositorio.

### 3. Ejecutar el backend

Abrir una terminal en el directorio del proyecto Spring Boot:

``` bash
cd Backend
```

Si el repositorio incluye Maven Wrapper:

**Windows**

``` powershell
.\mvnw.cmd spring-boot:run
```

**Linux / macOS**

``` bash
./mvnw spring-boot:run
```

Si no incluye Wrapper, utilizar Maven instalado:

``` bash
mvn spring-boot:run
```

Una vez iniciado correctamente, el backend quedará disponible en la
dirección configurada. En el código del frontend inspeccionado se
utilizan endpoints locales con el host `localhost:8080`.

### 4. Ejecutar el frontend

Abrir una segunda terminal y ubicarse en el proyecto Angular:

``` bash
cd Frontend/FrontHotel
```

Instalar las dependencias:

``` bash
npm install
```

Iniciar el servidor de desarrollo:

``` bash
ng serve
```

O, alternativamente:

``` bash
npm start
```

Si el script `start` está definido en `package.json`.

Abrir la aplicación en el navegador:

``` text
http://localhost:4200
```

### 5. Verificar la integración

Con MySQL, backend y frontend en ejecución:

1.  Comprobar que el backend inicia sin errores de conexión a la base de
    datos.
2.  Verificar que Angular puede comunicarse con los endpoints
    configurados.
3.  Iniciar sesión con un usuario habilitado.
4.  Comprobar la navegación y los permisos según el rol.
5.  Probar los flujos principales: disponibilidad, reservas, check-in,
    consumos y pagos.

> **Importante:** para que frontend y backend puedan comunicarse
> correctamente, deben estar configurados los orígenes CORS, las rutas
> de API y el mecanismo de autenticación correspondiente.

## 🔐 Seguridad y control de acceso

La aplicación contempla perfiles diferenciados para huéspedes y personal
del hotel. En el frontend se identifican guards de navegación, un
interceptor de autenticación y el envío de tokens JWT en las solicitudes
protegidas.

La autorización efectiva debe validarse también en el backend: ocultar
acciones en la interfaz no reemplaza los controles de seguridad del
servidor.

## 🎨 Interfaz de usuario

El frontend prioriza una experiencia clara, consistente y adaptable.

-   Diseño responsive para escritorio y dispositivos móviles.
-   Componentes visuales organizados por funcionalidad.
-   Tarjetas y paneles con tratamiento visual translúcido.
-   Formularios reactivos y validaciones de entrada.
-   Indicadores de carga, errores y estados de operación.
-   Tablas y vistas alternativas en formato de tarjetas.
-   Iconografía para reforzar la comprensión de las acciones.

## 🎓 Contexto académico

**Ultimate Hotel Software** es el proyecto integrador desarrollado en el
marco de la asignatura **Programación IV**, correspondiente a la
**Tecnicatura Universitaria en Programación (TUP)** de la **Universidad
Tecnológica Nacional --- Facultad Regional Mar del Plata**.

El desarrollo integra conocimientos de programación orientada a objetos,
desarrollo de aplicaciones web, persistencia de datos, consumo de APIs
REST, gestión de usuarios y diseño de interfaces.

## 👥 Autores y equipo de desarrollo

**Desarrollador:**

-   **Leonel Federico Soto**

**Equipo de desarrollo:**

-   Integrantes adicionales: completar con los nombres del equipo.

**Institución:** Universidad Tecnológica Nacional --- Facultad Regional
Mar del Plata\
**Carrera:** Tecnicatura Universitaria en Programación (TUP)\
**Asignatura:** Programación IV\
**Proyecto:** Ultimate Hotel Software (UHS)

------------------------------------------------------------------------

::: {align="center"}
**Ultimate Hotel Software --- UHS**\
*Una solución integral para una gestión hotelera más organizada,
eficiente y conectada.*
:::
