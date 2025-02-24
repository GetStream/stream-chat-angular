export const isImageFile = (file: File) => {
  // photoshop files begin with 'image/'
  return file.type.startsWith('image/') && !file.type.endsWith('.photoshop');
};

export const readBlobAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      resolve(fileReader.result as ArrayBuffer);
    };

    fileReader.onerror = () => {
      reject(new Error(fileReader.error?.message));
    };

    fileReader.readAsArrayBuffer(blob);
  });

export const createFileFromBlobs = ({
  blobsArray,
  fileName,
  mimeType,
}: {
  blobsArray: Blob[];
  fileName: string;
  mimeType: string;
}) => {
  const concatenatedBlob = new Blob(blobsArray, { type: mimeType });
  return new File([concatenatedBlob], fileName, {
    type: concatenatedBlob.type,
  });
};

export const getExtensionFromMimeType = (mimeType: string) => {
  const match = mimeType.match(/\/([^/;]+)/);
  return match && match[1];
};

export const createUriFromBlob = (blob: Blob) => {
  return new Promise<string | ArrayBuffer | undefined>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result ?? undefined);
    };
    reader.onerror = (_) =>
      reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });
};
