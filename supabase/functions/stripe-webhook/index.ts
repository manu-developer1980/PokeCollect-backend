import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que sea un POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener variables de entorno
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error('❌ Claves de Stripe no configuradas')
      return new Response(
        JSON.stringify({ error: 'Stripe keys not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Inicializar Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Inicializar Supabase (opcional, para logging o actualizaciones de BD)
    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null

    // Obtener el payload y la firma
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Firma de Stripe faltante')
      return new Response(
        JSON.stringify({ error: 'Missing stripe signature' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar y construir el evento
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
    } catch (err) {
      console.error('❌ Error verificando webhook:', err.message)
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📨 Webhook recibido: ${event.type}`)

    // Procesar diferentes tipos de eventos
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripe, event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`⚠️ Evento no manejado: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error procesando webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Maneja la creación de una nueva suscripción
 * ⭐ FUNCIÓN CRÍTICA: Cancela automáticamente suscripciones anteriores
 */
async function handleSubscriptionCreated(stripe: Stripe, subscription: Stripe.Subscription): Promise<void> {
  console.log(`🎉 Nueva suscripción creada: ${subscription.id}`)
  
  try {
    // Obtener el customer ID de la suscripción
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id
    
    if (customerId) {
      // 🔄 CANCELAR AUTOMÁTICAMENTE TODAS LAS OTRAS SUSCRIPCIONES ACTIVAS
      console.log(`🔄 Verificando suscripciones anteriores para el cliente ${customerId}`)
      await cancelOtherActiveSubscriptions(stripe, customerId, subscription.id)
      
      console.log(`✅ Procesamiento completo de nueva suscripción ${subscription.id}`)
    } else {
      console.warn(`⚠️ No se pudo obtener el customer ID de la suscripción ${subscription.id}`)
    }
  } catch (error) {
    console.error(`❌ Error procesando nueva suscripción ${subscription.id}:`, error)
    // No lanzar el error para evitar que falle el webhook
  }
}

/**
 * Cancela todas las suscripciones activas de un cliente excepto la especificada
 * 🎯 FUNCIÓN CLAVE: Previene suscripciones duplicadas
 */
async function cancelOtherActiveSubscriptions(stripe: Stripe, customerId: string, keepSubscriptionId: string): Promise<void> {
  try {
    console.log(`🔍 Buscando suscripciones activas para cliente ${customerId}`)
    
    // Obtener todas las suscripciones activas del cliente
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 100 // Aumentamos el límite para asegurar que obtenemos todas
    })
    
    // Filtrar suscripciones que no sean la que queremos mantener
    const subscriptionsToCancel = subscriptions.data.filter(
      sub => sub.id !== keepSubscriptionId
    )
    
    console.log(`📊 Encontradas ${subscriptions.data.length} suscripciones activas`)
    console.log(`🎯 Manteniendo suscripción: ${keepSubscriptionId}`)
    console.log(`🗑️ Cancelando ${subscriptionsToCancel.length} suscripciones anteriores`)
    
    // Cancelar cada suscripción anterior
    for (const subscription of subscriptionsToCancel) {
      try {
        console.log(`🔄 Cancelando suscripción ${subscription.id}...`)
        
        await stripe.subscriptions.cancel(subscription.id, {
          prorate: false // No prorratear, cancelar inmediatamente
        })
        
        console.log(`✅ Suscripción ${subscription.id} cancelada exitosamente`)
      } catch (cancelError) {
        console.error(`❌ Error cancelando suscripción ${subscription.id}:`, cancelError)
        // Continuar con las demás suscripciones aunque una falle
      }
    }
    
    if (subscriptionsToCancel.length === 0) {
      console.log(`ℹ️ No hay suscripciones anteriores que cancelar para ${customerId}`)
    } else {
      console.log(`🎉 Proceso de cancelación completado. Cliente ${customerId} ahora tiene solo 1 suscripción activa`)
    }
    
  } catch (error) {
    console.error(`❌ Error obteniendo/cancelando suscripciones para cliente ${customerId}:`, error)
    throw error
  }
}

/**
 * Maneja la actualización de una suscripción
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🔄 Suscripción actualizada: ${subscription.id}`)
  // Aquí se podría actualizar la base de datos si es necesario
}

/**
 * Maneja la eliminación de una suscripción
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🗑️ Suscripción eliminada: ${subscription.id}`)
  // Aquí se podría actualizar el estado del usuario en la base de datos
}

/**
 * Maneja un pago exitoso
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log(`💰 Pago exitoso para factura: ${invoice.id}`)
  // Aquí se podría enviar un email de confirmación o actualizar la BD
}

/**
 * Maneja un pago fallido
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`❌ Pago fallido para factura: ${invoice.id}`)
  // Aquí se podría enviar un email de notificación o actualizar la BD
}