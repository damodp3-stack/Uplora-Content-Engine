import React from "react";
import { PresentUser } from "@/hooks/useCollaboration";

interface PresenceBarProps {
  isConnected: boolean;
  presentUsers: PresentUser[];
  myColor: string;
}

export function PresenceBar({ isConnected, presentUsers }: PresenceBarProps) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-full border shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
        />
        <span className={isConnected ? "text-slate-700" : "text-rose-600"}>
          {isConnected ? "Live Sync" : "Offline"}
        </span>
      </div>

      {presentUsers.length > 0 && (
        <div className="flex items-center -space-x-2 overflow-hidden">
          {presentUsers.slice(0, 5).map((user) => (
            <div
              key={user.socketId}
              title={user.name}
              style={{ backgroundColor: user.color }}
              className="h-6 w-6 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white uppercase select-none"
            >
              {user.name.charAt(0)}
            </div>
          ))}
          {presentUsers.length > 5 && (
            <div className="h-6 w-6 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-[10px] font-medium text-slate-600">
              +{presentUsers.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
