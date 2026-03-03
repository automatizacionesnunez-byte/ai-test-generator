const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function uploadDocument(file: File, title: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title || file.name);
    const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
}

export async function getDocuments() {
    const res = await fetch(`${API}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
}

export async function getTopics(): Promise<string[]> {
    const res = await fetch(`${API}/documents/topics`);
    if (!res.ok) throw new Error('Failed to load topics');
    return res.json();
}

export async function generateTest(topic: string | null, mode: string, difficulty: string, timed: boolean) {
    const res = await fetch(`${API}/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, mode, difficulty, timed }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Error al generar el examen');
    }
    return res.json();
}

export async function getTests() {
    const res = await fetch(`${API}/tests`);
    if (!res.ok) throw new Error('Failed to load tests');
    return res.json();
}

export async function getTest(id: string) {
    const res = await fetch(`${API}/tests/${id}`);
    if (!res.ok) throw new Error('Test not found');
    return res.json();
}

export async function saveScore(id: string, score: number) {
    const res = await fetch(`${API}/tests/${id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
    });
    if (!res.ok) throw new Error('Failed to save score');
    return res.json();
}

export async function deleteTest(id: string) {
    const res = await fetch(`${API}/tests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    return res.json();
}

export async function deleteDocument(id: string) {
    const res = await fetch(`${API}/documents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
}
