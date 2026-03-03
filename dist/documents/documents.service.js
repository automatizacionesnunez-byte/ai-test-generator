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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
let DocumentsService = class DocumentsService {
    prisma;
    config;
    aiService;
    s3Client;
    bucketName;
    constructor(prisma, config, aiService) {
        this.prisma = prisma;
        this.config = config;
        this.aiService = aiService;
        this.s3Client = new client_s3_1.S3Client({
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
            await this.s3Client.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucketName }));
        }
        catch (e) {
            if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
                console.log(`Creating bucket ${this.bucketName}...`);
                await this.s3Client.send(new client_s3_1.CreateBucketCommand({ Bucket: this.bucketName }));
            }
        }
    }
    async uploadDocument(file, title) {
        const fileKey = `uploads/${uuidv4()}-${file.originalname}`;
        try {
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName, Key: fileKey,
                Body: file.buffer, ContentType: file.mimetype,
            }));
        }
        catch (error) {
            console.error('S3 Upload Error:', error);
            throw new common_1.InternalServerErrorException('Failed to upload file');
        }
        let textContent = '';
        try {
            if (file.mimetype.includes('pdf')) {
                const parsed = await pdfParse(file.buffer);
                textContent = parsed.text;
            }
            else {
                textContent = file.buffer.toString('utf-8');
            }
        }
        catch (err) {
            console.error('Text extraction error:', err);
        }
        let topics = ['General'];
        if (textContent.length > 50) {
            try {
                topics = await this.aiService.extractTopics(textContent);
            }
            catch { }
        }
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
    async findOne(id) {
        return this.prisma.document.findUnique({ where: { id } });
    }
    async getAllTopics() {
        const docs = await this.prisma.document.findMany({
            where: { processed: true },
            select: { topics: true },
        });
        const topicSet = new Set();
        for (const doc of docs) {
            if (Array.isArray(doc.topics)) {
                doc.topics.forEach((t) => topicSet.add(t));
            }
        }
        return Array.from(topicSet).sort();
    }
    async getContentByTopic(topic) {
        let docs;
        if (topic) {
            const allDocs = await this.prisma.document.findMany({
                where: { processed: true },
                select: { id: true, textContent: true, topics: true },
            });
            docs = allDocs.filter((d) => Array.isArray(d.topics) && d.topics.includes(topic));
        }
        else {
            docs = await this.prisma.document.findMany({
                where: { processed: true },
                select: { id: true, textContent: true },
            });
        }
        const text = docs.map((d) => d.textContent || '').join('\n\n---\n\n');
        const docIds = docs.map((d) => d.id);
        return { text, docIds };
    }
    async getFileBuffer(key) {
        const response = await this.s3Client.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucketName, Key: key }));
        const stream = response.Body;
        if (!stream)
            throw new common_1.InternalServerErrorException('Empty file body');
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    async remove(id) {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc)
            return { deleted: false };
        const tests = await this.prisma.test.findMany({ where: { documentId: id }, select: { id: true } });
        for (const t of tests) {
            await this.prisma.question.deleteMany({ where: { testId: t.id } });
        }
        await this.prisma.test.deleteMany({ where: { documentId: id } });
        await this.prisma.generationHistory.deleteMany({ where: { documentId: id } });
        try {
            await this.s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucketName, Key: doc.s3Key }));
        }
        catch { }
        await this.prisma.document.delete({ where: { id } });
        return { deleted: true };
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        ai_service_1.AIService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map