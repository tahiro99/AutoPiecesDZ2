

import { Dimensions, PixelRatio } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const BASE_W = 390;
const BASE_H = 844;

export const fs = (size) => {
  const scaled = (W / BASE_W) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const sw = (size) => Math.round((W / BASE_W) * size);

export const sh = (size) => Math.round((H / BASE_H) * size);

export const SCREEN_W = W;
export const SCREEN_H = H;

export const rp = (size) => sw(size);
export const isSmall = W < 375;
export const isLarge = W > 428;
