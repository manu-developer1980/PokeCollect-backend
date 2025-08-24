import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = process.env.BREVO_API_KEY || '';

// Interfaces para TypeScript
interface EmailData {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
  toName?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envía un email usando la API REST de Brevo
 * @param emailData - Datos del email
 */
export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  try {
    const payload = {
      sender: {
        name: emailData.fromName || 'PokeCollector',
        email: emailData.fromEmail || 'manu.developer1980@gmail.com'
      },
      to: [{
        email: emailData.to,
        name: emailData.toName || emailData.to.split('@')[0]
      }],
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      textContent: emailData.textContent || ''
    };

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      // Email enviado exitosamente
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Error al enviar email:', result);
      return { success: false, error: result.message || 'Error desconocido' };
    }
    
  } catch (error: any) {
    console.error('❌ Error de conexión:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía un email desde el formulario de contacto
 * @param contactData - Datos del formulario de contacto
 */
export async function sendContactFormEmail(contactData: ContactFormData): Promise<EmailResult> {
  const { name, email, subject, message } = contactData;
  
  try {
    const emailSubject = `📧 Nuevo mensaje de contacto: ${subject}`;
    const htmlContent = `
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
          <h3 style="color: #1e40af; margin: 0 0 15px 0;">💬 Mensaje:</h3>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            💡 <strong>Tip:</strong> Puedes responder directamente a este email para contactar al remitente.
          </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Este mensaje fue enviado desde el formulario de contacto de PokeCollector
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
            © 2024 PokeCollector. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `;
    
    const textContent = `
Nuevo Mensaje de Contacto - PokeCollector

INFORMACIÓN DEL REMITENTE:
- Nombre: ${name}
- Email: ${email}
- Asunto: ${subject}

MENSAJE:
${message}

---
Este mensaje fue enviado desde el formulario de contacto de PokeCollector.
© 2024 PokeCollector. Todos los derechos reservados.
    `;

    // Enviar email al administrador/soporte
    return await sendEmail({
      to: 'manu.developer1980@gmail.com', // Email de destino para recibir los mensajes
      toName: 'Soporte PokeCollector',
      subject: emailSubject,
      htmlContent,
      textContent,
      fromName: `${name} (via PokeCollector)`,
      fromEmail: 'manu.developer1980@gmail.com' // Email verificado en Brevo
    });
    
  } catch (error: any) {
    console.error('❌ Error en sendContactFormEmail:', error);
    return { success: false, error: error.message };
  }
}