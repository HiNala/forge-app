import "@/components/war-room/war-room-tokens.css";

export default function WarRoomSegmentLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1">{children}</div>;
}
