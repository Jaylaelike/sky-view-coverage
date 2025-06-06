export const coverageLevels: { level: string; color: string; description: string }[] = [
  {
    level: "ระดับ 5",
    color: "#0047AB",
    description: "สัญญาณดีมาก (> -70 dBm)",
  },
  {
    level: "ระดับ 4",
    color: "#00FF00",
    description: "สัญญาณดี (-70 to -80 dBm)",
  },
  {
    level: "ระดับ 3",
    color: "#FFFF00",
    description: "สัญญาณปานกลาง (-80 to -90 dBm)",
  },
  {
    level: "ระดับ 2",
    color: "#FFA500",
    description: "สัญญาณอ่อน (-90 to -100 dBm)",
  },
  {
    level: "ระดับ 1",
    color: "#FF0000",
    description: "สัญญาณอ่อนมาก (< -100 dBm)",
  },
]
