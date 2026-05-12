# Manual de uso — Panel Greensun

Guía paso a paso para usar el panel de seguimiento de clientes Odoo.

---

## 1. ¿Qué hace este panel?

Te ayuda a identificar qué clientes necesitan tu atención **sin tener que
buscarlos uno por uno en Odoo**. El sistema lee automáticamente las facturas
desde Odoo y te muestra:

- Quién dejó de comprar y desde cuándo
- Quién está pagando menos que antes
- Quién compraba seguido y se atrasó
- Cuáles son los más valiosos que están desapareciendo

Desde aquí puedes llamarlos, mandarles WhatsApp, abrirles un email, ver qué
facturas tienen pendientes y qué productos compraron — todo en un solo lugar.

---

## 2. Cómo entrar

1. Abre tu navegador en la dirección del panel (ej. `https://greensun.tuempresa.com`)
2. Te aparece una pantalla pidiendo **Password**
3. Escribe el password que te dieron y presiona **Entrar**

> Si te equivocas tres veces no pasa nada — solo intenta de nuevo. Si olvidaste
> el password pídele al administrador de sistemas que te lo recuerde.

Para salir: botón **Salir** arriba a la derecha.

---

## 3. Las partes del panel

```
┌──────────────┬──────────────────────────────────────────┐
│              │  Último sync: hace 5 min  [Sync] [Salir] │ ← Header
│  Greensun    ├──────────────────────────────────────────┤
│              │                                          │
│ ▦ Resumen    │                                          │
│ ⏸ Inactivos  │            Contenido aquí                │
│ ★ Top riesgo │                                          │
│ ⟳ Cadencia   │                                          │
│ ◧ RFM        │                                          │
│ ↘ Revenue    │                                          │
│ ⚙ Config     │                                          │
│              │                                          │
│   Sidebar    │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Sidebar** (izquierda): los 7 secciones del panel. En celular se esconde —
toca el ícono ☰ arriba a la izquierda para abrirla.

**Header** (arriba): muestra cuándo fue el último sync con Odoo y tiene dos
botones:
- **Sync ahora** — fuerza una sincronización inmediata con Odoo (normalmente
  pasa solo cada hora; usa esto si acabas de subir facturas y las quieres ver ya)
- **Salir** — cierra sesión

---

## 4. Sección por sección

### 4.1 Resumen

Tu punto de partida. Te muestra:

- **4 tarjetas grandes** con números clave: cuántos clientes activos hay,
  cuántos están inactivos, revenue de los últimos 30 días, revenue histórico
- **Gráfica de revenue por mes** (últimos 12 meses) con líneas separadas para
  USD y DOP
- **Dona de segmentos RFM** mostrando qué porción de tu cartera son Campeones,
  Leales, En Riesgo, etc.
- **Top 5 clientes en riesgo** — los más urgentes de contactar. Click cualquiera
  para ir directamente a su ficha.

**Cuándo usarlo**: cada mañana al abrir el panel, para ver el estado general
del negocio de un vistazo.

---

### 4.2 Inactivos

Lista de clientes que llevan más de X días sin comprar (X lo configuras).

**Cómo se ve**:

| Cliente | Ubicación | Vendedor | Última compra | Inactividad | # fact | Total histórico |
|---|---|---|---|---|---|---|
| HAVS Dominicana | DR / Santo Domingo | Yudi | 12 mar 2025 | Hace 60 días | 12 | $45,200 |

**Filtros disponibles**:
- **Buscar**: por nombre, email o RNC
- **País**: Dominican Republic, Haiti, etc.
- **Vendedor**: filtra por el vendedor habitual del cliente
- **Días**: los chips rápidos (30/60/90/180/365) o el input "Otro" para escribir
  un número custom. Define qué tan inactivo debe estar para aparecer.
- **Última compra entre**: rango de fechas. Útil para "muéstrame los que
  compraron en 2024 pero no en 2025".
- **Ordenar por**: más inactivos primero (default), menos inactivos, revenue,
  nombre A-Z.
- **Incluir clientes que nunca compraron**: marca esto si quieres ver también
  partners que están en Odoo pero no tienen ni una factura.

**Acciones rápidas** (al pasar el mouse sobre una fila):
- 💬 WhatsApp (verde) — abre WhatsApp con el cliente
- ✉ Email (azul) — abre tu cliente de correo
- ☎ Teléfono — marca el número (solo si no hay WhatsApp)

**Click la fila** → te lleva a la ficha completa del cliente.

**Botón "Exportar CSV"**: descarga la lista actual (con los filtros aplicados)
para usar en Excel.

---

### 4.3 Top en riesgo

Los clientes **más valiosos** que están inactivos. Combina dos cosas:
"cuánto te compraban" + "hace cuánto no compran". El #1 de la lista es el más
urgente de contactar.

Cada cliente trae un "score de riesgo" calculado como:
**revenue reciente × (días inactivo / umbral)**

**Cuándo usarlo**: lunes en la mañana para armar la agenda de llamadas de la
semana. Empiezas por arriba.

Mismos filtros que Inactivos + sort por revenue reciente, revenue total, días.

---

### 4.4 Cadencia

Detecta clientes que **rompieron su patrón** de compra. Por ejemplo: un cliente
que históricamente compra cada 30 días y ahora lleva 90 días sin comprar — ese
te avisa aquí, aunque "90 días" no llegue al umbral global.

**Cómo se calcula**: el sistema mide cuántos días en promedio pasaban entre las
compras de ese cliente, y avisa si ya pasó más de **1.5x** ese promedio sin
comprar. Configurable en Configuración.

**Lo que ves**:

| Cliente | Cadencia normal | Atraso actual | Vs normal | # facturas |
|---|---|---|---|---|
| Electromecánica Núñez | 42d | 95d | 2.3x | 18 |

**Más preciso que Inactivos** porque considera el comportamiento individual.
Un cliente que históricamente compra cada 90 días aparece en Inactivos a partir
del día 90, pero aquí solo aparece si rompe SU patrón.

---

### 4.5 Segmentos RFM

Clasifica a tus clientes en 11 categorías estándar de marketing según:
- **R** (Recencia): qué tan reciente fue su última compra (5 = recientísimo, 1 = hace mucho)
- **F** (Frecuencia): qué tan seguido compra (5 = mucho, 1 = poco)
- **M** (Monto): cuánto gasta (5 = mucho, 1 = poco)

**Los segmentos** (de mejor a peor):

| Segmento | Qué hacer |
|---|---|
| Campeones | Cuidarlos. Programas de fidelidad. |
| Leales | Mantenerlos. Cross-sell. |
| Potenciales | Empujar para que compren más seguido. |
| Nuevos | Onboarding bueno para que regresen. |
| Prometedores | Atención personalizada para subirlos a leales. |
| Necesitan atención | Llamadas activas. |
| A punto de dormir | Promo especial para reactivar. |
| En riesgo | Llamada urgente. |
| No los podemos perder | Llamada urgentísima. Eran top y se van. |
| Hibernando | Plan de reactivación. |
| Perdidos | Probablemente no vale la pena, pero un último intento. |

**Filtros rápidos**: los chips arriba de la tabla te dejan ver solo un segmento.

**Tip**: la dona del Resumen te da el panorama. Vienes acá para la lista detallada.

---

### 4.6 Revenue decline

Clientes que **siguen comprando** pero gastan menos. Compara los últimos N
meses contra los N meses anteriores (default 3 vs 3).

**Lo que ves**:

| Cliente | Periodo anterior | Periodo reciente | Caída |
|---|---|---|---|
| ACTEL SRL | $12,400 | $4,200 | -66% |

**Cuándo usarlo**: cuando quieres detectar problemas **antes** de que el cliente
desaparezca completo. Una caída del 50% es un foco rojo aunque el cliente
todavía esté comprando.

Configura el % mínimo de caída en Configuración (default 20%).

---

### 4.7 Configuración

Aquí ajustas los parámetros sin reiniciar nada:

- **Umbral de inactividad**: cuántos días sin comprar para considerar a alguien
  "inactivo" (default 90).
- **Multiplicador de cadencia**: cuántas veces su patrón normal antes de
  alertar (default 1.5x).
- **Período revenue decline**: cuántos meses comparar (default 3 meses).
- **Mínima caída revenue**: % mínimo de caída para aparecer en la lista
  (default 20%).
- **Ventana RFM**: cuántos meses considerar para calcular RFM (default 12).

Al final de la página ves el **estado del sync** con Odoo: cuándo corrió la
última vez, cuántos registros procesó, si hubo errores.

---

## 5. Ficha del cliente

Click cualquier cliente en cualquier tabla → te lleva a su ficha completa.

**Lo que ves**:

```
← Volver al dashboard
HAVS Dominicana SRL  [Empresa]
DR / Santo Domingo · RNC 130-12345-6

