import { NextResponse } from 'next/server';
import { uploadImageToImgBB } from '@/lib/imgbb';
import { validateFile } from '@/lib/validation';
import { handleApiError } from '@/lib/apiErrorHandler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export async function POST(request) {
  try {
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('Error parsing form data:', parseError);
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      );
    }

    const file = formData.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Check if file is actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file object' },
        { status: 400 }
      );
    }

    // Validate file
    const fileValidation = validateFile(file, {
      maxSize: MAX_FILE_SIZE,
      allowedTypes: ALLOWED_IMAGE_TYPES,
      allowedExtensions: ALLOWED_EXTENSIONS,
    });

    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.message },
        { status: 400 }
      );
    }

    // Validate file is actually an image
    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert File to Blob for ImgBB
    let imageBlob;
    try {
      const blob = await file.arrayBuffer();
      imageBlob = new Blob([blob], { type: file.type });
    } catch (blobError) {
      console.error('Error converting file to blob:', blobError);
      return NextResponse.json(
        { error: 'Failed to process image file' },
        { status: 500 }
      );
    }

    // Upload to ImgBB
    let url;
    try {
      const result = await uploadImageToImgBB(imageBlob);
      url = result.url;
    } catch (uploadError) {
      console.error('Error uploading to ImgBB:', uploadError);
      return NextResponse.json(
        { error: uploadError.message || 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('Upload route error:', error);
    return handleApiError(error, 'upload image');
  }
}

