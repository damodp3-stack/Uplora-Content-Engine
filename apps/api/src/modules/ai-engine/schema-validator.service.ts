import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

@Injectable()
export class SchemaValidatorService implements OnModuleInit {
  private readonly logger = new Logger(SchemaValidatorService.name);
  private schemas: Record<string, any> = {};

  onModuleInit(): void {
    this.loadSchemas();
  }

  private loadSchemas(): void {
    const schemasPath = path.resolve(
      __dirname,
      '../../../../..',
      'packages/shared-types/schemas/uplora-schemas.json',
    );

    try {
      if (fs.existsSync(schemasPath)) {
        const raw = fs.readFileSync(schemasPath, 'utf-8');
        const doc = JSON.parse(raw);
        this.schemas = doc.schemas || {};
        this.logger.log(`✅ Loaded ${Object.keys(this.schemas).length} JSON validation schemas`);
      }
    } catch (err) {
      this.logger.warn(`Could not load uplora-schemas.json: ${err.message}`);
    }
  }

  validate(schemaName: string, data: any): SchemaValidationResult {
    const schema = this.schemas[schemaName];
    if (!schema || !data || typeof data !== 'object') {
      return { valid: true, errors: [] };
    }

    const errors: Array<{ field: string; message: string }> = [];

    if (Array.isArray(schema.required)) {
      for (const reqField of schema.required) {
        if (data[reqField] === undefined || data[reqField] === null || data[reqField] === '') {
          errors.push({ field: reqField, message: `${reqField} is required` });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateAIRequest(data: any): SchemaValidationResult {
    return this.validate('AIRequest', data);
  }

  getLoadedSchemas(): string[] {
    return Object.keys(this.schemas);
  }
}
