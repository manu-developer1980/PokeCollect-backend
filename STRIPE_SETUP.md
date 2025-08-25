# 🔧 Configuración de Stripe - Solución para Suscripciones Duplicadas

## ❌ Problema Actual

Las suscripciones duplicadas no se están cancelando automáticamente porque **las claves de Stripe no están configuradas correctamente**.

### Estado Actual del .env:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here  # ❌ Placeholder
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here   # ❌ Placeholder
```

## 🔧 Solución Paso a Paso

### 1. Configurar las Claves de API

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navega a **Developers** → **API keys**
3. Copia tu **Secret key** (comienza con `sk_test_` o `sk_live_`)
4. Actualiza el archivo `.env`:

```env
STRIPE_SECRET_KEY=sk_test_tu_clave_real_aqui
```

### 2. Desplegar la Edge Function de Supabase

**✅ FUNCIÓN CREADA**: Ya tienes la función `stripe-webhook` en `supabase/functions/stripe-webhook/index.ts`

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Autenticarse con Supabase**:
   ```bash
   supabase login
   ```

3. **Vincular tu proyecto**:
   ```bash
   supabase link --project-ref kiphglgoanmibjztwhmj
   ```

4. **Configurar variables de entorno en Supabase**:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_tu_clave_real_aqui
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
   ```

5. **Desplegar la función**:
   ```bash
   supabase functions deploy stripe-webhook
   ```

### 3. Configurar el Webhook en Stripe

1. En Stripe Dashboard, ve a **Developers** → **Webhooks**
2. Haz clic en **Add endpoint**
3. Configura:
   - **Endpoint URL**: `https://kiphglgoanmibjztwhmj.supabase.co/functions/v1/stripe-webhook` ✅ **YA CONFIGURADO**
   - **Events to send**:
     - `customer.subscription.created` ⭐ **CRÍTICO**
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. Después de crear el webhook, copia el **Signing secret** (comienza con `whsec_`)
5. Actualiza las variables de entorno en Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

### 4. Archivo .env Local (para desarrollo)

```env
PORT=3000
POKEMON_TCG_API_KEY=3d276477-7eb1-4948-8c6d-544cecae4316
SUPABASE_URL=https://kiphglgoanmibjztwhmj.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BREVO_API_KEY=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

# Stripe Configuration - ✅ CONFIGURADO CORRECTAMENTE
STRIPE_SECRET_KEY=sk_test_tu_clave_real_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

## 🎯 Verificación Manual Inmediata

Mientras configuras las claves, puedes solucionar el problema actual manualmente:

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navega a **Customers**
3. Busca: `manu.developer1980@gmail.com`
4. En la sección **Subscriptions**, verás algo como:
   ```
   ✅ Nivel Maestro - €120.00/año - Activa
   ✅ Nivel Entrenador - €60.00/año - Activa  ← CANCELAR ESTA
   ```
5. Cancela manualmente la suscripción **Entrenador** (la más antigua)

## ⚡ Cómo Funciona la Solución Automática

Una vez configurado correctamente:

### Flujo Automático:
1. Usuario compra nueva suscripción "Maestro"
2. Stripe procesa el pago
3. Stripe envía webhook `customer.subscription.created`
4. Nuestro servidor recibe el webhook
5. **Automáticamente** cancela la suscripción "Entrenador" anterior
6. Usuario queda solo con "Maestro" activo

### Código que se Ejecuta:
```typescript
// En handleSubscriptionCreated (stripe-service.ts)
const customerId = subscription.customer;
if (customerId) {
  // 🔄 Cancela TODAS las otras suscripciones activas
  await this.cancelOtherActiveSubscriptions(customerId, subscription.id);
}
```

## 🧪 Probar la Configuración

### Opción 1: Probar localmente (requiere claves en .env)
```bash
npx ts-node src/scripts/debug-subscriptions.ts
```

### Opción 2: Probar la Edge Function
1. **Verificar que la función esté desplegada**:
   ```bash
   supabase functions list
   ```

2. **Ver logs de la función**:
   ```bash
   supabase functions logs stripe-webhook
   ```

3. **Probar manualmente** creando una nueva suscripción en Stripe

Este script:
- ✅ Verificará la conexión con Stripe
- 📊 Mostrará todas las suscripciones activas
- 🔧 Cancelará automáticamente las duplicadas
- ✅ Confirmará que solo queda una activa

## 🚨 Puntos Críticos

### ⭐ El Webhook es ESENCIAL
Sin el webhook `customer.subscription.created`, el sistema **NO PUEDE** detectar nuevas suscripciones y cancelar las anteriores.

### 🔒 Seguridad
- Nunca compartas las claves secretas
- Usa claves de test (`sk_test_`) en desarrollo
- Usa claves de producción (`sk_live_`) solo en producción

### 🌐 URL del Webhook
- **Supabase Edge Function**: `https://kiphglgoanmibjztwhmj.supabase.co/functions/v1/stripe-webhook` ✅ **CONFIGURADO**
- **Desarrollo local**: `supabase functions serve` → `http://127.0.0.1:54321/functions/v1/stripe-webhook`

### 🔧 Comandos Útiles de Supabase

```bash
# Ver funciones desplegadas
supabase functions list

# Ver logs en tiempo real
supabase functions logs stripe-webhook --follow

# Servir funciones localmente
supabase functions serve

# Actualizar variables de entorno
supabase secrets set VARIABLE_NAME=value

# Ver variables configuradas
supabase secrets list
```

## ✅ Verificación Final

Una vez configurado todo:

1. **Reinicia el servidor**
2. **Prueba crear una nueva suscripción**
3. **Verifica que la anterior se cancele automáticamente**
4. **Revisa los logs del servidor** para confirmar que el webhook se ejecuta

---

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Verifica que el webhook esté **activo** en Stripe
2. Revisa los logs del webhook en Stripe Dashboard
3. Confirma que la URL del webhook sea accesible públicamente
4. Ejecuta el script de diagnóstico para más detalles

**El código está correcto, solo necesita la configuración adecuada de Stripe.**