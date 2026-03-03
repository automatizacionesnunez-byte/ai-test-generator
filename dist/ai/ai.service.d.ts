import { ConfigService } from '@nestjs/config';
export declare class AIService {
    private configService;
    private genAI;
    private model;
    constructor(configService: ConfigService);
    private callWithRetry;
    extractTopics(text: string): Promise<string[]>;
    generateTest(documentContent: string, numQuestions?: number, difficulty?: string, topic?: string): Promise<any>;
    private generateMockQuestions;
}
