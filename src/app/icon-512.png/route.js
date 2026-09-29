import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4c1d95, #1e1b4b)",
          fontSize: 290,
        }}
      >
        ⚔️
      </div>
    ),
    { width: 512, height: 512 }
  );
}
