import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';
import { CreateTestDto, TestMode } from './dto/create-test.dto';

const MODE_MAP: Record<TestMode, number> = {
  MODE_20: 20, MODE_40: 40, MODE_60: 60, MODE_80: 80, MODE_100: 100,
};

@Injectable()
export class TestsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private documentsService: DocumentsService,
  ) { }

  async generate(dto: CreateTestDto) {
    // Get combined text (all docs or filtered by topic)
    const { text, docIds } = await this.documentsService.getContentByTopic(dto.topic || undefined);

    if (!text || text.trim().length < 50) {
      throw new BadRequestException('No hay suficiente contenido para generar el examen. Sube temarios primero.');
    }

    const numQuestions = MODE_MAP[dto.mode];
    const difficulty = dto.difficulty || 'MEDIUM';
    const timeLimit = dto.timed !== false ? numQuestions : null;

    const aiQuestions = await this.aiService.generateTest(text, numQuestions, difficulty, dto.topic || undefined);

    const titleParts = [dto.topic || 'Todos los temas', `${numQuestions}q`];
    const test = await this.prisma.test.create({
      data: {
        documentId: docIds[0] || null,
        topic: dto.topic || null,
        title: dto.title || `Test - ${titleParts.join(' · ')}`,
        mode: dto.mode,
        difficulty,
        timeLimit,
        totalQ: numQuestions,
        questions: {
          create: aiQuestions.map((q: any) => ({
            content: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
          })),
        },
      },
      include: { questions: true },
    });

    return test;
  }

  async findAll() {
    return this.prisma.test.findMany({
      orderBy: { createdAt: 'desc' },
      include: { document: { select: { title: true } }, _count: { select: { questions: true } } },
    });
  }

  async findOne(id: string) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: { questions: true, document: { select: { title: true } } },
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async updateScore(id: string, score: number) {
    return this.prisma.test.update({ where: { id }, data: { score } });
  }

  async remove(id: string) {
    await this.prisma.question.deleteMany({ where: { testId: id } });
    return this.prisma.test.delete({ where: { id } });
  }
}
