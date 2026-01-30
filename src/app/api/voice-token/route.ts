import { NextResponse } from 'next/server';

const VOCAL_BRIDGE_API_KEY = process.env.VOCAL_BRIDGE_API_KEY;
const VOCAL_BRIDGE_URL = 'https://vocalbridgeai.com';

export async function GET() {
    if (!VOCAL_BRIDGE_API_KEY) {
        return NextResponse.json(
            { error: 'VOCAL_BRIDGE_API_KEY not configured' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(`${VOCAL_BRIDGE_URL}/api/v1/token`, {
            method: 'POST',
            headers: {
                'X-API-Key': VOCAL_BRIDGE_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                participant_name: 'Executive User',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vocal Bridge API error:', errorText);
            throw new Error(`Failed to get token: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Token endpoint error:', error);
        return NextResponse.json(
            { error: 'Failed to get voice token' },
            { status: 500 }
        );
    }
}
