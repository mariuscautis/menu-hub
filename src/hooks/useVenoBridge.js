/**
 * useVenoBridge.js
 *
 * Connects to a local VenoApp Bridge WebSocket server at ws://venobridge.local:3355.
 * The Bridge acts as a LAN hub for receipt printing and offline order sync.
 *
 * Usage:
 *   const { isConnected, sendPrintJob, sendOrderEvent } = useVenoBridge(restaurant);
 *
 *   // Send a print job (falls back silently if not connected)
 *   sendPrintJob(receiptPayload);
 *
 *   // Broadcast an order event (falls back to Supabase in your own code)
 *   const sent = sendOrderEvent("order:insert", orderPayload);
 *   if (!sent) { // do Supabase insert instead }
 *
 * Authentication:
 *   The Bridge requires the first message to be a bridge:auth message carrying the
 *   ws_token stored in the restaurant record (pushed there by the Bridge on setup).
 *   Pass the restaurant object from useRestaurant() — the hook reads bridge_ws_token.
 */

import { useEffect, useRef, useState, useCallback } from "react";

const BRIDGE_WS_URL   = "ws://venobridge.local:3355";
const RECONNECT_MS    = 5_000;   // wait before re-attempting
const PING_INTERVAL   = 20_000;  // heartbeat interval
const CONNECT_TIMEOUT = 3_000;   // give up on each connection attempt after this

/**
 * @param {object|null} restaurant  The restaurant object from useRestaurant().
 *                                  Must have bridge_ws_token for auth to succeed.
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
  const restaurantRef = useRef(restaurant);

  // Keep restaurantRef in sync so connect() always uses latest token
  useEffect(() => { restaurantRef.current = restaurant; }, [restaurant]);

  const [isConnected, setIsConnected]   = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState(null);

  // ── Send a raw JSON message ─────────────────────────────────────────────────
  const send = useCallback((obj) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Public: send a print job ────────────────────────────────────────────────
  const sendPrintJob = useCallback(
    (receiptPayload) => send({ type: "print:receipt", payload: receiptPayload }),
    [send]
  );

  // ── Public: send an order event ─────────────────────────────────────────────
  const sendOrderEvent = useCallback(
    (type, payload) => send({ type, payload }),
    [send]
  );

  // ── Public: request live status from Bridge ──────────────────────────────────
  const requestStatus = useCallback(
    () => send({ type: "bridge:get_status" }),
    [send]
  );

  // ── Connection management ───────────────────────────────────────────────────
  const clearTimers = () => {
    clearInterval(pingTimerRef.current);
    clearTimeout(reconnectRef.current);
  };

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Bail if already open / connecting
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN ||
                     existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let connectTimeoutId;
    let ws;

    try {
      ws = new WebSocket(BRIDGE_WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    // Hard timeout — if the connection hasn't opened within CONNECT_TIMEOUT ms,
    // close and retry. Prevents 30+ second browser TCP timeout.
    connectTimeoutId = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, CONNECT_TIMEOUT);

    ws.onopen = () => {
      clearTimeout(connectTimeoutId);
      if (!mountedRef.current) { ws.close(); return; }

      // Send auth token as the very first message
      const token = restaurantRef.current?.bridge_ws_token || "";
      ws.send(JSON.stringify({
        type:       "bridge:auth",
        token,
        user_agent: navigator.userAgent,
      }));

      // We wait for bridge:auth_ok before marking as connected (see onmessage)
    };

    ws.onclose = () => {
      clearTimeout(connectTimeoutId);
      clearTimers();
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror — suppress console noise
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "bridge:auth_ok") {
          setIsConnected(true);
          // Start heartbeat
          pingTimerRef.current = setInterval(() => {
            send({ type: "bridge:ping" });
          }, PING_INTERVAL);
        } else if (msg.type === "bridge:auth_failed") {
          // Wrong token — close without scheduling reconnect until token changes
          ws.close();
        } else if (msg.type === "bridge:status") {
          setBridgeStatus(msg.payload || null);
        }
        // bridge:pong — heartbeat acknowledged, nothing to do
      } catch {
        // ignore malformed messages
      }
    };
  }, [send]);

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

  // Reconnect when the restaurant (and its token) loads for the first time
  useEffect(() => {
    if (restaurant?.bridge_ws_token && !isConnected && !wsRef.current) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.bridge_ws_token]);

  return { isConnected, bridgeStatus, sendPrintJob, sendOrderEvent, requestStatus };
}

export default useVenoBridge;
