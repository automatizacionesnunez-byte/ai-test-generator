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
exports.AIService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
let AIService = class AIService {
    configService;
    genAI;
    model;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: 'application/json' },
            });
        }
        else {
            console.warn('⚠️ GEMINI_API_KEY is missing. AI Service will use MOCKS.');
        }
    }
    async callWithRetry(prompt, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text().replace(/```json/g, '').replace(/```/g, '');
            }
            catch (error) {
                if (error?.status === 429 && attempt < maxRetries - 1) {
                    const wait = Math.min((attempt + 1) * 15000, 60000);
                    console.warn(`⏳ Rate limited (429). Waiting ${wait / 1000}s before retry ${attempt + 2}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, wait));
                }
                else if (error?.status === 429) {
                    throw new common_1.ServiceUnavailableException('La IA está temporalmente sobrecargada. Inténtalo en un minuto.');
                }
                else {
                    throw error;
                }
            }
        }
        throw new common_1.InternalServerErrorException('AI call failed after retries');
    }
    async extractTopics(text) {
        if (!this.model)
            return ['General'];
        const prompt = `
Analiza el siguiente texto académico/legal y extrae los títulos principales o temas que cubre.
Devuelve SOLO un JSON array de strings con los nombres de los temas.
Máximo 10 temas. Sé conciso en los nombres.
Ejemplo: ["Derecho Civil", "Contratos", "Obligaciones"]

Texto:
${text.substring(0, 15000)}
`;
        try {
            const raw = await this.callWithRetry(prompt);
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : ['General'];
        }
        catch (error) {
            console.error('Topic extraction error:', error);
            return ['General'];
        }
    }
    async generateTest(documentContent, numQuestions = 20, difficulty = 'MEDIUM', topic) {
        if (!this.model)
            return this.generateMockQuestions(numQuestions);
        const topicFilter = topic ? `Enfócate SOLO en el tema "${topic}".` : '';
        const diffMap = { EASY: 'fácil', MEDIUM: 'medio', HARD: 'difícil' };
        const prompt = `
Crea un examen tipo test con EXACTAMENTE ${numQuestions} preguntas basadas en el siguiente contenido.
La dificultad debe ser: ${diffMap[difficulty] || 'medio'}.
${topicFilter}
Cada pregunta debe tener 4 opciones, y solo una respuesta correcta.
Las preguntas deben ser variadas y cubrir distintos aspectos del contenido.
Devuelve un JSON array con esta estructura:
[
  {
    "question": "Texto de la pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctAnswer": "La opción correcta exactamente como aparece en options",
    "explanation": "Explicación breve de por qué es correcta"
  }
]

Contenido:
${documentContent.substring(0, 50000)}
`;
        try {
            const raw = await this.callWithRetry(prompt);
            return JSON.parse(raw);
        }
        catch (error) {
            if (error?.status === 503 || error?.response?.statusCode === 503)
                throw error;
            console.error('Gemini Generation Error:', error);
            throw new common_1.InternalServerErrorException('Error al generar el examen con IA');
        }
    }
    generateMockQuestions(numQuestions) {
        return Array.from({ length: numQuestions }, (_, i) => ({
            question: `Pregunta de ejemplo ${i + 1}: ¿Cuál es la respuesta correcta?`,
            options: ['Opción A', 'Opción B', 'Opción C', 'Opción Correcta'],
            correctAnswer: 'Opción Correcta',
            explanation: 'Esta es una pregunta de ejemplo (no hay API key configurada o la cuota está agotada).',
        }));
    }
};
exports.AIService = AIService;
exports.AIService = AIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AIService);
//# sourceMappingURL=ai.service.js.map