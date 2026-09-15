/** Preserve photo order and duplicates; ignore non-string and blank values. */
export const normalizePhotoList = (...sources: unknown[]): string[] => {
  const photos: string[] = [];
  for (const source of sources) {
    const values = Array.isArray(source) ? source : [source];
    for (const value of values) {
      if (typeof value !== "string") continue;
      const photo = value.trim();
      if (photo) photos.push(photo);
    }
  }
  return photos;
};
