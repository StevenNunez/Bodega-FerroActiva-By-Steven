# Control de Bodega y Gestión de Obra - FerroActiva

Esta es una aplicación web progresiva (PWA) robusta, desarrollada en Next.js y Firebase, diseñada para la gestión integral de bodegas, inventarios, personal y seguridad en proyectos de construcción. La plataforma es multi-inquilino (*multi-tenant*), lo que permite que múltiples empresas (suscriptores) la utilicen de forma independiente y segura, con un rol de Super Administrador para la gestión global.

## Tecnologías Utilizadas

- **Framework:** Next.js (con App Router)
- **Base de Datos:** Firebase Firestore (NoSQL en tiempo real)
- **Autenticación:** Firebase Authentication
- **UI:** ShadCN UI Components, Tailwind CSS
- **Despliegue:** Firebase App Hosting

---

## Arquitectura de Roles y Permisos

El sistema se basa en un modelo de roles y permisos flexible y granular. Cada rol tiene capacidades específicas diseñadas para su función en la obra. El **Administrador** tiene el poder de personalizar estos permisos.

| Rol                   | Descripción Breve                                                                 |
| --------------------- | --------------------------------------------------------------------------------- |
| **Super Administrador** | Control total sobre toda la plataforma y todos los suscriptores.                  |
| **Administrador**     | Gestión completa de la operación de una empresa, incluyendo permisos y usuarios.  |
| **Jefe de Bodega**    | Responsable del inventario físico, aprueba salidas y recibe devoluciones.         |
| **Administrador de Obra** | Gestiona el flujo de compras: aprueba solicitudes, crea lotes y genera órdenes. |
| **Supervisor**        | Líder en terreno: solicita materiales, compras y registra devoluciones.         |
| **APR**               | Prevencionista de Riesgos: gestiona checklists e inspecciones de seguridad.       |
| **Finanzas**          | Gestiona las facturas y pagos a proveedores.                                      |
| **Guardia**           | Rol especializado para registrar la asistencia del personal.                      |
| **Colaborador**       | Usuario básico que puede ver las herramientas que tiene a su cargo.               |

---

## Módulos y Funcionalidades Principales

### 1. Módulo de Bodega
Es el corazón de la gestión de inventario.

- **Gestión de Materiales:** Crear, editar y eliminar materiales. Incluye stock, unidad de medida, categoría y proveedor preferido.
- **Gestión de Herramientas:** Crear y editar herramientas, cada una con un código QR único para seguimiento.
- **Entrega y Devolución Rápida:** Un panel centralizado para que el Jefe de Bodega registre la salida (checkout) y entrada (return) de herramientas escaneando el QR del trabajador y de la herramienta.
- **Gestión de Solicitudes:**
    - **Materiales:** El Jefe de Bodega aprueba o rechaza las solicitudes de materiales hechas por los supervisores. Al aprobar, el stock se descuenta automáticamente.
    - **Devoluciones:** El Jefe de Bodega confirma la recepción de materiales devueltos por los supervisores, sumando el stock de vuelta al inventario.
- **Ingreso Manual de Stock:** Permite añadir stock a materiales existentes con una justificación (ej. "encontrado en bodega", "ajuste de inventario").

### 2. Módulo de Compras
Gestiona todo el ciclo de adquisición, desde la necesidad hasta la orden final.

- **Solicitud de Compra:** Los Supervisores y Administradores de Obra pueden solicitar materiales que no están en stock o cuyo nivel es bajo.
- **Gestión y Aprobación:** El Administrador de Obra revisa las solicitudes, pudiendo editar cantidades o rechazar.
- **Gestión de Lotes:** Las solicitudes aprobadas se agrupan en "lotes de compra" (ej. "Lote de Cemento Semanal"), lo que permite consolidar las necesidades antes de contactar a proveedores.
- **Generación de Órdenes de Compra (OC):** A partir de un lote, se genera una OC en PDF para un proveedor específico, formalizando el pedido.

### 3. Módulo de Pagos
Centraliza la gestión financiera con proveedores.

- **Registro de Facturas:** Se pueden ingresar facturas asociadas a un proveedor, con su monto y fecha de vencimiento.
- **Seguimiento de Pagos:** Un panel visual muestra el estado de todas las facturas: pagadas, pendientes y vencidas.
- **Marcar como Pagada:** Permite registrar la fecha y el método de pago de una factura, cerrando el ciclo.

### 4. Módulo de Usuarios y Permisos
Ofrece control total sobre el acceso y las capacidades.

- **Gestión de Usuarios:** Crear, editar y eliminar perfiles de usuario, asignando roles y credenciales.
- **Impresión de Credenciales:** Genera una página optimizada para imprimir credenciales con códigos QR para cada usuario, facilitando el registro de asistencia y el préstamo de herramientas.
- **Gestión de Permisos:** (Accesible para Administradores) Un panel visual permite activar o desactivar permisos específicos para cada rol, adaptando la plataforma a las necesidades exactas de la empresa.

### 5. Módulo de Seguridad (APR)
Dedicado a la prevención de riesgos en la obra.

- **Gestión de Plantillas de Checklist:** El APR puede crear plantillas reutilizables para diferentes tipos de inspecciones (ej. "Revisión de Andamios").
- **Asignación de Checklists:** Las plantillas se pueden asignar a supervisores específicos para que las completen en una obra o área determinada.
- **Revisión y Aprobación:** Una vez que un supervisor completa un checklist, el APR lo revisa, pudiendo aprobarlo o rechazarlo con notas para su corrección.
- **Inspecciones de Seguridad:** Permite registrar hallazgos no planificados, asignar responsables para su corrección y dar seguimiento hasta su cierre.

### 6. Módulo de Asistencia
Un sistema sencillo y eficaz para el control de personal.

- **Registro por QR:** El rol de "Guardia" tiene acceso a una interfaz optimizada para escanear el código QR de los trabajadores, registrando su entrada y salida de forma instantánea.
- **Reportes:** Genera reportes de asistencia semanales y mensuales, y calcula horas extras.

---

## Flujos de Trabajo Destacados

1.  **Ciclo de Material (Salida y Devolución):**
    - `Supervisor` solicita 10 unidades de "Clavos".
    - `Jefe de Bodega` aprueba la solicitud. El stock se reduce en 10.
    - `Supervisor` usa 8 unidades y le sobran 2.
    - `Supervisor` crea una "solicitud de devolución" por 2 unidades.
    - `Jefe de Bodega` recibe los clavos, confirma la devolución en el sistema. El stock aumenta en 2.

2.  **Ciclo de Compra:**
    - `Supervisor` necesita un material sin stock y crea una "Solicitud de Compra".
    - `Administrador de Obra` aprueba la solicitud.
    - La solicitud aparece en el panel de "Lotes", donde se agrupa con otras del mismo tipo.
    - `Administrador de Obra` genera una "Orden de Compra" en PDF a partir del lote para un proveedor.
    - Cuando el material llega a bodega, `Jefe de Bodega` lo ingresa al sistema, aumentando el stock.
