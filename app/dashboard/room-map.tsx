"use client";

import { useState, useCallback } from "react";

// ---------- Types ----------

interface DeskInfo {
  id: string;
  code: string;
  name: string;
  locationLabel: string;
  isReserved: boolean;
  isMine: boolean;
  reservedBy: string | null;
  reservationId: string | null;
}

export type RoomLayout = "2x4" | "1x3";

interface RoomMapProps {
  title: string;
  layout: RoomLayout;
  desks: DeskInfo[];
  actionLoading: string | null;
  onReserve: (deskId: string) => void;
  onCancel: (reservationId: string) => void;
}

// ---------- Layout configs ----------

interface LayoutConfig {
  svgW: number;
  svgH: number;
  roomX: number;
  roomY: number;
  roomW: number;
  roomH: number;
  cols: number;
  rows: number;
  deskW: number;
  deskH: number;
  colGap: number;
  rowGap: number;
}

const CHAIR_R = 8;

const LAYOUTS: Record<RoomLayout, LayoutConfig> = {
  "2x4": {
    svgW: 600,
    svgH: 520,
    roomX: 30,
    roomY: 30,
    roomW: 540,
    roomH: 440,
    cols: 2,
    rows: 4,
    deskW: 160,
    deskH: 56,
    colGap: 100,
    rowGap: 30,
  },
  "1x3": {
    svgW: 600,
    svgH: 260,
    roomX: 30,
    roomY: 30,
    roomW: 540,
    roomH: 180,
    cols: 3,
    rows: 1,
    deskW: 130,
    deskH: 56,
    colGap: 35,
    rowGap: 0,
  },
};

function getGridMetrics(cfg: LayoutConfig) {
  const gridW = cfg.cols * cfg.deskW + (cfg.cols - 1) * cfg.colGap;
  const gridH = cfg.rows * cfg.deskH + (cfg.rows - 1) * cfg.rowGap;
  const gridX = cfg.roomX + (cfg.roomW - gridW) / 2;
  const gridY = cfg.roomY + (cfg.roomH - gridH) / 2;
  return { gridW, gridH, gridX, gridY };
}

function deskPosition(index: number, cfg: LayoutConfig) {
  const { gridX, gridY } = getGridMetrics(cfg);
  const row = Math.floor(index / cfg.cols);
  const col = index % cfg.cols;
  const x = gridX + col * (cfg.deskW + cfg.colGap);
  const y = gridY + row * (cfg.deskH + cfg.rowGap);
  return { x, y, row, col };
}

// ---------- Single desk SVG ----------

