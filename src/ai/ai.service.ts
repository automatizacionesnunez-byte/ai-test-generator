import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get('GEMINI_API_KEY');
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: 'application/json' },
            });
        } else {
            console.warn('⚠️ GEMINI_API_KEY is missing. AI Service will use MOCKS.');
        }
    }

    /** Helper: call Gemini with retry on 429 */
    private async callWithRetry(prompt: string, maxRetries = 3): Promise<string> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text().replace(/```json/g, '').replace(/```/g, '');
            } catch (error: any) {
                if (error?.status === 429 && attempt < maxRetries - 1) {
                    const wait = Math.min((attempt + 1) * 15000, 60000); // 15s, 30s, 60s
                    console.warn(`⏳ Rate limited (429). Waiting ${wait / 1000}s before retry ${attempt + 2}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, wait));
                } else if (error?.status === 429) {
                    throw new ServiceUnavailableException('La IA está temporalmente sobrecargada. Inténtalo en un minuto.');
                } else {
                    throw error;
                }
            }
        }
        throw new InternalServerErrorException('AI call failed after retries');
    }

    /** Extract topic titles from document text */
    async extractTopics(text: string): Promise<string[]> {
        if (!this.model) return ['General'];

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
        } catch (error) {
            console.error('Topic extraction error:', error);
            return ['General'];
        }
    }

    /** Generate test questions from content */
    async generateTest(
        documentContent: string,
        numQuestions: number = 20,
        difficulty: string = 'MEDIUM',
        topic?: string,
    ): Promise<any> {
        if (!this.model) return this.generateMockQuestions(numQuestions);

        const topicFilter = topic ? `Enfócate SOLO en el tema "${topic}".` : '';
        const diffMap: Record<string, string> = { EASY: 'fácil', MEDIUM: 'medio', HARD: 'difícil' };

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
        } catch (error: any) {
            if (error?.status === 503 || error?.response?.statusCode === 503) throw error;
            console.error('Gemini Generation Error:', error);
            throw new InternalServerErrorException('Error al generar el examen con IA');
        }
    }

    private generateMockQuestions(numQuestions: number) {
        return Array.from({ length: numQuestions }, (_, i) => ({
            question: `Pregunta de ejemplo ${i + 1}: ¿Cuál es la respuesta correcta?`,
            options: ['Opción A', 'Opción B', 'Opción C', 'Opción Correcta'],
            correctAnswer: 'Opción Correcta',
            explanation: 'Esta es una pregunta de ejemplo (no hay API key configurada o la cuota está agotada).',
        }));
    }
}
