import React from "react";
import { Img } from "remotion";

/** Apple SVG — red with a green leaf */
export const AppleSvg: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="38" rx="22" ry="24" fill="#EF4444" />
    <ellipse cx="32" cy="38" rx="22" ry="24" fill="url(#appleShine)" />
    <path d="M32 14 C28 6, 22 8, 24 14" stroke="#16A34A" strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="26" cy="12" rx="6" ry="4" fill="#22C55E" transform="rotate(-20 26 12)" />
    <ellipse cx="24" cy="30" rx="4" ry="6" fill="rgba(255,255,255,0.25)" />
    <defs>
      <radialGradient id="appleShine" cx="0.35" cy="0.3" r="0.65">
        <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  </svg>
);

/** Colored block — rounded square with shadow */
export const BlockSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = "#3B82F6",
}) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <rect x="4" y="6" width="48" height="48" rx="8" fill="#1E3A5F" opacity="0.2" />
    <rect x="2" y="2" width="48" height="48" rx="8" fill={color} />
    <rect x="2" y="2" width="48" height="48" rx="8" fill="url(#blockShine)" />
    <defs>
      <linearGradient id="blockShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

/** Star SVG — gold 5-pointed star */
export const StarSvg: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
    <path
      d="M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z"
      fill="#FBBF24"
      stroke="#F59E0B"
      strokeWidth="1.5"
    />
    <path
      d="M28 4 L33.5 20.5 L51 20.5 L37 31 L42 48 L28 38 L14 48 L19 31 L5 20.5 L22.5 20.5 Z"
      fill="url(#starShine)"
    />
    <defs>
      <linearGradient id="starShine" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
  </svg>
);

/** Bird SVG — simple blue bird */
export const BirdSvg: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Body */}
    <path d="M12 30 C 20 20, 30 15, 45 20 C 50 22, 55 28, 55 35 C 55 45, 40 50, 25 45 C 15 42, 10 35, 12 30 Z" fill="#38BDF8" />
    {/* Eye */}
    <circle cx="45" cy="27" r="3" fill="#1E293B" />
    {/* Beak */}
    <path d="M55 30 L 62 33 L 55 36 Z" fill="#FBBF24" />
    {/* Legs */}
    <path d="M25 45 L 22 55 M 35 43 L 32 55" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
    {/* Wing */}
    <path d="M15 32 C 20 42, 30 42, 35 32 C 25 35, 18 35, 15 32 Z" fill="#0284C7" />
  </svg>
);

/** Simple circular counter */
export const CounterSvg: React.FC<{ size?: number; color?: string }> = ({
  size = 50,
  color = "#8B5CF6",
}) => (
  <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
    <circle cx="25" cy="27" r="22" fill="#1E1B4B" opacity="0.15" />
    <circle cx="25" cy="25" r="22" fill={color} />
    <circle cx="18" cy="18" r="6" fill="rgba(255,255,255,0.2)" />
  </svg>
);

/**
 * Renders emoji as an image from Twemoji CDN.
 * Native emoji text does NOT render in Remotion's headless Chromium,
 * so we convert the emoji to its unicode codepoint and load the Twemoji SVG.
 */
function emojiToTwemojiUrl(emoji: string): string {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== "fe0f") // Remove variation selector
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

export const EmojiItemSvg: React.FC<{ emoji: string; size?: number }> = ({ emoji, size = 60 }) => (
  <Img
    src={emojiToTwemojiUrl(emoji)}
    width={size}
    height={size}
    style={{ objectFit: "contain" }}
  />
);

