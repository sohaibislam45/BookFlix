import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let url;
    try {
      url = new URL(imageUrl);
    } catch (error) {
      console.error('[Image Proxy] Invalid URL:', imageUrl);
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Only allow HTTPS URLs
    if (url.protocol !== 'https:') {
      console.error('[Image Proxy] Non-HTTPS URL rejected:', imageUrl);
      return NextResponse.json(
        { error: 'Only HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        console.error('[Image Proxy] Failed to fetch image:', imageUrl, 'Status:', imageResponse.status);
        return NextResponse.json(
          { error: 'Failed to fetch image' },
          { status: imageResponse.status }
        );
      }

      // Get the image data
      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

      // Return the image with appropriate headers
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[Image Proxy] Request timeout:', imageUrl);
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[Image Proxy] Error:', error.message, 'URL:', request.url);
    return NextResponse.json(
      { error: 'Failed to proxy image', details: error.message },
      { status: 500 }
    );
  }
}

