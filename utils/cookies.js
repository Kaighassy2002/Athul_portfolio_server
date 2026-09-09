const { config } = require("../config/env");

const ACCESS_COOKIE = "aqc_at";
const REFRESH_COOKIE = "aqc_rt";

function baseCookieOptions() {
  const sameSite = config.COOKIE_SAMESITE === "none" ? "none" : "lax";
  return {
    httpOnly: true,
    secure: config.isProd || sameSite === "none",
    sameSite,
    path: "/",
  };
}

function accessCookieOptions() {
  return { ...baseCookieOptions(), maxAge: 15 * 60 * 1000 };
}

function refreshCookieOptions() {
  return {
    ...baseCookieOptions(),
    maxAge: config.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function clearCookieOptions() {
  return { ...baseCookieOptions(), maxAge: 0 };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res) {
  res.cookie(ACCESS_COOKIE, "", clearCookieOptions());
  res.cookie(REFRESH_COOKIE, "", clearCookieOptions());
}

function readAccessToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies?.[ACCESS_COOKIE] || "";
}

function readRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] || "";
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  readAccessToken,
  readRefreshToken,
};
