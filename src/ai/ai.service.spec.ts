import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';

describe('AIService', () => {
    let service: AIService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AIService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('mock-api-key'),
                    },
                },
            ],
        }).compile();

        service = module.get<AIService>(AIService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should return mock questions when no real model is configured', async () => {
        // Force model to be null to test mock logic
        (service as any).model = null;
        const questions = await service.generateTest('some content', 3);
        expect(questions).toHaveLength(3);
        expect(questions[0].question).toContain('Mock Question');
    });
});
