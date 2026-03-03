import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
export declare class DocumentsService implements OnModuleInit {
    private prisma;
    private config;
    private aiService;
    private s3Client;
    private bucketName;
    constructor(prisma: PrismaService, config: ConfigService, aiService: AIService);
    onModuleInit(): Promise<void>;
    uploadDocument(file: Express.Multer.File, title: string): Promise<{
        id: string;
        title: string;
        s3Key: string;
        fileType: string;
        textContent: string | null;
        topics: import("@prisma/client/runtime/library").JsonValue | null;
        processed: boolean;
        createdAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        title: string;
        fileType: string;
        topics: import("@prisma/client/runtime/library").JsonValue;
        processed: boolean;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        title: string;
        s3Key: string;
        fileType: string;
        textContent: string | null;
        topics: import("@prisma/client/runtime/library").JsonValue | null;
        processed: boolean;
        createdAt: Date;
    } | null>;
    getAllTopics(): Promise<string[]>;
    getContentByTopic(topic?: string): Promise<{
        text: string;
        docIds: string[];
    }>;
    getFileBuffer(key: string): Promise<Buffer>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
