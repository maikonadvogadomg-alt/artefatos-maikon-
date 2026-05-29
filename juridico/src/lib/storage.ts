export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const removeStorageItem = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {}
};

export const SK = {
  API_KEY: "sk_api_key",
  MODEL: "sk_model",
  NEON_URL: "sk_neon_url",
  VOICE: "sk_voice_enabled",
  TTS_SPEED: "sk_tts_speed",
  TTS_PITCH: "sk_tts_pitch",
  CHAT: "sk_chat_history",
  SESSIONS: "sk_sessions",
  CUSTOM_MODES: "sk_custom_modes",
};
