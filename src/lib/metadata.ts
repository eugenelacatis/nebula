import jsmediatags from "jsmediatags";

export interface TrackMetadata {
  title: string;
  artist: string;
}

export function extractMetadata(file: File): Promise<TrackMetadata> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        resolve({
          title: tag.tags.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: tag.tags.artist || "Unknown Artist",
        });
      },
      onError: () => {
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Unknown Artist",
        });
      },
    });
  });
}
