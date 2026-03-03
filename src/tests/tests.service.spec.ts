import { Test, TestingModule } from '@nestjs/testing';
import { TestsService } from './tests.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';

describe('TestsService', () => {
    let service: TestsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TestsService,
                {
                    provide: PrismaService,
                    useValue: {
                        test: {
                            create: jest.fn().mockResolvedValue({ id: 'test-id' }),
                            findMany: jest.fn().mockResolvedValue([]),
                        },
                        generationHistory: {
                            create: jest.fn().mockResolvedValue({ id: 'hist-id' }),
                        }
                    },
                },
                {
                    provide: AIService,
                    useValue: {
                        generateTest: jest.fn().mockResolvedValue([
                            { question: 'Q1', options: ['A', 'B'], correctAnswer: 'A' },
                        ]),
                    },
                },
                {
                    provide: DocumentsService,
                    useValue: {
                        findOne: jest.fn().mockResolvedValue({ id: 'doc-id', s3Key: 'key', fileType: 'txt' }),
                        getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('hello')),
                    },
                },
            ],
        }).compile();

        service = module.get<TestsService>(TestsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
