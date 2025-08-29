export enum EventType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid',
}

export enum StreamingPlatform {
  ZOOM = 'zoom',
  YOUTUBE_LIVE = 'youtube_live',
  TWITCH = 'twitch',
  CUSTOM_RTMP = 'custom_rtmp',
  WEBRTC = 'webrtc',
}

export enum VirtualEventStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  RECORDING_AVAILABLE = 'recording_available',
  CANCELLED = 'cancelled',
}

export enum AccessLevel {
  PUBLIC = 'public',
  TICKET_HOLDERS = 'ticket_holders',
  VIP_ONLY = 'vip_only',
  PRIVATE = 'private',
}

export enum InteractionType {
  CHAT = 'chat',
  POLL = 'poll',
  QA = 'qa',
  REACTION = 'reaction',
  RAISE_HAND = 'raise_hand',
  BREAKOUT_REQUEST = 'breakout_request',
}

export enum BreakoutRoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
}

export enum RecordingStatus {
  NOT_STARTED = 'not_started',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  AVAILABLE = 'available',
  FAILED = 'failed',
}

export enum NetworkingStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  DO_NOT_DISTURB = 'do_not_disturb',
  OFFLINE = 'offline',
}

export enum CheckInType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid',
}
