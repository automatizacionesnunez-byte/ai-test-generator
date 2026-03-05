import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
        const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
        const resolvedParams = await params;
        const path = resolvedParams.path.join('/');
        const url = `${ALLM_URL}/${path}`;

        const contentType = req.headers.get('content-type') || "";
        let body;

        if (contentType.includes('multipart/form-data')) {
            body = await req.formData();
        } else if (contentType.includes('application/json')) {
            body = JSON.stringify(await req.json());
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
                ...(contentType && !contentType.includes('multipart/form-data') ? { 'Content-Type': contentType } : {}),
            },
            body,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('VPS Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
        const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
        const resolvedParams = await params;
        const path = resolvedParams.path.join('/');
        const url = `${ALLM_URL}/${path}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
            },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('VPS Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
        const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
        const resolvedParams = await params;
        const path = resolvedParams.path.join('/');
        const url = `${ALLM_URL}/${path}`;

        const contentType = req.headers.get('content-type') || "";
        let body;
        if (contentType.includes('application/json')) {
            body = JSON.stringify(await req.json());
        }

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${ALLM_KEY}`,
                ...(contentType ? { 'Content-Type': contentType } : {}),
            },
            body,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('VPS Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
