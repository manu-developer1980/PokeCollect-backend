import { cacheService } from './cache-service';
import { externalAPILimiter } from './rate-limiter';

// Tipos para TypeScript
interface BrevoContact {
  email: string;
  attributes?: Record<string, any>;
  listIds?: number[];
  updateEnabled?: boolean;
}

interface BrevoEmailData {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  sender?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
  tags?: string[];
  params?: Record<string, any>;
}

interface BrevoList {
  id: number;
  name: string;
  totalBlacklisted: number;
  totalSubscribers: number;
  uniqueSubscribers: number;
}

interface BrevoTemplate {
  id: number;
  name: string;
  subject: string;
  isActive: boolean;
  testSent: boolean;
  sender: { name: string; email: string };
  replyTo: string;
  toField: string;
  tag: string;
  htmlContent: string;
  createdAt: string;
  modifiedAt: string;
}

/**
 * Servicio centralizado para manejar Brevo (SendinBlue)
 */
export class BrevoService {
  private static instance: BrevoService;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.brevo.com/v3';

  private constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ BREVO_API_KEY no configurada');
    }
  }

  public static getInstance(): BrevoService {
    if (!BrevoService.instance) {
      BrevoService.instance = new BrevoService();
    }
    return BrevoService.instance;
  }

  /**
   * Realiza una petición a la API de Brevo con rate limiting
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    return await externalAPILimiter.execute(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      try {
        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(`Brevo API Error: ${result.message || response.statusText}`);
        }

        return result;
      } catch (error) {
        console.error(`❌ Error en petición a Brevo ${method} ${endpoint}:`, error);
        throw error;
      }
    });
  }

  /**
   * Envía un email transaccional
   */
  async sendTransactionalEmail(emailData: BrevoEmailData): Promise<any> {
    try {
      console.log(`📧 Enviando email a ${emailData.to.map(t => t.email).join(', ')}`);
      
      const result = await this.makeRequest('/smtp/email', 'POST', emailData);
      
      console.log('✅ Email enviado exitosamente:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Crea o actualiza un contacto
   */
  async createOrUpdateContact(contactData: BrevoContact): Promise<any> {
    try {
      const cacheKey = `brevo:contact:${contactData.email}`;
      
      console.log(`👤 Creando/actualizando contacto: ${contactData.email}`);
      
      const result = await this.makeRequest('/contacts', 'POST', contactData);
      
      // Limpiar caché del contacto
      cacheService.del(cacheKey);
      
      console.log('✅ Contacto creado/actualizado exitosamente');
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error creando/actualizando contacto:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtiene información de un contacto
   */
  async getContact(email: string): Promise<any> {
    try {
      const cacheKey = `brevo:contact:${email}`;
      
      // Intentar obtener del caché primero
      const cachedContact = cacheService.get(cacheKey);
      if (cachedContact) {
        console.log(`🎯 Contacto ${email} devuelto desde caché`);
        return { success: true, data: cachedContact };
      }

      console.log(`🔍 Obteniendo contacto: ${email}`);
      
      const result = await this.makeRequest(`/contacts/${encodeURIComponent(email)}`);
      
      // Guardar en caché por 10 minutos
      cacheService.set(cacheKey, result, 600);
      console.log(`💾 Contacto ${email} guardado en caché`);
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error obteniendo contacto:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtiene todas las listas de contactos
   */
  async getLists(limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const cacheKey = `brevo:lists:${limit}:${offset}`;
      
      // Intentar obtener del caché primero
      const cachedLists = cacheService.get<BrevoList[]>(cacheKey);
      if (cachedLists) {
        console.log('🎯 Listas devueltas desde caché');
        return { success: true, data: cachedLists };
      }

      console.log('📋 Obteniendo listas de contactos');
      
      const result = await this.makeRequest(`/contacts/lists?limit=${limit}&offset=${offset}`);
      
      // Guardar en caché por 15 minutos
      cacheService.set(cacheKey, result, 900);
      console.log('💾 Listas guardadas en caché');
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error obteniendo listas:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Crea una nueva lista de contactos
   */
  async createList(name: string, folderId?: number): Promise<any> {
    try {
      console.log(`📋 Creando lista: ${name}`);
      
      const listData: any = { name };
      if (folderId) {
        listData.folderId = folderId;
      }
      
      const result = await this.makeRequest('/contacts/lists', 'POST', listData);
      
      // Limpiar caché de listas
      const cacheKeys = cacheService.keys().filter(key => key.startsWith('brevo:lists:'));
      cacheKeys.forEach(key => cacheService.del(key));
      
      console.log('✅ Lista creada exitosamente:', result.id);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error creando lista:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Añade contactos a una lista
   */
  async addContactsToList(listId: number, emails: string[]): Promise<any> {
    try {
      console.log(`👥 Añadiendo ${emails.length} contactos a la lista ${listId}`);
      
      const result = await this.makeRequest(`/contacts/lists/${listId}/contacts/add`, 'POST', {
        emails
      });
      
      console.log('✅ Contactos añadidos a la lista exitosamente');
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error añadiendo contactos a la lista:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtiene plantillas de email
   */
  async getEmailTemplates(templateStatus?: boolean, limit: number = 50, offset: number = 0): Promise<any> {
    try {
      const cacheKey = `brevo:templates:${templateStatus}:${limit}:${offset}`;
      
      // Intentar obtener del caché primero
      const cachedTemplates = cacheService.get<BrevoTemplate[]>(cacheKey);
      if (cachedTemplates) {
        console.log('🎯 Plantillas devueltas desde caché');
        return { success: true, data: cachedTemplates };
      }

      console.log('📄 Obteniendo plantillas de email');
      
      let endpoint = `/smtp/templates?limit=${limit}&offset=${offset}`;
      if (templateStatus !== undefined) {
        endpoint += `&templateStatus=${templateStatus}`;
      }
      
      const result = await this.makeRequest(endpoint);
      
      // Guardar en caché por 20 minutos
      cacheService.set(cacheKey, result, 1200);
      console.log('💾 Plantillas guardadas en caché');
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error obteniendo plantillas:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Envía un email usando una plantilla
   */
  async sendTemplateEmail(
    templateId: number,
    to: Array<{ email: string; name?: string }>,
    params?: Record<string, any>,
    tags?: string[]
  ): Promise<any> {
    try {
      console.log(`📧 Enviando email con plantilla ${templateId} a ${to.map(t => t.email).join(', ')}`);
      
      const emailData: any = {
        templateId,
        to
      };
      
      if (params) {
        emailData.params = params;
      }
      
      if (tags) {
        emailData.tags = tags;
      }
      
      const result = await this.makeRequest('/smtp/email', 'POST', emailData);
      
      console.log('✅ Email con plantilla enviado exitosamente:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error enviando email con plantilla:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Obtiene estadísticas de email
   */
  async getEmailStatistics(startDate?: string, endDate?: string, tag?: string): Promise<any> {
    try {
      const cacheKey = `brevo:stats:${startDate}:${endDate}:${tag}`;
      
      // Intentar obtener del caché primero (caché más corto para estadísticas)
      const cachedStats = cacheService.get(cacheKey);
      if (cachedStats) {
        console.log('🎯 Estadísticas devueltas desde caché');
        return { success: true, data: cachedStats };
      }

      console.log('📊 Obteniendo estadísticas de email');
      
      let endpoint = '/smtp/statistics/events';
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (tag) params.append('tag', tag);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }
      
      const result = await this.makeRequest(endpoint);
      
      // Guardar en caché por 5 minutos (estadísticas cambian frecuentemente)
      cacheService.set(cacheKey, result, 300);
      console.log('💾 Estadísticas guardadas en caché');
      
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Función de conveniencia para enviar email de formulario de contacto
   */
  async sendContactFormEmail(contactData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<any> {
    const { name, email, subject, message } = contactData;
    
    const emailData: BrevoEmailData = {
      to: [{ email: process.env.CONTACT_EMAIL || 'contact@pokecollector.com', name: 'PokeCollector Support' }],
      subject: `📧 Nuevo mensaje de contacto: ${subject}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">📧 Nuevo Mensaje de Contacto</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">PokeCollector</p>
          </div>
          
          <div style="background-color: #fef9e7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h2 style="color: #92400e; margin: 0 0 15px 0;">Información del remitente</h2>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 6px;">
              <p style="margin: 0 0 10px 0; color: #374151;"><strong>👤 Nombre:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0; color: #374151;"><strong>📧 Email:</strong> <a href="mailto:${email}" style="color: #3b82f6;">${email}</a></p>
              <p style="margin: 0; color: #374151;"><strong>📝 Asunto:</strong> ${subject}</p>
            </div>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0;">💬 Mensaje</h2>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; line-height: 1.6;">
              <p style="margin: 0; color: #374151; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Este mensaje fue enviado desde el formulario de contacto de PokeCollector</p>
          </div>
        </div>
      `,
      textContent: `
Nuevo mensaje de contacto - PokeCollector

Remitente: ${name} (${email})
Asunto: ${subject}

Mensaje:
${message}

---
Este mensaje fue enviado desde el formulario de contacto de PokeCollector
      `,
      sender: { email: process.env.SENDER_EMAIL || 'noreply@pokecollector.com', name: 'PokeCollector' },
      replyTo: { email, name },
      tags: ['contact-form']
    };

    return this.sendTransactionalEmail(emailData);
  }
}

// Exportar instancia singleton
export const brevoService = BrevoService.getInstance();