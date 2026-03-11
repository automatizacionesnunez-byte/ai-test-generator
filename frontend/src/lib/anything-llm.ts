"use client";

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function uploadDocumentToWorkspace(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/vps/document/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Upload failed');
    }

    const uploadResult = await response.json();
    if (!uploadResult.documents || uploadResult.documents.length === 0) {
        console.error('Upload success but no document info returned:', uploadResult);
        throw new Error('Upload failed: No document info returned from server');
    }

    const documentPath = uploadResult.documents[0].location;
    if (!documentPath) {
        throw new Error('Upload failed: Server did not return document location');
    }

    // Now move/link it to the workspace
    // We get the workspace from env in the proxy too, but we need the slug here
    const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE || 'test-joaqui';
    console.log(`Linking document to workspace: ${ALLM_WORKSPACE}`);

    const moveResponse = await fetch(`/api/vps/workspace/${ALLM_WORKSPACE}/update-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            adds: [documentPath],
        }),
    });

    if (!moveResponse.ok) {
        const err = await moveResponse.json().catch(() => ({}));
        console.error('Linking error:', err);
        throw new Error('Failed to link document to workspace');
    }

    return documentPath;
}

export async function removeDocumentFromWorkspace(documentPath: string) {
    const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE || 'test-joaqui';
    const response = await fetch(`/api/vps/workspace/${ALLM_WORKSPACE}/update-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            deletes: [documentPath],
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to remove document from workspace');
    }

    return response.json();
}

export async function sendChatMessage(message: string, history: ChatMessage[] = []) {
    const ALLM_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHINGLLM_WORKSPACE;
    const response = await fetch(`/api/vps/workspace/${ALLM_WORKSPACE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            mode: 'chat',
            history,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Chat request failed');
    }

    return response.json();
}

export async function getWorkspaceDocuments() {
    const response = await fetch('/api/vps/documents');
    if (!response.ok) return [];
    return response.json();
}
