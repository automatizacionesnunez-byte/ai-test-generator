import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, GetObjectCommandOutput, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4: uuidv4 } = require('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class DocumentsService implements OnModuleInit {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private aiService: AIService,
    ) {
        this.s3Client = new S3Client({
            region: this.config.get('AWS_REGION'),
            endpoint: this.config.get('AWS_ENDPOINT'),
            credentials: {
                accessKeyId: this.config.get('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY') || '',
            },
            forcePathStyle: true,
        });
        this.bucketName = this.config.get('AWS_BUCKET_NAME') || 'ai-test-generator';
    }

    async onModuleInit() {
        try {
            await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        } catch (e: any) {
            if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
                console.log(`Creating bucket ${this.bucketName}...`);
                await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
            }
        }
    }

    /** Upload, extract text, and identify topics via AI */
    async uploadDocument(file: Express.Multer.File, title: string) {
        const fileKey = `uploads/${uuidv4()}-${file.originalname}`;

        // 1. Upload to S3
        try {
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName, Key: fileKey,
                Body: file.buffer, ContentType: file.mimetype,
            }));
        } catch (error) {
            console.error('S3 Upload Error:', error);
            throw new InternalServerErrorException('Failed to upload file');
        }

        // 2. Extract text
        let textContent = '';
        try {
            if (file.mimetype.includes('pdf')) {
                const parsed = await pdfParse(file.buffer);
                textContent = parsed.text;
            } else {
                textContent = file.buffer.toString('utf-8');
            }
        } catch (err) {
            console.error('Text extraction error:', err);
        }

        // 3. Extract topics via AI
        let topics: string[] = ['General'];
        if (textContent.length > 50) {
            try {
                topics = await this.aiService.extractTopics(textContent);
            } catch { /* fallback */ }
        }

        // 4. Save to DB
        return this.prisma.document.create({
            data: {
                title: title || file.originalname,
                s3Key: fileKey,
                fileType: file.mimetype,
                textContent,
                topics: topics,
                processed: true,
            },
        });
    }

    async findAll() {
        return this.prisma.document.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, fileType: true, topics: true, processed: true, createdAt: true },
        });
    }

    async findOne(id: string) {
        return this.prisma.document.findUnique({ where: { id } });
    }

    /** Get all unique topics across all documents */
    async getAllTopics(): Promise<string[]> {
        const docs = await this.prisma.document.findMany({
            where: { processed: true },
            select: { topics: true },
        });
        const topicSet = new Set<string>();
        for (const doc of docs) {
            if (Array.isArray(doc.topics)) {
                (doc.topics as string[]).forEach((t) => topicSet.add(t));
            }
        }
        return Array.from(topicSet).sort();
    }

    /** Get combined text content, optionally filtered by topic */
    async getContentByTopic(topic?: string): Promise<{ text: string; docIds: string[] }> {
        let docs;
        if (topic) {
            // Filter documents that contain this topic
            const allDocs = await this.prisma.document.findMany({
                where: { processed: true },
                select: { id: true, textContent: true, topics: true },
            });
            docs = allDocs.filter((d) =>
                Array.isArray(d.topics) && (d.topics as string[]).includes(topic),
            );
        } else {
            docs = await this.prisma.document.findMany({
                where: { processed: true },
                select: { id: true, textContent: true },
            });
        }
        const text = docs.map((d) => d.textContent || '').join('\n\n---\n\n');
        const docIds = docs.map((d) => d.id);
        return { text, docIds };
    }

    async getFileBuffer(key: string): Promise<Buffer> {
        const response = await this.s3Client.send(
            new GetObjectCommand({ Bucket: this.bucketName, Key: key })
        ) as GetObjectCommandOutput;
        const stream = response.Body as any;
        if (!stream) throw new InternalServerErrorException('Empty file body');
        const chunks: any[] = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        return Buffer.concat(chunks);
    }

    /** Delete a document and all associated data */
    async remove(id: string) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) return { deleted: false };

        // Delete associated tests (and their questions)
        const tests = await this.prisma.test.findMany({ where: { documentId: id }, select: { id: true } });
        for (const t of tests) {
            await this.prisma.question.deleteMany({ where: { testId: t.id } });
        }
        await this.prisma.test.deleteMany({ where: { documentId: id } });

        // Delete generation history
        await this.prisma.generationHistory.deleteMany({ where: { documentId: id } });

        // Delete from S3
        try {
            await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: doc.s3Key }));
        } catch { /* S3 delete fail is non-fatal */ }

        // Delete from DB
        await this.prisma.document.delete({ where: { id } });
        return { deleted: true };
    }
}
