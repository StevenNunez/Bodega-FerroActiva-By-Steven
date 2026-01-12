# Control de Obra App - Gestión Inteligente en Tiempo Real

**Control de Obra App** es una aplicación web progresiva (PWA) de nivel empresarial, diseñada para la **gestión y control de obras en tiempo real**. Construida sobre Next.js y Firebase, esta plataforma multi-inquilino (*multi-tenant*) centraliza cada aspecto de un proyecto de construcción, desde el inventario y las compras hasta el avance físico y la seguridad, potenciada por **Ferro IA**, un asistente de inteligencia artificial.

## Planes y Roles

La plataforma está diseñada para escalar con tus necesidades, ofreciendo planes específicos para cada tipo de actor en la industria de la construcción:

-   **Plan Contratista:** Ideal para equipos especializados. Enfocado en la gestión de personal, control de asistencia, gestión de contratos y un módulo de estado de pagos para controlar el flujo financiero de sus trabajos.
-   **Plan Constructora:** La solución completa para la gestión integral de proyectos. Incluye todo lo del Plan Contratista, más módulos avanzados para el control de obra (EDT, Carta Gantt, Curva S), gestión de bodega, ciclo de compras y múltiples obras.
-   **Plan Inmobiliaria:** Visión macro para la supervisión de grandes proyectos. Incluye todas las funcionalidades del Plan Constructora, con herramientas adicionales para la gestión de macro-proyectos con jerarquías complejas (torres, pisos, departamentos) y reportes consolidados.

Cada plan cuenta con un sistema granular de roles y permisos, desde el `Super Administrador` hasta el `Colaborador`, asegurando que cada usuario tenga acceso únicamente a la información y herramientas que necesita.

---

## Módulos y Funcionalidades Principales

### 1. Asistente Inteligente (Ferro IA)
Integrado en el panel de control, **Ferro IA** es un asistente conversacional que utiliza IA generativa para:
- **Analizar Datos en Tiempo Real:** Procesa información de inventario, solicitudes y avance de obra para ofrecer respuestas contextualizadas.
- **Detección Proactiva de Riesgos:** Identifica automáticamente materiales con stock crítico y sugiere acciones correctivas inmediatas.
- **Toma de Decisiones Ágil:** Ayuda a los administradores a tomar decisiones informadas rápidamente, respondiendo preguntas complejas sobre el estado de la obra.

### 2. Control de Obra (EDT y Avance Físico)
Este módulo es el centro neurálgico para la planificación y seguimiento del proyecto.

- **Estructura de Desglose del Trabajo (EDT):** Permite al Jefe de Oficina Técnica definir la estructura jerárquica completa de la obra, desde el proyecto principal hasta las tareas más pequeñas, asignando unidades, cantidades y precios unitarios.
- **Registro de Avance Diario:** Los Supervisores y Jefes de Terreno pueden registrar el avance físico diario de cada partida o actividad, con la opción de añadir observaciones y fotos.
- **Protocolos de Calidad:** Una vez que una partida alcanza el 100% de su avance, el supervisor la envía a "protocolo". El equipo de Calidad revisa el trabajo y lo aprueba o rechaza con notas para su corrección.
- **Visualización Gantt:** Un diagrama de Gantt interactivo permite visualizar el cronograma completo de la obra, ajustar fechas, ver dependencias y el progreso real vs. el planificado.
- **Curva S:** Genera automáticamente la Curva S del proyecto, comparando el avance físico programado con el avance real para un control financiero y de plazos preciso.

### 3. Módulo de Bodega
Es el corazón de la gestión de inventario.

- **Gestión de Materiales y Herramientas:** Catálogo centralizado con stock, categorías, proveedores y códigos QR únicos para herramientas.
- **Entrega y Devolución Rápida:** Panel para registrar la salida (checkout) y entrada (return) de herramientas y materiales mediante escaneo de QR.
- **Gestión de Solicitudes y Devoluciones:** Flujo de aprobación para la entrega y recepción de materiales, con actualización automática del stock.

### 4. Módulo de Compras
Gestiona todo el ciclo de adquisición de forma optimizada.

- **Solicitud de Compra:** Supervisores y Jefes de Terreno solicitan materiales sin stock.
- **Aprobación y Agrupación en Lotes:** El Administrador de Obra aprueba las solicitudes y las agrupa en "lotes de compra" para consolidar necesidades por proveedor.
- **Generación de Cotizaciones:** A partir de un lote, se genera una solicitud de cotización en PDF para enviar al proveedor.
- **Procesamiento por Finanzas:** El equipo de Finanzas sube la cotización del proveedor, valida precios y cantidades, y con un clic, genera la **Orden de Compra oficial (PDF)**.
- **Recepción en Bodega:** El Jefe de Bodega recibe los materiales, los ingresa al sistema (vinculando a un ítem existente o creando uno nuevo) y actualiza el stock.

### 5. Módulo de Pagos
Centraliza la gestión financiera con proveedores.

- **Registro de Facturas:** Se ingresan facturas asociadas a una OC y proveedor, con su monto y fecha de vencimiento.
- **Seguimiento de Pagos:** Panel visual para controlar el estado de las facturas: pagadas, pendientes y vencidas.

### 6. Módulo de Usuarios y Permisos
Ofrece control total sobre el acceso y las capacidades.

- **Gestión de Usuarios y Credenciales:** Creación de perfiles, asignación de roles y generación de credenciales con QR para asistencia y préstamo de herramientas.
- **Gestión Fina de Permisos:** Panel visual para que el Administrador active o desactive permisos específicos para cada rol.

### 7. Módulo de Seguridad (APR)
Dedicado a la prevención de riesgos en la obra.

- **Gestión de Plantillas y Checklists:** Creación de plantillas de inspección, asignación a supervisores y revisión de los formularios completados.
- **Inspecciones y Observaciones de Conducta:** Permite registrar hallazgos no planificados, registrar observaciones de comportamiento y dar seguimiento a las acciones correctivas.

### 8. Módulo de Asistencia y RRHH
Un sistema sencillo y eficaz para el control de personal.

- **Registro por QR:** Rol de "Guardia" con interfaz optimizada para escanear el QR de los trabajadores y registrar su asistencia.
- **Reportes y Liquidaciones:** Genera reportes de horas, atrasos, horas extras y permite calcular liquidaciones de sueldo.
- **Generador de Finiquito:** Herramienta para calcular finiquitos según la normativa chilena, incluyendo indemnizaciones y feriados proporcionales.
