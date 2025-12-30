# Control de Bodega y Gestión de Obra - FerroActiva

Esta es una aplicación web progresiva (PWA) robusta, desarrollada en Next.js y Firebase, diseñada para la gestión integral de bodegas, inventarios, personal, seguridad y avance de obra en proyectos de construcción. La plataforma es multi-inquilino (*multi-tenant*), lo que permite que múltiples empresas (suscriptores) la utilicen de forma independiente y segura, con un rol de Super Administrador para la gestión global.

## Tecnologías Utilizadas

- **Framework:** Next.js (con App Router)
- **Base de Datos:** Firebase Firestore (NoSQL en tiempo real)
- **Autenticación:** Firebase Authentication
- **UI:** ShadCN UI Components, Tailwind CSS
- **Despliegue:** Firebase App Hosting

---

## Arquitectura de Roles y Permisos

El sistema se basa en un modelo de roles y permisos flexible y granular. Cada rol tiene capacidades específicas diseñadas para su función en la obra. El **Administrador** tiene el poder de personalizar estos permisos.

| Rol                       | Descripción Breve                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **Super Administrador**   | Control total sobre toda la plataforma y todos los suscriptores.                         |
| **Administrador**         | Gestión completa de la operación de una empresa, incluyendo permisos y usuarios.       |
| **Jefe de Oficina Técnica** | Planifica la estructura de la obra (EDT), presupuestos y la Carta Gantt.                  |
| **Jefe de Terreno**       | Gestiona el avance físico de la obra y supervisa a los líderes de equipo.               |
| **Jefe de Bodega**        | Responsable del inventario físico, aprueba salidas y recibe devoluciones.                |
| **Supervisor**            | Líder en terreno: solicita materiales, registra avances y completa tareas de seguridad.   |
| **APR** / **CPHS**        | Prevencionista de Riesgos: gestiona checklists e inspecciones de seguridad.              |
| **Calidad**               | Revisa y aprueba los protocolos de calidad de las partidas finalizadas.                   |
| **Finanzas**              | Gestiona las facturas, pagos y procesa las cotizaciones para generar Órdenes de Compra. |
| **Guardia**               | Rol especializado para registrar la asistencia del personal.                             |
| **Colaborador**           | Usuario básico que puede ver las herramientas que tiene a su cargo.                      |

---

## Módulos y Funcionalidades Principales

### 1. Control de Obra (EDT y Avance Físico)
Este módulo es el centro neurálgico para la planificación y seguimiento del proyecto.

- **Estructura de Desglose del Trabajo (EDT):** Permite al Jefe de Oficina Técnica definir la estructura jerárquica completa de la obra, desde el proyecto principal hasta las tareas más pequeñas, asignando unidades, cantidades y precios unitarios.
- **Registro de Avance Diario:** Los Supervisores y Jefes de Terreno pueden registrar el avance físico diario de cada partida o actividad, con la opción de añadir observaciones y fotos.
- **Protocolos de Calidad:** Una vez que una partida alcanza el 100% de su avance, el supervisor la envía a "protocolo". El equipo de Calidad revisa el trabajo y lo aprueba o rechaza con notas para su corrección.
- **Visualización Gantt:** Un diagrama de Gantt interactivo permite visualizar el cronograma completo de la obra, ajustar fechas, ver dependencias y el progreso real vs. el planificado.
- **Curva S:** Genera automáticamente la Curva S del proyecto, comparando el avance físico programado con el avance real para un control financiero y de plazos preciso.

### 2. Módulo de Bodega
Es el corazón de la gestión de inventario.

- **Gestión de Materiales y Herramientas:** Catálogo centralizado con stock, categorías, proveedores y códigos QR únicos para herramientas.
- **Entrega y Devolución Rápida:** Panel para registrar la salida (checkout) y entrada (return) de herramientas y materiales mediante escaneo de QR.
- **Gestión de Solicitudes y Devoluciones:** Flujo de aprobación para la entrega y recepción de materiales, con actualización automática del stock.

### 3. Módulo de Compras
Gestiona todo el ciclo de adquisición de forma optimizada.

- **Solicitud de Compra:** Supervisores y Jefes de Terreno solicitan materiales sin stock.
- **Aprobación y Agrupación en Lotes:** El Administrador de Obra aprueba las solicitudes y las agrupa en "lotes de compra" para consolidar necesidades por proveedor.
- **Generación de Cotizaciones:** A partir de un lote, se genera una solicitud de cotización en PDF para enviar al proveedor.
- **Procesamiento por Finanzas:** El equipo de Finanzas sube la cotización del proveedor, valida precios y cantidades, y con un clic, genera la **Orden de Compra oficial (PDF)**.
- **Recepción en Bodega:** El Jefe de Bodega recibe los materiales, los ingresa al sistema (vinculando a un ítem existente o creando uno nuevo) y actualiza el stock.

### 4. Módulo de Pagos
Centraliza la gestión financiera con proveedores.

- **Registro de Facturas:** Se ingresan facturas asociadas a una OC y proveedor, con su monto y fecha de vencimiento.
- **Seguimiento de Pagos:** Panel visual para controlar el estado de las facturas: pagadas, pendientes y vencidas.

### 5. Módulo de Usuarios y Permisos
Ofrece control total sobre el acceso y las capacidades.

- **Gestión de Usuarios y Credenciales:** Creación de perfiles, asignación de roles y generación de credenciales con QR para asistencia y préstamo de herramientas.
- **Gestión Fina de Permisos:** Panel visual para que el Administrador active o desactive permisos específicos para cada rol.

### 6. Módulo de Seguridad (APR)
Dedicado a la prevención de riesgos en la obra.

- **Gestión de Plantillas y Checklists:** Creación de plantillas de inspección, asignación a supervisores y revisión de los formularios completados.
- **Inspecciones y Observaciones de Conducta:** Permite registrar hallazgos no planificados, registrar observaciones de comportamiento y dar seguimiento a las acciones correctivas.

### 7. Módulo de Asistencia y RRHH
Un sistema sencillo y eficaz para el control de personal.

- **Registro por QR:** Rol de "Guardia" con interfaz optimizada para escanear el QR de los trabajadores y registrar su asistencia.
- **Reportes y Liquidaciones:** Genera reportes de horas, atrasos, horas extras y permite calcular liquidaciones de sueldo.
- **Generador de Finiquito:** Herramienta para calcular finiquitos según la normativa chilena, incluyendo indemnizaciones y feriados proporcionales.

---

## Flujos de Trabajo Destacados

1.  **Ciclo de Avance de Obra:**
    - `Jefe de Oficina Técnica` crea la partida "01.01.02.03 Hormigonado de fundaciones".
    - `Supervisor` registra un avance de 50 m³ para esa partida. El sistema actualiza el progreso al 5.26%.
    - El `Supervisor` completa el 100% y envía la partida a "protocolo".
    - `Calidad` revisa el trabajo, lo aprueba. La partida se marca como "Completada".

2.  **Ciclo de Compra Avanzado:**
    - `Supervisor` necesita un material sin stock y crea una "Solicitud de Compra".
    - `Administrador de Obra` aprueba la solicitud y la agrupa en el "Lote de Cementos de la Semana".
    - `Administrador de Obra` genera una "Solicitud de Cotización" para el proveedor "Cementos Bio-Bio".
    - `Finanzas` recibe la cotización del proveedor, sube el PDF, ajusta los precios y genera la "Orden de Compra" oficial.
    - `Jefe de Bodega` recibe el camión, escanea la OC y registra el ingreso del material al inventario.
