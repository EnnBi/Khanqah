// Web stub — expo-sqlite is not supported on web.
// All functions return empty/no-op values.

export function initOfflineDB() {}

export function saveDownloadedContent(_id: string, _contentJson: string, _localPath: string) {}

export function getDownloadedContent(): any[] {
  return [];
}

export function getDownloadedContentById(_id: string): any {
  return null;
}

export function deleteDownloadedContent(_id: string) {}

export function saveLocalProgress(_contentId: string, _positionSeconds: number, _completed: boolean) {}

export function getLocalProgress(_contentId: string): any {
  return null;
}

export function getAllLocalProgress(): any[] {
  return [];
}
