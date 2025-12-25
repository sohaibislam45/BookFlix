/**
 * Upload image to ImgBB
 * @param {File|Blob} imageFile - The image file to upload
 * @returns {Promise<{url: string, deleteUrl: string}>}
 */
export async function uploadImageToImgBB(imageFile) {
  if (!process.env.IMGBB_API_KEY) {
    throw new Error('Please add your ImgBB API key to .env.local');
  }

  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('key', process.env.IMGBB_API_KEY);

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload image');
  }

  const data = await response.json();
  
  return {
    url: data.data.url,
    deleteUrl: data.data.delete_url,
  };
}

