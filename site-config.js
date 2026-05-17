/**
 * Site links and server details — edit this file to update the whole site.
 */
window.SITE_CONFIG = {
  serverIp: "mc.rslover521minecraftserver.pro",
  liveMapUrl: "http://createtrackmap.rslover521minecraftserver.pro:12010/",
  blueMapUrl: "http://bluemap.rslover521minecraftserver.pro:12009/",
  /** Shown when the BlueMap iframe can't be embedded */
  blueMapFallbackImageSrc: "images/bluemap-fallback.jpg",
  discordUrl: "https://discord.gg/zJguWKyjDt",
  /** How often to refresh the header server status (ms). 0 = check once only. */
  serverStatusRefreshMs: 120000,
  /**
   * Optional Java status query target "ip:port" or "hostname:port" if the host only works that way.
   * Usually leave blank — the site tries your server IP, then SRV (e.g. UltraServers game port).
   */
  serverStatusQueryTarget: "",
  modpackUrl:
    "https://drive.google.com/file/d/1epZm2OUujBxiAsuTPkKZ0kMfh7dPz29B/view?usp=drive_link",
  minecraftVersion: "1.20.1",
  forgeVersion: "47.4.0",
  /** Shown in the live-map section; add your screenshot as this file */
  liveMapImageSrc: "images/live-map.png",
};
