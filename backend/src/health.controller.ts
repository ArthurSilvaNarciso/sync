import { Controller, Get } from '@nestjs/common';

// Endpoint de healthcheck para Railway/Render/uptime monitors
@Controller()
export class HealthController {
  @Get('/')
  root() {
    return { ok: true, service: 'sync-api', docs: '/api/docs' };
  }

  @Get('/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('/api/health')
  apiHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
