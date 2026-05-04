## Exploration: pdf-build-warnings-cleanup

### Current State
El build productivo pasa, pero deja warnings de CommonJS/AMD ligados a la cadena de generación PDF. En el código actual, la app usa `jspdf` y `jspdf-autotable` en varios módulos, y además mantiene `html2canvas` en `inventory.ts` aunque no aparece ningún uso real de esa librería en el archivo. Los warnings observados en `npm run build` apuntan a dependencias transitivas como `canvg`, `raf`, `rgbcolor` y `html2canvas` vía `jspdf`.

### Affected Areas
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\package.json` — declara `html2canvas`, `jspdf` y `jspdf-autotable`
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\angular.json` — no define ninguna estrategia específica para CommonJS warnings; el build es productivo por defecto
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\pages\inventory\inventory.ts` — importa `html2canvas`, `jspdf` y `jspdf-autotable`; `html2canvas` parece estar muerto
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\sales\js-pdf-sale-receipt.renderer.ts` — genera PDFs de ventas con layout manual ya consolidado
- `C:\Users\sergi\dev\grupo-sts\TechStoreSystemAPP\src\app\services\service-orders\service-order-documents.service.ts` — genera PDFs de órdenes de servicio y stickers térmicos con `jspdf`

### Approaches
1. **Limpieza conservadora sobre la cadena actual** — mantener `jspdf`, quitar dependencias muertas y diferir carga donde convenga
   - Pros: respeta los layouts existentes; bajo riesgo funcional; reduce bundle inicial; elimina basura real como `html2canvas` muerto
   - Cons: los warnings de CommonJS probablemente no desaparezcan por completo mientras siga viva la cadena `jspdf`
   - Effort: Medium

2. **Silenciar/permitir explícitamente CommonJS warnings** — asumir la cadena PDF actual como aceptada y configurar build para tolerarla
   - Pros: cambio mínimo; cero impacto en comportamiento
   - Cons: no optimiza nada; solo oculta el síntoma; deja deuda técnica intacta
   - Effort: Low

3. **Reemplazo de la cadena PDF por otra librería ESM-first** — migrar fuera de `jspdf`
   - Pros: podría reducir o eliminar warnings de CommonJS a largo plazo
   - Cons: contradice la restricción funcional del proyecto: ya existen módulos con PDFs mapeados y layouts consolidados; riesgo alto de regresión documental
   - Effort: High

### Recommendation
La recomendación correcta es la **Approach 1**: mantener `jspdf` y `jspdf-autotable`, pero hacer una limpieza conservadora de la cadena actual. En concreto:
- eliminar `html2canvas` de `inventory.ts` y de `package.json` si realmente no tiene uso;
- revisar si hay otros imports muertos relacionados con PDF;
- evaluar lazy loading solo en los puntos de entrada de exportación si el objetivo incluye mejorar bundle inicial;
- aceptar que algunos warnings CommonJS pueden permanecer mientras el sistema preserve los layouts PDF existentes.

Eso es lo más limpio dado el contexto REAL del proyecto: no rompe contratos visuales ya estabilizados y sí ataca deuda técnica verificable.

### Risks
- Eliminar una dependencia “aparentemente muerta” sin revisar flujos indirectos podría romper una exportación oculta.
- Si se hace lazy loading de la cadena PDF, hay que revalidar los flujos de exportación para no introducir fallos de timing o imports mal tipados.
- Aunque se limpie `html2canvas`, puede seguir habiendo warnings por dependencias transitivas de `jspdf`.

### Ready for Proposal
Yes — el siguiente paso razonable es proponer una change acotada a:
- eliminación de dependencias PDF muertas;
- limpieza de imports;
- opcionalmente carga diferida de la cadena PDF sin alterar layouts existentes.
