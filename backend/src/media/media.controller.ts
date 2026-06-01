import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Endpoint genérico de upload de mídia. Substitui o armazenamento de base64
 * gigante no Postgres (avatar, áudio de chat) por arquivos servidos via
 * ServeStaticModule em /uploads/media. Retorna a URL pública.
 */
@ApiTags('Media')
@Controller('api/media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de imagem/áudio/vídeo → retorna URL pública' })
  // Uploads são pesados — 20 por minuto por IP é suficiente e barra abuso/DoS
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Garante que o diretório exista (não é versionado no git) antes de gravar
        destination: (_req, _file, cb) => {
          const dir = './uploads/media';
          try { mkdirSync(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname).toLowerCase().slice(0, 5) || '.bin';
          const random = Math.random().toString(36).slice(2, 10);
          cb(null, `${Date.now()}-${random}${safeExt}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB cobre áudio longo e fotos
      fileFilter: (_req, file, cb) => {
        // Aceita imagens, áudios (m4a/mp3/aac/wav/webm) e vídeos comuns
        const ok =
          /^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype) ||
          /^audio\/(m4a|x-m4a|mp4|mpeg|aac|wav|webm|ogg)$/i.test(file.mimetype) ||
          /^video\/(mp4|quicktime|webm)$/i.test(file.mimetype);
        if (!ok) return cb(new BadRequestException('Formato de mídia não suportado'), false);
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Arquivo não enviado');

    // Strip EXIF + redimensiona imagens (não toca em áudio/vídeo)
    if (file.mimetype.startsWith('image')) {
      try {
        const { stripExifInPlace } = await import('../common/utils/image-sanitize.util');
        await stripExifInPlace(file.path, { maxWidth: 1920, maxHeight: 1920, quality: 88 });
      } catch {
        /* sharp pode falhar em formatos exóticos — segue com o original */
      }
    }

    // SECURITY: BACKEND_URL da env evita Host Header injection
    const baseUrl = process.env.BACKEND_URL
      ? process.env.BACKEND_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.hostname}`;

    const kind = file.mimetype.startsWith('image')
      ? 'image'
      : file.mimetype.startsWith('audio')
      ? 'audio'
      : 'video';

    return {
      url: `${baseUrl}/uploads/media/${file.filename}`,
      kind,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
