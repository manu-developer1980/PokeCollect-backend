// Cargar variables de entorno
require('dotenv').config();

const { StripeService } = require('../dist/lib/stripe-service');

async function testPlanMapping() {
  try {
    console.log('🧪 Probando mapeo de tipos de plan...');
    
    // Probar los Price IDs reales de Stripe
    const testCases = [
      {
        priceId: 'price_1R4KH1EoOyqILXNqxnOSjJHZ',
        expectedPlan: 'aprendiz'
      },
      {
        priceId: 'price_1R4KGgEoOyqILXNqf6Z2vjqQ', 
        expectedPlan: 'entrenador'
      },
      {
        priceId: 'price_1R4KHlEoOyqILXNqqX7gkWWJ',
        expectedPlan: 'maestro'
      },
      {
        priceId: 'active', // Caso problemático
        expectedPlan: 'aprendiz' // Fallback
      },
      {
        priceId: 'unknown_price_id',
        expectedPlan: 'aprendiz' // Fallback
      }
    ];
    
    const stripeService = StripeService.getInstance();
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Probando Price ID: ${testCase.priceId}`);
      
      // Usar reflexión para acceder al método privado
      const planType = stripeService.getPlanTypeFromPriceId ? 
        stripeService.getPlanTypeFromPriceId(testCase.priceId) :
        'método no encontrado';
      
      if (planType === testCase.expectedPlan) {
        console.log(`✅ Correcto: ${testCase.priceId} -> ${planType}`);
      } else {
        console.log(`❌ Error: ${testCase.priceId} -> ${planType} (esperado: ${testCase.expectedPlan})`);
      }
    }
    
    // Probar características de planes
    console.log('\n🔍 Probando características de planes...');
    
    const plans = ['aprendiz', 'entrenador', 'maestro'];
    
    for (const plan of plans) {
      const features = StripeService.getPlanFeatures(plan);
      if (features) {
        console.log(`✅ Plan ${plan}:`);
        console.log(`   - Límite de cartas: ${features.cardLimit === -1 ? 'Ilimitado' : features.cardLimit}`);
        console.log(`   - Límite de colecciones: ${features.collectionLimit === -1 ? 'Ilimitado' : features.collectionLimit}`);
        console.log(`   - Búsqueda avanzada: ${features.hasAdvancedSearch ? 'Sí' : 'No'}`);
      } else {
        console.log(`❌ Plan ${plan} no encontrado`);
      }
    }
    
    console.log('\n✅ Prueba de mapeo de planes completada');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testPlanMapping();