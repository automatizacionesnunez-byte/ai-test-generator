"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const documents_service_1 = require("../documents/documents.service");
const MODE_MAP = {
    MODE_20: 20, MODE_40: 40, MODE_60: 60, MODE_80: 80, MODE_100: 100,
};
let TestsService = class TestsService {
    prisma;
    aiService;
    documentsService;
    constructor(prisma, aiService, documentsService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.documentsService = documentsService;
    }
    async generate(dto) {
        const { text, docIds } = await this.documentsService.getContentByTopic(dto.topic || undefined);
        if (!text || text.trim().length < 50) {
            throw new common_1.BadRequestException('No hay suficiente contenido para generar el examen. Sube temarios primero.');
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
                    create: aiQuestions.map((q) => ({
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
    async findOne(id) {
        const test = await this.prisma.test.findUnique({
            where: { id },
            include: { questions: true, document: { select: { title: true } } },
        });
        if (!test)
            throw new common_1.NotFoundException('Test not found');
        return test;
    }
    async updateScore(id, score) {
        return this.prisma.test.update({ where: { id }, data: { score } });
    }
    async remove(id) {
        await this.prisma.question.deleteMany({ where: { testId: id } });
        return this.prisma.test.delete({ where: { id } });
    }
};
exports.TestsService = TestsService;
exports.TestsService = TestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AIService,
        documents_service_1.DocumentsService])
], TestsService);
//# sourceMappingURL=tests.service.js.map