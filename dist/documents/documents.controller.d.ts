import { DocumentsService } from './documents.service';
export declare class DocumentsController {
    private readonly svc;
    constructor(svc: DocumentsService);
    upload(file: Express.Multer.File, title: string): Promise<{
        id: string;
        title: string;
        s3Key: string;
        fileType: string;
        textContent: string | null;
        topics: import("@prisma/client/runtime/library").JsonValue | null;
        processed: boolean;
        createdAt: Date;
    }>;
    getTopics(): Promise<string[]>;
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
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
