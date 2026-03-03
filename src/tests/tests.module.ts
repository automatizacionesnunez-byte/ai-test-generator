import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { DocumentsModule } from '../documents/documents.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DocumentsModule, AiModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule { }
