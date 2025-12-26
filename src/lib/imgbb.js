/**
 * Upload image to ImgBB
 * @param {File|Blob} imageFile - The image file to upload
 * @returns {Promise<{url: string, deleteUrl: string}>}
 */
export async function uploadImageToImgBB(imageFile) {
  if (!process.env.IMGBB_API_KEY) {
    throw new Error('Please add your ImgBB API key to .env.local');
  }

  // Convert Blob to base64 for ImgBB API
  let base64Image;
  if (imageFile instanceof Blob) {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    base64Image = buffer.toString('base64');
  } else {
    throw new Error('Invalid image file type');
  }

  // Use form-urlencoded format for ImgBB
  const formData = new URLSearchParams();
  formData.append('key', process.env.IMGBB_API_KEY);
  formData.append('image', base64Image);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to upload image';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.data || !data.data.url) {
    throw new Error('Invalid response from ImgBB API');
  }
  
  return {
    url: data.data.url,
    deleteUrl: data.data.delete_url,
  };
}



