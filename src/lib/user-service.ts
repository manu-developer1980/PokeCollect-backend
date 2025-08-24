import { supabase } from './supabase';

/**
 * Interfaz para el usuario
 */
export interface User {
  id: string;
  email: string;
  plan_type: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Servicio para manejar operaciones de usuarios
 */
export class UserService {
  /**
   * Obtiene un usuario por su ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Usuario no encontrado
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por su subscription ID de Stripe
   */
  static async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Usuario no encontrado
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo usuario por subscription ID:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por su customer ID de Stripe
   */
  static async getUserByStripeCustomerId(customerId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Usuario no encontrado
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error obteniendo usuario por customer ID:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza un usuario
   */
  static async upsertUser(userData: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Error creando/actualizando usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza el plan de un usuario
   */
  static async updateUserPlan(userId: string, planType: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          plan_type: planType,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Plan actualizado exitosamente
      return data;
    } catch (error) {
      console.error('❌ Error actualizando plan del usuario:', error);
      throw error;
    }
  }

  /**
   * Actualiza la información de Stripe de un usuario
   */
  static async updateUserStripeInfo(
    userId: string, 
    stripeCustomerId?: string, 
    stripeSubscriptionId?: string
  ): Promise<User> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (stripeCustomerId) {
        updateData.stripe_customer_id = stripeCustomerId;
      }

      if (stripeSubscriptionId) {
        updateData.stripe_subscription_id = stripeSubscriptionId;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Información de Stripe actualizada
      return data;
    } catch (error) {
      console.error('❌ Error actualizando información de Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtiene el plan actual de un usuario
   */
  static async getUserPlan(userId: string): Promise<string> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        // Usuario no encontrado, usando plan por defecto
        return 'aprendiz';
      }

      const planType = user.plan_type || 'aprendiz';
      // Plan obtenido exitosamente
      return planType;
    } catch (error) {
      console.error('❌ Error obteniendo plan del usuario:', error);
      return 'aprendiz'; // Plan por defecto en caso de error
    }
  }
}

// Exportar instancia singleton
export const userService = UserService;