function DeskSVG({
  desk,
  index,
  isSelected,
  isActionLoading,
  onSelect,
  cfg,
}: {
  desk: DeskInfo;
  index: number;
  isSelected: boolean;
  isActionLoading: boolean;
  onSelect: (desk: DeskInfo) => void;
  cfg: LayoutConfig;
}) {
  const { x, y, col } = deskPosition(index, cfg);

  // Chair position depends on layout
  let chairX: number;
  const chairY = y + cfg.deskH / 2;

  if (cfg.cols === 2) {
    // 2-column: chairs face inward
    chairX = col === 0 ? x + cfg.deskW + CHAIR_R + 8 : x - CHAIR_R - 8;
  } else {
    // 1-row: chairs below desk
    chairX = x + cfg.deskW / 2;
  }
  const chairYActual = cfg.rows === 1 ? y + cfg.deskH + CHAIR_R + 6 : chairY;

  // Colors based on state
  let fill: string;
  let stroke: string;
  let textColor: string;
  let chairFill: string;

  if (desk.isMine) {
    fill = "#DBEAFE";
    stroke = "#3B82F6";
    textColor = "#1E40AF";
    chairFill = "#3B82F6";
  } else if (desk.isReserved) {
    fill = "#F3F4F6";
    stroke = "#D1D5DB";
    textColor = "#9CA3AF";
    chairFill = "#D1D5DB";
  } else {
    fill = "#FFFFFF";
    stroke = "#D1D5DB";
    textColor = "#374151";
    chairFill = "#9CA3AF";
  }

  if (isSelected) {
    stroke = desk.isMine ? "#2563EB" : "#3B82F6";
  }

  const ariaLabel = desk.isMine
    ? `${desk.code} – Twoja rezerwacja`
    : desk.isReserved
    ? `${desk.code} – Zajęte przez ${desk.reservedBy}`
    : `${desk.code} – Wolne`;

  const cursor = desk.isReserved && !desk.isMine ? "default" : "pointer";

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={{ cursor }}
      onClick={() => onSelect(desk)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(desk);
        }
      }}
      className="outline-none"
    >
      {/* Desk rectangle */}
      <rect
        x={x}
        y={y}
        width={cfg.deskW}
        height={cfg.deskH}
        rx={8}
        ry={8}
        fill={fill}
        stroke={stroke}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />

      {/* Desk code */}
      <text
        x={x + cfg.deskW / 2}
        y={y + 24}
        textAnchor="middle"
        fill={textColor}
        fontSize={15}
        fontWeight={600}
        fontFamily="monospace"
      >
        {desk.code}
      </text>

      {/* Status text */}
      <text
        x={x + cfg.deskW / 2}
        y={y + 43}
        textAnchor="middle"
        fill={textColor}
        fontSize={10}
        opacity={0.7}
      >
        {desk.isMine ? "Twoje" : desk.isReserved ? "Zajęte" : "Wolne"}
      </text>

      {/* Chair (circle) */}
      <circle
        cx={chairX}
        cy={chairYActual}
        r={CHAIR_R}
        fill={chairFill}
        stroke={desk.isMine ? "#2563EB" : "#9CA3AF"}
        strokeWidth={1}
        opacity={isActionLoading ? 0.4 : 0.8}
      />

      {/* Hover overlay for available desks */}
      {!desk.isReserved && (
        <rect
          x={x}
          y={y}
          width={cfg.deskW}
          height={cfg.deskH}
          rx={8}
          ry={8}
          fill="#3B82F6"
          opacity={0}
          className="hover:opacity-10 transition-opacity"
        />
      )}

      {/* Tooltip for occupied desks */}
      {desk.isReserved && !desk.isMine && (
        <title>{`Zarezerwowane przez: ${desk.reservedBy}`}</title>
      )}
    </g>
  );
}

// ---------- Room Map ----------

