import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
export declare class TestsController {
    private readonly svc;
    constructor(svc: TestsService);
    generate(dto: CreateTestDto): Promise<{
        questions: {
            id: string;
            createdAt: Date;
            testId: string;
            content: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            correctAnswer: string;
            explanation: string | null;
        }[];
    } & {
        id: string;
        title: string;
        createdAt: Date;
        documentId: string | null;
        topic: string | null;
        mode: import(".prisma/client").$Enums.TestMode;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        score: number | null;
        totalQ: number;
    }>;
    findAll(): Promise<({
        document: {
            title: string;
        } | null;
        _count: {
            questions: number;
        };
    } & {
        id: string;
        title: string;
        createdAt: Date;
        documentId: string | null;
        topic: string | null;
        mode: import(".prisma/client").$Enums.TestMode;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        score: number | null;
        totalQ: number;
    })[]>;
    findOne(id: string): Promise<{
        document: {
            title: string;
        } | null;
        questions: {
            id: string;
            createdAt: Date;
            testId: string;
            content: string;
            options: import("@prisma/client/runtime/library").JsonValue;
            correctAnswer: string;
            explanation: string | null;
        }[];
    } & {
        id: string;
        title: string;
        createdAt: Date;
        documentId: string | null;
        topic: string | null;
        mode: import(".prisma/client").$Enums.TestMode;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        score: number | null;
        totalQ: number;
    }>;
    updateScore(id: string, score: number): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        documentId: string | null;
        topic: string | null;
        mode: import(".prisma/client").$Enums.TestMode;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        score: number | null;
        totalQ: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        documentId: string | null;
        topic: string | null;
        mode: import(".prisma/client").$Enums.TestMode;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        score: number | null;
        totalQ: number;
    }>;
}
