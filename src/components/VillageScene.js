"use client";

// 건물 레벨에 따라 0(공터) / 1(건설됨) / 2(성장) / 3(최대) 4단계로 모습이 조금씩 커지고 화려해진다.
function getTier(level, maxLevel) {
  if (level <= 0) return 0;
  if (level >= maxLevel) return 3;
  if (level >= Math.ceil(maxLevel * 0.5)) return 2;
  return 1;
}

function Forge({ tier }) {
  const glow = tier >= 2;
  return (
    <g>
      <rect x="8" y="34" width="48" height="26" rx="2" fill="#78716c" />
      <polygon points="4,34 60,34 32,14" fill="#b91c1c" />
      {tier >= 1 && <rect x="40" y="16" width="8" height="14" fill="#57534e" />}
      {tier >= 1 && (
        <circle cx="44" cy="10" r={tier >= 3 ? 5 : 3} fill="#d6d3d1" opacity="0.8" />
      )}
      <rect x="24" y="44" width="16" height="16" fill="#292524" />
      {glow && <ellipse cx="32" cy="52" rx="6" ry="4" fill="#fb923c" opacity="0.9" />}
      {tier >= 3 && <polygon points="4,34 60,34 62,30 2,30" fill="#fbbf24" opacity="0.6" />}
    </g>
  );
}

function MagicTower({ tier }) {
  return (
    <g>
      <rect x="18" y="20" width="28" height="40" fill="#4c1d95" />
      <polygon points="14,20 50,20 32,2" fill="#6d28d9" />
      <rect x="28" y="34" width="8" height="10" fill="#2e1065" />
      <circle
        cx="32"
        cy="10"
        r={tier >= 3 ? 6 : tier >= 2 ? 5 : 4}
        fill={tier >= 1 ? "#c4b5fd" : "#6b7280"}
        opacity={tier >= 1 ? 0.95 : 0.5}
      />
      {tier >= 2 && <circle cx="32" cy="10" r="9" fill="#c4b5fd" opacity="0.25" />}
      {tier >= 3 && <circle cx="32" cy="10" r="13" fill="#a78bfa" opacity="0.15" />}
    </g>
  );
}

function Inn({ tier }) {
  const windows = tier >= 3 ? 3 : tier >= 1 ? 2 : 1;
  return (
    <g>
      <rect x="6" y="30" width="52" height="30" fill="#92400e" />
      <polygon points="2,30 62,30 32,12" fill="#78350f" />
      <rect x="26" y="44" width="12" height="16" fill="#451a03" />
      {Array.from({ length: windows }).map((_, i) => (
        <rect key={i} x={12 + i * 16} y="36" width="8" height="8" fill="#fde68a" opacity={tier >= 1 ? 1 : 0.4} />
      ))}
      {tier >= 2 && <rect x="4" y="26" width="16" height="4" fill="#d97706" />}
      {tier >= 3 && <polygon points="4,26 20,26 18,20 6,20" fill="#f59e0b" />}
    </g>
  );
}

function TrainingGround({ tier }) {
  return (
    <g>
      <rect x="4" y="52" width="56" height="8" fill="#65a30d" />
      {[10, 26, 42, 54].map((x, i) => (
        <rect key={i} x={x} y="40" width="3" height="20" fill="#78350f" />
      ))}
      <circle cx="32" cy="30" r={tier >= 3 ? 12 : tier >= 1 ? 9 : 6} fill="#dc2626" opacity={tier >= 1 ? 0.85 : 0.35} />
      <circle cx="32" cy="30" r={tier >= 3 ? 6 : 4} fill="#fef2f2" />
      {tier >= 2 && <rect x="30" y="6" width="4" height="24" fill="#57534e" />}
    </g>
  );
}

function Treasury({ tier }) {
  return (
    <g>
      <rect x="6" y="24" width="52" height="36" rx="2" fill="#57534e" />
      <polygon points="2,24 62,24 32,8" fill="#292524" />
      <circle cx="32" cy="42" r="10" fill="#292524" stroke="#a8a29e" strokeWidth="2" />
      <circle cx="32" cy="42" r="3" fill="#a8a29e" />
      {tier >= 1 && <circle cx="16" cy="54" r="4" fill="#fbbf24" />}
      {tier >= 2 && <circle cx="22" cy="56" r="4" fill="#facc15" />}
      {tier >= 3 && <circle cx="46" cy="55" r="5" fill="#fde047" />}
    </g>
  );
}

function GuildBoard({ tier }) {
  const papers = tier >= 3 ? 3 : tier >= 1 ? 2 : 1;
  return (
    <g>
      <rect x="28" y="20" width="6" height="40" fill="#78350f" />
      <rect x="10" y="14" width="44" height="26" fill="#a16207" />
      <rect x="13" y="17" width="38" height="20" fill="#fef3c7" />
      {Array.from({ length: papers }).map((_, i) => (
        <rect
          key={i}
          x={17 + i * 12}
          y={20 + (i % 2)}
          width="9"
          height="12"
          fill="#fde68a"
          stroke="#d97706"
          strokeWidth="0.5"
          transform={`rotate(${i % 2 === 0 ? -4 : 4} ${21 + i * 12} ${26 + (i % 2)})`}
        />
      ))}
    </g>
  );
}

const buildingRenderers = {
  forge: Forge,
  magicTower: MagicTower,
  inn: Inn,
  trainingGround: TrainingGround,
  treasury: Treasury,
  guildBoard: GuildBoard,
};

export default function VillageScene({ buildings, buildingLevels, maxLevel, selectedId, onSelect }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-900/10 dark:border-amber-400/10">
      <svg viewBox="0 0 300 200" className="w-full" role="img" aria-label="길드 마을">
        <defs>
          <linearGradient id="village-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfe3f7" />
            <stop offset="100%" stopColor="#eaf7e6" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="300" height="150" fill="url(#village-sky)" />
        <rect x="0" y="140" width="300" height="60" fill="#8fc774" />
        <path d="M0,140 Q150,125 300,140 L300,150 L0,150 Z" fill="#79b862" />

        {buildings.map((building, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 20 + col * 92;
          const y = 60 + row * 78;
          const level = buildingLevels[building.id]?.level ?? 0;
          const tier = getTier(level, maxLevel);
          const Renderer = buildingRenderers[building.id];
          const isSelected = selectedId === building.id;

          return (
            <g
              key={building.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelect(building.id)}
              style={{ cursor: "pointer" }}
            >
              {isSelected && <circle cx="32" cy="40" r="38" fill="#fbbf24" opacity="0.15" />}
              <Renderer tier={tier} />
              <rect x="0" y="64" width="64" height="14" rx="7" fill="rgba(0,0,0,0.35)" />
              <text x="32" y="74" textAnchor="middle" fontSize="9" fill="white" fontWeight="600">
                {building.icon} Lv.{level}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