┌─────────────────────────────────────────────────────────────────┐
│ Última compra      │ Facturas    │ Total facturado │ Pendiente │
│ Hace 60 días       │ 12 / 1 NC   │ $45,200 USD     │ $0        │
│ 12 mar 2025        │ 0 pendientes│ desde 2019      │ Cobrada   │
└─────────────────────────────────────────────────────────────────┘

[Chart revenue por mes 24 meses]    │ [Datos y acciones]
                                    │  Email: havs@gmail.com [⧉]
                                    │  Teléfono: 18494579899  [⧉]
                                    │  RNC: 130-12345-6       [⧉]
                                    │  Ubicación: DR / SDQ  [Maps→]
                                    │
                                    │  💬 WhatsApp con plantilla
                                    │  💬 WhatsApp en blanco
                                    │  🎁 Plantilla promo
                                    │  ✉ Email con plantilla
                                    │  ☎ Llamar
                                    │  ↗ Abrir en Odoo

[Comportamiento de compra]
  Cadencia: 42 días entre compras
  Ticket promedio USD: $3,766
  ...

[Historial de facturas (12)]
```

**Acciones disponibles**:
- **💬 WhatsApp con plantilla** — abre WhatsApp con un mensaje listo:
  _"Hola [cliente], le escribimos de Greensun para seguimiento."_
- **💬 WhatsApp en blanco** — abre el chat sin texto pre-llenado
- **🎁 Plantilla promo** — abre WhatsApp con _"tenemos una promoción especial..."_
- **✉ Email con plantilla** — abre tu email con asunto "Seguimiento desde
  Greensun" y un cuerpo amigable ya redactado
- **☎ Llamar** — marca el número (móvil/celular abre el dialer)
- **↗ Abrir en Odoo** — te lleva al partner en Odoo
- **Maps →** — abre Google Maps con la ubicación

**Botones copiar** (⧉) al lado de email, teléfono y RNC: un click y queda en
el portapapeles. Hay también un **"⧉ Copiar bloque"** que copia todo el contacto
en formato pegable.

---

## 6. Ficha de factura

Click cualquier factura en el historial del cliente → ves todos los detalles
**sin tener que abrir Odoo**.

```
← Volver al cliente
INV/2024/00123  [Factura] [Pagada]
Cliente: HAVS Dominicana SRL · havs@gmail.com

