import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './swagger';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api/v1');
  const outputDirectory = resolve(process.cwd(), 'openapi');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, 'openapi.json'),
    `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`,
    'utf8',
  );
  await app.close();
}

void generate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown OpenAPI generation error';
  console.error(`OpenAPI generation failed: ${message}`);
  process.exitCode = 1;
});
