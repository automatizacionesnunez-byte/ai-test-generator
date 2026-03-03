import { Controller, Post, Get, Delete, Param, Body, Patch } from '@nestjs/common';
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';

@Controller('tests')
export class TestsController {
  constructor(private readonly svc: TestsService) { }

  @Post('generate')
  generate(@Body() dto: CreateTestDto) { return this.svc.generate(dto); }

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/score')
  updateScore(@Param('id') id: string, @Body('score') score: number) {
    return this.svc.updateScore(id, score);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
