import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
        const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const response = await fetch(`${ALLM_URL}/document/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
            },
            body: uploadFormData,
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('AnythingLLM upload error:', data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
