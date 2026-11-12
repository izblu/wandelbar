export type AppChannel = 'production' | 'preview';

/** Kanal dieses Builds: Hauptversion (`/wandelbar/`) oder Vorschau (`/wandelbar/preview/`). */
export const appChannel: AppChannel = __APP_CHANNEL__;

export const isPreview: boolean = appChannel === 'preview';