┌──────────────────────────────────────────────────────────┐
│ Fecha    │ Subtotal │ Total    │ Pendiente │
│ 12 mar   │ $3,500   │ $4,025   │ Cobrada   │
│ Vence ...│ Imp: $525│ USD      │ Yudi      │
└──────────────────────────────────────────────────────────┘

Líneas (5 productos)              [↗ Abrir en Odoo] [Cliente en Odoo]
┌────────────────────────────────────────────────────────────────┐
│ Descripción         │ Cant │ UoM │ Precio │ Desc │ Subtotal │ Imp │
│ Panel solar 450W    │  4   │ Unid│ $750   │  5%  │ $2,850   │ ITBIS│
│ Inversor 5kW        │  1   │ Unid│ $650   │  —   │ $650     │ ITBIS│
│ ...                                                                │
│                                            Subtotal   $3,500     │
│                                            Impuestos $525       │
│                                            Total     $4,025     │
└────────────────────────────────────────────────────────────────┘
```

**Filtros del historial de facturas** (en la ficha del cliente):
- Rango de fechas (desde / hasta)
- Tipo: Factura / Nota crédito
- Estado de pago: Pagada / Parcial / No pagada / etc.
- Solo con saldo pendiente
- Ordenar por fecha, monto o documento

---

## 7. Casos de uso típicos

### "Quiero hacer las llamadas de la semana"

1. Abre **Top en riesgo**
2. Filtra por tu vendedor si solo manejas algunos clientes
3. Click el primero de la lista
4. En la ficha → **💬 WhatsApp con plantilla**
5. Vuelve atrás (← Volver al cliente) y al siguiente

### "El gerente quiere un reporte de quién no compra en RD desde hace 6 meses"

1. Abre **Inactivos**
2. País: **Dominican Republic**
3. Días: chip **180d**
4. **Exportar CSV**
5. Mándaselo por correo

### "Vi que ACTEL no me ha comprado, ¿qué le ofrecíamos?"

1. Buscar en cualquier tabla "actel"
2. Click el cliente
3. Ver "Historial de facturas"
4. Click la última factura → ves todos los productos que compraba

### "¿Cuáles son los 10 clientes que más han caído este trimestre?"

1. Abre **Revenue decline**
2. Ordenar por: **Mayor caída absoluta ↓**
3. Los primeros 10 son tus prioridades

### "Subí 20 facturas en Odoo y las quiero ver YA"

1. Click **Sync ahora** en el header
2. Espera el toast de confirmación (~10-30 segundos)
3. Refresca la página

---

## 8. Preguntas frecuentes

**¿Por qué un cliente que sé que ha comprado no aparece?**
- Verifica que la factura esté en estado "posteada" en Odoo (no draft).
- Verifica que sea factura de cliente (`out_invoice`), no de proveedor.
- Si la subiste hace poco, presiona **Sync ahora**.

**¿La info está al día?**
- El sync corre **cada hora** automáticamente (salvo que el admin lo
  haya cambiado). El header te dice cuándo fue el último.

**¿Por qué veo dos monedas (USD · DOP)?**
- Porque tu Odoo tiene facturas en ambas. El panel las muestra **separadas
  por moneda** en lugar de sumarlas (que daría números incorrectos).

**¿Por qué a algunos clientes no les sale el botón de WhatsApp?**
- Porque en Odoo no tienen teléfono ni móvil. Agrégaselos en Odoo y al
  siguiente sync aparecerá.

**¿El cliente recibe la plantilla automáticamente?**
- **No**. La plantilla solo pre-llena el mensaje en WhatsApp para que tú lo
  revises y mandes manualmente. Nunca enviamos nada sin que tú lo confirmes.

**¿Mis cambios en Configuración afectan a otros usuarios?**
- Sí. La configuración es **global** para toda la empresa. Si necesitas
  preferencias por usuario, pídelo al admin.

**¿Cómo cambio el password?**
- Pídele al admin que cambie `APP_PASSWORD` en el server. Por ahora todos los
  usuarios comparten el mismo password.

**¿Por qué no veo a clientes Odoo que sí están activos?**
- Probablemente no tienen `customer_rank > 0` en Odoo (no están marcados como
  clientes). En Odoo: Partner → activar la opción "Cliente".

**¿Borrar una factura en Odoo la quita del panel?**
- Sí, pero hasta el siguiente sync. Si necesitas que pase ya, **Sync ahora**.

**¿Puedo compartir un link con filtros aplicados?**
- ¡Sí! La URL guarda los filtros. Copia la URL y mándasela a tu compañero.
  Tienen que estar loggeados pero verán exactamente lo mismo que tú.

---

## 9. Glosario rápido

- **Sync** — sincronización con Odoo. Trae las facturas y clientes nuevos o modificados.
- **Cadencia** — qué tan seguido un cliente te compra (días promedio entre compras).
- **RFM** — Recencia (cuándo compró), Frecuencia (cuán seguido), Monto (cuánto gasta).
- **Revenue** — facturación, ingresos.
- **Out_invoice / Out_refund** — Factura de cliente / Nota de crédito de cliente.
- **Customer rank** — marcador de Odoo de que un partner es cliente (no proveedor).
- **CSV** — archivo de tabla que abre en Excel/Google Sheets.
- **DOP / USD** — pesos dominicanos / dólares.

---

## 10. ¿Algo no funciona?

1. Refresca la página
2. Cierra sesión y vuelve a entrar
3. Si dice "Sin sincronizaciones previas" → presiona **Sync ahora**
4. Si el sync falla con error de Odoo → avisa al admin (probablemente cambió
   la API key o se reinició Odoo)
5. Para cualquier otra cosa rara: pantallazo + describe qué hiciste antes y
   manda al admin
