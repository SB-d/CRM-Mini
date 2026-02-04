import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard para POST /leads: acepta API Key (Zapier/n8n) O Bearer Token (JWT).
 * Permite que herramientas externas envíen leads sin necesidad de sesión.
 */
@Injectable()
export class LeadAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Opción 1: API Key en header X-API-KEY
    const apiKey = request.headers['x-api-key'];
    if (apiKey && apiKey === process.env.LEAD_API_KEY) {
      return true;
    }

    // Opción 2: Bearer Token (JWT valido)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'secret',
        });
        request.user = { id: payload.sub, email: payload.email, role: payload.role };
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}
