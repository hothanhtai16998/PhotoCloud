// Observe the rendered image rather than creating a second image/fetch request.
export function watchDecodedImage(
  image: HTMLImageElement,
  onReady: () => void,
  onError: () => void,
): () => void {
  let disposed = false;
  let settling = false;
  const failed = (): void => {
    if (disposed || settling) return;
    settling = true;
    onError();
  };
  const loaded = async (): Promise<void> => {
    if (disposed || settling) return;
    settling = true;
    try {
      if (image.decode) await image.decode();
    } catch {
      // Some browsers reject decode even when the loaded image can be drawn.
    }
    if (disposed) return;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) onReady();
    else onError();
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', failed);
  if (image.complete) {
    if (image.naturalWidth > 0) void loaded();
    else failed();
  }
  return () => {
    disposed = true;
    image.removeEventListener('load', loaded);
    image.removeEventListener('error', failed);
  };
}
