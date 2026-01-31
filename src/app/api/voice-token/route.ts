import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.VOCAL_BRIDGE_API_KEY;

    if (!apiKey) {
        console.error('VOCAL_BRIDGE_API_KEY is not set');
        return NextResponse.json(
            { error: 'VOCAL_BRIDGE_API_KEY not configured' },
            { status: 500 }
        );
    }

    try {
        // Add browser-like headers to bypass Cloudflare bot detection
        const response = await fetch('https://vocalbridgeai.com/api/v1/token', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://vocalbridgeai.com',
                'Referer': 'https://vocalbridgeai.com/',
            },
            body: JSON.stringify({
                participant_name: 'Executive User',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vocal Bridge API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Vocal Bridge API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Token endpoint error:', error);
        return NextResponse.json(
            { error: 'Failed to connect to Vocal Bridge', details: String(error) },
            { status: 500 }
        );
    }
}
