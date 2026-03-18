declare module "jsmediatags" {
  interface Tags {
    title?: string;
    artist?: string;
  }

  interface TagType {
    tags: Tags;
  }

  interface ReadOptions {
    onSuccess: (tag: TagType) => void;
    onError: (error: unknown) => void;
  }

  function read(file: File | string, options: ReadOptions): void;
}
