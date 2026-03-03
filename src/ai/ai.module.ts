import { Module } from '@nestjs/common';
import { AIService } from './ai.service'; // Ensure correct import name

@Module({
  providers: [AIService],
  exports: [AIService],
})
export class AiModule { }
