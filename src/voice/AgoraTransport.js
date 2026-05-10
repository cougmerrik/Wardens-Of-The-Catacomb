const DEFAULT_SDK_URL = "https://download.agora.io/sdk/release/AgoraRTC_N.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-agora-sdk="true"][src="${src}"]`);
    if (existing) {
      if (globalThis.AgoraRTC) resolve(globalThis.AgoraRTC);
      else existing.addEventListener("load", () => resolve(globalThis.AgoraRTC), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.agoraSdk = "true";
    script.addEventListener("load", () => resolve(globalThis.AgoraRTC), { once: true });
    script.addEventListener("error", () => reject(new Error(`Unable to load Agora SDK from ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export class AgoraTransport {
  constructor({ onRemoteTrack = null, onRemoteLeft = null } = {}) {
    this.onRemoteTrack = onRemoteTrack;
    this.onRemoteLeft = onRemoteLeft;
    this.client = null;
    this.localAudioTrack = null;
    this.joined = false;
    this.channel = "";
    this.uid = null;
    this.muted = false;
  }

  async loadSdk(sdkUrl = DEFAULT_SDK_URL) {
    if (globalThis.AgoraRTC) return globalThis.AgoraRTC;
    if (typeof document === "undefined") throw new Error("Agora voice requires a browser document.");
    const sdk = await loadScript(sdkUrl || DEFAULT_SDK_URL);
    if (!sdk) throw new Error("Agora SDK loaded without exposing AgoraRTC.");
    return sdk;
  }

  async join({ appId, channel, token = null, uid, sdkUrl = DEFAULT_SDK_URL } = {}) {
    if (!appId || !channel || !uid) return false;
    if (this.joined && this.channel === channel && this.uid === uid) return true;
    await this.leave();
    const AgoraRTC = await this.loadSdk(sdkUrl);
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.client.on("user-published", async (user, mediaType) => {
      await this.client.subscribe(user, mediaType);
      if (mediaType !== "audio") return;
      const playerId = String(user.uid || "");
      if (this.onRemoteTrack) this.onRemoteTrack(playerId, user.audioTrack);
    });
    this.client.on("user-unpublished", (user) => {
      if (this.onRemoteLeft) this.onRemoteLeft(String(user.uid || ""));
    });
    this.client.on("user-left", (user) => {
      if (this.onRemoteLeft) this.onRemoteLeft(String(user.uid || ""));
    });
    const resolvedUid = Number.isFinite(uid) ? Math.floor(uid) : uid;
    await this.client.join(appId, channel, token || null, resolvedUid);
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "speech_standard"
    });
    await this.applyMuted();
    await this.client.publish([this.localAudioTrack]);
    this.joined = true;
    this.channel = channel;
    this.uid = resolvedUid;
    return true;
  }

  async setMuted(muted) {
    this.muted = !!muted;
    await this.applyMuted();
  }

  async applyMuted() {
    if (!this.localAudioTrack) return;
    if (typeof this.localAudioTrack.setEnabled === "function") {
      await this.localAudioTrack.setEnabled(!this.muted).catch(() => {});
    } else if (typeof this.localAudioTrack.setMuted === "function") {
      await this.localAudioTrack.setMuted(this.muted).catch(() => {});
    }
  }

  async leave() {
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch {}
      this.localAudioTrack = null;
    }
    if (this.client) {
      try {
        await this.client.leave();
      } catch {}
    }
    this.client = null;
    this.joined = false;
    this.channel = "";
    this.uid = null;
  }
}
