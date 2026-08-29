import { Providers } from '@/providers/baseProviders';
import { singletonWebrtcProviders } from '@/providers/webrtcProviders';
import { singletonWebsocketProviders } from '@/providers/websocketProviders';

export const supportedProtocols = ['WebRTC', 'WebSocket'] as const;

export type SupportedProtocolProvider = (typeof supportedProtocols)[number];

// WebSocket sync needs a y-websocket server, which a static host (GitHub Pages)
// cannot provide. WebRTC is peer-to-peer and works from any static origin, so the
// GitHub Pages build sets NEXT_PUBLIC_DEFAULT_PROTOCOL=WebRTC.
// A static export has no y-websocket server to talk to, so WebSocket must not be
// offered there: picking it would hand someone a room that silently never syncs.
export const selectableProtocols: readonly SupportedProtocolProvider[] = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? ['WebRTC'] : supportedProtocols;

export const defaultProtocol: SupportedProtocolProvider = process.env.NEXT_PUBLIC_DEFAULT_PROTOCOL === 'WebRTC' ? 'WebRTC' : 'WebSocket';
export function getProvidersByProtocolName(protocolName: SupportedProtocolProvider): Readonly<Providers<any>> {
  if (protocolName === 'WebRTC') {
    return singletonWebrtcProviders;
  }
  if (protocolName === 'WebSocket') {
    return singletonWebsocketProviders;
  }
  throw new Error(`Unknown protocol name: ${protocolName}`);
}
