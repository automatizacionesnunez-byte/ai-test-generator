import {
    Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors,
    Body, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
    constructor(private readonly svc: DocumentsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async upload(
        @UploadedFile(new ParseFilePipe({
            validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        })) file: Express.Multer.File,
        @Body('title') title: string,
    ) {
        return this.svc.uploadDocument(file, title);
    }

    @Get('topics')
    getTopics() { return this.svc.getAllTopics(); }

    @Get()
    findAll() { return this.svc.findAll(); }

    @Get(':id')
    findOne(@Param('id') id: string) { return this.svc.findOne(id); }

    @Delete(':id')
    remove(@Param('id') id: string) { return this.svc.remove(id); }
}
