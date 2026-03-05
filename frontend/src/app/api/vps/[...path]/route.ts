import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// We allow a long duration for large file uploads and embeddings
export const maxDuration = 120;

async function proxyRequest(req: Request, paramsPromise: Promise<{ path: string[] }>) {
    const ALLM_URL = process.env.NEXT_PUBLIC_ANYTHINGLLM_URL;
    const ALLM_KEY = process.env.NEXT_PUBLIC_ANYTHINGLLM_KEY;
    const { path: pathSegments } = await paramsPromise;
    const path = pathSegments.join('/');
    const url = `${ALLM_URL}/${path}`;

    console.log(`[Proxy] ${req.method} ${url}`);

    // Headers to forward
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${ALLM_KEY}`);

    // Copy headers from request that we want to keep
    const headersToCopy = ['content-type', 'accept', 'range'];
    headersToCopy.forEach(h => {
        const val = req.headers.get(h);
        if (val) headers.set(h, val);
    });

    try {
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: headers,
            // @ts-ignore
            duplex: 'half'
        };

        // Only add body if it's not a GET/HEAD request
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = req.body;
        }

        const response = await fetch(url, fetchOptions);

        // Handle different response types
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        } else {
            const data = await response.arrayBuffer();
            return new Response(data, {
                status: response.status,
                headers: {
                    'Content-Type': contentType || 'application/octet-stream'
                }
            });
        }
    } catch (error: any) {
        console.error(`[Proxy Error] ${req.method} ${url}:`, error);
        return NextResponse.json({
            error: 'VPS Communication Error',
            details: error.message
        }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, params);
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, params);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, params);
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    return proxyRequest(req, params);
}