export default function RoomMap({
  title,
  layout,
  desks,
  actionLoading,
  onReserve,
  onCancel,
}: RoomMapProps) {
  const [selectedDesk, setSelectedDesk] = useState<DeskInfo | null>(null);
  const cfg = LAYOUTS[layout];
  const { gridW, gridX, gridY } = getGridMetrics(cfg);

  const sortedDesks = [...desks].sort((a, b) => a.code.localeCompare(b.code));
  const gridDesks = sortedDesks.slice(0, cfg.rows * cfg.cols);

  const handleSelect = useCallback((desk: DeskInfo) => {
    setSelectedDesk(desk);
  }, []);

  const handleAction = useCallback(() => {
    if (!selectedDesk) return;
    if (selectedDesk.isMine && selectedDesk.reservationId) {
      onCancel(selectedDesk.reservationId);
    } else if (!selectedDesk.isReserved) {
      onReserve(selectedDesk.id);
    }
    setSelectedDesk(null);
  }, [selectedDesk, onReserve, onCancel]);

  // Clear selection if desk disappears from list
  if (selectedDesk && !desks.find((d) => d.id === selectedDesk.id)) {
    setSelectedDesk(null);
  }

  // Door gap on right wall (near top-right corner)
  const cornerR = 12;
  const rightX = cfg.roomX + cfg.roomW;
  const bottomY = cfg.roomY + cfg.roomH;
  const doorTop = cfg.roomY + cornerR;
  const doorBottom = doorTop + 50;
  const roomPath = [
    `M ${rightX} ${doorBottom}`,
    `L ${rightX} ${bottomY - cornerR}`,
    `A ${cornerR} ${cornerR} 0 0 1 ${rightX - cornerR} ${bottomY}`,
    `L ${cfg.roomX + cornerR} ${bottomY}`,
    `A ${cornerR} ${cornerR} 0 0 1 ${cfg.roomX} ${bottomY - cornerR}`,
    `L ${cfg.roomX} ${cfg.roomY + cornerR}`,
    `A ${cornerR} ${cornerR} 0 0 1 ${cfg.roomX + cornerR} ${cfg.roomY}`,
    `L ${rightX - cornerR} ${cfg.roomY}`,
    `A ${cornerR} ${cornerR} 0 0 1 ${rightX} ${doorTop}`,
  ].join(" ");

  return (
    <div className="w-full">
      {/* SVG Room Map */}
      <div className="w-full max-w-2xl mx-auto">
        <svg
          viewBox={`0 0 ${cfg.svgW} ${cfg.svgH}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Plan pokoju: ${title}`}
        >
          {/* Room outline with door gap on right wall */}
          <path d={roomPath} fill="#FAFAFA" stroke="#E5E7EB" strokeWidth={2} />

          {/* Door frame marks */}
          <line x1={rightX} y1={doorTop} x2={rightX + 6} y2={doorTop} stroke="#9CA3AF" strokeWidth={2} />
          <line x1={rightX} y1={doorBottom} x2={rightX + 6} y2={doorBottom} stroke="#9CA3AF" strokeWidth={2} />

          {/* Door label */}
          <text
            x={rightX + 16}
            y={(doorTop + doorBottom) / 2}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize={10}
            transform={`rotate(90, ${rightX + 16}, ${(doorTop + doorBottom) / 2})`}
          >
            Wejście
          </text>

          {/* Room label */}
          <text
            x={cfg.roomX + 16}
            y={cfg.roomY + 22}
            fill="#9CA3AF"
            fontSize={11}
            fontWeight={500}
          >
            {title}
          </text>

          {/* Row separators (only for multi-row layouts) */}
          {cfg.rows > 1 &&
            Array.from({ length: cfg.rows - 1 }, (_, i) => {
              const sepY =
                gridY + (i + 1) * (cfg.deskH + cfg.rowGap) - cfg.rowGap / 2;
              return (
                <line
                  key={i}
                  x1={gridX}
                  y1={sepY}
                  x2={gridX + gridW}
                  y2={sepY}
                  stroke="#F3F4F6"
                  strokeWidth={1}
                  strokeDasharray="6,4"
                />
              );
            })}

          {/* Row labels (only for multi-row layouts) */}
          {cfg.rows > 1 &&
            Array.from({ length: cfg.rows }, (_, i) => {
              const labelY =
                gridY + i * (cfg.deskH + cfg.rowGap) + cfg.deskH / 2 + 4;
              return (
                <text
                  key={i}
                  x={cfg.roomX + 10}
                  y={labelY}
                  fill="#D1D5DB"
                  fontSize={10}
                  fontWeight={500}
                >
                  R{i + 1}
                </text>
              );
            })}

          {/* Desks */}
          {gridDesks.map((desk, index) => (
            <DeskSVG
              key={desk.id}
              desk={desk}
              index={index}
              isSelected={selectedDesk?.id === desk.id}
              isActionLoading={
                actionLoading === desk.id ||
                actionLoading === desk.reservationId
              }
              onSelect={handleSelect}
              cfg={cfg}
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border border-gray-300 bg-white" />
          Wolne
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border border-blue-500 bg-blue-100" />
          Moje
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-4 rounded border border-gray-300 bg-gray-100" />
          Zajęte
        </div>
      </div>

      {/* Action panel */}
      {selectedDesk && (
        <div className="mt-4 mx-auto max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-mono font-bold text-lg">
                {selectedDesk.code}
              </span>
              <span className="text-gray-400 text-sm ml-2">
                {selectedDesk.name}
              </span>
            </div>
            <button
              onClick={() => setSelectedDesk(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              aria-label="Zamknij panel"
            >
              ✕
            </button>
          </div>

          {selectedDesk.isMine && selectedDesk.reservationId && (
            <div>
              <p className="text-sm text-blue-600 mb-2">
                To jest Twoja rezerwacja
              </p>
              <button
                onClick={handleAction}
                disabled={actionLoading === selectedDesk.reservationId}
                className="w-full text-sm py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {actionLoading === selectedDesk.reservationId
                  ? "Anulowanie..."
                  : "Anuluj rezerwację"}
              </button>
            </div>
          )}

          {!selectedDesk.isReserved && (
            <button
              onClick={handleAction}
              disabled={actionLoading === selectedDesk.id}
              className="w-full text-sm py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading === selectedDesk.id
                ? "Rezerwuję..."
                : "Rezerwuj to biurko"}
            </button>
          )}

          {selectedDesk.isReserved && !selectedDesk.isMine && (
            <p className="text-sm text-gray-500">
              Zarezerwowane przez:{" "}
              <strong>{selectedDesk.reservedBy}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
