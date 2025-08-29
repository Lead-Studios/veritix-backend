import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SdkGeneratorService, SdkConfig } from '../services/sdk-generator.service';
import { RequireApiPermissions } from '../decorators/api-decorators';
import { ApiPermission } from '../entities/api-key.entity';
import * as archiver from 'archiver';
import { Readable } from 'stream';

export class GenerateSdkDto {
  language: 'javascript' | 'python' | 'php' | 'ruby' | 'go' | 'java' | 'csharp';
  packageName: string;
  version?: string;
  baseUrl?: string;
  includeExamples?: boolean;
  includeTests?: boolean;
}

@ApiTags('API Platform - SDK Generation')
@ApiBearerAuth()
@Controller('api/v1/sdk')
export class SdkController {
  constructor(private readonly sdkGeneratorService: SdkGeneratorService) {}

  @Get('languages')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get supported SDK languages' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Supported languages retrieved' })
  getSupportedLanguages(): any {
    return {
      languages: [
        {
          id: 'javascript',
          name: 'JavaScript/Node.js',
          description: 'SDK for JavaScript and Node.js applications',
          packageManager: 'npm',
          fileExtension: '.js',
        },
        {
          id: 'python',
          name: 'Python',
          description: 'SDK for Python applications',
          packageManager: 'pip',
          fileExtension: '.py',
        },
        {
          id: 'php',
          name: 'PHP',
          description: 'SDK for PHP applications',
          packageManager: 'composer',
          fileExtension: '.php',
        },
        {
          id: 'ruby',
          name: 'Ruby',
          description: 'SDK for Ruby applications',
          packageManager: 'gem',
          fileExtension: '.rb',
        },
        {
          id: 'go',
          name: 'Go',
          description: 'SDK for Go applications',
          packageManager: 'go mod',
          fileExtension: '.go',
        },
        {
          id: 'java',
          name: 'Java',
          description: 'SDK for Java applications',
          packageManager: 'maven/gradle',
          fileExtension: '.java',
        },
        {
          id: 'csharp',
          name: 'C#',
          description: 'SDK for .NET applications',
          packageManager: 'nuget',
          fileExtension: '.cs',
        },
      ],
    };
  }

  @Post('generate')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Generate SDK for specified language' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SDK generated successfully' })
  async generateSdk(@Body() generateSdkDto: GenerateSdkDto): Promise<any> {
    const config: SdkConfig = {
      language: generateSdkDto.language,
      packageName: generateSdkDto.packageName,
      version: generateSdkDto.version || '1.0.0',
      baseUrl: generateSdkDto.baseUrl || 'https://api.veritix.com',
      includeExamples: generateSdkDto.includeExamples ?? true,
      includeTests: generateSdkDto.includeTests ?? true,
    };

    const result = await this.sdkGeneratorService.generateSdk(config);

    return {
      success: true,
      metadata: result.metadata,
      downloadUrl: `/api/v1/sdk/download?language=${config.language}&package=${config.packageName}&version=${config.version}`,
      files: Object.keys(result.files),
    };
  }

  @Get('download')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Download generated SDK as ZIP file' })
  @ApiQuery({ name: 'language', required: true })
  @ApiQuery({ name: 'package', required: true })
  @ApiQuery({ name: 'version', required: false })
  @Header('Content-Type', 'application/zip')
  async downloadSdk(
    @Query('language') language: string,
    @Query('package') packageName: string,
    @Query('version') version?: string,
  ): Promise<StreamableFile> {
    const config: SdkConfig = {
      language: language as any,
      packageName,
      version: version || '1.0.0',
      baseUrl: 'https://api.veritix.com',
      includeExamples: true,
      includeTests: true,
    };

    const result = await this.sdkGeneratorService.generateSdk(config);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('error', (err) => {
      throw err;
    });

    // Add files to archive
    for (const [filePath, content] of Object.entries(result.files)) {
      archive.append(content, { name: filePath });
    }

    await archive.finalize();

    const buffer = Buffer.concat(chunks);
    const stream = Readable.from(buffer);

    return new StreamableFile(stream, {
      type: 'application/zip',
      disposition: `attachment; filename="${packageName}-${version}.zip"`,
    });
  }

  @Get('preview')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Preview SDK files without downloading' })
  @ApiQuery({ name: 'language', required: true })
  @ApiQuery({ name: 'package', required: true })
  @ApiQuery({ name: 'file', required: false, description: 'Specific file to preview' })
  async previewSdk(
    @Query('language') language: string,
    @Query('package') packageName: string,
    @Query('file') fileName?: string,
  ): Promise<any> {
    const config: SdkConfig = {
      language: language as any,
      packageName,
      version: '1.0.0',
      baseUrl: 'https://api.veritix.com',
      includeExamples: true,
      includeTests: false, // Skip tests for preview
    };

    const result = await this.sdkGeneratorService.generateSdk(config);

    if (fileName) {
      const fileContent = result.files[fileName];
      if (!fileContent) {
        return { error: 'File not found' };
      }
      return {
        fileName,
        content: fileContent,
        language: this.getFileLanguage(fileName),
      };
    }

    return {
      metadata: result.metadata,
      files: Object.keys(result.files).map(filePath => ({
        path: filePath,
        size: result.files[filePath].length,
        language: this.getFileLanguage(filePath),
      })),
    };
  }

  @Get('templates')
  @RequireApiPermissions(ApiPermission.READ)
  @ApiOperation({ summary: 'Get SDK generation templates and examples' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Templates retrieved' })
  getTemplates(): any {
    return {
      templates: {
        javascript: {
          packageName: 'veritix-api-client',
          defaultVersion: '1.0.0',
          structure: [
            'package.json',
            'index.js',
            'index.d.ts',
            'README.md',
            'examples/',
            '__tests__/',
          ],
          example: {
            installation: 'npm install veritix-api-client',
            usage: `const VeritixClient = require('veritix-api-client');
const client = new VeritixClient('your-api-key');
const users = await client.users.list();`,
          },
        },
        python: {
          packageName: 'veritix-api-client',
          defaultVersion: '1.0.0',
          structure: [
            'setup.py',
            'veritix/__init__.py',
            'README.md',
            'examples/',
            'tests/',
          ],
          example: {
            installation: 'pip install veritix-api-client',
            usage: `from veritix import VeritixClient
client = VeritixClient('your-api-key')
users = client.users.list()`,
          },
        },
        php: {
          packageName: 'veritix/api-client',
          defaultVersion: '1.0.0',
          structure: [
            'composer.json',
            'src/Client.php',
            'README.md',
            'examples/',
          ],
          example: {
            installation: 'composer require veritix/api-client',
            usage: `<?php
use Veritix\\Client;
$client = new Client('your-api-key');
$users = $client->request('GET', '/users');`,
          },
        },
      },
    };
  }

  private getFileLanguage(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      java: 'java',
      cs: 'csharp',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
    };
    return languageMap[extension || ''] || 'text';
  }
}