export function ItemComponent({ itemType, size = 56 }: { itemType: string; size?: number }) {
  switch (itemType) {
    case "APPLE_SVG": return <AppleSvg size={size} />;
    case "BIRD_SVG": return <BirdSvg size={size} />;
    case "BLOCK_SVG": return <BlockSvg size={size} />;
    case "STAR_SVG": return <StarSvg size={size} />;
    case "FOOTBALL_SVG": return <EmojiItemSvg emoji="⚽" size={size} />;
    case "PEN_SVG": return <EmojiItemSvg emoji="🖊️" size={size} />;
    case "PENCIL_SVG": return <EmojiItemSvg emoji="✏️" size={size} />;
    case "TREE_SVG": return <EmojiItemSvg emoji="🌳" size={size} />;
    case "BOTTLE_SVG": return <EmojiItemSvg emoji="🍾" size={size} />;
    case "CAR_SVG": return <EmojiItemSvg emoji="🚗" size={size} />;
    case "RICKSHAW_SVG": return <EmojiItemSvg emoji="🛺" size={size} />;
    case "FEATHER_SVG": return <EmojiItemSvg emoji="🪶" size={size} />;
    case "JACKFRUIT_SVG": return <EmojiItemSvg emoji="🍈" size={size} />;
    case "BOOK_SVG": return <EmojiItemSvg emoji="📘" size={size} />;
    case "FLOWER_SVG": return <EmojiItemSvg emoji="🌸" size={size} />;
    case "MANGO_SVG": return <EmojiItemSvg emoji="🥭" size={size} />;
    case "BRINJAL_SVG": return <EmojiItemSvg emoji="🍆" size={size} />;
    case "BUS_SVG": return <EmojiItemSvg emoji="🚌" size={size} />;
    case "BD_FLAG_SVG": return <EmojiItemSvg emoji="🇧🇩" size={size} />;
    case "MAGPIE_SVG": return <EmojiItemSvg emoji="🐦‍⬛" size={size} />;
    case "LILY_SVG": return <EmojiItemSvg emoji="🪷" size={size} />;
    case "TIGER_SVG": return <EmojiItemSvg emoji="🐅" size={size} />;
    case "BANANA_SVG": return <EmojiItemSvg emoji="🍌" size={size} />;
    case "ROSE_SVG": return <EmojiItemSvg emoji="🌹" size={size} />;
    case "LEAF_SVG": return <EmojiItemSvg emoji="🍃" size={size} />;
    case "UMBRELLA_SVG": return <EmojiItemSvg emoji="☔" size={size} />;
    case "HILSA_FISH_SVG": return <EmojiItemSvg emoji="🐟" size={size} />;
    case "BALLOON_SVG": return <EmojiItemSvg emoji="🎈" size={size} />;
    case "PINEAPPLE_SVG": return <EmojiItemSvg emoji="🍍" size={size} />;
    case "COCONUT_SVG": return <EmojiItemSvg emoji="🥥" size={size} />;
    case "CARROT_SVG": return <EmojiItemSvg emoji="🥕" size={size} />;
    case "WATER_GLASS_SVG": return <EmojiItemSvg emoji="🥛" size={size} />;
    case "EGG_SVG": return <EmojiItemSvg emoji="🥚" size={size} />;
    case "TEA_CUP_SVG": return <EmojiItemSvg emoji="☕" size={size} />;
    case "POMEGRANATE_SVG": return <EmojiItemSvg emoji="🍎" size={size} />;
    case "RABBIT_SVG": return <EmojiItemSvg emoji="🐇" size={size} />;
    case "CAT_SVG": return <EmojiItemSvg emoji="🐈" size={size} />;
    case "HORSE_SVG": return <EmojiItemSvg emoji="🐎" size={size} />;
    case "BOAT_SVG": return <EmojiItemSvg emoji="⛵" size={size} />;
    case "MARBLE_SVG": return <EmojiItemSvg emoji="🔮" size={size} />;
    case "CROW_SVG": return <EmojiItemSvg emoji="🐦‍⬛" size={size} />;
    case "PEACOCK_SVG": return <EmojiItemSvg emoji="🦚" size={size} />;
    case "COCK_SVG": return <EmojiItemSvg emoji="🐓" size={size} />;
    case "HEN_SVG": return <EmojiItemSvg emoji="🐔" size={size} />;
    case "GUAVA_SVG": return <EmojiItemSvg emoji="🍐" size={size} />;
    case "ELEPHANT_SVG": return <EmojiItemSvg emoji="🐘" size={size} />;
    case "TOMATO_SVG": return <EmojiItemSvg emoji="🍅" size={size} />;
    case "PALM_FRUIT_SVG": return <EmojiItemSvg emoji="🌴" size={size} />;
    case "ICE_CREAM_SVG": return <EmojiItemSvg emoji="🍦" size={size} />;
    case "WATERMELON_SVG": return <EmojiItemSvg emoji="🍉" size={size} />;
    case "CAP_SVG": return <EmojiItemSvg emoji="🧢" size={size} />;
    case "HAT_SVG": return <EmojiItemSvg emoji="🎩" size={size} />;
    case "BUTTERFLY_SVG": return <EmojiItemSvg emoji="🦋" size={size} />;
    case "CHOCOLATE_SVG": return <EmojiItemSvg emoji="🍫" size={size} />;
    case "CHAIR_SVG": return <EmojiItemSvg emoji="🪑" size={size} />;
    case "SLICED_WATERMELON_SVG": return <EmojiItemSvg emoji="🍉" size={size} />;
    case "CHILD_SVG": return <EmojiItemSvg emoji="🧒" size={size} />;
    default: return <CounterSvg size={size} />;
  }
}
