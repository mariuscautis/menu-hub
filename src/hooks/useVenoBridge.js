/**
 * useVenoBridge.js
 *
 * Connects to a local VenoApp Bridge WebSocket server.
 * The Bridge acts as a LAN hub for receipt printing and offline order sync.
 *
 * Connection strategy (handles Windows/Android where mDNS .local fails):
 *   1. Try ws://venobridge.local:3355  (works on macOS/Linux)
 *   2. If that times out, try ws://{restaurant.bridge_hub_ip}:3355 (direct IP)
 *   Both attempts happen on every reconnect cycle.
 *
 * Authentication:
 *   First message after connect must be bridge:auth with bridge_ws_token from
 *   the restaurant record (pushed there by the Bridge on setup via Supabase RPC).
 */

import { useEffect, useRef, useState, useCallback } from "react";

const BRIDGE_PORT      = 3355;
const MDNS_HOST        = "venobridge.local";
const RECONNECT_MS     = 8_000;   // wait before re-attempting after full failure
const PING_INTERVAL    = 20_000;  // heartbeat interval
const MDNS_TIMEOUT_MS  = 3_000;   // give up on mDNS attempt after this
const IP_TIMEOUT_MS    = 4_000;   // give up on direct-IP attempt after this

/**
 * @param {object|null} restaurant  The restaurant object from useRestaurant().
 *                                  Uses bridge_ws_token (auth) and bridge_hub_ip (fallback).
 * @returns {{
 *   isConnected: boolean,
 *   bridgeStatus: { connected_devices: Array, duplicate_hub: boolean } | null,
 *   sendPrintJob: (receiptPayload: object) => boolean,
 *   sendOrderEvent: (type: string, payload: object) => boolean,
 *   requestStatus: () => void
 * }}
 */
export function useVenoBridge(restaurant) {
  const wsRef         = useRef(null);
  const pingTimerRef  = useRef(null);
  const reconnectRef  = useRef(null);
  const mountedRef    = useRef(true);
  const connectingRef = useRef(false);
  const restaurantRef = useRef(restaurant);

  useEffect(() => { restaurantRef.current = restaurant; }, [restaurant]);

  const [isConnected, setIsConnected]   = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(null);

  // ── Send a raw JSON message ─────────────────────────────────────────────────
  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try { ws.send(JSON.stringify(obj)); return true; }
    catch { return false; }
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────
  const sendPrintJob   = useCallback((p) => send({ type: "print:receipt", payload: p }), [send]);
  const sendOrderEvent = useCallback((type, p) => send({ type, payload: p }), [send]);
  const requestStatus  = useCallback(() => send({ type: "bridge:get_status" }), [send]);

  // ── Timers ──────────────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    clearInterval(pingTimerRef.current);
    clearTimeout(reconnectRef.current);
  }, []);

  // ── Try a single WebSocket URL ──────────────────────────────────────────────
  // Returns a promise that resolves to true if auth succeeded, false otherwise.
  const tryUrl = useCallback((url, timeoutMs) => new Promise((resolve) => {
    let settled = false;
    const settle = (val) => { if (!settled) { settled = true; resolve(val); } };

    let ws;
    try { ws = new WebSocket(url); }
    catch { settle(false); return; }

    const tid = setTimeout(() => { ws.close(); settle(false); }, timeoutMs);

    ws.onopen = () => {
      clearTimeout(tid);
      if (!mountedRef.current) { ws.close(); settle(false); return; }
      // Send token if available; Bridge accepts empty token until token sync completes
      const token = restaurantRef.current?.bridge_ws_token ?? "";
      ws.send(JSON.stringify({ type: "bridge:auth", token, user_agent: navigator.userAgent }));
    };

    ws.onerror = () => {};  // onclose handles cleanup

    ws.onclose = () => { clearTimeout(tid); settle(false); };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "bridge:auth_ok") {
          // If another socket already won the race, close this one
          if (wsRef.current && wsRef.current !== ws) { ws.close(); settle(false); return; }
          // Success — hand the socket back to the main connection manager
          wsRef.current = ws;
          connectingRef.current = false;
          setIsConnected(true);
          // Request status immediately so dashboard updates without waiting for poll
          ws.send(JSON.stringify({ type: "bridge:get_status" }));
          pingTimerRef.current = setInterval(() => send({ type: "bridge:ping" }), PING_INTERVAL);

          // Re-wire handlers for the live session
          ws.onclose = () => {
            clearTimers();
            connectingRef.current = false;
            if (!mountedRef.current) return;
            setIsConnected(false);
            wsRef.current = null;
            scheduleReconnect();
          };
          ws.onmessage = (e) => {
            try {
              const m = JSON.parse(e.data);
              if (m.type === "bridge:status")  setBridgeStatus(m.payload || null);
              // bridge:pong — nothing to do
            } catch {}
          };
          settle(true);
        } else if (msg.type === "bridge:auth_failed") {
          // Token mismatch — close this attempt and let the cycle retry normally.
          // The token may not have propagated to the restaurant record yet.
          ws.close();
          settle(false);  // will fall through to scheduleReconnect
        }
      } catch {}
    };
  }), [send, clearTimers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Main connect: try mDNS, then direct IP ──────────────────────────────────
  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    if (connectingRef.current) return;

    // Bail if already open / connecting
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN ||
                     existing.readyState === WebSocket.CONNECTING)) return;

    connectingRef.current = true;

    // 1. Try mDNS hostname
    const mdnsOk = await tryUrl(`ws://${MDNS_HOST}:${BRIDGE_PORT}`, MDNS_TIMEOUT_MS);
    if (mdnsOk || !mountedRef.current) return;

    // 2. Fall back to direct IP (if hub IP is known)
    const hubIp = restaurantRef.current?.bridge_hub_ip;
    if (hubIp && hubIp !== "unknown") {
      const ipOk = await tryUrl(`ws://${hubIp}:${BRIDGE_PORT}`, IP_TIMEOUT_MS);
      if (ipOk || !mountedRef.current) return;
    }

    // Both failed — schedule retry
    connectingRef.current = false;
    scheduleReconnect();
  }, [tryUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    reconnectRef.current = setTimeout(connect, RECONNECT_MS);
  }, [connect]);

  // ── Mount / unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconnect when restaurant data loads (token/IP now available)
  useEffect(() => {
    if ((restaurant?.bridge_ws_token || restaurant?.bridge_hub_ip) &&
        !isConnected && !wsRef.current) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.bridge_ws_token, restaurant?.bridge_hub_ip]);

  return { isConnected, bridgeStatus, sendPrintJob, sendOrderEvent, requestStatus };
}

export default useVenoBridge;
