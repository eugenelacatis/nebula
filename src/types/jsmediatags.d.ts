interface JsMediaTagsInstance {
  read(file: File | string, callbacks: {
    onSuccess: (tag: { tags: { title?: string; artist?: string; album?: string } }) => void;
    onError: (error: unknown) => void;
  }): void;
}

declare module 'jsmediatags' {
  const jsmediatags: JsMediaTagsInstance;
  export default jsmediatags;
}

declare module 'jsmediatags/build2/jsmediatags.web' {
  const jsmediatags: JsMediaTagsInstance;
  export default jsmediatags;
}
