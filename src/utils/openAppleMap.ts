import { Alert, Linking } from "react-native";
import {
  buildAppleMapLink,
  type AppleMapPlace,
} from "@/src/lib/maps/appleMapLink";

export async function openAppleMap(place: AppleMapPlace): Promise<void> {
  try {
    await Linking.openURL(buildAppleMapLink(place));
  } catch {
    Alert.alert("오류", "Apple 지도를 열지 못했어요.");
  }
}
