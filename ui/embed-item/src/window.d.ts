import { Colors } from "./types";

declare global {
  interface Window {
    colors: Colors;
  }
}
