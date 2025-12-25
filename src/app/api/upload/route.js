import { NextResponse } from 'next/server';
import { uploadImageToImgBB } from '@/lib/imgbb';
import { validateFile } from '@/lib/validation';
import { handleApiError } from '@/lib/apiErrorHandler';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

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
    const blob = await file.arrayBuffer();
    const imageBlob = new Blob([blob], { type: file.type });

    const { url } = await uploadImageToImgBB(imageBlob);

    if (!url) {
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'upload image');
  }
}

