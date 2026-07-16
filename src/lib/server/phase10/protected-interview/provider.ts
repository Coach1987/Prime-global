import { randomUUID, createHash } from "node:crypto";
import type { InterviewParticipantRole, InterviewToken } from "./types.ts";

export interface VideoRoomRecord {
  roomId: string;
  interviewId: string;
  organizationId: string;
  status: "reserved" | "active" | "closed" | "expired" | "cancelled";
  participants: Array<{ participantId: string; role: InterviewParticipantRole; joinedAt: string; leftAt: string | null }>;
  events: Array<{ type: string; timestamp: string; metadata?: Record<string, unknown> }>;
  sessionVersion: number;
}

export interface VideoRoomProvider {
  reserveRoom(input: { roomId: string; interviewId: string; organizationId: string }): Promise<VideoRoomRecord>;
  activateRoom(input: { roomId: string; interviewId: string; organizationId: string }): Promise<VideoRoomRecord>;
  joinRoom(input: { roomId: string; participantId: string; role: InterviewParticipantRole }): Promise<VideoRoomRecord>;
  leaveRoom(input: { roomId: string; participantId: string }): Promise<VideoRoomRecord>;
  closeRoom(input: { roomId: string }): Promise<VideoRoomRecord>;
  expireRoom(input: { roomId: string }): Promise<VideoRoomRecord>;
  cancelRoom(input: { roomId: string }): Promise<VideoRoomRecord>;
  generateJoinToken(input: {
    roomId: string;
    participantId: string;
    participantRole: InterviewParticipantRole;
    organizationId: string;
    interviewId: string;
    ttlSeconds?: number;
    sessionVersion: number;
  }): Promise<InterviewToken>;
  validateParticipant(input: { roomId: string; participantId: string; role: InterviewParticipantRole }): Promise<boolean>;
  recordRoomEvent(input: { roomId: string; type: string; metadata?: Record<string, unknown> }): Promise<void>;
  getRoom(roomId: string): Promise<VideoRoomRecord | null>;
}

function signPlaceholder(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function createMockVideoRoomProvider(): VideoRoomProvider {
  const rooms = new Map<string, VideoRoomRecord>();

  function requireRoom(roomId: string): VideoRoomRecord {
    const room = rooms.get(roomId);
    if (!room) {
      throw new Error("room_not_found");
    }
    return room;
  }

  return {
    async reserveRoom(input) {
      const existing = rooms.get(input.roomId);
      if (existing && existing.status === "closed") {
        throw new Error("room_reuse_after_closure");
      }
      if (existing && existing.status !== "cancelled" && existing.status !== "expired") {
        return existing;
      }
      const room: VideoRoomRecord = {
        roomId: input.roomId,
        interviewId: input.interviewId,
        organizationId: input.organizationId,
        status: "reserved",
        participants: [],
        events: [{ type: "reserved", timestamp: new Date().toISOString() }],
        sessionVersion: (existing?.sessionVersion ?? 0) + 1,
      };
      rooms.set(input.roomId, room);
      return room;
    },

    async activateRoom(input) {
      const room = requireRoom(input.roomId);
      if (room.status === "active") {
        throw new Error("room_already_active");
      }
      if (room.status === "closed" || room.status === "expired" || room.status === "cancelled") {
        throw new Error("room_not_activatable");
      }
      room.status = "active";
      room.events.push({ type: "activated", timestamp: new Date().toISOString() });
      return room;
    },

    async joinRoom(input) {
      const room = requireRoom(input.roomId);
      if (room.status !== "active") {
        throw new Error("room_not_active");
      }
      const current = room.participants.find((entry) => entry.participantId === input.participantId);
      if (!current) {
        room.participants.push({
          participantId: input.participantId,
          role: input.role,
          joinedAt: new Date().toISOString(),
          leftAt: null,
        });
      }
      room.events.push({ type: "participant_joined", timestamp: new Date().toISOString(), metadata: { participantId: input.participantId } });
      return room;
    },

    async leaveRoom(input) {
      const room = requireRoom(input.roomId);
      const participant = room.participants.find((entry) => entry.participantId === input.participantId);
      if (participant && !participant.leftAt) {
        participant.leftAt = new Date().toISOString();
      }
      room.events.push({ type: "participant_left", timestamp: new Date().toISOString(), metadata: { participantId: input.participantId } });
      return room;
    },

    async closeRoom(input) {
      const room = requireRoom(input.roomId);
      room.status = "closed";
      room.events.push({ type: "closed", timestamp: new Date().toISOString() });
      return room;
    },

    async expireRoom(input) {
      const room = requireRoom(input.roomId);
      room.status = "expired";
      room.events.push({ type: "expired", timestamp: new Date().toISOString() });
      return room;
    },

    async cancelRoom(input) {
      const room = requireRoom(input.roomId);
      room.status = "cancelled";
      room.events.push({ type: "cancelled", timestamp: new Date().toISOString() });
      return room;
    },

    async generateJoinToken(input) {
      const issued = new Date();
      const expires = new Date(issued.getTime() + (input.ttlSeconds ?? 300) * 1000);
      const payload = `${input.roomId}:${input.participantId}:${input.participantRole}:${input.organizationId}:${input.interviewId}:${input.sessionVersion}`;
      return {
        tokenId: randomUUID(),
        issued_at: issued.toISOString(),
        expires_at: expires.toISOString(),
        room_id: input.roomId,
        participant_id: input.participantId,
        participant_role: input.participantRole,
        organization_id: input.organizationId,
        interview_id: input.interviewId,
        session_version: input.sessionVersion,
        signature_placeholder: signPlaceholder(payload),
      };
    },

    async validateParticipant(input) {
      const room = rooms.get(input.roomId);
      if (!room) return false;
      if (room.status !== "active") return false;
      return ["Candidate", "Employer", "Prime Recruiter", "Prime Admin", "Observer"].includes(input.role);
    },

    async recordRoomEvent(input) {
      const room = requireRoom(input.roomId);
      room.events.push({
        type: input.type,
        timestamp: new Date().toISOString(),
        metadata: input.metadata,
      });
    },

    async getRoom(roomId) {
      return rooms.get(roomId) ?? null;
    },
  };
}
