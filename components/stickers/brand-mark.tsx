import Svg, { Circle, Path, Rect } from "react-native-svg";

type BrandMarkProps = { size?: number };

export function BrandMark({ size = 46 }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Stickly">
      <Rect x={3} y={3} width={42} height={42} rx={15} fill="#F4C95D" stroke="#292326" strokeWidth={2.2} />
      <Path d="M13 17.5c0-1.4 1.1-2.5 2.5-2.5h13.8l6.2 6.2v12.3c0 1.4-1.1 2.5-2.5 2.5h-17.5c-1.4 0-2.5-1.1-2.5-2.5V17.5Z" fill="#FFF9F0" stroke="#292326" strokeWidth={1.8} />
      <Path d="M29.2 15v6.2h6.2" fill="#F26B4F" stroke="#292326" strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={21} cy={25} r={5.9} fill="none" stroke="#64518C" strokeWidth={2.5} />
      <Path d="m25.4 29.4 4.1 4.1" stroke="#64518C" strokeWidth={2.8} strokeLinecap="round" />
      <Circle cx={19.2} cy={24.3} r={0.8} fill="#292326" />
      <Circle cx={22.8} cy={24.3} r={0.8} fill="#292326" />
      <Path d="M19.3 27c1.1 1.2 2.4 1.2 3.5 0" stroke="#292326" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path d="m37.2 10 .8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z" fill="#F26B4F" />
    </Svg>
  );
}
