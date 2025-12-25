import { NextResponse } from 'next/server';
import { uploadImageToImgBB } from '@/lib/imgbb';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert File to Blob for ImgBB
    const blob = await file.arrayBuffer();
    const imageBlob = new Blob([blob], { type: file.type });

    const { url } = await uploadImageToImgBB(imageBlob);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}

