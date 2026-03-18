declare module 'jsmediatags' {
  interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    comment?: string;
    track?: string;
    genre?: string;
    picture?: {
      format: string;
      data: number[];
    };
  }

  interface TagReadResult {
    type: string;
    tags: Tags;
  }

  interface ReadCallbacks {
    onSuccess: (result: TagReadResult) => void;
    onError: (error: { type: string; info: string }) => void;
  }

  function read(file: File | string, callbacks: ReadCallbacks): void;

  export default { read };
}
